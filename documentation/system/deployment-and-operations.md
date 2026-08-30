# Deployment and operations

This is the production handover runbook. It deliberately uses the existing Next.js, Prisma, Supabase, and Vercel tooling rather than a custom deployment system.

## Release boundary

- Application startup never seeds data.
- `npm run supabase:reset` produces a valid empty database.
- `npm run db:seed:demo` is an explicit, local-only fixture operation.
- The public site and Admin must remain usable with zero Perfumes and zero Orders.
- Prisma migrations are applied deliberately before the matching application release.
- Only runtime variables go to Vercel. Migration and Admin-provisioning credentials stay operator-only.

## Clean local reproduction

1. Install Docker and Node.js 24 LTS (`.nvmrc` is checked in and Vercel reads the matching `engines` entry).
2. From the repository root, run `npm ci`.
3. Run `npm run setup:local` to start Supabase and create an empty migrated database.
4. Copy `.env.example` to ignored `.env.local`. Fill the local publishable and secret/service-role keys from the trusted local CLI/Studio; do not paste them into logs or commits.
5. Run `npm run env:check`.
6. Run `npm run admin:provision`.
7. Run `npm run dev`. Local Magic Links appear in Mailpit at `http://127.0.0.1:56324`.
8. Only when test content is useful, run `npm run db:seed:demo`.

A clean empty reset is `npm run supabase:reset`. A deliberate fixture reset is `npm run supabase:reset:demo`.

## Production Supabase

Prepare ignored `.env.production.local` from `.env.production.example`:

| Variable                               | Purpose                                         | Vercel          |
| -------------------------------------- | ----------------------------------------------- | --------------- |
| `DATABASE_URL`                         | Supavisor transaction-pooler runtime connection | Production only |
| `DIRECT_URL`                           | Direct or session-pooler migration connection   | Never           |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical HTTPS application origin              | Production only |
| `NEXT_PUBLIC_SUPABASE_URL`             | Hosted Supabase project URL                     | Production only |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe project key                        | Production only |
| `SUPABASE_SECRET_KEY`                  | Admin provisioning via Auth Admin API           | Never           |
| `JP_SCENTS_ADMIN_EMAIL`                | Exact trusted Magic Link identity               | Production only |
| `JP_SCENTS_WHATSAPP_NUMBER`            | International digits-only business number       | Production only |

Then:

1. Run `APP_ENV_FILE=.env.production.local npm run env:check:production`.
2. Run `npx supabase link --project-ref <project-ref>` from the trusted operator machine.
3. Run `APP_ENV_FILE=.env.production.local npm run db:migrate:status` and review the target.
4. Run `APP_ENV_FILE=.env.production.local npm run db:migrate:deploy`.
5. Configure Auth Site URL, the exact `/auth/confirm` redirect, disabled public signup, the checked-in Magic Link template, and production SMTP.
6. Run `APP_ENV_FILE=.env.production.local npm run admin:provision`.
7. Test Admin Magic Link sign-in and a real image upload before launch.

Do not run reset or demo-seed commands with the production environment selected.

## Vercel

1. Import the client-owned GitHub repository into the client-owned Vercel account.
2. Keep the detected Next.js defaults: install `npm install`/`npm ci`, build `npm run build`, and no custom output directory.
3. Add only the variables marked “Production only” above to Vercel Production.
4. Do not point Preview deployments at the production Supabase project. Use a separate staging project or leave data-backed previews unavailable.
5. Run `npm run release:check` locally, then deploy from `main`.
6. After any environment-variable change, redeploy; existing deployments retain their old values.
7. Smoke-test `/`, `/perfumes`, `/help-me-choose`, `/cart`, `/checkout`, `/admin/login`, a Magic Link callback, an Admin image, and an order through `/checkout/confirm`.

## Search and sharing launch checks

1. Set `NEXT_PUBLIC_SITE_URL` in Vercel Production to the final canonical HTTPS origin, including the chosen `www` or non-`www` host. Do not add it to Preview environments; previews are deliberately marked non-indexable.
2. Submit `https://<final-domain>/sitemap.xml` in Google Search Console after the production deployment is live.
3. Validate one published perfume URL with [Google Rich Results Test](https://search.google.com/test/rich-results) or the [Schema Markup Validator](https://validator.schema.org/). Confirm its Product and breadcrumb data match the published product and current variant availability.
4. Check the homepage and one published perfume in the intended social-share debuggers. The share image URLs are stable application routes; private product-storage URLs must never appear in page metadata.

Search Console site verification, business contact details, social profiles, delivery/returns policies, and product manufacturer or identifier data remain client-owned and are intentionally not published until confirmed.

No `vercel.json` is required. Next.js is deployed with Vercel’s standard framework integration.

## Release checklist

- `npm ci` succeeds from the lockfile.
- Empty local reset and optional demo seed both succeed.
- `npm run release:check` passes.
- `npm audit --omit=dev` is reviewed; advisories are either fixed or explicitly accepted with rationale.
- All Prisma migrations are applied to the intended target.
- Private catalogue images resolve through short-lived links for signed-out visitors; only the trusted Admin can mutate them.
- Production Auth uses the canonical HTTPS callback and client-owned SMTP.
- The trusted Admin is provisioned through the command, not manual database edits.
- Vercel contains no `DIRECT_URL` or `SUPABASE_SECRET_KEY`.
- Empty, catalogue, Cart, Checkout, confirmation, Auth, and Admin journeys pass desktop/mobile E2E verification.

## Current dependency-advisory note

Vitest was updated to remove its critical UI-server advisory. npm currently reports a high-severity recursive-object advisory through Prisma’s build-time configuration dependency and a low-severity Windows-only development-server advisory through esbuild. Neither path processes untrusted application input or runs in the deployed customer request path. Do not force-downgrade Prisma to satisfy npm’s suggested fix; reassess when compatible upstream releases are available.

## External controls before launch

- Protect Supabase, Vercel, and GitHub owner accounts with MFA.
- Review Supabase Security and Performance Advisors.
- Enable SSL enforcement and choose network restrictions that still permit the selected Vercel/database connection.
- Confirm backup/restore expectations and plan tier with the client.
- Keep production SMTP link tracking disabled so one-time Magic Links are not rewritten.

## Local release verification — 29 August 2026

- A lockfile-only `npm ci` completed successfully; the repository pins Node.js 24 for local and Vercel parity.
- Empty reset, all three Prisma migrations, deliberate demo seed, and return to the empty migrated state completed successfully.
- Formatting, ESLint, TypeScript, Prisma validation, 70 automated tests, and the optimized Next.js production build passed.
- Browser E2E covered seeded and zero-data public routes, responsive navigation, product selection, Cart, Checkout/confirmation, passwordless Admin sign-in, Admin catalogue creation/publishing, Orders, and status changes.
- Follow-up fixes close the E2E findings for Cart-to-Checkout dismissal, blank recommendation submission, and Prisma Decimal values crossing into the Admin client boundary. Multi-size selection was independently reproduced as working.
- Hosted Magic Link delivery, first-Admin provisioning, private Storage reads, and the public WhatsApp handoff must be smoke-tested again after the client supplies the production Supabase project, SMTP, site domain, secret operator key, and confirmed business number.
