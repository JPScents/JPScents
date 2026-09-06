"use server";

import { commerceConfig } from "@/config/commerce";
import { getPublishedVariantsByIds } from "@/features/catalogue/server";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";

import type { CartRequestLine, ResolvedCartLine } from "../types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRequestedItems(value: unknown): CartRequestLine[] {
  if (!Array.isArray(value)) {
    throw new Error("Cart items must be an array.");
  }

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid cart item.");
    }
    const { perfumeVariantId, quantity } = item as Partial<CartRequestLine>;
    if (
      typeof perfumeVariantId !== "string" ||
      !perfumeVariantId ||
      !Number.isSafeInteger(quantity) ||
      quantity === undefined ||
      quantity < 1
    ) {
      throw new Error("Cart items require a variant ID and a positive whole quantity.");
    }
    const total = (quantities.get(perfumeVariantId) ?? 0) + quantity;
    if (!Number.isSafeInteger(total)) {
      throw new Error("Invalid cart quantity.");
    }
    quantities.set(perfumeVariantId, total);
  }

  return Array.from(quantities, ([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity }));
}

export async function resolveCart(value: unknown): Promise<ResolvedCartLine[]> {
  const items = parseRequestedItems(value);
  const ids = items.map((item) => item.perfumeVariantId).filter((id) => UUID_PATTERN.test(id));
  const variants = ids.length ? await getPublishedVariantsByIds(ids) : [];
  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  return Promise.all(
    items.map(async ({ perfumeVariantId, quantity }): Promise<ResolvedCartLine> => {
      const variant = byId.get(perfumeVariantId);
      if (!variant) {
        return {
          perfumeVariantId,
          requestedQuantity: quantity,
          lineAmountMinor: 0,
          isValid: false,
          issue: "missing",
        };
      }

      const stock = variant.quantity;
      const maximum = Math.min(stock, commerceConfig.maximumVariantQuantity);
      const issue = stock === 0 ? "unavailable" : quantity > maximum ? "over-quantity" : undefined;
      const image = variant.perfume.images[0];
      return {
        perfumeVariantId,
        requestedQuantity: quantity,
        name: variant.perfume.name,
        slug: variant.perfume.slug,
        sizeLabel: `${variant.sizeValue.toString()} ${commerceConfig.sizeUnit}`,
        imageUrl: await getPerfumeImageUrl(image?.path),
        imageAlt: image?.altText || `${variant.perfume.name} bottle`,
        unitPriceMinor: variant.priceMinor,
        stock,
        lineAmountMinor: issue ? 0 : variant.priceMinor * quantity,
        isValid: !issue,
        issue,
      };
    }),
  );
}
