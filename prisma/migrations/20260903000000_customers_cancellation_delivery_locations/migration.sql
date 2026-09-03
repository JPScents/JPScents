-- Customers own current contact and delivery information. Existing Orders are
-- linked to a deduplicated Customer before the copied legacy columns are removed.
-- Do not proceed if legacy identifiers cannot become unique Customers without
-- discarding information or silently merging records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Order" AS orders
    WHERE REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') = ''
  ) THEN
    RAISE EXCEPTION 'Cannot migrate Customers: an Order has no usable WhatsApp number.';
  END IF;

  IF EXISTS (
    WITH normalized_orders AS (
      SELECT
        CASE
          WHEN REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') ~ '^0[0-9]{10}$'
            THEN '234' || SUBSTRING(REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') FROM 2)
          ELSE REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g')
        END AS "normalizedWhatsappNumber",
        NULLIF(LOWER(BTRIM(orders."email")), '') AS "email"
      FROM "Order" AS orders
    )
    SELECT 1
    FROM normalized_orders
    WHERE "email" IS NOT NULL
    GROUP BY "email"
    HAVING COUNT(DISTINCT "normalizedWhatsappNumber") > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate Customers: an email belongs to multiple WhatsApp identities.';
  END IF;
END;
$$;

CREATE TABLE "Customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "whatsappNumber" TEXT NOT NULL,
  "email" TEXT,
  "deliveryState" TEXT NOT NULL,
  "deliveryCity" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
  ADD COLUMN "customerId" UUID,
  ADD COLUMN "stockRestoredAt" TIMESTAMPTZ;

-- Each legacy WhatsApp number creates exactly one Customer. Email is preserved
-- only when it belongs to a single WhatsApp identity, avoiding unsafe merges.
WITH normalized_orders AS (
  SELECT
    orders.*,
    CASE
      WHEN REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') ~ '^0[0-9]{10}$'
        THEN '234' || SUBSTRING(REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') FROM 2)
      ELSE REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g')
    END AS "normalizedWhatsappNumber"
  FROM "Order" AS orders
), latest_order AS (
  SELECT DISTINCT ON ("normalizedWhatsappNumber")
    "customerName",
    "normalizedWhatsappNumber",
    NULLIF(LOWER(BTRIM("email")), '') AS "email",
    "deliveryArea",
    "deliveryAddress",
    "createdAt",
    "updatedAt"
  FROM normalized_orders
  ORDER BY "normalizedWhatsappNumber", "createdAt" DESC
), email_owners AS (
  SELECT "email"
  FROM (
    SELECT
      NULLIF(LOWER(BTRIM("email")), '') AS "email",
      COUNT(DISTINCT "normalizedWhatsappNumber") AS "whatsappCount"
    FROM normalized_orders
    WHERE "email" IS NOT NULL
    GROUP BY NULLIF(LOWER(BTRIM("email")), '')
  ) grouped
  WHERE "email" IS NOT NULL AND "whatsappCount" = 1
)
INSERT INTO "Customer" (
  "name", "whatsappNumber", "email", "deliveryState", "deliveryCity", "deliveryAddress", "createdAt", "updatedAt"
)
SELECT
  latest_order."customerName",
  latest_order."normalizedWhatsappNumber",
  CASE WHEN email_owners."email" IS NOT NULL THEN latest_order."email" END,
  'Other',
  latest_order."deliveryArea",
  latest_order."deliveryAddress",
  latest_order."createdAt",
  latest_order."updatedAt"
FROM latest_order
LEFT JOIN email_owners ON email_owners."email" = latest_order."email";

WITH normalized_orders AS (
  SELECT
    orders."id",
    CASE
      WHEN REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') ~ '^0[0-9]{10}$'
        THEN '234' || SUBSTRING(REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g') FROM 2)
      ELSE REGEXP_REPLACE(orders."whatsappNumber", '[^0-9]', '', 'g')
    END AS "normalizedWhatsappNumber"
  FROM "Order" AS orders
)
UPDATE "Order" AS orders
SET "customerId" = customer."id"
FROM normalized_orders, "Customer" AS customer
WHERE orders."id" = normalized_orders."id"
  AND customer."whatsappNumber" = normalized_orders."normalizedWhatsappNumber";

ALTER TABLE "Order"
  ALTER COLUMN "customerId" SET NOT NULL,
  ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  DROP COLUMN "customerName",
  DROP COLUMN "whatsappNumber",
  DROP COLUMN "email",
  DROP COLUMN "deliveryArea",
  DROP COLUMN "deliveryAddress";

CREATE UNIQUE INDEX "Customer_whatsappNumber_key" ON "Customer"("whatsappNumber");
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- Application tables are server-only through Prisma. Preserve the same
-- no-Data-API boundary already applied to the existing domain tables.
REVOKE ALL ON TABLE "Customer" FROM anon, authenticated;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
