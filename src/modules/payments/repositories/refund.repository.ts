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
      WHERE "status" IN ('REQUESTED', 'AMBIGUOUS', 'PENDING', 'PROCESSING', 'NEEDS_ATTENTION')
        AND "nextCheckAt" <= ${now} AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
      ORDER BY "nextCheckAt", "id" LIMIT ${take} FOR UPDATE SKIP LOCKED
    )
    UPDATE "Refund" refund
    SET "leaseId" = ${leaseId}::uuid, "leaseUntil" = ${leaseUntil}
    FROM due, "PaymentAttempt" attempt
    WHERE refund."id" = due."id" AND attempt."id" = refund."paymentAttemptId"
    RETURNING refund."id", refund."providerReference", refund."amountMinor", refund."status",
      attempt."providerReference" AS "transactionReference", attempt."providerId" AS "transactionId",
      attempt."environment"
  `;
  return { leaseId, refunds };
}

export async function finishRefundCheck(
  id: string,
  leaseId: string,
  status: RefundStatus | "MISMATCH",
) {
  const now = new Date();
  await prisma.refund.updateMany({
    where: { id, leaseId },
    data: {
      leaseId: null,
      leaseUntil: null,
      status: status === "MISMATCH" ? "NEEDS_ATTENTION" : status,
      issue:
        status === "MISMATCH"
          ? "REFUND_FACTS_MISMATCH"
          : status === "NEEDS_ATTENTION"
            ? "PROVIDER_ACTION_REQUIRED"
            : null,
      nextCheckAt: new Date(now.getTime() + (status === "AMBIGUOUS" ? 60_000 : 300_000)),
    },
  });
}
