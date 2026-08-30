import { describe, expect, it, vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    perfume: { findMany },
    orderItem: { count },
  },
}));
vi.mock("@/lib/supabase/storage", () => ({
  getPerfumeImageUrl: vi.fn(async () => "https://signed.example/perfume"),
}));

import { getEligibleBestsellerCandidates } from "@/features/catalogue/catalogue";

describe("Admin catalogue projections", () => {
  it("keeps Prisma Decimal variants out of the client-facing Bestseller candidates", async () => {
    findMany.mockResolvedValue([
      {
        id: "perfume-id",
        name: "Quiet Fig",
        scentCharacters: ["FRESH"],
        images: [{ path: "perfumes/perfume-id/image.png" }],
        variants: [
          {
            id: "variant-id",
            sizeValue: { toString: () => "50", marker: "prisma-decimal" },
            quantity: 3,
          },
        ],
      },
    ]);
    count.mockResolvedValue(0);

    const candidates = await getEligibleBestsellerCandidates();

    expect(candidates).toEqual([
      {
        id: "perfume-id",
        name: "Quiet Fig",
        scentCharacters: ["FRESH"],
        primaryImageUrl: "https://signed.example/perfume",
        variantCount: 1,
        totalQuantity: 3,
        orderCount: 0,
      },
    ]);
    expect(JSON.stringify(candidates)).not.toContain("prisma-decimal");
  });
});
