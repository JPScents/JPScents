import "server-only";

import {
  Prisma,
  type Perfume,
  type PerfumeImage,
  type PerfumeVariant,
  type ScentCharacter,
} from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";
import { preferenceLabel } from "./public-preferences";
import type { HelpPreferences, PublicPerfumeDetail, Recommendation } from "./types";
import { mapPublicPerfumeCard } from "./mappers/public-perfume.mapper";
export { preferenceLabel, preferenceSummary } from "./public-preferences";

const detailInclude = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { sizeValue: "asc" } },
} as const;

type PerfumeRow = Perfume & { images: PerfumeImage[]; variants: PerfumeVariant[] };

async function publishedRows(where: Prisma.PerfumeWhereInput = {}) {
  return prisma.perfume.findMany({
    where: { status: "PUBLISHED", ...where },
    include: detailInclude,
    orderBy: [{ isBestseller: "desc" }, { isFeatured: "desc" }, { name: "asc" }],
  });
}

function availabilityFirst<T extends PerfumeRow>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      Number(b.variants.some((variant) => variant.quantity > 0)) -
        Number(a.variants.some((variant) => variant.quantity > 0)) ||
      Number(b.isBestseller) - Number(a.isBestseller) ||
      Number(b.isFeatured) - Number(a.isFeatured) ||
      a.name.localeCompare(b.name),
  );
}

export async function getFeaturedPerfumes() {
  const rows = availabilityFirst(await publishedRows());
  const available = rows.filter((perfume) =>
    perfume.variants.some((variant) => variant.quantity > 0),
  );
  const hero =
    available.find((perfume) => perfume.isBestseller) ??
    available.find((perfume) => perfume.isFeatured) ??
    available[0];
  const products = await Promise.all(available.slice(0, 3).map(mapPublicPerfumeCard));
  return { hero: hero ? await mapPublicPerfumeCard(hero) : undefined, products };
}

export async function listPerfumes(filters: { scentCharacter?: ScentCharacter } = {}) {
  const rows = availabilityFirst(
    await publishedRows(
      filters.scentCharacter ? { scentCharacters: { has: filters.scentCharacter } } : {},
    ),
  );
  return Promise.all(rows.map(mapPublicPerfumeCard));
}

export async function hasPublishedPerfumes() {
  return Boolean(
    await prisma.perfume.findFirst({ where: { status: "PUBLISHED" }, select: { id: true } }),
  );
}

export async function hasAvailablePerfumes() {
  return Boolean(
    await prisma.perfume.findFirst({
      where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } },
      select: { id: true },
    }),
  );
}

export async function getPerfumeBySlug(slug: string): Promise<PublicPerfumeDetail | null> {
  const perfume = await prisma.perfume.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: detailInclude,
  });
  if (!perfume) return null;
  const card = await mapPublicPerfumeCard(perfume);
  return {
    ...card,
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

export async function getRelatedPerfumes(perfume: PublicPerfumeDetail, limit = 3) {
  const rows = (
    await publishedRows({ id: { not: perfume.id }, variants: { some: { quantity: { gt: 0 } } } })
  ).sort((a, b) => {
    const score = (candidate: PerfumeRow) =>
      candidate.scentCharacters.filter((value) => perfume.scentCharacters.includes(value)).length +
      candidate.occasions.filter((value) => perfume.occasions.includes(value)).length +
      candidate.timesOfDay.filter((value) => perfume.timesOfDay.includes(value)).length;
    return (
      score(b) - score(a) ||
      Number(b.isBestseller) - Number(a.isBestseller) ||
      Number(b.isFeatured) - Number(a.isFeatured) ||
      a.name.localeCompare(b.name)
    );
  });
  return Promise.all(rows.slice(0, limit).map(mapPublicPerfumeCard));
}

export async function recommendPerfumes(
  preferences: HelpPreferences,
  limit = 3,
): Promise<Recommendation[]> {
  const rows = await publishedRows({ variants: { some: { quantity: { gt: 0 } } } });
  const ranked = rows
    .map((perfume) => {
      const scentMatches = perfume.scentCharacters.filter((value) =>
        preferences.scentCharacters.includes(value),
      );
      const occasionMatches = perfume.occasions.filter((value) =>
        preferences.occasions.includes(value),
      );
      const timeMatch = preferences.timeOfDay && perfume.timesOfDay.includes(preferences.timeOfDay);
      const matches = [
        ...scentMatches.map(preferenceLabel),
        ...occasionMatches.map(preferenceLabel),
        ...(timeMatch && preferences.timeOfDay ? [preferenceLabel(preferences.timeOfDay)] : []),
      ];
      return {
        perfume,
        score: matches.length,
        matchReason: matches.length
          ? `Matches your ${matches.join(", ")} preference${matches.length === 1 ? "" : "s"}.`
          : "A well-balanced option to explore.",
      };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.perfume.isBestseller) - Number(a.perfume.isBestseller) ||
        Number(b.perfume.isFeatured) - Number(a.perfume.isFeatured) ||
        a.perfume.name.localeCompare(b.perfume.name),
    );
  return Promise.all(
    ranked.slice(0, limit).map(async (item) => ({
      ...(await mapPublicPerfumeCard(item.perfume)),
      score: item.score,
      matchReason: item.matchReason,
    })),
  );
}
