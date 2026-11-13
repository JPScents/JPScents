import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/infrastructure/database/generated/client";
import type { CommerceCheckoutInput } from "@/modules/orders/types";

import { startDisposablePostgres } from "./disposable-postgres";

const BASE_MIGRATION = "20261112000000_order_facts";
const admin = { id: randomUUID(), email: "admin@example.test" };

let cluster: ReturnType<typeof startDisposablePostgres> | undefined;
let db: PrismaClient;
let application: PrismaClient | undefined;
let orders: typeof import("@/modules/orders/repositories/commerce-order.repository");
let legacy: typeof import("@/modules/orders/repositories/order.repository");
let delivery: typeof import("@/modules/delivery/server");
let payments: typeof import("@/modules/orders/repositories/commerce-payment.repository");
let statusAccess: typeof import("@/modules/orders/repositories/order-status-access.repository");
let receipts: typeof import("@/modules/payments/server");
let preMigrationOrderId: string;
let migratedDeliverySettings: Awaited<ReturnType<typeof delivery.listDeliverySettings>>;

async function seedOldAppOrder(db: PrismaClient, phone: string) {
  const customerId = randomUUID();
  const orderId = randomUUID();
  await db.$executeRaw`
    INSERT INTO "Customer" ("id", "name", "whatsappNumber", "deliveryState", "deliveryCity", "deliveryAddress", "updatedAt")
    VALUES (${customerId}::uuid, 'Legacy Customer', ${phone}, 'Lagos', 'Ikeja', 'Legacy address', now())
  `;
  await db.$executeRaw`
    INSERT INTO "Order" ("id", "customerId", "reference", "confirmationToken", "submissionKey", "subtotalMinor", "status", "updatedAt")
    VALUES (${orderId}::uuid, ${customerId}::uuid, ${`JP-${orderId}`}, ${randomUUID()}, ${randomUUID()}, 2500, 'AWAITING_PAYMENT', now())
  `;
  return orderId;
}

beforeAll(async () => {
  cluster = startDisposablePostgres({ replayMigrations: false });
  cluster.deployMigrations(BASE_MIGRATION);
  db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: cluster.connectionString, max: 5 }),
  });
  preMigrationOrderId = await seedOldAppOrder(db, "2348001111111");
  cluster.deployMigrations();
  vi.stubEnv("DATABASE_URL", cluster.connectionString);
  vi.stubEnv("COMMERCE_STATUS_SECRET", "synthetic-checkout-status-signing-secret");
  application = (await import("@/infrastructure/database/prisma")).prisma;
  [orders, legacy, delivery, payments, statusAccess, receipts] = await Promise.all([
    import("@/modules/orders/repositories/commerce-order.repository"),
    import("@/modules/orders/repositories/order.repository"),
    import("@/modules/delivery/server"),
    import("@/modules/orders/repositories/commerce-payment.repository"),
    import("@/modules/orders/repositories/order-status-access.repository"),
    import("@/modules/payments/server"),
  ]);
  migratedDeliverySettings = await delivery.listDeliverySettings(admin);
});

afterAll(async () => {
  try {
    await Promise.all([db?.$disconnect(), application?.$disconnect()]);
  } finally {
    vi.unstubAllEnvs();
    cluster?.stop();
  }
});

