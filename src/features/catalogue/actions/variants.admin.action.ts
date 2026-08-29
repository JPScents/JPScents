"use server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { prisma } from "@/db/prisma";
import { parseVariantInput } from "../fields";
export type VariantActionState = {
  errors?: Record<string, string>;
  message?: string;
  ok?: boolean;
};
export async function saveVariant(
  _: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  if (!(await getCurrentAdmin())) return { message: "You are not authorized to manage variants." };
  const perfumeId = formData.get("perfumeId");
  if (typeof perfumeId !== "string") return { message: "Missing perfume." };
  const { input, errors } = parseVariantInput(formData);
  if (!input) return { errors };
  const id = formData.get("id");
  const perfume = await prisma.perfume.findUnique({ where: { id: perfumeId } });
  if (!perfume) return { message: "Perfume not found." };
  if (perfume.isBestseller && input.quantity === 0) {
    const otherStock = await prisma.perfumeVariant.count({
      where: {
        perfumeId,
        quantity: { gt: 0 },
        ...(typeof id === "string" && id ? { id: { not: id } } : {}),
      },
    });
    if (!otherStock)
      return {
        message:
          "Replace or clear the active Bestseller before removing its final positive-stock variant.",
      };
  }
  if (typeof id === "string" && id) {
    const existing = await prisma.perfumeVariant.findUnique({
      where: { id },
      select: { perfumeId: true },
    });
    if (!existing || existing.perfumeId !== perfumeId) return { message: "Variant not found." };
  }
  try {
    if (typeof id === "string" && id)
      await prisma.perfumeVariant.update({ where: { id }, data: { ...input, sizeUnit: "ML" } });
    else await prisma.perfumeVariant.create({ data: { perfumeId, ...input, sizeUnit: "ML" } });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    return {
      errors:
        code === "P2002"
          ? { sizeValue: "A variant with this size already exists." }
          : { form: "Unable to save this variant. Please try again." },
    };
  }
  revalidatePath(`/admin/perfumes/${perfumeId}`);
  revalidatePath("/admin/perfumes");
  return { ok: true };
}
export async function deleteVariant(
  _: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
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
