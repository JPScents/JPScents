---
name: database-seeding
description: Create, extend, or reorganise deterministic database seed infrastructure around existing persisted models with optional media support and safe repeatable execution.
---

# Database Seeding

Apply only to requested seed work. Inspect the schema, seed configuration, scripts, migrations, tests, tracked assets, and example environment files first. Existing persisted models are authoritative; seed code does not define duplicate models or change the schema unless explicitly requested.

## Structure

Keep entry points and concise instructions at the seed root:

```text
seed/
  README.md
  index.ts
  reset-local.ts
  core/
  domains/<domain>/
  media/              # only when files/assets are seeded
```

- `core/` owns explicit order, shared transaction orchestration, seed-specific errors, and local safety guards.
- `domains/<domain>/<domain>.seed-data.ts` owns readable deterministic records for an existing model/domain.
- `<domain>.seeder.ts` prepares and persists those records.
- `<domain>-seed.validation.ts` exists only for authored-data mistakes that database constraints do not explain clearly.
- `media/` owns optional asset loading, stable seed-owned paths, storage uploads, and provenance.
- Keep types close to their owner. Do not create registries, plugin systems, generic seeder interfaces, factories, or dependency containers.

## Safety

- Keep execution order explicit and seeds repeatable.
- Prefer stable unique identifiers and deterministic ordering.
- Never delete unrelated user-created records or assets. Cleanup may affect only clearly seed-owned data/paths.
- Never reset or reseed shared/production data without explicit authorization.
- Never inspect secret environment files.

Keep a concise seed README covering responsibilities, order, adding a domain, non-secret configuration, optional media, and safe commands. Verify with non-mutating checks; when explicitly authorized, also verify fresh and repeated execution against a disposable local database.
