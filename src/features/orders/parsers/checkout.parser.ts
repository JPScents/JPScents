import type { CheckoutInput } from "../types";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";
import { CUSTOM_CITY_MAX_LENGTH, OTHER_CITY_VALUE } from "../constants/nigeria-locations";
import { isKnownCity, isNigerianState } from "../utils/delivery-location.utils";

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
    email: clean(raw.email, 254).toLowerCase(),
    deliveryState: clean(raw.deliveryState, 60),
    deliveryCity: clean(raw.deliveryCity, CUSTOM_CITY_MAX_LENGTH),
    customCity: clean(raw.customCity, CUSTOM_CITY_MAX_LENGTH),
    deliveryAddress: clean(raw.deliveryAddress, 500),
    orderNote: clean(raw.orderNote, 500),
  };
  const errors: Record<string, string> = {};
  if (!input.customerName) errors.customerName = "Enter your full name.";
  if (!input.whatsappNumber) errors.whatsappNumber = "Enter a valid WhatsApp number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = "Enter a valid email address.";
  if (!isNigerianState(input.deliveryState)) errors.deliveryState = "Choose your delivery state.";
  if (input.deliveryCity === OTHER_CITY_VALUE) {
    if (!input.customCity) errors.customCity = "Enter your city.";
    if (typeof raw.customCity === "string" && raw.customCity.trim().length > CUSTOM_CITY_MAX_LENGTH)
      errors.customCity = `Use ${CUSTOM_CITY_MAX_LENGTH} characters or fewer.`;
  } else if (
    isNigerianState(input.deliveryState) &&
    !isKnownCity(input.deliveryState, input.deliveryCity)
  ) {
    errors.deliveryCity = "Choose your delivery city.";
  }
  if (!input.deliveryAddress) errors.deliveryAddress = "Enter your delivery address.";
  const deliveryCity =
    input.deliveryCity === OTHER_CITY_VALUE ? input.customCity : input.deliveryCity;
  return {
    input: Object.keys(errors).length
      ? undefined
      : {
          customerName: input.customerName,
          whatsappNumber: input.whatsappNumber,
          email: input.email || undefined,
          deliveryState: input.deliveryState,
          deliveryCity,
          deliveryAddress: input.deliveryAddress,
          orderNote: input.orderNote || undefined,
        },
    errors,
  };
}
