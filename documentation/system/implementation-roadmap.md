# Implementation Roadmap

## Execution model

Use five sequential milestones. Each milestone gets one focused GPT-5.6 Terra Medium implementation agent in a clearly named agent thread. The Sol orchestrator owns contracts, sequencing, evidence review, conflict resolution, and integration.

No linked worktrees are planned initially. The dependencies are mostly linear and the shared schema, package manifest, route shells, catalogue projections, and cross-feature flows are high-conflict areas. Each milestone uses one feature branch from the updated default branch and is merged before the next begins. Add a worktree only if later evidence reveals genuinely disjoint work.

## Milestones

| Milestone | Outcome | Depends on | Agent thread | Branch |
| --- | --- | --- | --- | --- |
| 1. Platform and shared foundation | Supabase project wiring, Prisma schema/migrations/client, Admin authentication, product-image storage contract, deterministic seed, shared shells, ModalShell, and verification baseline | approved foundation | `milestone_1_platform` | `feat/milestone-1-platform` |
| 2. Catalogue management | Catalogue data operations and protected Admin Perfumes/create/edit/variants/images/Featured/Bestseller workflows | Milestone 1 | `milestone_2_catalogue_admin` | `feat/milestone-2-catalogue-admin` |
| 3. Public discovery | Homepage, Perfumes, Perfume Detail, Help Me Choose, and their public component families/responsive states | Milestone 2 | `milestone_3_public_discovery` | `feat/milestone-3-public-discovery` |
| 4. Cart | Minimal client Cart state/persistence, drawer/bottom sheet, Full Cart, invalid/empty states, and wiring from Perfume Detail | Milestone 3 | `milestone_4_cart` | `feat/milestone-4-cart` |
| 5. Orders and integration | Checkout, atomic Order creation/stock decrement, confirmation/WhatsApp, Admin Orders/detail/Overview, end-to-end accessibility and responsive verification | Milestone 4 | `milestone_5_orders_integration` | `feat/milestone-5-orders-integration` |

## Dependency rationale

- Catalogue persistence and Admin editing must exist before public discovery can rely on real maintained data.
- Public product projections must be stable before Cart hydration and invalid-line behavior are finalised.
- Orders consumes both Catalogue stock truth and Cart contents, so it comes after both.
- Admin Overview is deliberately last because it composes Order and Catalogue facts.
- Shared files have one owner at a time; later agents re-inspect the merged repository before implementing.

## Integration and review

- Each implementation agent stages and commits only its milestone scope.
- The orchestrator independently reviews the exact milestone head against the active contract and posts the required PR audit.
- Manual merge mode is retained; Freeman merges only after the workflow reaches `ready_for_human`.
- `Sync After Merge` archives the completed contract and prepares the default branch before the next contract is authored.
- A failed acceptance criterion is fixed on the same milestone branch; it does not create a new milestone unless the user approves a genuine scope amendment.

## Platform decisions

- Supabase Postgres is the hosted database.
- Prisma ORM 7 is pinned and owns application schema declarations, generated client, migrations, and database connection. Runtime uses Supavisor transaction pooling; Prisma CLI uses a direct/session connection.
- Supabase Auth protects Admin. Authorization uses trusted server-side identity and `app_metadata`, never user-editable metadata.
- Supabase Storage owns product images; upload authorization remains Admin-only.
- Application data is accessed through the Next.js server and Prisma, not directly from the browser Data API.
- No payment service, queue, worker, microservice, generic repository framework, or speculative online-payment layer is introduced.
