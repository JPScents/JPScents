# ADR-0003 · Historical order facts

- **Status** — Accepted
- **Decision date** — 12 November 2026, when the owner approved D3.
- **Recording date** — 12 November 2026
- **Approval evidence** — D3 and INV-06 define the accepted snapshot and legacy fallback requirements. [Approved decisions](../ARCHITECTURE.md#approved-decisions) · [Security and product invariants](../ARCHITECTURE.md#security-and-product-invariants)

## Context and problem

Orders already store placed unit price and quantity. The order mapper reads fulfilment contact and address from the current Customer row and the product name and size from the current Catalogue variant. Later customer or catalogue edits can therefore change the facts displayed for an existing order. [Order schema](../../../prisma/schema.prisma#L105) · [Order mapping](../../../src/features/orders/mappers/order.mapper.ts#L10) · [Assessment](../../CODEBASE_INTELLIGENCE.md#6-technical-health)

## Decision

Persist order-time fulfilment contact and delivery details and the product name and size sold for new orders. Record them as part of the order transaction alongside the existing quantity and price. Keep customer and variant links for navigation and stock restoration. New orders display the saved facts. Identify legacy fallback data when the original values are unavailable. Keep private fulfilment data out of public responses. [D3](../ARCHITECTURE.md#approved-decisions) · [Public and Admin projections](../ARCHITECTURE.md#security-and-product-invariants)

## Alternatives

Live relations for product labels were an explicit choice in the archived Orders milestone. D3 supersedes that choice for new orders. The codebase assessment raised whether to include product name and size alongside delivery snapshots. D3 approved both. A formal comparison of backfill strategies was not recorded. Missing original facts remain unknown. [Archived projection decision](../../../.agents/milestones/archive/milestone-5-orders-and-completion.md#L29) · [Assessment recommendation](../../CODEBASE_INTELLIGENCE.md#9-prioritised-recommendations)

## Rationale and trade-offs

Historical facts support fulfilment and preserve the identity of what was sold even as catalogue and customer records change. Snapshots require a forward schema migration and retain personal contact and address data on the order. Existing identity links preserve current navigation and cancellation behaviour. Legacy fallback can keep old orders usable while distinguishing mutable values from the original facts. [D3 rationale](../ARCHITECTURE.md#approved-decisions)

## Consequences and affected components

The Prisma schema and forward migrations, Orders creation and projections, and public and Admin order views are affected. Customers continues to own the mutable profile. Catalogue continues to own product and stock records. The Orders snapshot represents the transaction's historical facts. A new retention or backfill policy that changes the approved contract would need a separate decision. [Domain ownership](../ARCHITECTURE.md#1-system-model-and-domain-boundaries) · [Current mutable profile write](../../../src/features/customers/repositories/customer.repository.ts#L88)

## Related rules and standards

ARC-06, ARC-10, ARC-11, INV-01, INV-03, INV-04, INV-06, and VER-02. STD-008, STD-015, STD-020–021, and STD-023 cover contracts, projections, regressions and migration documentation. [Architecture rules](../ARCHITECTURE.md#2-rules-and-verification-key) · [Coding conventions](../../engineering/CODING_STANDARDS.md#mandatory-conventions)

## Implementation and enforcement

The inspected schema stores prices and quantities, while the mapper still reads live customer and product values. Snapshot persistence and legacy handling remain open. Verify existing and new orders on a migrated database, change the related records after placement, and check both the Admin and public projections. Current unit projections establish the inspected response shape, with no evidence that the historical snapshot is stored. [Architecture gaps](../ARCHITECTURE.md#implementation-and-enforcement-gaps) · [Projection test](../../../tests/src/features/orders/services/order.service.test.ts#L250)

## Related ADRs

[ADR-0002](0002-order-transactions-and-inventory-consistency.md) defines the enclosing transaction and restoration by variant ID. [ADR-0004](0004-merge-and-release-verification.md) defines migration and runtime evidence.
