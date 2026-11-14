"use server";

import { redirect } from "next/navigation";

import { resumeCommercePayment } from "@/modules/orders/server";

import {
  readCheckoutSessionToken,
  readCommerceQuoteCookie,
  readCommerceStatusCookie,
} from "../_server/commerce-session";

export async function resumePayment() {
  let url: string | null = null;
  try {
    url = await resumeCommercePayment(
      await readCommerceStatusCookie(),
      await readCheckoutSessionToken(),
      await readCommerceQuoteCookie(),
    );
  } catch {
    console.error("[orders] Payment could not be resumed.");
  }
  redirect(url ?? "/checkout/status?resume=unavailable");
}
