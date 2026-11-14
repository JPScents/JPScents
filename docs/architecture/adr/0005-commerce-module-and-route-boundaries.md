# ADR-0005 · Commerce module and route boundaries

- **Status** — Accepted
- **Proposal** — [v1, 13 November 2026](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/docs/architecture/adr/0005-commerce-module-and-route-boundaries.md)
- **Approval** — 13 November 2026. The owner selected “Approve ADR-0005–0010 v1” in response to the exact v1 brief. [Decision brief](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848070229) · [Owner decision record](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

## Context

At the proposal baseline, `src/features` combined domain operations and frontend code. Cart has browser persistence and no database tables. Prisma Client is generated into `src/db/generated`, and Admin authentication combines Next.js request context, Supabase transport and identity policy under `src/lib`. Milestone 7 adds commerce domains and providers. The current feature discovery, import checks, generator exclusions and UI-generator aliases follow the existing layout. [Current architecture](../ARCHITECTURE.md#1-system-model-and-domain-boundaries) · [Prisma generator](../../../prisma/schema.prisma#L1)

## Decision

Keep one Next.js app, database, manifest and deployment. Separate application and provider boundaries inside that app.

- `src/modules` owns backend Catalogue, Customers, Orders, Payments, Delivery, Notifications and Access. Add each module when its first actual operation lands. Expose explicit public entries and mark privileged APIs server-only. Orders calls participating domains as needed. Their repositories accept the existing Orders transaction only for purpose-specific operations. Payments has no dependency on Orders.
- `src/infrastructure` owns database client lifetime and provider transport. Put generated Prisma files under `src/infrastructure/database/generated`. Repositories own model operations. Keep Prisma schema and migrations at the repo root. Infrastructure has no business-module imports.
- `src/app` owns request decoding, route-level authorization and framework effects. Access owns Admin identity policy and consumes trusted identity supplied by the request adapter. Keep page UI, hooks and actions near their routes and Cart under `(public)/_cart`. Place cross-group presentation such as OrderSummary in `src/ui`, with explicit browser-safe props and callbacks. Keep small runtime-neutral helpers in `src/shared`. Modules are independent of React and route code.
- Move affected code and consumers together. Migrate tests, discovery, aliases, suppression paths, seeds, verification preflight and generation output in the same stage. Retain D1 input validation at the callable boundary. Apply EXC-001 and EXC-002 only to the previously approved elements and assets.

## Alternatives and trade-offs

Keeping the current feature layout would avoid broad moves and is viable for a smaller change. The approved layout makes the dependency boundaries explicit for the new domains. It requires a coordinated migration of consumers and tooling, so complete and verify the move before introducing payment behaviour. Independent packages would add package and deployment boundaries the contract excludes.

## Scope and verification

Milestone 7 Stage A, AC-01/02/11, T-02/04/05. This is a scoped successor to [ADR-0001](0001-feature-boundaries-and-checkout-input.md) for placement and ownership. Preserve its D1 decision, browser isolation, directed APIs and single-app model. Reconcile ARC-01–03/07–09, the applicable STD-001/003/004/010/011/018/019/023 instructions and the architecture checker. Test allowed and disallowed imports, cycles, server/client boundaries and Prisma ownership. Build and exercise the existing storefront, Admin, Auth, Storage and order history against the moved source.

**Adoption and verification** — Stage A implements the ownership and tooling changes before payment behaviour changes. Implementation and isolated regression evidence are pending at adoption.
