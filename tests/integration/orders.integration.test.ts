import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/infrastructure/database/generated/client";
import type { CheckoutInput } from "@/modules/orders/types";

import { APPLICATION_NAME, startDisposablePostgres } from "./disposable-postgres";

let cluster: ReturnType<typeof startDisposablePostgres> | undefined;
let db: PrismaClient;
let applicationClient: PrismaClient | undefined;
let orders: typeof import("@/modules/orders/repositories/order.repository");
let orderMapper: typeof import("@/modules/orders/mappers/order.mapper");
let variants: typeof import("@/modules/catalogue/repositories/variant.repository");
let catalogue: typeof import("@/modules/catalogue/server");
let fixtureNumber = 0;

beforeAll(async () => {
  cluster = startDisposablePostgres();
  vi.stubEnv("DATABASE_URL", cluster.connectionString);
  const observerUrl = new URL(cluster.connectionString);
  observerUrl.searchParams.set("application_name", "jpscents_integration_observer");
  db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: observerUrl.toString(), max: 3 }),
  });
  // Load application modules only after setting the private connection URL.
  const { prisma } = await import("@/infrastructure/database/prisma");
  applicationClient = prisma;
  expect(
    await prisma.$queryRaw`
      SELECT inet_server_addr() IS NULL AS "onSocket",
             current_setting('unix_socket_directories') AS directory
    `,
  ).toEqual([{ onSocket: true, directory: cluster.directory }]);
  [orders, orderMapper, variants, catalogue] = await Promise.all([
    import("@/modules/orders/repositories/order.repository"),
    import("@/modules/orders/mappers/order.mapper"),
    import("@/modules/catalogue/repositories/variant.repository"),
    import("@/modules/catalogue/server"),
  ]);
});

afterAll(async () => {
  try {
    const results = await Promise.allSettled([db?.$disconnect(), applicationClient?.$disconnect()]);
    for (const result of results) {
      if (result.status === "rejected") {
        throw result.reason;
      }
    }
  } finally {
    vi.unstubAllEnvs();
    cluster?.stop();
  }
});

async function checkoutFixture(quantity: number) {
  const namespace = randomUUID();
  const perfume = await db.perfume.create({
    data: {
      name: "Original Test Perfume",
      slug: `test-${namespace}`,
      scentCue: "Citrus",
      description: "Synthetic integration fixture",
      status: "PUBLISHED",
      scentCharacters: ["FRESH"],
      occasions: ["EVERYDAY"],
      timesOfDay: ["DAY"],
      variants: { create: { sizeValue: "50", sizeUnit: "ML", priceMinor: 120_000, quantity } },
    },
    include: { variants: true },
  });
  const [variant] = perfume.variants;
  const input: CheckoutInput = {
    customerName: "Original Test Customer",
    whatsappNumber: `234800${String(++fixtureNumber).padStart(7, "0")}`,
    email: `${namespace}@example.invalid`,
    deliveryState: "Lagos",
    deliveryCity: "Ikeja",
    deliveryAddress: "Original Test Address",
  };
  return {
    perfume,
    variant,
    input,
    submissionKey: namespace,
    lines: [{ perfumeVariantId: variant.id, quantity: 1 }],
  };
}

