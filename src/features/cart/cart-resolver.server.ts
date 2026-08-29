"use server";

import { prisma } from "@/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CartRequestLine = { perfumeVariantId: string; quantity: number };
export type ResolvedCartLine = {
  perfumeVariantId: string;
  requestedQuantity: number;
  name?: string;
  slug?: string;
  sizeLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  unitPriceMinor?: number;
  stock?: number;
  lineAmountMinor: number;
  isValid: boolean;
  issue?: "missing" | "unavailable" | "over-quantity";
};

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
  const variants = ids.length
    ? await prisma.perfumeVariant.findMany({
        where: { id: { in: ids }, perfume: { status: "PUBLISHED" } },
        include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      })
    : [];
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
          issue: "missing",
        };
      const stock = variant.quantity;
      const issue =
        stock === 0 ? "unavailable" : line.quantity > stock ? "over-quantity" : undefined;
      const image = variant.perfume.images[0];
      return {
        perfumeVariantId: variant.id,
        requestedQuantity: line.quantity,
        name: variant.perfume.name,
        slug: variant.perfume.slug,
        sizeLabel: `${variant.sizeValue.toString()} mL`,
        imageUrl: await signedImageUrl(image?.path),
        imageAlt: image?.altText || `${variant.perfume.name} bottle`,
        unitPriceMinor: variant.priceMinor,
        stock,
        lineAmountMinor: issue ? 0 : variant.priceMinor * line.quantity,
        isValid: !issue,
        issue,
      };
    }),
  );
}
