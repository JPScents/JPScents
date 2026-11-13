import { commerceConfig } from "@/config/commerce";

import type { OrderCartLine } from "../types";
import { parseCheckoutInput } from "./checkout.parser";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLines(lines: unknown): OrderCartLine[] | null {
  if (!Array.isArray(lines) || !lines.length) {
    return null;
  }

  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line || typeof line !== "object") {
      return null;
    }
    const { perfumeVariantId, quantity } = line as Partial<OrderCartLine>;
    if (
      typeof perfumeVariantId !== "string" ||
      !UUID.test(perfumeVariantId) ||
      !Number.isSafeInteger(quantity) ||
      quantity === undefined ||
      quantity < 1 ||
      quantity > commerceConfig.maximumVariantQuantity
    ) {
      return null;
    }
    merged.set(perfumeVariantId, (merged.get(perfumeVariantId) ?? 0) + quantity);
  }

  if ([...merged.values()].some((quantity) => quantity > commerceConfig.maximumVariantQuantity)) {
    return null;
  }
  return [...merged].map(([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity }));
}

export function parseOrderSubmission(
  linesRaw: unknown,
  checkoutRaw: unknown,
  submissionKey: unknown,
) {
  const lines = parseLines(linesRaw);
  const parsed = parseCheckoutInput(checkoutRaw);
  if (!lines) {
    return { error: "Your cart is empty or invalid. Return to Cart and try again." } as const;
  }
  if (!parsed.input) {
    return { errors: parsed.errors } as const;
  }
  const input = parsed.input;
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey)) {
    return { error: "Unable to safely place this order. Please refresh and try again." } as const;
  }

  return { lines, input, submissionKey } as const;
}
