import "server-only";

import { Prisma, type Occasion, type Perfume, type PerfumeImage, type PerfumeVariant, type ScentCharacter, type TimeOfDay } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";
import { preferenceLabel } from "./public-preferences";
export { preferenceLabel, preferenceSummary } from "./public-preferences";

type PerfumeRow = Perfume & { images: PerfumeImage[]; variants: PerfumeVariant[] };

export type PublicPerfumeCard = {
  id: string;
  slug: string;
  name: string;
  scentCue: string;
  scentCharacters: ScentCharacter[];
  primaryImageUrl?: string;
  primaryImageAlt: string;
  startingPriceMinor?: number;
  startingPrice: string;
  isAvailable: boolean;
  label?: "Bestseller" | "Featured";
};

export type PublicPerfumeDetail = PublicPerfumeCard & {
  description: string;
  occasions: Occasion[];
  timesOfDay: TimeOfDay[];
  variants: Array<{ id: string; sizeLabel: string; priceMinor: number; price: string; quantity: number; isAvailable: boolean }>;
};

export type HelpPreferences = { scentCharacters: ScentCharacter[]; occasions: Occasion[]; timeOfDay?: TimeOfDay };
export type Recommendation = PublicPerfumeCard & { matchReason: string; score: number };

const detailInclude = { images: { orderBy: { position: "asc" } }, variants: { orderBy: { sizeValue: "asc" } } } as const;

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

async function projectCard(perfume: PerfumeRow): Promise<PublicPerfumeCard> {
  const availableVariants = perfume.variants.filter((variant) => variant.quantity > 0);
  const startingPriceMinor = availableVariants.length ? Math.min(...availableVariants.map((variant) => variant.priceMinor)) : undefined;
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
    startingPrice: startingPriceMinor === undefined ? "Unavailable" : `From ${formatNairaFromMinor(startingPriceMinor)}`,
    isAvailable: availableVariants.length > 0,
    label: perfume.isBestseller ? "Bestseller" : perfume.isFeatured ? "Featured" : undefined,
  };
}

async function publishedRows(where: Prisma.PerfumeWhereInput = {}) {
  return prisma.perfume.findMany({ where: { status: "PUBLISHED", ...where }, include: detailInclude, orderBy: [{ isBestseller: "desc" }, { isFeatured: "desc" }, { name: "asc" }] });
}

function availabilityFirst<T extends PerfumeRow>(rows: T[]) {
  return [...rows].sort((a, b) => Number(b.variants.some((variant) => variant.quantity > 0)) - Number(a.variants.some((variant) => variant.quantity > 0)) || Number(b.isBestseller) - Number(a.isBestseller) || Number(b.isFeatured) - Number(a.isFeatured) || a.name.localeCompare(b.name));
}

export async function getFeaturedPerfumes() {
  const rows = availabilityFirst(await publishedRows());
  const available = rows.filter((perfume) => perfume.variants.some((variant) => variant.quantity > 0));
  const hero = available.find((perfume) => perfume.isBestseller) ?? available.find((perfume) => perfume.isFeatured) ?? available[0];
  const products = await Promise.all(available.slice(0, 3).map(projectCard));
  return { hero: hero ? await projectCard(hero) : undefined, products };
}

export async function listPerfumes(filters: { scentCharacter?: ScentCharacter } = {}) {
  const rows = availabilityFirst(await publishedRows(filters.scentCharacter ? { scentCharacters: { has: filters.scentCharacter } } : {}));
  return Promise.all(rows.map(projectCard));
}

export async function hasPublishedPerfumes() {
  return Boolean(await prisma.perfume.findFirst({ where: { status: "PUBLISHED" }, select: { id: true } }));
}

export async function hasAvailablePerfumes() {
  return Boolean(await prisma.perfume.findFirst({ where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } }, select: { id: true } }));
}

