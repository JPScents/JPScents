import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";
import type { FulfilmentStatus } from "@/infrastructure/database/generated/enums";

import { requireAdmin, type AdminIdentity } from "@/modules/access/server";
import {
  creditSaleableReturn,
  releaseHeldStock,
  restorePaidAllocation,
} from "@/modules/catalogue/server";
import {
  closeUnstartedPayment,
  hasRefundRequest,
  readPaymentAttempt,
  refundableBalance,
  requestRefund,
} from "@/modules/payments/server";
import { isNairaMinor } from "@/shared/utils/naira-minor";

import { lockCommerceOrder } from "./commerce-order.repository";
import { enqueueCommerceNotification } from "./order-notification.repository";

const allowedNext: Partial<Record<FulfilmentStatus, FulfilmentStatus>> = {
  UNFULFILLED: "PROCESSING",
  PROCESSING: "DISPATCHED",
  DISPATCHED: "DELIVERED",
};

const actionOrderSelect = {
  id: true,
  reference: true,
  emailSnapshot: true,
  commerceStatus: true,
  fulfilmentStatus: true,
  paidAttemptId: true,
} satisfies Prisma.OrderSelect;
type ActionOrder = Prisma.OrderGetPayload<{ select: typeof actionOrderSelect }>;

export type CommerceAdminCommand =
  | { action: "FULFIL"; next: FulfilmentStatus }
  | { action: "CANCEL"; reason: string }
  | { action: "REFUND"; reason: string; amountMinor: number; requestKey: string }
  | {
      action: "RETURN";
      reason: string;
      perfumeVariantId: string;
      quantity: number;
      requestKey: string;
    };

function afterDispatch(order: ActionOrder) {
  return order.fulfilmentStatus === "DISPATCHED" || order.fulfilmentStatus === "DELIVERED";
}

async function addOrderEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  action: string,
  actorId: string,
  reason?: string,
) {
  await tx.commerceOrderEvent.create({ data: { orderId, action, actorId, reason } });
}

async function fulfil(
  tx: Prisma.TransactionClient,
  order: ActionOrder,
  next: FulfilmentStatus,
  admin: AdminIdentity,
) {
  if (
    order.commerceStatus !== "PAID" ||
    !order.paidAttemptId ||
    !order.fulfilmentStatus ||
    allowedNext[order.fulfilmentStatus] !== next
  ) {
    return { error: "This fulfilment step is unavailable for the current order." } as const;
  }
  const attempt = await readPaymentAttempt(tx, order.paidAttemptId);
  if (attempt?.status !== "SUCCEEDED") {
    return { error: "Payment must be verified before fulfilment." } as const;
  }
  await tx.order.update({ where: { id: order.id }, data: { fulfilmentStatus: next } });
  await addOrderEvent(tx, order.id, next, admin.id);
  if (next === "DISPATCHED") {
    await enqueueCommerceNotification(tx, order, { kind: "DISPATCHED" });
  }
  return { ok: true } as const;
}

async function cancel(
  tx: Prisma.TransactionClient,
  order: ActionOrder,
  reason: string,
  admin: AdminIdentity,
) {
  if (order.commerceStatus === "CANCELLED") {
    return { unchanged: true } as const;
  }
  if (afterDispatch(order)) {
    return { error: "After dispatch, use a refund and a separate received return." } as const;
  }
  if (order.paidAttemptId) {
    const attempt = await readPaymentAttempt(tx, order.paidAttemptId);
    if (!attempt || attempt.status !== "SUCCEEDED") {
      throw new Error("Missing verified payment for a paid order.");
    }
    await restorePaidAllocation(tx, order.id, attempt.id);
    await requestRefund(tx, {
      paymentAttemptId: attempt.id,
      requestKey: `cancel:${order.id}`,
      reason,
      amountMinor: attempt.amountMinor,
      requestedBy: admin.id,
    });
  } else {
    await releaseHeldStock(tx, order.id, new Date(), "CANCELLED");
  }
  await closeUnstartedPayment(tx, order.id);
  await tx.order.update({
    where: { id: order.id },
    data: {
      commerceStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: admin.id,
      cancellationReason: reason,
    },
  });
  await addOrderEvent(tx, order.id, "CANCELLED", admin.id, reason);
  await enqueueCommerceNotification(tx, order, {
    kind: "CANCELLED",
    paid: order.paidAttemptId !== null,
  });
  return { ok: true } as const;
}

