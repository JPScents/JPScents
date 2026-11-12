// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const candidateSha = "a".repeat(40);
const marker = "VERIFY_EVIDENCE ";

function qualityReport() {
  return {
    mode: "quality",
    status: "PASS",
    exitCode: 0,
    node: "24.14.1",
    head: candidateSha,
    dirty: false,
    stages: [
      "node --version",
      "npm run architecture:check",
      "npm run format:check",
      "npm run lint",
      "npm run typecheck -- --incremental false",
      "npm run test -- --no-cache --configLoader runner",
      "npm run test:integration -- --no-cache --configLoader runner --reporter=json --outputFile=<temporary report>",
    ].map((command, index) => ({
      command,
      status: "PASS",
      exitCode: 0,
      ...(index === 6 ? { counts: { selected: 5, passed: 5, failed: 0 } } : {}),
    })),
  };
}

function runQualityStep(verifierOutput: string, verifierExit = 0) {
  const workflow = readFileSync(join(root, ".github/workflows/quality.yml"), "utf8");
  const step = workflow.match(
    /^      - name: Run canonical quality verification\n        shell: bash\n        run: \|\n((?:^ {10}.*\n|^\n)+)/m,
  );
  if (!step) {
    throw new Error("Could not locate the canonical quality shell step.");
  }
  const shell = step[1].replace(/^ {10}/gm, "");
  const directory = mkdtempSync(join(tmpdir(), "jpscents-ci-quality-"));
  try {
    const evidence = join(directory, "quality-evidence");
    const context = join(evidence, "context.txt");
    const artifact = join(evidence, "verification.json");
    mkdirSync(evidence);
    writeFileSync(context, `commit=${candidateSha}\ncommand=npm run verify\n`);
    writeFileSync(join(directory, "verifier-output.txt"), verifierOutput);
    writeFileSync(
      join(directory, "npm"),
      `#!/bin/sh\n[ "$*" = 'run verify' ] || exit 99\ncat "$RUNNER_TEMP/verifier-output.txt"\nexit ${verifierExit}\n`,
      { mode: 0o700 },
    );
    const result = spawnSync(
      "bash",
      ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", shell],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: [directory, dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter),
          GITHUB_SHA: candidateSha,
          RUNNER_TEMP: directory,
        },
      },
    );
    return {
      exit: result.status,
      stderr: result.stderr,
      context: readFileSync(context, "utf8"),
      artifact: existsSync(artifact) ? readFileSync(artifact, "utf8") : null,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function outputFor(report: unknown) {
  return `${marker}${JSON.stringify(report)}\n`;
}

describe("quality workflow evidence", () => {
  it("publishes one complete report for the candidate after a successful verifier exit", () => {
    const report = qualityReport();
    const result = runQualityStep(`Verification quality: PASS\n${outputFor(report)}`);

    expect(result.exit).toBe(0);
    expect(result.context).toContain("verification_exit=0\n");
    expect(JSON.parse(result.artifact ?? "")).toEqual(report);
  });

  const valid = qualityReport();
  const schemaError =
    "Canonical evidence schema, observed exit or candidate identity did not match.";
  const incomplete = "Required quality checks were unavailable or incomplete.";

  it.each([
    ["missing marker", "Verification quality: PASS\n", "Expected exactly one"],
    ["duplicate marker", outputFor(valid).repeat(2), "Expected exactly one"],
    ["malformed JSON", `${marker}{\n`, "Verification JSON is malformed."],
    ["wrong schema", outputFor({ ...valid, node: null }), schemaError],
    ["wrong mode", outputFor({ ...valid, mode: "acceptance" }), schemaError],
    ["wrong SHA", outputFor({ ...valid, head: "b".repeat(40) }), schemaError],
    ["dirty candidate", outputFor({ ...valid, dirty: true }), schemaError],
    ["partial stages", outputFor({ ...valid, stages: valid.stages.slice(0, -1) }), schemaError],
    [
      "skipped stage",
      outputFor({
        ...valid,
        stages: [
          { ...valid.stages[0], status: "NOT RUN", exitCode: null },
          ...valid.stages.slice(1),
        ],
      }),
      incomplete,
    ],
    [
      "incomplete PostgreSQL cases",
      outputFor({
        ...valid,
        stages: [
          ...valid.stages.slice(0, -1),
          { ...valid.stages[6], counts: { selected: 5, passed: 4, failed: 0 } },
        ],
      }),
      "Required PostgreSQL results were incomplete.",
    ],
  ])("fails closed for %s", (_scenario, output, message) => {
    const result = runQualityStep(output);

    expect(result.exit).toBe(1);
    expect(result.stderr).toContain(message);
    expect(result.artifact).toBeNull();
  });

  it("preserves the verifier's non-zero exit even when it prints a passing report", () => {
    const result = runQualityStep(outputFor(valid), 7);

    expect(result.exit).toBe(7);
    expect(result.context).toContain("verification_exit=7\n");
    expect(result.artifact).toBeNull();
  });
});
