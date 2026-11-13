import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

const paymentStatuses = ["INITIATING", "PENDING", "AMBIGUOUS", "NEEDS_ATTENTION"] as const;

export async function claimDuePaymentWork(now: Date, take: number) {
  const leaseId = randomUUID();
  const leaseUntil = new Date(now.getTime() + 60_000);
  return prisma.$transaction(async (tx) => {
    const receipts = await tx.$queryRaw<
      { id: string; providerReference: string; environment: "TEST" | "LIVE" }[]
    >`
      WITH due AS (
        SELECT "id" FROM "PaystackReceipt"
        WHERE "processedAt" IS NULL AND "nextCheckAt" <= ${now}
          AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
        ORDER BY "nextCheckAt", "id" LIMIT ${take} FOR UPDATE SKIP LOCKED
      )
      UPDATE "PaystackReceipt" receipt
      SET "leaseId" = ${leaseId}::uuid, "leaseUntil" = ${leaseUntil}
      FROM due WHERE receipt."id" = due."id"
      RETURNING receipt."id", receipt."providerReference", receipt."environment"
    `;
    const statuses = Prisma.join(
      paymentStatuses.map((status) => Prisma.sql`${status}::"PaymentAttemptStatus"`),
    );
    const attempts = await tx.$queryRaw<
      { id: string; providerReference: string; environment: "TEST" | "LIVE" }[]
    >`
      WITH due AS (
        SELECT "id" FROM "PaymentAttempt"
        WHERE "status" IN (${statuses}) AND "nextCheckAt" <= ${now}
          AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
        ORDER BY "nextCheckAt", "id" LIMIT ${take} FOR UPDATE SKIP LOCKED
      )
      UPDATE "PaymentAttempt" attempt
      SET "leaseId" = ${leaseId}::uuid, "leaseUntil" = ${leaseUntil}
      FROM due WHERE attempt."id" = due."id"
      RETURNING attempt."id", attempt."providerReference", attempt."environment"
    `;
    return { leaseId, receipts, attempts };
  });
}

export async function finishReceipt(id: string, leaseId: string, done: boolean) {
  const now = new Date();
  await prisma.paystackReceipt.updateMany({
    where: { id, leaseId },
    data: {
      leaseId: null,
      leaseUntil: null,
      processedAt: done ? now : undefined,
      nextCheckAt: new Date(now.getTime() + 60_000),
    },
  });
}

export async function finishPaymentCheck(id: string, leaseId: string, unavailable: boolean) {
  const now = new Date();
  await prisma.paymentAttempt.updateMany({
    where: { id, leaseId },
    data: {
      leaseId: null,
      leaseUntil: null,
      nextCheckAt: new Date(now.getTime() + (unavailable ? 120_000 : 60_000)),
    },
  });
}
