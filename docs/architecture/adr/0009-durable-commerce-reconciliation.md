# ADR-0009 · Durable commerce reconciliation

- **Status** — Accepted
- **Proposal** — [v1, 13 November 2026](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/docs/architecture/adr/0009-durable-commerce-reconciliation.md)
- **Approval** — 13 November 2026. The owner selected “Approve ADR-0005–0010 v1” in response to the exact v1 brief. [Decision brief](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848070229) · [Owner decision record](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

The hosting and scheduling clauses below are superseded for Milestone 7 by [ADR-0011](0011-free-hosting-and-scheduled-commerce-recovery.md). The rest of this decision remains operative.

## Context

Provider timeouts, webhook redelivery, refund status changes and lost browser callbacks can outlive a request. Reservation expiry has a server deadline even when the scheduler runs late. The required hosted cadence and Preview evidence matter when choosing Vercel's scheduling mechanism. Legacy Cron Jobs run on Production only. Vercel Schedules supports a scoped Preview branch and a one-minute cadence on Pro or Enterprise. [Vercel scheduling comparison](https://vercel.com/docs/schedules) · [Plan limits](https://vercel.com/docs/schedules/limits)

## Decision

Use one protected minute-level Vercel Schedules path target in the existing project. Keep durable work on the domain records that represent outstanding attempts, reservations, refunds, receipts and notification requests. Keep a small persisted run record for operator visibility. Use a deployment-scoped bearer secret for the HTTP target. Verify the actual target, secret injection, invocation and environment isolation in an authorised Preview and in Production. Enable the Preview schedule only on the isolated branch as a separately authorised hosted setup. Confirm account capability and cost before configuring a one-minute schedule. Vercel Schedules is currently documented as beta. [Target configuration](https://vercel.com/docs/schedules/configuration) · [Environment behaviour](https://vercel.com/docs/schedules/concepts)

Process indexed due work in bounded batches with an exclusive claim and expiring lease or an equivalent conditional claim. Compare ownership when completing work. Use the same application transitions from webhook, scheduler and operator recovery. Expiry and fulfilment guards enforce server deadlines independently of schedule delivery. Perform provider calls after claim commit, reconcile ambiguous results by existing identities and keep abandoned claims recoverable. Expose last run, ageing work, error categories and actionable retry in Admin without leaking provider payloads or capabilities. Pause new payment initiation during recovery while continuing in-flight webhook, refund and reconciliation work.

## Alternatives and trade-offs

Legacy Cron Jobs can meet the interval on a paid plan but cannot supply an isolated Preview invocation in the same project. Vercel Schedules can, with a beta platform dependency and a paid plan for the required cadence. An external queue or worker would add another consistency and deployment boundary. Request-time recovery remains useful for active buyers and cannot replace unattended recovery.

## Scope and verification

Milestone 7 C–F, AC-06/07/09/10/11/12, T-03/06/07. Reconcile ARC-05/08/10/11, INV-03–05/07, VER-02 and STD-015/016/020. Verify wrong-secret denial, idle and concurrent runs, expired claims, unknown provider outcomes, and actual hosted invocation and recovery. Keep real invocation evidence pending until the account, cadence and isolated target are confirmed.

**Adoption and verification** — Stages C–F implement and verify durable work. Hosted configuration and any required billing change need separate authorisation. Actual invocation evidence is pending.
