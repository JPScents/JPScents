import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/db/generated/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl =
    process.env.DATABASE_URL ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "postgresql://postgres:postgres@127.0.0.1:56322/postgres");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the server database client.");
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      // A serverless instance only needs one local connection. Supavisor handles
      // pooling across instances; a larger per-instance pool exhausts the small
      // production database before an order transaction can acquire a connection.
      max: 1,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 10_000,
    }),
  });
  globalForPrisma.prisma = client;
  return client;
}

// Route configuration is evaluated at build time without runtime secrets. Create the
// client only when a server query actually runs, while keeping existing call sites direct.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    return Reflect.get(getPrisma(), property);
  },
});
