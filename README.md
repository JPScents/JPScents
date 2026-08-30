# JPScents

JPScents is a responsive perfume-commerce application with manual payment and fulfilment after a saved order is created. The implemented customer journey covers discovery, curated recommendations, Cart, Checkout, saved Order confirmation, and WhatsApp handoff. The protected Admin covers Perfumes, variants, images, merchandising, Orders, statuses, and the operational Overview.

The application uses Next.js, Tailwind CSS, shadcn/ui foundations, Prisma, and Supabase. Prisma owns the application schema and migrations; Supabase supplies Postgres, passwordless Admin authentication, and product-image storage. Approved product, architecture, and release references live in `documentation`.

## Commands

- `npm run setup:local` — start local Supabase and recreate an empty database
- `npm run setup:local:demo` — recreate locally, then add deliberate demo fixtures
- `npm run admin:provision` — create or promote the configured trusted Admin
- `npm run dev` — start local development
- `npm run db:migrate:deploy` — apply committed Prisma migrations to the selected database
- `npm run db:seed:demo` — opt in to deterministic development fixtures
- `npm run env:check` / `npm run env:check:production` — validate named runtime configuration without printing values
- `npm run release:check` — formatting, lint, types, tests, Prisma validation, and production build

Start with [Prisma setup](prisma/README.md), [Supabase setup](supabase/README.md), and the [deployment runbook](documentation/system/deployment-and-operations.md). No seed command runs during application startup or deployment.

## Project areas

- `src/app` — public and protected route composition
- `src/features` — cohesive Catalogue, Cart, and Orders features
- `src/config` — typed, non-secret application configuration
- `src/lib` — shared foundation utilities
- `prisma` — schema, migrations, and opt-in demo fixtures
- `documentation` — product extraction, durable architecture, implementation rules, and cumulative registries

## Launch readiness and remaining handoffs

- The application deliberately supports an empty catalogue. Public and Admin routes show clear preparation/zero states until confirmed products are added.
- Configure the client-confirmed WhatsApp business number and final delivery-area policy.
- Add confirmed catalogue, photography, logo, FAQ, and policy content; demo fixtures are never loaded by the normal reset.
- Provision the submitted JPScents email in Supabase Auth with trusted `app_metadata.role=admin`, configure the exact `/auth/confirm` redirect, and connect production SMTP. Admin sign-in is passwordless and never creates users.
- Connect the client-owned Supabase and Vercel projects using the deployment runbook; online payment remains intentionally out of scope.

## Project operating system

Repository work is guided by a small operating layer copied from the reusable project operating system:

- `AGENTS.md` routes work to the relevant project rules and skills.
- `.agents/skills` contains focused workflows for feature structure, shared code, database seeding, design translation, delegation, and coherent commits.
- `documentation/system` records durable workflow, architecture, domain/data, and design decisions.

The operating principle is: inspect first, choose the smallest correct boundary, preserve unrelated work, verify the result, and keep durable decisions in the repository instead of relying on chat history. `documentation` is the single source of truth for both product analysis and approved implementation decisions.
