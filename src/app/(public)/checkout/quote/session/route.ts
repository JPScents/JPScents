import { readLimitedBody } from "@/app/_server/read-limited-body";
import { getCheckoutQuote } from "@/modules/orders/server";

import { readCheckoutSessionToken, setCommerceQuoteCookie } from "../../_server/commerce-session";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return new Response(null, { status: 415 });
  }
  const body = await readLimitedBody(request, 128);
  if (!body) {
    return new Response(null, { status: 413 });
  }
  const token = new URLSearchParams(body.toString("utf8")).get("token");
  const quote = token ? await getCheckoutQuote(token, await readCheckoutSessionToken()) : null;
  if (token && quote) {
    await setCommerceQuoteCookie(token, quote.expiresAt);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: quote ? "/checkout/quote" : "/checkout/quote?link=unavailable",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
