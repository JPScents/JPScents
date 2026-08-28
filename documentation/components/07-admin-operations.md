# Admin Operations

## Identity

| Field | Value |
| --- | --- |
| Type | Admin component family |
| Sources | Workspace `Admin Operations`; Admin Overview, Perfumes, Orders |
| Access | Protected Admin |
| Purpose | Provide dense, calm operational lists, filters, status indicators, and responsive row/card patterns. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant, Order.
- **Displayed:** operational projections only: counts, status, dates, customer summary, stock totals, merchandising flags.
- **Derived:** available-variant count, total quantity, item count, attention counts.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | Search/filter Admin projections | URL or local filter state updates list |
| Write | None at row level | Rows navigate to detail/editor |

## Components

- Admin toolbar/topbar, search field, filter controls, fixed-lane desktop rows, order status badge, mobile order card.
- Perfume rows and Order rows are separate domain components sharing only table/card primitives.
- Table-to-card responsive transformation is explicit; do not horizontally squeeze desktop tables.

## Behaviour and presentation

- Search is debounced only if server reads require it; otherwise keep direct and simple.
- Rows/actions are keyboard accessible and status is text-labelled.
- Loading, empty, no-result, and failed-read states preserve operational actions.

## Quality

- Use proper table semantics on desktop; cards use headings/definition relationships on mobile; dates and money are consistently formatted.

## Decisions

- **Confirmed:** Admin is operational, not analytics software.
- **Confirmed:** fixed lanes prevent row misalignment.
- **Open:** pagination threshold after real catalogue/order volume is known.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
