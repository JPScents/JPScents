import "server-only";

import { isNairaMinor } from "@/shared/utils/naira-minor";

import { asRecord, paystackRequest, type PaystackMode } from "./client";

type RefundStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "NEEDS_ATTENTION";
const refundStatuses: Record<string, RefundStatus> = {
  pending: "PENDING",
  processing: "PROCESSING",
  processed: "PROCESSED",
  failed: "FAILED",
  "needs-attention": "NEEDS_ATTENTION",
};

export type PaystackRefundInput = {
  reference: string;
  transactionReference: string;
  transactionId: string;
  amountMinor: number;
  environment: PaystackMode;
};

function toRefundStatus(value: unknown, input: PaystackRefundInput): RefundStatus | "MISMATCH" {
  const data = asRecord(value);
  const transaction = asRecord(data?.transaction);
  const linked = transaction
    ? transaction.reference === input.transactionReference &&
      String(transaction.id) === input.transactionId
    : String(data?.transaction) === input.transactionId;
  if (
    !data ||
    data.reference !== input.reference ||
    !linked ||
    data.domain !== input.environment.toLowerCase() ||
    data.currency !== "NGN" ||
    !isNairaMinor(data.amount) ||
    data.amount !== input.amountMinor ||
    typeof data.status !== "string" ||
    !Object.hasOwn(refundStatuses, data.status)
  ) {
    return "MISMATCH";
  }
  return refundStatuses[data.status];
}

export async function reconcilePaystackRefund(input: PaystackRefundInput, submit: boolean) {
  const response = await paystackRequest(
    input.environment,
    `/refund?reference=${encodeURIComponent(input.reference)}`,
  );
  if (!response || !Array.isArray(response.data)) {
    return "AMBIGUOUS" as const;
  }
  if (response.data.length > 0) {
    return response.data.length === 1 ? toRefundStatus(response.data[0], input) : "MISMATCH";
  }
  if (!submit) {
    return "AMBIGUOUS" as const;
  }
  const created = await paystackRequest(input.environment, "/refund", {
    transaction: input.transactionReference,
    amount: input.amountMinor,
    reference: input.reference,
  });
  if (created?.status === 409) {
    const found = await paystackRequest(
      input.environment,
      `/refund?reference=${encodeURIComponent(input.reference)}`,
    );
    return Array.isArray(found?.data) && found.data.length === 1
      ? toRefundStatus(found.data[0], input)
      : "AMBIGUOUS";
  }
  return created?.data ? toRefundStatus(created.data, input) : "AMBIGUOUS";
}
