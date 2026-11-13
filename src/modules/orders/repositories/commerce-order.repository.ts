import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@/infrastructure/database/generated/client";
import type { PaymentEnvironment } from "@/infrastructure/database/generated/enums";
import { prisma } from "@/infrastructure/database/prisma";

import {
  CatalogueStockConflict,
  deductStockForOrder,
  recordStockReservation,
  releaseHeldStock,
} from "@/modules/catalogue/server";
import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/modules/customers/server";
import { lockDeliveryQuote } from "@/modules/delivery/server";
import { createPaymentAttempt, latestPaymentAttempt } from "@/modules/payments/server";

import type { CommerceCheckoutCommand, CommerceCheckoutInput, CommerceQuoteInput } from "../types";
import { calculateCommerceTotals } from "../utils/commerce-totals";
import { createReference } from "./order.repository";
import { completeCheckoutQuote, lockIssuedCheckoutQuote } from "./checkout-draft.repository";

const orderForReplay = {
  id: true,
  reference: true,
  kind: true,
  checkoutSessionHash: true,
} satisfies Prisma.OrderSelect;

class CheckoutConflict extends Error {}

async function resolveReplay(
  tx: Prisma.TransactionClient,
  order: Prisma.OrderGetPayload<{ select: typeof orderForReplay }>,
  sessionHash: string,
) {
  if (order.kind !== "COMMERCE" || order.checkoutSessionHash !== sessionHash) {
    return { error: "This submission cannot be used. Refresh Checkout and try again." } as const;
  }
  const attempt = await latestPaymentAttempt(tx, order.id);
  return { order: { id: order.id, reference: order.reference }, attempt, duplicate: true } as const;
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
  issuedQuote,
}: CommerceCheckoutCommand) {
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
          return resolveReplay(tx, existing, sessionHash);
        }

        const draft = issuedQuote
          ? await lockIssuedCheckoutQuote(tx, issuedQuote.token, issuedQuote.version)
          : null;
        if (issuedQuote && (!draft || !matchesIssuedQuote(quote, draft.lines))) {
          return { error: "This checkout link is expired, changed or unavailable." } as const;
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
        const stock = await deductStockForOrder(tx, quote.lines, expectedPrices, draft !== null);
        if ("error" in stock) {
          throw new CheckoutConflict(stock.error);
        }
        if ("stalePrices" in stock) {
          return {
            staleQuote: { deliveryFeeMinor: delivery.feeMinor, unitPrices: stock.stalePrices },
          } as const;
        }

        const result = await saveReservedOrder(
          tx,
          input,
          submissionKey,
          sessionHash,
          environment,
          quote,
          totals,
          stock.variants,
        );
        if (draft) {
          await completeCheckoutQuote(tx, draft.id, result.order.id);
        }
        return result;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (
      error instanceof CheckoutConflict ||
      error instanceof CatalogueStockConflict ||
      error instanceof CustomerIdentityConflict
    ) {
      return { error: error.message } as const;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.order.findUnique({
        where: { submissionKey },
        select: orderForReplay,
      });
      if (existing) {
        return prisma.$transaction((tx) => resolveReplay(tx, existing, sessionHash));
      }
    }
    throw error;
  }
}

