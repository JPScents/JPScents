# Implementation Roadmap

## Execution model

Use five sequential milestones. Each milestone gets one focused GPT-5.6 Terra Medium implementation agent in a clearly named agent thread. The Sol orchestrator owns contracts, sequencing, evidence review, conflict resolution, and integration.

All agents work locally on the shared `main` branch, one at a time. There are no linked worktrees or milestone branches. The dependencies are linear and the schema, package manifest, route shells, catalogue projections, and cross-feature flows are high-conflict areas, so parallel implementation would add coordination risk without useful speed.

## Milestones

| Milestone | Outcome | Depends on | Agent thread | Branch |
| --- | --- | --- | --- | --- |
| 1. Platform and shared foundation | Local Supabase wiring, Prisma schema/migrations/client, Admin authentication, product-image storage contract, deterministic seed, shared shells, ModalShell, and verification baseline | approved foundation | `milestone_1_platform` | `main` |
| 2. Catalogue management | Catalogue data operations and protected Admin Perfumes/create/edit/variants/images/Featured/Bestseller workflows | Milestone 1 | `milestone_2_catalogue_admin` | `main` |
| 3. Public discovery | Homepage, Perfumes, Perfume Detail, Help Me Choose, and their public component families/responsive states | Milestone 2 | `milestone_3_public_discovery` | `main` |
| 4. Cart | Minimal client Cart state/persistence, drawer/bottom sheet, Full Cart, invalid/empty states, and wiring from Perfume Detail | Milestone 3 | `milestone_4_cart` | `main` |
| 5. Orders and integration | Checkout, atomic Order creation/stock decrement, confirmation/WhatsApp, Admin Orders/detail/Overview, end-to-end accessibility and responsive verification | Milestone 4 | `milestone_5_orders_integration` | `main` |

## Dependency rationale

- Catalogue persistence and Admin editing must exist before public discovery can rely on real maintained data.
- Public product projections must be stable before Cart hydration and invalid-line behavior are finalised.
- Orders consumes both Catalogue stock truth and Cart contents, so it comes after both.
- Admin Overview is deliberately last because it composes Order and Catalogue facts.
- Shared files have one owner at a time; later agents re-inspect the merged repository before implementing.

## Integration and review

- Each implementation agent stages and commits only its milestone scope directly on local `main`.
- The orchestrator independently reviews the exact milestone commit against the active contract before pushing it to GitHub.
- Milestones execute sequentially; the next agent starts only after the prior commit passes review.
- The active contract records the local review and is archived before the next contract is authored.
- A failed acceptance criterion is fixed in the same milestone cycle; it does not create a new milestone unless the user approves a genuine scope amendment.

## Platform decisions

- The Supabase CLI and Docker provide the local Postgres, Auth, Storage, and Studio stack during development.
- Prisma ORM 7 is pinned and owns application schema declarations, generated client, migrations, and database connection. Both runtime and migration tooling use local Postgres until a production deployment exists.
- Supabase Auth protects Admin. Authorization uses trusted server-side identity and `app_metadata`, never user-editable metadata.
- Supabase Storage owns product images; upload authorization remains Admin-only.
- Application data is accessed through the Next.js server and Prisma, not directly from the browser Data API.
- No payment service, queue, worker, microservice, generic repository framework, or speculative online-payment layer is introduced.
