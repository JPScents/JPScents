"use server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { prisma } from "@/db/prisma";
export async function setBestseller(perfumeId: string | null) {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized." };
  try {
    await prisma.$transaction(async (tx) => {
      if (perfumeId) {
        const eligible = await tx.perfume.findFirst({
          where: {
            id: perfumeId,
            status: "PUBLISHED",
            variants: { some: { quantity: { gt: 0 } } },
          },
        });
        if (!eligible) throw new Error("Choose a published perfume with stock.");
      }
      await tx.perfume.updateMany({ where: { isBestseller: true }, data: { isBestseller: false } });
      if (perfumeId)
        await tx.perfume.update({ where: { id: perfumeId }, data: { isBestseller: true } });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update Bestseller." };
  }
  revalidatePath("/admin/perfumes");
  revalidatePath("/admin");
  return { ok: true };
}
