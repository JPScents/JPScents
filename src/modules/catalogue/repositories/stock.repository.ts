import "server-only";

import { Prisma } from "@/infrastructure/database/generated/client";

type StockLine = { perfumeVariantId: string; quantity: number };
export class CatalogueStockConflict extends Error {}

export async function lockPerfumeStock(
  tx: Prisma.TransactionClient,
  perfumeIds: string[],
  includeBestseller = false,
) {
  const ids = perfumeIds.map((id) => Prisma.sql`${id}::uuid`);
  const targets = ids.length ? Prisma.sql`"id" IN (${Prisma.join(ids)})` : Prisma.sql`false`;
  // Stock writers take parent locks in the same order before changing variants.
  await tx.$queryRaw`
    SELECT "id" FROM "Perfume"
    WHERE ${targets} OR (${includeBestseller} AND "isBestseller")
    ORDER BY "id" FOR UPDATE
  `;
}

export async function lockStockLines(tx: Prisma.TransactionClient, lines: StockLine[]) {
  const ids = lines.map(({ perfumeVariantId }) => perfumeVariantId);
  const variants = await tx.perfumeVariant.findMany({
    where: { id: { in: ids } },
    select: { perfumeId: true },
  });
  await lockPerfumeStock(tx, [...new Set(variants.map(({ perfumeId }) => perfumeId))]);
  return ids;
}

export async function deductStockForOrder(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  expectedPrices?: ReadonlyMap<string, number>,
  useLockedQuote = false,
) {
  const ids = await lockStockLines(tx, lines);
  const variants = await tx.perfumeVariant.findMany({
    where: { id: { in: ids }, perfume: { status: "PUBLISHED" } },
    select: {
      id: true,
      perfumeId: true,
      priceMinor: true,
      quantity: true,
      sizeValue: true,
      sizeUnit: true,
      perfume: { select: { name: true } },
    },
  });
  if (variants.length !== lines.length) {
    return { error: "One or more perfumes are no longer available." } as const;
  }

  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  if (
    expectedPrices &&
    !useLockedQuote &&
    variants.some((variant) => expectedPrices.get(variant.id) !== variant.priceMinor)
  ) {
    return {
      stalePrices: variants.map(({ id, priceMinor }) => ({
        perfumeVariantId: id,
        unitPriceMinor: priceMinor,
      })),
    } as const;
  }
  // Validate the whole basket under the same parent locks before making any debit.
  if (
    lines.some(
      ({ perfumeVariantId, quantity }) => (byId.get(perfumeVariantId)?.quantity ?? 0) < quantity,
    )
  ) {
    return {
      error: "One or more perfumes are no longer available in the requested quantity.",
    } as const;
  }
  for (const { perfumeVariantId: id, quantity } of lines) {
    const variant = byId.get(id);
    if (!variant) {
      throw new CatalogueStockConflict("One or more perfumes are no longer available.");
    }
    // The eligibility trigger checks each variant write, so clear placement before the final debit.
    await tx.perfume.updateMany({
      where: {
        id: variant.perfumeId,
        isBestseller: true,
        variants: {
          none: {
            OR: [
              { id: { not: id }, quantity: { gt: 0 } },
              { id, quantity: { gt: quantity } },
            ],
          },
        },
      },
      data: { isBestseller: false },
    });
    const updated = await tx.perfumeVariant.updateMany({
      where: { id, quantity: { gte: quantity }, perfume: { status: "PUBLISHED" } },
      data: { quantity: { decrement: quantity } },
    });
    if (updated.count !== 1) {
      throw new CatalogueStockConflict(
        "One or more perfumes are no longer available in the requested quantity.",
      );
    }
  }
  return { variants: byId };
}

export async function restoreStockForOrder(tx: Prisma.TransactionClient, lines: StockLine[]) {
  await lockStockLines(tx, lines);
  for (const { perfumeVariantId: id, quantity } of lines) {
    const restored = await tx.perfumeVariant.updateMany({
      where: { id },
      data: { quantity: { increment: quantity } },
    });
    if (restored.count !== 1) {
      return false;
    }
  }
  return true;
}

export async function quotePublishedVariants(tx: Prisma.TransactionClient, lines: StockLine[]) {
  const ids = await lockStockLines(tx, lines);
  const variants = await tx.perfumeVariant.findMany({
    where: { id: { in: ids }, perfume: { status: "PUBLISHED" } },
    select: { id: true, priceMinor: true, quantity: true },
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return lines.every((line) => (byId.get(line.perfumeVariantId)?.quantity ?? 0) >= line.quantity)
    ? byId
    : null;
}
