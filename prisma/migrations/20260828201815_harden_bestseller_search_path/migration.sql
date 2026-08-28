CREATE OR REPLACE FUNCTION public.enforce_bestseller_eligibility() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
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
    SELECT 1 FROM public."Perfume" p
    WHERE p."id" = target_perfume AND p."isBestseller"
      AND (p."status" <> 'PUBLISHED' OR NOT EXISTS (
        SELECT 1 FROM public."PerfumeVariant" v
        WHERE v."perfumeId" = p."id" AND v."quantity" > 0
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
