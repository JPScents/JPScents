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

type Mode = "quality" | "acceptance";

function verificationReport(mode: Mode) {
  const quality = mode === "quality";
  const databaseStage = `npm run test:integration${quality ? "" : ":acceptance"} -- --no-cache --configLoader runner --reporter=json --outputFile=<temporary report>`;
  const commands = [
    "node --version",
    ...(quality
      ? [
          "npm run architecture:check",
          "npm run format:check",
          "npm run lint",
          "npm run typecheck -- --incremental false",
          "npm run test -- --no-cache --configLoader runner",
        ]
      : []),
    databaseStage,
  ];
  const count = quality ? 5 : 3;
  return {
    mode,
    status: "PASS",
    exitCode: 0,
    node: "24.14.1",
    head: candidateSha,
    dirty: false,
    stages: commands.map((command) => ({
      command,
      status: "PASS",
      exitCode: 0,
      ...(command === databaseStage
        ? { counts: { selected: count, passed: count, failed: 0 } }
        : {}),
    })),
  };
}

function runQualityStep(mode: Mode, verifierOutput: string, verifierExit = 0) {
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
    const artifact = join(evidence, mode === "quality" ? "verification.json" : "acceptance.json");
    mkdirSync(evidence);
    writeFileSync(context, `commit=${candidateSha}\ncommand=npm run verify\n`);
    for (const reportMode of ["quality", "acceptance"] as const) {
      const output =
        mode === reportMode ? verifierOutput : outputFor(verificationReport(reportMode));
      writeFileSync(join(directory, reportMode + ".txt"), output);
    }
    writeFileSync(
      join(directory, "npm"),
      `#!/bin/sh\ncase "$*" in\n  'run verify') mode=quality ;;\n  'run verify:acceptance') mode=acceptance ;;\n  *) exit 99 ;;\nesac\ncat "$RUNNER_TEMP/$mode.txt"\n[ "$mode" != '${mode}' ] || exit ${verifierExit}\n`,
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

describe.each(["quality", "acceptance"] as const)("%s workflow evidence", (mode) => {
  const artifactName = mode === "quality" ? "verification" : "acceptance";
  it("publishes one complete report for the candidate after a successful verifier exit", () => {
    const report = verificationReport(mode);
    const result = runQualityStep(mode, `Verification ${mode}: PASS\n${outputFor(report)}`);

    expect(result.exit).toBe(0);
    expect(result.context).toContain(`${artifactName}_exit=0\n`);
    expect(JSON.parse(result.artifact ?? "")).toEqual(report);
  });

  const valid = verificationReport(mode);
  const schemaError =
    "Canonical evidence schema, observed exit or candidate identity did not match.";
  const incomplete = "Required quality checks were unavailable or incomplete.";

  it.each([
    ["missing marker", "Verification quality: PASS\n", "Expected exactly one"],
    ["duplicate marker", outputFor(valid).repeat(2), "Expected exactly one"],
    ["malformed JSON", `${marker}{\n`, "Verification JSON is malformed."],
    ["wrong schema", outputFor({ ...valid, node: null }), schemaError],
    [
      "wrong mode",
      outputFor({ ...valid, mode: mode === "quality" ? "acceptance" : "quality" }),
      schemaError,
    ],
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
          { ...valid.stages.at(-1), counts: { selected: 5, passed: 4, failed: 0 } },
        ],
      }),
      "Required PostgreSQL results were incomplete.",
    ],
  ])("fails closed for %s", (_scenario, output, message) => {
    const result = runQualityStep(mode, output);

    expect(result.exit).toBe(1);
    expect(result.stderr).toContain(message);
    expect(result.artifact).toBeNull();
  });

  it("preserves the verifier's non-zero exit even when it prints a passing report", () => {
    const result = runQualityStep(mode, outputFor(valid), 7);

    expect(result.exit).toBe(7);
    expect(result.context).toContain(`${artifactName}_exit=7\n`);
    expect(result.artifact).toBeNull();
  });
});
