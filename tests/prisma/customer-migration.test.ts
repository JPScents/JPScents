import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("customer migration", () => {
  it("backfills normalized customer identities before removing legacy order fields", async () => {
    const migration = await readFile(
      resolve(
        "prisma/migrations/20260903000000_customers_cancellation_delivery_locations/migration.sql",
      ),
      "utf8",
    );

    expect(migration).toContain('INSERT INTO "Customer"');
    expect(migration).toContain('UPDATE "Order" AS orders');
    expect(migration).toContain('ALTER COLUMN "customerId" SET NOT NULL');
    expect(migration).toContain("an email belongs to multiple WhatsApp identities");
    expect(migration).toContain("an Order has no usable WhatsApp number");
    expect(migration).toContain('DROP COLUMN "customerName"');
    expect(migration).toContain('DROP COLUMN "deliveryAddress"');
  });
});
