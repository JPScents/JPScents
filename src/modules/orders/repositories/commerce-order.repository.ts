import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@/infrastructure/database/generated/client";
import type { PaymentEnvironment } from "@/infrastructure/database/generated/enums";
import { prisma } from "@/infrastructure/database/prisma";

import type { AdminIdentity } from "@/modules/access/server";
import {
  deductStockForOrder,
  recordStockReservation,
  releaseHeldStock,
} from "@/modules/catalogue/server";
import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/modules/customers/server";
import { lockDeliveryQuote } from "@/modules/delivery/server";
import { createPaymentAttempt } from "@/modules/payments/server";

import type { CommerceCheckoutInput, CommerceQuoteInput } from "../types";
import { calculateCommerceTotals } from "../utils/commerce-totals";
import { createReference } from "./order.repository";

const orderForReplay = {
  reference: true,
  kind: true,
  checkoutSessionHash: true,
} satisfies Prisma.OrderSelect;

class CheckoutConflict extends Error {}

function resolveReplay(
  order: Prisma.OrderGetPayload<{ select: typeof orderForReplay }>,
  sessionHash: string,
) {
  if (order.kind !== "COMMERCE" || order.checkoutSessionHash !== sessionHash) {
    return { error: "This submission cannot be used. Refresh Checkout and try again." } as const;
  }
  return { order: { reference: order.reference }, duplicate: true } as const;
}

