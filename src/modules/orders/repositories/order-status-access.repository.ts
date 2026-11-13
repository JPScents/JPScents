import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import { hasActiveReservation } from "@/modules/catalogue/server";
import { isNigerianDestination } from "@/modules/delivery";
import {
  findPaymentAttemptByOrder,
  latestPaymentAttempt,
  listGuestRefundProgress,
} from "@/modules/payments/server";

import { lockCommerceOrder } from "./commerce-order.repository";
import { hasCurrentCheckoutQuote } from "./checkout-draft.repository";
import type { CommerceCheckoutRecovery } from "../types";

const STATUS_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const statusSelect = {
  id: true,
  reference: true,
  commerceStatus: true,
  fulfilmentStatus: true,
  paidAttemptId: true,
  checkoutDraft: { select: { capabilityHash: true, expiresAt: true } },
  checkoutSessionHash: true,
  submissionKey: true,
  subtotalMinor: true,
  deliveryFeeMinor: true,
  totalMinor: true,
  items: {
    select: {
      perfumeNameSnapshot: true,
      perfumeVariantId: true,
      sizeValueSnapshot: true,
      quantity: true,
      unitPriceMinor: true,
    },
  },
} satisfies Prisma.OrderSelect;

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function grantCommerceStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
  token: string,
  startsAt: Date,
) {
  const digest = hash(token);
  await tx.orderCapability.upsert({
    where: { hash: digest },
    create: {
      orderId,
      purpose: "STATUS",
      hash: digest,
      expiresAt: new Date(startsAt.getTime() + STATUS_LIFETIME_MS),
    },
    update: {},
  });
}

export async function issueCheckoutStatusToken(orderId: string, sessionToken: string) {
  const key = process.env.COMMERCE_STATUS_SECRET;
  if (!key || key.length < 32) {
    throw new Error("Order status signing is unavailable.");
  }
  const now = new Date();
  return await prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, orderId))) {
      return null;
    }
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { checkoutSessionHash: true, statusTokenNonce: true },
    });
    if (order.checkoutSessionHash !== hash(sessionToken)) {
      return null;
    }
    const nonce = order.statusTokenNonce ?? randomBytes(16).toString("hex");
    if (!order.statusTokenNonce) {
      await tx.order.update({ where: { id: orderId }, data: { statusTokenNonce: nonce } });
    }
    const token = createHmac("sha256", key)
      .update(`checkout-status:${orderId}:${nonce}`)
      .digest("base64url");
    await grantCommerceStatus(tx, orderId, token, now);
    return token;
  });
}

export async function getCommerceStatus(
  token: string | undefined,
  checkoutSession?: string | null,
  quoteToken?: string,
) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }
  return prisma.$transaction(async (tx) => {
    const capability = await tx.orderCapability.findUnique({
      where: {
        hash: hash(token),
        purpose: "STATUS",
        revokedAt: null,
        expiresAt: { gt: new Date() },
        order: { kind: "COMMERCE" },
      },
      select: { order: { select: statusSelect } },
    });
    if (!capability) {
      return null;
    }
    const { order } = capability;
    const attempt = await latestPaymentAttempt(tx, order.id);
    const refunds = await listGuestRefundProgress(tx, order.id);
    const ownCheckout = Boolean(
      checkoutSession && order.checkoutSessionHash === hash(checkoutSession),
    );
    const currentQuote =
      !order.checkoutDraft || hasCurrentCheckoutQuote(order.checkoutDraft, quoteToken, new Date());
    const paymentFailed =
      !order.paidAttemptId &&
      attempt?.status === "FAILED" &&
      order.commerceStatus === "RESERVATION_EXPIRED";
    return {
      reference: order.reference,
      status: order.commerceStatus,
      fulfilment: order.fulfilmentStatus,
      payment: order.paidAttemptId ? ("SUCCEEDED" as const) : (attempt?.status ?? null),
      paymentFailed,
      retryable: ownCheckout && currentQuote && paymentFailed,
      canContinue:
        ownCheckout &&
        currentQuote &&
        order.commerceStatus === "AWAITING_PAYMENT" &&
        ((attempt?.status === "PENDING" && Boolean(attempt.checkoutUrl)) ||
          (attempt?.status === "INITIATING" && !attempt.initialiseStartedAt)) &&
        (await hasActiveReservation(tx, attempt.id, new Date())),
      issuedQuote: order.checkoutDraft !== null,
      subtotalMinor: order.subtotalMinor,
      deliveryFeeMinor: order.deliveryFeeMinor,
      totalMinor: order.totalMinor,
      refunds,
      paidCart:
        order.paidAttemptId && !order.checkoutDraft && ownCheckout
          ? {
              submissionKey: order.submissionKey,
              lines: order.items.map(({ perfumeVariantId, quantity }) => ({
                perfumeVariantId,
                quantity,
              })),
            }
          : null,
      items: order.items.map((item) => ({
        name: item.perfumeNameSnapshot ?? "Perfume",
        size: item.sizeValueSnapshot ? `${item.sizeValueSnapshot.toString()} mL` : "",
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      })),
    };
  });
}

