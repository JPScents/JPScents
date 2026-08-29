import "server-only";

import { prisma } from "@/db/prisma";

export async function findPublishedVariants(ids: string[]) {
  return prisma.perfumeVariant.findMany({
    where: { id: { in: ids }, perfume: { status: "PUBLISHED" } },
    include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
}
