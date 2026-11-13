import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enqueue } = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock("@/modules/payments/server", () => ({ enqueuePaystackReceipt: enqueue }));

import { POST } from "@/app/api/paystack/webhook/route";

const fixtureSecret = "whsec_synthetic_fixture";
const legacyFixture = "sk_test_fixture";
const reference = "jpscents-12345678-1234-4234-8234-123456789012";
const body = JSON.stringify({ event: "charge.success", data: { reference, domain: "test" } });

function headers(time: number, bytes: string, secret = fixtureSecret) {
  const signature = createHmac("sha512", secret).update(`${time}.`).update(bytes).digest("hex");
  return { "Paystack-Signature": `t=${time},v1=whk_fixture:${signature}` };
}

function submit(value: string, headers: Record<string, string>) {
  return POST(
    new Request("https://example.test/api/paystack/webhook", {
      method: "POST",
      body: value,
      headers,
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("PAYSTACK_MODE", "TEST");
  vi.stubEnv("PAYSTACK_SECRET_KEY", legacyFixture);
  vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", fixtureSecret);
  vi.stubEnv("PAYSTACK_ALLOW_TEST_LEGACY_WEBHOOK", "true");
  vi.stubEnv("VERCEL_ENV", "preview");
  enqueue.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Paystack webhook receiver", () => {
  it("durably records an authenticated matching-environment receipt before acknowledgement", async () => {
    const now = Math.floor(Date.now() / 1000);
    expect((await submit(body, headers(now, body))).status).toBe(200);
    expect(enqueue).toHaveBeenCalledExactlyOnceWith("charge.success", reference, "TEST");
    enqueue.mockRejectedValueOnce(new Error("fixture storage failure"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await submit(body, headers(now, body))).status).toBe(503);
    } finally {
      log.mockRestore();
    }
  });

  it("rejects stale or changed body bytes before writing a receipt", async () => {
    const now = Math.floor(Date.now() / 1000);
    expect((await submit(body, headers(now - 301, body))).status).toBe(401);
    expect((await submit(body + " ", headers(now, body))).status).toBe(401);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("accepts rotated strong secrets and disallows downgrade from a present invalid strong header", async () => {
    const now = Math.floor(Date.now() / 1000);
    vi.stubEnv("PAYSTACK_PREVIOUS_WEBHOOK_SECRET", "whsec_previous_fixture");
    expect((await submit(body, headers(now, body, "whsec_previous_fixture"))).status).toBe(200);
    const legacy = createHmac("sha512", legacyFixture).update(body).digest("hex");
    expect((await submit(body, { "x-paystack-signature": legacy })).status).toBe(200);
    expect(
      (await submit(body, { "Paystack-Signature": "invalid", "x-paystack-signature": legacy }))
        .status,
    ).toBe(401);
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
});
