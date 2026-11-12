# Verification contract

The approved architecture defines merge and release obligations in VER-01–03 and D5. STD-019–021 and STD-024 govern test and reporting evidence. This command composes the existing local checks and Task 10's migrated PostgreSQL tests. The enforcement matrix, compliance baseline, and exception register remain authoritative for their respective scopes. [Architecture](../architecture/ARCHITECTURE.md#4-verification-and-exceptions) · [ADR-0004](../architecture/adr/0004-merge-and-release-verification.md) · [Coding standards](CODING_STANDARDS.md) · [Enforcement matrix](ENFORCEMENT_MATRIX.md) · [Compliance baseline](COMPLIANCE_BASELINE.md) · [Exceptions](EXCEPTIONS.md)

## Commands

Run from the repository root with Node 24.x, npm, the installed project dependencies, and the generated Prisma client. If the client is absent, generate it in the documented isolated copy. Both verification commands need a non-root Unix environment with working `initdb`, `pg_ctl`, and `psql` on `PATH`, private socket access, and PostgreSQL shared memory. Unset `DATABASE_URL`, `DIRECT_URL`, and `APP_ENV_FILE` for these runs. The runner reports a prohibited setting by name only. [Safe generation](../../README.md#agent-verification-without-secret-file-access) · [Database setup](INTEGRATION_VERIFICATION.md#run-the-suites)

```sh
npm run verify
npm run verify:acceptance
```

`npm run verify` is the canonical quality command. It requires every stage below, including the passing PostgreSQL cases, on every invocation. The previous `npm run check` remains available for the existing static and unit checks. `npm run verify:acceptance` independently runs the approved D2–D4 scenarios and returns the actual acceptance status.

| Stage                 | Underlying command                                                        | Scope and prerequisites                                                                          |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime               | Node version check                                                        | Requires the package's Node 24.x runtime. An incompatible runtime blocks all dependent stages.   |
| Architecture          | `npm run architecture:check`                                              | Existing feature, import, persistence, and suppression checks. Semantic review remains required. |
| Formatting            | `npm run format:check`                                                    | Existing Prettier scope.                                                                         |
| Lint                  | `npm run lint`                                                            | Existing ESLint scope and warning policy.                                                        |
| Type checking         | `npm run typecheck -- --incremental false`                                | Existing TypeScript settings, with incremental output disabled. Requires generated Prisma files. |
| Unit and architecture | `npm run test -- --no-cache --configLoader runner`                        | Existing Vitest suite, including verification harness and checker fixtures. Requires the client. |
| PostgreSQL current    | `npm run test:integration -- --no-cache --configLoader runner`            | Task 10's migrated database suite. All selected cases must execute, with at least five passes.   |
| PostgreSQL acceptance | `npm run test:integration:acceptance -- --no-cache --configLoader runner` | Acceptance command only. All selected cases must execute, with at least three passes.            |

For each database stage the runner adds the Vitest JSON reporter and a private temporary report file, then removes that file. It records counts and failing case names. The underlying commands remain available for case-level and migration diagnostics. Child commands receive a small environment containing `PATH` and fixed CI and colour settings. The integration harness supplies only its synthetic private-socket connection URL. It creates a fresh database, checks socket isolation, replays committed migrations, and stops and removes its own cluster. Vite env-file loading is disabled. The commands never load a configured Prisma environment, run a production build, or accept an external database target. [Package scripts](../../package.json) · [Runner](../../scripts/verify.mjs) · [Integration isolation](INTEGRATION_VERIFICATION.md#isolation-and-realism)

## Status and evidence

Each stage reports its command, status, subprocess exit code where available, and any missing prerequisite. The runner continues through independent stages after a failure. The final line begins with `VERIFY_EVIDENCE ` and contains JSON with the mode, overall status and exit code, Node version, Git HEAD, dirty flag, and stage results. Git context may be unknown outside a Git checkout. A dirty run describes the inspected working tree and requires a fresh run for the exact merge or release candidate.

| Status  | Meaning                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| PASS    | The stage completed successfully and the required database cases executed when applicable. Overall exit is 0 only on PASS. |
| FAIL    | A command, migration, assertion, report, or other stage operation failed, or a required suite ran incompletely. Exit 1.    |
| BLOCKED | A required runtime, tool, client, or database prerequisite was unavailable or unsafe. Overall exit is 1.                   |
| NOT RUN | An upstream prerequisite prevented this stage from starting. The overall result is non-zero.                               |

The summary retains the actual subprocess code even when a report shows that a zero exit did not complete the stage. `n/a` means no subprocess code was available. FAIL takes precedence over BLOCKED when both occur. A PostgreSQL startup failure before any cases execute is BLOCKED. Failed migrations, missing case evidence, or assertions are FAIL. A sandbox that denies shared memory needs a PostgreSQL-capable execution environment.

## Release decision

Release readiness is a reviewer decision recorded against the exact candidate revision. Use **FAIL** when a required quality, acceptance, build, or other release check actually fails. Use **BLOCKED** when required evidence is missing, unavailable, or unverified. A release can be **PASS** only when the reviewer has all applicable evidence:

1. Canonical quality and standalone acceptance both pass on the candidate. Approved exceptions affecting required evidence must be explicit and scoped under GOV-01.
2. Verify schema and build obligations with the existing release checks in an isolated copy that excludes configured secret files. For client/server entry changes, exercise the affected routes after the isolated production build. The existing `release:check` script is one input to this decision.
3. For transaction, schema, constraint, or policy changes, include the applicable migrated-database evidence. The canonical suite covers a specific set of transaction and SQL policy invariants. Changes outside that scope require their own real-boundary cases.
4. For affected Auth, Storage, or browser workflows, exercise the actual boundary with synthetic fixtures. Record applicable independent semantic architecture review and retain limitations in the release decision. [Architecture](../architecture/ARCHITECTURE.md#4-verification-and-exceptions) · [Integration gaps](INTEGRATION_VERIFICATION.md#evidence-still-needed)

**Current release readiness is FAIL.** Acceptance still reproduces three defects. The bestseller trigger blocks the valid final-unit purchase (D2), order views show edited fulfilment and product facts (D3), and a stale Admin price edit overwrites a checkout deduction (D4). Real browser and Supabase HTTP evidence remains unverified. The prior isolated build stopped at Google Fonts DNS resolution. This task records no new build result. [Executed acceptance and gaps](INTEGRATION_VERIFICATION.md#risk-and-evidence-matrix) · [Build audit](CONTROLS_AUDIT.md#executed-verification)

Task 12 should invoke `npm run verify` for the full required quality gate on the candidate revision and provision Node, generated Prisma files, and a disposable PostgreSQL-capable runner. It must verify hosted enforcement. Keep acceptance visible as separate release evidence and preserve its failing exit until the production fixes land.

## Executed verification

Assessment date 12 November 2026. The runs used HEAD `cda1783b792fa392ff0f0563d948d9eaa6e07837` with a dirty worktree containing the earlier engineering tasks and this task. Node 24.14.1 and PostgreSQL 14.17 were available.

| Stage                 | `npm run verify` with PostgreSQL access | `npm run verify` in the default sandbox |
| --------------------- | --------------------------------------- | --------------------------------------- |
| Runtime               | PASS (0)                                | PASS (0)                                |
| Architecture          | PASS (0)                                | PASS (0)                                |
| Formatting            | PASS (0)                                | PASS (0)                                |
| Lint                  | PASS (0)                                | PASS (0)                                |
| Type checking         | PASS (0)                                | PASS (0)                                |
| Unit and architecture | PASS (0), 148 tests in 27 files         | PASS (0)                                |
| PostgreSQL current    | PASS (0), 5 of 5 cases                  | BLOCKED (1), zero cases executed        |
| Overall quality       | PASS (0)                                | BLOCKED (1)                             |

- `npm run verify:acceptance` with PostgreSQL access exited 1 and reported FAIL. Runtime passed with exit 0. The database stage reported all three D2–D4 cases failed with exit 1.
- `npm run verify` with Node 22.17.0 exited 1 and reported the runtime prerequisite as BLOCKED and each dependent stage as NOT RUN.
- `npm test -- --no-cache --configLoader runner tests/scripts/verify.test.ts` exercised the runner through controlled package fixtures. A lint stage exiting 7 produced overall FAIL and exit 1 while independent stages still ran. Unavailable PostgreSQL produced overall BLOCKED and exit 1 before the integration script ran. The fixtures also verified that an inherited synthetic database setting was rejected without printing its value and that extra arguments cannot substitute acceptance for quality. [Harness tests](../../tests/scripts/verify.test.ts)
- The sandbox's real database attempt failed during shared-memory allocation, before the tests ran. The PostgreSQL-capable runs used a cleared shell environment and private sockets. Both finished with no leftover test cluster or reporter directory. No hosted controls or release deployment were exercised.
