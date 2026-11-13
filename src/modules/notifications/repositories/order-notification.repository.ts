import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import type { OrderNotificationKind } from "@/infrastructure/database/generated/enums";
import { prisma } from "@/infrastructure/database/prisma";

const EMAIL_LEASE_MS = 60_000;
// Leave a margin before Resend can forget an idempotency key.
export const EMAIL_REPLAY_MS = 23 * 60 * 60 * 1000;

export async function createOrderNotification(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    eventKey: string;
    kind: OrderNotificationKind;
    recipient: string;
    subject: string;
    message: string;
  },
) {
  await tx.orderNotification.createMany({ data: input, skipDuplicates: true });
}

type EmailClaim = {
  id: string;
  orderId: string;
  recipient: string;
  subject: string;
  message: string;
  sender: string | null;
  statusLinkBase: string | null;
  statusKeyVersion: string | null;
  statusTokenHash: string | null;
  firstAttemptAt: Date | null;
  attempts: number;
};

export async function claimDueNotifications(now: Date, take: number) {
  const leaseId = randomUUID();
  const leaseUntil = new Date(now.getTime() + EMAIL_LEASE_MS);
  const emails = await prisma.$queryRaw<EmailClaim[]>`
    WITH due AS (
      SELECT "id" FROM "OrderNotification"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= ${now}
        AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now})
      ORDER BY "nextAttemptAt", "id" LIMIT ${take} FOR UPDATE SKIP LOCKED
    )
    UPDATE "OrderNotification" email
    SET "leaseId" = ${leaseId}::uuid, "leaseUntil" = ${leaseUntil}
    FROM due WHERE email."id" = due."id"
    RETURNING email."id", email."orderId", email."recipient", email."subject", email."message",
      email."sender", email."statusLinkBase", email."statusKeyVersion", email."statusTokenHash", email."firstAttemptAt",
      email."attempts"
  `;
  return { leaseId, emails };
}

export async function beginNotificationAttempt(
  tx: Prisma.TransactionClient,
  claim: { id: string; orderId: string; leaseId: string },
  snapshot: {
    sender: string;
    statusLinkBase: string;
    statusKeyVersion: string;
    statusTokenHash: string;
    firstAttemptAt: Date;
  },
  now: Date,
) {
  const result = await tx.orderNotification.updateMany({
    where: {
      ...claim,
      status: "PENDING",
      leaseUntil: { gt: now },
      OR: [
        { firstAttemptAt: null },
        {
          ...snapshot,
          firstAttemptAt: {
            equals: snapshot.firstAttemptAt,
            gt: new Date(now.getTime() - EMAIL_REPLAY_MS),
          },
        },
      ],
    },
    data: { ...snapshot, attempts: { increment: 1 } },
  });
  return result.count === 1;
}

export async function finishNotification(
  id: string,
  leaseId: string,
  outcome: { messageId: string } | { issue: string; nextAttemptAt?: Date },
  now: Date,
) {
  const data: Prisma.OrderNotificationUpdateManyMutationInput =
    "messageId" in outcome
      ? {
          status: "ACCEPTED",
          acceptedAt: now,
          providerMessageId: outcome.messageId,
          issue: null,
        }
      : {
          status: outcome.nextAttemptAt ? "PENDING" : "NEEDS_ATTENTION",
          nextAttemptAt: outcome.nextAttemptAt,
          issue: outcome.issue,
        };
  await prisma.orderNotification.updateMany({
    where: { id, leaseId },
    data: { ...data, leaseId: null, leaseUntil: null },
  });
}

export async function listUnresolvedNotifications(take: number) {
  return prisma.orderNotification.findMany({
    where: { status: { not: "ACCEPTED" } },
    select: {
      id: true,
      kind: true,
      status: true,
      issue: true,
      createdAt: true,
      nextAttemptAt: true,
      firstAttemptAt: true,
      order: { select: { reference: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
  });
}

export async function requeueNotification(id: string, now: Date) {
  const result = await prisma.orderNotification.updateMany({
    where: {
      id,
      AND: [
        { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
        {
          OR: [
            { status: "PENDING", firstAttemptAt: null },
            {
              status: { in: ["PENDING", "NEEDS_ATTENTION"] },
              firstAttemptAt: { gt: new Date(now.getTime() - EMAIL_REPLAY_MS) },
              issue: {
                in: [
                  "EMAIL_REJECTED",
                  "EMAIL_CONFIGURATION",
                  "EMAIL_RATE_LIMIT",
                  "EMAIL_AMBIGUOUS",
                ],
              },
            },
          ],
        },
      ],
    },
    data: { status: "PENDING", nextAttemptAt: now },
  });
  return result.count === 1;
}
