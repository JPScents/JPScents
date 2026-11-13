import { isNairaMinor } from "@/shared/utils/naira-minor";

import type { CommerceQuoteInput } from "../types";

export function calculateCommerceTotals(
  lines: CommerceQuoteInput["lines"],
  deliveryFeeMinor: number,
) {
  if (!lines.length || !isNairaMinor(deliveryFeeMinor)) {
    return null;
  }
  let subtotalMinor = 0;
  for (const { quantity, unitPriceMinor } of lines) {
    if (!Number.isInteger(quantity) || quantity < 1 || !isNairaMinor(unitPriceMinor)) {
      return null;
    }
    subtotalMinor += quantity * unitPriceMinor;
    if (!isNairaMinor(subtotalMinor)) {
      return null;
    }
  }
  const totalMinor = subtotalMinor + deliveryFeeMinor;
  return totalMinor > 0 && isNairaMinor(totalMinor)
    ? { currency: "NGN" as const, subtotalMinor, deliveryFeeMinor, totalMinor }
    : null;
}
