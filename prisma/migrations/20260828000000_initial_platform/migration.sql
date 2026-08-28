-- Prisma is the schema and migration authority. This migration adds the Postgres
-- constraints, RLS, and Storage policies that Prisma Schema does not express.
CREATE TYPE "PerfumeStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "ScentCharacter" AS ENUM ('FRESH', 'WARM', 'SWEET', 'WOODY');
CREATE TYPE "Occasion" AS ENUM ('EVERYDAY', 'WORK', 'DATE_NIGHT', 'SPECIAL_OCCASION');
CREATE TYPE "TimeOfDay" AS ENUM ('DAY', 'NIGHT');
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'AWAITING_PAYMENT', 'CANCELLED');

CREATE TABLE "Perfume" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "scentCue" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "PerfumeStatus" NOT NULL DEFAULT 'DRAFT',
  "scentCharacters" "ScentCharacter"[] NOT NULL,
  "occasions" "Occasion"[] NOT NULL,
  "timesOfDay" "TimeOfDay"[] NOT NULL,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isBestseller" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Perfume_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PerfumeImage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "perfumeId" UUID NOT NULL,
  "path" TEXT NOT NULL,
  "altText" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerfumeImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PerfumeImage_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PerfumeImage_position_nonnegative" CHECK ("position" >= 0)
);

CREATE TABLE "PerfumeVariant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "perfumeId" UUID NOT NULL,
  "sizeValue" DECIMAL(8,2) NOT NULL,
  "sizeUnit" TEXT NOT NULL,
  "priceMinor" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerfumeVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PerfumeVariant_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PerfumeVariant_size_positive" CHECK ("sizeValue" > 0),
  CONSTRAINT "PerfumeVariant_price_nonnegative" CHECK ("priceMinor" >= 0),
  CONSTRAINT "PerfumeVariant_quantity_nonnegative" CHECK ("quantity" >= 0),
  CONSTRAINT "PerfumeVariant_size_unit" CHECK ("sizeUnit" = 'ML')
);

CREATE TABLE "Order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference" TEXT NOT NULL,
  "confirmationToken" TEXT NOT NULL,
  "submissionKey" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "whatsappNumber" TEXT NOT NULL,
  "email" TEXT,
  "deliveryArea" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "orderNote" TEXT,
  "subtotalMinor" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_subtotal_nonnegative" CHECK ("subtotalMinor" >= 0)
);

CREATE TABLE "OrderItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "perfumeVariantId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_perfumeVariantId_fkey" FOREIGN KEY ("perfumeVariantId") REFERENCES "PerfumeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "OrderItem_unit_price_nonnegative" CHECK ("unitPriceMinor" >= 0)
);

CREATE TABLE "OrderStatusEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Perfume_slug_key" ON "Perfume"("slug");
CREATE INDEX "Perfume_status_idx" ON "Perfume"("status");
CREATE INDEX "Perfume_isFeatured_idx" ON "Perfume"("isFeatured");
CREATE UNIQUE INDEX "PerfumeImage_path_key" ON "PerfumeImage"("path");
CREATE UNIQUE INDEX "PerfumeImage_perfumeId_position_key" ON "PerfumeImage"("perfumeId", "position");
CREATE INDEX "PerfumeImage_perfumeId_position_idx" ON "PerfumeImage"("perfumeId", "position");
CREATE UNIQUE INDEX "PerfumeVariant_perfumeId_sizeValue_sizeUnit_key" ON "PerfumeVariant"("perfumeId", "sizeValue", "sizeUnit");
CREATE INDEX "PerfumeVariant_perfumeId_idx" ON "PerfumeVariant"("perfumeId");
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE UNIQUE INDEX "Order_confirmationToken_key" ON "Order"("confirmationToken");
CREATE UNIQUE INDEX "Order_submissionKey_key" ON "Order"("submissionKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_perfumeVariantId_idx" ON "OrderItem"("perfumeVariantId");
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- Only one perfume can be selected as Bestseller. A trigger additionally keeps
-- the selection meaningful when publication status or stock changes.
CREATE UNIQUE INDEX "one_bestseller" ON "Perfume" (("isBestseller")) WHERE "isBestseller";

CREATE FUNCTION public.enforce_bestseller_eligibility() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_perfume UUID;
BEGIN
  IF TG_TABLE_NAME = 'PerfumeVariant' THEN
    target_perfume := CASE
      WHEN TG_OP = 'DELETE' THEN OLD."perfumeId"
      ELSE NEW."perfumeId"
    END;
  ELSE
    target_perfume := CASE
      WHEN TG_OP = 'DELETE' THEN OLD."id"
      ELSE NEW."id"
    END;
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Perfume" p
    WHERE p."id" = target_perfume AND p."isBestseller"
      AND (p."status" <> 'PUBLISHED' OR NOT EXISTS (
        SELECT 1 FROM "PerfumeVariant" v WHERE v."perfumeId" = p."id" AND v."quantity" > 0
      ))
  ) THEN
    RAISE EXCEPTION 'A Bestseller must remain published and in stock';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Perfume_bestseller_eligibility"
AFTER INSERT OR UPDATE OF "isBestseller", "status" ON "Perfume"
FOR EACH ROW EXECUTE FUNCTION public.enforce_bestseller_eligibility();
CREATE TRIGGER "PerfumeVariant_bestseller_eligibility"
AFTER INSERT OR UPDATE OF "quantity", "perfumeId" OR DELETE ON "PerfumeVariant"
FOR EACH ROW EXECUTE FUNCTION public.enforce_bestseller_eligibility();

-- The Data API receives no application-table access. Prisma runs as the trusted
-- Postgres role on the Next.js server; RLS is a defense-in-depth boundary.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER TABLE "Perfume" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PerfumeImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PerfumeVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderStatusEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Perfume" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PerfumeImage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PerfumeVariant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderStatusEvent" FORCE ROW LEVEL SECURITY;

-- Product images stay private until the public catalogue explicitly chooses a
-- read strategy. Only a trusted Admin app_metadata role can manage this bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('perfume-images', 'perfume-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Admins manage perfume images" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'perfume-images'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  bucket_id = 'perfume-images'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  AND (storage.foldername(name))[1] = 'perfumes'
);
