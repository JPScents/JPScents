# Supabase

Supabase provides Postgres, passwordless Admin Auth, and catalogue image Storage. Local development uses Docker; production uses a client-owned hosted project. Prisma remains the only application-schema migration authority, so do not introduce a second application migration history under `supabase/migrations`.

## Local setup

- `npm run supabase:start`, `npm run supabase:stop`, and `npm run supabase:status` manage the stack.
- `npm run supabase:reset` recreates an empty local database and applies the Prisma-owned migration history with `prisma migrate deploy`.
- `npm run supabase:reset:demo` additionally loads explicit placeholder products for design review. Never treat those fixtures as client content.
- Local endpoints bind to localhost. Keep `supabase/.temp/` untracked.

Application tables have RLS enabled, forced, and no Data API grants or policies; trusted Next.js server code uses Prisma. The `perfume-images` bucket stays private. Visitors may request short-lived signed reads only for the `perfumes/` catalogue prefix. Upload, replacement, listing, and deletion remain restricted to authenticated users whose trusted JWT `app_metadata.role` is `admin`; JPEG, PNG, and WebP uploads are limited to 5 MiB.

Admin authentication is passwordless. Put the server-only local secret/service-role key in ignored `.env.local`, then run `npm run admin:provision`. The idempotent command creates or promotes `JP_SCENTS_ADMIN_EMAIL`, confirms the email, and sets trusted `app_metadata.role=admin`. The secret key is an operator credential only: it is not used by the Next.js application and must not be configured in Vercel.

The login form calls Supabase only for the exact normalized trusted address, uses `shouldCreateUser: false`, and the callback independently checks both the email and trusted role before entering Admin. Do not use user-editable metadata for authorization.

Local sign-in emails are captured by the local email-testing inbox at `http://127.0.0.1:56324`; they are not delivered externally. Open `/admin/login`, request the link, then follow it from that inbox. Local Auth permits the exact `http://127.0.0.1:3000/auth/confirm` and `http://localhost:3000/auth/confirm` callback URLs, keeps the email provider enabled for the pre-provisioned user, disables public signup, and uses the SSR token-hash template at `supabase/templates/magic_link.html`.

## Hosted project handoff

1. Create the client-owned Supabase project on PostgreSQL 17.
2. Link the trusted operator CLI with `npx supabase login` and `npx supabase link --project-ref <project-ref>`. Linking does not apply the Prisma migrations.
3. Fill an ignored `.env.production.local` from `.env.production.example`.
4. Apply Prisma migrations with the operator-only `DIRECT_URL`.
5. In Auth URL Configuration, set the exact production site URL and exact `https://<domain>/auth/confirm` redirect. Do not use a wildcard for production.
6. Keep public sign-up disabled, email sign-in enabled, OTP expiry at one hour or less, and install the token-hash Magic Link markup from `supabase/templates/magic_link.html`.
7. Configure client-owned production SMTP and disable link tracking. Supabase’s default SMTP is not suitable for production delivery.
8. Run `APP_ENV_FILE=.env.production.local npm run admin:provision` once, then test the complete Magic Link flow on the production domain.
9. Review Security Advisor, keep RLS enabled, enable SSL enforcement, and apply appropriate network restrictions after the Vercel/database connectivity path is confirmed.

The checked-in root `supabase/config.toml` is a reproducible local configuration and contains localhost Auth URLs. Do not push it unchanged to production. Once the client domain and project reference exist, add a production remote configuration or apply the exact Auth values above in the Dashboard before using `supabase config push`.
