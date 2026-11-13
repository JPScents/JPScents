# Architecture decision records

This index records the repository owner's approved decisions and links them to the governing architecture and coding standards. The initial four records are retrospective. Each separates approval from implementation and verification. The approved contracts remain the source of requirements. [Architecture contract](../ARCHITECTURE.md) · [Coding standards](../../engineering/CODING_STANDARDS.md)

| ADR                                                                                                             | Status   | Decisions covered                                                           | Implementation at the recorded baseline                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-0001 · Feature boundaries and checkout input](0001-feature-boundaries-and-checkout-input.md)               | Accepted | Modular Next.js application, feature APIs, and D1                           | Representative feature boundaries exist. Checkout input still reaches the service in raw form.                                                              |
| [ADR-0002 · Order transactions and inventory consistency](0002-order-transactions-and-inventory-consistency.md) | Accepted | Repository-owned transactions, stock and cancellation invariants, and D2/D4 | Atomic order and cancellation operations exist. Catalogue stock participation, final-unit bestseller handling, and stale Admin edit protection remain open. |
| [ADR-0003 · Historical order facts](0003-historical-order-facts.md)                                             | Accepted | D3                                                                          | Price and quantity are stored with the order. Fulfilment and product labels still need snapshots and an explicit legacy fallback.                           |
| [ADR-0004 · Merge and release verification](0004-merge-and-release-verification.md)                             | Accepted | D5                                                                          | Local checks exist. Required merge enforcement and release evidence remain open.                                                                            |

## Accepted decisions for Milestone 7

The owner approved ADR-0005–0010 v1 on 13 November 2026 and later approved ADR-0011 v1 for hosting and scheduling. The scoped successors retain the legacy guarantees and D1–D5 where applicable. Implementation and verification follow the assigned stages of [Milestone 7](https://github.com/JPScents/JPScents/pull/3). [Owner decision](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

| Decision                                                                                                         | Status   | Affected work                                                                |
| ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [ADR-0005 · Commerce module and route boundaries](0005-commerce-module-and-route-boundaries.md)                  | Accepted | A · module layout, frontend placement, runtime imports and tooling           |
| [ADR-0006 · Commerce orders, payments and stock lifecycle](0006-commerce-orders-payments-and-stock-lifecycle.md) | Accepted | B–D · pricing, inventory reservations, payment, refunds and returns          |
| [ADR-0007 · Commerce order facts and guest capabilities](0007-commerce-order-facts-and-guest-capabilities.md)    | Accepted | B–E · snapshots, payable links and protected status access                   |
| [ADR-0008 · Commerce provider trust boundaries](0008-commerce-provider-trust-boundaries.md)                      | Accepted | C–E · Paystack, Google Places and Resend                                     |
| [ADR-0009 · Durable commerce reconciliation](0009-durable-commerce-reconciliation.md)                            | Accepted | C–F · database recovery, minute-level scheduling and operator visibility     |
| [ADR-0010 · Commerce release and recovery evidence](0010-commerce-release-and-recovery-evidence.md)              | Accepted | F · merge evidence, deployment verification, payment activation and recovery |
| [ADR-0011 · Free hosting and scheduled commerce recovery](0011-free-hosting-and-scheduled-commerce-recovery.md)  | Accepted | E–F · Netlify Free, isolated Preview, automatic deploys and Supabase Cron    |

## Naming and lifecycle

1. Use the next sequential four-digit ID and a descriptive kebab-case filename, such as `0005-subject.md`. Keep the ID stable and reserve retired IDs. Add a row to this index and link related records from the ADR.
2. Use **Proposed** for a new decision and display **PROPOSED — AWAITING APPROVAL**. Record the context, decision, alternatives, trade-offs, affected contracts, implementation evidence, and the recording date. If historical rationale or alternatives are unavailable, record that explicitly.
3. Use **Accepted** once explicit approval is evidenced. Cite the approval and record its date when known. A retrospective record cites existing approval and records its own date separately. Record implementation and enforcement status based on the evidence available.
4. Use **Superseded** when a later accepted ADR replaces the decision. Keep the original record, identify the part replaced, and link the replacement in both directions. Record material changes through a new decision with explicit approval. Bring affected contracts into alignment when authorised.
5. When a change depends on an ADR, cite its ID and the relevant rule IDs in the implementation or review record. Flag discrepancies between an ADR, approved contract, historical record, or implementation. Use GOV-01 for deviations and record verification at the affected boundary. [Approval and exceptions](../ARCHITECTURE.md#4-verification-and-exceptions)

An ADR covers a consequential architectural choice. The coding standards hold routine conventions, review thresholds, and the two approved image lint exceptions. Their approval is recorded there. [Coding decisions](../../engineering/CODING_STANDARDS.md#approved-decisions) · [Image exceptions](../../engineering/CODING_STANDARDS.md#approved-decorative-image-exceptions)

## Approval gate for new decisions

Every new architectural decision or material modification MUST follow the [mandatory architecture approval contract](../../engineering/CHANGE_CONTROL.md#mandatory-architecture-approval-contract). The Orchestrator presents the six-part brief and records the owner's approve/revise/reject response; the Execution Agent stops affected work until an Accepted ADR with matching approval and consistent adoption artifacts exists. Independent review verifies that mapping and cannot grant approval. General milestone activation and merge approval do not substitute for a decision-specific approval.

For each new proposal record its stable ID, version/digest, reason, recommendation, alternatives/trade-offs, affected rules/milestone/tasks, blocked dependencies, approval reference/quotation, scope/conditions and actual disposition/date where known. A rejected proposal retains unapproved status and disposition history; a revised proposal needs approval of its changed scope. Existing Accepted ADRs retain their original approval evidence; this update neither re-approves them nor changes their design.

Use the milestone/task/PR architecture-impact table for coordination, not a duplicate ADR register. No architectural change or an implementation wholly covered by an existing Accepted ADR requires a new record merely for uniformity.

## Earlier questions

The merge mechanism is now the required `JPScents quality` check. ADR-0011 sets the commerce target for automatic deployment. ADR-0010 adds milestone-specific release evidence. ADR-0006 defines expiry for new reservations and retains the existing treatment of legacy unpaid orders. [Quality gates](../../engineering/QUALITY_GATES.md) · [Commerce lifecycle](0006-commerce-orders-payments-and-stock-lifecycle.md) · [Release evidence](0010-commerce-release-and-recovery-evidence.md)

The archived Orders milestone records an initial `NEW` status, manual restocking after cancellation, and display labels read from live catalogue data. The current lifecycle and D3 replace those historical choices. The archive remains evidence for its own milestone. [Archived Orders milestone](../../../.agents/milestones/archive/milestone-5-orders-and-completion.md#L29) · [Current order lifecycle](0002-order-transactions-and-inventory-consistency.md) · [Historical order facts](0003-historical-order-facts.md)
