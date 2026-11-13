import "server-only";

import { reconcilePaystackRefund } from "@/infrastructure/paystack/refund";
import { listDueReservationOrders } from "@/modules/catalogue/server";
import {
  claimDuePaymentWork,
  claimDueRefunds,
  finishPaymentCheck,
  finishReceipt,
} from "@/modules/payments/server";

import { expireCommerceReservation } from "../repositories/commerce-order.repository";
import { finishCommerceRefund } from "../repositories/commerce-refund.repository";
import {
  finishReconciliationRun,
  startReconciliationRun,
} from "../repositories/reconciliation-run.repository";
import { reconcileCommercePayment } from "./commerce-checkout.service";
import { reconcileCommerceNotifications } from "./commerce-notification.service";

const BATCH = 5;
type BatchResult = { count: number; issues: string[] };

const paymentIssues: Partial<Record<Awaited<ReturnType<typeof reconcileCommercePayment>>, string>> =
  {
    UNAVAILABLE: "PAYMENT_VERIFICATION_UNAVAILABLE",
    NEEDS_ATTENTION: "PAYMENT_FACTS_MISMATCH",
  };

const refundIssues: Partial<Record<Awaited<ReturnType<typeof reconcilePaystackRefund>>, string>> = {
  AMBIGUOUS: "REFUND_VERIFICATION_UNAVAILABLE",
  MISMATCH: "REFUND_FACTS_MISMATCH",
  FAILED: "REFUND_PROVIDER_ACTION",
  NEEDS_ATTENTION: "REFUND_PROVIDER_ACTION",
};

async function settleBatch(work: Promise<string | null>[], failure: string): Promise<BatchResult> {
  const outcomes = await Promise.allSettled(work);
  const issues = outcomes.flatMap((outcome) =>
    outcome.status === "rejected" ? [failure] : outcome.value ? [outcome.value] : [],
  );
  return { count: outcomes.length - issues.length, issues };
}

async function reconcileReservations(now: Date): Promise<BatchResult> {
  let count = 0;
  const issues = [];
  for (const orderId of await listDueReservationOrders(now, BATCH)) {
    try {
      if (await expireCommerceReservation(orderId, now)) {
        count += 1;
      }
    } catch {
      issues.push("RESERVATION_RELEASE_FAILED");
    }
  }
  return { count, issues };
}

async function reconcilePayments(now: Date): Promise<BatchResult> {
  const payments = await claimDuePaymentWork(now, BATCH);
  return settleBatch(
    [
      ...payments.receipts.map(async (receipt) => {
        const status = await reconcileCommercePayment(
          receipt.providerReference,
          receipt.environment,
        );
        await finishReceipt(
          receipt.id,
          payments.leaseId,
          status !== "UNAVAILABLE" && status !== "PENDING",
        );
        return paymentIssues[status] ?? null;
      }),
      ...payments.attempts.map(async (attempt) => {
        const status = await reconcileCommercePayment(
          attempt.providerReference,
          attempt.environment,
        );
        await finishPaymentCheck(attempt.id, payments.leaseId, status === "UNAVAILABLE");
        return paymentIssues[status] ?? null;
      }),
    ],
    "PAYMENT_WORKER_FAILED",
  );
}

async function reconcileRefunds(now: Date): Promise<BatchResult> {
  const { refunds, leaseId } = await claimDueRefunds(now, BATCH);
  return settleBatch(
    refunds.map(async (refund) => {
      const status = refund.transactionId
        ? await reconcilePaystackRefund(
            {
              reference: refund.providerReference,
              transactionReference: refund.transactionReference,
              transactionId: refund.transactionId,
              amountMinor: refund.amountMinor,
              environment: refund.environment,
            },
            refund.status === "REQUESTED" || refund.status === "AMBIGUOUS",
          )
        : "MISMATCH";
      if (
        !(await finishCommerceRefund({ id: refund.id, orderId: refund.orderId, leaseId }, status))
      ) {
        return "REFUND_CLAIM_LOST";
      }
      return refundIssues[status] ?? null;
    }),
    "REFUND_WORKER_FAILED",
  );
}

async function reconcileNotifications(): Promise<BatchResult> {
  const outcomes = await reconcileCommerceNotifications(BATCH);
  const issues = outcomes.filter((issue) => issue !== null);
  return { count: outcomes.length - issues.length, issues };
}

export async function reconcileCommerceWork(trigger: "SCHEDULED" | "ADMIN") {
  const run = await startReconciliationRun(trigger);
  const now = new Date();
  const result = { expired: 0, payments: 0, refunds: 0, notifications: 0, errors: 0 };
  const errorCounts: Record<string, number> = {};
  const batches = [
    ["expired", reconcileReservations],
    ["payments", reconcilePayments],
    ["refunds", reconcileRefunds],
    ["notifications", reconcileNotifications],
  ] as const;
  function recordIssue(issue: string) {
    result.errors += 1;
    errorCounts[issue] = (errorCounts[issue] ?? 0) + 1;
  }

  for (const [category, process] of batches) {
    try {
      const { count, issues } = await process(now);
      result[category] = count;
      issues.forEach(recordIssue);
    } catch {
      recordIssue(`${category.toUpperCase()}_BATCH_FAILED`);
    }
  }
  await finishReconciliationRun(run.id, result, errorCounts);
  return result;
}
