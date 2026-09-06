import { describe, expect, it } from "vitest";

import { parseCheckoutInput } from "@/features/orders/parsers/checkout.parser";

const checkout = {
  customerName: "Ada",
  whatsappNumber: "0803 123 4567",
  deliveryState: "Lagos",
  deliveryCity: "Ikeja",
  deliveryAddress: "1 Example Street",
};

describe("checkout input", () => {
  it("normalizes contact details and resolves custom delivery cities", () => {
    expect(parseCheckoutInput({ ...checkout, email: " ADA@EXAMPLE.COM " }).input).toMatchObject({
      whatsappNumber: "2348031234567",
      email: "ada@example.com",
    });
    expect(
      parseCheckoutInput({ ...checkout, deliveryCity: "OTHER", customCity: "Victoria Island" })
        .input,
    ).toMatchObject({
      deliveryCity: "Victoria Island",
      deliveryState: "Lagos",
    });
    expect(
      parseCheckoutInput({ ...checkout, deliveryCity: "OTHER", customCity: "" }).errors.customCity,
    ).toBeDefined();
  });

  it.each(["Not a state", "toString", "constructor", "__proto__"])(
    "rejects an unknown state without throwing: %s",
    (deliveryState) => {
      const result = parseCheckoutInput({ ...checkout, deliveryState });
      expect(result.input).toBeUndefined();
      expect(result.errors.deliveryState).toBe("Choose your delivery state.");
    },
  );
});
