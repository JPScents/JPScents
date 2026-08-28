# Admin Orders

## Identity

| Field | Value |
| --- | --- |
| Type | Protected Orders list page |
| Sources | Final Admin Orders desktop/mobile; Workspace Admin Operations |
| Route/access | `/admin/orders` · authenticated Admin only |
| Purpose | Find placed Orders quickly by reference/customer and status. |

## Data and domain

- **Entities:** Order and OrderItems.
- **Displayed:** reference, customer/phone, placed time, item count, subtotal, status.
- **Entered:** search and status filter.
- **Derived:** item count and formatted time/money.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `listOrders(filters)` | Search reference/name/phone and filter status |
| Read | `exportOrders(filters)` | Download the current operational result when retained |
| Write | None | Rows/cards navigate to detail |

## Components

- Admin shell, search/filter toolbar, desktop Order table rows, mobile Order cards, status badge, empty/no-results/error state.
- Desktop uses fixed lanes; mobile uses cards rather than a compressed table.

## Behaviour and presentation

- Open navigates `/admin/orders/{reference}`.
- Status choices reflect only the approved enum; unknown search/filter state is normalized.
- A genuine empty Order list explains that Orders appear after customer checkout; filtered no-results offers Clear Filters.
- Export, if implemented, exports only authorized fields and current filters; it is not a reporting subsystem.

## Quality

- Customer data is visible only to authenticated Admins; search is not logged with sensitive values; export uses safe content disposition and authorization.

## Decisions

- **Confirmed:** mobile list is supported by a definitive frame.
- **Assumed:** list ordering is newest first.
- **Open:** retain or remove Export Orders—the frame includes it, but product authority does not require it.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
