import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrations = fileURLToPath(new URL("../../prisma/migrations/", import.meta.url));
const prerequisites = fileURLToPath(
  new URL("./fixtures/supabase-sql-prerequisites.sql", import.meta.url),
);
const POSTGRES_USER = "jpscents_test";
const POSTGRES_PORT = "5432";
export const APPLICATION_NAME = "jpscents_integration_app";

export function startDisposablePostgres() {
  for (const name of ["DATABASE_URL", "DIRECT_URL", "APP_ENV_FILE"]) {
    if (Object.hasOwn(process.env, name)) {
      throw new Error(`Unset ${name} before running the disposable PostgreSQL suite.`);
    }
  }

  // A short, owner-only directory keeps the socket inside the OS path length limit.
  const directory = mkdtempSync("/tmp/jpit.");
  const data = join(directory, "data");
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      encoding: "utf8",
      env: { PATH: process.env.PATH, LC_ALL: "C", NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  const sql = (args: string[]) =>
    run("psql", [
      "-X",
      "--no-password",
      "-h",
      directory,
      "-p",
      POSTGRES_PORT,
      "-U",
      POSTGRES_USER,
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      ...args,
    ]);

  function stop() {
    if (existsSync(join(data, "postmaster.pid"))) {
      run("pg_ctl", ["-D", data, "-m", "fast", "-w", "-t", "10", "stop"]);
    }
    rmSync(directory, { recursive: true, force: true });
  }

  try {
    try {
      run("initdb", [
        "-D",
        data,
        "--username",
        POSTGRES_USER,
        "--auth=trust",
        "--no-locale",
        "--encoding=UTF8",
      ]);
      run("pg_ctl", [
        "-D",
        data,
        "-l",
        join(directory, "postgres.log"),
        "-o",
        `-c listen_addresses='' -k ${directory} -p ${POSTGRES_PORT}`,
        "-w",
        "-t",
        "10",
        "start",
      ]);
    } catch (error) {
      // Keep startup failures distinct from migration, assertion, and teardown failures.
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Disposable PostgreSQL startup failed: ${detail}`, { cause: error });
    }
    const isolated = sql([
      "-Atc",
      "SELECT inet_server_addr() IS NULL AND current_setting('listen_addresses') = ''",
    ]);
    if (isolated.trim() !== "t") {
      throw new Error("PostgreSQL must be reachable only through the private test socket.");
    }

    sql(["--single-transaction", "--file", prerequisites]);
    const migrationDirectories = readdirSync(migrations, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (migrationDirectories.length === 0) {
      throw new Error("No application migrations found.");
    }
    for (const migration of migrationDirectories) {
      sql(["--single-transaction", "--file", join(migrations, migration, "migration.sql")]);
    }

    const url = new URL(`postgresql://${POSTGRES_USER}@localhost:${POSTGRES_PORT}/postgres`);
    url.searchParams.set("host", directory);
    url.searchParams.set("application_name", APPLICATION_NAME);
    return { connectionString: url.toString(), directory, stop };
  } catch (setupError) {
    try {
      stop();
    } catch (cleanupError) {
      throw new AggregateError(
        [setupError, cleanupError],
        `PostgreSQL cleanup failed in ${directory}.`,
      );
    }
    throw setupError;
  }
}
