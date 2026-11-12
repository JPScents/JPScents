import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, lstatSync, openSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const QUALITY_STAGES = [
  "node --version",
  "npm run architecture:check",
  "npm run format:check",
  "npm run lint",
  "npm run typecheck -- --incremental false",
  "npm run test -- --no-cache --configLoader runner",
  "npm run test:integration -- --no-cache --configLoader runner --reporter=json --outputFile=<temporary report>",
];

const ACCEPTANCE_STAGES = [
  "node --version",
  "npm run test:integration:acceptance -- --no-cache --configLoader runner --reporter=json --outputFile=<temporary report>",
];

function git(...args) {
  return execFileSync("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function digest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function worktreeEntry(root, path) {
  const parts = path.split("/");
  const name = parts.pop();
  let parent = root;
  for (const part of parts) {
    parent = join(parent, part);
    if (!lstatSync(parent, { throwIfNoEntry: false })?.isDirectory()) {
      return [null, null];
    }
  }
  const file = join(parent, name);
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) {
    return [null, null];
  }
  if (stat.isSymbolicLink()) {
    return [stat.mode, digest(readlinkSync(file, { encoding: "buffer" }))];
  }
  if (!stat.isFile()) {
    throw new Error(
      "The snapshot contains a changed entry that requires an isolated Git revision.",
    );
  }
  return [stat.mode, digest(readFileSync(file))];
}

function snapshot(baseRef) {
  const root = git("rev-parse", "--show-toplevel").trim();
  const base = git("rev-parse", "--verify", "--end-of-options", `${baseRef}^{commit}`).trim();
  const head = git("rev-parse", "--verify", "HEAD^{commit}").trim();
  const changes = git(
    "-C",
    root,
    "status",
    "--porcelain=v1",
    "-z",
    "--no-renames",
    "--untracked-files=all",
    "--ignore-submodules=none",
  )
    .split("\0")
    .filter(Boolean)
    .sort();
  const files = changes.map((entry) => {
    const path = entry.slice(3);
    // Use Git metadata before opening files. Sensitive paths require a clean, isolated candidate.
    if (
      path
        .split("/")
        .some(
          (part) =>
            /^(?:\.aws|\.npmrc|\.netrc|secrets?)$/i.test(part) ||
            (/^\.env/i.test(part) && !/^\.env(?:\.[\w-]+)*\.(?:example|template)$/i.test(part)),
        ) ||
      /\.(?:pem|key|p12|pfx)$/i.test(path)
    ) {
      throw new Error(
        "A sensitive path is present in the candidate changes. Use an isolated checkout.",
      );
    }
    return [entry, ...worktreeEntry(root, path)];
  });
  const index = digest(git("-C", root, "ls-files", "--stage", "-z"));
  const identity = { base, head, dirty: changes.length > 0 };
  return { ...identity, digest: digest(JSON.stringify({ ...identity, index, files })) };
}

function readSnapshot(value) {
  if (
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value?.base) ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value?.head) ||
    typeof value.dirty !== "boolean" ||
    !/^[a-f0-9]{64}$/.test(value.digest)
  ) {
    throw new Error("Snapshot metadata is missing or malformed.");
  }
  return value;
}

function sameSnapshot(first, second) {
  return ["base", "head", "dirty", "digest"].every((key) => first[key] === second[key]);
}

function readQualityReport(log) {
  const lines = log.split(/\r?\n/).filter((line) => line.startsWith("VERIFY_EVIDENCE "));
  if (lines.length !== 1) {
    throw new Error("Expected exactly one canonical VERIFY_EVIDENCE record.");
  }
  return JSON.parse(lines[0].slice("VERIFY_EVIDENCE ".length));
}

