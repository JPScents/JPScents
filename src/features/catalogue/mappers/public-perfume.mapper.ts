import type { Perfume, PerfumeImage, PerfumeVariant } from "@/db/generated/client";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import type { PublicPerfumeCard } from "../types";

type PerfumeRow = Perfume & { images: PerfumeImage[]; variants: PerfumeVariant[] };

async function signedImageUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("/")) return path;
  try {
    const supabase = await createSupabaseServerClient();
    const signed = await supabase.storage.from("perfume-images").createSignedUrl(path, 3600);
    return signed.error ? undefined : signed.data.signedUrl;
  } catch {
    return undefined;
  }
}

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
    primaryImageUrl: await signedImageUrl(primaryImage?.path),
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