let fixtureNumber = 0;
async function basket(quantities: number[], isBestseller = false) {
  await db.deliveryDestination.update({
    where: { state: "Lagos" },
    data: { enabled: true, feeMinor: 450_000 },
  });
  const slug = `commerce-${randomUUID()}`;
  const perfume = await db.perfume.create({
    data: {
      name: "Synthetic Commerce Perfume",
      slug,
      scentCue: "Citrus",
      description: "Isolated integration fixture",
      status: "PUBLISHED",
      scentCharacters: ["FRESH"],
      occasions: ["EVERYDAY"],
      timesOfDay: ["DAY"],
      variants: {
        create: quantities.map((quantity, index) => ({
          sizeValue: index + 10,
          sizeUnit: "ML",
          priceMinor: 200_000,
          quantity,
        })),
      },
    },
    include: { variants: { orderBy: { sizeValue: "asc" } } },
  });
  if (isBestseller) {
    await db.perfume.update({ where: { id: perfume.id }, data: { isBestseller: true } });
  }
  const input: CommerceCheckoutInput = {
    customerName: "Commerce Test Customer",
    email: `buyer-${randomUUID()}@example.invalid`,
    whatsappNumber: `234802${String(++fixtureNumber).padStart(7, "0")}`,
    deliveryCountry: "NG",
    deliveryState: "Lagos",
    deliveryCity: "Ikeja",
    deliveryAddress: "Synthetic street address",
    deliveryApartment: "Flat 2",
    deliveryLandmark: "Test bus stop",
    deliveryPostcode: "100001",
  };
  return {
    perfume,
    input,
    quote: {
      deliveryFeeMinor: 450_000,
      lines: perfume.variants.map(({ id, priceMinor }) => ({
        perfumeVariantId: id,
        quantity: 1,
        unitPriceMinor: priceMinor,
      })),
    },
    submissionKey: randomUUID(),
    sessionToken: randomUUID() + randomUUID(),
    environment: "TEST" as const,
  };
}

function created(result: Awaited<ReturnType<typeof orders.reserveCommerceOrder>>) {
  if (!("order" in result) || result.duplicate) {
    throw new Error("Expected a new commerce order.");
  }
  return result;
}

async function available(perfumeId: string) {
  const rows = await db.perfumeVariant.findMany({
    where: { perfumeId },
    orderBy: { sizeValue: "asc" },
    select: { quantity: true },
  });
  return rows.map(({ quantity }) => quantity);
}

