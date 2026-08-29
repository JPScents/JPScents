# Commerce Controls

## Identity

| Field   | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Type    | Catalogue/Cart component family                                                           |
| Sources | Workspace `Commerce Controls`; Perfumes; Product Detail; Cart frames                      |
| Access  | Public interactive controls                                                               |
| Purpose | Standardize filtering, variant selection, quantities, availability, and commerce actions. |

## Data and domain

- **Entities:** PerfumeVariant, CartItem.
- **Displayed:** filter state, size/unit, price, quantity, stock-derived availability.
- **Entered:** selected filters, variant, and requested quantity.
- **Derived:** available when parent is published and variant quantity is greater than zero; quantity maximum equals current stock.

## Operations

| Kind  | Requirement                            | Trigger/result              |
| ----- | -------------------------------------- | --------------------------- |
| Read  | Read variants and filter configuration | Render valid choices        |
| Write | Update URL search parameters           | Catalogue filter selection  |
| Write | Update local selection/Cart            | Size, quantity, Add to Cart |

## Components

- `FilterChip`, `SizeOption`, `QuantityStepper`, `AvailabilityIndicator`, `CommerceButton`.
- States: default, active, selected, unavailable, disabled, loading, maximum reached, validation error.
- Keep catalogue filtering and product variant selection as separate components even if their selected styling is related.

## Behaviour and presentation

- Size is required where multiple variants exist; unavailable/zero-quantity variants cannot be selected.
- Quantity starts at one, cannot fall below one, and cannot exceed stock.
- Catalogue filters use search parameters for shareability and back/forward behaviour.
- Add to Cart remains on the current route and opens the responsive cart preview.

## Quality

- Controls require programmatic selected/disabled states, keyboard operation, visible focus, live feedback for quantity limits, and non-colour availability messaging.

## Decisions

- **Confirmed:** `quantity`, not `isAvailable`, is persisted on PerfumeVariant.
- **Confirmed:** only scent-character chips are required initially; do not build a generic filter engine.
- **Open:** whether single-variant products preselect automatically.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
