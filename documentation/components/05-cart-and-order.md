# Cart and Order Presentation

## Identity

| Field | Value |
| --- | --- |
| Type | Cart/Orders component family |
| Sources | Workspace `Cart & Order`; cart preview, Full Cart, Checkout, Confirmation, Admin Order Detail |
| Access | Public and protected contexts |
| Purpose | Reuse resolved line-item and summary presentation without duplicating catalogue state. |

## Data and domain

- **Entities:** Cart/CartItem, Perfume/PerfumeVariant projection, Order/OrderItem.
- **Displayed:** resolved image/name/size, quantity, line amount, count, subtotal, issue state.
- **Derived:** all Cart display fields and amounts; Order line display resolves catalogue references while placed price comes from OrderItem.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | Resolve cart variants by identifier | Render preview, cart, and checkout |
| Read | Read Order with items and catalogue relations | Confirmation/Admin detail |
| Write | Local cart quantity/remove/clear | Immediate Cart update |

## Components

- `ResolvedLineItem` with explicit Preview, Full Cart, Checkout, Confirmation, and Admin presentations.
- `SummaryPanel` with explicit Cart, Checkout, and Confirmation content.
- `CartPreview` uses desktop drawer/mobile bottom sheet; specific surface owns its actions.
- Avoid a universal line-item component with dozens of booleans; share leaf display pieces and calculations.

## Behaviour and presentation

- Invalid/missing/out-of-stock cart lines remain visible with a resolution message and block Checkout.
- Preview permits quantity and removal; changing size returns to Product Detail.
- Delivery is shown as confirmed after ordering unless a deterministic rule is later supplied.

## Quality

- Quantity changes announce results; remove has an accessible name including product context; subtotals use a single currency formatter; overlays preserve underlying scroll/focus.

## Decisions

- **Confirmed:** CartItem persists only variant ID and quantity.
- **Confirmed:** OrderItem avoids copied product display fields but retains placed unit price.
- **Open:** missing/deleted catalogue relation retention policy; hard-delete should normally be prevented for referenced products/variants.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
