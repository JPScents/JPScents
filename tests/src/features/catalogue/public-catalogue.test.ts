import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/prisma", () => ({ prisma: { perfume: { findMany: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

import {
  getFeaturedPerfumes,
  getPerfumeBySlug,
  getRelatedPerfumes,
  hasAvailablePerfumes,
  hasPublishedPerfumes,
  listPerfumes,
  parsePreferences,
  parseScent,
  preferenceSummary,
  recommendPerfumes,
} from "@/features/catalogue/public-catalogue";
import { prisma } from "@/db/prisma";

const perfume = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "p-1",
    slug: "quiet-fig",
    name: "Quiet Fig",
    scentCue: "Soft fig",
    scentCharacters: ["FRESH"],
    occasions: ["EVERYDAY"],
    timesOfDay: ["DAY"],
    description: "A quiet perfume.",
    status: "PUBLISHED",
    isBestseller: false,
    isFeatured: false,
    images: [],
    variants: [{ id: "v-1", sizeValue: 30, priceMinor: 120000, quantity: 2 }],
    ...overrides,
  }) as unknown as never;

describe("public catalogue URL parsing", () => {
  it("accepts only canonical scent enum values", () => {
    expect(parseScent("FRESH")).toBe("FRESH");
    expect(parseScent("fresh")).toBeUndefined();
    expect(parseScent(["FRESH"])).toBeUndefined();
  });

  it("preserves valid multi-select preferences and ignores invalid values and Either", () => {
    expect(
      parsePreferences({
        scent: "FRESH,INVALID,WOODY",
        occasion: ["WORK", "INVALID", "DATE_NIGHT"],
        time: "EITHER",
      }),
    ).toEqual({
      scentCharacters: ["FRESH", "WOODY"],
      occasions: ["WORK", "DATE_NIGHT"],
      timeOfDay: undefined,
    });
  });

  it("uses published-only query constraints and availability-first ordering", async () => {
    vi.mocked(prisma.perfume.findMany).mockResolvedValueOnce([
      perfume({
        id: "unavailable",
        variants: [{ id: "v", sizeValue: 30, priceMinor: 120000, quantity: 0 }],
      }),
      perfume(),
    ]);
    const results = await listPerfumes();
    expect(prisma.perfume.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PUBLISHED" } }),
    );
    expect(results.map((item) => item.id)).toEqual(["p-1", "unavailable"]);
  });

  it("checks published and available catalogue presence without loading product projections", async () => {
    vi.mocked(prisma.perfume.findFirst)
      .mockResolvedValueOnce({ id: "published" } as never)
      .mockResolvedValueOnce(null);
    await expect(hasPublishedPerfumes()).resolves.toBe(true);
    await expect(hasAvailablePerfumes()).resolves.toBe(false);
    expect(prisma.perfume.findFirst).toHaveBeenNthCalledWith(1, {
      where: { status: "PUBLISHED" },
      select: { id: true },
    });
    expect(prisma.perfume.findFirst).toHaveBeenNthCalledWith(2, {
      where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } },
      select: { id: true },
    });
  });

  it("chooses bestseller before featured for the homepage hero", async () => {
    vi.mocked(prisma.perfume.findMany).mockResolvedValueOnce([
      perfume({ id: "featured", isFeatured: true }),
      perfume({ id: "best", isBestseller: true, name: "Bestseller" }),
    ]);
    const featured = await getFeaturedPerfumes();
    expect(featured.hero?.id).toBe("best");
    expect(featured.products.map((item) => item.id)).toEqual(["best", "featured"]);
  });

  it("serializes only a published detail and preserves ordered variants", async () => {
    vi.mocked(prisma.perfume.findFirst).mockResolvedValueOnce(
      perfume({
        variants: [
          { id: "small", sizeValue: 30, priceMinor: 100000, quantity: 1 },
          { id: "large", sizeValue: 50, priceMinor: 150000, quantity: 0 },
        ],
      }),
    );
    const detail = await getPerfumeBySlug("quiet-fig");
    expect(prisma.perfume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "quiet-fig", status: "PUBLISHED" } }),
    );
    expect(detail?.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "small", sizeLabel: "30 mL", isAvailable: true }),
        expect.objectContaining({ id: "large", isAvailable: false }),
      ]),
    );
  });

  it("excludes the current perfume when ranking related available perfumes", async () => {
    vi.mocked(prisma.perfume.findMany).mockResolvedValueOnce([
      perfume({ id: "related-a", name: "Amber", scentCharacters: ["FRESH", "WARM"] }),
      perfume({ id: "related-b", name: "Cedar", scentCharacters: ["FRESH"] }),
    ]);
    const related = await getRelatedPerfumes({
      id: "p-1",
      slug: "quiet-fig",
      name: "Quiet Fig",
      scentCue: "Soft fig",
      scentCharacters: ["FRESH"],
      occasions: ["EVERYDAY"],
      timesOfDay: ["DAY"],
      description: "A quiet perfume.",
      primaryImageAlt: "",
      startingPrice: "From ₦1,200",
      isAvailable: true,
      variants: [],
    });
    expect(prisma.perfume.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          id: { not: "p-1" },
          variants: { some: { quantity: { gt: 0 } } },
        }),
      }),
    );
    expect(related.map((item) => item.id)).toEqual(["related-a", "related-b"]);
  });

  it("ranks available recommendations with plain-language reasons and labels summaries", async () => {
    vi.mocked(prisma.perfume.findMany).mockResolvedValueOnce([
      perfume({ id: "best-match", scentCharacters: ["FRESH", "WOODY"], occasions: ["WORK"] }),
      perfume({
        id: "less-match",
        name: "Less",
        scentCharacters: ["FRESH"],
        occasions: ["EVERYDAY"],
      }),
    ]);
    const results = await recommendPerfumes({
      scentCharacters: ["FRESH", "WOODY"],
      occasions: ["WORK"],
      timeOfDay: undefined,
    });
    expect(results.map((item) => item.id)).toEqual(["best-match", "less-match"]);
    expect(results[0]?.matchReason).toContain("Fresh, Woody, Work");
    expect(
      preferenceSummary({
        scentCharacters: ["FRESH"],
        occasions: ["DATE_NIGHT"],
        timeOfDay: "NIGHT",
      }),
    ).toEqual(["Fresh", "Evening", "Night"]);
  });
});
