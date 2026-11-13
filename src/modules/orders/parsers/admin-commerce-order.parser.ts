import { isNairaMinor } from "@/shared/utils/naira-minor";

import type { CommerceAdminCommand } from "../repositories/admin-commerce-order.repository";
import { isSubmissionKey } from "./order-submission.parser";

export function parseCommerceAdminAction(
  value: unknown,
): { id: string; command: CommerceAdminCommand } | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const {
    id,
    action,
    next,
    amountMinor,
    perfumeVariantId,
    quantity,
    requestKey,
    reason: rawReason,
  } = value as Record<string, unknown>;
  if (!isSubmissionKey(id)) {
    return null;
  }
  if (
    action === "FULFIL" &&
    (next === "PROCESSING" || next === "DISPATCHED" || next === "DELIVERED")
  ) {
    return { id, command: { action, next } };
  }
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (!reason || reason.length > 240) {
    return null;
  }
  if (action === "CANCEL") {
    return { id, command: { action, reason } };
  }
  if (!isSubmissionKey(requestKey)) {
    return null;
  }
  if (action === "REFUND" && isNairaMinor(amountMinor) && amountMinor > 0) {
    return { id, command: { action, reason, requestKey, amountMinor } };
  }
  if (
    action === "RETURN" &&
    isSubmissionKey(perfumeVariantId) &&
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 99
  ) {
    return { id, command: { action, reason, requestKey, perfumeVariantId, quantity } };
  }
  return null;
}
