# Full Cart

## Identity

| Field | Value |
| --- | --- |
| Type | Public Cart page |
| Sources | Final Site Full Cart desktop/mobile and Empty Cart desktop |
| Route/access | `/cart` · public |
| Purpose | Let customers review and correct a multi-variant Cart before Checkout. |

## Data and domain

- **Entities:** client Cart/CartItem; resolved PerfumeVariant/Perfume projections.
- **Displayed:** current lines, size, current price, quantity, stock issue, item count, subtotal.
- **Entered:** quantity changes/removal.
- **Derived:** all display fields, totals, invalid items, checkout eligibility.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `resolveCartItems(variantIds)` | Hydrate catalogue truth for client identifiers |
| Write | Local update/remove | Persist Cart and recompute totals |

## Components

- Public shell, Full Cart Item, QuantityStepper, Cart Summary, Empty State.
- Desktop uses item list plus side summary; mobile stacks compact items and summary/actions.
- Empty state belongs to this route, not a separate page.

## Behaviour and presentation

- Cart persists across normal navigation and reloads.
- Missing/out-of-stock/over-quantity lines remain visible, explain the issue, and block Checkout until removed/reduced.
- Empty Cart offers Browse Perfumes and Find My Scent.
- Continue Browsing navigates to `/perfumes`; changing size returns to Product Detail.

## Quality

- Local persistence parsing is versioned and defensive; quantity limits are announced; Checkout is genuinely disabled when invalid, with an explanation.

## Decisions

- **Confirmed:** CartItem contains only variant ID and quantity.
- **Confirmed:** no inline size editor in this phase.
- **Assumed:** browser localStorage persistence; exact adapter may change without changing the Cart contract.
- **Open:** cart persistence duration/expiry.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
