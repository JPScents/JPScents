import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ResolvedCartLine } from "../types";

async function signedImageUrl(path?: string) {
  if (!path) return undefined;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.storage.from("perfume-images").createSignedUrl(path, 3600);
    return result.error ? undefined : result.data.signedUrl;
  } catch {
    return undefined;
  }
}

export async function mapResolvedCartLine(
  variant: {
    id: string;
    quantity: number;
    priceMinor: number;
    sizeValue: { toString(): string };
    perfume: {
      name: string;
      slug: string;
      images: Array<{ path: string; altText: string }>;
    };
  },
  requestedQuantity: number,
): Promise<ResolvedCartLine> {
  const stock = variant.quantity;
  const issue =
    stock === 0 ? "unavailable" : requestedQuantity > stock ? "over-quantity" : undefined;
  const image = variant.perfume.images[0];
  return {
    perfumeVariantId: variant.id,
    requestedQuantity,
    name: variant.perfume.name,
    slug: variant.perfume.slug,
    sizeLabel: `${variant.sizeValue.toString()} mL`,
    imageUrl: await signedImageUrl(image?.path),
    imageAlt: image?.altText || `${variant.perfume.name} bottle`,
    unitPriceMinor: variant.priceMinor,
    stock,
    lineAmountMinor: issue ? 0 : variant.priceMinor * requestedQuantity,
    isValid: !issue,
    issue,
  };
}
