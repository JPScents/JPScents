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
let adminOrders: typeof import("@/modules/orders/repositories/admin-commerce-order.repository");
let drafts: typeof import("@/modules/orders/repositories/checkout-draft.repository");
let receipts: typeof import("@/modules/payments/server");
let notifications: typeof import("@/modules/notifications/server");
let notificationWorker: typeof import("@/modules/orders/services/commerce-notification.service");
let refunds: typeof import("@/modules/orders/repositories/commerce-refund.repository");
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
  [
    orders,
    legacy,
    delivery,
    payments,
    statusAccess,
    receipts,
    adminOrders,
    drafts,
    notifications,
    notificationWorker,
    refunds,
  ] = await Promise.all([
    import("@/modules/orders/repositories/commerce-order.repository"),
    import("@/modules/orders/repositories/order.repository"),
    import("@/modules/delivery/server"),
    import("@/modules/orders/repositories/commerce-payment.repository"),
    import("@/modules/orders/repositories/order-status-access.repository"),
    import("@/modules/payments/server"),
    import("@/modules/orders/repositories/admin-commerce-order.repository"),
    import("@/modules/orders/repositories/checkout-draft.repository"),
    import("@/modules/notifications/server"),
    import("@/modules/orders/services/commerce-notification.service"),
    import("@/modules/orders/repositories/commerce-refund.repository"),
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

function expectedPrices(purchase: Awaited<ReturnType<typeof basket>>) {
  return new Map(
    purchase.quote.lines.map(({ perfumeVariantId, unitPriceMinor }) => [
      perfumeVariantId,
      unitPriceMinor,
    ]),
  );
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
      WHERE c.relname IN ('DeliveryDestination', 'PaymentAttempt', 'StockReservation', 'StockMovement', 'OrderNotification')
    `;
    expect(privileges).toHaveLength(10);
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
      adminOrders.applyAdminCommerceOrderAction(admin, placed.order.id, {
        action: "CANCEL",
        reason: "Customer requested cancellation",
      }),
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
      await adminOrders.applyAdminCommerceOrderAction(admin, placed.order.id, {
        action: "CANCEL",
        reason: "Duplicate",
      }),
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
    expect(
      await db.orderNotification.findMany({ where: { orderId: placed.order.id } }),
    ).toMatchObject([
      { kind: "PAYMENT_CONFIRMED", recipient: purchase.input.email, status: "PENDING" },
    ]);
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
      "pending",
    );
    expect(
      await payments.applyVerifiedCommercePayment(first.reference, { ...first, status: "failed" }),
    ).toBe("FAILED");
    expect(await available(purchase.perfume.id)).toEqual([2]);
    const token = await statusAccess.issueCheckoutStatusToken(
      placed.order.id,
      purchase.sessionToken,
    );
    expect(
      await statusAccess.getCommerceCheckoutRecovery(token ?? undefined, randomUUID()),
    ).toBeNull();
    expect(
      await statusAccess.getCommerceCheckoutRecovery(token ?? undefined, purchase.sessionToken),
    ).toMatchObject({
      submissionKey: purchase.submissionKey,
      details: purchase.input,
    });
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

describe("PostgreSQL approved acceptance commerce administration", () => {
  it("keeps drafts stock-neutral, revokes old versions and checks out at the locked item price", async () => {
    const purchase = await basket([2]);
    const input = {
      lines: purchase.quote.lines.map(({ perfumeVariantId, quantity }) => ({
        perfumeVariantId,
        quantity,
      })),
      contactName: "Synthetic Draft",
      contactEmail: "draft@example.test",
    };
    const saved = await drafts.saveCheckoutDraft(admin, input);
    if (!("id" in saved) || !saved.id) {
      throw new Error("Draft was not saved.");
    }
    const issued = await drafts.issueCheckoutDraft(admin, saved.id, 0, expectedPrices(purchase));
    if (!("token" in issued) || !issued.token) {
      throw new Error("Draft was not issued.");
    }
    expect(issued.expiresAt.getTime() - Date.now()).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
    expect(await available(purchase.perfume.id)).toEqual([2]);
    expect(await db.customer.findUnique({ where: { email: input.contactEmail } })).toBeNull();
    expect(await drafts.getCheckoutQuote(issued.token)).toMatchObject({
      version: 1,
      lines: [{ unitPriceMinor: 200_000 }],
    });
    await db.perfumeVariant.updateMany({
      where: { perfumeId: purchase.perfume.id },
      data: { priceMinor: 220_000 },
    });
    const oldPrices = expectedPrices(purchase);
    expect(await drafts.issueCheckoutDraft(admin, saved.id, 1, oldPrices)).toMatchObject({
      stalePrices: true,
    });
    const reissued = await drafts.issueCheckoutDraft(
      admin,
      saved.id,
      1,
      new Map([[purchase.perfume.variants[0].id, 220_000]]),
    );
    if (!("token" in reissued) || !reissued.token) {
      throw new Error("Draft was not reissued.");
    }
    expect(await drafts.getCheckoutQuote(issued.token)).toBeNull();
    expect(await drafts.getCheckoutQuote(reissued.token)).toMatchObject({
      version: 2,
      lines: [{ unitPriceMinor: 220_000 }],
    });
    expect(await available(purchase.perfume.id)).toEqual([2]);
    await db.perfumeVariant.updateMany({
      where: { perfumeId: purchase.perfume.id },
      data: { priceMinor: 240_000 },
    });
    const opened = await drafts.getCheckoutQuote(reissued.token);
    if (!opened) {
      throw new Error("Quote was not readable.");
    }
    const command = {
      ...purchase,
      quote: { ...purchase.quote, lines: opened.lines },
      issuedQuote: { token: reissued.token, version: 2 },
    };
    expect(
      await orders.reserveCommerceOrder({
        ...command,
        issuedQuote: { token: issued.token, version: 1 },
      }),
    ).toHaveProperty("error");
    expect(await orders.reserveCommerceOrder({ ...command, quote: purchase.quote })).toHaveProperty(
      "error",
    );
    const order = created(await orders.reserveCommerceOrder(command));
    expect(order.subtotalMinor).toBe(220_000);
    expect(await available(purchase.perfume.id)).toEqual([1]);
    expect(await drafts.getCheckoutQuote(reissued.token)).toBeNull();
    expect(
      await orders.reserveCommerceOrder({
        ...command,
        submissionKey: randomUUID(),
        sessionToken: randomUUID(),
      }),
    ).toHaveProperty("error");
  });

  it("revokes an issued quote on edit, rejects stale edits and enforces expiry without holding stock", async () => {
    const purchase = await basket([1]);
    const input = {
      lines: purchase.quote.lines.map(({ perfumeVariantId, quantity }) => ({
        perfumeVariantId,
        quantity,
      })),
      contactName: null,
      contactEmail: null,
    };
    const saved = await drafts.saveCheckoutDraft(admin, input);
    if (!("id" in saved) || !saved.id) {
      throw new Error("Draft was not saved.");
    }
    const issued = await drafts.issueCheckoutDraft(admin, saved.id, 0, expectedPrices(purchase));
    if (!("token" in issued) || !issued.token) {
      throw new Error("Draft was not issued.");
    }
    expect(
      await drafts.saveCheckoutDraft(admin, input, { id: saved.id, version: 0 }),
    ).toHaveProperty("error");
    expect(
      await drafts.saveCheckoutDraft(admin, input, { id: saved.id, version: 1 }),
    ).toHaveProperty("id");
    expect(await drafts.getCheckoutQuote(issued.token)).toBeNull();
    const reissued = await drafts.issueCheckoutDraft(admin, saved.id, 2, expectedPrices(purchase));
    if (!("token" in reissued) || !reissued.token) {
      throw new Error("Draft was not reissued.");
    }
    await db.checkoutDraft.update({
      where: { id: saved.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await drafts.getCheckoutQuote(reissued.token)).toBeNull();
    expect(await drafts.revokeCheckoutDraft(admin, saved.id, 3)).toHaveProperty("ok");
    expect(await available(purchase.perfume.id)).toEqual([1]);
  });

  it("cancels a late-allocated paid order once with a full refund including delivery", async () => {
    const purchase = await basket([2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const late = new Date(placed.expiresAt.getTime() + 1);
    await orders.expireCommerceReservation(placed.order.id, late);
    const fact = verified(placed);
    expect(await payments.applyVerifiedCommercePayment(fact.reference, fact, late)).toBe("PAID");
    const command = { action: "CANCEL" as const, reason: "Synthetic cancellation" };
    const results = await Promise.all([
      adminOrders.applyAdminCommerceOrderAction(admin, placed.order.id, command),
      adminOrders.applyAdminCommerceOrderAction(admin, placed.order.id, command),
    ]);
    expect(results).toContainEqual({ ok: true });
    expect(results).toContainEqual({ unchanged: true });
    expect(await available(purchase.perfume.id)).toEqual([2]);
    expect(
      await db.refund.findMany({ where: { paymentAttemptId: placed.attempt.id } }),
    ).toMatchObject([
      { amountMinor: placed.totalMinor, status: "REQUESTED", requestedBy: admin.id },
    ]);
    expect(
      await db.commerceOrderEvent.count({
        where: { orderId: placed.order.id, action: "CANCELLED" },
      }),
    ).toBe(1);
    expect(
      await db.orderNotification.count({
        where: { orderId: placed.order.id, kind: "CANCELLED" },
      }),
    ).toBe(1);
  });

  it("guards dispatch and caps concurrent refunds and received returns independently", async () => {
    const purchase = await basket([2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const orderId = placed.order.id;
    const fulfil = (next: "PROCESSING" | "DISPATCHED") =>
      adminOrders.applyAdminCommerceOrderAction(admin, orderId, { action: "FULFIL", next });
    expect(await fulfil("DISPATCHED")).toHaveProperty("error");
    const fact = verified(placed);
    await payments.applyVerifiedCommercePayment(fact.reference, fact);
    expect(await fulfil("PROCESSING")).toHaveProperty("ok");
    expect(await fulfil("DISPATCHED")).toHaveProperty("ok");
    const refund = {
      action: "REFUND" as const,
      reason: "Synthetic partial refund",
      amountMinor: placed.totalMinor - 100,
      requestKey: randomUUID(),
    };
    const refunds = await Promise.all([
      adminOrders.applyAdminCommerceOrderAction(admin, orderId, refund),
      adminOrders.applyAdminCommerceOrderAction(admin, orderId, {
        ...refund,
        requestKey: randomUUID(),
      }),
    ]);
    expect(refunds.filter((result) => "ok" in result)).toHaveLength(1);
    expect(refunds.filter((result) => "error" in result)).toHaveLength(1);
    expect(await available(purchase.perfume.id)).toEqual([1]);
    const line = purchase.perfume.variants[0];
    const returned = {
      action: "RETURN" as const,
      reason: "Received unopened bottle",
      quantity: 1,
      perfumeVariantId: line.id,
      requestKey: randomUUID(),
    };
    const returns = await Promise.all([
      adminOrders.applyAdminCommerceOrderAction(admin, orderId, returned),
      adminOrders.applyAdminCommerceOrderAction(admin, orderId, returned),
    ]);
    expect(returns).toContainEqual({ ok: true });
    expect(returns).toContainEqual({ unchanged: true });
    expect(
      await adminOrders.applyAdminCommerceOrderAction(admin, orderId, {
        ...returned,
        requestKey: randomUUID(),
      }),
    ).toHaveProperty("error");
    expect(await available(purchase.perfume.id)).toEqual([2]);
    expect(await db.refund.count({ where: { paymentAttemptId: placed.attempt.id } })).toBe(1);
  });
});

describe("PostgreSQL approved acceptance commerce notifications and recovery", () => {
  beforeAll(async () => {
    // Earlier cases created their own intents. Isolate the due batch for the worker tests.
    await db.orderNotification.updateMany({ data: { nextAttemptAt: new Date("2037-01-01") } });
    await db.refund.updateMany({ data: { nextCheckAt: new Date("2037-01-01") } });
  });

  async function paidOrder() {
    const purchase = await basket([2]);
    const placed = created(await orders.reserveCommerceOrder(purchase));
    const fact = verified(placed);
    expect(await payments.applyVerifiedCommercePayment(fact.reference, fact)).toBe("PAID");
    const email = await db.orderNotification.findFirstOrThrow({
      where: { orderId: placed.order.id, kind: "PAYMENT_CONFIRMED" },
    });
    return { purchase, placed, email };
  }

  it("recovers an abandoned notification lease and ignores stale completion", async () => {
    const { email } = await paidOrder();
    const now = new Date();
    const [first, second] = await Promise.all([
      notifications.claimDueNotifications(now, 5),
      notifications.claimDueNotifications(now, 5),
    ]);
    expect([...first.emails, ...second.emails].filter((item) => item.id === email.id)).toHaveLength(
      1,
    );
    const owner = first.emails.length ? first : second;
    const later = new Date(now.getTime() + 61_000);
    const recovered = await notifications.claimDueNotifications(later, 5);
    expect(recovered.emails.map(({ id }) => id)).toContain(email.id);
    await notifications.finishNotification(
      email.id,
      owner.leaseId,
      { issue: "EMAIL_REJECTED" },
      later,
    );
    expect(await db.orderNotification.findUniqueOrThrow({ where: { id: email.id } })).toMatchObject(
      {
        status: "PENDING",
        leaseId: recovered.leaseId,
        firstAttemptAt: null,
      },
    );
    await notifications.finishNotification(
      email.id,
      recovered.leaseId,
      {
        issue: "EMAIL_CONFIGURATION",
        nextAttemptAt: new Date("2037-01-01"),
      },
      later,
    );
  });

  it("replays the identical email after a lost provider response and links only to the paid order", async () => {
    const { purchase, placed, email } = await paidOrder();
    const captured: { key: string | null; body: string }[] = [];
    const messageId = randomUUID();
    const stub = vi.spyOn(globalThis, "fetch").mockImplementation(async (resource, init) => {
      if (resource !== "https://api.resend.com/emails") {
        throw new Error("Unexpected outbound service in the notification fixture.");
      }
      captured.push({
        key: new Headers(init?.headers).get("Idempotency-Key"),
        body: String(init?.body),
      });
      if (captured.length === 1) {
        throw new Error("Synthetic response loss");
      }
      return Response.json({ id: messageId });
    });
    vi.stubEnv("RESEND_API_KEY", "re_synthetic_fixture");
    vi.stubEnv("RESEND_FROM", "orders@example.test");
    vi.stubEnv("PAYSTACK_RETURN_ORIGIN", "https://checkout.example.test");
    vi.stubEnv("COMMERCE_STATUS_KEY_VERSION", "1");
    try {
      expect(await notificationWorker.reconcileCommerceNotifications(5)).toEqual([
        "EMAIL_AMBIGUOUS",
      ]);
      expect(await db.order.findUniqueOrThrow({ where: { id: placed.order.id } })).toMatchObject({
        commerceStatus: "PAID",
      });
      expect(
        await db.orderNotification.findUniqueOrThrow({ where: { id: email.id } }),
      ).toMatchObject({
        status: "PENDING",
        issue: "EMAIL_AMBIGUOUS",
        attempts: 1,
      });
      vi.stubEnv("RESEND_FROM", "replacement@example.test");
      vi.stubEnv("PAYSTACK_RETURN_ORIGIN", "https://changed.example.test");
      vi.stubEnv("COMMERCE_STATUS_KEY_VERSION", "2");
      vi.stubEnv("COMMERCE_PREVIOUS_STATUS_KEY_VERSION", "1");
      vi.stubEnv("COMMERCE_PREVIOUS_STATUS_SECRET", "synthetic-checkout-status-signing-secret");
      vi.stubEnv("COMMERCE_STATUS_SECRET", "synthetic-rotated-checkout-status-signing-secret");
      expect(await notifications.requeueNotification(email.id, new Date())).toBe(true);
      expect(await notificationWorker.reconcileCommerceNotifications(5)).toEqual([null]);
      expect(captured).toHaveLength(2);
      expect(captured[1]).toEqual(captured[0]);
      const sent = JSON.parse(captured[0].body) as { to: string; text: string };
      expect(sent.to).toBe(purchase.input.email);
      const access = new URL(sent.text.split("\n").at(-1) ?? "");
      expect(access.origin).toBe("https://checkout.example.test");
      expect(access.pathname).toBe("/checkout/status/access");
      expect(access.search).toBe("");
      const status = await statusAccess.getCommerceStatus(access.hash.slice(1));
      expect(status).toMatchObject({ reference: placed.order.reference, status: "PAID" });
      expect(status).not.toHaveProperty("emailSnapshot");
      expect(
        await statusAccess.findStatusOrderPayment(access.hash.slice(1), randomUUID()),
      ).toBeNull();
      expect(
        await db.orderNotification.findUniqueOrThrow({ where: { id: email.id } }),
      ).toMatchObject({
        status: "ACCEPTED",
        attempts: 2,
        providerMessageId: messageId,
        statusKeyVersion: "1",
        statusTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
    } finally {
      stub.mockRestore();
      vi.stubEnv("COMMERCE_STATUS_SECRET", "synthetic-checkout-status-signing-secret");
      vi.stubEnv("COMMERCE_STATUS_KEY_VERSION", undefined);
      vi.stubEnv("COMMERCE_PREVIOUS_STATUS_KEY_VERSION", undefined);
      vi.stubEnv("COMMERCE_PREVIOUS_STATUS_SECRET", undefined);
      vi.stubEnv("RESEND_API_KEY", undefined);
      vi.stubEnv("RESEND_FROM", undefined);
      vi.stubEnv("PAYSTACK_RETURN_ORIGIN", undefined);
    }
  });

  it("quarantines an ambiguous send past the idempotency window", async () => {
    const { email } = await paidOrder();
    await db.orderNotification.update({
      where: { id: email.id },
      data: {
        firstAttemptAt: new Date(Date.now() - notifications.EMAIL_REPLAY_MS - 1000),
        statusKeyVersion: "1",
        statusTokenHash: "0".repeat(64),
        statusLinkBase: "https://checkout.example.test/checkout/status/access",
        sender: "orders@example.test",
        attempts: 1,
        issue: "EMAIL_AMBIGUOUS",
      },
    });
    const stub = vi.spyOn(globalThis, "fetch");
    try {
      expect(await notificationWorker.reconcileCommerceNotifications(5)).toEqual([
        "EMAIL_REPLAY_EXPIRED",
      ]);
      expect(stub).not.toHaveBeenCalled();
      expect(await notifications.requeueNotification(email.id, new Date())).toBe(false);
      expect(
        await db.orderNotification.findUniqueOrThrow({ where: { id: email.id } }),
      ).toMatchObject({
        status: "NEEDS_ATTENTION",
        issue: "EMAIL_REPLAY_EXPIRED",
        attempts: 1,
      });
    } finally {
      stub.mockRestore();
    }
  });

  it("preserves refund progress during outages and rechecks failures using the existing refund", async () => {
    const { placed } = await paidOrder();
    const orderId = placed.order.id;
    for (const next of ["PROCESSING", "DISPATCHED"] as const) {
      expect(
        await adminOrders.applyAdminCommerceOrderAction(admin, orderId, { action: "FULFIL", next }),
      ).toHaveProperty("ok");
    }
    const refundCommand = {
      action: "REFUND" as const,
      amountMinor: placed.totalMinor,
      reason: "Synthetic refund",
      requestKey: randomUUID(),
    };
    expect(
      await adminOrders.applyAdminCommerceOrderAction(admin, orderId, refundCommand),
    ).toHaveProperty("ok");
    const initial = await db.refund.findFirstOrThrow({
      where: { paymentAttemptId: placed.attempt.id },
    });
    async function check(status: Parameters<typeof refunds.finishCommerceRefund>[1]) {
      expect(await receipts.prioritiseRefundCheck(initial.id, new Date())).toBe(true);
      const claim = await receipts.claimDueRefunds(new Date(), 5);
      expect(claim.refunds).toContainEqual(expect.objectContaining({ id: initial.id, orderId }));
      expect(
        await refunds.finishCommerceRefund(
          { id: initial.id, orderId, leaseId: claim.leaseId },
          status,
        ),
      ).toBe(true);
    }
    await check("PROCESSING");
    await check("AMBIGUOUS");
    await check("PENDING");
    expect(await db.refund.findUniqueOrThrow({ where: { id: initial.id } })).toMatchObject({
      status: "PROCESSING",
    });
    await check("FAILED");
    expect(
      await adminOrders.applyAdminCommerceOrderAction(admin, orderId, {
        ...refundCommand,
        requestKey: randomUUID(),
      }),
    ).toHaveProperty("error");
    await check("PROCESSED");
    expect(await db.refund.findUniqueOrThrow({ where: { id: initial.id } })).toMatchObject({
      status: "PROCESSED",
      providerReference: initial.providerReference,
    });
    expect(
      await db.orderNotification.findMany({
        where: { orderId },
        select: { kind: true, eventKey: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "DISPATCHED" }),
        { kind: "REFUND_PROGRESS", eventKey: `refund:${initial.id}:REQUESTED` },
        { kind: "REFUND_PROGRESS", eventKey: `refund:${initial.id}:PROCESSING` },
        { kind: "REFUND_PROGRESS", eventKey: `refund:${initial.id}:FAILED` },
        { kind: "REFUND_PROGRESS", eventKey: `refund:${initial.id}:PROCESSED` },
      ]),
    );
  });
});
