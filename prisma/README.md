# Prisma and local data

Prisma 7.9.1 owns the JPScents application schema, generated client, migration history, and local PostgreSQL connection. Generated client files in `src/db/generated/` are intentionally ignored.

1. Copy `.env.example` to `.env`; fill the local Supabase publishable key from `npm run supabase:status`. JPScents uses its own localhost `5632x` ports so it can coexist with other local Supabase projects.
2. Start Docker-backed Supabase with `npm run supabase:start`.
3. Run `npm run db:generate` and `npm run supabase:reset`.

`npm run db:seed` upserts only the fixed IDs owned by the deterministic placeholder catalogue. It neither deletes records nor changes unrelated data. Add another seed domain beside the existing direct seed only once it has real data to own; keep execution order explicit.
