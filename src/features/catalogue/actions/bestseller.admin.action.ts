"use server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { setBestsellerRecord } from "../repositories/perfume.repository";

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
