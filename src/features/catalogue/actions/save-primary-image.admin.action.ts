"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { validateImageInput } from "../schemas/image.schema";

export type SavePrimaryImageState = { error?: string; ok?: boolean };

export async function savePrimaryImage(
  _: SavePrimaryImageState,
  formData: FormData,
): Promise<SavePrimaryImageState> {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized to manage images." };
  const perfumeId = formData.get("perfumeId");
  const file = formData.get("image");
  const altText =
    typeof formData.get("altText") === "string" ? String(formData.get("altText")).trim() : "";
  if (typeof perfumeId !== "string") return { error: "Missing perfume." };
  const error = validateImageInput(file, altText);
  if (error) return { error };
  const perfume = await prisma.perfume.findUnique({
    where: { id: perfumeId },
    include: { images: true },
  });
  if (!perfume) return { error: "Perfume not found." };
  const image = file as File;
  const extension = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
  const path = `perfumes/${perfumeId}/${randomUUID()}.${extension}`;
  const supabase = await createSupabaseServerClient();
  if (
    (
      await supabase.storage
        .from("perfume-images")
        .upload(path, image, { contentType: image.type, upsert: false })
    ).error
  )
    return { error: "Image upload failed. Please try again." };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.perfumeImage.deleteMany({ where: { perfumeId } });
      await tx.perfumeImage.create({ data: { perfumeId, path, altText, position: 0 } });
    });
  } catch {
    await supabase.storage.from("perfume-images").remove([path]);
    return { error: "Image metadata could not be saved; the uploaded file was removed." };
  }
  const previousPaths = perfume.images.map((existing) => existing.path);
  if (previousPaths.length) await supabase.storage.from("perfume-images").remove(previousPaths);
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  return { ok: true };
}
