# State-transition Registry

| Concern            | Transition                                                | Rule                                                                           |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Perfume            | Draft ↔ Published                                         | Publication requires valid content, images, and at least one orderable variant |
| Variant            | quantity `> 0` ↔ `0`                                      | Availability is derived; no persisted availability boolean                     |
| Cart line          | absent → present → changed/removed                        | Same variant merges; no stock reservation                                      |
| Cart line validity | valid ↔ changed/unavailable                               | Re-resolve against current catalogue; block Checkout until repaired/removed    |
| Checkout           | editing → submitting → created/failed                     | Prevent duplicate submission; preserve recoverable input on failure            |
| Order              | creation → `AWAITING_PAYMENT`                             | Initial status event is created with the Order                                 |
| Order              | status change → `AWAITING_PAYMENT` / `PAID` / `DELIVERED` | Every update creates an OrderStatusEvent; no transition matrix is enforced yet |
| Order              | non-cancelled status → `CANCELLED`                        | Cancellation is a dedicated action; generic status editing cannot cancel       |
| Cancellation stock | uncancelled → restored                                    | Transaction claims `stockRestoredAt` before incrementing each Variant once     |
| Confirmation       | created → Cart cleared → WhatsApp handoff                 | Clear only after server-confirmed creation                                     |
| Help Me Choose     | preferences → results → adjust                            | Same route; available deterministic matches only                               |

Cancelled Orders remain in history with their items and status activity; they are not deleted.
