-- NEW and AWAITING_PAYMENT intentionally collapse into AWAITING_PAYMENT, so
-- migrate through a new enum instead of renaming individual enum values.
CREATE TYPE "OrderStatus_new" AS ENUM (
  'AWAITING_PAYMENT',
  'PAID',
  'DELIVERED',
  'CANCELLED'
);

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'AWAITING_PAYMENT'
      WHEN 'AWAITING_PAYMENT' THEN 'AWAITING_PAYMENT'
      WHEN 'CONFIRMED' THEN 'PAID'
      WHEN 'CANCELLED' THEN 'CANCELLED'
    END
  )::"OrderStatus_new";

ALTER TABLE "OrderStatusEvent"
  ALTER COLUMN "fromStatus" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "fromStatus" IS NULL THEN NULL
      WHEN "fromStatus"::text = 'NEW' THEN 'AWAITING_PAYMENT'
      WHEN "fromStatus"::text = 'AWAITING_PAYMENT' THEN 'AWAITING_PAYMENT'
      WHEN "fromStatus"::text = 'CONFIRMED' THEN 'PAID'
      WHEN "fromStatus"::text = 'CANCELLED' THEN 'CANCELLED'
    END
  )::"OrderStatus_new",
  ALTER COLUMN "toStatus" TYPE "OrderStatus_new"
  USING (
    CASE "toStatus"::text
      WHEN 'NEW' THEN 'AWAITING_PAYMENT'
      WHEN 'AWAITING_PAYMENT' THEN 'AWAITING_PAYMENT'
      WHEN 'CONFIRMED' THEN 'PAID'
      WHEN 'CANCELLED' THEN 'CANCELLED'
    END
  )::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "Order"
  ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT'::"OrderStatus";
