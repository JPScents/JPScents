import type { PerfumeInput } from "../types";

export function getPublishingErrors(
  input: PerfumeInput,
  imageCount: number,
  positiveVariantCount: number,
) {
  const errors: Record<string, string> = {};
  if (input.status !== "PUBLISHED") {
    return errors;
  }
  if (!imageCount) {
    errors.form = "Publishing requires a primary image with alt text.";
  } else if (!positiveVariantCount) {
    errors.form = "Publishing requires an in-stock, priced variant.";
  }
  return errors;
}
