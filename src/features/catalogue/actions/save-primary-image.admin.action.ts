"use server";

import { revalidatePath } from "next/cache";

import { savePrimaryImageAsset } from "../services/perfume-images.service";
import type { ImageActionState } from "../types";
import { getCurrentAdmin } from "@/lib/auth/admin";

import { validateImageInput } from "../validators/image.validator";

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
  const result = await savePrimaryImageAsset(perfumeId, file as File, altText);
  if (result.ok) {
    revalidatePath(`/admin/perfumes/${perfumeId}`);
  }
  return result;
}
