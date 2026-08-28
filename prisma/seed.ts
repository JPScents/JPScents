import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PerfumeStatus } from "../src/db/generated/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the local database.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const perfumes = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Quiet Fig",
    slug: "quiet-fig",
    scentCue: "Green fig leaves softened by cedar.",
    description: "A deterministic development placeholder for the catalogue foundation.",
    scentCharacters: ["FRESH", "WOODY"] as const,
    occasions: ["EVERYDAY", "WORK"] as const,
    timesOfDay: ["DAY"] as const,
    image: { id: "31000000-0000-4000-8000-000000000001", path: "perfumes/quiet-fig/primary.jpg", altText: "Placeholder for Quiet Fig perfume bottle." },
    variants: [
      { id: "32000000-0000-4000-8000-000000000001", sizeValue: "30", priceMinor: 125000, quantity: 12 },
      { id: "32000000-0000-4000-8000-000000000002", sizeValue: "50", priceMinor: 185000, quantity: 8 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Amber Evening",
    slug: "amber-evening",
    scentCue: "Soft amber with a warm, unhurried finish.",
    description: "A deterministic development placeholder for the catalogue foundation.",
    scentCharacters: ["WARM", "SWEET"] as const,
    occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"] as const,
    timesOfDay: ["NIGHT"] as const,
    image: { id: "31000000-0000-4000-8000-000000000002", path: "perfumes/amber-evening/primary.jpg", altText: "Placeholder for Amber Evening perfume bottle." },
    variants: [{ id: "32000000-0000-4000-8000-000000000003", sizeValue: "50", priceMinor: 210000, quantity: 6 }],
  },
] as const;

async function main() {
  for (const perfume of perfumes) {
    await prisma.perfume.upsert({
      where: { id: perfume.id },
      create: {
        id: perfume.id,
        name: perfume.name,
        slug: perfume.slug,
        scentCue: perfume.scentCue,
        description: perfume.description,
        status: PerfumeStatus.PUBLISHED,
        scentCharacters: [...perfume.scentCharacters],
        occasions: [...perfume.occasions],
        timesOfDay: [...perfume.timesOfDay],
        isBestseller: false,
      },
      update: {},
    });

    await prisma.perfumeImage.upsert({
      where: { id: perfume.image.id },
      create: { ...perfume.image, perfumeId: perfume.id, position: 0 },
      update: {},
    });

    for (const variant of perfume.variants) {
      await prisma.perfumeVariant.upsert({
        where: { id: variant.id },
        create: { ...variant, perfumeId: perfume.id, sizeUnit: "ML" },
        update: {},
      });
    }

    if (perfume.id.endsWith("001")) {
      await prisma.perfume.update({
        where: { id: perfume.id },
        data: { isBestseller: true },
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
