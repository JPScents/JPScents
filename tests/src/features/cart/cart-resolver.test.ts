import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/db/prisma", () => ({ prisma: { perfumeVariant: { findMany } } }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { resolveCartItems } from "@/features/cart/cart-resolver.server";

describe("resolveCartItems", () => {
  it("preserves requested order and classifies missing, unavailable, and over-quantity lines from current published data", async () => {
    const available = "22222222-2222-4222-8222-222222222222";
    const empty = "33333333-3333-4333-8333-333333333333";
    const missing = "44444444-4444-4444-8444-444444444444";
    findMany.mockResolvedValueOnce([
      {
        id: available,
        sizeValue: 50,
        priceMinor: 120000,
        quantity: 2,
        perfume: { name: "Santal Veil", slug: "santal-veil", images: [] },
      },
      {
        id: empty,
        sizeValue: 30,
        priceMinor: 90000,
        quantity: 0,
        perfume: { name: "Citrus Linen", slug: "citrus-linen", images: [] },
      },
    ]);
    const lines = await resolveCartItems([
      { perfumeVariantId: "not-a-uuid", quantity: 2 },
      { perfumeVariantId: missing, quantity: 1 },
      { perfumeVariantId: empty, quantity: 1 },
      { perfumeVariantId: available, quantity: 3 },
      { perfumeVariantId: available, quantity: 1 },
    ]);
    expect(lines.map((line) => line.perfumeVariantId)).toEqual([
      "not-a-uuid",
      missing,
      empty,
      available,
      available,
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [missing, empty, available, available] } }),
      }),
    );
    expect(lines.map((line) => line.issue)).toEqual([
      "missing",
      "missing",
      "unavailable",
      "over-quantity",
      undefined,
    ]);
    expect(lines[4]).toMatchObject({
      unitPriceMinor: 120000,
      stock: 2,
      lineAmountMinor: 120000,
      isValid: true,
    });
  });
});
