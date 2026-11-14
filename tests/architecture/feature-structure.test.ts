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
  for (const directory of ["src/modules", "scripts", "prisma", "tests"]) {
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
      "src/modules/shop/types/index.ts":
        'import type { Perfume } from "@/infrastructure/database/generated/client"; export type Product = Pick<Perfume, "id">;',
      "src/modules/shop/index.ts": 'export type { Product } from "./types";',
      "src/modules/shop/repositories/admin/perfume.repository.ts":
        'import { prisma } from "@/infrastructure/database/prisma"; export async function listPerfumes() { return await prisma.perfume.findMany(); }',
    });
    expect(result.status, result.stderr).toBe(0);
  });
  it("rejects root implementations and misleading schema and repository filenames", async () => {
    const result = await check({
      "src/modules/BadFeature/index.ts": 'export type { Product } from "./types";',
      "src/modules/shop/shop.query.ts": "export const value = 1;",
      "src/modules/shop/repositories/shop.query.ts": "export const value = 1;",
      "src/modules/shop/schemas/parse.ts": "export const parse = () => null;",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/modules/BadFeature [STD-001]");
    expect(result.stderr).toContain("not the module root");
    expect(result.stderr).toContain("repositories/ responsibility convention");
    expect(result.stderr).toContain("schemas/ responsibility convention");
  });
  it("rejects client aliases, re-exports, namespace access and transactions outside repositories", async () => {
    const result = await check({
      "src/modules/shop/services/shop.service.ts":
        'import { prisma as db } from "@/infrastructure/database/prisma"; db.$transaction([]);',
      "src/shared/escape.ts": 'export { prisma } from "@/infrastructure/database/prisma";',
      "src/app/page.tsx":
        'import { Prisma } from "@/infrastructure/database/generated/client"; export default function Page() { return null; }',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("$transaction access belongs only in repositories");
    expect(result.stderr).toContain("src/shared/escape.ts");
    expect(result.stderr).toContain("src/app/page.tsx");
  });
  it("rejects private cross-module imports and domain-dependent shared UI and infrastructure", async () => {
    const result = await check({
      "src/modules/orders/services/order.service.ts":
        'import { save } from "@/modules/customers/repositories/customer.repository";',
      "src/ui/Shared.tsx": 'import { Order } from "@/modules/orders";',
      "src/infrastructure/supabase/storage.ts": 'import type { Order } from "@/modules/orders";',
      "src/modules/orders/services/presentation.service.ts":
        'import { Widget } from "@/app/_components/Widget"; import { cache } from "react";',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("consume customers through its public entry points");
    expect(result.stderr).toContain(
      "infrastructure and generic shared code must not depend on business modules",
    );
    expect(result.stderr).toMatch(/storage\.ts:.*\[ARC-07\]/);
    expect(result.stderr).toMatch(/presentation\.service\.ts:.*\[ARC-07\].*app routes/);
  });

  it("allows one-way public imports, type contracts and the standalone seed client lifecycle", async () => {
    const result = await check({
      "src/modules/catalogue/index.ts": 'export type { Product } from "./types";',
      "src/modules/catalogue/types/index.ts": "export type Product = { id: string };",
      "src/modules/catalogue/server.ts":
        'import "server-only"; export { list } from "./repositories/product.repository";',
      "src/modules/catalogue/repositories/product.repository.ts":
        'import { prisma } from "@/infrastructure/database/prisma"; export const list = () => prisma.perfume.findMany();',
      "src/modules/cart/services/cart.service.ts":
        'import type { Product } from "@/modules/catalogue"; export const load = () => import("../../catalogue/server");',
      "prisma/seed.ts":
        'import { PrismaClient } from "../src/infrastructure/database/generated/client"; import { seed } from "./repositories/demo.repository"; const client = new PrismaClient(); seed(client).finally(() => client.$disconnect());',
      "prisma/repositories/demo.repository.ts":
        'import type { PrismaClient } from "../../src/infrastructure/database/generated/client"; export const seed = (client: PrismaClient) => client.perfume.findMany();',
      "tests/cart.test.ts": 'import { load } from "@/modules/cart/services/cart.service";',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects a transitive module cycle through public entries and a literal dynamic import", async () => {
    const result = await check({
      "src/modules/alpha/index.ts": 'export { first } from "./services/alpha.service";',
      "src/modules/alpha/services/alpha.service.ts":
        'export { second as first } from "@/modules/beta";',
      "src/modules/beta/index.ts": 'export { second } from "./services/beta.service";',
      "src/modules/beta/services/beta.service.ts":
        'import { third } from "@/modules/gamma"; export const second = third;',
      "src/modules/gamma/index.ts": 'export { third } from "./services/gamma.service";',
      "src/modules/gamma/services/gamma.service.ts":
        'export const third = () => import("../../alpha/index");',
    });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toMatch(/gamma\.service\.ts:1:\d+ \[ARC-07\]/);
    expect(result.stderr).toContain("module dependency cycle: alpha → beta → gamma → alpha");
  });

  it("rejects literal private loads and persistence imports outside the owning repository boundary", async () => {
    const result = await check({
      "src/modules/catalogue/services/catalogue.service.ts": "export const catalogue = {};",
      "src/modules/cart/services/cart.service.ts":
        'export const load = () => import("@/modules/catalogue/./services/catalogue.service");',
      "src/modules/cart/repositories/cart.repository.ts":
        'import { PrismaClient as Client } from "@/infrastructure/database/generated/client"; export const client = new Client();',
      "src/app/repositories/fake.repository.ts":
        'import db = require("../../infrastructure/database/prisma");',
      "src/infrastructure/database/prisma.ts":
        'import { PrismaClient } from "./generated/client"; const client = new PrismaClient(); client.$queryRaw`SELECT 1`;',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/cart\.service\.ts:1:\d+ \[ARC-07\].*public entry points/);
    expect(result.stderr).toMatch(/cart\.repository\.ts:1:\d+ \[ARC-09\]/);
    expect(result.stderr).toMatch(/fake\.repository\.ts:1:\d+ \[ARC-09\]/);
    expect(result.stderr).toMatch(
      /src\/infrastructure\/database\/prisma\.ts:1:\d+ \[ARC-09\].*\$queryRaw/,
    );
  });

  it("fails on malformed source and unsupported scan targets", async () => {
    const malformed = await check({ "src/app/page.tsx": "export const result = ;" });
    const unsupported = await check({}, ["src/app"]);
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toMatch(/src\/app\/page\.tsx:1:\d+ \[ARC-02\] invalid source/);
    expect(unsupported.status).toBe(1);
    expect(unsupported.stderr).toContain("[ARC-02] unsupported scan target");
  });

  it("allows browser data contracts and a callable Server Action edge", async () => {
    const result = await check({
      "src/modules/orders/index.ts": 'export type { Order } from "./types";',
      "src/modules/orders/types/index.ts": "export type Order = { id: string };",
      "src/modules/orders/server.ts":
        'import "server-only"; export { create } from "./services/order.service";',
      "src/modules/orders/services/order.service.ts": 'export const create = () => "test";',
      "src/app/_actions/order.action.ts":
        '"use server"; import { create } from "@/modules/orders/server"; export async function order() { return create(); }',
      "src/app/_components/Buy.tsx":
        '"use client"; import { type Order } from "@/modules/orders"; import { order } from "../_actions/order.action"; export { order }; export type { Order };',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it("rejects transitive browser access to marked server code and the generated client runtime", async () => {
    const result = await check({
      "src/app/_components/Buy.tsx":
        '"use client"; import { secret } from "../_lib/reexport"; import { OrderStatus } from "@/infrastructure/database/generated/client";',
      "src/app/_lib/reexport.ts": 'export { secret } from "@/modules/orders/server";',
      "src/modules/orders/server.ts":
        'import "server-only"; export { secret } from "./services/order.service";',
      "src/modules/orders/services/order.service.ts": 'export const secret = () => "fixture";',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/orders\/server\.ts:.*\[ARC-08\]/);
    expect(result.stderr).toMatch(/Buy\.tsx:.*\[ARC-08\].*generated\/client/);
  });

  it("keeps neutral module entries free of privileged imports and rejects legacy source", async () => {
    const result = await check({
      "src/modules/orders/index.ts": 'export { query } from "./services/order.service";',
      "src/modules/orders/services/order.service.ts":
        'import "server-only"; export const query = () => "fixture";',
      "src/features/legacy/index.ts": "export const value = 1;",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/order\.service\.ts:.*\[ARC-08\]/);
    expect(result.stderr).toContain("src/features/legacy/index.ts [ARC-01]");
  });

  it("retains responsibility naming rules for relocated UI and actions", async () => {
    const result = await check({
      "src/app/(public)/_cart/hooks/cart.ts": 'export const cart = "fixture";',
      "src/app/(admin)/admin/_actions/incorrect.ts": 'export const action = "fixture";',
      "src/app/(admin)/admin/_actions/update-perfume.admin.action.ts":
        'export const action = "fixture";',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("cart.ts [STD-001] name does not follow the hooks/");
    expect(result.stderr).toContain("incorrect.ts [STD-001] name does not follow the actions/");
    expect(result.stderr).toContain("update-perfume.admin.action.ts [STD-001]");
  });

  it("keeps the direct module scan usable and identifies its limited scope", async () => {
    const result = await check(
      { "src/modules/cart/index.ts": 'export type { Cart } from "./types";' },
      ["src/modules/cart"],
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("scoped structure and Prisma checks passed");
  });
});

const imageRule = "@next/next/no-img-element";
const imagePath = "src/app/(public)/help-me-choose/_components/ScentCharacterSelect.tsx";
const browsePath = "src/app/(public)/_components/ScentCharacterBrowse.tsx";
const assetsPath = "src/app/(public)/_lib/scent-character-content.ts";
const legacy = `/* eslint-disable ${imageRule} -- local controlled scent assets are decorative. */`;

const approvedAssets = `export const scentCharacterContent = {
  FRESH: { image: "/scent-characters/scent-fresh-natural.png" },
  WARM: { image: "/scent-characters/scent-warm-natural.png" },
  SWEET: { image: "/scent-characters/scent-sweet-natural.png" },
  WOODY: { image: "/scent-characters/scent-woody-natural.png" },
};`;

function scentButton({ before = "", directive = "", extra = "" } = {}) {
  return `import { scentCharacterContent } from "../../_lib/scent-character-content";
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

describe("decorative-image suppression scope", () => {
  it("accepts only the existing decorative image at each moved component", async () => {
    const button = scentButton({
      directive: `{/* eslint-disable-next-line ${imageRule} -- decorative */}`,
    });
    const browse = button
      .replace("../../_lib/", "../_lib/")
      .replace("ScentCharacterSelect", "ScentCharacterBrowse")
      .replace("<button aria-pressed={false}>", '<Link href="/">')
      .replace("</button>", "</Link>");
    const result = await check({
      [assetsPath]: approvedAssets,
      [imagePath]: button,
      [browsePath]: browse,
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

  it("rejects the legacy file-wide directive and expansion to another image", async () => {
    const broad = await check({
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({ before: legacy }),
    });
    const expanded = await check({
      [assetsPath]: approvedAssets,
      [imagePath]: scentButton({
        directive: `{/* eslint-disable-next-line ${imageRule} */}`,
        extra: '<img src="/other.png" alt="" />',
      }),
    });
    for (const result of [broad, expanded]) {
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("[STD-025] Suppression");
    }
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
