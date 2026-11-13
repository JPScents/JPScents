"use server";

import { revalidatePath } from "next/cache";

import { removePrimaryImageAsset } from "@/modules/catalogue/server";
import type { ImageActionState } from "@/modules/catalogue";
import { getCurrentAdmin } from "@/app/_server/admin-session";
import { createSupabaseServerClient } from "@/app/_server/supabase-session";

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
  const result = await removePrimaryImageAsset(perfumeId, createSupabaseServerClient);
  if (result.ok) {
    revalidatePath(`/admin/perfumes/${perfumeId}`);
  }
  return result;
}
