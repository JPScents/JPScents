import "server-only";

import { randomUUID } from "node:crypto";
import {
  removeCatalogueImages,
  uploadCatalogueImage,
  type CreateImageStorageClient,
} from "@/infrastructure/supabase/perfume-images";
import {
  replacePrimaryImage,
  removePrimaryImageRecord,
} from "../repositories/perfume-image.repository";
import type { ImageActionState } from "../types";

export async function uploadPerfumeImage(
  perfumeId: string,
  file: File,
  createClient: CreateImageStorageClient,
) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `perfumes/${perfumeId}/${randomUUID()}.${extension}`;
  const { error } = await uploadCatalogueImage(path, file, createClient);
  if (error) {
    throw new Error("Image upload failed.");
  }
  return path;
}

export async function removePerfumeImageFiles(
  paths: string[],
  createClient: CreateImageStorageClient,
) {
  // Demo assets are served from public/, not the storage bucket.
  const storedPaths = paths.filter((path) => !path.startsWith("/"));
  if (!storedPaths.length) {
    return true;
  }
  try {
    const { error } = await removeCatalogueImages(storedPaths, createClient);
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
  createClient: CreateImageStorageClient,
): Promise<ImageActionState> {
  let path: string;
  try {
    path = await uploadPerfumeImage(perfumeId, file, createClient);
  } catch {
    return { error: "Image upload failed. Please try again." };
  }
  let previousPaths: string[];
  try {
    previousPaths = await replacePrimaryImage(perfumeId, path, altText);
  } catch {
    console.error("Catalogue image metadata save failed.");
    await removePerfumeImageFiles([path], createClient);
    return { error: "Image metadata could not be saved. Please try again." };
  }
  await removePerfumeImageFiles(previousPaths, createClient);
  return { ok: true };
}

export async function removePrimaryImageAsset(
  perfumeId: string,
  createClient: CreateImageStorageClient,
): Promise<ImageActionState> {
  try {
    const result = await removePrimaryImageRecord(perfumeId);
    if (result.error) {
      return { error: result.error };
    }
    if (result.path) {
      await removePerfumeImageFiles([result.path], createClient);
    }
    return { ok: true };
  } catch {
    console.error("Catalogue image removal failed.");
    return { error: "The image could not be removed. Please try again." };
  }
}
