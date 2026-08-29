import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  listOrders: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: vi
        .fn()
        .mockResolvedValue({ data: { signedUrl: "https://signed.example/bottle" }, error: null }),
    })),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.findUnique, findMany: mocks.listOrders },
    $transaction: vi.fn(async (callback) =>
      callback({
        order: {
          findUnique: mocks.findUnique,
          create: mocks.create,
          findUniqueOrThrow: mocks.findUniqueOrThrow,
          update: mocks.update,
        },
        perfumeVariant: { findMany: mocks.findMany, updateMany: mocks.updateMany },
      }),
    ),
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ storage: mocks.storage })),
}));

import {
  createOrder,
  getOrderConfirmation,
  listOrders,
  normalizeWhatsappNumber,
  parseCheckoutInput,
  updateOrderStatus,
} from "@/features/orders/orders";

const id = "11111111-1111-4111-8111-111111111111";
const checkout = {
  customerName: "Ada",
  whatsappNumber: "0803 123 4567",
  deliveryArea: "Ikeja",
  deliveryAddress: "1 Example Street",
};
const order = {
  id: "order",
  reference: "JP-ABC",
  confirmationToken: "a".repeat(43),
  submissionKey: "22222222-2222-4222-8222-222222222222",
  customerName: "Ada",
  whatsappNumber: "2348031234567",
  email: null,
  deliveryArea: "Ikeja",
  deliveryAddress: "1 Example Street",
  orderNote: null,
  subtotalMinor: 120000,
  status: "NEW",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      quantity: 1,
      unitPriceMinor: 120000,
      perfumeVariant: {
        sizeValue: 50,
        sizeUnit: "ML",
        perfume: { name: "Quiet Fig", slug: "quiet-fig", images: [{ path: "private/path.jpg" }] },
      },
    },
  ],
  statusEvents: [{ id: "event", fromStatus: null, toStatus: "NEW", createdAt: new Date() }],
};

describe("orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([{ id, priceMinor: 120000, sizeValue: 50, sizeUnit: "ML" }]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.create.mockResolvedValue({ id: "order" });
    mocks.findUniqueOrThrow.mockResolvedValue(order);
  });

  it("validates checkout fields and normalizes Nigerian and international WhatsApp numbers", () => {
    expect(normalizeWhatsappNumber("0803 123 4567")).toBe("2348031234567");
    expect(normalizeWhatsappNumber("+44 7700 900123")).toBe("447700900123");
    expect(normalizeWhatsappNumber("123")).toBe("");
    expect(parseCheckoutInput({ ...checkout, email: "invalid" }).errors.email).toBeDefined();
  });

  it("rejects malformed and merged cart quantities before writes", async () => {
    await expect(
      createOrder(
        [
          { perfumeVariantId: id, quantity: 60 },
          { perfumeVariantId: id, quantity: 60 },
        ],
        checkout,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toMatchObject({ error: expect.stringContaining("cart") });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("uses current authoritative price, conditionally decrements published stock, and projects no storage path", async () => {
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ quantity: { gte: 1 }, perfume: { status: "PUBLISHED" } }),
      }),
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalMinor: 120000,
          items: { create: [{ perfumeVariantId: id, quantity: 1, unitPriceMinor: 120000 }] },
        }),
      }),
    );
    expect(mocks.create.mock.calls[0][0].data.reference).toMatch(/^JP-[23456789A-HJ-NP-Z]{7}$/);
    expect(result).toMatchObject({
      order: { items: [{ sizeLabel: "50 mL", imageUrl: "https://signed.example/bottle" }] },
    });
    expect(JSON.stringify(result)).not.toContain("private/path.jpg");
  });

  it("returns an existing idempotent order without stock mutation and protects confirmation by token", async () => {
    mocks.findUnique.mockResolvedValue(order);
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(result).toMatchObject({ duplicate: true, order: { reference: "JP-ABC" } });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    mocks.findUnique.mockResolvedValueOnce(order);
    await expect(getOrderConfirmation("short")).resolves.toBeNull();
    await expect(getOrderConfirmation("a".repeat(43))).resolves.toMatchObject({
      reference: "JP-ABC",
    });
  });

  it("rolls back a stock conflict and keeps database failures generic", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      createOrder(
        [{ perfumeVariantId: id, quantity: 1 }],
        checkout,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toMatchObject({
      error: "One or more perfumes are no longer available in the requested quantity.",
    });
    mocks.updateMany.mockRejectedValueOnce(new Error("database credential detail"));
    await expect(
      createOrder(
        [{ perfumeVariantId: id, quantity: 1 }],
        checkout,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toMatchObject({ error: "We could not create your order. Please try again." });
  });

  it("filters newest-first order reads and writes a status event only when the status changes", async () => {
    mocks.listOrders.mockResolvedValue([{ ...order, _count: { items: 1 } }]);
    await expect(listOrders({ query: "Ada", status: "NEW" })).resolves.toMatchObject([
      { reference: "JP-ABC", itemCount: 1 },
    ]);
    expect(mocks.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        where: expect.objectContaining({ status: "NEW" }),
      }),
    );
    mocks.findUnique.mockResolvedValueOnce({ id: "order", status: "NEW" });
    await expect(updateOrderStatus("JP-ABC", "NEW")).resolves.toEqual({ unchanged: true });
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.findUnique.mockResolvedValueOnce({ id: "order", status: "NEW" });
    await expect(updateOrderStatus("JP-ABC", "CONFIRMED")).resolves.toEqual({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CONFIRMED",
          statusEvents: { create: { fromStatus: "NEW", toStatus: "CONFIRMED" } },
        }),
      }),
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
