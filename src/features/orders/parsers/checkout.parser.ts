import type { CheckoutInput } from "../types";
import { normalizeWhatsappNumber } from "../utils/whatsapp.utils";

const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

export function parseCheckoutInput(value: unknown): {
  input?: CheckoutInput;
  errors: Record<string, string>;
} {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const input = {
    customerName: clean(raw.customerName, 120),
    whatsappNumber: normalizeWhatsappNumber(clean(raw.whatsappNumber, 32)),
    email: clean(raw.email, 254),
    deliveryArea: clean(raw.deliveryArea, 120),
    deliveryAddress: clean(raw.deliveryAddress, 500),
    orderNote: clean(raw.orderNote, 500),
  };
  const errors: Record<string, string> = {};
  if (!input.customerName) errors.customerName = "Enter your full name.";
  if (!input.whatsappNumber) errors.whatsappNumber = "Enter a valid WhatsApp number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = "Enter a valid email address.";
  if (!input.deliveryArea) errors.deliveryArea = "Enter your delivery area.";
  if (!input.deliveryAddress) errors.deliveryAddress = "Enter your delivery address.";
  return {
    input: Object.keys(errors).length
      ? undefined
      : { ...input, email: input.email || undefined, orderNote: input.orderNote || undefined },
    errors,
  };
}
