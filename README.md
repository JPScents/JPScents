# JPScents

JPScents is a responsive perfume-ordering application for [jpscents.shop](https://jpscents.shop). Customers can discover perfumes, choose a size, manage a cart, place a saved order, receive a human-readable reference, and continue on WhatsApp for manual payment and fulfilment. No online payment is taken in the current release.

The protected Admin manages customers, perfumes, variants, images, merchandising and orders. New orders begin as **Awaiting Payment** and may progress to **Paid**, **Delivered**, or **Cancelled**. Cancelling an order restores its deducted variant quantities exactly once.

## Technology

- Next.js App Router, React and TypeScript
- Tailwind CSS and shadcn/ui foundations
- Motion for interface transitions
- Prisma for schema declarations, migrations and database access
- Supabase for PostgreSQL, passwordless Admin authentication and private product-image storage
- Vercel for production hosting

## Application routes

Public:

- `/` — homepage
- `/perfumes` — perfume catalogue
- `/perfumes/[slug]` — perfume detail
- `/help-me-choose` — deterministic scent recommendations
- `/cart` — full cart
- `/checkout` — customer and delivery details
- `/checkout/confirm` — saved-order confirmation and WhatsApp handoff

Admin:

- `/admin/login` — trusted-admin Magic Link sign-in
- `/admin` — operational overview
- `/admin/perfumes`, `/admin/perfumes/new`, `/admin/perfumes/[id]`
- `/admin/customers`, `/admin/customers/new`, `/admin/customers/[id]`
- `/admin/orders`, `/admin/orders/[reference]`

The application supports an empty production database. Public and Admin pages show deliberate empty states until real catalogue and order data exists.

## Project structure

- `src/app` — public and protected route composition
- `src/components` — shared UI, public and Admin components
- `src/features/catalogue` — perfumes, variants, merchandising and recommendations
- `src/features/cart` — client-side cart state and persistence
- `src/features/customers` — customer persistence and Admin operations
- `src/features/orders` — checkout, order creation, status history and cancellation
- `src/config` — typed, non-secret application configuration
- `src/lib` — shared infrastructure utilities
- `prisma` — schema, forward-only migrations and optional demo seed
- `supabase` — reproducible local Supabase configuration and Auth template
- `.agents/skills` — focused repository workflows and structural rules

## Local setup

Requirements: Node.js 24, npm, Docker and the Supabase CLI.

```bash
npm ci
cp .env.example .env.local
npm run setup:local
npm run env:check
npm run admin:provision
npm run dev
```

Fill `.env.local` with the local keys reported by Supabase before provisioning the Admin. Local sign-in emails are captured at `http://127.0.0.1:56324` rather than delivered externally.

The normal setup creates a migrated but empty database. Demo products are always explicit:

```bash
npm run setup:local:demo
# or, without resetting existing local data
npm run db:seed:demo
```

Application startup and deployment never seed data automatically.

## Environment variables

Use `.env.example` for local development and `.env.production.example` for a private operator production file. Never commit real credentials.

| Variable                               | Purpose                                                                    | Configure in Vercel |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------- |
| `DATABASE_URL`                         | Application connection; use the Supavisor transaction pooler in production | Yes                 |
| `DIRECT_URL`                           | Direct or session-pooler connection used only for migrations               | No                  |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical origin; production is `https://jpscents.shop`                    | Yes                 |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                                       | Yes                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key                                                  | Yes                 |
| `SUPABASE_SECRET_KEY`                  | Operator-only Admin provisioning credential                                | No                  |
| `JP_SCENTS_ADMIN_EMAIL`                | Primary trusted Admin email                                                | Yes                 |
| `JP_SCENTS_SECONDARY_ADMIN_EMAIL`      | Optional temporary trusted Admin email                                     | When used           |
| `JP_SCENTS_WHATSAPP_NUMBER`            | International digits-only business number                                  | Yes                 |

## Database and Supabase

Prisma is the only application-schema migration authority. Existing migrations are immutable; schema changes require a new forward migration.

Common local commands:

```bash
npm run supabase:start
npm run supabase:status
npm run supabase:reset
npm run supabase:reset:demo
npm run db:migrate:status
npm run db:migrate:deploy
```

For production, create an ignored `.env.production.local`, verify the selected database, and apply committed migrations deliberately:

```bash
APP_ENV_FILE=.env.production.local npm run env:check:production
APP_ENV_FILE=.env.production.local npm run db:migrate:status
APP_ENV_FILE=.env.production.local npm run db:migrate:deploy
APP_ENV_FILE=.env.production.local npm run admin:provision
```

Never run database reset, `prisma migrate dev`, or the demo seed against production.

Production Supabase must have:

- Public signup disabled and email sign-in enabled
- Exact Site URL `https://jpscents.shop`
- Exact redirect `https://jpscents.shop/auth/confirm`
- The checked-in `supabase/templates/magic_link.html` template
- Client-owned production SMTP with link tracking disabled
- The private `perfume-images` Storage bucket and policies installed by the Prisma migration history
- Trusted Admin users provisioned with server-controlled `app_metadata.role=admin`

## Vercel deployment

1. Apply production Prisma migrations before deploying code that depends on them.
2. Import the repository into the client-owned Vercel project.
3. Use Vercel's standard Next.js settings and `npm run build`.
4. Add only the variables marked for Vercel above.
5. Deploy from `main`, then verify the public routes, Magic Link callback, Admin image access and a complete order through `/checkout/confirm`.

Do not configure `DIRECT_URL` or `SUPABASE_SECRET_KEY` in Vercel. Preview deployments should not point at the production Supabase project. No `vercel.json` is required.

## Quality commands

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
npm run release:check
```

`npm run release:check` is the complete local release gate. Repository changes should follow `AGENTS.md`: inspect existing patterns, keep feature ownership explicit, avoid premature abstractions, preserve unrelated work and verify before committing.
