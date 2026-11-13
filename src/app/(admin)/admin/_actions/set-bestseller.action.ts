"use server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/app/_server/admin-session";
import { setBestsellerRecord } from "@/modules/catalogue/server";

export async function setBestseller(
  perfumeId: string | null,
): Promise<{ error?: string; ok?: boolean }> {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized." };
  }
  if (perfumeId !== null && (typeof perfumeId !== "string" || !perfumeId.trim())) {
    return { error: "Choose a perfume." };
  }
  const result = await setBestsellerRecord(perfumeId);
  if (result.error) {
    return result;
  }
  revalidatePath("/admin/perfumes");
  revalidatePath("/admin");
  return { ok: true };
}
