"use server";

import { createOrder } from "../services/order.service";
import { writeConfirmationCookie } from "../server/confirmation-cookie";

export async function submitOrder(lines: unknown, checkout: unknown, submissionKey: string) {
  const result = await createOrder(lines, checkout, submissionKey);
  if ("confirmationToken" in result && result.confirmationToken) {
    await writeConfirmationCookie(result.confirmationToken);
  }
  if ("order" in result) {
    return { order: result.order, duplicate: result.duplicate };
  }
  return result;
}
