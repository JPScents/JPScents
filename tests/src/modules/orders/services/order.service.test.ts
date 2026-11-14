import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transactionActive: false,
  getPerfumeImageUrl: vi.fn(),
  orderFindUnique: vi.fn(),
  orderFindMany: vi.fn(),
  orderCount: vi.fn(),
  orderCreate: vi.fn(),
  orderUpdate: vi.fn(),
  orderUpdateMany: vi.fn(),
  customerFindUnique: vi.fn(),
  customerCreate: vi.fn(),
  customerUpdate: vi.fn(),
  variantFindMany: vi.fn(),
  variantUpdateMany: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    order: {
      findUnique: mocks.orderFindUnique,
      findMany: mocks.orderFindMany,
      count: mocks.orderCount,
    },
    customer: {
      findUnique: mocks.customerFindUnique,
      create: mocks.customerCreate,
      update: mocks.customerUpdate,
    },
    $transaction: vi.fn(async (callback) => {
      mocks.transactionActive = true;
      try {
        return await callback({
          $queryRaw: vi.fn().mockResolvedValue([]),
          perfume: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
          order: {
            findUnique: mocks.orderFindUnique,
            create: mocks.orderCreate,
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
        });
      } finally {
        mocks.transactionActive = false;
      }
    }),
  },
}));
vi.mock("@/infrastructure/supabase/perfume-images", () => ({
  getPerfumeImageUrl: mocks.getPerfumeImageUrl,
}));

import {
  getOrderByReference,
  getOrdersAdminOverview,
  getOrderConfirmation,
  listOrders,
} from "@/modules/orders/server";
import { createOrder } from "@/modules/orders/services/order.service";
import {
  cancelOrderAndRestoreStock as cancelOrder,
  updateOrderStatus,
} from "@/modules/orders/repositories/order.repository";

const id = "11111111-1111-4111-8111-111111111111";
const checkout = {
  customerName: "Ada",
  whatsappNumber: "2348031234567",
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
  status: "AWAITING_PAYMENT",
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
  statusEvents: [
    {
      id: "event",
      orderId: "order",
      fromStatus: null,
      toStatus: "AWAITING_PAYMENT",
      createdAt: new Date(),
    },
  ],
};

const admin = { id: "admin", email: "admin@example.com" };

