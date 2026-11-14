import { beforeEach, describe, expect, it, vi } from "vitest";

const { findAttempt, reconcile, readStatusCookie } = vi.hoisted(() => ({
  findAttempt: vi.fn(),
  reconcile: vi.fn(),
  readStatusCookie: vi.fn(),
}));

vi.mock("@/modules/orders/server", () => ({
  findStatusOrderPayment: findAttempt,
  reconcileCommercePayment: reconcile,
}));
vi.mock("@/app/(public)/checkout/_server/commerce-session", () => ({
  readCommerceStatusCookie: readStatusCookie,
}));

import { GET } from "@/app/(public)/checkout/paystack-return/route";

const reference = "jpscents-9d23edd2-b993-4ab5-a5ed-99ad4568009b";
const callback = new Request(
  `https://example.test/checkout/paystack-return?reference=${reference}`,
);

beforeEach(() => {
  vi.resetAllMocks();
  readStatusCookie.mockResolvedValue("synthetic-active-order-cookie");
});

describe("Paystack return", () => {
  it("shows unavailable when an older return does not match the current guest order", async () => {
    findAttempt.mockResolvedValue(null);

    const response = await GET(callback);

    expect(findAttempt).toHaveBeenCalledWith("synthetic-active-order-cookie", reference);
    expect(reconcile).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/checkout/status?link=unavailable");
  });

  it("reconciles a matching pending attempt before redirecting to its status", async () => {
    findAttempt.mockResolvedValue({
      providerReference: reference,
      status: "PENDING",
      environment: "TEST",
    });

    const response = await GET(callback);

    expect(reconcile).toHaveBeenCalledWith(reference, "TEST");
    expect(response.headers.get("Location")).toBe("/checkout/status");
  });
});
