# Prisma, migrations, and data

Prisma owns the JPScents application schema, generated client, and complete migration history. The SQL migrations also contain the Postgres constraints, RLS boundaries, trigger, Storage bucket, and Storage policies that Prisma Schema cannot express. Generated client files in `src/db/generated/` are intentionally ignored.

## Local

1. Run `npm ci`.
2. Run `npm run setup:local`.
3. Copy `.env.example` to ignored `.env.local` and fill the local keys shown by the trusted local Supabase CLI/Studio.
4. Run `npm run admin:provision`, then `npm run dev`.

The normal reset intentionally leaves the catalogue and Orders empty so local verification matches a launch before client content arrives. `npm run supabase:reset:demo` is an explicit design-review option that adds the deterministic placeholder catalogue after a reset. `npm run db:seed:demo` can add those fixtures without resetting existing data; it upserts only its fixed IDs and never represents client-supplied products.

## Hosted Supabase

- `DATABASE_URL` is the application runtime connection. For Vercel, use the Supavisor transaction pooler connection (port `6543`).
- `DIRECT_URL` is the operator-only migration connection. Use the direct connection when IPv6 is available, or the Supavisor session pooler (port `5432`) otherwise.
- Select the target deliberately with `APP_ENV_FILE=.env.production.local npm run db:migrate:status` and then `APP_ENV_FILE=.env.production.local npm run db:migrate:deploy`.
- Never run `prisma migrate dev`, reset, or the demo seed against production.
- Apply migrations before deploying application code that depends on them. Review and back up an established production database before any later destructive migration.

The deployed application does not need `DIRECT_URL`. Keep it only in an ignored operator environment file or a tightly controlled migration runner.
