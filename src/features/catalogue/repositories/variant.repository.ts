import "server-only";

import { Prisma } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import type { VariantInput, VariantActionState } from "../types";

export async function saveVariantRecord(
  perfumeId: string,
  id: string | null,
  input: VariantInput,
): Promise<VariantActionState> {
  try {
    return await prisma.$transaction(async (tx) => {
      const perfume = await tx.perfume.findUnique({ where: { id: perfumeId } });
      if (!perfume) {
        return { message: "Perfume not found." };
      }
      if (perfume.isBestseller && input.quantity === 0) {
        const otherStock = await tx.perfumeVariant.count({
          where: {
            perfumeId,
            quantity: { gt: 0 },
            ...(id ? { id: { not: id } } : {}),
          },
        });
        if (!otherStock) {
          return {
            message:
              "Replace or clear the active Bestseller before removing its final positive-stock variant.",
          };
        }
      }
      if (id) {
        const existing = await tx.perfumeVariant.findUnique({
          where: { id },
          select: { perfumeId: true },
        });
        if (!existing || existing.perfumeId !== perfumeId) {
          return { message: "Variant not found." };
        }
      }
      if (id) {
        await tx.perfumeVariant.update({ where: { id }, data: { ...input, sizeUnit: "ML" } });
      } else {
        await tx.perfumeVariant.create({ data: { perfumeId, ...input, sizeUnit: "ML" } });
      }
      return { ok: true };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { sizeValue: "A variant with this size already exists." } };
    }
    console.error("Catalogue variant save failed.");
    return { errors: { form: "Unable to save this variant. Please try again." } };
  }
}

export async function deleteVariantRecord(
  perfumeId: string,
  id: string,
): Promise<VariantActionState> {
  try {
    return await prisma.$transaction(async (tx) => {
      const variant = await tx.perfumeVariant.findUnique({
        where: { id },
        include: { orderItems: { take: 1 }, perfume: true },
      });
      if (!variant || variant.perfumeId !== perfumeId) {
        return { message: "Variant not found." };
      }
      if (variant.orderItems.length) {
        return {
          message: "This variant is referenced by an order. Set its quantity to zero instead.",
        };
      }
      if (
        variant.perfume.isBestseller &&
        variant.quantity > 0 &&
        !(await tx.perfumeVariant.count({
          where: { perfumeId, id: { not: id }, quantity: { gt: 0 } },
        }))
      ) {
        return {
          message:
            "Replace or clear the active Bestseller before deleting its final positive-stock variant.",
        };
      }
      await tx.perfumeVariant.delete({ where: { id } });
      return { ok: true };
    });
  } catch {
    console.error("Catalogue variant deletion failed.");
    return { message: "This variant cannot be removed." };
  }
}
