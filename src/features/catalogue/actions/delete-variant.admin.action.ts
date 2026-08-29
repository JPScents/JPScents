"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getCurrentAdmin } from "@/lib/auth/admin";

export type DeleteVariantState = {
  errors?: Record<string, string>;
  message?: string;
  ok?: boolean;
};

export async function deleteVariant(
  _: DeleteVariantState,
  formData: FormData,
): Promise<DeleteVariantState> {
  if (!(await getCurrentAdmin())) return { message: "You are not authorized to manage variants." };
  const id = formData.get("id");
  const perfumeId = formData.get("perfumeId");
  if (typeof id !== "string" || typeof perfumeId !== "string")
    return { message: "Missing variant." };
  const variant = await prisma.perfumeVariant.findUnique({
    where: { id },
    include: { orderItems: { take: 1 }, perfume: true },
  });
  if (!variant || variant.perfumeId !== perfumeId) return { message: "Variant not found." };
  if (variant.orderItems.length)
    return { message: "This variant is referenced by an order. Set its quantity to zero instead." };
  if (
    variant.perfume.isBestseller &&
    variant.quantity > 0 &&
    !(await prisma.perfumeVariant.count({
      where: { perfumeId, id: { not: id }, quantity: { gt: 0 } },
    }))
  )
    return {
      message:
        "Replace or clear the active Bestseller before deleting its final positive-stock variant.",
    };
  try {
    await prisma.perfumeVariant.delete({ where: { id } });
  } catch {
    return { message: "This variant cannot be removed." };
  }
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  return { ok: true };
}
