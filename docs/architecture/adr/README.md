# Architecture decision records

This index records the repository owner's approved decisions and links them to the governing architecture and coding standards. The initial four records are retrospective. Each separates approval from implementation and verification. The approved contracts remain the source of requirements. [Architecture contract](../ARCHITECTURE.md) · [Coding standards](../../engineering/CODING_STANDARDS.md)

| ADR                                                                                                             | Status   | Decisions covered                                                           | Implementation at the recorded baseline                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR-0001 · Feature boundaries and checkout input](0001-feature-boundaries-and-checkout-input.md)               | Accepted | Modular Next.js application, feature APIs, and D1                           | Representative feature boundaries exist. Checkout input still reaches the service in raw form.                                                              |
| [ADR-0002 · Order transactions and inventory consistency](0002-order-transactions-and-inventory-consistency.md) | Accepted | Repository-owned transactions, stock and cancellation invariants, and D2/D4 | Atomic order and cancellation operations exist. Catalogue stock participation, final-unit bestseller handling, and stale Admin edit protection remain open. |
| [ADR-0003 · Historical order facts](0003-historical-order-facts.md)                                             | Accepted | D3                                                                          | Price and quantity are stored with the order. Fulfilment and product labels still need snapshots and an explicit legacy fallback.                           |
| [ADR-0004 · Merge and release verification](0004-merge-and-release-verification.md)                             | Accepted | D5                                                                          | Local checks exist. Required merge enforcement and release evidence remain open.                                                                            |

## Proposed decisions for Milestone 7

These v1 proposals require owner approval under the existing change-control procedure. ADR-0001–0004 remain the approved baseline while the proposals are pending.

| Decision                                                                                                         | Status   | Affected work                                                                |
| ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [ADR-0005 · Commerce module and route boundaries](0005-commerce-module-and-route-boundaries.md)                  | Proposed | A · module layout, frontend placement, runtime imports and tooling           |
| [ADR-0006 · Commerce orders, payments and stock lifecycle](0006-commerce-orders-payments-and-stock-lifecycle.md) | Proposed | B–D · pricing, inventory reservations, payment, refunds and returns          |
| [ADR-0007 · Commerce order facts and guest capabilities](0007-commerce-order-facts-and-guest-capabilities.md)    | Proposed | B–E · snapshots, payable links and protected status access                   |
| [ADR-0008 · Commerce provider trust boundaries](0008-commerce-provider-trust-boundaries.md)                      | Proposed | C–E · Paystack, Google Places and Resend                                     |
| [ADR-0009 · Durable commerce reconciliation](0009-durable-commerce-reconciliation.md)                            | Proposed | C–F · database recovery, minute-level scheduling and operator visibility     |
| [ADR-0010 · Commerce release and recovery evidence](0010-commerce-release-and-recovery-evidence.md)              | Proposed | F · merge evidence, deployment verification, payment activation and recovery |

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

## Open Decisions

| Question                                                                                | Evidence needed before choosing                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where should the D5 merge gate and release evidence be enforced in the hosted workflow? | Confirm actual branch protection, required check configuration, and deployment settings. D5 already defines the required outcomes. The hosted mechanism remains open. [ADR-0004](0004-merge-and-release-verification.md) · [Controls audit](../../engineering/CONTROLS_AUDIT.md#executed-verification)                                |
| Should unpaid orders gain an expiry or stock-release policy?                            | The assessment identified this as a separate product question. Use evidence about unpaid order age, stock held, and operator handling before proposing any lifecycle change. [Codebase intelligence](../../CODEBASE_INTELLIGENCE.md#9-prioritised-recommendations) · [ADR-0002](0002-order-transactions-and-inventory-consistency.md) |

The archived Orders milestone records an initial `NEW` status, manual restocking after cancellation, and display labels read from live catalogue data. The current lifecycle and D3 replace those historical choices. The archive remains evidence for its own milestone. [Archived Orders milestone](../../../.agents/milestones/archive/milestone-5-orders-and-completion.md#L29) · [Current order lifecycle](0002-order-transactions-and-inventory-consistency.md) · [Historical order facts](0003-historical-order-facts.md)
