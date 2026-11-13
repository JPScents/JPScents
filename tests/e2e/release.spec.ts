import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

import { PrismaClient } from "../../src/infrastructure/database/generated/client";

const origin = "http://localhost:3000";
const inbox = "http://127.0.0.1:56324";
const adminEmail = "admin@example.test";
const otherEmail = "shopper@example.test";
const otherPassword = randomUUID();
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPY2OUHAAN5AYrqfl0rAAAAAElFTkSuQmCC",
  "base64",
);

function setting(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing isolated browser configuration: ${name}.`);
  }
  return value;
}

let db: PrismaClient;
let provider: ReturnType<typeof createClient>;

test.beforeAll(async () => {
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: setting("DATABASE_URL") }) });
  provider = createClient(setting("NEXT_PUBLIC_SUPABASE_URL"), setting("JP_E2E_LOCAL_ADMIN_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await provider.auth.admin.listUsers();
  expect(Boolean(existing.error), "local Auth users can be listed").toBe(false);
  const adminUser = existing.data.users.find((user) => user.email === adminEmail);
  const otherUser = existing.data.users.find((user) => user.email === otherEmail);
  const admin = adminUser
    ? { data: { user: adminUser } }
    : await provider.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        app_metadata: { role: "admin" },
      });
  const other = otherUser
    ? await provider.auth.admin.updateUserById(otherUser.id, { password: otherPassword })
    : await provider.auth.admin.createUser({
        email: otherEmail,
        password: otherPassword,
        email_confirm: true,
      });
  expect(Boolean(admin.data.user && other.data.user), "synthetic users provisioned").toBe(true);
});

test.afterAll(async () => {
  await db?.$disconnect();
});

async function perfume(slug: string, quantity: number) {
  return db.perfume.create({
    data: {
      slug,
      name: "Synthetic Amber",
      scentCue: "Amber",
      description: "Synthetic browser test perfume",
      status: "PUBLISHED",
      scentCharacters: ["WARM"],
      occasions: ["EVERYDAY"],
      timesOfDay: ["DAY"],
      variants: { create: { sizeValue: "50", sizeUnit: "ML", priceMinor: 120_000, quantity } },
    },
    include: { variants: true },
  });
}

async function followMagicLink(page: Page, email: string) {
  let link: URL | undefined;
  await expect
    .poll(
      async () => {
        const listing = await fetch(`${inbox}/api/v1/messages`);
        const { messages } = await listing.json();
        const message = messages.find((entry: { To: Array<{ Address: string }> }) =>
          entry.To.some(({ Address }) => Address === email),
        );
        if (!message) {
          return false;
        }
        const response = await fetch(`${inbox}/api/v1/message/${message.ID}`);
        const { HTML } = await response.json();
        const href = HTML.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
        if (href) {
          const candidate = new URL(href);
          if (candidate.origin === origin && candidate.pathname === "/auth/confirm") {
            link = candidate;
          }
        }
        return Boolean(link);
      },
      { timeout: 15_000, message: "local inbox delivered an app sign-in link" },
    )
    .toBe(true);
  if (!link) {
    throw new Error("The local sign-in link was unavailable.");
  }
  await page.goto(link.href);
}

test("guest can retry checkout without a second order and confirmation is private", async ({
  page,
  browser,
}) => {
  const product = await perfume("guest-amber", 1);
  await db.perfume.update({ where: { id: product.id }, data: { isBestseller: true } });
  const [variant] = product.variants;
  await page.goto("/perfumes/guest-amber");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("dialog", { name: "Your cart" })).toBeVisible();
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Synthetic Guest");
  await page.getByLabel("WhatsApp number").fill("08031234567");
  await page.locator('select[autocomplete="address-level1"]').selectOption("Lagos");
  await page.locator('select[autocomplete="address-level2"]').selectOption("Ikeja");
  await page.getByLabel("Delivery address").fill("1 Synthetic Street");

  let lostResponse = false;
  await page.route("**/checkout", async (route) => {
    if (
      !lostResponse &&
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
    ) {
      lostResponse = true;
      await route.fetch({ maxRedirects: 0 });
      await route.fulfill({ status: 503, body: "Synthetic interrupted response" });
      return;
    }
    await route.continue();
  });
  const place = page.getByRole("button", { name: "Place order" });
  await place.click();
  const orderCount = () =>
    db.order.count({ where: { items: { some: { perfumeVariantId: variant.id } } } });
  await expect
    .poll(orderCount, { message: "the first request committed despite the interruption" })
    .toBe(1);
  expect(lostResponse, "the test interrupted the first checkout response").toBe(true);
  await expect(
    page.getByText("Unable to place this order. Please try again.", { exact: true }),
  ).toBeVisible();
  await place.click();
  await expect(page.getByRole("heading", { name: "Your order is confirmed." })).toBeVisible();
  expect(await orderCount()).toBe(1);
  expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
    quantity: 0,
  });
  expect(await db.perfume.findUniqueOrThrow({ where: { id: product.id } })).toMatchObject({
    isBestseller: false,
  });
  await expect(page.getByText("1 Synthetic Street")).toHaveCount(0);

  const signedOut = await browser.newPage();
  try {
    await signedOut.goto(`${origin}/checkout/confirm`);
    await expect(
      signedOut.getByRole("heading", { name: /can’t find that order confirmation/ }),
    ).toBeVisible();
  } finally {
    await signedOut.close();
  }
});

test("Admin magic link allows delivery settings, image upload, stock conflict handling and cancellation", async ({
  page,
}) => {
  const product = await perfume("admin-amber", 1);
  const [variant] = product.variants;
  const customer = await db.customer.create({
    data: {
      name: "Synthetic Customer",
      whatsappNumber: "2348039999999",
      deliveryState: "Lagos",
      deliveryCity: "Ikeja",
      deliveryAddress: "2 Synthetic Street",
    },
  });
  const order = await db.order.create({
    data: {
      customerId: customer.id,
      reference: "JP-E2EADMIN",
      confirmationToken: randomUUID(),
      submissionKey: randomUUID(),
      subtotalMinor: 120_000,
      items: { create: { perfumeVariantId: variant.id, quantity: 1, unitPriceMinor: 120_000 } },
    },
  });

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(/secure sign-in link is on its way/)).toBeVisible();
  await followMagicLink(page, adminEmail);
  const callbackDestination = new URL(page.url());
  expect(callbackDestination.pathname, "Admin magic link callback destination").toBe("/admin");

  await page.goto("/admin/delivery");
  await expect(page.getByRole("heading", { name: "Delivery" })).toBeVisible();
  const deliveryFee = page.getByRole("textbox", { name: "Lagos delivery fee (NGN)" });
  const saveDelivery = page.getByRole("button", { name: "Save delivery settings" });
  await page.getByRole("checkbox", { name: "Lagos", exact: true }).check();
  await deliveryFee.fill("1500.25");
  await saveDelivery.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Delivery settings saved" }),
  ).toBeVisible();
  expect(
    await db.deliveryDestination.findUniqueOrThrow({ where: { state: "Lagos" } }),
  ).toMatchObject({
    enabled: true,
    feeMinor: 150_025,
    version: 1,
  });
  await db.deliveryDestination.update({
    where: { state: "Lagos" },
    data: { feeMinor: 160_000, version: { increment: 1 } },
  });
  await deliveryFee.fill("1400");
  await saveDelivery.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Delivery settings changed" }),
  ).toBeVisible();
  await expect(deliveryFee).toHaveValue("1400");
  expect(
    await db.deliveryDestination.findUniqueOrThrow({ where: { state: "Lagos" } }),
  ).toMatchObject({
    feeMinor: 160_000,
    version: 2,
  });

  const editUrl = `/admin/perfumes/${product.id}`;
  await page.goto(editUrl);
  await page.locator('input[type="file"]').setInputFiles({
    name: "bottle.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByLabel(/Alt text/i).fill("Synthetic bottle");
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: /^Upload image$/ })
    .click();
  await expect.poll(() => db.perfumeImage.count({ where: { perfumeId: product.id } })).toBe(1);

  const storefront = await page.context().browser()!.newPage();
  try {
    await storefront.goto(`${origin}/perfumes/admin-amber`);
    const image = storefront.getByRole("img", { name: "Synthetic bottle" }).first();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  } finally {
    await storefront.close();
  }

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await db.perfumeVariant.update({ where: { id: variant.id }, data: { quantity: 0 } });
  await page.getByLabel("Quantity").fill("5");
  await page.getByRole("button", { name: "Save variant" }).click();
  await expect(page.getByRole("alert")).toContainText("Stock changed");
  await page.reload();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Price (NGN)").fill("1500");
  await page.getByRole("button", { name: "Save variant" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
    quantity: 0,
    priceMinor: 150_000,
  });

  await page.goto(`/admin/orders/${order.reference}`);
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByRole("button", { name: "Order cancelled" })).toBeDisabled();
  expect(await db.perfumeVariant.findUniqueOrThrow({ where: { id: variant.id } })).toMatchObject({
    quantity: 1,
  });
});

test("a signed-in non-Admin cannot open Admin or write private image objects", async ({ page }) => {
  const unprivileged = createClient(
    setting("NEXT_PUBLIC_SUPABASE_URL"),
    setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const otp = await unprivileged.auth.signInWithOtp({
    email: otherEmail,
    options: { emailRedirectTo: `${origin}/auth/confirm`, shouldCreateUser: false },
  });
  expect(Boolean(otp.error)).toBe(false);
  await followMagicLink(page, otherEmail);
  await page.goto("/admin/perfumes");
  await expect(page).toHaveURL(/\/admin\/login/);

  const session = await unprivileged.auth.signInWithPassword({
    email: otherEmail,
    password: otherPassword,
  });
  expect(Boolean(session.data.session), "synthetic non-Admin authenticated with the provider").toBe(
    true,
  );
  const upload = await unprivileged.storage
    .from("perfume-images")
    .upload("perfumes/denied.png", photo, {
      contentType: "image/png",
    });
  expect(Boolean(upload.error), "private image write denied").toBe(true);
  expect(upload.data).toBeNull();
});
