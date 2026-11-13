import { createHmac, randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/infrastructure/database/generated/client";

let db: PrismaClient;
test.beforeAll(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (
    !connectionString ||
    !["localhost", "127.0.0.1"].includes(new URL(connectionString).hostname)
  ) {
    throw new Error("The commerce browser test requires disposable PostgreSQL.");
  }
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  await db.deliveryDestination.update({
    where: { state: "Lagos" },
    data: { enabled: true, feeMinor: 150_025 },
  });
});
test.afterAll(async () => {
  await db?.$disconnect();
});

async function openCheckout(page: Page, email: string, phone: string, quantity = 2) {
  const slug = `commerce-${randomUUID()}`;
  const product = await db.perfume.create({
    data: {
      name: "Synthetic Commerce Amber",
      slug,
      scentCue: "Amber",
      description: "Synthetic test stock",
      status: "PUBLISHED",
      scentCharacters: ["WARM"],
      occasions: ["EVERYDAY"],
      timesOfDay: ["DAY"],
      variants: { create: { sizeValue: 50, sizeUnit: "ML", priceMinor: 120_000, quantity } },
    },
    include: { variants: true },
  });
  await page.goto(`/perfumes/${slug}`);
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
  await page.goto("/checkout");
  await fillCheckout(page, email, phone);
  return product.variants[0].id;
}

