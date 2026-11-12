import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "jpscents-e2e-"));
const configPath = join(directory, "supabase", "config.toml");
const prismaConfig = join(directory, "prisma-input");
const reportPath = join(directory, "browser-report.json");
const toolEnv = {
  PATH: process.env.PATH,
  CI: "1",
  DO_NOT_TRACK: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};
const supabase = ["--workdir", directory];
let attemptedStart = false;

function run(command, args, env = toolEnv, stdio = "pipe") {
  const result = spawnSync(command, args, {
    env,
    stdio,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 12 * 60 * 1000,
  });
  if (result.status !== 0) {
    const output = (result.stderr ?? "") + (result.stdout ?? "");
    const causes = [
      [
        /address already in use|port .* already in use|port is already allocated/i,
        "A test port is in use.",
      ],
      [
        /manifest unknown|manifest .* not found|no matching manifest/i,
        "A required container image is unavailable.",
      ],
      [
        /failed to pull|pull access denied|failed to resolve reference/i,
        "A required container image could not be pulled.",
      ],
      [
        /permission denied|cannot connect to the docker daemon/i,
        "The runner cannot access Docker or a required file.",
      ],
      [
        /container.*not healthy|health check failed/i,
        "A required local service failed its health check.",
      ],
      [/unknown (service|flag)|invalid.*exclude/i, "The local CLI rejected the service options."],
    ];
    const cause = causes.find(([pattern]) => pattern.test(output))?.[1];
    const action = command === "npm" ? args.slice(0, 2).join(" ") : args[0];
    throw new Error(
      [`${command} ${action} failed (exit ${result.status ?? "unavailable"}).`, cause]
        .filter(Boolean)
        .join(" "),
    );
  }
  return result.stdout;
}

function isLoopback(value, port) {
  if (typeof value !== "string") {
    return false;
  }
  const url = new URL(value);
  return ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === port;
}

function main() {
  mkdirSync(join(directory, "supabase", "templates"), { recursive: true });
  copyFileSync(
    "supabase/templates/magic_link.html",
    join(directory, "supabase", "templates", "magic_link.html"),
  );
  const config = readFileSync("supabase/config.toml", "utf8");
  writeFileSync(
    configPath,
    config.replace(
      /^project_id = .*$/m,
      `project_id = "jpscents-e2e-${randomBytes(4).toString("hex")}"`,
    ),
  );
  writeFileSync(prismaConfig, "", { mode: 0o600 });

  attemptedStart = true;
  run("supabase", [
    "start",
    ...supabase,
    "-x",
    "studio,realtime,edge-runtime,analytics,vector,imgproxy",
  ]);
  const stack = JSON.parse(run("supabase", ["status", ...supabase, "--output", "json"]));
  if (!isLoopback(stack.API_URL, "56321") || !isLoopback(stack.DB_URL, "56322")) {
    throw new Error("The browser suite requires the disposable local Supabase endpoints.");
  }
  const publishableKey = stack.PUBLISHABLE_KEY ?? stack.ANON_KEY;
  const secretKey = stack.SECRET_KEY ?? stack.SERVICE_ROLE_KEY;
  if (!publishableKey || !secretKey) {
    throw new Error("The disposable Auth and Storage credentials are unavailable.");
  }
  const appEnv = {
    ...toolEnv,
    APP_ENV_FILE: prismaConfig,
    DATABASE_URL: stack.DB_URL,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: stack.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    JP_SCENTS_ADMIN_EMAIL: "admin@example.test",
  };
  run("npm", ["run", "db:migrate:deploy"], appEnv);
  run("npm", ["run", "build"], appEnv);

  let browserFailed = false;
  try {
    run(
      "playwright",
      ["test"],
      {
        ...appEnv,
        JP_E2E_LOCAL_ADMIN_KEY: secretKey,
        JP_E2E_REPORT_PATH: reportPath,
      },
      "inherit",
    );
  } catch {
    browserFailed = true;
  }
  if (!browserFailed || existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const { expected, unexpected, flaky, skipped } = report;
    const head = run("git", ["rev-parse", "HEAD"]).trim();
    if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== head) {
      throw new Error("The browser report does not match the GitHub candidate.");
    }
    const stats = { head, expected, unexpected, flaky, skipped };
    console.log(
      `Browser E2E: ${expected} passed, ${unexpected} failed, ${flaky} flaky, ${skipped} skipped.`,
    );
    if (
      !browserFailed &&
      Number.isInteger(expected) &&
      expected >= 3 &&
      unexpected === 0 &&
      flaky === 0 &&
      skipped === 0
    ) {
      if (process.env.JP_E2E_EVIDENCE_PATH) {
        writeFileSync(process.env.JP_E2E_EVIDENCE_PATH, JSON.stringify(stats) + "\n", {
          flag: "wx",
          mode: 0o600,
        });
      }
      return;
    }
  }
  throw new Error("The required browser suite did not complete successfully.");
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof SyntaxError ? "The E2E report could not be parsed." : error.message,
  );
  process.exitCode = 1;
} finally {
  try {
    if (attemptedStart) {
      run("supabase", ["stop", ...supabase, "--no-backup"]);
    }
  } catch {
    console.error("The disposable Supabase stack could not be cleaned up.");
    process.exitCode = 1;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
