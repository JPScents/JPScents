"use server";

import { canStartPaystackPayment } from "@/infrastructure/paystack/client";
import { beginCommerceCheckout, parseCommercePurchase } from "@/modules/orders/server";

import {
  ensureCheckoutSessionToken,
  readCheckoutSessionToken,
  setCommerceStatusCookie,
} from "../_server/commerce-session";

export async function prepareCheckoutSession() {
  if (canStartPaystackPayment()) {
    await ensureCheckoutSessionToken();
  }
}

export async function startPayment(lines: unknown, details: unknown, quote: unknown, key: unknown) {
  const environment = canStartPaystackPayment();
  if (!environment) {
    return { error: "Online payments are temporarily unavailable." } as const;
  }
  const parsed = parseCommercePurchase(lines, details, quote, key);
  if (!parsed.input) {
    return parsed;
  }
  const sessionToken = await readCheckoutSessionToken();
  if (!sessionToken) {
    return { error: "Reload Checkout to restore your browser session." } as const;
  }

  try {
    const result = await beginCommerceCheckout({
      ...parsed,
      environment,
      sessionToken,
    });
    if (!("statusToken" in result)) {
      return result;
    }
    await setCommerceStatusCookie(result.statusToken);
    if ("restartCheckout" in result) {
      return { restartCheckout: true, error: result.message } as const;
    }
    if ("checkoutUrl" in result && result.checkoutUrl) {
      return { checkoutUrl: result.checkoutUrl } as const;
    }
    return { processing: true } as const;
  } catch {
    console.error("[orders] Commerce checkout could not be completed.");
    return { error: "We could not start payment. Retry using this checkout." } as const;
  }
}