async function fillCheckout(page: Page, email: string, phone: string) {
  await page.getByLabel("Full name").fill("Synthetic Buyer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("State or FCT").selectOption("Lagos");
  await page.getByLabel("City or town").fill("Ikeja");
  await page.getByLabel("Street and building").fill("10 Synthetic Street");
}

async function checkoutRedirect(page: Page, variantId: string) {
  await page.route("https://checkout.paystack.com/**", async (route) => {
    const attempt = await db.paymentAttempt.findFirstOrThrow({
      where: { order: { items: { some: { perfumeVariantId: variantId } } } },
      orderBy: { createdAt: "desc" },
      select: { providerReference: true },
    });
    await route.fulfill({
      status: 302,
      headers: {
        Location: `http://localhost:3000/checkout/paystack-return?reference=${attempt.providerReference}`,
      },
    });
  });
}

test("commerce checkout acknowledges a changed fee, verifies payment and protects status", async ({
  page,
  browser,
}) => {
  const variantId = await openCheckout(page, "success@example.test", "447700900456");
  await checkoutRedirect(page, variantId);
  await expect(page.getByRole("combobox", { name: "State or FCT" }).locator("option")).toHaveCount(
    2,
  );
  await db.deliveryDestination.update({ where: { state: "Lagos" }, data: { feeMinor: 160_050 } });
  const pay = page.getByRole("button", { name: "Pay with Paystack" });
  await pay.click();
  await expect(
    page.getByRole("alert").filter({ hasText: /prices or delivery changed/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Street and building")).toHaveValue("10 Synthetic Street");
  await expect(page.getByText("₦2,800.50")).toBeVisible();
  expect(
    await db.order.count({ where: { items: { some: { perfumeVariantId: variantId } } } }),
  ).toBe(0);

  await pay.click();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout\/status$/);
  const order = await db.order.findFirstOrThrow({
    where: { items: { some: { perfumeVariantId: variantId } } },
    include: { paymentAttempts: true, stockMovements: true },
  });
  expect(order).toMatchObject({ commerceStatus: "PAID", totalMinor: 280_050 });
  expect(order.paymentAttempts).toHaveLength(1);
  expect(order.stockMovements.map((move) => move.kind).sort()).toEqual(["ALLOCATE", "RESERVE"]);
  expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({
    quantity: 1,
  });
  await expect(page.getByText("10 Synthetic Street")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();

  const stranger = await browser.newPage();
  try {
    await stranger.goto(
      `http://localhost:3000/checkout/paystack-return?reference=${order.paymentAttempts[0].providerReference}`,
    );
    await expect(
      stranger.getByRole("heading", { name: "Order status is unavailable" }),
    ).toBeVisible();
    await expect(stranger.getByText(order.reference)).toHaveCount(0);
  } finally {
    await stranger.close();
  }
});

test("a verified failure can retry while an uncertain initialisation retains one durable attempt", async ({
  page,
  browser,
}) => {
  const email = "retry@example.test";
  const phone = "447700900457";
  const variantId = await openCheckout(page, email, phone);
  await checkoutRedirect(page, variantId);
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await expect(page.getByRole("heading", { name: "Payment failed" })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await db.perfumeVariant.findUniqueOrThrow({ where: { id: variantId } })).quantity,
    )
    .toBe(2);
  await page.getByRole("link", { name: "Return to Checkout" }).click();
  await fillCheckout(page, email, phone);
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  const attempts = await db.paymentAttempt.findMany({
    where: { order: { items: { some: { perfumeVariantId: variantId } } } },
  });
  expect(attempts.map((attempt) => attempt.status).sort()).toEqual(["FAILED", "SUCCEEDED"]);
  expect(new Set(attempts.map((attempt) => attempt.orderId)).size).toBe(1);

  const interrupted = await browser.newPage();
  try {
    const interruptedVariant = await openCheckout(
      interrupted,
      "uncertain@example.test",
      "447700900458",
    );
    const pay = interrupted.getByRole("button", { name: "Pay with Paystack" });
    await pay.click();
    await expect(interrupted.getByRole("link", { name: "Check payment status" })).toBeVisible();
    await pay.click();
    await expect(interrupted.getByRole("link", { name: "Check payment status" })).toBeVisible();
    expect(
      await db.paymentAttempt.findMany({
        where: { order: { items: { some: { perfumeVariantId: interruptedVariant } } } },
        select: { status: true },
      }),
    ).toEqual([{ status: "AMBIGUOUS" }]);
  } finally {
    await interrupted.close();
  }
});

test("signed delivery is durable and the protected scheduler verifies it without a browser callback", async ({
  page,
  request,
}) => {
  const variantId = await openCheckout(page, "webhook@example.test", "447700900459");
  await page.route("https://checkout.paystack.com/**", (route) =>
    route.fulfill({ status: 200, body: "Synthetic hosted checkout" }),
  );
  await page.getByRole("button", { name: "Pay with Paystack" }).click();
  await expect(page).toHaveURL("https://checkout.paystack.com/synthetic-checkout");
  const attempt = await db.paymentAttempt.findFirstOrThrow({
    where: { order: { items: { some: { perfumeVariantId: variantId } } } },
  });
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference: attempt.providerReference, domain: "test" },
  });
  const time = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha512", "whsec_browser_fixture")
    .update(`${time}.${body}`)
    .digest("hex");
  const response = await request.post("/api/paystack/webhook", {
    data: body,
    headers: { "Paystack-Signature": `t=${time},v1=whk_fixture:${signature}` },
  });
  expect(response.status()).toBe(200);
  expect(
    await db.paystackReceipt.count({
      where: { providerReference: attempt.providerReference, processedAt: null },
    }),
  ).toBe(1);
  expect((await request.post("/api/commerce/reconcile")).status()).toBe(401);
  const reconciled = await request.post("/api/commerce/reconcile", {
    headers: { Authorization: "Bearer synthetic-scheduler-fixture" },
  });
  expect(reconciled.status()).toBe(200);
  expect(await db.order.findUniqueOrThrow({ where: { id: attempt.orderId } })).toMatchObject({
    commerceStatus: "PAID",
  });
  expect(
    await db.paystackReceipt.count({
      where: { providerReference: attempt.providerReference, processedAt: { not: null } },
    }),
  ).toBe(1);
});

