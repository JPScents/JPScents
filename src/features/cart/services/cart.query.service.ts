import "server-only";

import { mapResolvedCartLine } from "../mappers/resolved-cart-line.mapper";
import { findPublishedVariants } from "../repositories/cart.query.repository";
import type { CartRequestLine, ResolvedCartLine } from "../types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveCartItems(lines: CartRequestLine[]): Promise<ResolvedCartLine[]> {
  const validLines = lines.filter(
    (line) =>
      typeof line.perfumeVariantId === "string" &&
      Number.isSafeInteger(line.quantity) &&
      line.quantity > 0,
  );
  const ids = validLines
    .filter((line) => UUID_PATTERN.test(line.perfumeVariantId))
    .map((line) => line.perfumeVariantId);
  const variants = ids.length ? await findPublishedVariants(ids) : [];
  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  return Promise.all(
    validLines.map(async (line) => {
      const variant = byId.get(line.perfumeVariantId);
      if (!variant)
        return {
          perfumeVariantId: line.perfumeVariantId,
          requestedQuantity: line.quantity,
          lineAmountMinor: 0,
          isValid: false,
          issue: "missing" as const,
        };
      return mapResolvedCartLine(variant, line.quantity);
    }),
  );
}
