import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import { beginNotificationAttempt, createOrderNotification } from "@/modules/notifications/server";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { grantCommerceStatus } from "./order-status-access.repository";

type NotificationOrder = {
  id: string;
  reference: string;
  emailSnapshot: string | null;
};

type NotificationEvent =
  | { kind: "PAYMENT_CONFIRMED"; amountMinor: number }
  | { kind: "DISPATCHED" }
  | { kind: "CANCELLED"; paid: boolean }
  | {
      kind: "REFUND_PROGRESS";
      refundId: string;
      amountMinor: number;
      progress: "REQUESTED" | "PROCESSING" | "PROCESSED" | "FAILED" | "NEEDS_ATTENTION";
    };

function emailDetails(order: NotificationOrder, event: NotificationEvent) {
  const { reference } = order;
  switch (event.kind) {
    case "PAYMENT_CONFIRMED":
      return {
        title: "Payment confirmed",
        body: `We received your payment of ${formatNairaFromMinor(event.amountMinor)}. We’ll let you know when your order is dispatched.`,
      };
    case "DISPATCHED":
      return { title: "Order dispatched", body: "Your JPScents order is on its way." };
    case "CANCELLED":
      return {
        title: "Order cancelled",
        body: event.paid
          ? "Your order was cancelled and we’ve requested a full refund, including delivery."
          : "Your order was cancelled. If a payment is confirmed later, we’ll arrange a refund.",
      };
    case "REFUND_PROGRESS": {
      const amount = formatNairaFromMinor(event.amountMinor);
      const body = {
        REQUESTED: `We’ve requested a refund of ${amount} for your order.`,
        PROCESSING: `Paystack is processing your refund of ${amount}.`,
        PROCESSED: `Paystack processed your refund of ${amount}. Your bank may need more time to credit it.`,
        FAILED: `Your refund of ${amount} needs follow-up. Please contact JPScents with reference ${reference}.`,
        NEEDS_ATTENTION: `Paystack needs more information to complete your refund of ${amount}. Please contact JPScents with reference ${reference}.`,
      }[event.progress];
      return { title: "Refund update", body };
    }
  }
}

export async function enqueueCommerceNotification(
  tx: Prisma.TransactionClient,
  order: NotificationOrder,
  event: NotificationEvent,
) {
  if (!order.emailSnapshot) {
    throw new Error("A commerce notification requires a recipient snapshot.");
  }
  const { title, body } = emailDetails(order, event);
  const number = process.env.JP_SCENTS_WHATSAPP_NUMBER;
  const support =
    number && /^\d{7,15}$/.test(number)
      ? `Contact JPScents on WhatsApp with your order reference if you need help: https://wa.me/${number}`
      : "Contact JPScents with your order reference if you need help.";
  const eventKey =
    event.kind === "REFUND_PROGRESS"
      ? `refund:${event.refundId}:${event.progress}`
      : `order:${order.id}:${event.kind}`;
  await createOrderNotification(tx, {
    orderId: order.id,
    eventKey,
    kind: event.kind,
    recipient: order.emailSnapshot,
    subject: `${title} · ${order.reference}`,
    message: `JPScents order ${order.reference}\n\n${body}\n\n${support}\n\nView your order status:\n`,
  });
}

export async function prepareCommerceNotification(
  claim: { id: string; orderId: string; leaseId: string },
  snapshot: Parameters<typeof beginNotificationAttempt>[2],
  statusToken: string,
) {
  return prisma.$transaction(async (tx) => {
    if (!(await beginNotificationAttempt(tx, claim, snapshot, new Date()))) {
      return false;
    }
    await grantCommerceStatus(tx, claim.orderId, statusToken, snapshot.firstAttemptAt);
    return true;
  });
}
