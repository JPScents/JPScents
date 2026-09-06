import "server-only";

import { prisma } from "@/db/prisma";

import { orderInclude, projectOrder } from "./orders.projection";
import type { OrderFilters } from "./types";

const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

export async function getOrderConfirmation(confirmationToken: string | undefined) {
  if (!confirmationToken || confirmationToken.length < 40) return null;
  const order = await prisma.order.findUnique({
    where: { confirmationToken },
    include: orderInclude,
  });
  return order ? projectOrder(order) : null;
}

export async function listOrders(filters: OrderFilters = {}) {
  const query = clean(filters.query, 120);
  const rows = await prisma.order.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { customer: { name: { contains: query, mode: "insensitive" } } },
              { customer: { whatsappNumber: { contains: query } } },
            ],
          }
        : {}),
    },
    include: { customer: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((order) => ({
    reference: order.reference,
    customerName: order.customer.name,
    whatsappNumber: order.customer.whatsappNumber,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    itemCount: order._count.items,
  }));
}

export async function getOrderByReference(referenceValue: string) {
  const order = await prisma.order.findUnique({
    where: { reference: referenceValue },
    include: orderInclude,
  });
  return order ? projectOrder(order, true) : null;
}

export async function getOrdersAdminOverview() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const [awaitingAction, ordersThisWeek, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    prisma.order.count({ where: { createdAt: { gte: start } } }),
    listOrders(),
  ]);

  return {
    awaitingAction,
    ordersThisWeek,
    recentOrders: recentOrders.slice(0, 3),
  };
}
