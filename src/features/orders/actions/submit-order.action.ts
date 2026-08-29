"use server";

import { cookies } from "next/headers";

import { createOrder } from "../orders";

const confirmationCookie = "jpscents.order-confirmation";

export async function submitOrder(lines: unknown, checkout: unknown, submissionKey: string) {
  const result = await createOrder(lines, checkout, submissionKey);
  if ("confirmationToken" in result && result.confirmationToken)
    (await cookies()).set(confirmationCookie, result.confirmationToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/checkout/confirm",
    });
  if ("order" in result) return { order: result.order, duplicate: result.duplicate };
  return result;
}
