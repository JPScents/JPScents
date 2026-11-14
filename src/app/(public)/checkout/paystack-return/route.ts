import { isPaystackReference } from "@/infrastructure/paystack/client";
import { findStatusOrderPayment, reconcileCommercePayment } from "@/modules/orders/server";

import { readCommerceStatusCookie } from "../_server/commerce-session";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const reference = requestUrl.searchParams.get("reference");
  let location = "/checkout/status?link=unavailable";
  if (isPaystackReference(reference)) {
    try {
      const attempt = await findStatusOrderPayment(await readCommerceStatusCookie(), reference);
      if (attempt) {
        location = "/checkout/status";
        if (attempt.status !== "SUCCEEDED") {
          await reconcileCommercePayment(attempt.providerReference, attempt.environment);
        }
      }
    } catch {
      console.error("[orders] Paystack return verification could not be completed.");
    }
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
