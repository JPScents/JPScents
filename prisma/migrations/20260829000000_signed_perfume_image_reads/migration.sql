-- Product photography is customer-visible catalogue media. The bucket stays
-- private: visitors may request a short-lived signed read URL only for objects
-- in the catalogue prefix, while every write remains Admin-only.
UPDATE storage.buckets SET public = false WHERE id = 'perfume-images';

DROP POLICY IF EXISTS "Admins manage perfume images" ON storage.objects;

CREATE POLICY "Catalogue perfume images are readable" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'perfume-images'
  AND (storage.foldername(name))[1] = 'perfumes'
);

CREATE POLICY "Admins upload perfume image objects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'perfume-images'
  AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  AND (storage.foldername(name))[1] = 'perfumes'
);

CREATE POLICY "Admins update perfume image objects" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'perfume-images'
  AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  bucket_id = 'perfume-images'
  AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  AND (storage.foldername(name))[1] = 'perfumes'
);

CREATE POLICY "Admins delete perfume image objects" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'perfume-images'
  AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);
