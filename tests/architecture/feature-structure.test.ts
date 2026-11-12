// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const checker = path.resolve(".agents/skills/feature-structure/scripts/check-structure.mjs");
const temporaryDirectories: string[] = [];

async function check(files: Record<string, string>, args: string[] = []) {
  const root = await mkdtemp(path.join(tmpdir(), "jpscents-architecture-"));
  temporaryDirectories.push(root);
  for (const directory of ["src/features", "scripts", "prisma", "tests"]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  for (const [filename, contents] of Object.entries(files)) {
    const target = path.join(root, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  return spawnSync(process.execPath, [checker, ...args], { cwd: root, encoding: "utf8" });
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
      "src/features/BadFeature/index.ts": 'export type { Product } from "./types";',
      "src/features/shop/shop.query.ts": "export const value = 1;",
      "src/features/shop/repositories/shop.query.ts": "export const value = 1;",
      "src/features/shop/schemas/parse.ts": "export const parse = () => null;",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/features/BadFeature [STD-001]");
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

  it("allows one-way public imports, type contracts and the standalone seed client lifecycle", async () => {
    const result = await check({
      "src/features/catalogue/index.ts": 'export type { Product } from "./types";',
      "src/features/catalogue/types/index.ts": "export type Product = { id: string };",
      "src/features/catalogue/server.ts":
        'import "server-only"; export { list } from "./repositories/product.repository";',
      "src/features/catalogue/repositories/product.repository.ts":
        'import { prisma } from "@/db/prisma"; export const list = () => prisma.perfume.findMany();',
      "src/features/cart/services/cart.service.ts":
        'import type { Product } from "@/features/catalogue"; export const load = () => import("../../catalogue/server");',
      "prisma/seed.ts":
        'import { PrismaClient } from "../src/db/generated/client"; import { seed } from "./repositories/demo.repository"; const client = new PrismaClient(); seed(client).finally(() => client.$disconnect());',
      "prisma/repositories/demo.repository.ts":
        'import type { PrismaClient } from "../../src/db/generated/client"; export const seed = (client: PrismaClient) => client.perfume.findMany();',
      "tests/cart.test.ts": 'import { load } from "@/features/cart/services/cart.service";',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects a transitive feature cycle through public entries and a literal dynamic import", async () => {
    const result = await check({
      "src/features/alpha/index.ts": 'export { first } from "./services/alpha.service";',
      "src/features/alpha/services/alpha.service.ts":
        'export { second as first } from "@/features/beta";',
      "src/features/beta/index.ts": 'export { second } from "./services/beta.service";',
      "src/features/beta/services/beta.service.ts":
        'import { third } from "@/features/gamma"; export const second = third;',
      "src/features/gamma/index.ts": 'export { third } from "./services/gamma.service";',
      "src/features/gamma/services/gamma.service.ts":
        'export const third = () => import("../../alpha/index");',
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/gamma\.service\.ts:1:\d+ \[ARC-07\]/);
    expect(result.stderr).toContain("feature dependency cycle: alpha → beta → gamma → alpha");
  });

  it("rejects literal private loads and persistence imports outside the owning repository boundary", async () => {
    const result = await check({
      "src/features/catalogue/services/catalogue.service.ts": "export const catalogue = {};",
      "src/features/cart/services/cart.service.ts":
        'export const load = () => import("@/features/catalogue/./services/catalogue.service");',
      "src/features/cart/repositories/cart.repository.ts":
        'import { PrismaClient as Client } from "@/db/generated/client"; export const client = new Client();',
      "src/app/repositories/fake.repository.ts": 'import db = require("../../db/prisma");',
      "src/db/prisma.ts":
        'import { PrismaClient } from "./generated/client"; const client = new PrismaClient(); client.$queryRaw`SELECT 1`;',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/cart\.service\.ts:1:\d+ \[ARC-07\].*public entry points/);
    expect(result.stderr).toMatch(/cart\.repository\.ts:1:\d+ \[ARC-09\]/);
    expect(result.stderr).toMatch(/fake\.repository\.ts:1:\d+ \[ARC-09\]/);
    expect(result.stderr).toMatch(/src\/db\/prisma\.ts:1:\d+ \[ARC-09\].*\$queryRaw/);
  });

  it("fails on malformed source and unsupported scan targets", async () => {
    const malformed = await check({ "src/app/page.tsx": "export const result = ;" });
    const unsupported = await check({}, ["src/app"]);
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toMatch(/src\/app\/page\.tsx:1:\d+ \[ARC-02\] invalid source/);
    expect(unsupported.status).toBe(1);
    expect(unsupported.stderr).toContain("[ARC-02] unsupported scan target");
  });

  it("keeps the direct feature scan usable and identifies its limited scope", async () => {
    const result = await check(
      { "src/features/cart/index.ts": 'export type { Cart } from "./types";' },
      ["src/features/cart"],
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("scoped structure and Prisma checks passed");
  });
});

const imageRule = "@next/next/no-img-element";
const imagePath = "src/features/catalogue/components/public/ScentCharacterSelect.tsx";
const assetsPath = "src/features/catalogue/constants/catalogue.ts";
const baselinePath = ".agents/skills/feature-structure/scripts/suppression-baseline.json";
const legacy = `/* eslint-disable ${imageRule} -- local controlled scent assets are decorative. */`;
const legacyEntry = {
  finding: "GAP-006",
  path: imagePath,
  component: "ScentCharacterSelect",
  rule: imageRule,
  directive: legacy,
};

const approvedAssets = `export const scentCharacterContent = {
  FRESH: { image: "/scent-characters/scent-fresh-natural.png" },
  WARM: { image: "/scent-characters/scent-warm-natural.png" },
  SWEET: { image: "/scent-characters/scent-sweet-natural.png" },
  WOODY: { image: "/scent-characters/scent-woody-natural.png" },
};`;

function scentButton({ before = "", directive = "", extra = "" } = {}) {
  return `import { scentCharacterContent } from "../../constants/catalogue";
${before}
export function ScentCharacterSelect({ value }) {
  const item = scentCharacterContent[value];
  return (
    <button aria-pressed={false}>
      ${directive}
      <img src={item.image} alt="" />
      {item.label}
      ${extra}
    </button>
  );
}`;
}

describe("suppression scope and legacy baseline", () => {
  it("accepts the approved directive attached to the existing image", async () => {
    const result = await check({
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({
        directive: `{/* eslint-disable-next-line ${imageRule} -- decorative */}`,
      }),
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("fails new blanket, inline, and TypeScript overrides without matching text in strings", async () => {
    const result = await check({
      "src/app/legacy.ts": "/* eslint-disable */\nexport const ignored = 1;",
      "src/app/override.ts": "/* eslint curly: off */\nexport const value = 1;",
      "tests/suppressed.test.ts": "// @ts-ignore\nconst value: number = 'bad';",
      "src/app/text.tsx":
        'export const text = "/* eslint-disable */"; export const view = <p>/* eslint-disable */</p>;',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/app/legacy.ts:1:1 [STD-025]");
    expect(result.stderr).toContain("src/app/override.ts:1:1 [STD-025]");
    expect(result.stderr).toContain("tests/suppressed.test.ts:1:1 [STD-025]");
    expect(result.stderr).not.toContain("text.tsx");
  });

  it("passes the exact legacy directive and rejects an additional image at the same path", async () => {
    const existing = {
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({ before: legacy }),
      [baselinePath]: JSON.stringify([legacyEntry]),
    };
    const unchanged = await check(existing);
    const expanded = await check({
      ...existing,
      [imagePath]: scentButton({ before: legacy, extra: '<img src="/other.png" alt="" />' }),
    });
    expect(unchanged.status, unchanged.stderr).toBe(0);
    expect(unchanged.stdout).toContain("Retained 1 exact GAP-006 legacy directives");
    expect(expanded.status).toBe(1);
    expect(expanded.stderr).toContain("[STD-025] Suppression");
  });

  it("fails stale baseline entries and rejects the old directive after its entry is removed", async () => {
    const scoped = {
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({ directive: `{/* eslint-disable-next-line ${imageRule} */}` }),
    };
    const stale = await check({ ...scoped, [baselinePath]: JSON.stringify([legacyEntry]) });
    const regressed = await check({
      ...scoped,
      [imagePath]: scentButton({ before: legacy }),
      [baselinePath]: "[]",
    });
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("[STD-025] stale or changed GAP-006 entry");
    expect(regressed.status).toBe(1);
    expect(regressed.stderr).toContain("[STD-025] Suppression");
  });

  it("rejects an approved-looking directive when it covers additional rules or different artwork", async () => {
    const scoped = `{/* eslint-disable-next-line ${imageRule} */}`;
    const extraRule = await check({
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({
        directive: `{/* eslint-disable-next-line ${imageRule}, curly */}`,
      }),
    });
    const changedAsset = await check({
      [assetsPath]: approvedAssets.replace("scent-fresh-natural.png", "different.png"),
      [imagePath]: scentButton({ directive: scoped }),
    });
    for (const result of [extraRule, changedAsset]) {
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("[STD-025] Suppression");
    }
  });
});
