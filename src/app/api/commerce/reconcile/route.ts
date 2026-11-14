import { createHash, timingSafeEqual } from "node:crypto";

import { reconcileCommerceWork } from "@/modules/orders/server";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (
    !secret ||
    secret.length < 16 ||
    !authorization ||
    !timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))
  ) {
    return new Response(null, { status: 401 });
  }
  try {
    const result = await reconcileCommerceWork("SCHEDULED");
    return Response.json(result, {
      status: result.errors ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("[commerce] Scheduled reconciliation is unavailable.");
    return new Response(null, { status: 503 });
  }
}
