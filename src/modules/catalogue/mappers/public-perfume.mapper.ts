import type { PerfumeRecord } from "../repositories/perfume.repository";

import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import type { PublicPerfumeCard, PublicPerfumeDetail } from "../types";

export function mapPublicPerfumeCard(perfume: PerfumeRecord, imageUrl?: string): PublicPerfumeCard {
  const availableVariants = perfume.variants.filter((variant) => variant.quantity > 0);
  const startingPriceMinor = availableVariants.length
    ? Math.min(...availableVariants.map((variant) => variant.priceMinor))
    : undefined;
  const primaryImage = perfume.images[0];
  return {
    id: perfume.id,
    slug: perfume.slug,
    name: perfume.name,
    scentCue: perfume.scentCue,
    scentCharacters: perfume.scentCharacters,
    primaryImageUrl: imageUrl,
    primaryImageAlt: primaryImage?.altText || "",
    startingPriceMinor,
    startingPrice:
      startingPriceMinor === undefined
        ? "Unavailable"
        : `From ${formatNairaFromMinor(startingPriceMinor)}`,
    isAvailable: availableVariants.length > 0,
    label: perfume.isBestseller ? "Bestseller" : perfume.isFeatured ? "Featured" : undefined,
  };
}

export function mapPublicPerfumeDetail(
  perfume: PerfumeRecord,
  imageUrl?: string,
): PublicPerfumeDetail {
  return {
    ...mapPublicPerfumeCard(perfume, imageUrl),
    description: perfume.description,
    occasions: perfume.occasions,
    timesOfDay: perfume.timesOfDay,
    variants: perfume.variants.map((variant) => ({
      id: variant.id,
      sizeLabel: `${variant.sizeValue.toString()} mL`,
      priceMinor: variant.priceMinor,
      price: formatNairaFromMinor(variant.priceMinor),
      quantity: variant.quantity,
      isAvailable: variant.quantity > 0,
    })),
  };
}
