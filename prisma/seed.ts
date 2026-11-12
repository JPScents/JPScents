import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/db/generated/client";

import { seedDemoCatalogue } from "./repositories/demo-catalogue.repository";

// Explicitly opt-in demo data for local development and design review only.
// Normal resets and deployed environments intentionally start with no catalogue data.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:56322/postgres";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

seedDemoCatalogue(prisma).finally(() => prisma.$disconnect());
