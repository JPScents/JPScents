"use server";

import { revalidatePath } from "next/cache";

import { saveVariantRecord, parseVariantForm } from "@/modules/catalogue/server";
import type { VariantActionState } from "@/modules/catalogue";
import { getCurrentAdmin } from "@/app/_server/admin-session";

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
  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId ? rawId : null;
  const original = formData.get("originalQuantity");
  let expectedQuantity: number | undefined;
  if (id) {
    if (
      typeof original !== "string" ||
      !/^\d+$/.test(original) ||
      !Number.isSafeInteger(Number(original))
    ) {
      return { message: "Refresh the variant before editing it." };
    }
    if (input.quantity !== Number(original)) {
      expectedQuantity = Number(original);
    }
  }
  const result = await saveVariantRecord(perfumeId, id, input, expectedQuantity);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  revalidatePath("/admin/perfumes");
  return { ok: true };
}
