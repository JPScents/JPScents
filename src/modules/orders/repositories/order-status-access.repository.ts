import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import { findPaymentAttemptByOrder, latestPaymentAttempt } from "@/modules/payments/server";

import { lockCommerceOrder } from "./commerce-order.repository";

const STATUS_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const statusSelect = {
  id: true,
  reference: true,
  commerceStatus: true,
  fulfilmentStatus: true,
  paidAttemptId: true,
  checkoutDraft: { select: { id: true } },
  subtotalMinor: true,
  deliveryFeeMinor: true,
  totalMinor: true,
  items: {
    select: {
      perfumeNameSnapshot: true,
      sizeValueSnapshot: true,
      quantity: true,
      unitPriceMinor: true,
    },
  },
} satisfies Prisma.OrderSelect;

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
    await tx.orderCapability.upsert({
      where: { hash: hash(token) },
      create: {
        orderId,
        purpose: "STATUS",
        hash: hash(token),
        expiresAt: new Date(now.getTime() + STATUS_LIFETIME_MS),
      },
      update: {},
    });
    return token;
  });
}

export async function getCommerceStatus(token: string | undefined) {
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
    return {
      reference: order.reference,
      status: order.commerceStatus,
      fulfilment: order.fulfilmentStatus,
      payment: order.paidAttemptId ? ("SUCCEEDED" as const) : (attempt?.status ?? null),
      retryable:
        !order.paidAttemptId &&
        attempt?.status === "FAILED" &&
        order.commerceStatus === "RESERVATION_EXPIRED",
      issuedQuote: order.checkoutDraft !== null,
      subtotalMinor: order.subtotalMinor,
      deliveryFeeMinor: order.deliveryFeeMinor,
      totalMinor: order.totalMinor,
      items: order.items.map((item) => ({
        name: item.perfumeNameSnapshot ?? "Perfume",
        size: item.sizeValueSnapshot ? `${item.sizeValueSnapshot.toString()} mL` : "",
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      })),
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

export async function findStatusOrderPayment(token: string | undefined, reference?: string) {
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
