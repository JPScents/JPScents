# ADR-0001 · Feature boundaries and checkout input

- **Status** — Accepted
- **Decision date** — 12 November 2026, when the owner approved the architecture contract and D1. The original adoption date of the monolith and feature layout was not recorded.
- **Recording date** — 12 November 2026
- **Approval evidence** — The approved architecture defines the system model, dependency map, and D1. [Approved contract](../ARCHITECTURE.md) · [Approved decisions](../ARCHITECTURE.md#approved-decisions)

## Milestone 7 successor

Milestone 7 adopts [ADR-0005](0005-commerce-module-and-route-boundaries.md) for module, presentation and transport ownership and [ADR-0007](0007-commerce-order-facts-and-guest-capabilities.md) for the new guest capability purposes. D1, the directed APIs, browser isolation and the legacy confirmation path retain their approved scope.

## Context and problem

JPScents serves a public storefront and an Admin application in one Next.js project. Routes compose Catalogue, Cart, Customers, and Orders. Shared infrastructure supplies Auth, Storage, and the database client. The current checkout action forwards raw request arguments to `createOrder`, which decodes them inside the service. That puts request validation in a different layer from the boundary used by other feature writes. [Project structure](../../../README.md#L38) · [Checkout action](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/actions/submit-order.action.ts#L6) · [Current service](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/services/order.service.ts#L91)

## Decision

Keep the modular Next.js monolith. Routes own framework composition. Features own domain behaviour and expose deliberate server and browser APIs. Cross-feature dependencies are one-way through those APIs. Cart reads published variant information through Catalogue. Checkout composition bridges Cart and Orders at the route. Privileged operations remain server-side, and generic UI and infrastructure remain independent of features.

Under D1, `submitOrder` uses the existing parser to decode and validate the external payload. The Orders service receives a typed workflow input and coordinates the application outcome. The action retains its framework effects, including setting the confirmation cookie after success. [Dependency map](../ARCHITECTURE.md#dependency-map) · [Checkout flow](../ARCHITECTURE.md#cart-resolution-and-guest-checkout)

## Alternatives

No alternative system architecture or original comparison was recorded. The existing Orders service decoding raw input is the evidenced prior arrangement for D1. The approved action boundary replaces that arrangement. [D1 and implementation gap](../ARCHITECTURE.md#implementation-and-enforcement-gaps)

## Rationale and trade-offs

The approved feature boundaries keep ownership and runtime dependencies explicit while allowing simple flows to omit unnecessary layers. D1 gives checkout the same trust boundary as other actions and leaves the service focused on orchestration. Moving the parsing call changes the interface between the action and service. Field errors, retries, and the existing success response still need to survive that move. [Action responsibilities](../../../.agents/skills/feature-structure/SKILL.md#L64) · [Catalogue action example](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/catalogue/actions/save-perfume.admin.action.ts#L28)

## Consequences and affected components

Cart's provider, browser storage and resolver stay Cart-owned. Catalogue supplies published data. The checkout action, parser, service and tests are the affected D1 components. Protected reads continue to authorise before querying. Confirmation uses the scoped capability and its public projection. [Cart resolver](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/cart/actions/resolve-cart.action.ts#L41) · [Checkout adapter](../../../src/app/%28public%29/checkout/_components/Checkout.tsx#L3) · [Confirmation cookie](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/server/confirmation-cookie.ts#L11)

## Related rules and standards

ARC-01–08, INV-01–03. STD-003, STD-004, STD-008–011, STD-014, and STD-015 cover imports, contracts, runtime placement, and request validation. [Architecture rules](../ARCHITECTURE.md#2-rules-and-verification-key) · [Coding conventions](../../engineering/CODING_STANDARDS.md#mandatory-conventions)

## Implementation and enforcement

The inspected source contains representative public APIs, runtime markers and route composition. The checker covers known filename, entry-point and import patterns. A temporary audit fixture demonstrated that it accepts public-entry cycles and some semantic misplacement. D1 still needs implementation and outcome tests for malformed input, field errors, and successful retries. [Checker](../../../.agents/skills/feature-structure/scripts/check-structure.mjs#L193) · [Executed audit](../../engineering/CONTROLS_AUDIT.md#executed-verification) · [Order action tests](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/tests/src/features/orders/actions/order-actions.test.ts#L26)

## Related ADRs

[ADR-0002](0002-order-transactions-and-inventory-consistency.md) defines the transaction that follows checkout validation. [ADR-0004](0004-merge-and-release-verification.md) defines the verification boundary for module and runtime changes.
