import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { PATH: process.env.PATH, CI: "1", NO_COLOR: "1" };
const testArgs = ["--no-cache", "--configLoader", "runner"];
const currentDatabase = {
  script: "test:integration",
  args: testArgs,
  tool: ".bin/vitest",
  needsClient: true,
  database: { group: "PostgreSQL current", minimum: 5 },
};
const acceptanceDatabase = {
  script: "test:integration:acceptance",
  args: testArgs,
  tool: ".bin/vitest",
  needsClient: true,
  database: { group: "PostgreSQL approved acceptance", minimum: 19 },
};

function run(file, args, options = {}) {
  return spawnSync(file, args, { cwd: root, env, encoding: "utf8", ...options });
}

function gitContext() {
  const revision = run("git", ["rev-parse", "HEAD"]);
  const tree = run("git", ["status", "--porcelain", "--untracked-files=normal"]);
  return {
    head: revision.status === 0 ? revision.stdout.trim() : null,
    dirty: tree.status === 0 ? tree.stdout.trim().length > 0 : null,
  };
}

function databasePrerequisite() {
  for (const name of ["DATABASE_URL", "DIRECT_URL", "APP_ENV_FILE"]) {
    if (Object.hasOwn(process.env, name)) {
      return `Unset ${name} before running the disposable PostgreSQL checks.`;
    }
  }
  if (process.getuid?.() === 0) {
    return "Run the disposable PostgreSQL checks as a non-root user.";
  }
  for (const binary of ["initdb", "pg_ctl", "psql"]) {
    const probe = run(binary, ["--version"], { stdio: "ignore", timeout: 5_000 });
    if (probe.status !== 0) {
      return `PostgreSQL prerequisite unavailable: ${binary} --version. Put working PostgreSQL binaries on PATH.`;
    }
  }
  return null;
}

function databaseResult(stage, child, reportPath) {
  const exitCode = child.status;
  if (child.error || child.signal) {
    return failedProcess(child);
  }
  if (!existsSync(reportPath)) {
    return { status: "FAIL", exitCode, detail: "Vitest did not produce a database test report." };
  }

  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch {
    return { status: "FAIL", exitCode, detail: "Vitest database test report could not be read." };
  }
  if (
    !Array.isArray(report?.testResults) ||
    typeof report.success !== "boolean" ||
    !report.testResults.every((suite) => Array.isArray(suite?.assertionResults))
  ) {
    return {
      status: "FAIL",
      exitCode,
      detail: "Vitest database test report has an invalid format.",
    };
  }
  const selected = report.testResults
    .flatMap((suite) => suite.assertionResults)
    .filter(
      (test) =>
        typeof test?.ancestorTitles?.[0] === "string" &&
        (test.ancestorTitles[0] === stage.database.group ||
          test.ancestorTitles[0].startsWith(stage.database.group + " ")),
    );
  const passed = selected.filter((test) => test.status === "passed").length;
  const failed = selected.filter((test) => test.status === "failed");
  const counts = { selected: selected.length, passed, failed: failed.length };

  const startupFailure = report.testResults.find(
    (suite) =>
      typeof suite.message === "string" &&
      suite.message.startsWith("Disposable PostgreSQL startup failed:"),
  );
  if (exitCode !== 0 && passed === 0 && failed.length === 0 && startupFailure) {
    const reason = startupFailure.message.includes("could not create shared memory")
      ? "PostgreSQL could not allocate shared memory."
      : "The private PostgreSQL cluster did not start.";
    return {
      status: "BLOCKED",
      exitCode,
      detail: `${reason} Use a host that permits PostgreSQL shared memory and local sockets.`,
      counts,
    };
  }
  if (failed.length > 0) {
    return {
      status: "FAIL",
      exitCode,
      detail: failed.map((test) => test.title).join(" | "),
      counts,
    };
  }
  if (exitCode !== 0 || !report.success) {
    return {
      status: "FAIL",
      exitCode,
      detail: `Database suite failed outside its cases. Run npm run ${stage.script} for migration or harness diagnostics.`,
      counts,
    };
  }
  if (passed < stage.database.minimum || passed !== selected.length) {
    return {
      status: "FAIL",
      exitCode,
      detail: `Incomplete suite. Expected at least ${stage.database.minimum} selected cases, all executed and passing.`,
      counts,
    };
  }
  return { status: "PASS", exitCode, counts };
}

function failedProcess(child) {
  const reason = child.error?.code ?? child.signal ?? "unknown process error";
  return { status: "FAIL", exitCode: child.status, detail: `Could not complete stage: ${reason}.` };
}