export async function lockCommerceOrder(tx: Prisma.TransactionClient, orderId: string) {
  const [order] = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid AND "kind" = 'COMMERCE' FOR UPDATE
  `;
  return order !== undefined;
}

async function lockSubmission(tx: Prisma.TransactionClient, submissionKey: string) {
  await tx.$queryRaw`
    SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`commerce-order:${submissionKey}`}, 0))
  `;
}

function snapshot(input: CommerceCheckoutInput) {
  return {
    customerNameSnapshot: input.customerName,
    whatsappNumberSnapshot: input.whatsappNumber,
    emailSnapshot: input.email,
    deliveryStateSnapshot: input.deliveryState,
    deliveryCitySnapshot: input.deliveryCity,
    deliveryAddressSnapshot: input.deliveryAddress,
    deliveryCountry: input.deliveryCountry,
    deliveryApartment: input.deliveryApartment,
    deliveryLandmark: input.deliveryLandmark,
    deliveryPostcode: input.deliveryPostcode,
    orderNote: input.orderNote,
  };
}

type LockedVariant = {
  perfume: { name: string };
  sizeValue: Prisma.Decimal;
  sizeUnit: string;
};

async function saveReservedOrder(
  tx: Prisma.TransactionClient,
  input: CommerceCheckoutInput,
  submissionKey: string,
  sessionHash: string,
  environment: PaymentEnvironment,
  quote: CommerceQuoteInput,
  totals: NonNullable<ReturnType<typeof calculateCommerceTotals>>,
  variants: ReadonlyMap<string, LockedVariant>,
) {
  const customer = await resolveCustomerForOrder(tx, {
    name: input.customerName,
    whatsappNumber: input.whatsappNumber,
    email: input.email,
    deliveryState: input.deliveryState,
    deliveryCity: input.deliveryCity,
    deliveryAddress: input.deliveryAddress,
  });
  const order = await tx.order.create({
    data: {
      ...snapshot(input),
      ...totals,
      customerId: customer.id,
      reference: createReference(),
      // The legacy column is mandatory during the expand migration. No commerce route uses this value.
      confirmationToken: randomBytes(32).toString("base64url"),
      submissionKey,
      checkoutSessionHash: sessionHash,
      kind: "COMMERCE",
      commerceStatus: "AWAITING_PAYMENT",
      fulfilmentStatus: "UNFULFILLED",
      items: {
        create: quote.lines.map(({ perfumeVariantId, quantity, unitPriceMinor }) => {
          const variant = variants.get(perfumeVariantId);
          if (!variant) {
            throw new Error("Stock reservation did not return the ordered variant.");
          }
          return {
            perfumeVariantId,
            quantity,
            unitPriceMinor,
            perfumeNameSnapshot: variant.perfume.name,
            sizeValueSnapshot: variant.sizeValue,
            sizeUnitSnapshot: variant.sizeUnit,
          };
        }),
      },
    },
    select: { id: true, reference: true },
  });
  const attempt = await createPaymentAttempt(tx, order.id, totals.totalMinor, environment);
  const expiresAt = await recordStockReservation(tx, order.id, attempt.id, quote.lines, new Date());
  return { order, attempt, expiresAt, duplicate: false, ...totals } as const;
}

export async function reserveCommerceOrder({
  input,
  quote,
  submissionKey,
  sessionToken,
  environment,
}: {
  input: CommerceCheckoutInput;
  quote: CommerceQuoteInput;
  submissionKey: string;
  sessionToken: string;
  environment: PaymentEnvironment;
}) {
  const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
  try {
    return await prisma.$transaction(
      async (tx) => {
        await lockSubmission(tx, submissionKey);
        const existing = await tx.order.findUnique({
          where: { submissionKey },
          select: orderForReplay,
        });
        if (existing) {
          return resolveReplay(existing, sessionHash);
        }

        const delivery = await lockDeliveryQuote(tx, input.deliveryState);
        if (!delivery) {
          return { error: "Delivery is unavailable for the selected state." } as const;
        }
        if (delivery.feeMinor !== quote.deliveryFeeMinor) {
          return { staleQuote: { deliveryFeeMinor: delivery.feeMinor } } as const;
        }
        const totals = calculateCommerceTotals(quote.lines, delivery.feeMinor);
        if (!totals) {
          return { error: "The order total is outside the supported range." } as const;
        }

        const expectedPrices = new Map(
          quote.lines.map((line) => [line.perfumeVariantId, line.unitPriceMinor]),
        );
        const stock = await deductStockForOrder(tx, quote.lines, expectedPrices);
        if ("error" in stock) {
          throw new CheckoutConflict(stock.error);
        }
        if ("stalePrices" in stock) {
          return {
            staleQuote: { deliveryFeeMinor: delivery.feeMinor, unitPrices: stock.stalePrices },
          } as const;
        }

        return saveReservedOrder(
          tx,
          input,
          submissionKey,
          sessionHash,
          environment,
          quote,
          totals,
          stock.variants,
        );
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof CheckoutConflict || error instanceof CustomerIdentityConflict) {
      return { error: error.message } as const;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.order.findUnique({
        where: { submissionKey },
        select: orderForReplay,
      });
      if (existing) {
        return resolveReplay(existing, sessionHash);
      }
    }
    throw error;
  }
}

export async function expireCommerceReservation(orderId: string, now = new Date()) {
  return await prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, orderId))) {
      return false;
    }
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { commerceStatus: true },
    });
    if (
      order?.commerceStatus !== "AWAITING_PAYMENT" ||
      !(await releaseHeldStock(tx, orderId, now, "EXPIRED"))
    ) {
      return false;
    }
    await tx.order.update({
      where: { id: orderId },
      data: { commerceStatus: "RESERVATION_EXPIRED" },
    });
    return true;
  });
}

export async function cancelUnpaidCommerceOrder(
  orderId: string,
  admin: AdminIdentity,
  reason: string,
  now = new Date(),
) {
  return await prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, orderId))) {
      return { error: "Order not found." } as const;
    }
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { commerceStatus: true },
    });
    if (order?.commerceStatus === "CANCELLED") {
      return { unchanged: true } as const;
    }
    if (
      order?.commerceStatus !== "AWAITING_PAYMENT" &&
      order?.commerceStatus !== "RESERVATION_EXPIRED"
    ) {
      return { error: "The order needs the paid cancellation workflow." } as const;
    }
    const released = await releaseHeldStock(tx, orderId, now, "CANCELLED");
    if (order.commerceStatus === "AWAITING_PAYMENT" && !released) {
      throw new Error("The unpaid order has no held reservation.");
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        commerceStatus: "CANCELLED",
        cancelledAt: now,
        cancelledBy: admin.id,
        cancellationReason: reason,
      },
    });
    return { ok: true } as const;
  });
}
