# JPScents

JPScents is a responsive perfume-commerce application with manual payment and fulfilment after a saved order is created. The implemented customer journey covers discovery, curated recommendations, Cart, Checkout, saved Order confirmation, and WhatsApp handoff. The protected Admin covers Perfumes, variants, images, merchandising, Orders, statuses, and the operational Overview.

The application uses Next.js, Tailwind CSS, shadcn/ui foundations, Prisma, and a local Docker-backed Supabase stack. Prisma owns the application schema and migrations; Supabase supplies Postgres, Admin authentication, and private product-image storage. Approved product and architecture references live in `documentation`.

## Commands

- `npm run dev` — start local development
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript checks
- `npm run build` — create a production build
- `npm run test` — run the application test suite
- `npm run supabase:start` / `npm run supabase:reset` — start and recreate the local Docker-backed platform

See [Prisma setup](prisma/README.md) and [local Supabase setup](supabase/README.md) for the non-secret local configuration and Admin provisioning handoff.

## Project areas

- `src/app` — public and protected route composition
- `src/features` — cohesive Catalogue, Cart, and Orders features
- `src/config` — typed, non-secret application configuration
- `src/lib` — shared foundation utilities
- `prisma` — schema, migrations, and deterministic development seed
- `documentation` — product extraction, durable architecture, implementation rules, and cumulative registries

## Remaining launch handoffs

- Configure the client-confirmed WhatsApp business number and final delivery-area policy.
- Replace controlled catalogue, photography, logo, FAQ, and policy placeholders with confirmed client content.
- Provision the first production Admin through the trusted Supabase Auth Admin workflow.
- Connect production Supabase and deployment environment variables; online payment remains intentionally out of scope.

## Project operating system

Repository work is guided by a small operating layer copied from the reusable project operating system:

- `AGENTS.md` routes work to the relevant project rules and skills.
- `.agents/skills` contains focused workflows for feature structure, shared code, database seeding, design translation, delegation, and coherent commits.
- `documentation/system` records durable workflow, architecture, domain/data, and design decisions.

The operating principle is: inspect first, choose the smallest correct boundary, preserve unrelated work, verify the result, and keep durable decisions in the repository instead of relying on chat history. `documentation` is the single source of truth for both product analysis and approved implementation decisions.