function matchesIssuedQuote(
  quote: CommerceQuoteInput,
  lines: Array<{
    perfumeVariantId: string;
    quantity: number;
    quotedPriceMinor: number | null;
  }>,
) {
  if (quote.lines.length !== lines.length) {
    return false;
  }
  const expected = new Map(lines.map((line) => [line.perfumeVariantId, line]));
  return quote.lines.every((line) => {
    const accepted = expected.get(line.perfumeVariantId);
    return (
      accepted?.quantity === line.quantity && accepted.quotedPriceMinor === line.unitPriceMinor
    );
  });
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

export async function retryFailedCommerceOrder(
  orderId: string,
  { input, quote, sessionToken, environment, issuedQuote }: CommerceCheckoutCommand,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (!(await lockCommerceOrder(tx, orderId))) {
          return { error: "This order cannot be retried." } as const;
        }
        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            items: { select: { perfumeVariantId: true, quantity: true, unitPriceMinor: true } },
            checkoutDraft: { select: { capabilityHash: true, expiresAt: true, version: true } },
          },
        });
        const latest = await latestPaymentAttempt(tx, orderId);
        if (
          order.checkoutSessionHash !== createHash("sha256").update(sessionToken).digest("hex") ||
          (latest && latest.environment !== environment)
        ) {
          return { error: "This browser cannot retry that payment." } as const;
        }
        if (order.commerceStatus !== "RESERVATION_EXPIRED" || latest?.status !== "FAILED") {
          return { pending: true } as const;
        }
        if (
          order.checkoutDraft &&
          (!issuedQuote ||
            order.checkoutDraft.version !== issuedQuote.version ||
            !order.checkoutDraft.expiresAt ||
            order.checkoutDraft.expiresAt <= new Date() ||
            order.checkoutDraft.capabilityHash !==
              createHash("sha256").update(issuedQuote.token).digest("hex"))
        ) {
          return { error: "The issued quote is no longer valid for a retry." } as const;
        }
        if (
          order.deliveryStateSnapshot !== input.deliveryState ||
          order.deliveryCitySnapshot !== input.deliveryCity ||
          order.deliveryAddressSnapshot !== input.deliveryAddress ||
          order.emailSnapshot !== input.email ||
          order.customerNameSnapshot !== input.customerName ||
          order.whatsappNumberSnapshot !== input.whatsappNumber ||
          order.deliveryApartment !== (input.deliveryApartment ?? null) ||
          order.deliveryLandmark !== (input.deliveryLandmark ?? null) ||
          order.deliveryPostcode !== (input.deliveryPostcode ?? null) ||
          order.orderNote !== (input.orderNote ?? null)
        ) {
          return order.checkoutDraft
            ? ({
                error: "Use the original checkout details or contact JPScents for an updated link.",
              } as const)
            : ({ restartCheckout: true } as const);
        }
        const delivery = await lockDeliveryQuote(tx, input.deliveryState);
        if (!delivery) {
          return { error: "Delivery is unavailable for the selected state." } as const;
        }
        const accepted = new Map(order.items.map((line) => [line.perfumeVariantId, line]));
        const sameBasket =
          quote.lines.length === accepted.size &&
          quote.lines.every((line) => {
            const previous = accepted.get(line.perfumeVariantId);
            return (
              previous?.quantity === line.quantity &&
              previous.unitPriceMinor === line.unitPriceMinor
            );
          });
        if (order.checkoutDraft && !sameBasket) {
          return {
            error: "This checkout link no longer matches the order. Contact JPScents for help.",
          } as const;
        }
        if (!sameBasket || order.deliveryFeeMinor !== delivery.feeMinor) {
          return order.checkoutDraft
            ? ({
                error: "The delivery fee changed. Contact JPScents for an updated link.",
              } as const)
            : ({ restartCheckout: true } as const);
        }
        if (order.deliveryFeeMinor !== quote.deliveryFeeMinor) {
          return {
            staleQuote: { deliveryFeeMinor: delivery.feeMinor, unitPrices: undefined },
          } as const;
        }
        const stock = await deductStockForOrder(
          tx,
          quote.lines,
          new Map(quote.lines.map((line) => [line.perfumeVariantId, line.unitPriceMinor])),
          Boolean(order.checkoutDraft),
        );
        if ("error" in stock) {
          throw new CheckoutConflict(stock.error);
        }
        if ("stalePrices" in stock) {
          return { restartCheckout: true } as const;
        }
        if (order.totalMinor === null) {
          throw new Error("A commerce order must have an accepted total.");
        }
        const attempt = await createPaymentAttempt(tx, order.id, order.totalMinor, environment);
        await recordStockReservation(tx, order.id, attempt.id, quote.lines, new Date());
        await tx.order.update({
          where: { id: order.id },
          data: { commerceStatus: "AWAITING_PAYMENT" },
        });
        return { reference: order.reference, retry: true } as const;
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof CheckoutConflict || error instanceof CatalogueStockConflict) {
      return { error: error.message } as const;
    }
    throw error;
  }
}
