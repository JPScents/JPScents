import "server-only";

import { deploymentContext } from "@/config/deployment";
import { isNairaMinor } from "@/shared/utils/naira-minor";

export type PaystackMode = "TEST" | "LIVE";

function deploymentAllows(mode: PaystackMode) {
  const deployment = deploymentContext();
  return deployment !== null && (deployment === "production" ? mode === "LIVE" : mode === "TEST");
}

function apiKey(mode: PaystackMode) {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return deploymentAllows(mode) && key && new RegExp(`^(?:sk|rk)_${mode.toLowerCase()}_`).test(key)
    ? key
    : null;
}

export function getPaystackMode(): PaystackMode | null {
  const mode = process.env.PAYSTACK_MODE;
  return (mode === "TEST" || mode === "LIVE") && apiKey(mode) ? mode : null;
}

export function isCommerceCheckoutActive() {
  return (
    process.env.COMMERCE_CHECKOUT_ACTIVE === "true" ||
    process.env.COMMERCE_PAYMENTS_ENABLED === "true"
  );
}

export function canStartPaystackPayment() {
  const mode = getPaystackMode();
  const signed = Boolean(process.env.PAYSTACK_WEBHOOK_SECRET?.startsWith("whsec_"));
  const statusKey = process.env.COMMERCE_STATUS_SECRET;
  const testLegacy =
    mode === "TEST" &&
    process.env.PAYSTACK_ALLOW_TEST_LEGACY_WEBHOOK === "true" &&
    Boolean(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"));
  return process.env.COMMERCE_PAYMENTS_ENABLED === "true" &&
    mode &&
    getPaystackReturnOrigin() &&
    statusKey &&
    statusKey.length >= 32 &&
    (signed || testLegacy)
    ? mode
    : null;
}

export function getPaystackReturnOrigin() {
  const value = process.env.PAYSTACK_RETURN_ORIGIN;
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    const local =
      deploymentContext() === "local" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);
    return url.protocol === "https:" || local ? url.origin : null;
  } catch {
    return null;
  }
}

type PaystackEndpoint =
  "/transaction/initialize" | `/transaction/verify/${string}` | "/refund" | `/refund?${string}`;

export async function paystackRequest(
  mode: PaystackMode,
  path: PaystackEndpoint,
  body?: object,
): Promise<{ status: number; data: unknown } | null> {
  const key = apiKey(mode);
  if (!key) {
    return null;
  }
  try {
    const response = await fetch(`https://api.paystack.co${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(7_000),
    });
    const json = asRecord(await response.json());
    return { status: response.status, data: json?.status === true ? json.data : null };
  } catch {
    return null;
  }
}

export function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function hostedCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);
    return url.origin === "https://checkout.paystack.com" &&
      !url.username &&
      !url.password &&
      /^\/[A-Za-z0-9_-]{8,128}$/.test(url.pathname) &&
      !url.search &&
      !url.hash
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function isPaystackReference(value: unknown): value is string {
  return typeof value === "string" && /^jpscents-[a-f\d-]{36}$/.test(value);
}

export async function initialisePaystackPayment(input: {
  environment: PaystackMode;
  amountMinor: number;
  email: string;
  providerReference: string;
}) {
  const origin = getPaystackReturnOrigin();
  if (!origin) {
    return null;
  }
  const response = await paystackRequest(input.environment, "/transaction/initialize", {
    email: input.email,
    amount: String(input.amountMinor),
    currency: "NGN",
    reference: input.providerReference,
    callback_url: `${origin}/checkout/paystack-return`,
    metadata: { cancel_action: `${origin}/checkout/status` },
  });
  const data = asRecord(response?.data);
  return data?.reference === input.providerReference
    ? hostedCheckoutUrl(data.authorization_url)
    : null;
}

export type VerifiedPaystackPayment = {
  reference: string;
  amountMinor: number;
  currency: string;
  environment: PaystackMode;
  providerId: string;
  status:
    | "success"
    | "failed"
    | "abandoned"
    | "ongoing"
    | "pending"
    | "processing"
    | "queued"
    | "reversed";
};

function isPaymentStatus(value: unknown): value is VerifiedPaystackPayment["status"] {
  return [
    "success",
    "failed",
    "abandoned",
    "ongoing",
    "pending",
    "processing",
    "queued",
    "reversed",
  ].some((status) => status === value);
}

export async function verifyPaystackPayment(
  reference: string,
  environment: PaystackMode,
): Promise<VerifiedPaystackPayment | null> {
  if (!isPaystackReference(reference)) {
    return null;
  }
  const response = await paystackRequest(environment, `/transaction/verify/${reference}`);
  const data = asRecord(response?.data);
  if (
    !data ||
    typeof data.reference !== "string" ||
    !isNairaMinor(data.amount) ||
    typeof data.currency !== "string" ||
    (data.domain !== "test" && data.domain !== "live") ||
    !isPaymentStatus(data.status) ||
    !Number.isSafeInteger(data.id) ||
    Number(data.id) < 1
  ) {
    return null;
  }
  return {
    reference: data.reference,
    amountMinor: data.amount,
    currency: data.currency,
    environment: data.domain === "live" ? "LIVE" : "TEST",
    providerId: String(data.id),
    status: data.status,
  };
}
