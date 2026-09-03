# Mutation and Write Registry

Names describe cohesive operations, not endpoints.

## Client-only Cart writes

- add/merge a variant quantity;
- change a line quantity within the currently resolved limit;
- remove a line;
- clear Cart only after confirmed Order creation.

## Order writes

- `createOrder` — idempotently validate Cart, find or create/update the Customer, create Order/items/status event, and decrement variant quantities atomically.
- `updateOrderStatus` — protected status change plus activity event.
- `cancelOrder` — atomically mark an Order `CANCELLED`, restore each ordered Variant quantity once, record the activity event, and retain history.

## Customer Admin writes

- `saveCustomer` — create or update current customer contact and delivery details while preserving unique identifiers.
- `removeCustomer` — delete only a Customer with no Order history.

## Catalogue Admin writes

- create/update a Perfume, including publication and enum arrays;
- upload, order, replace, or remove Perfume images;
- add/update/remove a PerfumeVariant;
- set or clear the single Bestseller Perfume.

Featured status can remain part of the Perfume update. Separate mutation files are not required unless implementation boundaries justify them.
