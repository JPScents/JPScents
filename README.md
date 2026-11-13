# JPScents

JPScents is a perfume store. Customers browse variants and order for delivery within Nigeria. When commerce is active, guests review their delivery fee and pay through Paystack. They can follow payment, dispatch and refunds through secure order status. The earlier WhatsApp checkout remains available until commerce is activated. [Live storefront](https://jpscents.shop)

The protected Admin manages the catalogue, customers, delivery fees, order links and fulfilment. Commerce reserves stock when the buyer starts payment. Verified payment consumes the reservation. Admin manages refunds and received returns as separate actions.

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
- `/checkout/quote` — guest checkout from an Admin-issued link
- `/checkout/status` — secure commerce order status

Admin:

- `/admin/login` — trusted-admin Magic Link sign-in
- `/admin` — operational overview
- `/admin/perfumes`, `/admin/perfumes/new`, `/admin/perfumes/[id]`
- `/admin/customers`, `/admin/customers/new`, `/admin/customers/[id]`
- `/admin/orders`, `/admin/orders/[reference]`
- `/admin/delivery`, `/admin/orders/drafts`, `/admin/operations`

The application supports an empty production database. Public and Admin pages show deliberate empty states until real catalogue and order data exists.

## Project structure

- `src/app` owns public and Admin routes, framework entry points, route-local UI and actions. `src/app/(public)/_cart` owns browser cart state and its published-variant resolver.
- `src/modules` owns backend Catalogue, Customers, Orders and Access. Commerce adds Payments, Delivery and Notifications with their first operations.
- `src/infrastructure` owns client lifetime, generated Prisma and concrete provider transport.
- `src/ui` contains cross-group presentation and primitives. `src/shared` contains small runtime-neutral helpers.
- `src/config` contains typed, non-secret application configuration.
- `prisma` contains the schema, forward migrations and optional demo seed.
- `supabase` contains the reproducible local Supabase configuration and Auth template.
- `.agents/skills` contains focused repository workflows and the structural rules.

Orders owns the atomic order operation. The checkout route owns its form, Cart integration, callable input boundary and confirmation cookie. Access evaluates Admin identity supplied by the app request adapter. [Approved structure](docs/architecture/adr/0005-commerce-module-and-route-boundaries.md)

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

Milestone 7 commerce configuration, payment activation and recovery use the [commerce operations guide](docs/engineering/COMMERCE_OPERATIONS.md).

1. Apply production Prisma migrations before deploying code that depends on them.
2. Import the repository into the client-owned Vercel project.
3. Use Vercel's standard Next.js settings and `npm run build`.
4. Add only the variables marked for Vercel above.
5. The human merge to `main` deploys automatically. Verify the public routes, Magic Link callback, Admin image access, and the checkout path enabled on that deployment.

Keep `DIRECT_URL` and `SUPABASE_SECRET_KEY` in the operator environment. Connect Preview to its own Supabase project. The commerce operations guide covers the scheduled recovery configuration.

## Quality commands

```bash
npm run fix
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run typecheck
npm test
npm run check
npm run db:validate
npm run build
npm run release:check
```

`npm run fix` formats first, applies ESLint fixes, then formats the result. `format` writes formatting; `format:check` and `lint` only report problems. `lint:fix` applies lint fixes without formatting. `npm run check` runs architecture, formatting, lint, type, and test checks; `release:check` additionally validates the database schema and builds the application.

Prettier covers supported files across the repository, including source, tests, scripts, configuration, styles, and Markdown guidance. Generated files, dependencies, lockfiles, and secret environment files are excluded. Prisma schema formatting remains `npm run db:format`; SQL migrations and Supabase TOML are not formatted by Prettier. ESLint requires braces around control-flow bodies and spacing after imports. This avoids formatter-induced lint failures and makes branching readable. EditorConfig aligns indentation and line endings in supporting editors; editor formatting should use this repository's Prettier configuration.

Keep tests for business rules, state transitions, integrations, failure recovery, and meaningful accessibility interactions. Avoid static-copy, styling, element-count, and trivial rendering tests. Repository changes should follow `AGENTS.md`: preserve unrelated work, verify the result, and commit completed work locally. Pushing remains an explicit user action.

### Agent verification without secret-file access

`npm run check` is safe under the no-secret-file rule: Vitest explicitly disables Vite environment-file loading with `envDir: false`, and the architecture, formatting, lint and type checks exclude secret files. Tests use explicit fixtures/mocks, never live project credentials. For targeted tests, use `npm test -- <test-path>`.

Prisma configuration still loads an environment file even for validation, formatting, or generation. Next.js builds also load environment files. Do not run those commands in the configured checkout under the no-secret-file rule. Build in an isolated copy containing source, public assets, required configuration, generated client and dependencies, excluding every secret file. Supply only synthetic configuration. Use a newly created disposable database for transaction verification; never reset or reseed the project's configured database.

For documentation-only changes, format/check the changed Markdown and inspect links and stale references. For skill changes, run the available skill validator and review behavior against a realistic request. The Codex skill-creator validator requires Python with PyYAML; use an existing compatible interpreter instead of adding Python dependencies to this Node project. If none is available, report that validator limitation and validate YAML metadata, required fields, references, and scenarios with an existing repository YAML parser; do not claim the Python validator passed.

Build or database verification requires an environment that complies with the task's permissions. Never copy or inspect secret files to set it up. If unavailable, complete independent checks and state exactly what remains unverified; unit tests do not replace a Next.js build or actual database checks.

## Agent standards

[AGENTS.md](AGENTS.md) routes ordinary implementation/refactor requests to two core skills: [feature-structure](.agents/skills/feature-structure/SKILL.md) for architectural decisions and [delivery-workflow](.agents/skills/delivery-workflow/SKILL.md) for inspection, verification, diff review, and local commits. [Design-to-development](.agents/skills/design-to-development/SKILL.md) applies only to visual implementation/design work.

"Refactor the catalog feature" targets the entire existing catalogue domain and its affected consumers. Inspect every module's actual responsibility and necessity, remove or merge unjustified abstractions, correct names and locations, preserve behavior, verify, and commit. A few isolated improvements or file moves do not complete a feature-wide refactor.

The feature skill defines this repository's required folder semantics, filename conventions, and root-file allowlist. All Prisma database operations, including transactions and raw SQL, belong in repositories; services/actions must not import the client, receive transaction clients, or control transactions indirectly. Atomic database checks stay with their writes in meaningful repository operations. Client initialization remains in database infrastructure. Create only the responsibility folders a feature needs; do not preserve a root query/mutation/projection module or introduce pass-through layers for symmetry. Customers is the structural reference, with its existing abstractions still subject to review. These current rules supersede historical structural choices, not established product behavior.

`npm run architecture:check` checks business module structure and imports, browser reachability, Prisma ownership and the scoped image exceptions. It runs first in `npm run check`. For scoped development use `node .agents/skills/feature-structure/scripts/check-structure.mjs src/modules/<domain>`. Run the full check before completion.

These checks cannot establish semantic responsibility or trace arbitrary indirect client access. Review contents, unnecessary abstractions, runtime projections, readability and behavior as well. A file named `*.schema.ts` still needs a real declarative contract; naming alone cannot prove that. Do not add exceptions or change rules to preserve an unjustified abstraction.