export async function getPerfumeBySlug(slug: string): Promise<PublicPerfumeDetail | null> {
  const perfume = await prisma.perfume.findFirst({ where: { slug, status: "PUBLISHED" }, include: detailInclude });
  if (!perfume) return null;
  const card = await projectCard(perfume);
  return {
    ...card,
    description: perfume.description,
    occasions: perfume.occasions,
    timesOfDay: perfume.timesOfDay,
    variants: perfume.variants.map((variant) => ({ id: variant.id, sizeLabel: `${variant.sizeValue.toString()} mL`, priceMinor: variant.priceMinor, price: formatNairaFromMinor(variant.priceMinor), quantity: variant.quantity, isAvailable: variant.quantity > 0 })),
  };
}

export async function getRelatedPerfumes(perfume: PublicPerfumeDetail, limit = 3) {
  const rows = (await publishedRows({ id: { not: perfume.id }, variants: { some: { quantity: { gt: 0 } } } })).sort((a, b) => {
    const score = (candidate: PerfumeRow) => candidate.scentCharacters.filter((value) => perfume.scentCharacters.includes(value)).length + candidate.occasions.filter((value) => perfume.occasions.includes(value)).length + candidate.timesOfDay.filter((value) => perfume.timesOfDay.includes(value)).length;
    return score(b) - score(a) || Number(b.isBestseller) - Number(a.isBestseller) || Number(b.isFeatured) - Number(a.isFeatured) || a.name.localeCompare(b.name);
  });
  return Promise.all(rows.slice(0, limit).map(projectCard));
}

export async function recommendPerfumes(preferences: HelpPreferences, limit = 3): Promise<Recommendation[]> {
  const rows = await publishedRows({ variants: { some: { quantity: { gt: 0 } } } });
  const ranked = rows.map((perfume) => {
    const scentMatches = perfume.scentCharacters.filter((value) => preferences.scentCharacters.includes(value));
    const occasionMatches = perfume.occasions.filter((value) => preferences.occasions.includes(value));
    const timeMatch = preferences.timeOfDay && perfume.timesOfDay.includes(preferences.timeOfDay);
    const matches = [...scentMatches.map(preferenceLabel), ...occasionMatches.map(preferenceLabel), ...(timeMatch && preferences.timeOfDay ? [preferenceLabel(preferences.timeOfDay)] : [])];
    return { perfume, score: matches.length, matchReason: matches.length ? `Matches your ${matches.join(", ")} preference${matches.length === 1 ? "" : "s"}.` : "A well-balanced option to explore." };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || Number(b.perfume.isBestseller) - Number(a.perfume.isBestseller) || Number(b.perfume.isFeatured) - Number(a.perfume.isFeatured) || a.perfume.name.localeCompare(b.perfume.name));
  return Promise.all(ranked.slice(0, limit).map(async (item) => ({ ...(await projectCard(item.perfume)), score: item.score, matchReason: item.matchReason })));
}

export const publicScentCharacters = ["FRESH", "WARM", "SWEET", "WOODY"] as const;
export const publicOccasions = ["EVERYDAY", "WORK", "DATE_NIGHT", "SPECIAL_OCCASION"] as const;
export const publicTimes = ["DAY", "NIGHT"] as const;

export function parseScent(value: string | string[] | undefined): ScentCharacter | undefined {
  return typeof value === "string" && publicScentCharacters.includes(value as ScentCharacter) ? value as ScentCharacter : undefined;
}

export function parsePreferences(params: Record<string, string | string[] | undefined>): HelpPreferences {
  const values = (key: string, allowed: readonly string[]) => (Array.isArray(params[key]) ? params[key] : typeof params[key] === "string" ? params[key].split(",") : []).filter((value): value is string => allowed.includes(value));
  const time = typeof params.time === "string" && publicTimes.includes(params.time as TimeOfDay) ? params.time as TimeOfDay : undefined;
  return { scentCharacters: values("scent", publicScentCharacters) as ScentCharacter[], occasions: values("occasion", publicOccasions) as Occasion[], timeOfDay: time };
}
