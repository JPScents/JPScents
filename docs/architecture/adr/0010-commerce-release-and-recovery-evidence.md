# ADR-0010 · Commerce release and recovery evidence

- **Status** — Accepted
- **Proposal** — [v1, 13 November 2026](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/docs/architecture/adr/0010-commerce-release-and-recovery-evidence.md)
- **Approval** — 13 November 2026. The owner selected “Approve ADR-0005–0010 v1” in response to the exact v1 brief. [Decision brief](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848070229) · [Owner decision record](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

The production hosting and deployment clauses below are superseded for Milestone 7 by [ADR-0011](0011-free-hosting-and-scheduled-commerce-recovery.md). The rest of this decision remains operative.

## Context

The strict required `JPScents quality` check verifies the merge candidate. Vercel deploys automatically from `main`. Existing local and hosted tests exercise app, database and browser boundaries using disposable services. Merchant account capabilities, real provider events and live activation require separate evidence. [Quality gate](../../engineering/QUALITY_GATES.md#acceptance-and-release-promotion) · [ADR-0004](0004-merge-and-release-verification.md)

## Decision

- Retain the required check, all three canonical commands and candidate-bound fail-closed reports. Extend the same tools and fixtures for commerce. Before merge, require exact-candidate independent PASS, migrated database and browser results, populated old/new rollout and recovery rehearsal, approved isolated test provider evidence and hosted scheduler invocation, and verified prerequisite and security dispositions. Confirm merchant capabilities in the relevant account.
- Prepare forward-compatible migrations and the separately authorised recovery point and schema preparation before merge as required by the rollout. Keep new payment initiation disabled until live prerequisites pass. Preserve the existing Vercel automatic deployment from the human's merge.
- After merge, identify the exact deployed source and confirm the merchant, signing mode, payout and refund funding, live delivery and sender configuration, schedule and authorised bounded payment, refund and smoke results. Record the results in the same milestone handoff. Production readiness stays pending until the deployed results pass.
- Rehearse rollback by disabling new initiation on a compatible app revision while keeping verification, webhooks, reconciliation and refunds available for every in-flight attempt. Use a recovery build that can process those records. Keep migrations forward-compatible and avoid destructive schema rollback. Reassess dependencies for this release under GOV-01. EXC-003 covered PR #1 only.

## Alternatives and trade-offs

Requiring Production-only behaviour before merge would make the live proof impossible under automatic deployment. Treating a green PR as Production readiness would leave real money and recovery unverified. The approved sequence preserves automatic deployments and makes live payment activation depend on the merchant evidence. Isolated provider proof and rehearsal add lead time before merge.

## Scope and verification

Milestone 7 F, AC-02/11/12, T-05/06/07 and all existing canonical checks. Scoped successor to [ADR-0004](0004-merge-and-release-verification.md) for commerce completion. Retain VER-01–03, GOV-01, STD-019–025, the human merge checkpoint and scoped approval for Production operations. Exercise the payment-disabled recovery mode with existing financial work, document the exact test and live evidence and verify the current protected check.

**Adoption and verification** — Stage F verifies the pre-merge candidate and then the deployed revision. The owner merges. Production schema preparation and live financial operations require separate authorisation.
