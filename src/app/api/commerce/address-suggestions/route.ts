import { NextResponse } from "next/server";

import { readLimitedBody } from "@/app/_server/read-limited-body";
import {
  isAddressAssistanceEnabled,
  searchNigerianAddresses,
} from "@/infrastructure/google-places/places";
import { canStartPaystackPayment, getPaystackReturnOrigin } from "@/infrastructure/paystack/client";
import { isNigerianDestination } from "@/modules/delivery";
import { isEnabledDeliveryDestination } from "@/modules/delivery/server";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== getPaystackReturnOrigin()) {
    return new Response(null, { status: 403, headers });
  }
  if (!canStartPaystackPayment() || !isAddressAssistanceEnabled()) {
    return new Response(null, { status: 503, headers });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response(null, { status: 415, headers });
  }

  let payload: { query?: unknown; state?: unknown };
  try {
    const body = await readLimitedBody(request, 1024);
    if (!body) {
      return new Response(null, { status: 413, headers });
    }
    const parsed = JSON.parse(body.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Response(null, { status: 400, headers });
    }
    payload = parsed;
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const { query, state } = payload;
  const input = typeof query === "string" ? query.trim() : "";
  if (input.length < 4 || input.length > 120 || !isNigerianDestination(state)) {
    return new Response(null, { status: 400, headers });
  }
  try {
    if (!(await isEnabledDeliveryDestination(state))) {
      return new Response(null, { status: 400, headers });
    }
    const suggestions = await searchNigerianAddresses(`${input}, ${state}, Nigeria`);
    return suggestions
      ? NextResponse.json({ suggestions }, { headers })
      : new Response(null, { status: 503, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
