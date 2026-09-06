import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma, type OrderStatus } from "@/db/generated/client";
import { prisma } from "@/db/prisma";

import { commerceConfig } from "@/config/commerce";
import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/features/customers/server";

import type { CheckoutInput, OrderCartLine, OrderFilters } from "../types";

const publicOrderInclude = {
  items: {
    include: {
      perfumeVariant: {
        include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  },
} satisfies Prisma.OrderInclude;

const adminOrderInclude = {
  ...publicOrderInclude,
  customer: true,
  statusEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type PublicOrderRecord = Prisma.OrderGetPayload<{ include: typeof publicOrderInclude }>;
export type AdminOrderRecord = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

export async function findOrderConfirmation(confirmationToken: string) {
  return await prisma.order.findUnique({
    where: { confirmationToken },
    include: publicOrderInclude,
  });
}

export async function findAdminOrder(reference: string) {
  return await prisma.order.findUnique({ where: { reference }, include: adminOrderInclude });
}

export async function listOrderRecords(filters: OrderFilters = {}, take?: number) {
  const query = filters.query;
  return await prisma.order.findMany({
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
    select: {
      reference: true,
      subtotalMinor: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true, whatsappNumber: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type OrderRowRecord = Awaited<ReturnType<typeof listOrderRecords>>[number];

export async function countOrdersAwaitingPayment() {
  return await prisma.order.count({ where: { status: "AWAITING_PAYMENT" } });
}

export async function countOrdersSince(start: Date) {
  return await prisma.order.count({ where: { createdAt: { gte: start } } });
}

class OrderConflict extends Error {}
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function createReference() {
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
          where: { submissionKey },
          include: publicOrderInclude,
        });
        if (duplicate) {
          return { order: duplicate, duplicate: true };
        }

        const variants = await tx.perfumeVariant.findMany({
          where: {
            id: { in: lines.map((line) => line.perfumeVariantId) },
            perfume: { status: "PUBLISHED" },
          },
        });
        if (variants.length !== lines.length) {
          throw new OrderConflict("One or more perfumes are no longer available.");
        }

        const byId = new Map(variants.map((variant) => [variant.id, variant]));
        for (const line of lines) {
          const updated = await tx.perfumeVariant.updateMany({
            where: {
              id: line.perfumeVariantId,
              quantity: { gte: line.quantity },
              perfume: { status: "PUBLISHED" },
            },
            data: { quantity: { decrement: line.quantity } },
          });
          if (updated.count !== 1) {
            throw new OrderConflict(
              "One or more perfumes are no longer available in the requested quantity.",
            );
          }
        }

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
          include: publicOrderInclude,
          data: {
            customerId: customer.id,
            reference: createReference(),
            confirmationToken: randomBytes(32).toString("base64url"),
            submissionKey,
            orderNote: input.orderNote,
            subtotalMinor,
            status: "AWAITING_PAYMENT",
            items: {
              create: lines.map((line) => ({
                perfumeVariantId: line.perfumeVariantId,
                quantity: line.quantity,
                unitPriceMinor: byId.get(line.perfumeVariantId)!.priceMinor,
              })),
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
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      const duplicate = await prisma.order.findUnique({
        where: { submissionKey },
        include: publicOrderInclude,
      });
      if (duplicate) {
        return { order: duplicate, duplicate: true };
      }
    }
    if (error instanceof OrderConflict || error instanceof CustomerIdentityConflict) {
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
    const order = await tx.order.findUnique({ where: { reference } });
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
      const order = await tx.order.findUnique({ where: { reference }, include: { items: true } });
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
      for (const [id, quantity] of quantities) {
        const restored = await tx.perfumeVariant.updateMany({
          where: { id },
          data: { quantity: { increment: quantity } },
        });
        if (restored.count !== 1) {
          throw new OrderConflict("Unable to restore order stock.");
        }
      }
      await tx.orderStatusEvent.create({
        data: { orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED" },
      });
      return { ok: true } as const;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
