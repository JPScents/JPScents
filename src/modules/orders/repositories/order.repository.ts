import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma, type OrderStatus } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import { commerceConfig } from "@/config/commerce";
import {
  CatalogueStockConflict,
  deductStockForOrder,
  restoreStockForOrder,
} from "@/modules/catalogue/server";
import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/modules/customers/server";

import type { CheckoutInput, OrderCartLine, OrderFilters } from "../types";

const orderItems = {
  include: {
    perfumeVariant: {
      include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    },
  },
} satisfies Prisma.Order$itemsArgs;

const publicOrderSelect = {
  reference: true,
  subtotalMinor: true,
  status: true,
  createdAt: true,
  items: orderItems,
} satisfies Prisma.OrderSelect;

const checkoutOrderSelect = {
  ...publicOrderSelect,
  id: true,
  confirmationToken: true,
} satisfies Prisma.OrderSelect;

const adminOrderInclude = {
  items: orderItems,
  customer: true,
  statusEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type PublicOrderRecord = Prisma.OrderGetPayload<{ select: typeof publicOrderSelect }>;
export type AdminOrderRecord = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

export async function findOrderConfirmation(confirmationToken: string) {
  return await prisma.order.findUnique({
    where: { confirmationToken, kind: "LEGACY_MANUAL" },
    select: publicOrderSelect,
  });
}

export async function findAdminOrder(reference: string) {
  return await prisma.order.findUnique({
    where: { reference, kind: "LEGACY_MANUAL" },
    include: adminOrderInclude,
  });
}

export async function listOrderRecords(filters: OrderFilters = {}) {
  const query = filters.query;
  return await prisma.order.findMany({
    where: {
      kind: "LEGACY_MANUAL",
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { customerNameSnapshot: { contains: query, mode: "insensitive" } },
              { whatsappNumberSnapshot: { contains: query } },
              {
                customerNameSnapshot: null,
                customer: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { whatsappNumber: { contains: query } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    select: {
      reference: true,
      subtotalMinor: true,
      status: true,
      createdAt: true,
      customerNameSnapshot: true,
      whatsappNumberSnapshot: true,
      customer: { select: { name: true, whatsappNumber: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type OrderRowRecord = Awaited<ReturnType<typeof listOrderRecords>>[number];

export async function readAdminOrderOverview(start: Date) {
  const [awaitingAction, ordersThisWeek, latest] = await Promise.all([
    prisma.order.count({
      where: {
        OR: [
          { kind: "LEGACY_MANUAL", status: "AWAITING_PAYMENT" },
          {
            kind: "COMMERCE",
            commerceStatus: "PAID",
            fulfilmentStatus: { in: ["UNFULFILLED", "PROCESSING"] },
          },
          { kind: "COMMERCE", commerceStatus: "REFUND_REQUIRED" },
        ],
      },
    }),
    prisma.order.count({ where: { createdAt: { gte: start } } }),
    prisma.order.findMany({
      select: {
        reference: true,
        kind: true,
        status: true,
        commerceStatus: true,
        fulfilmentStatus: true,
        subtotalMinor: true,
        totalMinor: true,
        customerNameSnapshot: true,
        customer: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
    }),
  ]);
  return {
    awaitingAction,
    ordersThisWeek,
    recentOrders: latest.map((order) => ({
      reference: order.reference,
      customerName: order.customerNameSnapshot ?? order.customer.name,
      amountMinor: order.totalMinor ?? order.subtotalMinor,
      status: order.kind === "COMMERCE" ? order.commerceStatus : order.status,
      fulfilmentStatus: order.fulfilmentStatus,
    })),
  };
}

class OrderConflict extends Error {}
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createReference() {
  const code = [...randomBytes(7)].map((value) => REFERENCE_ALPHABET[value & 31]).join("");
  return `${commerceConfig.orderReference.prefix}${code}`;
}

export async function createOrderWithStockDeduction(
  lines: OrderCartLine[],
  input: CheckoutInput,
  submissionKey: string,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.order.findUnique({
          where: { submissionKey, kind: "LEGACY_MANUAL" },
          select: checkoutOrderSelect,
        });
        if (duplicate) {
          return { order: duplicate, duplicate: true };
        }

        const stock = await deductStockForOrder(tx, lines);
        if ("error" in stock) {
          throw new OrderConflict(stock.error);
        }
        if ("stalePrices" in stock) {
          throw new Error("Unexpected price comparison during legacy checkout.");
        }
        const byId = stock.variants;
        const subtotalMinor = lines.reduce(
          (total, line) => total + byId.get(line.perfumeVariantId)!.priceMinor * line.quantity,
          0,
        );
        const customer = await resolveCustomerForOrder(tx, {
          name: input.customerName,
          whatsappNumber: input.whatsappNumber,
          email: input.email,
          deliveryState: input.deliveryState,
          deliveryCity: input.deliveryCity,
          deliveryAddress: input.deliveryAddress,
        });
        const complete = await tx.order.create({
          select: checkoutOrderSelect,
          data: {
            customerId: customer.id,
            customerNameSnapshot: input.customerName,
            whatsappNumberSnapshot: input.whatsappNumber,
            emailSnapshot: input.email ?? null,
            deliveryStateSnapshot: input.deliveryState,
            deliveryCitySnapshot: input.deliveryCity,
            deliveryAddressSnapshot: input.deliveryAddress,
            reference: createReference(),
            confirmationToken: randomBytes(32).toString("base64url"),
            submissionKey,
            orderNote: input.orderNote,
            subtotalMinor,
            status: "AWAITING_PAYMENT",
            items: {
              create: lines.map(({ perfumeVariantId, quantity }) => {
                const variant = byId.get(perfumeVariantId)!;
                return {
                  perfumeVariantId,
                  quantity,
                  unitPriceMinor: variant.priceMinor,
                  perfumeNameSnapshot: variant.perfume.name,
                  sizeValueSnapshot: variant.sizeValue,
                  sizeUnitSnapshot: variant.sizeUnit,
                };
              }),
            },
            statusEvents: { create: { toStatus: "AWAITING_PAYMENT" } },
          },
        });
        return { order: complete, duplicate: false };
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    // A duplicate can lose a stock race before reaching the submission-key constraint.
    // Resolve it after rollback, when the winning transaction's order is visible.
    if (
      error instanceof OrderConflict ||
      error instanceof CatalogueStockConflict ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      const duplicate = await prisma.order.findUnique({
        where: { submissionKey, kind: "LEGACY_MANUAL" },
        select: checkoutOrderSelect,
      });
      if (duplicate) {
        return { order: duplicate, duplicate: true };
      }
    }
    if (
      error instanceof OrderConflict ||
      error instanceof CatalogueStockConflict ||
      error instanceof CustomerIdentityConflict
    ) {
      return { error: error.message } as const;
    }
    throw error;
  }
}

export async function updateOrderStatus(
  reference: string,
  nextStatus: Exclude<OrderStatus, "CANCELLED">,
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { reference, kind: "LEGACY_MANUAL" } });
    if (!order) {
      return { error: "Order not found." } as const;
    }
    if (order.status === "CANCELLED") {
      return { error: "Cancelled orders cannot be reopened." } as const;
    }
    if (order.status === nextStatus) {
      return { unchanged: true } as const;
    }
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: order.status, stockRestoredAt: null },
      data: { status: nextStatus },
    });
    if (changed.count !== 1) {
      return { error: "This order was updated elsewhere. Refresh and try again." } as const;
    }
    await tx.orderStatusEvent.create({
      data: { orderId: order.id, fromStatus: order.status, toStatus: nextStatus },
    });
    return { ok: true } as const;
  });
}

export async function cancelOrderAndRestoreStock(reference: string) {
  return await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { reference, kind: "LEGACY_MANUAL" },
        include: { items: true },
      });
      if (!order) {
        return { error: "Order not found." } as const;
      }
      if (order.status === "CANCELLED" && order.stockRestoredAt) {
        return { unchanged: true } as const;
      }
      if (order.status === "CANCELLED") {
        return { error: "This cancelled order cannot be safely restored automatically." } as const;
      }
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: order.status, stockRestoredAt: null },
        data: { status: "CANCELLED", stockRestoredAt: new Date() },
      });
      if (claimed.count !== 1) {
        return { error: "This order was updated elsewhere. Refresh and try again." } as const;
      }
      const quantities = new Map<string, number>();
      for (const item of order.items) {
        quantities.set(
          item.perfumeVariantId,
          (quantities.get(item.perfumeVariantId) ?? 0) + item.quantity,
        );
      }
      const restored = await restoreStockForOrder(
        tx,
        [...quantities].map(([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity })),
      );
      if (!restored) {
        throw new OrderConflict("Unable to restore order stock.");
      }
      await tx.orderStatusEvent.create({
        data: { orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED" },
      });
      return { ok: true } as const;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
