"use server";

import { revalidatePath } from "next/cache";

import { savePrimaryImageAsset, validateImageInput } from "@/modules/catalogue/server";
import type { ImageActionState } from "@/modules/catalogue";
import { getCurrentAdmin } from "@/app/_server/admin-session";
import { createSupabaseServerClient } from "@/app/_server/supabase-session";

export async function savePrimaryImage(
  _: ImageActionState,
  formData: FormData,
): Promise<ImageActionState> {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized to manage images." };
  }
  const perfumeId = formData.get("perfumeId");
  const file = formData.get("image");
  const altText =
    typeof formData.get("altText") === "string" ? String(formData.get("altText")).trim() : "";
  if (typeof perfumeId !== "string") {
    return { error: "Missing perfume." };
  }
  const error = validateImageInput(file, altText);
  if (error) {
    return { error };
  }
  const result = await savePrimaryImageAsset(
    perfumeId,
    file as File,
    altText,
    createSupabaseServerClient,
  );
  if (result.ok) {
    revalidatePath(`/admin/perfumes/${perfumeId}`);
  }
  return result;
}
