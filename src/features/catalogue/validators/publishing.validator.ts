import type { PerfumeInput } from "../types";

export function getPublishingErrors(
  input: PerfumeInput,
  imageCount: number,
  positiveVariantCount: number,
) {
  const errors: Record<string, string> = {};
  if (input.status === "PUBLISHED") {
    if (!input.name || !input.slug || !input.scentCue || !input.description)
      errors.form = "Publishing requires complete customer-facing details.";
    else if (!imageCount) errors.form = "Publishing requires a primary image with alt text.";
    else if (!input.scentCharacters.length || !input.occasions.length || !input.timesOfDay.length)
      errors.form = "Publishing requires maintained recommendation attributes.";
    else if (!positiveVariantCount)
      errors.form = "Publishing requires an in-stock, priced variant.";
  }
  return errors;
}
