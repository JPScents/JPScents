# JPScents

JPScents is a perfume-commerce experience with manual payment and fulfilment after a saved order is created.

This repository is currently in the foundation and product-extraction phase. Theme and application configuration live in `src`; approved planning artifacts live in `documentation`. Product routes and features have not been implemented.

## Commands

- `npm run dev` — start local development
- `npm run lint` — run ESLint
- `npm run typecheck` — run TypeScript checks
- `npm run build` — create a production build
- `npm run test` — run focused foundation tests
- `npm run supabase:start` / `npm run supabase:reset` — start and recreate the local Docker-backed platform

See [Prisma setup](prisma/README.md) and [local Supabase setup](supabase/README.md) for the non-secret local configuration and Admin provisioning handoff.

## Project areas

- `src/app` — application shell and global theme
- `src/config` — typed, non-secret application configuration
- `src/lib` — shared foundation utilities
- `documentation` — product extraction, durable architecture, implementation rules, and cumulative registries

## Project operating system

Repository work is guided by a small operating layer copied from the reusable project operating system:

- `AGENTS.md` routes work to the relevant project rules and skills.
- `.agents/skills` contains focused workflows for feature structure, shared code, database seeding, design translation, delegation, and coherent commits.
- `documentation/system` records durable workflow, architecture, domain/data, and design decisions.

The operating principle is: inspect first, choose the smallest correct boundary, preserve unrelated work, verify the result, and keep durable decisions in the repository instead of relying on chat history. `documentation` is the single source of truth for both product analysis and approved implementation decisions.
