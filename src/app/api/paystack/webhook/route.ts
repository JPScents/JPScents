import { readLimitedBody } from "@/app/_server/read-limited-body";
import { asRecord, isPaystackReference } from "@/infrastructure/paystack/client";
import { verifyWebhookOrigin } from "@/infrastructure/paystack/webhook-signature";
import { enqueuePaystackReceipt } from "@/modules/payments/server";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  let body: Buffer | null;
  try {
    body = await readLimitedBody(request, MAX_BODY_BYTES);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body) {
    return new Response(null, { status: 413 });
  }
  const environment = verifyWebhookOrigin(body, request.headers);
  if (!environment) {
    return new Response(null, { status: 401 });
  }

  let event;
  try {
    event = asRecord(JSON.parse(body.toString("utf8")));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (event?.event !== "charge.success") {
    return new Response(null, { status: 200 });
  }
  const data = asRecord(event.data);
  if (!isPaystackReference(data?.reference) || data?.domain !== environment.toLowerCase()) {
    return new Response(null, { status: 400 });
  }
  try {
    await enqueuePaystackReceipt("charge.success", data.reference, environment);
    return new Response(null, { status: 200 });
  } catch {
    console.error("[payments] Paystack receipt could not be stored.");
    return new Response(null, { status: 503 });
  }
}
