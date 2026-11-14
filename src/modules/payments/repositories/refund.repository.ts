import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import type { RefundStatus } from "@/infrastructure/database/generated/enums";
import { prisma } from "@/infrastructure/database/prisma";

export async function requestRefund(
  tx: Prisma.TransactionClient,
  input: {
    paymentAttemptId: string;
    requestKey: string;
    reason: string;
    amountMinor: number;
    requestedBy?: string;
  },
) {
  return tx.refund.upsert({
    where: { requestKey: input.requestKey },
    create: { ...input, providerReference: `jpscents-refund-${randomUUID()}` },
    update: {},
    select: { id: true, status: true },
  });
}

export async function claimDueRefunds(now: Date, take: number) {
  const leaseId = randomUUID();
  const leaseUntil = new Date(now.getTime() + 60_000);
  const refunds = await prisma.$queryRaw<
    {
      id: string;
      orderId: string;
      providerReference: string;
      amountMinor: number;
      status: RefundStatus;
      transactionReference: string;
      transactionId: string | null;
      environment: "TEST" | "LIVE";
    }[]
  >`
    WITH due AS (
      SELECT "id" FROM "Refund"
      WHERE ("status" IN ('REQUESTED', 'AMBIGUOUS', 'PENDING', 'PROCESSING', 'NEEDS_ATTENTION')
          OR ("status" = 'FAILED' AND "operatorRecheck"))
        AND "nextCheckAt" <= ${now} AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
      ORDER BY "nextCheckAt", "id" LIMIT ${take} FOR UPDATE SKIP LOCKED
    )
    UPDATE "Refund" refund
    SET "leaseId" = ${leaseId}::uuid, "leaseUntil" = ${leaseUntil}
    FROM due, "PaymentAttempt" attempt
    WHERE refund."id" = due."id" AND attempt."id" = refund."paymentAttemptId"
    RETURNING refund."id", attempt."orderId", refund."providerReference", refund."amountMinor", refund."status",
      attempt."providerReference" AS "transactionReference", attempt."providerId" AS "transactionId",
      attempt."environment"
  `;
  return { leaseId, refunds };
}

export async function finishRefundCheck(
  tx: Prisma.TransactionClient,
  claim: { id: string; orderId: string; leaseId: string },
  status: RefundStatus | "MISMATCH",
) {
  const now = new Date();
  const { id, orderId, leaseId } = claim;
  const refund = await tx.refund.findFirst({
    where: { id, leaseId, paymentAttempt: { orderId } },
    select: { status: true, issue: true, amountMinor: true },
  });
  if (!refund) {
    return null;
  }
  let next: RefundStatus = status === "MISMATCH" ? "NEEDS_ATTENTION" : status;
  if (
    (status === "AMBIGUOUS" && refund.status !== "REQUESTED") ||
    (status === "PENDING" && refund.status === "PROCESSING") ||
    (status === "MISMATCH" && refund.status === "FAILED")
  ) {
    next = refund.status;
  }
  const result = await tx.refund.updateMany({
    where: { id, leaseId },
    data: {
      leaseId: null,
      leaseUntil: null,
      status: next,
      operatorRecheck: next === "FAILED" && (status === "AMBIGUOUS" || status === "MISMATCH"),
      issue:
        status === "MISMATCH"
          ? "REFUND_FACTS_MISMATCH"
          : status === "NEEDS_ATTENTION"
            ? "PROVIDER_ACTION_REQUIRED"
            : status === "AMBIGUOUS"
              ? (refund.issue ?? "REFUND_VERIFICATION_UNAVAILABLE")
              : null,
      nextCheckAt: new Date(now.getTime() + (status === "AMBIGUOUS" ? 60_000 : 300_000)),
    },
  });
  return result.count === 1
    ? {
        previous: refund.status,
        previousIssue: refund.issue,
        next,
        amountMinor: refund.amountMinor,
      }
    : null;
}

export async function refundableBalance(
  tx: Prisma.TransactionClient,
  attemptId: string,
  chargedMinor: number,
) {
  const reserved = await tx.refund.aggregate({
    where: { paymentAttemptId: attemptId },
    _sum: { amountMinor: true },
  });
  return chargedMinor - (reserved._sum.amountMinor ?? 0);
}

export async function hasRefundRequest(
  tx: Prisma.TransactionClient,
  requestKey: string,
  paymentAttemptId: string,
) {
  return Boolean(
    await tx.refund.findUnique({ where: { requestKey, paymentAttemptId }, select: { id: true } }),
  );
}

export async function listUnresolvedRefunds(take: number) {
  return prisma.refund.findMany({
    where: { status: { not: "PROCESSED" } },
    select: {
      id: true,
      status: true,
      issue: true,
      createdAt: true,
      nextCheckAt: true,
      providerReference: true,
      paymentAttempt: { select: { order: { select: { reference: true } } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
  });
}

export async function listGuestRefundProgress(tx: Prisma.TransactionClient, orderId: string) {
  return tx.refund.findMany({
    where: { paymentAttempt: { orderId } },
    select: { id: true, amountMinor: true, status: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
}

export async function prioritiseRefundCheck(id: string, now: Date) {
  const result = await prisma.refund.updateMany({
    where: {
      id,
      status: { not: "PROCESSED" },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    },
    data: { operatorRecheck: true, nextCheckAt: now },
  });
  return result.count === 1;
}
