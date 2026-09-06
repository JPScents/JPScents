"use server";

import { revalidatePath } from "next/cache";

import { saveVariantRecord } from "../repositories/variant.repository";
import type { VariantActionState } from "../types";
import { getCurrentAdmin } from "@/lib/auth/admin";

import { parseVariantForm } from "../parsers/variant-form.parser";

export async function saveVariant(
  _: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  if (!(await getCurrentAdmin())) {
    return { message: "You are not authorized to manage variants." };
  }
  const perfumeId = formData.get("perfumeId");
  if (typeof perfumeId !== "string") {
    return { message: "Missing perfume." };
  }
  const { input, errors } = parseVariantForm(formData);
  if (!input) {
    return { errors };
  }
  const id = formData.get("id");
  const result = await saveVariantRecord(
    perfumeId,
    typeof id === "string" && id ? id : null,
    input,
  );
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  revalidatePath("/admin/perfumes");
  return { ok: true };
}
