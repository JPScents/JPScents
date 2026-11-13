import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getPaystackMode, type PaystackMode } from "./client";

type SignatureOptions = {
  mode: PaystackMode;
  signingSecrets: string[];
  legacySecrets: string[];
  now: number;
};

const HEX_SHA512 = /^[a-f0-9]{128}$/;

function matches(expected: Buffer, signature: string) {
  return HEX_SHA512.test(signature) && timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function validPaystackSignature(
  bytes: Uint8Array,
  strongHeader: string | null,
  legacyHeader: string | null,
  { mode, signingSecrets, legacySecrets, now }: SignatureOptions,
) {
  if (strongHeader === null) {
    return (
      mode === "TEST" &&
      legacyHeader !== null &&
      legacySecrets.some((secret) =>
        matches(createHmac("sha512", secret).update(bytes).digest(), legacyHeader),
      )
    );
  }

  const values = strongHeader.split(",").map((part) => part.trim());
  const times = values.filter((value) => value.startsWith("t="));
  const timestamp = times[0]?.slice(2) ?? "";
  if (
    times.length !== 1 ||
    !/^\d{1,12}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300
  ) {
    return false;
  }

  const signatures = values.flatMap((value) => {
    const match = /^v1=whk_[A-Za-z0-9_-]+:([a-f0-9]{128})$/.exec(value);
    return match ? [match[1]] : [];
  });
  return signingSecrets.some((secret) => {
    const expected = createHmac("sha512", secret)
      .update(timestamp + ".")
      .update(bytes)
      .digest();
    return signatures.some((signature) => matches(expected, signature));
  });
}

export function verifyWebhookOrigin(bytes: Uint8Array, headers: Headers): PaystackMode | null {
  const mode = getPaystackMode();
  if (!mode) {
    return null;
  }
  const signingSecrets = [
    process.env.PAYSTACK_WEBHOOK_SECRET,
    process.env.PAYSTACK_PREVIOUS_WEBHOOK_SECRET,
  ].filter((value): value is string => Boolean(value?.startsWith("whsec_")));
  const legacySecrets =
    mode === "TEST" && process.env.PAYSTACK_ALLOW_TEST_LEGACY_WEBHOOK === "true"
      ? [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_PREVIOUS_TEST_SECRET_KEY].filter(
          (value): value is string => Boolean(value?.startsWith("sk_test_")),
        )
      : [];
  const valid = validPaystackSignature(
    bytes,
    headers.get("paystack-signature"),
    headers.get("x-paystack-signature"),
    { mode, signingSecrets, legacySecrets, now: Math.floor(Date.now() / 1000) },
  );
  return valid ? mode : null;
}
