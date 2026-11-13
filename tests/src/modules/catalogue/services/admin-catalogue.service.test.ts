import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    perfume: { findMany },
  },
}));
vi.mock("@/infrastructure/supabase/perfume-images", () => ({
  getPerfumeImageUrl: vi.fn(async () => "https://signed.example/perfume"),
}));

import {
  getEligibleBestsellerCandidates,
  listAdminPerfumes,
} from "@/modules/catalogue/services/admin-catalogue.service";

const admin = { id: "admin", email: "admin@example.com" };

describe("Admin catalogue projections", () => {
  it("rejects missing Admin identity before accessing Catalogue data", async () => {
    findMany.mockClear();

    await expect(listAdminPerfumes(null)).rejects.toThrow("You are not authorized.");
    await expect(getEligibleBestsellerCandidates(null)).rejects.toThrow("You are not authorized.");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("applies list filters before loading the admin projection", async () => {
    findMany.mockResolvedValue([]);

    await listAdminPerfumes(admin, {
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

    const candidates = await getEligibleBestsellerCandidates(admin);

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