async function partialRefund(
  tx: Prisma.TransactionClient,
  order: ActionOrder,
  command: Extract<CommerceAdminCommand, { action: "REFUND" }>,
  admin: AdminIdentity,
) {
  if (!order.paidAttemptId || !afterDispatch(order)) {
    return {
      error: "Post-dispatch refunds require a verified payment and a dispatched order.",
    } as const;
  }
  const requestKey = `operator:${order.id}:${command.requestKey}`;
  if (await hasRefundRequest(tx, requestKey, order.paidAttemptId)) {
    return { unchanged: true } as const;
  }
  const attempt = await readPaymentAttempt(tx, order.paidAttemptId);
  if (
    !attempt ||
    attempt.status !== "SUCCEEDED" ||
    !isNairaMinor(command.amountMinor) ||
    command.amountMinor < 1 ||
    command.amountMinor > (await refundableBalance(tx, attempt.id, attempt.amountMinor))
  ) {
    return { error: "The requested amount exceeds the refundable balance." } as const;
  }
  const refund = await requestRefund(tx, {
    paymentAttemptId: attempt.id,
    requestKey,
    reason: command.reason,
    amountMinor: command.amountMinor,
    requestedBy: admin.id,
  });
  await addOrderEvent(tx, order.id, "REFUND_REQUESTED", admin.id, command.reason);
  await enqueueCommerceNotification(tx, order, {
    kind: "REFUND_PROGRESS",
    refundId: refund.id,
    amountMinor: command.amountMinor,
    progress: "REQUESTED",
  });
  return { ok: true } as const;
}

export async function applyAdminCommerceOrderAction(
  admin: AdminIdentity,
  orderId: string,
  command: CommerceAdminCommand,
) {
  requireAdmin(admin);
  return prisma.$transaction(
    async (tx) => {
      if (!(await lockCommerceOrder(tx, orderId))) {
        return { error: "Order not found." } as const;
      }
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: actionOrderSelect,
      });
      switch (command.action) {
        case "FULFIL":
          return fulfil(tx, order, command.next, admin);
        case "CANCEL":
          return cancel(tx, order, command.reason, admin);
        case "REFUND":
          return partialRefund(tx, order, command, admin);
        case "RETURN": {
          if (!afterDispatch(order) || !order.paidAttemptId) {
            return { error: "Received returns can only be recorded after dispatch." } as const;
          }
          const result = await creditSaleableReturn(tx, {
            ...command,
            orderId,
            paymentAttemptId: order.paidAttemptId,
            actorId: admin.id,
          });
          if ("ok" in result) {
            await addOrderEvent(tx, orderId, "SALEABLE_RETURN", admin.id, command.reason);
          }
          return result;
        }
      }
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

export async function listAdminCommerceOrders(
  admin: AdminIdentity | null,
  query: string,
  status?: string,
  fulfilment?: string,
) {
  requireAdmin(admin);
  return prisma.order.findMany({
    where: {
      kind: "COMMERCE",
      commerceStatus:
        status === "AWAITING_PAYMENT" ||
        status === "RESERVATION_EXPIRED" ||
        status === "PAID" ||
        status === "REFUND_REQUIRED" ||
        status === "CANCELLED"
          ? status
          : undefined,
      fulfilmentStatus:
        fulfilment === "UNFULFILLED" ||
        fulfilment === "PROCESSING" ||
        fulfilment === "DISPATCHED" ||
        fulfilment === "DELIVERED"
          ? fulfilment
          : undefined,
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: "insensitive" } },
              { customerNameSnapshot: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      reference: true,
      customerNameSnapshot: true,
      totalMinor: true,
      commerceStatus: true,
      fulfilmentStatus: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
}

export async function getAdminCommerceOrder(admin: AdminIdentity | null, reference: string) {
  requireAdmin(admin);
  const order = await prisma.order.findUnique({
    where: { reference, kind: "COMMERCE" },
    select: {
      id: true,
      reference: true,
      commerceStatus: true,
      fulfilmentStatus: true,
      paidAttemptId: true,
      currency: true,
      totalMinor: true,
      subtotalMinor: true,
      deliveryFeeMinor: true,
      createdAt: true,
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
      items: {
        select: {
          id: true,
          perfumeVariantId: true,
          perfumeNameSnapshot: true,
          sizeValueSnapshot: true,
          quantity: true,
          unitPriceMinor: true,
        },
      },
      paymentAttempts: {
        select: {
          id: true,
          providerReference: true,
          status: true,
          issue: true,
          amountMinor: true,
          refunds: {
            select: {
              id: true,
              providerReference: true,
              status: true,
              amountMinor: true,
              reason: true,
              issue: true,
            },
          },
        },
      },
      reservations: { select: { id: true, status: true, expiresAt: true } },
      stockMovements: {
        select: { id: true, kind: true, quantity: true, perfumeVariantId: true, createdAt: true },
      },
      commerceEvents: {
        select: { id: true, action: true, actorId: true, reason: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) {
    return null;
  }
  const paid = order.paymentAttempts.find((attempt) => attempt.id === order.paidAttemptId);
  const committed = paid?.refunds.reduce((sum, refund) => sum + refund.amountMinor, 0) ?? 0;
  return {
    ...order,
    refundableMinor: paid ? paid.amountMinor - committed : 0,
    items: order.items.map((item) => ({
      ...item,
      sizeValueSnapshot: item.sizeValueSnapshot?.toString() ?? null,
    })),
  };
}
