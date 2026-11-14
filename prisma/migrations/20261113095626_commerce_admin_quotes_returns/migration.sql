CREATE TYPE "CheckoutDraftStatus" AS ENUM ('DRAFT', 'ISSUED', 'REVOKED', 'CHECKED_OUT');

ALTER TABLE "StockMovement"
  ADD COLUMN "returnKey" TEXT,
  ADD COLUMN "returnedBy" UUID,
  ADD COLUMN "returnReason" TEXT,
  ADD CONSTRAINT "StockMovement_return_audit" CHECK (
    CASE WHEN "kind" = 'RETURN' THEN
      "returnKey" IS NOT NULL AND "returnedBy" IS NOT NULL AND NULLIF(btrim("returnReason"), '') IS NOT NULL
    ELSE "returnKey" IS NULL AND "returnedBy" IS NULL AND "returnReason" IS NULL
    END
  );
CREATE UNIQUE INDEX "StockMovement_orderId_perfumeVariantId_returnKey_key"
  ON "StockMovement" ("orderId", "perfumeVariantId", "returnKey");
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_reservationId_perfumeVariantId_kind_key";
CREATE UNIQUE INDEX "StockMovement_one_effect_per_reservation_line"
  ON "StockMovement" ("reservationId", "perfumeVariantId", "kind") WHERE "kind" IN ('RESERVE', 'ALLOCATE');

CREATE TABLE "CheckoutDraft" (
  "id" UUID NOT NULL PRIMARY KEY,
  "status" "CheckoutDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" >= 0),
  "capabilityHash" CHAR(64) UNIQUE,
  "expiresAt" TIMESTAMP(3),
  "orderId" UUID UNIQUE REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "createdBy" UUID NOT NULL,
  "updatedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CHECK (("capabilityHash" IS NULL) = ("expiresAt" IS NULL)),
  CHECK ("capabilityHash" IS NULL OR "capabilityHash" ~ '^[0-9a-f]{64}$'),
  CHECK (("status" = 'CHECKED_OUT') = ("orderId" IS NOT NULL)),
  CHECK ("status" NOT IN ('ISSUED', 'CHECKED_OUT') OR "capabilityHash" IS NOT NULL)
);
CREATE INDEX "CheckoutDraft_updatedAt_idx" ON "CheckoutDraft" ("updatedAt");

CREATE TABLE "CheckoutDraftLine" (
  "draftId" UUID NOT NULL REFERENCES "CheckoutDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "perfumeVariantId" UUID NOT NULL REFERENCES "PerfumeVariant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 99),
  "quotedPriceMinor" INTEGER CHECK ("quotedPriceMinor" >= 0),
  PRIMARY KEY ("draftId", "perfumeVariantId")
);

CREATE TABLE "CommerceOrderEvent" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" TEXT NOT NULL,
  "actorId" UUID,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CommerceOrderEvent_orderId_createdAt_idx" ON "CommerceOrderEvent" ("orderId", "createdAt");

REVOKE ALL ON TABLE "CheckoutDraft", "CheckoutDraftLine", "CommerceOrderEvent" FROM PUBLIC, anon, authenticated;
ALTER TABLE "CheckoutDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutDraft" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutDraftLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutDraftLine" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CommerceOrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceOrderEvent" FORCE ROW LEVEL SECURITY;
