import type { VariantInput } from "../types";
import { parseNairaToMinor } from "../utils/price.utils";

export function validateVariantInput(raw: Record<string, unknown>): {
  input?: VariantInput;
  errors: Record<string, string>;
} {
  const sizeValue = typeof raw.sizeValue === "string" ? raw.sizeValue.trim() : "";
  const priceMinor = parseNairaToMinor(typeof raw.price === "string" ? raw.price.trim() : "");
  const quantityText = typeof raw.quantity === "string" ? raw.quantity.trim() : "";
  const quantity = Number(quantityText);
  const errors: Record<string, string> = {};
  if (!/^\d+(?:\.\d{1,2})?$/.test(sizeValue) || Number(sizeValue) <= 0)
    errors.sizeValue = "Size must be positive.";
  if (priceMinor === null) errors.price = "Enter a Naira amount with up to two decimals.";
  if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(quantity) || quantity < 0)
    errors.quantity = "Quantity must be a non-negative whole number.";
  return {
    input: Object.keys(errors).length
      ? undefined
      : { sizeValue, priceMinor: priceMinor!, quantity },
    errors,
  };
}
