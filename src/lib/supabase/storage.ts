import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const PERFUME_IMAGE_BUCKET = "perfume-images";

export async function getPerfumeImageUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("/")) return path;

  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.storage.from(PERFUME_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
    return result.error ? undefined : result.data.signedUrl;
  } catch {
    return undefined;
  }
}
