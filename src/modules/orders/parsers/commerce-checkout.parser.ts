import { isNigerianDestination } from "@/modules/delivery";
import { isNairaMinor } from "@/shared/utils/naira-minor";
import { normalizeWhatsappNumber } from "@/shared/utils/whatsapp";

import type { CommerceCheckoutInput, CommerceQuoteInput } from "../types";
import { parseOrderLines, isSubmissionKey } from "./order-submission.parser";

function textField(
  raw: Record<string, unknown>,
  key: string,
  maximum: number,
  errors: Record<string, string>,
  required = false,
) {
  const value = raw[key];
  const text = typeof value === "string" ? value.trim() : "";
  if (value !== undefined && typeof value !== "string") {
    errors[key] = "Enter text.";
  } else if (text.length > maximum) {
    errors[key] = `Use ${maximum} characters or fewer.`;
  } else if (required && !text) {
    errors[key] = "This field is required.";
  }
  return text;
}

export function parseCommerceCheckout(value: unknown): {
  input?: CommerceCheckoutInput;
  errors: Record<string, string>;
} {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const customerName = textField(raw, "customerName", 120, errors, true);
  const email = textField(raw, "email", 254, errors, true).toLowerCase();
  const phone = textField(raw, "whatsappNumber", 32, errors, true);
  const whatsappNumber = /^[+\d().\s-]+$/.test(phone) ? normalizeWhatsappNumber(phone) : "";
  const deliveryState = raw.deliveryState;
  const deliveryCity = textField(raw, "deliveryCity", 80, errors, true);
  const deliveryAddress = textField(raw, "deliveryAddress", 240, errors, true);
  const deliveryApartment = textField(raw, "deliveryApartment", 80, errors);
  const deliveryLandmark = textField(raw, "deliveryLandmark", 120, errors);
  const deliveryPostcode = textField(raw, "deliveryPostcode", 16, errors);
  const orderNote = textField(raw, "orderNote", 500, errors);

  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!errors.whatsappNumber && !whatsappNumber) {
    errors.whatsappNumber = "Enter a valid phone number.";
  }
  if (raw.deliveryCountry !== "NG") {
    errors.deliveryCountry = "Delivery is available in Nigeria.";
  }
  if (!isNigerianDestination(deliveryState)) {
    errors.deliveryState = "Choose a delivery state or FCT.";
    return { errors };
  }
  if (Object.keys(errors).length) {
    return { errors };
  }
  return {
    input: {
      customerName,
      email,
      whatsappNumber,
      deliveryCountry: "NG",
      deliveryState,
      deliveryCity,
      deliveryAddress,
      deliveryApartment: deliveryApartment || undefined,
      deliveryLandmark: deliveryLandmark || undefined,
      deliveryPostcode: deliveryPostcode || undefined,
      orderNote: orderNote || undefined,
    },
    errors,
  };
}

export function parseCommercePurchase(
  linesRaw: unknown,
  checkoutRaw: unknown,
  quoteRaw: unknown,
  submissionKey: unknown,
) {
  const lines = parseOrderLines(linesRaw, 99);
  if (!lines || !isSubmissionKey(submissionKey)) {
    return {
      error: "Your cart or submission is invalid. Refresh Checkout and try again.",
    } as const;
  }
  const checkout = parseCommerceCheckout(checkoutRaw);
  if (!checkout.input) {
    return { errors: checkout.errors } as const;
  }
  const quote = parseExpectedQuote(quoteRaw, lines);
  if (!quote) {
    return { error: "Review the current prices and delivery fee before paying." } as const;
  }
  return { input: checkout.input, quote, submissionKey } as const;
}

function parseExpectedQuote(
  value: unknown,
  lines: NonNullable<ReturnType<typeof parseOrderLines>>,
): CommerceQuoteInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const { deliveryFeeMinor, unitPrices } = value as Record<string, unknown>;
  if (
    !isNairaMinor(deliveryFeeMinor) ||
    !Array.isArray(unitPrices) ||
    unitPrices.length !== lines.length
  ) {
    return null;
  }
  const prices = new Map<string, number>();
  for (const entry of unitPrices) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const { perfumeVariantId, unitPriceMinor } = entry as Record<string, unknown>;
    if (
      typeof perfumeVariantId !== "string" ||
      prices.has(perfumeVariantId) ||
      !isNairaMinor(unitPriceMinor)
    ) {
      return null;
    }
    prices.set(perfumeVariantId, unitPriceMinor);
  }
  const quotedLines = [];
  for (const line of lines) {
    const unitPriceMinor = prices.get(line.perfumeVariantId);
    if (unitPriceMinor === undefined) {
      return null;
    }
    quotedLines.push({ ...line, unitPriceMinor });
  }
  return { deliveryFeeMinor, lines: quotedLines };
}
