import { readLimitedBody } from "@/app/_server/read-limited-body";
import { findCommerceStatusExpiry } from "@/modules/orders/server";

import { setCommerceStatusCookie } from "../../_server/commerce-session";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return new Response(null, { status: 415 });
  }
  const body = await readLimitedBody(request, 128);
  if (!body) {
    return new Response(null, { status: 413 });
  }
  const form = new URLSearchParams(body.toString("utf8"));
  const value = form.get("token");
  const token = typeof value === "string" ? value : null;
  const expiry = token ? await findCommerceStatusExpiry(token) : null;
  if (token && expiry) {
    await setCommerceStatusCookie(token, expiry);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: expiry ? "/checkout/status" : "/checkout/status?link=unavailable",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