test("Admin issues a locked quote, fulfils the payment and records refund and return separately", async ({
  page,
  browser,
}) => {
  const guest = await browser.newPage();
  const adminPage = page;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.JP_E2E_LOCAL_ADMIN_KEY;
    if (!url || !key || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
      throw new Error("The isolated Admin provider is unavailable.");
    }
    const provider = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const link = await provider.auth.admin.generateLink({
      type: "magiclink",
      email: "admin@example.test",
    });
    const hash = link.data.properties?.hashed_token;
    if (!hash) {
      throw new Error("The isolated Admin sign-in link was unavailable.");
    }
    await adminPage.goto(`/auth/confirm?type=magiclink&token_hash=${hash}`);
    await expect(adminPage).toHaveURL(/\/admin$/);

    const variantId = await openCheckout(guest, "unused@example.test", "447700900460");
    await adminPage.goto("/admin/orders/drafts/new");
    await adminPage
      .getByRole("textbox", { name: "Search products" })
      .fill("Synthetic Commerce Amber");
    await adminPage.getByRole("button", { name: "Search", exact: true }).click();
    await adminPage.getByRole("combobox", { name: "Variant" }).selectOption(variantId);
    await adminPage.getByRole("button", { name: "Add variant" }).click();
    await adminPage.getByRole("textbox", { name: "Contact name" }).fill("Draft-only Contact");
    await adminPage.getByRole("button", { name: "Save draft" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/orders\/drafts\/[0-9a-f-]+$/);
    await adminPage.getByRole("button", { name: "Issue checkout link" }).click();
    const linkField = adminPage.getByRole("textbox", { name: "Checkout link" });
    await expect(linkField).toBeVisible();
    const checkoutLink = await linkField.inputValue();
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({
      quantity: 2,
    });

    await db.perfumeVariant.update({ where: { id: variantId }, data: { priceMinor: 190_000 } });
    await guest.goto(checkoutLink);
    await expect(guest).toHaveURL(/\/checkout\/quote$/);
    await expect(guest.getByText("Draft-only Contact")).toHaveCount(0);
    await expect(
      guest.getByRole("region", { name: "Order summary" }).getByRole("listitem"),
    ).toContainText("₦1,200");
    await fillCheckout(guest, "quote@example.test", "447700900460");
    await checkoutRedirect(guest, variantId);
    await guest.getByRole("button", { name: "Pay with Paystack" }).click();
    await expect(guest.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
    const order = await db.order.findFirstOrThrow({
      where: { items: { some: { perfumeVariantId: variantId } } },
      select: { id: true, reference: true, subtotalMinor: true },
    });
    expect(order.subtotalMinor).toBe(120_000);

    await adminPage.goto(`/admin/orders/${order.reference}`);
    await adminPage.getByRole("button", { name: "Mark Processing" }).click();
    await adminPage.getByRole("button", { name: "Mark Dispatched" }).click();
    await expect(adminPage.getByRole("button", { name: "Mark Delivered" })).toBeVisible();
    await adminPage.getByLabel("Refund amount (NGN)").fill("500");
    await adminPage.getByLabel("Refund reason").fill("Synthetic partial refund");
    await adminPage.getByRole("button", { name: "Request refund" }).click();
    await expect(adminPage.getByText(/Refund jpscents-refund-/)).toBeVisible();
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({
      quantity: 1,
    });

    await adminPage.getByLabel("Returned item").selectOption(variantId);
    await adminPage.getByLabel("Received quantity").fill("1");
    await adminPage.getByLabel("Return reason").fill("Received unopened bottle");
    await adminPage.getByRole("button", { name: "Record received return" }).click();
    await expect(adminPage.getByText(/Saleable return/i)).toBeVisible();
    expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variantId } })).toMatchObject({
      quantity: 2,
    });
    expect(await db.refund.count({ where: { paymentAttempt: { orderId: order.id } } })).toBe(1);
  } finally {
    await guest.close();
  }
});
