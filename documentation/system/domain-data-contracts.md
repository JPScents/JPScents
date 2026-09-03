# Domain and Data Contracts

## Enums

```text
PerfumeStatus: DRAFT | PUBLISHED
ScentCharacter: FRESH | WARM | SWEET | WOODY
Occasion: EVERYDAY | WORK | DATE_NIGHT | SPECIAL_OCCASION
TimeOfDay: DAY | NIGHT
OrderStatus: NEW | CONFIRMED | AWAITING_PAYMENT | CANCELLED
```

`scentCharacters`, `occasions`, and `timesOfDay` are arrays of enum values. Multiple selections are allowed. Public `Either` means no TimeOfDay filter; it is not stored as an enum value.

## Persisted models

### Perfume

```text
id
name
slug                    unique, stable public identifier
scentCue                short card/hero description
description
images[]                ordered asset reference + alt text
status                   PerfumeStatus
scentCharacters[]       ScentCharacter
occasions[]             Occasion
timesOfDay[]            TimeOfDay
isFeatured
isBestseller
createdAt
updatedAt
```

Derived: primary image, starting price, total quantity, available variant count, overall availability. Exactly zero or one published/in-stock Perfume may be Bestseller.

### PerfumeVariant

```text
id
perfumeId               -> Perfume.id
sizeValue               positive number
sizeUnit                currently ML
priceMinor              non-negative integer
quantity                non-negative integer
createdAt
updatedAt
```

`perfumeId + sizeValue + sizeUnit` is unique. Availability is derived from `quantity > 0` plus the parent Perfume being published. A customer quantity cannot exceed current variant quantity. Cart does not reserve quantity; Order creation revalidates and decrements atomically.

### Customer

```text
id
name
whatsappNumber          normalized, unique
email                   optional, normalized, unique
deliveryState
deliveryCity
deliveryAddress
createdAt
updatedAt
```

One Customer has many Orders. Checkout identifies a customer by normalized WhatsApp number and may add a previously absent email. If WhatsApp and email resolve to different Customers, checkout fails safely rather than merging records.

### Order

```text
id
reference               unique human-readable JPScents reference
confirmationToken       unguessable public confirmation access token
submissionKey           unique idempotency key
customerId              -> Customer.id
orderNote               optional
subtotalMinor
status                   OrderStatus
stockRestoredAt          cancellation idempotency marker
createdAt
updatedAt
```

The WhatsApp URL/message is derived from the Customer, Order, and configuration; it is not persisted.

### OrderItem

```text
id
orderId                 -> Order.id
perfumeVariantId        -> PerfumeVariant.id
quantity                positive integer
unitPriceMinor          placed-price fact
```

Names, slugs, images, and size labels are resolved through the referenced variant/perfume and are not copied. `unitPriceMinor` is intentionally retained: it is a transactional fact, not display duplication. Without it, changing a variant price would make historical line prices and totals incorrect.

### OrderStatusEvent

```text
id
orderId                 -> Order.id
fromStatus              optional for initial event
toStatus                OrderStatus
createdAt
```

This supports the designed activity history without storing a generic audit platform.

## Client-only models

### Cart

```text
version
items[]
```

### CartItem

```text
perfumeVariantId
quantity
```

Cart display data and authoritative prices are resolved from Catalogue. Same-variant additions merge. Derived values include item count, resolved lines, line totals, subtotal, invalid items, and checkout eligibility.

## Transaction rules

- Order creation validates all referenced variants, current prices, requested quantities, and parent publication state.
- Order creation finds or creates the Customer, creates the Order and OrderItems, and decrements variant quantities in one atomic operation.
- Duplicate submission keys return the already-created Order rather than creating another.
- Confirmation access requires the unguessable token; the human-readable reference alone must not expose private Order details.
- Cart clears only after confirmed Order creation, never on a failed submission.
- Cancellation preserves Order and OrderItem history, records a CANCELLED event, and restores grouped variant stock once only.

## Explicit exclusions

No payment credentials, customer accounts, live warehouse synchronisation, stock reservation service, accounting, CRM, courier system, AI recommendation model, or generic taxonomy engine.
