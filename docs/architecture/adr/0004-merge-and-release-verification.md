# ADR-0004 · Merge and release verification

- **Status** — Accepted
- **Decision date** — 12 November 2026, when the owner approved D5.
- **Recording date** — 12 November 2026
- **Approval evidence** — D5 and VER-01–03 define the accepted gate and evidence requirements. CS3 and CS4 supplement them with test and rollout standards. [Approved architecture decisions](../ARCHITECTURE.md#approved-decisions) · [Approved coding decisions](../../engineering/CODING_STANDARDS.md#approved-decisions)

## Context and problem

The repository has a full local check covering architecture, formatting, lint, types, and tests. The audit found no active local Git hooks or tracked CI gate and could not verify hosted branch or deployment rules. Some meaningful transaction tests use mocks. One returning-customer test passed while logging a `TypeError` because it did not assert the successful result. [Package scripts](../../../package.json#L14) · [Executed audit](../../engineering/CONTROLS_AUDIT.md#executed-verification) · [Returning-customer test](../../../tests/src/features/orders/services/order.service.test.ts#L208)

## Decision

Require the existing full quality check on the exact revision eligible for merge. Require release evidence at affected boundaries under VER-02. Use a disposable migrated database for changes to transaction, schema, constraint or policy behaviour. Use an isolated production build and exercise the affected routes for client/server entry changes. Exercise the real Auth, Storage, or browser boundary when the corresponding workflow changes. Record commands, results and limitations, and use independent review for semantic architecture. Exceptions require explicit approval under GOV-01. [Verification and exceptions](../ARCHITECTURE.md#4-verification-and-exceptions)

## Alternatives

The documented baseline uses manually invoked local checks and a separate Vercel build and smoke check. D5 adds required evidence tied to the merge candidate and affected release boundary. No specific hosted wiring or formal comparison of hosted mechanisms was recorded. Actual hosted settings are needed before choosing the mechanism. [Deployment handoff](../../../README.md#L133) · [D5](../ARCHITECTURE.md#approved-decisions)

## Rationale and trade-offs

Tying evidence to the candidate revision prevents an older or locally green result from serving as the merge decision. Reusing the existing check keeps one quality path. Real database and browser runs take more time and setup, so release evidence is scoped to the boundary that changed. Static checks and independent review cover different properties of the code. [D5 rationale](../ARCHITECTURE.md#approved-decisions) · [Delivery verification](../../../.agents/skills/delivery-workflow/SKILL.md#L20)

## Consequences and affected components

The existing check scripts and architecture checker remain the starting point. Hosted merge and deployment controls, isolated build setup, and database and browser verification are affected. CS3 requires outcome assertions, and CS4 keeps semantic checks in review while considering type-only import linting separately. The approved complexity and length thresholds trigger review under STD-007. [Coding decisions](../../engineering/CODING_STANDARDS.md#approved-decisions) · [Enforcement matrix](../../engineering/CODING_STANDARDS.md#standards-to-enforcement-matrix)

## Related rules and standards

VER-01–03 and GOV-01. STD-007, STD-019–021, and STD-024–025 cover review triggers, assertions, boundary evidence, reporting and exceptions. [Architecture verification](../ARCHITECTURE.md#4-verification-and-exceptions) · [Coding enforcement](../../engineering/CODING_STANDARDS.md#standards-to-enforcement-matrix)

## Implementation and enforcement

The audit ran the local check constituents successfully and verified isolated Prisma validation and generation. The isolated Next.js build stopped at Google Fonts DNS resolution. Hosted merge and release enforcement and real-boundary evidence remain unverified. Inspect current host settings and record the required-check mechanism and successful evidence on the relevant candidate before reporting the gate operational. [Executed audit](../../engineering/CONTROLS_AUDIT.md#executed-verification) · [D5 gap](../ARCHITECTURE.md#implementation-and-enforcement-gaps)

## Related ADRs

[ADR-0001](0001-feature-boundaries-and-checkout-input.md), [ADR-0002](0002-order-transactions-and-inventory-consistency.md), and [ADR-0003](0003-historical-order-facts.md) describe boundaries that determine the required evidence.
