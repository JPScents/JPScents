# ADR-0006 · Commerce orders, payments and stock lifecycle

- **Status** — Accepted
- **Proposal** — [v1, 13 November 2026](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/docs/architecture/adr/0006-commerce-orders-payments-and-stock-lifecycle.md)
- **Approval** — 13 November 2026. The owner selected “Approve ADR-0005–0010 v1” in response to the exact v1 brief. [Decision brief](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848070229) · [Owner decision record](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

## Context

Checkout currently deducts available stock when it creates a manual-payment order. Admin can advance that order through a shared status enum and cancel through the one-time stock restoration operation. Paystack adds payments that can succeed after the browser leaves or inventory has been released. A single status field cannot represent inventory, payment and fulfilment decisions independently. [Order schema](../../../prisma/schema.prisma#L105) · [Stock operations](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/catalogue/repositories/stock.repository.ts) · [ADR-0002](0002-order-transactions-and-inventory-consistency.md)

## Decision

- Keep Orders as the transaction owner. Catalogue owns available stock, reservations, movements and bestseller clearance. Payments owns attempt and refund facts. Keep distinct order, fulfilment, payment and refund states. Delivery owns persisted enabled destinations and fees. Orders computes and snapshots the authorised integer-kobo NGN total. Accept new ordinary checkout totals only after stale prices or fees have been acknowledged. Issued Admin quotes retain their item prices for 24 hours and calculate delivery at checkout.
- At Pay, validate published and available stock, quote and destination inside the transaction. Record one 30-minute reservation, its inventory debit and a durable payment attempt with the order snapshot. Lock the order and acquire Catalogue's sorted parent stock locks consistently. Guard transitions and identities in the database. Network calls run after commit. Expiry restores available stock once and keeps the provider attempt reconcilable. Consuming a held reservation records an allocation without a second debit.
- Apply verified success idempotently under the order lock. After expiry or release, allocate every line at the accepted price or record a full refund intent. Record and refund late success on a cancelled order and extra successful attempts without reopening or fulfilling again. Retain each provider reference. Reconcile an ambiguous attempt before offering a new one. A verified failure permits a new attempt only after fresh stock, quote and destination checks.
- Dispatch requires verified payment or a classified pre-existing legacy/manual fact. Before dispatch, cancellation records terminal state, restores eligible stock once and records a full refund intent including delivery. After dispatch, Admin records an explicit refund amount and reason. Under the same order lock, count pending, ambiguous and processed refunds against the refundable balance. A separate received saleable return credits only remaining eligible quantities. Record the actor, time, reason and verified outcome.
- Use forward changes and explicit legacy classification. Existing unpaid orders retain current stock and cancellation treatment without new expiry. Preserve original references and history. Last available-unit reservation clears bestseller placement in the transaction. Releases and returns leave placement to Admin. Ordinary variant edits preserve stock, and explicit adjustments still reject stale stock state.

## Alternatives and trade-offs

Deducting stock only after payment would permit two valid payments for one item and make avoidable refunds routine. A separate inventory system or transaction broker adds another consistency boundary. The approved PostgreSQL model adds durable rows and reconciliation work while preserving one atomic owner and Catalogue's existing stock locks.

## Scope and verification

Milestone 7 B–D and recovery operations in E. AC-03–09, AC-11, T-01/03/04/05. Scoped successor to [ADR-0002](0002-order-transactions-and-inventory-consistency.md) for new commerce flows. Retain transaction ownership and legacy guarantees. Reconcile ARC-05/09–11, INV-03–07, STD-015/016/020/021 and VER-02. Exercise all-line rollback, expiry/payment/cancel races, extra and late payments, refund contention, returns, stale stock edits and populated upgrades against real PostgreSQL. Provider authority and recovery transport are covered by ADR-0008 and ADR-0009.

**Adoption and verification** — Stages B–D and E recovery work follow the verified structural migration. The new schema and real PostgreSQL evidence are pending at adoption.