describe("orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPerfumeImageUrl.mockImplementation(async () => {
      expect(mocks.transactionActive).toBe(false);
      return "https://signed.example/bottle";
    });
    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.orderCount.mockResolvedValue(0);
    mocks.customerFindUnique.mockResolvedValue(null);
    mocks.customerCreate.mockResolvedValue(customer);
    mocks.variantFindMany.mockResolvedValue([
      {
        id,
        perfumeId: "perfume",
        priceMinor: 120000,
        quantity: 2,
        sizeValue: 50,
        sizeUnit: "ML",
        perfume: { name: "Quiet Fig" },
      },
    ]);
    mocks.variantUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.orderCreate.mockResolvedValue(order);
  });

  it("returns the committed duplicate if its final unit was consumed by a concurrent request", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(order);
    mocks.variantUpdateMany.mockResolvedValueOnce({ count: 0 });
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      order.submissionKey,
    );
    expect(result).toMatchObject({ duplicate: true, order: { reference: order.reference } });
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });

  it("creates a customer, conditionally decrements stock, and projects no storage path", async () => {
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
          status: "AWAITING_PAYMENT",
          items: {
            create: [
              {
                perfumeVariantId: id,
                quantity: 1,
                unitPriceMinor: 120000,
                perfumeNameSnapshot: "Quiet Fig",
                sizeValueSnapshot: 50,
                sizeUnitSnapshot: "ML",
              },
            ],
          },
          statusEvents: { create: { toStatus: "AWAITING_PAYMENT" } },
        }),
      }),
    );
    expect(result).toMatchObject({ order: { items: [{ sizeLabel: "50 mL" }] } });
    expect("order" in result ? result.order?.items[0] : undefined).not.toHaveProperty(
      "perfumeVariant",
    );
  });

  it("reuses a matching customer and rejects conflicting WhatsApp and email identities", async () => {
    mocks.customerFindUnique.mockResolvedValueOnce(customer);
    mocks.customerUpdate.mockResolvedValueOnce(customer);
    const result = await createOrder(
      [{ perfumeVariantId: id, quantity: 1 }],
      checkout,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(result).toMatchObject({
      duplicate: false,
      order: { reference: order.reference, status: "AWAITING_PAYMENT" },
    });
    expect(mocks.customerCreate).not.toHaveBeenCalled();
    expect(mocks.customerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "customer" } }),
    );
    expect(mocks.orderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: customer.id }) }),
    );

    mocks.orderCreate.mockClear();
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
    expect(mocks.orderCreate).not.toHaveBeenCalled();
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

  it("keeps confirmation data public and reserves customer details for admin reads", async () => {
    mocks.orderFindUnique.mockResolvedValue(order);

    const confirmation = await getOrderConfirmation("a".repeat(43));
    expect(confirmation).toMatchObject({ reference: "JP-ABC" });
    expect(confirmation).not.toHaveProperty("customerName");
    expect(confirmation).not.toHaveProperty("confirmationToken");
    expect(confirmation).not.toHaveProperty("submissionKey");
    const confirmationQuery = mocks.orderFindUnique.mock.calls.at(-1)?.[0];
    expect(confirmationQuery.select).not.toHaveProperty("customer");
    expect(confirmationQuery.select).not.toHaveProperty("statusEvents");
    expect(confirmationQuery.select).not.toHaveProperty("deliveryAddressSnapshot");

    const adminOrder = await getOrderByReference(admin, "JP-ABC");
    expect(adminOrder).toMatchObject({ customerName: "Ada", whatsappNumber: "2348031234567" });
    expect(adminOrder?.events[0]).not.toHaveProperty("orderId");
    const adminQuery = mocks.orderFindUnique.mock.calls.at(-1)?.[0];
    expect(adminQuery.include).toMatchObject({ customer: true, statusEvents: expect.any(Object) });
  });

  it("signs a shared product image once for multiple order lines", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...order, items: [order.items[0], order.items[0]] });

    const confirmation = await getOrderConfirmation("a".repeat(43));
    expect(mocks.getPerfumeImageUrl).toHaveBeenCalledExactlyOnceWith("private/path.jpg");
    expect(confirmation?.items.map((item) => item.imageUrl)).toEqual([
      "https://signed.example/bottle",
      "https://signed.example/bottle",
    ]);
  });

  it("rejects unauthorised admin reads before accessing order data", async () => {
    await expect(listOrders(null)).rejects.toThrow("You are not authorized.");
    await expect(getOrderByReference(null, "JP-ABC")).rejects.toThrow("You are not authorized.");
    await expect(getOrdersAdminOverview(null)).rejects.toThrow("You are not authorized.");
    expect(mocks.orderFindMany).not.toHaveBeenCalled();
    expect(mocks.orderFindUnique).not.toHaveBeenCalled();
    expect(mocks.orderCount).not.toHaveBeenCalled();

    mocks.orderFindUnique.mockResolvedValue(order);
    await expect(getOrderConfirmation("a".repeat(43))).resolves.toMatchObject({
      reference: "JP-ABC",
    });
  });

  it("filters newest-first order reads and prevents generic status changes from bypassing cancellation", async () => {
    mocks.orderFindMany.mockResolvedValue([{ ...order, _count: { items: 1 } }]);
    await expect(
      listOrders(admin, { query: "Ada", status: "AWAITING_PAYMENT" }),
    ).resolves.toMatchObject([{ reference: "JP-ABC", itemCount: 1 }]);
    mocks.orderFindUnique.mockResolvedValueOnce({ id: "order", status: "CANCELLED" });
    await expect(updateOrderStatus("JP-ABC", "PAID")).resolves.toEqual({
      error: "Cancelled orders cannot be reopened.",
    });
    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("records persisted status changes, including delivered", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce({ id: "order", status: "PAID" });

    await expect(updateOrderStatus("JP-ABC", "DELIVERED")).resolves.toEqual({ ok: true });
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order", status: "PAID", stockRestoredAt: null },
      data: { status: "DELIVERED" },
    });
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: { orderId: "order", fromStatus: "PAID", toStatus: "DELIVERED" },
    });
  });

  it("does not overwrite a concurrent cancellation or append a misleading status event", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce({ id: "order", status: "PAID" });
    mocks.orderUpdateMany.mockResolvedValueOnce({ count: 0 });
    await expect(updateOrderStatus("JP-ABC", "DELIVERED")).resolves.toMatchObject({
      error: expect.stringContaining("updated elsewhere"),
    });
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });
  it("shows commerce totals and separate lifecycle alongside legacy orders on the overview", async () => {
    mocks.orderFindMany.mockResolvedValue([
      {
        ...order,
        reference: "JP-COMMERCE",
        kind: "COMMERCE",
        commerceStatus: "PAID",
        fulfilmentStatus: "PROCESSING",
        totalMinor: 145_000,
      },
      { ...order, kind: "LEGACY_MANUAL", commerceStatus: null, totalMinor: null },
    ]);
    await expect(getOrdersAdminOverview(admin)).resolves.toMatchObject({
      recentOrders: [
        {
          reference: "JP-COMMERCE",
          status: "PAID",
          fulfilmentStatus: "PROCESSING",
          amountMinor: 145_000,
        },
        { reference: "JP-ABC", status: "AWAITING_PAYMENT", amountMinor: 120_000 },
      ],
    });
  });

  it("cancels once, restores grouped stock, and records a status event", async () => {
    mocks.orderFindUnique.mockResolvedValueOnce({
      id: "order",
      status: "AWAITING_PAYMENT",
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
      expect.objectContaining({
        where: { id: "order", status: "AWAITING_PAYMENT", stockRestoredAt: null },
      }),
    );
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: { orderId: "order", fromStatus: "AWAITING_PAYMENT", toStatus: "CANCELLED" },
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
