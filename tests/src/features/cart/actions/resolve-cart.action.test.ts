import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookup, imageUrl } = vi.hoisted(() => ({ lookup: vi.fn(), imageUrl: vi.fn() }));
vi.mock("@/features/catalogue/server", () => ({ getPublishedVariantsByIds: lookup }));
vi.mock("@/lib/supabase/storage", () => ({ getPerfumeImageUrl: imageUrl }));

import { resolveCart } from "@/features/cart/actions/resolve-cart.action";

const available = "22222222-2222-4222-8222-222222222222";
const empty = "33333333-3333-4333-8333-333333333333";
const missing = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.resetAllMocks();
  lookup.mockResolvedValue([
    {
      id: available,
      sizeValue: 50,
      priceMinor: 120000,
      quantity: 2,
      perfume: {
        name: "Santal Veil",
        slug: "santal-veil",
        images: [{ path: "bottle.png", altText: "Santal bottle" }],
      },
    },
    {
      id: empty,
      sizeValue: 30,
      priceMinor: 90000,
      quantity: 0,
      perfume: { name: "Citrus Linen", slug: "citrus-linen", images: [] },
    },
  ]);
  imageUrl.mockResolvedValue("/bottle.png");
});

describe("cart resolution", () => {
  it("preserves item order and resolves current price, image, and availability", async () => {
    const lines = await resolveCart([
      { perfumeVariantId: "not-a-uuid", quantity: 2 },
      { perfumeVariantId: missing, quantity: 1 },
      { perfumeVariantId: empty, quantity: 1 },
      { perfumeVariantId: available, quantity: 2 },
    ]);
    expect(lookup).toHaveBeenCalledExactlyOnceWith([missing, empty, available]);
    expect(lines.map((line) => line.perfumeVariantId)).toEqual([
      "not-a-uuid",
      missing,
      empty,
      available,
    ]);
    expect(lines.map((line) => line.issue)).toEqual([
      "missing",
      "missing",
      "unavailable",
      undefined,
    ]);
    expect(lines[3]).toMatchObject({
      unitPriceMinor: 120000,
      lineAmountMinor: 240000,
      stock: 2,
      imageUrl: "/bottle.png",
    });
    expect(imageUrl).toHaveBeenCalledWith("bottle.png");
  });

  it("merges duplicate quantities and preserves over-stock items for correction", async () => {
    const lines = await resolveCart([
      { perfumeVariantId: available, quantity: 2 },
      { perfumeVariantId: available, quantity: 1 },
    ]);
    expect(lines).toMatchObject([
      { requestedQuantity: 3, isValid: false, issue: "over-quantity", lineAmountMinor: 0 },
    ]);
    expect(lookup).toHaveBeenCalledExactlyOnceWith([available]);
  });

  it("keeps legacy quantities above the order limit visible and invalid even when stock is sufficient", async () => {
    lookup.mockResolvedValueOnce([
      {
        id: available,
        sizeValue: 50,
        priceMinor: 120000,
        quantity: 200,
        perfume: { name: "Santal Veil", slug: "santal-veil", images: [] },
      },
    ]);
    expect(await resolveCart([{ perfumeVariantId: available, quantity: 100 }])).toMatchObject([
      {
        requestedQuantity: 100,
        stock: 200,
        isValid: false,
        issue: "over-quantity",
        lineAmountMinor: 0,
      },
    ]);
  });

  it.each([
    null,
    {},
    [null],
    [{ quantity: 1 }],
    [{ perfumeVariantId: available, quantity: 0 }],
    [{ perfumeVariantId: available, quantity: 1.5 }],
  ])("rejects malformed input before catalogue access: %j", async (input) => {
    await expect(resolveCart(input)).rejects.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });
});
