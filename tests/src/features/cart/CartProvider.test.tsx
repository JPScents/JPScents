import { describe, expect, it } from "vitest";

import { parseCartPayload } from "@/features/cart";

describe("cart persistence", () => {
  it("accepts only the current minimal cart version and safe unique quantities", () => {
    const variantId = "11111111-1111-4111-8111-111111111111";
    expect(parseCartPayload(JSON.stringify({ version: 1, items: [{ perfumeVariantId: variantId, quantity: 2 }] }))).toEqual({ version: 1, items: [{ perfumeVariantId: variantId, quantity: 2 }] });
    expect(parseCartPayload("not-json").items).toEqual([]);
    expect(parseCartPayload(JSON.stringify({ version: 2, items: [] })).items).toEqual([]);
    expect(parseCartPayload(JSON.stringify({ version: 1, items: [{ perfumeVariantId: variantId, quantity: 1 }, { perfumeVariantId: variantId, quantity: 2 }, { perfumeVariantId: "not-a-uuid", quantity: 1 }] }))).toEqual({ version: 1, items: [{ perfumeVariantId: variantId, quantity: 1 }] });
  });
});
