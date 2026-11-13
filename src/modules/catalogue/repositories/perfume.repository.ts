import "server-only";
import { Prisma, type ScentCharacter } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";
import { getPublishingErrors } from "../validators/publishing.validator";
import type { CatalogueFilters, PerfumeInput, PerfumeActionState, VariantInput } from "../types";
import { scentCharacters } from "../constants/catalogue";
import { lockPerfumeStock } from "./stock.repository";

const details = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { sizeValue: "asc" } },
} satisfies Prisma.PerfumeInclude;
export type PerfumeRecord = Prisma.PerfumeGetPayload<{ include: typeof details }>;

export async function listAdminPerfumeRecords(filters: CatalogueFilters = {}) {
  const query = filters.query?.trim();
  const where: Prisma.PerfumeWhereInput = {
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    ...(filters.availability === "available"
      ? { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } }
      : filters.availability === "unavailable"
        ? { NOT: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } } }
        : {}),
    ...(filters.placement === "featured"
      ? { isFeatured: true }
      : filters.placement === "bestseller"
        ? { isBestseller: true }
        : {}),
  };
  const rows = await prisma.perfume.findMany({
    where,
    include: details,
    orderBy: { updatedAt: "desc" },
  });
  return rows;
}

export async function findAdminPerfumeRecord(id: string) {
  return await prisma.perfume.findUnique({ where: { id }, include: details });
}

