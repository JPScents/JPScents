# Prisma and local data

Prisma 7.9.1 owns the JPScents application schema, generated client, migration history, and local PostgreSQL connection. Generated client files in `src/db/generated/` are intentionally ignored.

1. Copy `.env.example` to `.env`; fill the local Supabase publishable key from `npm run supabase:status`. JPScents uses its own localhost `5632x` ports so it can coexist with other local Supabase projects.
2. Start Docker-backed Supabase with `npm run supabase:start`.
3. Run `npm run db:generate` and `npm run supabase:reset`.

The normal reset intentionally leaves the catalogue and Orders empty so local verification matches a launch before client content arrives. `npm run supabase:reset:demo` is an explicit design-review option that adds the deterministic placeholder catalogue after a reset. `npm run db:seed:demo` can add those fixtures without resetting existing data; it upserts only its fixed IDs and never represents client-supplied products.
