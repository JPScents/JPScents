# ADR-0008 · Commerce provider trust boundaries

- **Status** — PROPOSED — AWAITING APPROVAL
- **Proposal** — v1, 13 November 2026
- **Approval** — Pending owner decision

## Context

Current checkout saves an order and hands off manually on WhatsApp. There is no payment authority, address provider or order email transport. The contract selects Paystack hosted checkout, optional Google Places and Resend. Provider calls and returned values need explicit trust boundaries. [Current checkout](../../../src/features/orders/hooks/useCheckout.ts) · [Paystack verification](https://paystack.com/docs/payments/verify-payments/)

## Proposed decision

- Use concrete server-only Paystack transport for initialise, verify and refund operations. Send explicit NGN and the server-derived amount and reference, with a configured return origin. Accept only validated hosted checkout destinations. Treat callbacks as navigation. Match verified reference, amount, currency, environment, successful status and local association before Orders applies a financial effect. A mismatch becomes a visible reconciliation issue.
- Validate raw webhook bytes before decoding JSON. Prefer the timestamped Paystack signature with rotation support. An explicitly configured legacy mode can accept the legacy signature when the newer header is absent and the test integration requires it. Reject an invalid newer signature even when a legacy signature is present. Require the newer signature for live activation. Acknowledge only after durable receipt or completion. Retain only fields needed to identify and replay the operation. Deduplicate effects by application identity because legitimate retries can carry a fresh signature timestamp. [Paystack signatures](https://paystack.com/docs/payments/webhooks/)
- Assign an immutable Paystack refund reference at intent creation. After a duplicate or ambiguous submission, query by the same reference, compare the associated transaction, amount, currency and environment, and reconcile the existing intent. A processed refund can still be awaiting bank arrival. When Paystack requires private bank details or funding, use the authorised provider dashboard and reconcile the same intent. [Paystack refunds](https://paystack.com/docs/payments/refunds/)
- Use Google Places Autocomplete with Nigeria restrictions for optional address assistance. Keep fees and deliverability under persisted delivery rules. Allow manual correction and completion when suggestions fail. Keep attribution and retain only permitted, customer-confirmed address data needed for the transaction. [Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete) · [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- Use a verified Resend sender with click tracking disabled for capability links. Persist the notification intent with the business event. Retry within the provider's documented idempotency window using one delivery identity and an identical payload. An ambiguous result beyond that window requires operator reconciliation. Redact provider responses and customer details in operational evidence. [Verified domains](https://resend.com/docs/dashboard/domains/introduction) · [Idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)

## Alternatives and trade-offs

Callback-only payments miss deliveries when a buyer closes the browser. Webhook-only handling leaves gaps for non-success outcomes and lost events. Verification plus durable recovery covers both paths at the cost of additional provider reads. Optional Places preserves an independent manual route. Provider-specific transports keep technical failures out of domain policy without a generic layer.

## Scope and verification

Milestone 7 C–E, AC-04/05/07/09–11, T-01/04/06/07. Extend ARC-05/07/08/10, INV-01–04 and VER-02. Test malformed, invalid, replayed and reordered evidence and exact identity mismatches. Exercise authorised HTTPS Paystack test payment, refund states, signing, verified Resend delivery and Places/manual fallback. Verify hosted capabilities and signing mode in the relevant account.

**Blocked pending approval** — Payment, refund, Places and email transport or trust-boundary implementation. Official-document research and synthetic fixture planning can proceed.