function validateVerificationReport(report, exitCode, candidate, mode = "quality") {
  const commands = mode === "quality" ? QUALITY_STAGES : ACCEPTANCE_STAGES;
  const minimumCases = mode === "quality" ? 5 : 3;
  if (
    report?.mode !== mode ||
    !["PASS", "FAIL", "BLOCKED"].includes(report.status) ||
    typeof report.node !== "string" ||
    !/^24\.\d+\.\d+$/.test(report.node) ||
    report.exitCode !== exitCode ||
    exitCode !== (report.status === "PASS" ? 0 : 1) ||
    report.head !== candidate.head ||
    report.dirty !== candidate.dirty ||
    !Array.isArray(report.stages) ||
    report.stages.length !== commands.length ||
    !report.stages.every(
      (stage, index) =>
        stage?.command === commands[index] &&
        ["PASS", "FAIL", "BLOCKED", "NOT RUN"].includes(stage.status) &&
        (stage.exitCode === null || (Number.isInteger(stage.exitCode) && stage.exitCode >= 0)) &&
        (stage.status !== "PASS" || stage.exitCode === 0),
    )
  ) {
    throw new Error(
      "Canonical evidence schema, observed exit or candidate identity did not match.",
    );
  }

  const stageStatuses = report.stages.map((stage) => stage.status);
  if (
    stageStatuses.some((status) => status === "BLOCKED" || status === "NOT RUN") ||
    report.stages.some((stage) => stage.exitCode === null)
  ) {
    throw new Error("Required quality checks were unavailable or incomplete.");
  }
  if (report.status === "FAIL" && stageStatuses.includes("FAIL")) {
    return { status: "CHANGES REQUIRED", reason: "A required quality stage failed." };
  }
  if (report.status !== "PASS" || stageStatuses.some((status) => status !== "PASS")) {
    throw new Error("Required quality checks were unavailable or incomplete.");
  }
  const counts = report.stages.at(-1).counts;
  if (
    !Number.isInteger(counts?.selected) ||
    counts.selected < minimumCases ||
    counts.passed !== counts.selected ||
    counts.failed !== 0
  ) {
    throw new Error("Required PostgreSQL results were incomplete.");
  }
  return { status: "PASS", snapshot: candidate.digest };
}

function validateCi(logPath, head, artifactPath, mode = "quality") {
  if (mode !== "quality" && mode !== "acceptance") {
    throw new Error("Expected quality or acceptance evidence.");
  }
  if (!/^[0-9a-f]{40}$/.test(head)) {
    throw new Error("Expected the full GitHub candidate SHA.");
  }
  const report = readQualityReport(readFileSync(logPath, "utf8"));
  validateVerificationReport(report, 0, { head, dirty: false }, mode);
  writeFileSync(artifactPath, JSON.stringify(report) + "\n", { flag: "wx", mode: 0o600 });
  return 0;
}

function validateCapture(directory) {
  const record = JSON.parse(readFileSync(join(directory, "verify.json"), "utf8"));
  const log = readFileSync(join(directory, "verify.log"));
  if (
    record?.version !== 1 ||
    record.command !== "npm run verify" ||
    ![0, 1].includes(record.exitCode) ||
    record.logDigest !== digest(log)
  ) {
    throw new Error("Quality capture is missing, incomplete or has a different log digest.");
  }
  const before = readSnapshot(record.before);
  const after = readSnapshot(record.after);
  if (!sameSnapshot(before, after) || !sameSnapshot(after, snapshot(after.base))) {
    throw new Error("Candidate snapshot changed. Recapture evidence and request a new review.");
  }
  const result = validateVerificationReport(
    readQualityReport(log.toString("utf8")),
    record.exitCode,
    after,
  );
  console.log(JSON.stringify(result));
  return result.status === "PASS" ? 0 : 1;
}

function capture(base, directory) {
  const before = snapshot(base);
  const logPath = join(directory, "verify.log");
  const log = openSync(logPath, "wx", 0o600);
  let child;
  try {
    child = spawnSync("npm", ["run", "verify"], { stdio: ["ignore", log, log] });
  } finally {
    closeSync(log);
  }
  const record = {
    version: 1,
    command: "npm run verify",
    exitCode: child.status,
    before,
    after: snapshot(base),
    logDigest: digest(readFileSync(logPath)),
  };
  writeFileSync(join(directory, "verify.json"), JSON.stringify(record) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  return validateCapture(directory);
}

function main([mode, ...args]) {
  if (mode === "snapshot" && args.length === 1) {
    console.log(JSON.stringify(snapshot(args[0])));
    return 0;
  }
  if (mode === "capture" && args.length === 2) {
    return capture(...args);
  }
  if (mode === "validate" && args.length === 1) {
    return validateCapture(args[0]);
  }
  if (mode === "validate-ci" && (args.length === 3 || args.length === 4)) {
    return validateCi(...args);
  }
  throw new Error(
    "Use snapshot <base>, capture <base> <evidence-dir>, validate <evidence-dir>, or validate-ci <log> <sha> <artifact> [quality|acceptance].",
  );
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  // Git and JSON exceptions can include paths or raw captured output.
  const reason =
    error instanceof SyntaxError
      ? "Verification JSON is malformed."
      : error?.code || error?.status !== undefined
        ? "Could not read required snapshot or evidence."
        : error.message;
  console.error(JSON.stringify({ status: "BLOCKED", reason }));
  process.exitCode = 1;
}
