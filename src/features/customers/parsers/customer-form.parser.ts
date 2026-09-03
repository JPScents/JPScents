import { normalizeWhatsappNumber } from "@/lib/whatsapp";

import type { CustomerInput } from "../types";

const clean = (value: FormDataEntryValue | null, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

export function parseCustomerForm(formData: FormData): {
  input?: CustomerInput;
  errors: Record<string, string>;
} {
  const input = {
    name: clean(formData.get("name"), 120),
    whatsappNumber: normalizeWhatsappNumber(clean(formData.get("whatsappNumber"), 32)),
    email: clean(formData.get("email"), 254).toLowerCase(),
    deliveryState: clean(formData.get("deliveryState"), 60),
    deliveryCity: clean(formData.get("deliveryCity"), 80),
    deliveryAddress: clean(formData.get("deliveryAddress"), 500),
  };
  const errors: Record<string, string> = {};
  if (!input.name) errors.name = "Enter the customer name.";
  if (!input.whatsappNumber) errors.whatsappNumber = "Enter a valid WhatsApp number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = "Enter a valid email address.";
  if (!input.deliveryState) errors.deliveryState = "Enter the delivery state.";
  if (!input.deliveryCity) errors.deliveryCity = "Enter the delivery city.";
  if (!input.deliveryAddress) errors.deliveryAddress = "Enter the delivery address.";
  return {
    input: Object.keys(errors).length ? undefined : { ...input, email: input.email || undefined },
    errors,
  };
}