describe("PostgreSQL approved acceptance commerce inventory", () => {
  it("classifies populated old rows and old-application inserts without fabricating payment or snapshots", async () => {
    const postMigrationOrderId = await seedOldAppOrder(db, "2348002222222");
    const rows = await db.order.findMany({
      where: { id: { in: [preMigrationOrderId, postMigrationOrderId] } },
      select: {
        kind: true,
        status: true,
        commerceStatus: true,
        totalMinor: true,
        deliveryFeeMinor: true,
        customerNameSnapshot: true,
        _count: { select: { paymentAttempts: true, reservations: true } },
      },
    });
    expect(rows).toHaveLength(2);
    for (const order of rows) {
      expect(order).toEqual({
        kind: "LEGACY_MANUAL",
        status: "AWAITING_PAYMENT",
        commerceStatus: null,
        totalMinor: null,
        deliveryFeeMinor: null,
        customerNameSnapshot: null,
        _count: { paymentAttempts: 0, reservations: 0 },
      });
    }
    expect(await orders.expireCommerceReservation(preMigrationOrderId)).toBe(false);
  });

  it("seeds all destinations disabled and prevents browser roles from reading the new tables", async () => {
    const settings = migratedDeliverySettings;
    expect(settings).toHaveLength(37);
    expect(settings.every((row) => !row.enabled && row.feeMinor === null)).toBe(true);
    expect(settings.map((row) => row.state)).toContain("FCT");
    await expect(delivery.listDeliverySettings(null)).rejects.toThrow("You are not authorized.");
    const privileges = await db.$queryRaw<{ allowed: boolean; rls: boolean }[]>`
      SELECT
        has_table_privilege(role.name, c.oid, 'SELECT') AS allowed,
        c.relrowsecurity AND c.relforcerowsecurity AS rls
      FROM pg_class c
      CROSS JOIN (VALUES ('anon'), ('authenticated')) role(name)
      WHERE c.relname IN ('DeliveryDestination', 'PaymentAttempt', 'StockReservation', 'StockMovement')
    `;
    expect(privileges).toHaveLength(8);
    expect(privileges.every((row) => !row.allowed && row.rls)).toBe(true);
  });

  it("preserves the winner and rolls back the whole delivery edit when any state is stale", async () => {
    const initial = await delivery.listDeliverySettings(admin);
    const ogun = initial.find(({ state }) => state === "Ogun");
    const fct = initial.find(({ state }) => state === "FCT");
    if (!ogun || !fct) {
      throw new Error("Delivery fixtures are missing.");
    }
    const winner = await delivery.saveDeliverySettings(admin, [
      { ...ogun, enabled: true, feeMinor: 450_000 },
    ]);
    expect(winner).toMatchObject({
      ok: true,
      settings: [{ state: "Ogun", version: 1, feeMinor: 450_000 }],
    });
    const stale = await delivery.saveDeliverySettings(admin, [
      { ...fct, enabled: true, feeMinor: 120_000 },
      { ...ogun, enabled: true, feeMinor: 130_000 },
    ]);
    expect(stale).toMatchObject({ ok: false, conflict: true });
    expect(await db.deliveryDestination.findUnique({ where: { state: "FCT" } })).toMatchObject({
      enabled: false,
      feeMinor: null,
      version: 0,
    });
    expect(await db.deliveryDestination.findUnique({ where: { state: "Ogun" } })).toMatchObject({
      enabled: true,
      feeMinor: 450_000,
      version: 1,
      updatedBy: admin.id,
    });
  });

  it("rechecks allowed destinations, fees and product prices before any stock or customer changes", async () => {
    const purchase = await basket([2, 2]);
    expect(
      await orders.reserveCommerceOrder({
        ...purchase,
        input: { ...purchase.input, deliveryState: "FCT" },
      }),
    ).toMatchObject({ error: expect.stringContaining("unavailable") });
    expect(
      await orders.reserveCommerceOrder({
        ...purchase,
        quote: { ...purchase.quote, deliveryFeeMinor: 0 },
      }),
    ).toEqual({ staleQuote: { deliveryFeeMinor: 450_000 } });
    await db.perfumeVariant.update({
      where: { id: purchase.perfume.variants[0].id },
      data: { priceMinor: 210_000 },
    });
    const changed = await orders.reserveCommerceOrder(purchase);
    expect(changed).toMatchObject({
      staleQuote: {
        deliveryFeeMinor: 450_000,
        unitPrices: expect.arrayContaining([
          { perfumeVariantId: purchase.perfume.variants[0].id, unitPriceMinor: 210_000 },
        ]),
      },
    });
    expect(await available(purchase.perfume.id)).toEqual([2, 2]);
    expect(
      await db.order.findUnique({ where: { submissionKey: purchase.submissionKey } }),
    ).toBeNull();
    expect(await db.customer.findUnique({ where: { email: purchase.input.email } })).toBeNull();
  });

  it("rolls back all lines and customer data if the final order insert is rejected", async () => {
    const purchase = await basket([1, 1], true);
    await expect(
      orders.reserveCommerceOrder({
        ...purchase,
        input: { ...purchase.input, customerName: " " },
      }),
    ).rejects.toThrow();
    expect(await available(purchase.perfume.id)).toEqual([1, 1]);
    expect(await db.perfume.findUnique({ where: { id: purchase.perfume.id } })).toMatchObject({
      isBestseller: true,
    });
    expect(await db.customer.findUnique({ where: { email: purchase.input.email } })).toBeNull();
    expect(
      await db.order.findUnique({ where: { submissionKey: purchase.submissionKey } }),
    ).toBeNull();
    await db.perfume.update({ where: { id: purchase.perfume.id }, data: { isBestseller: false } });
  });

  it("reserves every line once on concurrent replay and keeps commercial facts separate from legacy operations", async () => {
    const purchase = await basket([1, 1], true);
    const results = await Promise.all([
      orders.reserveCommerceOrder(purchase),
      orders.reserveCommerceOrder(purchase),
    ]);
    const first = results.find((result) => "duplicate" in result && result.duplicate === false);
    if (!first) {
      throw new Error("No commerce order was created.");
    }
    const placed = created(first);
    expect(results).toContainEqual(
      expect.objectContaining({
        duplicate: true,
        order: { id: placed.order.id, reference: placed.order.reference },
        attempt: expect.objectContaining({ id: placed.attempt.id }),
      }),
    );
    expect(
      await orders.reserveCommerceOrder({ ...purchase, sessionToken: randomUUID() }),
    ).toMatchObject({
      error: expect.stringContaining("cannot be used"),
    });
    const stored = await db.order.findUniqueOrThrow({
      where: { id: placed.order.id },
      include: { paymentAttempts: true, reservations: true, stockMovements: true, items: true },
    });
    expect(stored).toMatchObject({
      kind: "COMMERCE",
      commerceStatus: "AWAITING_PAYMENT",
      fulfilmentStatus: "UNFULFILLED",
      currency: "NGN",
      subtotalMinor: 400_000,
      deliveryFeeMinor: 450_000,
      totalMinor: 850_000,
      emailSnapshot: purchase.input.email,
      deliveryApartment: "Flat 2",
      deliveryLandmark: "Test bus stop",
      deliveryPostcode: "100001",
      paymentAttempts: [{ id: placed.attempt.id, amountMinor: 850_000, environment: "TEST" }],
      stockMovements: [
        expect.objectContaining({ kind: "RESERVE" }),
        expect.objectContaining({ kind: "RESERVE" }),
      ],
      items: [
        expect.objectContaining({
          unitPriceMinor: 200_000,
          perfumeNameSnapshot: purchase.perfume.name,
        }),
        expect.objectContaining({ unitPriceMinor: 200_000 }),
      ],
    });
    expect(stored.reservations).toHaveLength(1);
    expect(
      stored.reservations[0].expiresAt.getTime() - stored.reservations[0].createdAt.getTime(),
    ).toBe(30 * 60 * 1000);
    expect(stored.checkoutSessionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.checkoutSessionHash).not.toBe(purchase.sessionToken);
    expect(await available(purchase.perfume.id)).toEqual([0, 0]);
    expect(await db.perfume.findUnique({ where: { id: purchase.perfume.id } })).toMatchObject({
      isBestseller: false,
    });
    expect(await legacy.findOrderConfirmation(stored.confirmationToken)).toBeNull();
    expect(await legacy.updateOrderStatus(stored.reference, "PAID")).toMatchObject({
      error: "Order not found.",
    });
    await expect(
      db.$executeRaw`UPDATE "Order" SET "status" = 'PAID' WHERE "id" = ${stored.id}::uuid`,
    ).rejects.toThrow();
  });

  it("prevents concurrent oversell and restores the winning order once across expiry and cancellation", async () => {
    const purchase = await basket([1]);
    const contender = { ...purchase, submissionKey: randomUUID(), sessionToken: randomUUID() };
    const results = await Promise.all([
      orders.reserveCommerceOrder(purchase),
      orders.reserveCommerceOrder(contender),
    ]);
    const first = results.find((result) => "duplicate" in result && result.duplicate === false);
    if (!first) {
      throw new Error("No commerce order was created.");
    }
    const placed = created(first);
    expect(results.filter((result) => "error" in result)).toHaveLength(1);
    expect(await available(purchase.perfume.id)).toEqual([0]);
    expect(
      await orders.expireCommerceReservation(
        placed.order.id,
        new Date(placed.expiresAt.getTime() - 1),
      ),
    ).toBe(false);

    const when = new Date(placed.expiresAt.getTime() + 1);
    await Promise.all([
      orders.expireCommerceReservation(placed.order.id, when),
      orders.cancelUnpaidCommerceOrder(
        placed.order.id,
        admin,
        "Customer requested cancellation",
        when,
      ),
    ]);
    expect(await available(purchase.perfume.id)).toEqual([1]);
    expect(await db.order.findUnique({ where: { id: placed.order.id } })).toMatchObject({
      commerceStatus: "CANCELLED",
      cancelledBy: admin.id,
      cancellationReason: "Customer requested cancellation",
    });
    expect(
      await db.stockMovement.count({ where: { orderId: placed.order.id, kind: "RELEASE" } }),
    ).toBe(1);
    expect(await db.paymentAttempt.findUnique({ where: { id: placed.attempt.id } })).toMatchObject({
      status: "INITIATING",
    });
    expect(await orders.expireCommerceReservation(placed.order.id, when)).toBe(false);
    expect(
      await orders.cancelUnpaidCommerceOrder(placed.order.id, admin, "Duplicate", when),
    ).toEqual({ unchanged: true });
  });
});

