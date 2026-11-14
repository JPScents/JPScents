"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/app/_server/admin-session";
import { createSupabaseServerClient } from "@/app/_server/supabase-session";
import {
  parsePerfumeForm,
  parseStagedVariants,
  validateImageInput,
  savePerfumeWithImage,
} from "@/modules/catalogue/server";
import type { PerfumeActionState } from "@/modules/catalogue";

function stagedImage(formData: FormData) {
  const file = formData.get("primaryImage");
  const altText =
    typeof formData.get("primaryImageAlt") === "string"
      ? String(formData.get("primaryImageAlt")).trim()
      : "";
  if (!(file instanceof File) || file.size === 0) {
    return { file: null, altText };
  }
  const error = validateImageInput(file, altText);
  if (error) {
    return { file: null, altText, error };
  }
  return { file, altText };
}

export async function savePerfume(
  _: PerfumeActionState,
  formData: FormData,
): Promise<PerfumeActionState> {
  if (!(await getCurrentAdmin())) {
    return { message: "You are not authorized to manage the catalogue." };
  }
  const { input, errors } = parsePerfumeForm(formData);
  if (!input) {
    return { errors };
  }
  const id = formData.get("id");
  const staged = parseStagedVariants(formData.get("stagedVariants"));
  if (staged.error) {
    return { errors: { variants: staged.error } };
  }
  const image = stagedImage(formData);
  if (image.error) {
    return { errors: { primaryImage: image.error } };
  }
  const result = await savePerfumeWithImage(
    input,
    typeof id === "string" && id ? id : null,
    staged.variants,
    image,
    createSupabaseServerClient,
  );
  if (!result.id) {
    return result;
  }
  revalidatePath("/admin/perfumes");
  redirect(`/admin/perfumes/${result.id}`);
}
