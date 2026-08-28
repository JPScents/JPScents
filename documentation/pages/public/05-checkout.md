# Checkout

## Identity

| Field | Value |
| --- | --- |
| Type | Public Orders page |
| Sources | Final Site Checkout desktop/mobile; Notion Checkout behaviour |
| Route/access | `/checkout` · public, requires non-empty Cart |
| Purpose | Collect minimum fulfilment details and atomically create a saved Order before WhatsApp. |

## Data and domain

- **Entities:** Cart/CartItem, PerfumeVariant, Order, OrderItem, OrderStatusEvent.
- **Displayed:** resolved cart review, merchandise subtotal, delivery confirmation note.
- **Entered:** name, WhatsApp number, optional email, delivery area/address, optional note.
- **Derived:** authoritative item amounts, subtotal, initial status/reference/token, stock decrements.
- **Configuration:** delivery areas, locale/currency, reference generation.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | Resolve and revalidate Cart | Render review and validate eligibility |
| Write | `createOrder` | Idempotently create Order/items/event and decrement quantities atomically |

## Components

- Public shell, Field/Select/Textarea, Checkout Summary, Place Order action, failure message.
- Desktop uses form plus sticky/adjacent summary; mobile is a disciplined single column.
- Contact/Delivery groups remain Orders-owned.

## Behaviour and presentation

- Empty Cart redirects to `/cart` or renders a clear unavailable state.
- Submission revalidates publication, variant existence, price, and quantity; client totals are never trusted.
- On success: clear Cart, retain confirmation access, navigate `/checkout/confirm`.
- On failure: do not open WhatsApp; preserve form/Cart and show actionable retry/conflict messages.

## Quality

- Server validation is authoritative; phone/email/address inputs use proper autocomplete/input modes; submit is protected from duplicates; private details are never placed in URLs.

## Decisions

- **Confirmed:** checkout belongs to Orders.
- **Confirmed:** payment is not collected online.
- **Confirmed:** delivery cost remains “confirmed after ordering” until deterministic rules exist.
- **Open:** delivery-area values, exact phone normalization, data-retention/privacy wording, cancellation stock restoration.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
