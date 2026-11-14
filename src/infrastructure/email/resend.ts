import "server-only";

export type ResendDeliveryResult =
  | { accepted: true; messageId: string }
  | {
      accepted: false;
      issue: "EMAIL_AMBIGUOUS" | "EMAIL_RATE_LIMIT" | "EMAIL_PAYLOAD_MISMATCH" | "EMAIL_REJECTED";
    };

export async function sendResendEmail(input: {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<ResendDeliveryResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key?.startsWith("re_")) {
    return { accepted: false, issue: "EMAIL_REJECTED" };
  }
  const { id, ...body } = input;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `jpscents-order-email/${id}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(7_000),
    });
    if (response.status === 429) {
      return { accepted: false, issue: "EMAIL_RATE_LIMIT" };
    }
    if (response.status >= 500 || response.status === 408) {
      return { accepted: false, issue: "EMAIL_AMBIGUOUS" };
    }
    if (response.status === 409) {
      const error = await response.json();
      return {
        accepted: false,
        issue:
          error?.name === "invalid_idempotent_request"
            ? "EMAIL_PAYLOAD_MISMATCH"
            : "EMAIL_AMBIGUOUS",
      };
    }
    if (!response.ok) {
      return { accepted: false, issue: "EMAIL_REJECTED" };
    }
    const result = await response.json();
    if (typeof result?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(result.id)) {
      return { accepted: false, issue: "EMAIL_AMBIGUOUS" };
    }
    return { accepted: true, messageId: result.id };
  } catch {
    return { accepted: false, issue: "EMAIL_AMBIGUOUS" };
  }
}
