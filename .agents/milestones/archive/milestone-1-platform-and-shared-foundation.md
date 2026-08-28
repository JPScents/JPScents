# Milestone 1: Platform and Shared Foundation

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2026-08-28
**Depends On:** None; starts from approved foundation commit `604bead`
**Target Pull Request:** —
**Target Branch:** `main`
**Merge Mode:** Manual
**Merge Method:** squash
**Superseded By:** —

## Goal

Establish the smallest production-shaped local platform that every JPScents feature can build on: the Docker-backed Supabase stack connected through pinned Prisma ORM 7, the approved persisted domain and migration history, protected Admin authentication, product-image storage foundations, deterministic development data, shared application shells, and a consistent modal primitive—without implementing Catalogue, Cart, or Order pages.

## Required behaviour

- Pin Prisma ORM 7 and its PostgreSQL driver adapter. Prisma owns application schema declarations, generated client, migration history, and database connections.
- Initialize the local Supabase project and scripts for start, stop, status, and database reset. Bind development services to localhost and commit only safe local configuration.
- Configure local Prisma runtime and migration access through `DATABASE_URL`; document variable names and safe local defaults in `.env.example` without reading or committing secret environment files.
- Declare the approved enums and persisted models: Perfume, ordered PerfumeImage children, PerfumeVariant, Order, OrderItem, and OrderStatusEvent. Preserve all documented relationships, uniqueness, non-negative/positive constraints, multiple enum selections, and immutable placed unit price.
- Add one reviewed initial Prisma migration. Include database constraints or indexes that Prisma Schema cannot express directly, including the single-Bestseller rule and non-negative quantity/price safeguards.
- Prevent direct browser access to application tables: enable RLS as defense in depth with no public Data API policies; trusted Next.js server code uses Prisma. Do not model or migrate Supabase-managed `auth` or `storage` schemas through Prisma Schema.
- Add one server-only Prisma client for local Postgres, avoiding per-request client creation in development.
- Configure Supabase Auth for Admin sign-in/session refresh and server-side authorization using trusted `app_metadata`; user-editable metadata must never authorize Admin access.
- Configure an Admin-only Supabase Storage contract for product images with explicit type/size/path rules. Feature-specific image editing remains Milestone 2.
- Add deterministic, repeatable development seed data for the approved placeholder catalogue without deleting unrelated records.
- Implement only the shared Public shell, Admin shell, and shadcn-based ModalShell required by later milestones, including responsive navigation/menu foundations and accessible dialog behaviour. No product page sections or business workflows.
- Establish focused test tooling and scripts plus concise setup instructions. Verify schema generation, static checks, production build, seed repeatability where a disposable database is available, and a live read when Supabase credentials are available.

## Constraints

- Follow `AGENTS.md`, the approved documentation, and the project skills for feature/shared structure, seeding, design translation, orchestration, and coherent commits.
- Read the installed Next.js 16 documentation and current official Prisma/Supabase guidance before implementing framework, Auth, migration, or Storage code.
- Use Prisma 7.9.1 rather than Prisma 8 for its stable Prisma Schema/Migrate workflow; pin database, local Supabase CLI, and Supabase client packages in the lockfile.
- Keep generated Prisma code out of source control and generate it during install/build as required.
- Keep schema/client, Auth, Storage, shells, and ModalShell direct and cohesive; do not add repositories, services, factories, generic providers, or utilities without current use.
- Use one GPT-5.6 Terra Medium implementation agent on shared local `main`. Preserve unrelated work, stage only milestone files, and finish its commit before another agent starts.
- Follow the user's explicit local-direct workflow: independent review is recorded in the contract rather than a pull request, and milestone commits are pushed to `main` only after review.
- Do not inspect secret environment files or print credentials.

## Explicitly out of scope

- Homepage, Perfumes, Perfume Detail, Help Me Choose, Cart, Checkout, Confirmation, or Admin business pages.
- Catalogue CRUD, Cart behaviour, Order creation/status operations, WhatsApp handoff, analytics, or online payment.
- Remote Supabase provisioning, deployment, CI/CD, Supabase branches, background jobs, queues, caching systems, or a generic data-access framework.
- Direct browser access to application tables through Supabase Data API.
- Unrelated refactoring or future work.

