CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'AMBIGUOUS', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'NEEDS_ATTENTION');
CREATE TYPE "OrderCapabilityPurpose" AS ENUM ('STATUS', 'PAY_QUOTE');

ALTER TABLE "Order" ADD COLUMN "paidAttemptId" UUID;
ALTER TABLE "Order" ADD COLUMN "statusTokenNonce" TEXT;
CREATE UNIQUE INDEX "Order_id_paidAttemptId_key" ON "Order" ("id", "paidAttemptId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_id_paidAttemptId_fkey"
  FOREIGN KEY ("id", "paidAttemptId") REFERENCES "PaymentAttempt" ("orderId", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "initialiseStartedAt" TIMESTAMP(3),
  ADD COLUMN "providerId" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "issue" TEXT,
  ADD COLUMN "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseId" UUID,
  ADD COLUMN "leaseUntil" TIMESTAMP(3),
  ADD CONSTRAINT "PaymentAttempt_lease" CHECK (("leaseId" IS NULL) = ("leaseUntil" IS NULL));
CREATE INDEX "PaymentAttempt_status_nextCheckAt_idx" ON "PaymentAttempt" ("status", "nextCheckAt");
CREATE UNIQUE INDEX "PaymentAttempt_verified_provider_id" ON "PaymentAttempt" ("environment", "providerId")
  WHERE "providerId" IS NOT NULL;

CREATE TABLE "Refund" (
  "id" UUID NOT NULL PRIMARY KEY,
  "paymentAttemptId" UUID NOT NULL REFERENCES "PaymentAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "providerReference" TEXT NOT NULL UNIQUE,
  "requestKey" TEXT NOT NULL UNIQUE,
  "reason" TEXT NOT NULL CHECK (length(btrim("reason")) > 0),
  "requestedBy" UUID,
  "amountMinor" INTEGER NOT NULL CHECK ("amountMinor" > 0),
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "issue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseId" UUID,
  "leaseUntil" TIMESTAMP(3),
  CHECK (("leaseId" IS NULL) = ("leaseUntil" IS NULL))
);
CREATE INDEX "Refund_paymentAttemptId_status_idx" ON "Refund" ("paymentAttemptId", "status");
CREATE INDEX "Refund_status_nextCheckAt_idx" ON "Refund" ("status", "nextCheckAt");

CREATE TABLE "PaystackReceipt" (
  "id" UUID NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "environment" "PaymentEnvironment" NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseId" UUID,
  "leaseUntil" TIMESTAMP(3),
  UNIQUE ("kind", "providerReference", "environment"),
  CHECK (("leaseId" IS NULL) = ("leaseUntil" IS NULL))
);
CREATE INDEX "PaystackReceipt_processedAt_nextCheckAt_idx" ON "PaystackReceipt" ("processedAt", "nextCheckAt");

CREATE TABLE "OrderCapability" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "purpose" "OrderCapabilityPurpose" NOT NULL,
  "hash" CHAR(64) NOT NULL UNIQUE CHECK ("hash" ~ '^[0-9a-f]{64}$'),
  "quoteVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CHECK ("expiresAt" > "createdAt" AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")),
  CHECK (("purpose" = 'PAY_QUOTE' AND "quoteVersion" IS NOT NULL AND "quoteVersion" > 0)
    OR ("purpose" = 'STATUS' AND "quoteVersion" IS NULL))
);
CREATE INDEX "OrderCapability_orderId_purpose_idx" ON "OrderCapability" ("orderId", "purpose");

CREATE TABLE "CommerceReconciliationRun" (
  "id" UUID NOT NULL PRIMARY KEY,
  "trigger" TEXT NOT NULL CHECK ("trigger" IN ('SCHEDULED', 'ADMIN')),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expired" INTEGER NOT NULL DEFAULT 0,
  "payments" INTEGER NOT NULL DEFAULT 0,
  "refunds" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "CommerceReconciliationRun_startedAt_idx" ON "CommerceReconciliationRun" ("startedAt");

REVOKE ALL ON TABLE "Refund", "PaystackReceipt", "OrderCapability", "CommerceReconciliationRun"
  FROM PUBLIC, anon, authenticated;
ALTER TABLE "Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Refund" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PaystackReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaystackReceipt" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderCapability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderCapability" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CommerceReconciliationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommerceReconciliationRun" FORCE ROW LEVEL SECURITY;
