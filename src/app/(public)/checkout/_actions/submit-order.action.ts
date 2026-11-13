"use server";

import { isCommerceCheckoutActive } from "@/infrastructure/paystack/client";
import { parseOrderSubmission, createOrder } from "@/modules/orders/server";
import { writeConfirmationCookie } from "../_server/confirmation-cookie";

export async function submitOrder(lines: unknown, checkout: unknown, submissionKey: unknown) {
  if (isCommerceCheckoutActive()) {
    return { error: "Refresh Checkout to see the current payment options." } as const;
  }
  const parsed = parseOrderSubmission(lines, checkout, submissionKey);
  if (parsed.error !== undefined) {
    return { error: parsed.error } as const;
  }
  if (parsed.errors !== undefined) {
    return { errors: parsed.errors } as const;
  }

  const result = await createOrder(parsed.lines, parsed.input, parsed.submissionKey);
  if ("confirmationToken" in result && result.confirmationToken) {
    await writeConfirmationCookie(result.confirmationToken);
  }
  if ("order" in result) {
    return { order: result.order, duplicate: result.duplicate };
  }
  return result;
}
