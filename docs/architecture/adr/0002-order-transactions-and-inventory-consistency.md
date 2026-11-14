# ADR-0002 · Order transactions and inventory consistency

- **Status** — Accepted
- **Decision date** — 12 November 2026, when the owner approved the architecture contract and D2/D4. The original approval date of the existing transaction pattern was not recorded.
- **Recording date** — 12 November 2026
- **Approval evidence** — The approved architecture defines transaction ownership, inventory invariants, and D2/D4. [Approved decisions](../ARCHITECTURE.md#approved-decisions) · [Stock participation](../ARCHITECTURE.md#stock-participation-in-orders-transactions)

## Milestone 7 successor

[ADR-0006](0006-commerce-orders-payments-and-stock-lifecycle.md) governs the reservation, payment, refund and return lifecycle for new commerce orders. The original order transaction, legacy treatment, terminal cancellation and D2/D4 stock safeguards retain their approved scope.

## Context and problem

Orders already saves customer resolution, stock deduction, order lines, and status history together. It also writes Catalogue variant quantities directly. The database bestseller trigger can reject checkout when a decrement consumes the last in-stock unit of the active bestseller. Separately, the Admin variant editor submits an absolute quantity with other edits. That value can overwrite a concurrent checkout deduction or cancellation restoration. [Checkout repository](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/repositories/order.repository.ts#L89) · [Bestseller trigger](../../../prisma/migrations/20260828201815_harden_bestseller_search_path/migration.sql#L20) · [Variant write](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/catalogue/repositories/variant.repository.ts#L33)

## Decision

Repositories own Prisma operations. Orders opens and completes the checkout or cancellation transaction. It passes the same transaction to purpose-specific Catalogue stock operations through `catalogue/server.ts` and, for checkout, to Customers' identity operation through `customers/server.ts`. Each participant uses that transaction and returns completed results. Network calls stay outside the transaction. Prisma remains the migration authority, including forward SQL changes to constraints and triggers. [Prisma boundaries](../../../prisma/README.md#L3) · [Approved stock flow](../ARCHITECTURE.md#stock-participation-in-orders-transactions)

D2 assigns deduction, restoration, and bestseller clearance to Catalogue. Checkout uses authoritative variant prices and conditional stock writes. The order, its customer association, stock movements and initial `AWAITING_PAYMENT` event commit or roll back together. A repeat submission key resolves the committed order. The sale that consumes the last stock of the active bestseller clears the placement in that transaction. Cancellation claims the order, restores its recorded quantities at most once, and appends the status event atomically. A cancelled order stays terminal. Restocking leaves bestseller selection to an operator. [INV-03–05](../ARCHITECTURE.md#security-and-product-invariants)

D4 requires ordinary variant edits to preserve quantity. An explicit absolute adjustment checks the stock state or revision the operator saw. A stale adjustment returns a conflict the operator can resolve by refreshing. [D4](../ARCHITECTURE.md#approved-decisions)

## Alternatives

The assessment identified clearing the bestseller placement or making it ineligible for display as possible sell-out behaviour. D2 approved clearance. The prior direct Orders writes and unguarded Admin quantity update are evidenced baseline approaches. No formal comparison of alternative locking mechanisms or inventory models was recorded. Transaction sequencing and any necessary forward SQL change remain implementation choices within D2. [Assessment alternatives](../../CODEBASE_INTELLIGENCE.md#9-prioritised-recommendations) · [Approved D2 and D4](../ARCHITECTURE.md#approved-decisions)

## Rationale and trade-offs

Catalogue can enforce its inventory and merchandising rules together while Orders retains a single atomic business operation. The price of that separation is a deliberate repository-to-repository dependency. Clearing a bestseller lets the sale proceed, and staff select placement again after restock. The optimistic check avoids lost updates without a ledger. Staff may need to refresh and reapply a count after a conflict. [Approved rationale](../ARCHITECTURE.md#approved-decisions)

## Consequences and affected components

Orders' checkout and cancellation repositories, the Catalogue server API and stock persistence, and the Admin variant editor and write path are affected. The existing one-bestseller index and trigger need to be exercised with the chosen sequencing. The lifecycle migration replaced the archived `NEW` status, and the current architecture requires one-time stock restoration in place of that milestone's manual restocking. [Bestseller index](../../../prisma/migrations/20260828000000_initial_platform/migration.sql#L114) · [Lifecycle migration](../../../prisma/migrations/20260904000000_update_order_status_lifecycle/migration.sql#L1) · [Archived milestone](../../../.agents/milestones/archive/milestone-5-orders-and-completion.md#L32)

## Related rules and standards

ARC-05, ARC-07–11, INV-03–05, INV-07, and VER-02. STD-007, STD-015–017, and STD-020–021 cover cohesive transaction code, persistence outcomes, sequencing and failure evidence. [Architecture rules](../ARCHITECTURE.md#2-rules-and-verification-key) · [Coding conventions](../../engineering/CODING_STANDARDS.md#mandatory-conventions)

## Implementation and enforcement

The current source has transactional checkout, conditional stock updates, duplicate lookup, and conditional cancellation. Catalogue's stock participation, last-unit bestseller clearance and optimistic Admin adjustment are open. The checker can catch known direct Prisma access outside repositories. Correct transaction propagation and database consistency require review and disposable migrated PostgreSQL tests for final-unit sale, rollback, duplicate checkout, concurrent updates and repeat cancellation. Existing mocked tests do not prove those database behaviours. [Current cancellation](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/repositories/order.repository.ts#L219) · [Architecture gaps](../ARCHITECTURE.md#implementation-and-enforcement-gaps) · [Transaction tests](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/tests/src/features/orders/services/order.service.test.ts#L22)

## Related ADRs

[ADR-0001](0001-feature-boundaries-and-checkout-input.md) covers the entry boundary. [ADR-0003](0003-historical-order-facts.md) defines the facts written with the order. [ADR-0004](0004-merge-and-release-verification.md) defines required database evidence.
