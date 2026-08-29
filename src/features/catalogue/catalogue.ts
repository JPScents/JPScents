import "server-only";

import { Prisma, type ScentCharacter } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scentCharacters } from "./constants";

import type { CatalogueFilters } from "./types";
export type { CatalogueFilters } from "./types";

const details = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { sizeValue: "asc" } },
} satisfies Prisma.PerfumeInclude;

async function signedImageUrl(path: string | undefined) {
  if (!path) return undefined;

  const supabase = await createSupabaseServerClient();
  const signed = await supabase.storage.from("perfume-images").createSignedUrl(path, 3600);
  return signed.error ? undefined : signed.data.signedUrl;
}

export async function listAdminPerfumes(filters: CatalogueFilters = {}) {
  const rows = await prisma.perfume.findMany({ include: details, orderBy: { updatedAt: "desc" } });
  const query = filters.query?.trim().toLocaleLowerCase();
  const projected = await Promise.all(
    rows.map(async (perfume) => {
      const availableVariantCount = perfume.variants.filter(
        (variant) => variant.quantity > 0,
      ).length;
      const totalQuantity = perfume.variants.reduce(
        (total, variant) => total + variant.quantity,
        0,
      );
      const isAvailable = perfume.status === "PUBLISHED" && availableVariantCount > 0;
      return {
        ...perfume,
        primaryImageUrl: await signedImageUrl(perfume.images[0]?.path),
        variantCount: perfume.variants.length,
        availableVariantCount,
        totalQuantity,
        isAvailable,
      };
    }),
  );

  return projected.filter((perfume) => {
    const nameMatches = !query || perfume.name.toLocaleLowerCase().includes(query);
    const availabilityMatches =
      filters.availability === "available"
        ? perfume.isAvailable
        : filters.availability === "unavailable"
          ? !perfume.isAvailable
          : true;
    const placementMatches =
      filters.placement === "featured"
        ? perfume.isFeatured
        : filters.placement === "bestseller"
          ? perfume.isBestseller
          : true;
    return nameMatches && availabilityMatches && placementMatches;
  });
}

export async function getAdminPerfume(id: string) {
  const perfume = await prisma.perfume.findUnique({ where: { id }, include: details });
  if (!perfume) return null;
  const images = await Promise.all(
    perfume.images.map(async (image) => ({
      id: image.id,
      path: image.path,
      altText: image.altText,
      signedUrl: await signedImageUrl(image.path),
    })),
  );
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
    images,
    variants,
  };
}

export async function getEligibleBestsellerCandidates(query = "") {
  const value = query.trim();
  const character = scentCharacters.find((item) => item.toLowerCase() === value.toLowerCase()) as
    ScentCharacter | undefined;
  const rows = await prisma.perfume.findMany({
    where: {
      status: "PUBLISHED",
      variants: { some: { quantity: { gt: 0 } } },
      ...(value
        ? {
            OR: [
              { name: { contains: value, mode: "insensitive" } },
              ...(character ? [{ scentCharacters: { has: character } }] : []),
            ],
          }
        : {}),
    },
    include: details,
    orderBy: { name: "asc" },
  });
  return Promise.all(
    rows.map(async (perfume) => ({
      ...perfume,
      primaryImageUrl: await signedImageUrl(perfume.images[0]?.path),
      variantCount: perfume.variants.length,
      totalQuantity: perfume.variants.reduce((total, variant) => total + variant.quantity, 0),
      orderCount: await prisma.orderItem.count({
        where: { perfumeVariant: { perfumeId: perfume.id } },
      }),
    })),
  );
}

export async function getCatalogueAdminOverview() {
  const [totalPerfumes, availablePerfumes, zeroStockVariants, attention, bestseller] =
    await Promise.all([
      prisma.perfume.count(),
      prisma.perfume.count({
        where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } },
      }),
      prisma.perfumeVariant.count({ where: { quantity: 0 } }),
      prisma.perfume.findMany({
        where: { OR: [{ status: "DRAFT" }, { variants: { none: { quantity: { gt: 0 } } } }] },
        select: { id: true, name: true, status: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.perfume.findFirst({ where: { isBestseller: true }, select: { id: true, name: true } }),
    ]);
  return { totalPerfumes, availablePerfumes, zeroStockVariants, attention, bestseller };
}
