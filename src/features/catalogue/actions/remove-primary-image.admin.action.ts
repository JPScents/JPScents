"use server";

import { revalidatePath } from "next/cache";

import { removePrimaryImageAsset } from "../services/perfume-images.service";
import type { ImageActionState } from "../types";
import { getCurrentAdmin } from "@/lib/auth/admin";

export async function removePrimaryImage(
  _: ImageActionState,
  formData: FormData,
): Promise<ImageActionState> {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized to manage images." };
  }
  const perfumeId = formData.get("perfumeId");
  if (typeof perfumeId !== "string") {
    return { error: "Missing perfume." };
  }
  const result = await removePrimaryImageAsset(perfumeId);
  if (result.ok) {
    revalidatePath(`/admin/perfumes/${perfumeId}`);
  }
  return result;
}
