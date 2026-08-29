"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RemovePrimaryImageState = { error?: string; ok?: boolean };

export async function removePrimaryImage(
  _: RemovePrimaryImageState,
  formData: FormData,
): Promise<RemovePrimaryImageState> {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized to manage images." };
  const perfumeId = formData.get("perfumeId");
  if (typeof perfumeId !== "string") return { error: "Missing perfume." };
  const image = await prisma.perfumeImage.findFirst({
    where: { perfumeId },
    orderBy: { position: "asc" },
  });
  if (!image) return { ok: true };
  const perfume = await prisma.perfume.findUnique({ where: { id: perfumeId } });
  if (perfume?.status === "PUBLISHED")
    return { error: "Unpublish this perfume before removing its required primary image." };
  await prisma.perfumeImage.delete({ where: { id: image.id } });
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from("perfume-images").remove([image.path]);
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  return { ok: true };
}