async function waitForOrderLock() {
  await vi.waitFor(
    async () => {
      const activity = await db.$queryRaw<{ waiting: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM pg_stat_activity
          WHERE application_name = ${APPLICATION_NAME} AND wait_event_type = 'Lock'
        ) AS waiting
      `;
      expect(activity).toEqual([{ waiting: true }]);
    },
    { timeout: 5_000, interval: 50 },
  );
}

describe("PostgreSQL current", () => {
  it("commits stock, customer, order, line and event once when checkout is replayed", async () => {
    const { variant, input, lines, submissionKey } = await checkoutFixture(2);
    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    expect(placed).toMatchObject({ duplicate: false, order: { status: "AWAITING_PAYMENT" } });
    assertOrder(placed);
    const replay = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    expect(replay).toMatchObject({
      duplicate: true,
      order: { id: placed.order.id, reference: placed.order.reference },
    });

    const saved = await db.order.findUniqueOrThrow({
      where: { submissionKey },
      include: { customer: true, items: true, statusEvents: true },
    });
    expect(saved).toMatchObject({
      id: placed.order.id,
      subtotalMinor: 120_000,
      customer: { name: input.customerName, whatsappNumber: input.whatsappNumber },
      items: [{ perfumeVariantId: variant.id, unitPriceMinor: 120_000, quantity: 1 }],
      statusEvents: [{ toStatus: "AWAITING_PAYMENT" }],
    });
    expect(await db.customer.count({ where: { whatsappNumber: input.whatsappNumber } })).toBe(1);
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 1,
    });
  });

  it("rolls back stock and customer when PostgreSQL rejects the final order insert", async () => {
    const { variant, input, lines, submissionKey } = await checkoutFixture(2);
    // Fault injection at the real write boundary, after the stock and customer writes.
    await db.$executeRaw`
      ALTER TABLE "Order" ADD CONSTRAINT "integration_reject_order"
      CHECK ("orderNote" IS DISTINCT FROM 'reject integration order')
    `;
    try {
      await expect(
        orders.createOrderWithStockDeduction(
          lines,
          { ...input, orderNote: "reject integration order" },
          submissionKey,
        ),
      ).rejects.toThrow(/integration_reject_order/);
    } finally {
      await db.$executeRaw`ALTER TABLE "Order" DROP CONSTRAINT "integration_reject_order"`;
    }

    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 2,
    });
    expect(await db.customer.count({ where: { whatsappNumber: input.whatsappNumber } })).toBe(0);
    expect(await db.order.count({ where: { submissionKey } })).toBe(0);
  });

  it("rechecks final-unit stock after waiting for a competing database writer", async () => {
    const { variant, input, lines, submissionKey } = await checkoutFixture(1);
    const { checkout } = await db.$transaction(
      async (tx) => {
        await tx.perfumeVariant.update({
          where: { id: variant.id },
          data: { quantity: { decrement: 1 } },
        });
        const checkout = orders.createOrderWithStockDeduction(lines, input, submissionKey);
        // Retain the result for assertion after commit, even if checkout rejects early.
        void checkout.catch(() => {});
        await waitForOrderLock();
        return { checkout };
      },
      { timeout: 10_000 },
    );

    await expect(checkout).resolves.toEqual({
      error: "One or more perfumes are no longer available in the requested quantity.",
    });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 0,
    });
    expect(await db.customer.count({ where: { whatsappNumber: input.whatsappNumber } })).toBe(0);
    expect(await db.order.count({ where: { submissionKey } })).toBe(0);
  });

  it("restores stock once on cancellation and rejects reopening the order", async () => {
    const { variant, input, lines, submissionKey } = await checkoutFixture(3);
    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    assertOrder(placed);
    const { id, reference } = placed.order;

    expect(await orders.cancelOrderAndRestoreStock(reference)).toEqual({ ok: true });
    expect(await orders.cancelOrderAndRestoreStock(reference)).toEqual({ unchanged: true });
    expect(await orders.updateOrderStatus(reference, "PAID")).toEqual({
      error: "Cancelled orders cannot be reopened.",
    });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 3,
    });
    const saved = await db.order.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({ status: "CANCELLED", stockRestoredAt: expect.any(Date) });
    const history = await db.orderStatusEvent.findMany({ where: { orderId: id } });
    expect(history).toHaveLength(2);
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromStatus: null, toStatus: "AWAITING_PAYMENT" }),
        expect.objectContaining({ fromStatus: "AWAITING_PAYMENT", toStatus: "CANCELLED" }),
      ]),
    );
  });

  it("denies anonymous app-table reads and restricts catalogue object inserts to app_metadata admins", async () => {
    const upload = (claims: object) =>
      db.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE authenticated`;
        await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
        return tx.$executeRaw`
          INSERT INTO storage.objects (bucket_id, name)
          VALUES ('perfume-images', 'perfumes/integration.jpg')
        `;
      });

    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE anon`;
        return tx.$queryRaw`SELECT id FROM "Order"`;
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(upload({ user_metadata: { role: "admin" } })).rejects.toThrow(
      /row-level security/,
    );
    await expect(upload({ app_metadata: { role: "admin" } })).resolves.toBe(1);
    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL ROLE anon`;
        return tx.$queryRaw`SELECT name FROM storage.objects WHERE bucket_id = 'perfume-images'`;
      }),
    ).resolves.toEqual([{ name: "perfumes/integration.jpg" }]);
    expect(
      await db.$queryRaw`SELECT public FROM storage.buckets WHERE id = 'perfume-images'`,
    ).toEqual([{ public: false }]);
  });
});

