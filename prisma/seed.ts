import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PerfumeStatus } from "../src/db/generated/client";

// Explicitly opt-in demo data for local development and design review only.
// Normal resets and deployed environments intentionally start with no catalogue data.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:56322/postgres";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const perfumes = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Santal Veil",
    slug: "santal-veil",
    scentCue: "Woody · Warm · Evening",
    description: "A warm, woody fragrance with a rich, grounded character.",
    scentCharacters: ["WOODY", "WARM"] as const,
    occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"] as const,
    timesOfDay: ["NIGHT"] as const,
    image: {
      id: "31000000-0000-4000-8000-000000000001",
      path: "/perfume-placeholders/santal-veil.svg",
      altText: "Controlled placeholder artwork for Santal Veil perfume.",
    },
    variants: [
      {
        id: "32000000-0000-4000-8000-000000000001",
        sizeValue: "30",
        priceMinor: 125000,
        quantity: 12,
      },
      {
        id: "32000000-0000-4000-8000-000000000002",
        sizeValue: "50",
        priceMinor: 185000,
        quantity: 8,
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Amber No. 7",
    slug: "amber-no-7",
    scentCue: "Warm · Sweet",
    description: "A warm amber development placeholder for design review.",
    scentCharacters: ["WARM", "SWEET"] as const,
    occasions: ["DATE_NIGHT", "SPECIAL_OCCASION"] as const,
    timesOfDay: ["NIGHT"] as const,
    image: {
      id: "31000000-0000-4000-8000-000000000002",
      path: "/perfume-placeholders/amber-no-7.svg",
      altText: "Controlled placeholder artwork for Amber No. 7 perfume.",
    },
    variants: [
      {
        id: "32000000-0000-4000-8000-000000000003",
        sizeValue: "50",
        priceMinor: 210000,
        quantity: 6,
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Citrus Linen",
    slug: "citrus-linen",
    scentCue: "Fresh · Clean",
    description: "A bright citrus development placeholder for design review.",
    scentCharacters: ["FRESH", "WOODY"] as const,
    occasions: ["EVERYDAY", "WORK"] as const,
    timesOfDay: ["DAY"] as const,
    image: {
      id: "31000000-0000-4000-8000-000000000003",
      path: "/perfume-placeholders/citrus-linen.svg",
      altText: "Controlled placeholder artwork for Citrus Linen perfume.",
    },
    variants: [
      {
        id: "32000000-0000-4000-8000-000000000004",
        sizeValue: "50",
        priceMinor: 165000,
        quantity: 10,
      },
    ],
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
        isFeatured: perfume.id.endsWith("001"),
        isBestseller: false,
      },
      update: {
        name: perfume.name,
        slug: perfume.slug,
        scentCue: perfume.scentCue,
        description: perfume.description,
        scentCharacters: [...perfume.scentCharacters],
        occasions: [...perfume.occasions],
        timesOfDay: [...perfume.timesOfDay],
        isFeatured: perfume.id.endsWith("001"),
        isBestseller: false,
      },
    });

    await prisma.perfumeImage.upsert({
      where: { id: perfume.image.id },
      create: { ...perfume.image, perfumeId: perfume.id, position: 0 },
      update: { path: perfume.image.path, altText: perfume.image.altText, position: 0 },
    });

    for (const variant of perfume.variants) {
      await prisma.perfumeVariant.upsert({
        where: { id: variant.id },
        create: { ...variant, perfumeId: perfume.id, sizeUnit: "ML" },
        update: {},
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
