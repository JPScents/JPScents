import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  replacePrimaryImage,
  removePrimaryImageRecord,
} from "../repositories/perfume-image.repository";
import type { ImageActionState } from "../types";

export async function uploadPerfumeImage(perfumeId: string, file: File) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `perfumes/${perfumeId}/${randomUUID()}.${extension}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from("perfume-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error("Image upload failed.");
  }
  return path;
}

export async function removePerfumeImageFiles(paths: string[]) {
  // Demo assets are served from public/, not the storage bucket.
  const storedPaths = paths.filter((path) => !path.startsWith("/"));
  if (!storedPaths.length) {
    return true;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from("perfume-images").remove(storedPaths);
    if (!error) {
      return true;
    }
  } catch {
    // Both transport failures and storage error responses require operator attention.
  }
  console.error("Catalogue image cleanup failed; unused storage files may remain.");
  return false;
}

export async function savePrimaryImageAsset(
  perfumeId: string,
  file: File,
  altText: string,
): Promise<ImageActionState> {
  let path: string;
  try {
    path = await uploadPerfumeImage(perfumeId, file);
  } catch {
    return { error: "Image upload failed. Please try again." };
  }
  let previousPaths: string[];
  try {
    previousPaths = await replacePrimaryImage(perfumeId, path, altText);
  } catch {
    console.error("Catalogue image metadata save failed.");
    await removePerfumeImageFiles([path]);
    return { error: "Image metadata could not be saved. Please try again." };
  }
  await removePerfumeImageFiles(previousPaths);
  return { ok: true };
}

export async function removePrimaryImageAsset(perfumeId: string): Promise<ImageActionState> {
  try {
    const result = await removePrimaryImageRecord(perfumeId);
    if (result.error) {
      return { error: result.error };
    }
    if (result.path) {
      await removePerfumeImageFiles([result.path]);
    }
    return { ok: true };
  } catch {
    console.error("Catalogue image removal failed.");
    return { error: "The image could not be removed. Please try again." };
  }
}
