import "server-only";
import type { ScentCharacter } from "@/infrastructure/database/generated/enums";
import { getPerfumeImageUrl } from "@/infrastructure/supabase/perfume-images";
import { preferenceLabel } from "../utils/preferences";
import type { HelpPreferences, PublicPerfumeDetail, Recommendation } from "../types";
import { mapPublicPerfumeCard, mapPublicPerfumeDetail } from "../mappers/public-perfume.mapper";
import {
  listPublishedPerfumeRecords,
  findPublishedPerfumeBySlug,
  type PerfumeRecord as PerfumeRow,
} from "../repositories/perfume.repository";

async function signedPerfumeCard(perfume: PerfumeRow) {
  return mapPublicPerfumeCard(perfume, await getPerfumeImageUrl(perfume.images[0]?.path));
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
  const rows = availabilityFirst(await listPublishedPerfumeRecords());
  const available = rows.filter((perfume) =>
    perfume.variants.some((variant) => variant.quantity > 0),
  );
  const products = await Promise.all(available.slice(0, 3).map(signedPerfumeCard));
  return { hero: products[0], products };
}

export async function listPerfumes(filters: { scentCharacter?: ScentCharacter } = {}) {
  const rows = availabilityFirst(await listPublishedPerfumeRecords(filters));
  return Promise.all(rows.map(signedPerfumeCard));
}

export async function getPerfumeBySlug(slug: string): Promise<PublicPerfumeDetail | null> {
  const perfume = await findPublishedPerfumeBySlug(slug);
  if (!perfume) {
    return null;
  }
  return mapPublicPerfumeDetail(perfume, await getPerfumeImageUrl(perfume.images[0]?.path));
}

export async function getRelatedPerfumes(perfume: PublicPerfumeDetail, limit = 3) {
  const rows = (
    await listPublishedPerfumeRecords({ excludeId: perfume.id, availableOnly: true })
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
  return Promise.all(rows.slice(0, limit).map(signedPerfumeCard));
}

export async function recommendPerfumes(
  preferences: HelpPreferences,
  limit = 3,
): Promise<Recommendation[]> {
  const rows = await listPublishedPerfumeRecords({ availableOnly: true });
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
      ...(await signedPerfumeCard(item.perfume)),
      score: item.score,
      matchReason: item.matchReason,
    })),
  );
}
