import "server-only";

import { randomBytes } from "crypto";

import { OrderStatus } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { commerceConfig } from "@/config/commerce";
import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/features/customers";

import { orderStatuses } from "./constants/order-statuses";
import { parseCheckoutInput } from "./parsers/checkout.parser";
import { projectPublicOrder, publicOrderInclude } from "./orders.projection";
import type { OrderCartLine } from "./types";

export { parseCheckoutInput } from "./parsers/checkout.parser";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

class OrderConflict extends Error {}

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
      quantity > commerceConfig.maximumVariantQuantity
    ) {
      return null;
    }
    merged.set(perfumeVariantId, (merged.get(perfumeVariantId) ?? 0) + quantity);
  }

  if ([...merged.values()].some((quantity) => quantity > commerceConfig.maximumVariantQuantity)) {
    return null;
  }
  return [...merged].map(([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity }));
}

function reference() {
  const code = [...randomBytes(7)].map((value) => REFERENCE_ALPHABET[value & 31]).join("");
  return `${commerceConfig.orderReference.prefix}${code}`;
}

function token() {
  return randomBytes(32).toString("base64url");
}

export async function createOrder(linesRaw: unknown, checkoutRaw: unknown, submissionKey: unknown) {
  const lines = parseLines(linesRaw);
  const parsed = parseCheckoutInput(checkoutRaw);
  if (!lines) {
    return { error: "Your cart is empty or invalid. Return to Cart and try again." } as const;
  }
  if (!parsed.input) return { errors: parsed.errors } as const;
  const input = parsed.input;
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey)) {
    return { error: "Unable to safely place this order. Please refresh and try again." } as const;
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const duplicate = await tx.order.findUnique({
          where: { submissionKey },
          include: publicOrderInclude,
        });
        if (duplicate) return { order: duplicate, duplicate: true };

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
        const created = await tx.order.create({
          data: {
            customerId: customer.id,
            reference: reference(),
            confirmationToken: token(),
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
        const complete = await tx.order.findUniqueOrThrow({
          where: { id: created.id },
          include: publicOrderInclude,
        });
        return { order: complete, duplicate: false };
      },
      { maxWait: 10_000, timeout: 15_000 },
    );

    return {
      order: await projectPublicOrder(result.order),
      confirmationToken: result.order.confirmationToken,
      duplicate: result.duplicate,
    } as const;
  } catch (error) {
    if (!(error instanceof OrderConflict) && !(error instanceof CustomerIdentityConflict)) {
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
          : error instanceof CustomerIdentityConflict
            ? error.message
            : "We could not create your order. Please try again.",
    } as const;
  }
}

export async function updateOrderStatus(referenceValue: string, nextStatus: unknown) {
  if (typeof nextStatus !== "string" || !orderStatuses.includes(nextStatus as OrderStatus)) {
    return { error: "Choose a valid order status." } as const;
  }
  if (nextStatus === "CANCELLED") {
    return { error: "Use the cancellation action to cancel an order." } as const;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { reference: referenceValue } });
      if (!order) return { error: "Order not found." } as const;
      if (order.status === "CANCELLED") {
        return { error: "Cancelled orders cannot be reopened." } as const;
      }
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

export async function cancelOrder(referenceValue: string) {
  if (!referenceValue.trim()) return { error: "Order not found." } as const;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { reference: referenceValue },
          include: { items: true },
        });
        if (!order) return { error: "Order not found." } as const;
        if (order.status === "CANCELLED" && order.stockRestoredAt) {
          return { unchanged: true } as const;
        }
        if (order.status === "CANCELLED") {
          return {
            error: "This cancelled order cannot be safely restored automatically.",
          } as const;
        }

        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: order.status, stockRestoredAt: null },
          data: { status: "CANCELLED", stockRestoredAt: new Date() },
        });
        if (claimed.count !== 1) {
          return { error: "This order was updated elsewhere. Refresh and try again." } as const;
        }

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

        await tx.orderStatusEvent.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED" },
        });
        return { ok: true } as const;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    const failure = error as { name?: string; code?: string };
    console.error("[orders] cancelOrder transaction failed", {
      name: failure?.name,
      code: failure?.code,
    });
    return { error: "Unable to cancel this order. No changes were made." } as const;
  }
}
