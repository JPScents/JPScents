// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const checker = path.resolve(".agents/skills/feature-structure/scripts/check-structure.mjs");
const temporaryDirectories: string[] = [];

async function check(files: Record<string, string>) {
  const root = await mkdtemp(path.join(tmpdir(), "jpscents-architecture-"));
  temporaryDirectories.push(root);
  for (const directory of ["src/features", "scripts", "prisma"]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  for (const [filename, contents] of Object.entries(files)) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("architecture enforcement", () => {
  it("allows optional responsibility folders and generated data contracts", async () => {
    const result = await check({
      "src/features/shop/types/index.ts":
        'import type { Perfume } from "@/db/generated/client"; export type Product = Pick<Perfume, "id">;',
      "src/features/shop/index.ts": 'export type { Product } from "./types";',
      "src/features/shop/repositories/perfume.repository.ts":
        'import { prisma } from "@/db/prisma"; export async function listPerfumes() { return await prisma.perfume.findMany(); }',
    });
    expect(result.status, result.stderr).toBe(0);
  });
  it("rejects root implementations and misleading schema and repository filenames", async () => {
    const result = await check({
      "src/features/shop/shop.query.ts": "export const value = 1;",
      "src/features/shop/repositories/shop.query.ts": "export const value = 1;",
      "src/features/shop/schemas/parse.ts": "export const parse = () => null;",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("not the feature root");
    expect(result.stderr).toContain("repositories/ responsibility convention");
    expect(result.stderr).toContain("schemas/ responsibility convention");
  });
  it("rejects client aliases, re-exports, namespace access and transactions outside repositories", async () => {
    const result = await check({
      "src/features/shop/services/shop.service.ts":
        'import { prisma as db } from "@/db/prisma"; db.$transaction([]);',
      "src/lib/escape.ts": 'export { prisma } from "@/db/prisma";',
      "src/app/page.tsx":
        'import { Prisma } from "@/db/generated/client"; export default function Page() { return null; }',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("$transaction access belongs only in repositories");
    expect(result.stderr).toContain("src/lib/escape.ts");
    expect(result.stderr).toContain("src/app/page.tsx");
  });
  it("rejects private cross-feature imports and feature-dependent shared UI", async () => {
    const result = await check({
      "src/features/orders/services/order.service.ts":
        'import { save } from "@/features/customers/repositories/customer.repository";',
      "src/components/Shared.tsx": 'import { Cart } from "@/features/cart";',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("consume customers through its public entry points");
    expect(result.stderr).toContain("generic shared code must not depend on features");
  });
});
