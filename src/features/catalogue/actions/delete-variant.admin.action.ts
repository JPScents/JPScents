"use server";

import { revalidatePath } from "next/cache";

import { deleteVariantRecord } from "../repositories/variant.repository";
import type { VariantActionState } from "../types";
import { getCurrentAdmin } from "@/lib/auth/admin";

export async function deleteVariant(
  _: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  if (!(await getCurrentAdmin())) {
    return { message: "You are not authorized to manage variants." };
  }
  const id = formData.get("id");
  const perfumeId = formData.get("perfumeId");
  if (typeof id !== "string" || typeof perfumeId !== "string") {
    return { message: "Missing variant." };
  }
  const result = await deleteVariantRecord(perfumeId, id);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  return { ok: true };
}