function runStage(stage, blocked) {
  const args = stage.args ?? [];
  const command = ["npm", "run", stage.script, ...(args.length ? ["--", ...args] : [])];
  const reportArgs = stage.database ? ["--reporter=json", "--outputFile=<temporary report>"] : [];
  const label = [...command, ...reportArgs].join(" ");

  if (blocked) {
    return { command: label, status: "NOT RUN", exitCode: null, detail: blocked };
  }
  if (!existsSync(join(root, "node_modules", stage.tool))) {
    return {
      command: label,
      status: "BLOCKED",
      exitCode: null,
      detail: `Required local tool missing: node_modules/${stage.tool}. Install the locked project dependencies.`,
    };
  }
  if (
    stage.needsClient &&
    !["client.ts", "enums.ts"].every((file) =>
      existsSync(join(root, "src/infrastructure/database/generated", file)),
    )
  ) {
    return {
      command: label,
      status: "BLOCKED",
      exitCode: null,
      detail: "Generated Prisma client missing. Follow README's isolated generation instructions.",
    };
  }
  if (stage.database) {
    const missing = databasePrerequisite();
    if (missing) {
      return { command: label, status: "BLOCKED", exitCode: null, detail: missing };
    }
  }

  console.log(`\nRunning ${label}`);
  let result;
  if (stage.database) {
    const directory = mkdtempSync(join(tmpdir(), "jpscents-verify-"));
    try {
      const reportPath = join(directory, "vitest.json");
      const child = run(
        "npm",
        [...command.slice(1), "--reporter=json", `--outputFile=${reportPath}`],
        {
          maxBuffer: 8 * 1024 * 1024,
        },
      );
      result = databaseResult(stage, child, reportPath);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  } else {
    const child = run("npm", command.slice(1), { stdio: "inherit" });
    if (child.error || child.signal) {
      result = failedProcess(child);
    } else {
      result = { status: child.status === 0 ? "PASS" : "FAIL", exitCode: child.status };
    }
  }
  return { command: label, ...result };
}

function main(args) {
  const [mode] = args;
  if (args.length !== 1 || (mode !== "quality" && mode !== "acceptance")) {
    console.error("Usage: npm run verify or npm run verify:acceptance");
    return 1;
  }
  const stages =
    mode === "quality"
      ? [
          { script: "architecture:check", tool: "typescript/package.json" },
          { script: "format:check", tool: ".bin/prettier" },
          { script: "lint", tool: ".bin/eslint" },
          {
            script: "typecheck",
            tool: ".bin/tsc",
            args: ["--incremental", "false"],
            needsClient: true,
          },
          { script: "test", tool: ".bin/vitest", args: testArgs, needsClient: true },
          currentDatabase,
        ]
      : [acceptanceDatabase];
  const context = gitContext();
  const probe = run(process.execPath, ["--version"]);
  const runtime = { command: "node --version", status: "PASS", exitCode: probe.status };
  if (probe.status !== 0) {
    runtime.status = "FAIL";
    runtime.detail = "Could not verify the Node runtime.";
  } else if (!probe.stdout.startsWith("v24.")) {
    runtime.status = "BLOCKED";
    runtime.detail = "This repository requires Node 24.x.";
  }
  const results = [runtime];

  for (const stage of stages) {
    try {
      results.push(runStage(stage, runtime.detail));
    } catch {
      results.push({
        command: `npm run ${stage.script}`,
        status: "FAIL",
        exitCode: null,
        detail: "Unexpected verification error while running the stage or handling its evidence.",
      });
    }
  }

  let status = "PASS";
  if (results.some((stage) => stage.status === "FAIL")) {
    status = "FAIL";
  } else if (results.some((stage) => stage.status !== "PASS")) {
    status = "BLOCKED";
  }
  console.log(`\nVerification ${mode}: ${status} (Node ${process.versions.node})`);
  for (const stage of results) {
    const code = stage.exitCode ?? "n/a";
    const detail = stage.detail ? ` — ${stage.detail}` : "";
    const counts = stage.counts ? ` — ${stage.counts.passed}/${stage.counts.selected} passed` : "";
    console.log(`  ${stage.status} | ${stage.command} | exit ${code}${counts}${detail}`);
  }
  console.log(`  Git HEAD ${context.head ?? "unknown"} | dirty ${context.dirty ?? "unknown"}`);
  console.log("Release readiness is assessed separately under the verification contract.");
  const exitCode = status === "PASS" ? 0 : 1;
  console.log(
    `VERIFY_EVIDENCE ${JSON.stringify({ mode, status, exitCode, node: process.versions.node, ...context, stages: results })}`,
  );
  return exitCode;
}

process.exitCode = main(process.argv.slice(2));
