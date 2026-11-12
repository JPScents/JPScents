// @vitest-environment node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

let directory: string | undefined;

afterEach(() => {
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

function verifyFixture(
  lintExit: number,
  extraEnv: NodeJS.ProcessEnv = { NODE_ENV: "test" },
  args: string[] = [],
) {
  directory = mkdtempSync(join(tmpdir(), "jpscents-verify-test-"));
  mkdirSync(join(directory, "scripts"));
  copyFileSync(
    new URL("../../scripts/verify.mjs", import.meta.url),
    join(directory, "scripts/verify.mjs"),
  );
  mkdirSync(join(directory, "src/db/generated"), { recursive: true });
  for (const file of ["client.ts", "enums.ts"]) {
    writeFileSync(join(directory, "src/db/generated", file), "");
  }
  mkdirSync(join(directory, "node_modules/.bin"), { recursive: true });
  mkdirSync(join(directory, "node_modules/typescript"));
  writeFileSync(join(directory, "node_modules/typescript/package.json"), "{}");
  for (const bin of ["prettier", "eslint", "tsc", "vitest"]) {
    writeFileSync(join(directory, "node_modules/.bin", bin), "");
  }
  const bin = join(directory, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "initdb"), "#!/bin/sh\nexit 1\n", { mode: 0o700 });
  const scripts = {
    verify: "node scripts/verify.mjs quality",
    "architecture:check": "exit 0",
    "format:check": "exit 0",
    lint: `exit ${lintExit}`,
    typecheck: "node -e '' --",
    test: "node -e '' --",
    "test:integration": "exit 99",
  };
  writeFileSync(join(directory, "package.json"), JSON.stringify({ scripts }));
  return spawnSync("npm", ["run", "verify", ...args], {
    cwd: directory,
    encoding: "utf8",
    env: {
      PATH: [bin, dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter),
      ...extraEnv,
    },
  });
}

describe("canonical verification", () => {
  it("returns non-zero for a failed mandatory stage and reports later independent checks", () => {
    const result = verifyFixture(7, { NODE_ENV: "test", DATABASE_URL: "verification-sentinel" });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Verification quality: FAIL");
    expect(result.stdout).toContain("FAIL | npm run lint | exit 7");
    expect(result.stdout).toContain(
      "PASS | npm run test -- --no-cache --configLoader runner | exit 0",
    );
    expect(result.stdout).toContain("Unset DATABASE_URL before running");
    expect(result.stdout + result.stderr).not.toContain("verification-sentinel");
  }, 15_000);

  it("blocks verification before running integration when PostgreSQL is unavailable", () => {
    const result = verifyFixture(0);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Verification quality: BLOCKED");
    expect(result.stdout).toMatch(/BLOCKED \| npm run test:integration .* \| exit n\/a/);
    expect(result.stdout).toMatch(
      /PostgreSQL prerequisite unavailable: initdb --version|as a non-root user/,
    );
    expect(result.stdout).not.toContain("Running npm run test:integration");
  }, 15_000);

  it("rejects extra arguments that could replace the quality mode", () => {
    const result = verifyFixture(0, undefined, ["--", "acceptance"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage: npm run verify or npm run verify:acceptance");
    expect(result.stdout).not.toContain("Running npm run");
  });
});
