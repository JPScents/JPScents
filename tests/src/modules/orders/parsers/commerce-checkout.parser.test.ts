import { describe, expect, it } from "vitest";

import { parseCommercePurchase } from "@/modules/orders/server";
import { calculateCommerceTotals } from "@/modules/orders/utils/commerce-totals";
import { MAX_NAIRA_MINOR } from "@/shared/utils/naira-minor";

const perfumeVariantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const submissionKey = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const lines = [{ perfumeVariantId, quantity: 2 }];
const checkout = {
  customerName: " Ada ",
  email: " BUYER@example.test ",
  whatsappNumber: "+44 (7700) 900123",
  deliveryCountry: "NG",
  deliveryState: "Lagos",
  deliveryCity: "  Ikeja ",
  deliveryAddress: "10 Synthetic Street",
  deliveryApartment: "Flat 4",
  deliveryLandmark: "Test roundabout",
  deliveryPostcode: "100001",
};
const quote = {
  deliveryFeeMinor: 45000,
  unitPrices: [{ perfumeVariantId, unitPriceMinor: 12345 }],
};

describe("commerce checkout boundary", () => {
  it("accepts international contact details and a complete manual Nigerian address", () => {
    expect(parseCommercePurchase(lines, checkout, quote, submissionKey)).toEqual({
      input: {
        ...checkout,
        customerName: "Ada",
        email: "buyer@example.test",
        whatsappNumber: "447700900123",
        deliveryCity: "Ikeja",
        orderNote: undefined,
      },
      quote: {
        deliveryFeeMinor: 45000,
        lines: [{ perfumeVariantId, quantity: 2, unitPriceMinor: 12345 }],
      },
      submissionKey,
    });
  });

  it("returns field errors without truncating address or silently repairing an invalid contact", () => {
    const result = parseCommercePurchase(
      lines,
      {
        ...checkout,
        deliveryCountry: "GB",
        deliveryState: "Unsupported",
        email: "",
        whatsappNumber: "Call 07700900123",
        deliveryAddress: "x".repeat(241),
      },
      quote,
      submissionKey,
    );
    expect(result).toMatchObject({
      errors: {
        deliveryCountry: expect.any(String),
        deliveryState: expect.any(String),
        email: expect.any(String),
        whatsappNumber: expect.any(String),
        deliveryAddress: expect.any(String),
      },
    });
    expect(result).not.toHaveProperty("input");
  });

  it("rejects unsupported financial values and incomplete or duplicate price evidence", () => {
    for (const changed of [
      { ...quote, deliveryFeeMinor: -1 },
      { ...quote, deliveryFeeMinor: 12.5 },
      { ...quote, deliveryFeeMinor: MAX_NAIRA_MINOR + 1 },
      { ...quote, unitPrices: [] },
      { ...quote, unitPrices: [...quote.unitPrices, ...quote.unitPrices] },
      { ...quote, unitPrices: [{ perfumeVariantId: "different", unitPriceMinor: 12345 }] },
    ]) {
      expect(parseCommercePurchase(lines, checkout, changed, submissionKey)).toHaveProperty(
        "error",
      );
    }
  });
});

describe("payable NGN kobo totals", () => {
  const priced = [{ perfumeVariantId, quantity: 2, unitPriceMinor: 12_345 }];

  it("calculates exact subtotal, fee and payable total in integer kobo", () => {
    expect(calculateCommerceTotals(priced, 456)).toEqual({
      currency: "NGN",
      subtotalMinor: 24_690,
      deliveryFeeMinor: 456,
      totalMinor: 25_146,
    });
    expect(calculateCommerceTotals(priced, 0)).toMatchObject({ totalMinor: 24_690 });
  });

  it("rejects invalid, zero or overflowing payable totals at storage bounds", () => {
    expect(
      calculateCommerceTotals([{ ...priced[0], unitPriceMinor: MAX_NAIRA_MINOR }], 0),
    ).toBeNull();
    expect(calculateCommerceTotals(priced, MAX_NAIRA_MINOR)).toBeNull();
    expect(calculateCommerceTotals([{ ...priced[0], unitPriceMinor: 0 }], 0)).toBeNull();
    expect(calculateCommerceTotals([{ ...priced[0], quantity: 1.5 }], 100)).toBeNull();
  });
});