describe("PostgreSQL approved acceptance", () => {
  it("D2 commits an eligible final-unit checkout and clears bestseller placement", async () => {
    const { perfume, variant, input, lines, submissionKey } = await checkoutFixture(1);
    await db.perfume.update({ where: { id: perfume.id }, data: { isBestseller: true } });

    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    assertOrder(placed);
    expect(placed).toMatchObject({ duplicate: false, order: { status: "AWAITING_PAYMENT" } });
    expect(await db.perfume.findUniqueOrThrow({ where: { id: perfume.id } })).toMatchObject({
      isBestseller: false,
    });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 0,
    });
    expect(await db.order.findUniqueOrThrow({ where: { submissionKey } })).toMatchObject({
      id: placed.order.id,
    });
    expect(await db.orderStatusEvent.count({ where: { orderId: placed.order.id } })).toBe(1);
    await expect(
      orders.createOrderWithStockDeduction(lines, input, submissionKey),
    ).resolves.toMatchObject({
      duplicate: true,
      order: { id: placed.order.id },
    });
    await expect(orders.cancelOrderAndRestoreStock(placed.order.reference)).resolves.toEqual({
      ok: true,
    });
    await expect(orders.cancelOrderAndRestoreStock(placed.order.reference)).resolves.toEqual({
      unchanged: true,
    });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 1,
    });
    expect(await db.perfume.findUniqueOrThrow({ where: { id: perfume.id } })).toMatchObject({
      isBestseller: false,
    });
  });

  it("D2 rolls back the final-unit debit and bestseller clearance if the order write fails", async () => {
    const { perfume, variant, input, lines, submissionKey } = await checkoutFixture(1);
    await db.perfume.update({ where: { id: perfume.id }, data: { isBestseller: true } });
    await db.$executeRaw`ALTER TABLE "Order" ADD CONSTRAINT "reject_bestseller_fixture" CHECK ("orderNote" IS DISTINCT FROM 'reject final unit')`;
    try {
      await expect(
        orders.createOrderWithStockDeduction(
          lines,
          { ...input, orderNote: "reject final unit" },
          submissionKey,
        ),
      ).rejects.toThrow();
    } finally {
      await db.$executeRaw`ALTER TABLE "Order" DROP CONSTRAINT "reject_bestseller_fixture"`;
    }
    expect(await db.perfume.findUniqueOrThrow({ where: { id: perfume.id } })).toMatchObject({
      isBestseller: true,
    });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 1,
    });
    expect(await db.order.count({ where: { submissionKey } })).toBe(0);
    await db.perfume.update({ where: { id: perfume.id }, data: { isBestseller: false } });
  });

  it("D2 serialises sales of different variants of the same bestseller", async () => {
    const { perfume, input, lines } = await checkoutFixture(1);
    const second = await db.perfumeVariant.create({
      data: {
        perfumeId: perfume.id,
        sizeValue: "100",
        sizeUnit: "ML",
        priceMinor: 200_000,
        quantity: 1,
      },
    });
    await db.perfume.update({ where: { id: perfume.id }, data: { isBestseller: true } });

    const { checkout } = await db.$transaction(
      async (tx) => {
        await expect(catalogue.deductStockForOrder(tx, lines)).resolves.toHaveProperty("variants");
        const checkout = orders.createOrderWithStockDeduction(
          [{ perfumeVariantId: second.id, quantity: 1 }],
          input,
          randomUUID(),
        );
        void checkout.catch(() => {});
        await waitForOrderLock();
        return { checkout };
      },
      { timeout: 10_000 },
    );
    const large = await checkout;
    assertOrder(large);
    expect(large.order.subtotalMinor).toBe(200_000);
    expect(await db.perfume.findUniqueOrThrow({ where: { id: perfume.id } })).toMatchObject({
      isBestseller: false,
    });
    expect(await db.perfumeVariant.count({ where: { perfumeId: perfume.id, quantity: 0 } })).toBe(
      2,
    );
  });

  it("D3 retains order-time contact, fulfilment and item facts after source rows change", async () => {
    const { perfume, variant, input, lines, submissionKey } = await checkoutFixture(2);
    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    assertOrder(placed);

    await db.customer.update({
      where: { whatsappNumber: input.whatsappNumber },
      data: {
        name: "Updated Test Customer",
        whatsappNumber: "2348999999999",
        email: "updated@example.invalid",
        deliveryState: "Abuja",
        deliveryCity: "Garki",
        deliveryAddress: "Updated Test Address",
      },
    });
    await db.perfume.update({ where: { id: perfume.id }, data: { name: "Renamed Test Perfume" } });
    await db.perfumeVariant.update({
      where: { id: variant.id },
      data: { sizeValue: "100", priceMinor: 250_000 },
    });
    const saved = await orders.findAdminOrder(placed.order.reference);
    expect(saved).not.toBeNull();
    if (!saved) {
      throw new Error("Placed order could not be read back.");
    }

    const expectedItems = [
      { name: perfume.name, sizeLabel: "50 mL", quantity: 1, unitPriceMinor: 120_000 },
    ];
    const publicOrder = orderMapper.toPublicOrder(saved, new Map());
    const confirmation = await orders.findOrderConfirmation(placed.order.confirmationToken);
    expect(confirmation).not.toBeNull();
    expect(confirmation).not.toHaveProperty("customerNameSnapshot");
    expect(confirmation).not.toHaveProperty("deliveryAddressSnapshot");
    expect(confirmation).not.toHaveProperty("confirmationToken");
    expect(publicOrder).not.toHaveProperty("deliveryAddress");
    expect(publicOrder).not.toHaveProperty("whatsappNumber");
    expect(publicOrder).not.toHaveProperty("email");
    expect(orderMapper.toAdminOrder(saved, new Map())).toMatchObject({
      legacy: false,
      customerName: input.customerName,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      deliveryState: input.deliveryState,
      deliveryCity: input.deliveryCity,
      deliveryAddress: input.deliveryAddress,
      items: expectedItems,
    });
    expect(publicOrder).toMatchObject({ usesCurrentCatalogueDetails: false, items: expectedItems });
  });

  it("D3 identifies legacy orders and uses current details only when original facts are absent", async () => {
    const { variant, input, submissionKey } = await checkoutFixture(2);
    const customer = await db.customer.create({
      data: {
        name: input.customerName,
        whatsappNumber: input.whatsappNumber,
        deliveryState: input.deliveryState,
        deliveryCity: input.deliveryCity,
        deliveryAddress: input.deliveryAddress,
      },
    });
    const legacy = await db.order.create({
      data: {
        customerId: customer.id,
        reference: "JP-LEGACY",
        confirmationToken: randomUUID(),
        submissionKey,
        subtotalMinor: 120_000,
        items: {
          create: { perfumeVariantId: variant.id, quantity: 1, unitPriceMinor: 120_000 },
        },
      },
    });
    const saved = await orders.findAdminOrder(legacy.reference);
    if (!saved) {
      throw new Error("Legacy order was not found.");
    }
    const expectedItems = [{ name: "Original Test Perfume", sizeLabel: "50 mL" }];
    expect(orderMapper.toAdminOrder(saved, new Map())).toMatchObject({
      legacy: true,
      customerName: input.customerName,
      deliveryAddress: input.deliveryAddress,
      items: expectedItems,
    });

    const confirmation = await orders.findOrderConfirmation(legacy.confirmationToken);
    if (!confirmation) {
      throw new Error("Legacy order confirmation was not found.");
    }
    const publicOrder = orderMapper.toPublicOrder(confirmation, new Map());
    expect(publicOrder).toMatchObject({
      reference: legacy.reference,
      usesCurrentCatalogueDetails: true,
      items: expectedItems,
    });
    expect(publicOrder).not.toHaveProperty("customerName");
    expect(publicOrder).not.toHaveProperty("deliveryAddress");
    expect(publicOrder).not.toHaveProperty("whatsappNumber");
  });

  it("D4 preserves a checkout deduction when an admin saves a non-stock edit", async () => {
    const { perfume, variant, input, lines, submissionKey } = await checkoutFixture(2);
    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    assertOrder(placed);

    // The current editor echoes the unchanged quantity from its original form.
    const saved = await variants.saveVariantRecord(perfume.id, variant.id, {
      sizeValue: variant.sizeValue.toString(),
      priceMinor: 150_000,
      quantity: variant.quantity,
    });
    expect(saved).toEqual({ ok: true });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 1,
      priceMinor: 150_000,
    });
  });

  it("D4 rejects absolute stock adjustments after an intervening sale or restoration", async () => {
    const { perfume, variant, input, lines, submissionKey } = await checkoutFixture(2);
    const placed = await orders.createOrderWithStockDeduction(lines, input, submissionKey);
    assertOrder(placed);
    const adjustment = { sizeValue: "50", priceMinor: 150_000, quantity: 7 };
    const conflict = { message: expect.stringContaining("Stock changed") };
    await expect(
      variants.saveVariantRecord(perfume.id, variant.id, adjustment, 2),
    ).resolves.toEqual(conflict);
    await expect(orders.cancelOrderAndRestoreStock(placed.order.reference)).resolves.toEqual({
      ok: true,
    });
    await expect(
      variants.saveVariantRecord(perfume.id, variant.id, adjustment, 1),
    ).resolves.toEqual(conflict);
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 2,
      priceMinor: 120_000,
    });
    await expect(
      variants.saveVariantRecord(perfume.id, variant.id, adjustment, 2),
    ).resolves.toEqual({ ok: true });
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
      quantity: 7,
      priceMinor: 150_000,
    });
  });
});

function assertOrder(
  result: Awaited<ReturnType<typeof orders.createOrderWithStockDeduction>>,
): asserts result is Extract<typeof result, { order: unknown }> {
  if ("error" in result) {
    throw new Error(`Expected checkout to place an order: ${result.error}`);
  }
}
