import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import type { VerifiedPaystackPayment } from "@/infrastructure/paystack/client";
import {
  consumeReservedStock,
  deductStockForOrder,
  hasActiveReservation,
  lockStockLines,
  recordStockAllocation,
  releaseHeldStock,
} from "@/modules/catalogue/server";
import {
  claimPaymentInitialisation,
  findPaymentAttempt,
  findVerifiedProviderIdentity,
  latestPaymentAttempt,
  readPaymentAttempt,
  recordAttemptVerification,
  recordPaymentInitialisation,
  requestRefund,
} from "@/modules/payments/server";

import { lockCommerceOrder } from "./commerce-order.repository";

export async function prepareCommerceInitialisation(orderId: string) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, orderId))) {
      return null;
    }
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { commerceStatus: true, emailSnapshot: true, reference: true },
    });
    const attempt = await latestPaymentAttempt(tx, orderId);
    if (order.commerceStatus !== "AWAITING_PAYMENT" || !attempt || !order.emailSnapshot) {
      return null;
    }
    const now = new Date();
    if (!(await hasActiveReservation(tx, attempt.id, now))) {
      return null;
    }
    if (attempt.status === "PENDING" && attempt.checkoutUrl) {
      return { checkoutUrl: attempt.checkoutUrl, reference: order.reference } as const;
    }
    if (!(await claimPaymentInitialisation(tx, attempt.id, now))) {
      return null;
    }
    return { attempt, email: order.emailSnapshot, reference: order.reference } as const;
  });
}

export async function saveCommerceInitialisation(
  orderId: string,
  attemptId: string,
  checkoutUrl: string | null,
) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, orderId))) {
      return false;
    }
    const now = new Date();
    await recordPaymentInitialisation(tx, attemptId, checkoutUrl, now);
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { commerceStatus: true },
    });
    return (
      order.commerceStatus === "AWAITING_PAYMENT" &&
      (await hasActiveReservation(tx, attemptId, now))
    );
  });
}

type PaymentAttempt = NonNullable<Awaited<ReturnType<typeof findPaymentAttempt>>>;

async function recordMatchingSuccess(
  tx: Prisma.TransactionClient,
  attempt: PaymentAttempt,
  verified: VerifiedPaystackPayment,
  now: Date,
) {
  // The Paystack identity also has a unique database constraint. Serialize the mismatch check
  // for concurrent attempts belonging to different orders.
  await tx.$queryRaw`
    SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`paystack:${attempt.environment}:${verified.providerId}`}, 0))
  `;
  const previous = await findVerifiedProviderIdentity(tx, attempt.environment, verified.providerId);
  if (previous && previous.id !== attempt.id) {
    await recordAttemptVerification(tx, attempt.id, {
      status: "NEEDS_ATTENTION",
      issue: "PROVIDER_IDENTITY_MISMATCH",
      now,
    });
    return false;
  }
  await recordAttemptVerification(tx, attempt.id, {
    status: "SUCCEEDED",
    providerId: verified.providerId,
    now,
  });
  return true;
}

async function applySuccessfulPayment(
  tx: Prisma.TransactionClient,
  attempt: PaymentAttempt,
  now: Date,
) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: attempt.orderId },
    select: {
      id: true,
      commerceStatus: true,
      paidAttemptId: true,
      items: { select: { perfumeVariantId: true, quantity: true } },
    },
  });
  const unavailable =
    order.commerceStatus === "CANCELLED" ||
    order.commerceStatus === "REFUND_REQUIRED" ||
    order.paidAttemptId !== null;
  if (unavailable) {
    await requestRefund(tx, {
      paymentAttemptId: attempt.id,
      requestKey: `automatic-full:${attempt.id}`,
      reason:
        order.commerceStatus === "CANCELLED" ? "Payment after cancellation" : "Additional payment",
      amountMinor: attempt.amountMinor,
    });
    return "REFUND_REQUIRED";
  }

  let allocated = await consumeReservedStock(tx, order.id, attempt.id, now);
  if (!allocated) {
    // Release an expired or newer hold first so every item is available to allocate as a single set.
    await lockStockLines(tx, order.items);
    await releaseHeldStock(tx, order.id, now, "CANCELLED");
    const stock = await deductStockForOrder(tx, order.items);
    if ("variants" in stock) {
      await recordStockAllocation(tx, order.id, attempt.id, order.items);
      allocated = true;
    }
  }

  if (allocated) {
    await tx.order.update({
      where: { id: order.id },
      data: { commerceStatus: "PAID", paidAttemptId: attempt.id },
    });
    return "PAID";
  }
  await requestRefund(tx, {
    paymentAttemptId: attempt.id,
    requestKey: `automatic-full:${attempt.id}`,
    reason: "Stock unavailable after reservation expired",
    amountMinor: attempt.amountMinor,
  });
  await tx.order.update({ where: { id: order.id }, data: { commerceStatus: "REFUND_REQUIRED" } });
  return "REFUND_REQUIRED";
}

export async function applyVerifiedCommercePayment(
  reference: string,
  verified: VerifiedPaystackPayment,
  now = new Date(),
) {
  const expected = await findPaymentAttempt(reference);
  if (!expected) {
    return "UNKNOWN" as const;
  }
  return prisma.$transaction(
    async (tx) => {
      if (!(await lockCommerceOrder(tx, expected.orderId))) {
        return "UNKNOWN" as const;
      }
      const attempt = await readPaymentAttempt(tx, expected.id);
      if (!attempt || attempt.status === "SUCCEEDED") {
        return "UNCHANGED" as const;
      }
      if (
        attempt.providerReference !== verified.reference ||
        attempt.amountMinor !== verified.amountMinor ||
        attempt.currency !== verified.currency ||
        attempt.environment !== verified.environment ||
        verified.status === "reversed"
      ) {
        await recordAttemptVerification(tx, attempt.id, {
          status: "NEEDS_ATTENTION",
          issue: "PROVIDER_FACTS_MISMATCH",
          now,
        });
        return "NEEDS_ATTENTION" as const;
      }
      if (verified.status !== "success" && attempt.status === "NEEDS_ATTENTION") {
        return "NEEDS_ATTENTION" as const;
      }
      if (verified.status === "success") {
        if (!(await recordMatchingSuccess(tx, attempt, verified, now))) {
          return "NEEDS_ATTENTION" as const;
        }
        return applySuccessfulPayment(tx, attempt, now);
      }
      if (verified.status === "failed") {
        if (attempt.status === "FAILED") {
          return "UNCHANGED" as const;
        }
        await recordAttemptVerification(tx, attempt.id, { status: "FAILED", now });
        if (await releaseHeldStock(tx, attempt.orderId, now, "CANCELLED", attempt.id)) {
          await tx.order.updateMany({
            where: { id: attempt.orderId, commerceStatus: "AWAITING_PAYMENT" },
            data: { commerceStatus: "RESERVATION_EXPIRED" },
          });
        }
        return "FAILED" as const;
      }
      return "PENDING" as const;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
