# Prisma, migrations, and data

Prisma owns the JPScents application schema and complete migration history. Generation writes the client to `src/infrastructure/database/generated`. The SQL migrations also contain the Postgres constraints, RLS boundaries, trigger, Storage bucket, and Storage policies that Prisma Schema cannot express. Generated client files are Git-ignored. When updating a checkout that generated Prisma before Stage A, move its obsolete `src/db/generated` directory out of the source tree and regenerate using the current schema.

## Application client and transactions

Only application repositories import `@/infrastructure/database/prisma`. Prisma model calls, SQL and transactions live in repositories. Services and actions consume typed repository inputs and completed results. The database infrastructure module lazily creates and reuses one client and adapter per runtime instance, so evaluating routes at build time does not require runtime database configuration. The current `PrismaPg` pool uses `max: 1`, a 15-second connection timeout and a 10-second idle timeout.

Never create clients/pools in features or requests or disconnect the shared client after a request. The repository owning an atomic operation opens/completes its transaction and passes that client only to participating repository operations. Cross-feature participants are exposed through intentional server-only public APIs, not internal imports or service-controlled callbacks. A global-client query inside a transaction can wait for the only connection, already held by that transaction. Keep Storage/network calls outside database transactions.

Order creation currently keeps customer resolution, stock deduction, order items, and initial status history in one transaction. Cancellation conditionally claims the order and restores its stock once in the same transaction. Preserve these behaviors when moving code. Mocks alone cannot verify rollback, concurrent updates, or SQL triggers.

## Local

1. Run `npm ci`.
2. Run `npm run setup:local`.
3. Copy `.env.example` to ignored `.env.local` and fill the local keys shown by the trusted local Supabase CLI/Studio.
4. Run `npm run admin:provision`, then `npm run dev`.

The normal reset intentionally leaves the catalogue and Orders empty so local verification matches a launch before client content arrives. `npm run supabase:reset:demo` is an explicit design-review option that adds the deterministic placeholder catalogue after a reset. `npm run db:seed:demo` can add those fixtures without resetting existing data; it upserts only its fixed IDs and never represents client-supplied products.

The seed entry point is `prisma/seed.ts`. It owns process setup/cleanup and calls repository operations for database work; strictly seed-only queries belong in `prisma/repositories/<purpose>.repository.ts`, without a generic seed framework. Seed changes use existing model types, stable identifiers, deterministic order, and repeatable writes. Cleanup must affect only seed-owned records/assets. Its standalone process owns its client lifecycle and disconnects on completion; this does not permit queries or transactions outside repositories. Do not change schema as a side effect of adding fixtures.

## Hosted Supabase

- `DATABASE_URL` is the application runtime connection. For Vercel, use the Supavisor transaction pooler connection (port `6543`).
- `DIRECT_URL` is the operator-only migration connection. Use the direct connection when IPv6 is available, or the Supavisor session pooler (port `5432`) otherwise.
- Select the target deliberately with `APP_ENV_FILE=.env.production.local npm run db:migrate:status` and then `APP_ENV_FILE=.env.production.local npm run db:migrate:deploy`.
- Never run `prisma migrate dev`, reset, or the demo seed against production.
- Apply migrations before deploying application code that depends on them. Review and back up an established production database before any later destructive migration.

The deployed application does not need `DIRECT_URL`. Keep it only in an ignored operator environment file or a tightly controlled migration runner.
