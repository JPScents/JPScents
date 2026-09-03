import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderFindMany: vi.fn(),
  orderCreate: vi.fn(),
  orderFindUniqueOrThrow: vi.fn(),
  orderUpdate: vi.fn(),
  orderUpdateMany: vi.fn(),
  customerFindUnique: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
  variantFindMany: vi.fn(),
  variantUpdateMany: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique, findMany: mocks.orderFindMany },
    customer: {
      findUnique: mocks.customerFindUnique,
      create: mocks.customerCreate,
      update: mocks.customerUpdate,
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        order: {
          findUnique: mocks.orderFindUnique,
          create: mocks.orderCreate,
          findUniqueOrThrow: mocks.orderFindUniqueOrThrow,
          update: mocks.orderUpdate,
          updateMany: mocks.orderUpdateMany,
        },
        customer: {
          findUnique: mocks.customerFindUnique,
          create: mocks.customerCreate,
          update: mocks.customerUpdate,
        },
        orderStatusEvent: { create: mocks.eventCreate },
        perfumeVariant: {
          findMany: mocks.variantFindMany,
          updateMany: mocks.variantUpdateMany,
        },
      }),
    ),
  },
}));
vi.mock("@/lib/supabase/storage", () => ({
  getPerfumeImageUrl: vi.fn(async () => "https://signed.example/bottle"),
}));

import {
  cancelOrder,
  createOrder,
  getOrderConfirmation,
  listOrders,
  parseCheckoutInput,
  updateOrderStatus,
} from "@/features/orders/orders";
import { nigeriaStates } from "@/features/orders/constants/nigeria-locations";
import { normalizeWhatsappNumber } from "@/lib/whatsapp";

const id = "11111111-1111-4111-8111-111111111111";
const checkout = {
  customerName: "Ada",
  whatsappNumber: "0803 123 4567",
  deliveryState: "Lagos",
  deliveryCity: "Ikeja",
  deliveryAddress: "1 Example Street",
};
const customer = {
  id: "customer",
  name: "Ada",
  whatsappNumber: "2348031234567",
  email: null,
  deliveryState: "Lagos",
  deliveryCity: "Ikeja",
  deliveryAddress: "1 Example Street",
};
const order = {
  id: "order",
  reference: "JP-ABC",
  confirmationToken: "a".repeat(43),
  submissionKey: "22222222-2222-4222-8222-222222222222",
  orderNote: null,
  subtotalMinor: 120000,
  status: "NEW",
  stockRestoredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer,
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
    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.customerFindUnique.mockResolvedValue(null);
    mocks.customerCreate.mockResolvedValue(customer);
    mocks.variantFindMany.mockResolvedValue([
      { id, priceMinor: 120000, sizeValue: 50, sizeUnit: "ML" },
    ]);
    mocks.variantUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderCreate.mockResolvedValue({ id: "order" });
    mocks.orderFindUniqueOrThrow.mockResolvedValue(order);
  });

  it("validates Nigerian locations, custom cities, and normalized WhatsApp numbers", () => {
    expect(nigeriaStates).toHaveLength(37);
    expect(nigeriaStates).toContain("FCT");
    expect(normalizeWhatsappNumber("0803 123 4567")).toBe("2348031234567");
    expect(normalizeWhatsappNumber("+44 7700 900123")).toBe("447700900123");
    expect(
      parseCheckoutInput({ ...checkout, deliveryCity: "OTHER", customCity: "" }).errors.customCity,
    ).toBeDefined();
    expect(
      parseCheckoutInput({ ...checkout, deliveryCity: "OTHER", customCity: "Victoria Island" })
        .input,
    ).toMatchObject({ deliveryCity: "Victoria Island", deliveryState: "Lagos" });
    expect(
      parseCheckoutInput({ ...checkout, deliveryState: "Not a state" }).errors.deliveryState,
    ).toBeDefined();
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
    expect(mocks.variantFindMany).not.toHaveBeenCalled();
  });

  it("creates a customer, atomically decrements stock, and projects no storage path", async () => {
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(mocks.customerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsappNumber: "2348031234567" }),
      }),
    );
    expect(mocks.variantUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ quantity: { gte: 1 }, perfume: { status: "PUBLISHED" } }),
      }),
    );
    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "customer",
          subtotalMinor: 120000,
          items: { create: [{ perfumeVariantId: id, quantity: 1, unitPriceMinor: 120000 }] },
        }),
      }),
    );
    expect(result).toMatchObject({ order: { items: [{ sizeLabel: "50 mL" }] } });
  });

  it("reuses a matching customer and rejects conflicting WhatsApp and email identities", async () => {
    mocks.customerFindUnique.mockResolvedValueOnce(customer).mockResolvedValueOnce(null);
    await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    expect(mocks.customerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "customer" } }),
    );

    mocks.customerFindUnique.mockReset();
    mocks.customerFindUnique.mockResolvedValueOnce(customer).mockResolvedValueOnce({
      ...customer,
      id: "other-customer",
      email: "ada@example.com",
    });
    await expect(
      createOrder(
        [{ perfumeVariantId: id, quantity: 1 }],
        { ...checkout, email: "ada@example.com" },
        "33333333-3333-4333-8333-333333333333",
      ),
    ).resolves.toMatchObject({ error: expect.stringContaining("different customers") });
  });

  it("returns an existing idempotent order without stock or customer mutation", async () => {
    mocks.orderFindUnique.mockResolvedValue(order);
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(result).toMatchObject({ duplicate: true, order: { reference: "JP-ABC" } });
    expect(mocks.variantUpdateMany).not.toHaveBeenCalled();
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    await expect(getOrderConfirmation("a".repeat(43))).resolves.toMatchObject({
      reference: "JP-ABC",
    });
  });

  it("filters newest-first order reads and prevents generic status changes from bypassing cancellation", async () => {
    mocks.orderFindMany.mockResolvedValue([{ ...order, _count: { items: 1 } }]);
    await expect(listOrders({ query: "Ada", status: "NEW" })).resolves.toMatchObject([
      { reference: "JP-ABC", itemCount: 1 },
    ]);
    await expect(updateOrderStatus("JP-ABC", "CANCELLED")).resolves.toEqual({
      error: "Use the cancellation action to cancel an order.",
    });
    mocks.orderFindUnique.mockResolvedValueOnce({ id: "order", status: "CANCELLED" });
    await expect(updateOrderStatus("JP-ABC", "NEW")).resolves.toEqual({
      error: "Cancelled orders cannot be reopened.",
    });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("cancels once, restores grouped stock, and records a status event", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce({
      id: "order",
      status: "NEW",
      stockRestoredAt: null,
      items: [
        { perfumeVariantId: id, quantity: 1 },
        { perfumeVariantId: id, quantity: 2 },
      ],
    });
    await expect(cancelOrder("JP-ABC")).resolves.toEqual({ ok: true });
    expect(mocks.variantUpdateMany).toHaveBeenCalledWith({
      where: { id },
      data: { quantity: { increment: 3 } },
    });
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order", status: "NEW", stockRestoredAt: null } }),
    );
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: { orderId: "order", fromStatus: "NEW", toStatus: "CANCELLED" },
    });
  });

  it("does not restore stock twice for a repeat cancellation", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce({
      id: "order",
      status: "CANCELLED",
      stockRestoredAt: new Date(),
      items: [],
    });
    await expect(cancelOrder("JP-ABC")).resolves.toEqual({ unchanged: true });
    expect(mocks.variantUpdateMany).not.toHaveBeenCalled();
  });
});
