import "server-only";

import { randomBytes } from "crypto";

import { OrderStatus, Prisma } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { commerceConfig } from "@/config/commerce";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";

import { parseCheckoutInput } from "./parsers/checkout.parser";
import type { OrderCartLine, OrderFilters } from "./types";
export { parseCheckoutInput } from "./parsers/checkout.parser";
export { normalizeWhatsappNumber } from "./utils/whatsapp.utils";
export const orderStatuses = Object.values(OrderStatus);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

function parseLines(lines: unknown): OrderCartLine[] | null {
  if (!Array.isArray(lines) || !lines.length) return null;
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line || typeof line !== "object") return null;
    const { perfumeVariantId, quantity } = line as Partial<OrderCartLine>;
    if (
      typeof perfumeVariantId !== "string" ||
      !UUID.test(perfumeVariantId) ||
      !Number.isSafeInteger(quantity) ||
      quantity === undefined ||
      quantity < 1 ||
      quantity > 99
    )
      return null;
    merged.set(perfumeVariantId, (merged.get(perfumeVariantId) ?? 0) + quantity);
  }
  if ([...merged.values()].some((quantity) => quantity > 99)) return null;
  return [...merged].map(([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity }));
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function reference() {
  const code = [...randomBytes(7)].map((value) => REFERENCE_ALPHABET[value & 31]).join("");
  return `${commerceConfig.orderReference.prefix}${code}`;
}
function token() {
  return randomBytes(32).toString("base64url");
}
const orderInclude = {
  items: {
    include: {
      perfumeVariant: {
        include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  },
  statusEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

class OrderConflict extends Error {}

async function projectOrder(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  includePrivate = false,
) {
  const items = await Promise.all(
    order.items.map(async (item) => ({
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.quantity * item.unitPriceMinor,
      name: item.perfumeVariant.perfume.name,
      slug: item.perfumeVariant.perfume.slug,
      sizeLabel: `${item.perfumeVariant.sizeValue.toString()} ${item.perfumeVariant.sizeUnit === "ML" ? "mL" : item.perfumeVariant.sizeUnit || "unit"}`,
      imageUrl: await getPerfumeImageUrl(item.perfumeVariant.perfume.images[0]?.path),
    })),
  );
  return {
    reference: order.reference,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    items,
    ...(includePrivate
      ? {
          customerName: order.customerName,
          whatsappNumber: order.whatsappNumber,
          email: order.email,
          deliveryArea: order.deliveryArea,
          deliveryAddress: order.deliveryAddress,
          orderNote: order.orderNote,
          events: order.statusEvents,
        }
      : {}),
  };
}

export async function createOrder(linesRaw: unknown, checkoutRaw: unknown, submissionKey: unknown) {
  const lines = parseLines(linesRaw);
  const parsed = parseCheckoutInput(checkoutRaw);
  if (!lines)
    return { error: "Your cart is empty or invalid. Return to Cart and try again." } as const;
  if (!parsed.input) return { errors: parsed.errors } as const;
  const input = parsed.input;
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey))
    return { error: "Unable to safely place this order. Please refresh and try again." } as const;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.order.findUnique({
          where: { submissionKey },
          include: orderInclude,
        });
        if (duplicate) return { order: duplicate, duplicate: true };
        const variants = await tx.perfumeVariant.findMany({
          where: {
            id: { in: lines.map((line) => line.perfumeVariantId) },
            perfume: { status: "PUBLISHED" },
          },
        });
        if (variants.length !== lines.length)
          throw new OrderConflict("One or more perfumes are no longer available.");
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
          if (updated.count !== 1)
            throw new OrderConflict(
              "One or more perfumes are no longer available in the requested quantity.",
            );
        }
        const subtotalMinor = lines.reduce(
          (total, line) => total + byId.get(line.perfumeVariantId)!.priceMinor * line.quantity,
          0,
        );
        const created = await tx.order.create({
          data: {
            reference: reference(),
            confirmationToken: token(),
            submissionKey,
            ...input,
            subtotalMinor,
            items: {
              create: lines.map((line) => ({
                perfumeVariantId: line.perfumeVariantId,
                quantity: line.quantity,
                unitPriceMinor: byId.get(line.perfumeVariantId)!.priceMinor,
              })),
            },
            statusEvents: { create: { toStatus: "NEW" } },
          },
        });
        const complete = await tx.order.findUniqueOrThrow({
          where: { id: created.id },
          include: orderInclude,
        });
        return { order: complete, duplicate: false };
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
    return {
      order: await projectOrder(result.order),
      confirmationToken: result.order.confirmationToken,
      duplicate: result.duplicate,
    } as const;
  } catch (error) {
    if (!(error instanceof OrderConflict)) {
      const failure = error as {
        name?: string;
        code?: string;
        cause?: { kind?: string; code?: string; constraint?: string; table?: string };
      };
      console.error("[orders] createOrder transaction failed", {
        name: failure?.name,
        code: failure?.code,
        causeKind: failure?.cause?.kind,
        causeCode: failure?.cause?.code,
        constraint: failure?.cause?.constraint,
        table: failure?.cause?.table,
      });
    }
    return {
      error:
        error instanceof OrderConflict
          ? error.message
          : "We could not create your order. Please try again.",
    } as const;
  }
}

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
              { customerName: { contains: query, mode: "insensitive" } },
              { whatsappNumber: { contains: query } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((order) => ({
    reference: order.reference,
    customerName: order.customerName,
    whatsappNumber: order.whatsappNumber,
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

export async function updateOrderStatus(referenceValue: string, nextStatus: unknown) {
  if (typeof nextStatus !== "string" || !orderStatuses.includes(nextStatus as OrderStatus))
    return { error: "Choose a valid order status." } as const;
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { reference: referenceValue } });
      if (!order) return { error: "Order not found." } as const;
      if (order.status === nextStatus) return { unchanged: true } as const;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus as OrderStatus,
          statusEvents: {
            create: { fromStatus: order.status, toStatus: nextStatus as OrderStatus },
          },
        },
      });
      return { ok: true } as const;
    });
  } catch {
    return { error: "Unable to update this order." } as const;
  }
}

