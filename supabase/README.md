# Local Supabase

This repository uses only the Docker-backed local Supabase stack. Do not link or provision a remote project for this milestone.

- `npm run supabase:start`, `npm run supabase:stop`, and `npm run supabase:status` manage the stack.
- `npm run supabase:reset` recreates the local database, applies the Prisma-owned migration history with `prisma migrate deploy`, then runs the repeatable Prisma seed.
- Local endpoints bind to localhost. Keep `supabase/.temp/` untracked.

Application tables have RLS enabled and no Data API policies; trusted Next.js server code uses Prisma. The private `perfume-images` bucket allows only authenticated users whose trusted JWT `app_metadata.role` is `admin`; image paths must begin `perfumes/`, and JPEG, PNG, and WebP uploads are limited to 5 MiB.

To provision a local development Admin, create a user through local Auth/Studio, then set that user’s `raw_app_meta_data` role to `admin` in local `auth.users`. Do not use `raw_user_meta_data` for authorization and do not store a service-role credential in application code.
