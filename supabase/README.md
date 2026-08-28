# Local Supabase

This repository uses only the Docker-backed local Supabase stack. Do not link or provision a remote project for this milestone.

- `npm run supabase:start`, `npm run supabase:stop`, and `npm run supabase:status` manage the stack.
- `npm run supabase:reset` recreates an empty local database and applies the Prisma-owned migration history with `prisma migrate deploy`.
- `npm run supabase:reset:demo` additionally loads explicit placeholder products for design review. Never treat those fixtures as client content.
- Local endpoints bind to localhost. Keep `supabase/.temp/` untracked.

Application tables have RLS enabled and no Data API policies; trusted Next.js server code uses Prisma. The private `perfume-images` bucket allows only authenticated users whose trusted JWT `app_metadata.role` is `admin`; image paths must begin `perfumes/`, and JPEG, PNG, and WebP uploads are limited to 5 MiB.

Admin authentication is passwordless. Provision the submitted JPScents email address through local Auth/Studio, then set that user’s `raw_app_meta_data` role to `admin` in local `auth.users`. The login form calls Supabase only for that exact normalized address, uses `shouldCreateUser: false`, and the callback independently checks both the email and trusted role before entering Admin. Do not use `raw_user_meta_data` for authorization and do not store a service-role credential in application code.

Local sign-in emails are captured by the local email-testing inbox at `http://127.0.0.1:56324`; they are not delivered externally. Open `/admin/login`, request the link, then follow it from that inbox. Local Auth permits the exact `http://127.0.0.1:3000/auth/confirm` and `http://localhost:3000/auth/confirm` callback URLs and disables public signup.

For production, provision the same trusted Auth user, disable signup, set the production Site URL, allow the exact production `/auth/confirm` URL, and configure production SMTP before testing sign-in. Supabase’s default SMTP is not a production delivery service.
