import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { finishRefundCheck } from "@/modules/payments/server";

import { lockCommerceOrder } from "./commerce-order.repository";
import { enqueueCommerceNotification } from "./order-notification.repository";

export async function finishCommerceRefund(
  claim: { orderId: string; id: string; leaseId: string },
  status: Parameters<typeof finishRefundCheck>[2],
) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockCommerceOrder(tx, claim.orderId))) {
      return false;
    }
    const update = await finishRefundCheck(tx, claim, status);
    if (!update) {
      return false;
    }
    const { previous, previousIssue, next, amountMinor } = update;
    if (
      (previous === next && previousIssue !== "REFUND_FACTS_MISMATCH") ||
      next === "REQUESTED" ||
      next === "AMBIGUOUS" ||
      next === "PENDING" ||
      status === "MISMATCH"
    ) {
      return true;
    }
    const order = await tx.order.findUniqueOrThrow({
      where: { id: claim.orderId },
      select: { id: true, reference: true, emailSnapshot: true },
    });
    await enqueueCommerceNotification(tx, order, {
      kind: "REFUND_PROGRESS",
      refundId: claim.id,
      amountMinor,
      progress: next,
    });
    return true;
  });
}
