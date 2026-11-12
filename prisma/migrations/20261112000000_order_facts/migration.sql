ALTER TABLE "Order"
  ADD COLUMN "customerNameSnapshot" TEXT,
  ADD COLUMN "whatsappNumberSnapshot" TEXT,
  ADD COLUMN "emailSnapshot" TEXT,
  ADD COLUMN "deliveryStateSnapshot" TEXT,
  ADD COLUMN "deliveryCitySnapshot" TEXT,
  ADD COLUMN "deliveryAddressSnapshot" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "perfumeNameSnapshot" TEXT,
  ADD COLUMN "sizeValueSnapshot" DECIMAL(8,2),
  ADD COLUMN "sizeUnitSnapshot" TEXT;
