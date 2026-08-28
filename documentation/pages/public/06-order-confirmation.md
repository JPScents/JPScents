# Order Confirmation

## Identity

| Field | Value |
| --- | --- |
| Type | Public Orders page |
| Sources | Final Site Order Confirm desktop/mobile; Notion confirmation behaviour |
| Route/access | `/checkout/confirm` · public only with secure confirmation access |
| Purpose | Confirm the saved Order/reference and continue payment/fulfilment on WhatsApp. |

## Data and domain

- **Entities:** Order, OrderItem, related PerfumeVariant/Perfume.
- **Displayed:** reference, resolved lines, placed unit amounts, subtotal, next steps.
- **Derived:** WhatsApp message/URL, line totals, item count.
- **Configuration:** WhatsApp destination/template, reference label, continue-browsing route.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `getOrderConfirmation(confirmationToken)` | Return only the newly created Order projection |
| Write | None | Copy reference and WhatsApp launch are client actions |

## Components

- Public shell, success state, Order Reference card, Confirmation Summary, next steps, WhatsApp action.
- Desktop uses success/reference hero plus summary/steps columns; mobile stacks reference, WhatsApp, summary, and steps.

## Behaviour and presentation

- Refresh/direct access works while valid confirmation access is retained.
- Reference alone never authorizes private Order details.
- WhatsApp opens only after Order exists and includes the reference; failure to send WhatsApp does not remove Order.
- Missing/invalid access shows a privacy-safe recovery state with Browse/Cart navigation.

## Quality

- Copy action reports success/failure; external launch is labelled; private customer/delivery details are intentionally omitted from the public confirmation view unless required.

## Decisions

- **Confirmed:** Cart clears after successful Order creation, before this page renders.
- **Confirmed:** continuation path is `/perfumes`.
- **Assumed:** secure token is stored in a short-lived HttpOnly cookie/session rather than a query parameter.
- **Open:** confirmation-access lifetime and recovery/support process.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