## Required tests

1. Prisma schema formatting/validation and client generation succeed.
2. `supabase db reset` recreates the local database from migrations and a Prisma read succeeds against it.
3. Seed execution is repeatable and does not duplicate or remove unrelated data.
4. Admin authorization rejects absent, invalid, and non-Admin sessions; authorized Admin identity reaches the protected shell.
5. Public/Admin navigation and ModalShell pass focused interaction/accessibility checks, including keyboard close and focus restoration.
6. `npm run lint`, `npm run typecheck`, focused tests, and a production build pass.
7. Local database grants/RLS and Storage policies are inspected after migrations apply.

## Acceptance criteria

- [x] The approved Prisma models, enums, relationships, constraints, and initial migration are present and generated successfully.
- [x] Runtime and migration database connections use the documented local connection and remain server-only.
- [x] Application tables deny direct public Data API access and no secret/service credential is exposed to browser code or source control.
- [x] Admin authentication and authorization are server-enforced using trusted identity data.
- [x] Product-image Storage foundations are Admin-only and documented without implementing the editor workflow.
- [x] Deterministic placeholder seed data can be run repeatedly without duplication or broad deletion.
- [x] Public shell, Admin shell, and ModalShell implement the approved responsive/component foundations without adding business features.
- [x] Required focused and project-wide verification passes against the local stack.
- [x] Explicitly excluded work was not introduced.
- [x] The orchestrator records an independent review of the exact milestone commit before it is pushed.

## Manual tasks

Local Supabase, GitHub authentication, and repository creation are configured. A named local Admin user remains an operator setup step because credentials are intentionally not committed.

## Manual acceptance criteria

- [ ] Freeman can sign in as the provisioned Admin and reach the protected empty Admin shell.
- [ ] Freeman confirms the Public/Admin shell and modal foundations visually match Paper before feature implementation continues.

## Completion Record

**Implementation Outcome:** Complete locally on `main`; approved for push after implementation-agent fixes and independent orchestrator review.
**Important Decisions:** Prisma 7.9.1 owns schema/migrations/generated client through the PostgreSQL driver adapter; JPScents uses dedicated localhost `5632x` Supabase ports to coexist with other projects; application tables deny Data API access with RLS as defense in depth; `app_metadata.role = admin` is the sole Admin authorization signal; `perfume-images` is a private 5 MiB JPEG/PNG/WebP Admin-only bucket; `PerfumeImage` is an ordered child model to preserve asset path and alt text.
**Contract Deviations:** The user explicitly selected a local direct-to-`main` workflow rather than pull requests/worktrees. A local Admin credential was not committed or auto-provisioned; the documented operator step preserves the secret-handling boundary. Visual manual acceptance remains pending and does not block the platform runtime gate.
**Verification Summary:** Local Supabase startup succeeded with all JPScents containers healthy. `supabase db reset --local --no-seed`, Prisma migration deployment, and deterministic seed all succeeded; the seed passed a second repeatability run. Live inspection found 2 perfumes, 3 variants, 1 Bestseller, RLS on all 6 application tables, 1 private image bucket, and its Admin policy. Prisma format/validate/generate, ESLint, TypeScript, 4 focused tests, and the Next.js production webpack build passed. Production audit reports a Prisma build-tool transitive `deepmerge-ts` advisory whose automated fix would force an incompatible Prisma 6 downgrade; deferred pending an upstream-compatible fix.
**Review Outcome:** APPROVE — implementation is within the frozen scope and the runtime, security-foundation, seed, static, test, and build gates pass.
**Reviewed Head:** `69bd620ae14b93bd450ed740718ccf99d053df10`
**Pull Request:** —
**Merge Commit:** —
**Follow-up Notes:** Provision a named local Admin before manual UI acceptance. Recheck the Prisma transitive advisory when Prisma publishes a compatible dependency update.