export async function findBestsellerCandidates(query = "") {
  const value = query.trim();
  const character = scentCharacters.find((item) => item.toLowerCase() === value.toLowerCase()) as
    ScentCharacter | undefined;
  const rows = await prisma.perfume.findMany({
    where: {
      status: "PUBLISHED",
      variants: { some: { quantity: { gt: 0 } } },
      ...(value
        ? {
            OR: [
              { name: { contains: value, mode: "insensitive" } },
              ...(character ? [{ scentCharacters: { has: character } }] : []),
            ],
          }
        : {}),
    },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: {
        orderBy: { sizeValue: "asc" },
        include: { _count: { select: { orderItems: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return rows;
}
export type BestsellerRecord = Awaited<ReturnType<typeof findBestsellerCandidates>>[number];
export async function readCatalogueAdminOverview() {
  const [totalPerfumes, availablePerfumes, zeroStockVariants, attention, bestseller] =
    await Promise.all([
      prisma.perfume.count(),
      prisma.perfume.count({
        where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } },
      }),
      prisma.perfumeVariant.count({ where: { quantity: 0 } }),
      prisma.perfume.findMany({
        where: { OR: [{ status: "DRAFT" }, { variants: { none: { quantity: { gt: 0 } } } }] },
        select: { id: true, name: true, status: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.perfume.findFirst({ where: { isBestseller: true }, select: { id: true, name: true } }),
    ]);
  return { totalPerfumes, availablePerfumes, zeroStockVariants, attention, bestseller };
}

export async function getPublishedVariantsByIds(ids: string[]) {
  if (!ids.length) {
    return [];
  }
  return await prisma.perfumeVariant.findMany({
    where: { id: { in: ids }, perfume: { status: "PUBLISHED" } },
    include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
}

export async function listPublishedPerfumeRecords(
  filters: { scentCharacter?: ScentCharacter; excludeId?: string; availableOnly?: boolean } = {},
) {
  return await prisma.perfume.findMany({
    where: {
      status: "PUBLISHED",
      ...(filters.scentCharacter ? { scentCharacters: { has: filters.scentCharacter } } : {}),
      ...(filters.excludeId ? { id: { not: filters.excludeId } } : {}),
      ...(filters.availableOnly ? { variants: { some: { quantity: { gt: 0 } } } } : {}),
    },
    include: details,
    orderBy: [{ isBestseller: "desc" }, { isFeatured: "desc" }, { name: "asc" }],
  });
}

export async function findPublishedPerfumeBySlug(slug: string) {
  return await prisma.perfume.findFirst({ where: { slug, status: "PUBLISHED" }, include: details });
}
export async function hasPublishedPerfumes() {
  return Boolean(
    await prisma.perfume.findFirst({ where: { status: "PUBLISHED" }, select: { id: true } }),
  );
}

export async function hasAvailablePerfumes() {
  return Boolean(
    await prisma.perfume.findFirst({
      where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } },
      select: { id: true },
    }),
  );
}

export async function listPublishedPerfumeSitemapEntries() {
  return await prisma.perfume.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });
}

export async function setBestsellerRecord(perfumeId: string | null) {
  try {
    return await prisma.$transaction(async (tx) => {
      await lockPerfumeStock(tx, perfumeId ? [perfumeId] : [], true);
      if (perfumeId) {
        const eligible = await tx.perfume.findFirst({
          where: {
            id: perfumeId,
            status: "PUBLISHED",
            variants: { some: { quantity: { gt: 0 } } },
          },
          select: { id: true },
        });
        if (!eligible) {
          return { error: "Choose a published perfume with stock." };
        }
      }
      await tx.perfume.updateMany({ where: { isBestseller: true }, data: { isBestseller: false } });
      if (perfumeId) {
        await tx.perfume.update({ where: { id: perfumeId }, data: { isBestseller: true } });
      }
      return { ok: true };
    });
  } catch {
    console.error("Catalogue bestseller update failed.");
    return { error: "Unable to update Bestseller." };
  }
}

const slugInUseMessage = "That slug is already in use.";
const saveFailureMessage = "The perfume could not be saved. Please try again.";

export async function checkPerfumeCreationSlug(slug: string): Promise<PerfumeActionState | null> {
  try {
    const conflict = await prisma.perfume.findUnique({ where: { slug }, select: { id: true } });
    return conflict ? { errors: { slug: slugInUseMessage } } : null;
  } catch {
    console.error("Catalogue perfume slug check failed.");
    return { message: saveFailureMessage };
  }
}

export async function savePerfumeRecord(
  id: string,
  input: PerfumeInput,
  creation?: { variants: VariantInput[]; image?: { path: string; altText: string } },
): Promise<PerfumeActionState & { id?: string }> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = creation
          ? null
          : await tx.perfume.findUnique({ where: { id }, include: details });
        if (!creation && !existing) {
          return { message: "This perfume no longer exists." };
        }
        const conflict = await tx.perfume.findUnique({
          where: { slug: input.slug },
          select: { id: true },
        });
        if (conflict && conflict.id !== id) {
          return { errors: { slug: slugInUseMessage } };
        }
        const variants = existing?.variants ?? creation!.variants;
        const errors = getPublishingErrors(
          input,
          existing?.images.length ?? (creation?.image ? 1 : 0),
          variants.filter((variant) => variant.quantity > 0).length,
        );
        if (Object.keys(errors).length) {
          return { errors };
        }
        if (existing?.isBestseller && input.status !== "PUBLISHED") {
          return { message: "Replace or clear the active Bestseller before unpublishing it." };
        }
        if (creation) {
          await tx.perfume.create({
            data: {
              id,
              ...input,
              images: creation.image ? { create: { ...creation.image, position: 0 } } : undefined,
              variants: {
                create: creation.variants.map((variant) => ({ ...variant, sizeUnit: "ML" })),
              },
            },
          });
        } else {
          await tx.perfume.update({ where: { id }, data: input });
        }
        return { id };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { slug: "That slug was just claimed. Choose another stable slug." } };
    }
    console.error("Catalogue perfume save failed.");
    return { message: saveFailureMessage };
  }
}

export async function searchCheckoutVariants(query: string) {
  const value = query.trim().slice(0, 80);
  return prisma.perfumeVariant.findMany({
    where: {
      perfume: {
        status: "PUBLISHED",
        name: value ? { contains: value, mode: "insensitive" } : undefined,
      },
    },
    select: {
      id: true,
      sizeValue: true,
      priceMinor: true,
      quantity: true,
      perfume: { select: { name: true } },
    },
    orderBy: [{ perfume: { name: "asc" } }, { sizeValue: "asc" }, { id: "asc" }],
    take: 25,
  });
}
