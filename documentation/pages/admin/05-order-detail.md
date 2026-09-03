# Admin Order Detail

## Identity

| Field        | Value                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Type         | Protected Orders detail page                                                                                  |
| Sources      | Final Admin Order Detail desktop/mobile                                                                       |
| Route/access | `/admin/orders/{reference}` · authenticated Admin only                                                        |
| Purpose      | Review one saved Order, update its operational status, view activity, and continue the WhatsApp conversation. |

## Data and domain

- **Entities:** Customer, Order, OrderItem, OrderStatusEvent, related PerfumeVariant/Perfume.
- **Displayed:** items, placed unit prices, subtotal, customer/delivery details, note, status, activity.
- **Entered:** next Order status.
- **Derived:** resolved catalogue display fields, line totals, WhatsApp conversation URL/message.

## Operations

| Kind  | Requirement           | Trigger/result                                         |
| ----- | --------------------- | ------------------------------------------------------ |
| Read  | `getOrderByReference` | Authorized detail projection with items/events         |
| Write | `updateOrderStatus`   | Validate transition and create status event atomically |
| Write | `cancelOrder`         | Retain Order history and restore item quantities once  |

## Components

- Admin shell, Order item list, customer/delivery panels, status form, activity timeline, WhatsApp handoff panel.
- Desktop uses main-detail plus operational side column; mobile stacks all sections and preserves the same actions.

## Behaviour and presentation

- Status save gives explicit success/failure and avoids duplicate history entries when unchanged.
- WhatsApp action includes reference and resolves the customer number safely.
- Missing/deleted catalogue relations use a neutral unavailable label; Order amounts remain accurate through placed price.
- Cancellation is explicitly confirmed, retains the Order/activity history, and restores each item quantity exactly once.

## Quality

- Full customer data is protected from unauthorized/cache exposure; phone links are normalized; status transitions are server-authorized; activity uses semantic ordered history.

## Decisions

- **Confirmed:** OrderItem references Order and Variant; no copied product display fields.
- **Confirmed:** status events are narrowly scoped to the designed activity history.
- **Open:** valid non-cancellation status transition matrix and whether a completed/fulfilled status is required beyond the four designed states.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
