# ADR-0007 · Commerce order facts and guest capabilities

- **Status** — Accepted
- **Proposal** — [v1, 13 November 2026](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/docs/architecture/adr/0007-commerce-order-facts-and-guest-capabilities.md)
- **Approval** — 13 November 2026. The owner selected “Approve ADR-0005–0010 v1” in response to the exact v1 brief. [Decision brief](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848070229) · [Owner decision record](https://github.com/JPScents/JPScents/pull/3#issuecomment-6848173613)

## Context

The current guest confirmation uses one server-issued cookie and the order's stored opaque token. Order-time fulfilment and item snapshots cover the manual-payment flow. Commerce adds a reusable Admin-issued quote, cross-device order status and financial and address fields. A human-readable reference or a typed contact value cannot establish permission to view an order. [Confirmation cookie](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/server/confirmation-cookie.ts) · [Current projections](https://github.com/JPScents/JPScents/blob/b02113b0c625fd538d41be42a74e50e6e7765f66/src/features/orders/mappers/order.mapper.ts) · [ADR-0003](0003-historical-order-facts.md)

## Decision

- Persist immutable order-time item identity, quantity and unit price, currency, subtotal, delivery fee, payable total and selected destination. Save necessary recipient and delivery fields in the owning checkout transaction. Keep original snapshots and explicit legacy fallback. Treat contact matching as internal customer resolution. Keep private fulfilment data, tokens, provider credentials and unrelated order information out of guest responses.
- Use separate purposes for a versioned payable quote and read access to order status. Use cryptographically random capabilities with a stored hash, expiry, scope and revocation. Expire Admin quote links after 24 hours. Opening a valid link leaves stock untouched. Revoke the old quote on a payable edit or explicit revocation, while retaining any initiated attempt for reconciliation. A payable link gives only the information and operations needed to finish that quote.
- Accept emailed or shared tokens at a dedicated entry path. Use a scoped secure HttpOnly session and redirect to a clean URL for later navigation. Keep tokens out of request logs and analytics, block referrers and caching at the entry, and test hosting and email tracking boundaries before activation. A Paystack return reference identifies an attempt to verify and grants no read or pay authority. Preserve access for existing orders through the established legacy path during migration.
- For email retries that require an identical payload, derive the status token with a server-held secret and persisted random nonce scoped to the delivery and order. Store the token's hash for lookup with its scope and expiry, and retain only the nonce and key version needed to reproduce the email across retry or rotation. Keep the bearer credential out of the database and evidence. See ADR-0008 and ADR-0009 for delivery and reconciliation.

## Alternatives and trade-offs

One token for payment and status would make it harder to revoke a quote without losing visibility into a payment already underway. Customer accounts would change the agreed guest flow. Separate purposes allow narrowly scoped access but require lifecycle and leak testing. Regenerating a scoped status token avoids storing plaintext and requires retaining the applicable signing secret through the retry window.

## Scope and verification

Milestone 7 B–E. AC-04/05/07/08/10/11, T-01/03/04/05/07, CU-01/04/08. Scoped successor to [ADR-0003](0003-historical-order-facts.md) for full payable facts and [ADR-0001](0001-feature-boundaries-and-checkout-input.md) for the guest capability boundary. Reconcile INV-01–03/06, ARC-04/06/08/10/11 and STD-009/012–015/017. Test missing, expired, revoked, stale-version and wrong-order access. Inspect redirect, referrer, tracking and log behaviour with synthetic fixtures. Verify that legacy orders and in-flight transactions preserve access without creating new authority.

**Adoption and verification** — Stages B–E implement the scoped facts and capabilities. Legacy access, privacy and hosting evidence remain required.
