import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createPublicSupabaseClient } from "./client";

const PERFUME_IMAGE_BUCKET = "perfume-images";

export async function getPerfumeImageUrl(path?: string) {
  if (!path) {
    return undefined;
  }
  if (path.startsWith("/")) {
    return path;
  }

  try {
    const supabase = createPublicSupabaseClient();
    const result = await supabase.storage.from(PERFUME_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
    return result.error ? undefined : result.data.signedUrl;
  } catch {
    return undefined;
  }
}

type StorageBucket = ReturnType<SupabaseClient["storage"]["from"]>;

export type CreateImageStorageClient = () => Promise<{
  storage: { from(bucket: string): Pick<StorageBucket, "upload" | "remove"> };
}>;

export async function uploadCatalogueImage(
  path: string,
  file: File,
  createClient: CreateImageStorageClient,
) {
  const supabase = await createClient();
  return supabase.storage.from(PERFUME_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
}

export async function removeCatalogueImages(
  paths: string[],
  createClient: CreateImageStorageClient,
) {
  const supabase = await createClient();
  return supabase.storage.from(PERFUME_IMAGE_BUCKET).remove(paths);
}