export async function getCommerceCheckoutRecovery(
  statusToken: string | undefined,
  checkoutSession: string | null,
  draftId?: string,
): Promise<CommerceCheckoutRecovery | null> {
  if (!checkoutSession || !statusToken || !/^[A-Za-z0-9_-]{43}$/.test(statusToken)) {
    return null;
  }
  return prisma.$transaction(async (tx) => {
    const capability = await tx.orderCapability.findUnique({
      where: {
        hash: hash(statusToken),
        purpose: "STATUS",
        revokedAt: null,
        expiresAt: { gt: new Date() },
        order: {
          kind: "COMMERCE",
          commerceStatus: "RESERVATION_EXPIRED",
          checkoutSessionHash: hash(checkoutSession),
          checkoutDraft: draftId ? { id: draftId } : { is: null },
        },
      },
      select: {
        order: {
          select: {
            id: true,
            submissionKey: true,
            customerNameSnapshot: true,
            emailSnapshot: true,
            whatsappNumberSnapshot: true,
            deliveryStateSnapshot: true,
            deliveryCitySnapshot: true,
            deliveryAddressSnapshot: true,
            deliveryApartment: true,
            deliveryLandmark: true,
            deliveryPostcode: true,
            orderNote: true,
          },
        },
      },
    });
    const order = capability?.order;
    if (
      !order?.customerNameSnapshot ||
      !order.emailSnapshot ||
      !order.whatsappNumberSnapshot ||
      !isNigerianDestination(order.deliveryStateSnapshot) ||
      !order.deliveryCitySnapshot ||
      !order.deliveryAddressSnapshot ||
      (await latestPaymentAttempt(tx, order.id))?.status !== "FAILED"
    ) {
      return null;
    }
    return {
      submissionKey: order.submissionKey,
      details: {
        customerName: order.customerNameSnapshot,
        email: order.emailSnapshot,
        whatsappNumber: order.whatsappNumberSnapshot,
        deliveryCountry: "NG",
        deliveryState: order.deliveryStateSnapshot,
        deliveryCity: order.deliveryCitySnapshot,
        deliveryAddress: order.deliveryAddressSnapshot,
        deliveryApartment: order.deliveryApartment ?? undefined,
        deliveryLandmark: order.deliveryLandmark ?? undefined,
        deliveryPostcode: order.deliveryPostcode ?? undefined,
        orderNote: order.orderNote ?? undefined,
      },
    };
  });
}

export async function findCommerceStatusExpiry(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }
  const capability = await prisma.orderCapability.findUnique({
    where: {
      hash: hash(token),
      purpose: "STATUS",
      revokedAt: null,
      expiresAt: { gt: new Date() },
      order: { kind: "COMMERCE" },
    },
    select: { expiresAt: true },
  });
  return capability?.expiresAt ?? null;
}

export async function findStatusOrderPayment(
  token: string | undefined,
  reference?: string,
  checkoutSession?: string,
) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }
  return prisma.$transaction(async (tx) => {
    const capability = await tx.orderCapability.findUnique({
      where: {
        hash: hash(token),
        purpose: "STATUS",
        revokedAt: null,
        expiresAt: { gt: new Date() },
        order: {
          kind: "COMMERCE",
          ...(checkoutSession ? { checkoutSessionHash: hash(checkoutSession) } : {}),
        },
      },
      select: { orderId: true },
    });
    if (!capability) {
      return null;
    }
    if (reference) {
      return findPaymentAttemptByOrder(tx, capability.orderId, reference);
    }
    return latestPaymentAttempt(tx, capability.orderId);
  });
}
