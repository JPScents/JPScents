import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canStartPaystackPayment,
  hostedCheckoutUrl,
  initialisePaystackPayment,
  verifyPaystackPayment,
} from "@/infrastructure/paystack/client";

const reference = "jpscents-12345678-1234-4234-8234-123456789012";
const configuration = {
  PAYSTACK_SECRET_KEY: "sk_test_fixture",
  PAYSTACK_MODE: "TEST",
  PAYSTACK_RETURN_ORIGIN: "https://preview.example.test",
  PAYSTACK_WEBHOOK_SECRET: "whsec_fixture",
  COMMERCE_PAYMENTS_ENABLED: "true",
  COMMERCE_STATUS_SECRET: "synthetic-checkout-status-signing-secret",
};

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "preview");
  for (const [key, value] of Object.entries(configuration)) {
    vi.stubEnv(key, value);
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Paystack transaction transport", () => {
  it("requires matching deployment and credentials, and an explicit initiation flag", () => {
    expect(canStartPaystackPayment()).toBe("TEST");
    vi.stubEnv("COMMERCE_PAYMENTS_ENABLED", "false");
    expect(canStartPaystackPayment()).toBeNull();
    vi.stubEnv("COMMERCE_PAYMENTS_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(canStartPaystackPayment()).toBeNull();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_WEBHOOK_SECRET", undefined);
    expect(canStartPaystackPayment()).toBeNull();
  });

  it("sends the exact NGN amount and configured callback and accepts only the returned matching checkout", async () => {
    const checkout = "https://checkout.paystack.com/abc12345def";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ status: true, data: { reference, authorization_url: checkout } }),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await initialisePaystackPayment({
      environment: "TEST",
      amountMinor: 123_456,
      email: "buyer@example.test",
      providerReference: reference,
    });
    expect(result).toBe(checkout);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.paystack.co/transaction/initialize");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
      email: "buyer@example.test",
      amount: "123456",
      currency: "NGN",
      reference,
      callback_url: "https://preview.example.test/checkout/paystack-return",
    });
    expect(hostedCheckoutUrl("https://checkout.paystack.com.example.test/abc12345def")).toBeNull();
    expect(
      hostedCheckoutUrl("https://checkout.paystack.com/abc12345def?redirect=external"),
    ).toBeNull();
  });

  it("continues server verification with initiation paused", async () => {
    vi.stubEnv("COMMERCE_PAYMENTS_ENABLED", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: true,
          data: {
            id: 123,
            domain: "test",
            status: "success",
            reference,
            amount: 12_345,
            currency: "NGN",
          },
        }),
      ),
    );
    await expect(verifyPaystackPayment(reference, "TEST")).resolves.toEqual({
      providerId: "123",
      environment: "TEST",
      status: "success",
      reference,
      amountMinor: 12_345,
      currency: "NGN",
    });
  });
});
