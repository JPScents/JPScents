import type { Perfume, PerfumeImage, PerfumeVariant } from "@/db/generated/client";

import { getPerfumeImageUrl } from "@/lib/supabase/storage";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import type { PublicPerfumeCard } from "../types";

type PerfumeRow = Perfume & { images: PerfumeImage[]; variants: PerfumeVariant[] };

export async function mapPublicPerfumeCard(perfume: PerfumeRow): Promise<PublicPerfumeCard> {
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
    primaryImageUrl: await getPerfumeImageUrl(primaryImage?.path),
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
