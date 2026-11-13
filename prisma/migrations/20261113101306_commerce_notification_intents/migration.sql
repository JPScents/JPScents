CREATE TYPE "OrderNotificationKind" AS ENUM ('PAYMENT_CONFIRMED', 'DISPATCHED', 'CANCELLED', 'REFUND_PROGRESS');
CREATE TYPE "OrderNotificationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'NEEDS_ATTENTION');

ALTER TABLE "Refund" ADD COLUMN "operatorRecheck" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CommerceReconciliationRun"
  ADD COLUMN "notifications" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "errorCounts" JSONB;
CREATE INDEX "CommerceReconciliationRun_trigger_errors_completedAt_idx"
  ON "CommerceReconciliationRun" ("trigger", "errors", "completedAt");

CREATE TABLE "OrderNotification" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventKey" TEXT NOT NULL UNIQUE,
  "kind" "OrderNotificationKind" NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "OrderNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "sender" TEXT,
  "statusLinkBase" TEXT,
  "statusKeyVersion" TEXT,
  "statusTokenHash" CHAR(64),
  "firstAttemptAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseId" UUID,
  "leaseUntil" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "issue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("leaseId" IS NULL) = ("leaseUntil" IS NULL)),
  CHECK (num_nonnulls("sender", "statusLinkBase", "statusKeyVersion", "statusTokenHash", "firstAttemptAt") IN (0, 5)),
  CHECK (("attempts" = 0) = ("firstAttemptAt" IS NULL)),
  CHECK (("acceptedAt" IS NOT NULL) = ("status" = 'ACCEPTED')),
  CHECK (("providerMessageId" IS NOT NULL) = ("status" = 'ACCEPTED'))
);
CREATE INDEX "OrderNotification_status_nextAttemptAt_idx" ON "OrderNotification" ("status", "nextAttemptAt");
CREATE INDEX "OrderNotification_orderId_createdAt_idx" ON "OrderNotification" ("orderId", "createdAt");

REVOKE ALL ON TABLE "OrderNotification" FROM PUBLIC, anon, authenticated;
ALTER TABLE "OrderNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderNotification" FORCE ROW LEVEL SECURITY;
