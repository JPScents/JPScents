"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getCurrentAdmin } from "@/lib/auth/admin";

import { parseVariantForm } from "../parsers/variant-form.parser";

export type SaveVariantState = { errors?: Record<string, string>; message?: string; ok?: boolean };

export async function saveVariant(
  _: SaveVariantState,
  formData: FormData,
): Promise<SaveVariantState> {
  if (!(await getCurrentAdmin())) return { message: "You are not authorized to manage variants." };
  const perfumeId = formData.get("perfumeId");
  if (typeof perfumeId !== "string") return { message: "Missing perfume." };
  const { input, errors } = parseVariantForm(formData);
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
