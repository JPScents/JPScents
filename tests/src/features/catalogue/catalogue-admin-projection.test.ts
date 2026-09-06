import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    perfume: { findMany },
  },
}));
vi.mock("@/lib/supabase/storage", () => ({
  getPerfumeImageUrl: vi.fn(async () => "https://signed.example/perfume"),
}));

import {
  getEligibleBestsellerCandidates,
  listAdminPerfumes,
} from "@/features/catalogue/admin-catalogue";

describe("Admin catalogue projections", () => {
  it("applies list filters before loading the admin projection", async () => {
    findMany.mockResolvedValue([]);

    await listAdminPerfumes({
      query: "  fig ",
      availability: "available",
      placement: "featured",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: { contains: "fig", mode: "insensitive" },
          status: "PUBLISHED",
          variants: { some: { quantity: { gt: 0 } } },
          isFeatured: true,
        },
      }),
    );
  });

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
            _count: { orderItems: 0 },
          },
        ],
      },
    ]);

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
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          variants: expect.objectContaining({
            include: { _count: { select: { orderItems: true } } },
          }),
        }),
      }),
    );
    expect(JSON.stringify(candidates)).not.toContain("prisma-decimal");
  });
});
