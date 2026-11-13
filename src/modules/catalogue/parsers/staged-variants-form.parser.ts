import type { VariantInput } from "../types";
import { normalizeSizeValue } from "../utils/size";
import { parseVariantInput } from "./variant-input.parser";

export function parseStagedVariants(value: FormDataEntryValue | null): {
  variants: VariantInput[];
  error?: string;
} {
  if (typeof value !== "string" || !value) {
    return { variants: [] };
  }
  try {
    const raw: unknown = JSON.parse(value);
    if (!Array.isArray(raw)) {
      throw new Error();
    }
    const variants = raw.map((item) => {
      if (!item || typeof item !== "object") {
        throw new Error();
      }
      const candidate = item as Record<string, unknown>;
      const parsed = parseVariantInput({
        sizeValue: String(candidate.sizeValue ?? ""),
        price: String(candidate.price ?? ""),
        quantity: String(candidate.quantity ?? ""),
      });
      if (!parsed.input) {
        throw new Error();
      }
      return parsed.input;
    });
    const keys = new Set<string>();
    for (const variant of variants) {
      const key = `${normalizeSizeValue(variant.sizeValue)}:ML`;
      if (keys.has(key)) {
        return { variants: [], error: "Each staged variant needs a unique size." };
      }
      keys.add(key);
    }
    return { variants };
  } catch {
    return { variants: [], error: "One or more staged variants are invalid." };
  }
}
