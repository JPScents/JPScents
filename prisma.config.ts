import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: process.env.APP_ENV_FILE ?? ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:56322/postgres",
  },
});
