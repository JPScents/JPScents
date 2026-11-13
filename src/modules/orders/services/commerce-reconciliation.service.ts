import "server-only";

import { reconcilePaystackRefund } from "@/infrastructure/paystack/refund";
import { listDueReservationOrders } from "@/modules/catalogue/server";
import {
  claimDuePaymentWork,
  claimDueRefunds,
  finishPaymentCheck,
  finishReceipt,
  finishRefundCheck,
} from "@/modules/payments/server";

import { expireCommerceReservation } from "../repositories/commerce-order.repository";
import {
  finishReconciliationRun,
  startReconciliationRun,
} from "../repositories/reconciliation-run.repository";
import { reconcileCommercePayment } from "./commerce-checkout.service";

const BATCH = 5;

export async function reconcileCommerceWork(trigger: "SCHEDULED" | "ADMIN") {
  const run = await startReconciliationRun(trigger);
  const now = new Date();
  const result = { expired: 0, payments: 0, refunds: 0, errors: 0 };
  try {
    for (const orderId of await listDueReservationOrders(now, BATCH)) {
      if (await expireCommerceReservation(orderId, now)) {
        result.expired += 1;
      }
    }
    const payments = await claimDuePaymentWork(now, BATCH);
    const paymentResults = await Promise.allSettled([
      ...payments.receipts.map(async (receipt) => {
        const status = await reconcileCommercePayment(
          receipt.providerReference,
          receipt.environment,
        );
        const done = status !== "UNAVAILABLE" && status !== "PENDING";
        await finishReceipt(receipt.id, payments.leaseId, done);
        return done;
      }),
      ...payments.attempts.map(async (attempt) => {
        const status = await reconcileCommercePayment(
          attempt.providerReference,
          attempt.environment,
        );
        await finishPaymentCheck(attempt.id, payments.leaseId, status === "UNAVAILABLE");
        return status !== "UNAVAILABLE";
      }),
    ]);
    result.payments = paymentResults.filter(
      (outcome) => outcome.status === "fulfilled" && outcome.value,
    ).length;
    result.errors += paymentResults.filter(
      (outcome) => outcome.status === "rejected" || !outcome.value,
    ).length;

    const refunds = await claimDueRefunds(now, BATCH);
    const refundResults = await Promise.allSettled(
      refunds.refunds.map(async (refund) => {
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
        await finishRefundCheck(refund.id, refunds.leaseId, status);
        return status !== "AMBIGUOUS";
      }),
    );
    result.refunds = refundResults.filter(
      (outcome) => outcome.status === "fulfilled" && outcome.value,
    ).length;
    result.errors += refundResults.filter(
      (outcome) => outcome.status === "rejected" || !outcome.value,
    ).length;
  } catch {
    result.errors += 1;
    console.error("[commerce] Reconciliation batch could not finish.");
  } finally {
    await finishReconciliationRun(run.id, result);
  }
  return result;
}
