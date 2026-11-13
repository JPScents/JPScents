import type { AdminPerfume, AdminPerfumeListItem, BestsellerCandidate } from "../types";
import type { PerfumeRecord, BestsellerRecord } from "../repositories/perfume.repository";

export function toAdminPerfumeListItem(
  perfume: PerfumeRecord,
  primaryImageUrl?: string,
): AdminPerfumeListItem {
  const availableVariantCount = perfume.variants.filter((variant) => variant.quantity > 0).length;
  return {
    id: perfume.id,
    name: perfume.name,
    scentCharacters: perfume.scentCharacters,
    isFeatured: perfume.isFeatured,
    isBestseller: perfume.isBestseller,
    primaryImageUrl,
    variantCount: perfume.variants.length,
    availableVariantCount,
    totalQuantity: perfume.variants.reduce((total, variant) => total + variant.quantity, 0),
    isAvailable: perfume.status === "PUBLISHED" && availableVariantCount > 0,
  };
}
export function toAdminPerfume(
  perfume: PerfumeRecord,
  imageUrls: ReadonlyMap<string, string | undefined>,
): AdminPerfume {
  const variants = perfume.variants.map((variant) => ({
    id: variant.id,
    sizeValue: variant.sizeValue.toString(),
    sizeUnit: variant.sizeUnit,
    priceMinor: variant.priceMinor,
    quantity: variant.quantity,
  }));
  return {
    id: perfume.id,
    name: perfume.name,
    slug: perfume.slug,
    scentCue: perfume.scentCue,
    description: perfume.description,
    status: perfume.status,
    scentCharacters: perfume.scentCharacters,
    occasions: perfume.occasions,
    timesOfDay: perfume.timesOfDay,
    isFeatured: perfume.isFeatured,
    isBestseller: perfume.isBestseller,
    images: perfume.images.map((image) => ({
      id: image.id,
      path: image.path,
      altText: image.altText,
      signedUrl: imageUrls.get(image.path),
    })),
    variants,
  };
}

export function toBestsellerCandidate(
  perfume: BestsellerRecord,
  primaryImageUrl?: string,
): BestsellerCandidate {
  return {
    id: perfume.id,
    name: perfume.name,
    scentCharacters: perfume.scentCharacters,
    primaryImageUrl,
    variantCount: perfume.variants.length,
    totalQuantity: perfume.variants.reduce((total, variant) => total + variant.quantity, 0),
    orderCount: perfume.variants.reduce((total, variant) => total + variant._count.orderItems, 0),
  };
}