function verified(placed: ReturnType<typeof created>, status: "success" | "failed" = "success") {
  return {
    reference: placed.attempt.providerReference,
    amountMinor: placed.totalMinor,
    currency: "NGN",
    environment: "TEST" as const,
    providerId: randomUUID(),
    status,
  };
}

describe("PostgreSQL approved acceptance commerce payment", () => {
  it("does not accept mismatched provider facts and consumes the matching hold exactly once", async () => {
    const purchase = await basket([2, 2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const fact = verified(placed);
    expect(
      await payments.applyVerifiedCommercePayment(fact.reference, { ...fact, amountMinor: 1 }),
    ).toBe("NEEDS_ATTENTION");
    expect(await db.order.findUniqueOrThrow({ where: { id: placed.order.id } })).toMatchObject({
      paidAttemptId: null,
    });
    expect(await available(purchase.perfume.id)).toEqual([1, 1]);
    const firstAndReplay = await Promise.all([
      payments.applyVerifiedCommercePayment(fact.reference, fact),
      payments.applyVerifiedCommercePayment(fact.reference, fact),
    ]);
    expect(firstAndReplay.sort()).toEqual(["PAID", "UNCHANGED"]);
    expect(await available(purchase.perfume.id)).toEqual([1, 1]);
    expect(
      await db.stockMovement.count({ where: { orderId: placed.order.id, kind: "ALLOCATE" } }),
    ).toBe(2);
    expect(await db.order.findUniqueOrThrow({ where: { id: placed.order.id } })).toMatchObject({
      commerceStatus: "PAID",
      paidAttemptId: placed.attempt.id,
    });
    const token = await statusAccess.issueCheckoutStatusToken(
      placed.order.id,
      purchase.sessionToken,
    );
    expect(token).toEqual(expect.stringMatching(/^[A-Za-z0-9_-]{43}$/));
    const status = await statusAccess.getCommerceStatus(token ?? undefined);
    expect(status).toMatchObject({
      status: "PAID",
      reference: placed.order.reference,
      totalMinor: fact.amountMinor,
    });
    expect(status).not.toHaveProperty("emailSnapshot");
    expect(status).not.toHaveProperty("providerReference");
    expect(await statusAccess.findStatusOrderPayment(undefined, fact.reference)).toBeNull();
    expect(await statusAccess.findStatusOrderPayment(token ?? undefined, randomUUID())).toBeNull();
    expect(await statusAccess.issueCheckoutStatusToken(placed.order.id, randomUUID())).toBeNull();
  });

  it("reallocates a late success at the original total after all lines were released", async () => {
    const purchase = await basket([2, 2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const late = new Date(placed.expiresAt.getTime() + 1);
    expect(await orders.expireCommerceReservation(placed.order.id, late)).toBe(true);
    expect(await available(purchase.perfume.id)).toEqual([2, 2]);
    await db.perfumeVariant.updateMany({
      where: { perfumeId: purchase.perfume.id },
      data: { priceMinor: 299_999 },
    });
    const fact = verified(placed);
    expect(await payments.applyVerifiedCommercePayment(fact.reference, fact, late)).toBe("PAID");
    expect(await available(purchase.perfume.id)).toEqual([1, 1]);
    expect(await db.order.findUniqueOrThrow({ where: { id: placed.order.id } })).toMatchObject({
      totalMinor: fact.amountMinor,
    });
  });

  it("records one full refund and allocates no line when a late order cannot be fulfilled", async () => {
    const purchase = await basket([1, 1]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const late = new Date(placed.expiresAt.getTime() + 1);
    await orders.expireCommerceReservation(placed.order.id, late);
    await db.perfumeVariant.update({
      where: { id: purchase.perfume.variants[1].id },
      data: { quantity: 0 },
    });
    const fact = verified(placed);
    expect(await payments.applyVerifiedCommercePayment(fact.reference, fact, late)).toBe(
      "REFUND_REQUIRED",
    );
    expect(await payments.applyVerifiedCommercePayment(fact.reference, fact, late)).toBe(
      "UNCHANGED",
    );
    expect(await available(purchase.perfume.id)).toEqual([1, 0]);
    expect(
      await db.refund.findMany({ where: { paymentAttemptId: placed.attempt.id } }),
    ).toMatchObject([{ amountMinor: fact.amountMinor, status: "REQUESTED" }]);
  });

  it("retries only a verified failed attempt and refunds a second success without extra stock debit", async () => {
    const purchase = await basket([2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const first = verified(placed);
    expect(await orders.retryFailedCommerceOrder(placed.order.id, purchase)).toHaveProperty(
      "error",
    );
    expect(
      await payments.applyVerifiedCommercePayment(first.reference, { ...first, status: "failed" }),
    ).toBe("FAILED");
    expect(await available(purchase.perfume.id)).toEqual([2]);
    expect(await orders.retryFailedCommerceOrder(placed.order.id, purchase)).toHaveProperty(
      "retry",
      true,
    );
    const next = await db.paymentAttempt.findFirstOrThrow({
      where: { orderId: placed.order.id, id: { not: placed.attempt.id } },
    });
    expect(await payments.applyVerifiedCommercePayment(first.reference, first)).toBe("PAID");
    const extra = { ...first, reference: next.providerReference, providerId: randomUUID() };
    expect(await payments.applyVerifiedCommercePayment(extra.reference, extra)).toBe(
      "REFUND_REQUIRED",
    );
    expect(await available(purchase.perfume.id)).toEqual([1]);
    expect(await db.refund.findMany({ where: { paymentAttemptId: next.id } })).toMatchObject([
      { amountMinor: placed.totalMinor, status: "REQUESTED" },
    ]);
    expect(await db.order.findUniqueOrThrow({ where: { id: placed.order.id } })).toMatchObject({
      commerceStatus: "PAID",
      paidAttemptId: placed.attempt.id,
    });
  });

  it("deduplicates receipts and reclaims abandoned leases without letting the old owner complete them", async () => {
    const reference = `jpscents-${randomUUID()}`;
    await Promise.all([
      receipts.enqueuePaystackReceipt("charge.success", reference, "TEST"),
      receipts.enqueuePaystackReceipt("charge.success", reference, "TEST"),
    ]);
    const time = new Date();
    const claimed = await receipts.claimDuePaymentWork(time, 50);
    const row = claimed.receipts.find((receipt) => receipt.providerReference === reference);
    if (!row) {
      throw new Error("Receipt was not available to claim.");
    }
    expect(await db.paystackReceipt.count({ where: { providerReference: reference } })).toBe(1);
    const overlap = await receipts.claimDuePaymentWork(time, 50);
    expect(overlap.receipts.some((receipt) => receipt.id === row.id)).toBe(false);
    const recovered = await receipts.claimDuePaymentWork(new Date(time.getTime() + 61_000), 50);
    expect(recovered.receipts.some((receipt) => receipt.id === row.id)).toBe(true);
    await receipts.finishReceipt(row.id, claimed.leaseId, true);
    expect(await db.paystackReceipt.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
      processedAt: null,
      leaseId: recovered.leaseId,
    });
    await receipts.finishReceipt(row.id, recovered.leaseId, true);
    expect(await db.paystackReceipt.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({
      processedAt: expect.any(Date),
      leaseId: null,
    });
  });
});
