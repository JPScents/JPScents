import "server-only";

import { prisma } from "@/db/prisma";

export async function replacePrimaryImage(perfumeId: string, path: string, altText: string) {
  return await prisma.$transaction(
    async (tx) => {
      const perfume = await tx.perfume.findUnique({
        where: { id: perfumeId },
        select: { images: { select: { path: true } } },
      });
      if (!perfume) {
        throw new Error("Perfume no longer exists.");
      }
      await tx.perfumeImage.deleteMany({ where: { perfumeId } });
      await tx.perfumeImage.create({ data: { perfumeId, path, altText, position: 0 } });
      return perfume.images.map((image) => image.path);
    },
    { isolationLevel: "Serializable" },
  );
}

export async function removePrimaryImageRecord(perfumeId: string) {
  return await prisma.$transaction(
    async (tx) => {
      const perfume = await tx.perfume.findUnique({
        where: { id: perfumeId },
        select: { status: true, images: { orderBy: { position: "asc" }, take: 1 } },
      });
      const image = perfume?.images[0];
      if (!image) {
        return {};
      }
      if (perfume.status === "PUBLISHED") {
        return { error: "Unpublish this perfume before removing its required primary image." };
      }
      await tx.perfumeImage.delete({ where: { id: image.id } });
      return { path: image.path };
    },
    { isolationLevel: "Serializable" },
  );
}
