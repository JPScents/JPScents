import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import type { PaymentEnvironment } from "@/infrastructure/database/generated/enums";
import { prisma } from "@/infrastructure/database/prisma";

export async function createPaymentAttempt(
  tx: Prisma.TransactionClient,
  orderId: string,
  amountMinor: number,
  environment: PaymentEnvironment,
) {
  return tx.paymentAttempt.create({
    data: {
      orderId,
      amountMinor,
      currency: "NGN",
      environment,
      providerReference: `jpscents-${randomUUID()}`,
    },
    select: { id: true, providerReference: true },
  });
}

export const paymentAttemptSelect = {
  id: true,
  orderId: true,
  providerReference: true,
  amountMinor: true,
  currency: true,
  environment: true,
  status: true,
  checkoutUrl: true,
  providerId: true,
  initialiseStartedAt: true,
} satisfies Prisma.PaymentAttemptSelect;

export async function findPaymentAttempt(reference: string) {
  return prisma.paymentAttempt.findUnique({
    where: { providerReference: reference },
    select: paymentAttemptSelect,
  });
}

export async function readPaymentAttempt(tx: Prisma.TransactionClient, id: string) {
  return tx.paymentAttempt.findUnique({ where: { id }, select: paymentAttemptSelect });
}

export async function findPaymentAttemptByOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  reference: string,
) {
  return tx.paymentAttempt.findUnique({
    where: { providerReference: reference, orderId },
    select: paymentAttemptSelect,
  });
}

export async function latestPaymentAttempt(tx: Prisma.TransactionClient, orderId: string) {
  return tx.paymentAttempt.findFirst({
    where: { orderId },
    select: paymentAttemptSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function claimPaymentInitialisation(
  tx: Prisma.TransactionClient,
  attemptId: string,
  now: Date,
) {
  const claim = await tx.paymentAttempt.updateMany({
    where: { id: attemptId, status: "INITIATING", initialiseStartedAt: null },
    data: { initialiseStartedAt: now, nextCheckAt: new Date(now.getTime() + 60_000) },
  });
  return claim.count === 1;
}

export async function recordPaymentInitialisation(
  tx: Prisma.TransactionClient,
  attemptId: string,
  checkoutUrl: string | null,
  now: Date,
) {
  await tx.paymentAttempt.updateMany({
    where: { id: attemptId, status: "INITIATING" },
    data: {
      status: checkoutUrl ? "PENDING" : "AMBIGUOUS",
      checkoutUrl,
      issue: checkoutUrl ? null : "INITIALISATION_UNCERTAIN",
      nextCheckAt: new Date(now.getTime() + 60_000),
    },
  });
}

export async function closeUnstartedPayment(tx: Prisma.TransactionClient, orderId: string) {
  await tx.paymentAttempt.updateMany({
    where: { orderId, status: "INITIATING", initialiseStartedAt: null },
    data: { status: "FAILED", issue: "INITIALISATION_NOT_STARTED" },
  });
}

export async function recordAttemptVerification(
  tx: Prisma.TransactionClient,
  attemptId: string,
  facts: {
    status: "SUCCEEDED" | "FAILED" | "NEEDS_ATTENTION";
    providerId?: string;
    issue?: string;
    now: Date;
  },
) {
  return tx.paymentAttempt.update({
    where: { id: attemptId },
    data: {
      status: facts.status,
      providerId: facts.providerId,
      checkoutUrl: null,
      verifiedAt: facts.now,
      issue: facts.issue ?? null,
      nextCheckAt: new Date(facts.now.getTime() + 15 * 60_000),
    },
    select: { id: true },
  });
}

export async function findVerifiedProviderIdentity(
  tx: Prisma.TransactionClient,
  environment: PaymentEnvironment,
  providerId: string,
) {
  return tx.paymentAttempt.findFirst({
    where: { environment, providerId },
    select: { id: true },
  });
}