export async function deleteOrder(referenceValue: string) {
  if (!referenceValue.trim()) return { error: "Order not found." } as const;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { reference: referenceValue },
          include: { items: true },
        });
        if (!order) return { error: "Order not found." } as const;

        const quantitiesByVariant = new Map<string, number>();
        for (const item of order.items) {
          quantitiesByVariant.set(
            item.perfumeVariantId,
            (quantitiesByVariant.get(item.perfumeVariantId) ?? 0) + item.quantity,
          );
        }
        for (const [perfumeVariantId, quantity] of quantitiesByVariant) {
          const restored = await tx.perfumeVariant.updateMany({
            where: { id: perfumeVariantId },
            data: { quantity: { increment: quantity } },
          });
          if (restored.count !== 1) throw new OrderConflict("Unable to restore order stock.");
        }

        await tx.orderStatusEvent.deleteMany({ where: { orderId: order.id } });
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.order.delete({ where: { id: order.id } });
        return { ok: true } as const;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    const failure = error as { name?: string; code?: string };
    console.error("[orders] deleteOrder transaction failed", {
      name: failure?.name,
      code: failure?.code,
    });
    return { error: "Unable to delete this order. No changes were made." } as const;
  }
}

export async function getOrdersAdminOverview() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const [awaitingAction, ordersThisWeek, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["NEW", "AWAITING_PAYMENT"] } } }),
    prisma.order.count({ where: { createdAt: { gte: start } } }),
    listOrders(),
  ]);
  return {
    awaitingAction,
    ordersThisWeek,
    recentOrders: recentOrders.slice(0, 3),
  };
}
