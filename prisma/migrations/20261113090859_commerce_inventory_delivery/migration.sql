CREATE TYPE "OrderKind" AS ENUM ('LEGACY_MANUAL', 'COMMERCE');
CREATE TYPE "CommerceOrderStatus" AS ENUM ('AWAITING_PAYMENT', 'RESERVATION_EXPIRED', 'PAID', 'REFUND_REQUIRED', 'CANCELLED');
CREATE TYPE "FulfilmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'DISPATCHED', 'DELIVERED');
CREATE TYPE "PaymentEnvironment" AS ENUM ('TEST', 'LIVE');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATING', 'PENDING', 'AMBIGUOUS', 'FAILED', 'SUCCEEDED', 'NEEDS_ATTENTION');
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONSUMED', 'RELEASED');
CREATE TYPE "StockMovementKind" AS ENUM ('RESERVE', 'ALLOCATE', 'RELEASE', 'RETURN');

ALTER TABLE "Order"
  ADD COLUMN "kind" "OrderKind" NOT NULL DEFAULT 'LEGACY_MANUAL',
  ADD COLUMN "commerceStatus" "CommerceOrderStatus",
  ADD COLUMN "checkoutSessionHash" CHAR(64),
  ADD COLUMN "fulfilmentStatus" "FulfilmentStatus",
  ADD COLUMN "currency" CHAR(3),
  ADD COLUMN "deliveryFeeMinor" INTEGER,
  ADD COLUMN "totalMinor" INTEGER,
  ADD COLUMN "deliveryCountry" CHAR(2),
  ADD COLUMN "deliveryApartment" TEXT,
  ADD COLUMN "deliveryLandmark" TEXT,
  ADD COLUMN "deliveryPostcode" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledBy" UUID,
  ADD COLUMN "cancellationReason" TEXT,
  ADD CONSTRAINT "Order_commerce_facts" CHECK (
    CASE WHEN "kind" = 'COMMERCE' THEN
      "commerceStatus" IS NOT NULL AND "fulfilmentStatus" IS NOT NULL
      AND "status" = 'AWAITING_PAYMENT' AND "stockRestoredAt" IS NULL
      AND "checkoutSessionHash" IS NOT NULL AND "checkoutSessionHash" ~ '^[0-9a-f]{64}$'
      AND "currency" IS NOT DISTINCT FROM 'NGN'
      AND "deliveryCountry" IS NOT DISTINCT FROM 'NG'
      AND "deliveryFeeMinor" IS NOT NULL AND "deliveryFeeMinor" >= 0
      AND "totalMinor" IS NOT NULL AND "totalMinor" > 0
      AND "totalMinor"::bigint = "subtotalMinor"::bigint + "deliveryFeeMinor"
      AND NULLIF(btrim("customerNameSnapshot"), '') IS NOT NULL
      AND NULLIF(btrim("emailSnapshot"), '') IS NOT NULL
      AND NULLIF(btrim("whatsappNumberSnapshot"), '') IS NOT NULL
      AND NULLIF(btrim("deliveryStateSnapshot"), '') IS NOT NULL
      AND NULLIF(btrim("deliveryCitySnapshot"), '') IS NOT NULL
      AND NULLIF(btrim("deliveryAddressSnapshot"), '') IS NOT NULL
      AND (("commerceStatus" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
      AND (("cancelledAt" IS NULL AND "cancelledBy" IS NULL AND "cancellationReason" IS NULL)
        OR ("cancelledAt" IS NOT NULL AND "cancelledBy" IS NOT NULL AND NULLIF(btrim("cancellationReason"), '') IS NOT NULL))
    ELSE
      "commerceStatus" IS NULL AND "fulfilmentStatus" IS NULL AND "currency" IS NULL
      AND "checkoutSessionHash" IS NULL
      AND "deliveryFeeMinor" IS NULL AND "totalMinor" IS NULL AND "deliveryCountry" IS NULL
    END
  );

CREATE TABLE "DeliveryDestination" (
  "state" TEXT NOT NULL PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "feeMinor" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" UUID,
  CONSTRAINT "DeliveryDestination_fee_and_version" CHECK (
    ("feeMinor" IS NULL OR "feeMinor" >= 0) AND (NOT "enabled" OR "feeMinor" IS NOT NULL)
    AND "version" >= 0
  )
);

INSERT INTO "DeliveryDestination" ("state") VALUES
  ('Abia'), ('Adamawa'), ('Akwa Ibom'), ('Anambra'), ('Bauchi'), ('Bayelsa'), ('Benue'),
  ('Borno'), ('Cross River'), ('Delta'), ('Ebonyi'), ('Edo'), ('Ekiti'), ('Enugu'), ('FCT'),
  ('Gombe'), ('Imo'), ('Jigawa'), ('Kaduna'), ('Kano'), ('Katsina'), ('Kebbi'), ('Kogi'),
  ('Kwara'), ('Lagos'), ('Nasarawa'), ('Niger'), ('Ogun'), ('Ondo'), ('Osun'), ('Oyo'),
  ('Plateau'), ('Rivers'), ('Sokoto'), ('Taraba'), ('Yobe'), ('Zamfara');

CREATE TABLE "PaymentAttempt" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "providerReference" TEXT NOT NULL UNIQUE,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
  "currency" CHAR(3) NOT NULL CHECK ("currency" = 'NGN'),
  "environment" "PaymentEnvironment" NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("orderId", "id")
);

CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt" ("orderId", "createdAt");
-- An unresolved attempt must be reconciled before this order can accept a new attempt.
CREATE UNIQUE INDEX "PaymentAttempt_one_active_per_order" ON "PaymentAttempt" ("orderId")
WHERE "status" IN ('INITIATING', 'PENDING', 'AMBIGUOUS', 'NEEDS_ATTENTION');

CREATE FUNCTION "guard_legacy_order_update"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  -- A pre-commerce app can still read these rows during an expand rollout.
  IF OLD."kind" = 'COMMERCE' AND (
    NEW."kind" IS DISTINCT FROM OLD."kind"
    OR NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."stockRestoredAt" IS DISTINCT FROM OLD."stockRestoredAt"
  ) THEN
    RAISE EXCEPTION 'Legacy writes cannot change commerce orders' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Order_guard_legacy_update"
BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION "guard_legacy_order_update"();
REVOKE ALL ON FUNCTION "guard_legacy_order_update"() FROM PUBLIC, anon, authenticated;

CREATE TABLE "StockReservation" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "paymentAttemptId" UUID NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("orderId", "paymentAttemptId"),
  UNIQUE ("orderId", "id"),
  FOREIGN KEY ("orderId", "paymentAttemptId") REFERENCES "PaymentAttempt" ("orderId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_status_dates" CHECK (
    "expiresAt" > "createdAt" AND (("status" = 'HELD') = ("closedAt" IS NULL))
    AND ("closedAt" IS NULL OR "closedAt" >= "createdAt")
  )
);

CREATE INDEX "StockReservation_status_expiresAt_idx" ON "StockReservation" ("status", "expiresAt");
CREATE UNIQUE INDEX "StockReservation_one_hold_per_order" ON "StockReservation" ("orderId")
WHERE "status" = 'HELD';

CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reservationId" UUID,
  "perfumeVariantId" UUID NOT NULL REFERENCES "PerfumeVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" "StockMovementKind" NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("reservationId", "perfumeVariantId", "kind"),
  FOREIGN KEY ("orderId", "reservationId") REFERENCES "StockReservation" ("orderId", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_reservation_scope" CHECK (
    ("kind" = 'RETURN' AND "reservationId" IS NULL) OR
    ("kind" <> 'RETURN' AND "reservationId" IS NOT NULL)
  )
);

CREATE INDEX "StockMovement_orderId_kind_idx" ON "StockMovement" ("orderId", "kind");

REVOKE ALL ON TABLE "DeliveryDestination", "PaymentAttempt", "StockReservation", "StockMovement"
  FROM PUBLIC, anon, authenticated;
ALTER TABLE "DeliveryDestination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryDestination" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockReservation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
