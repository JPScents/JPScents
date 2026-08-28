# Mutation and Write Registry

Names describe cohesive operations, not endpoints.

## Client-only Cart writes

- add/merge a variant quantity;
- change a line quantity within the currently resolved limit;
- remove a line;
- clear Cart only after confirmed Order creation.

## Order writes

- `createOrder` — idempotently validate Cart, create Order/items/status event, and decrement variant quantities atomically.
- `updateOrderStatus` — protected status change plus activity event.

## Catalogue Admin writes

- create/update a Perfume, including publication and enum arrays;
- upload, order, replace, or remove Perfume images;
- add/update/remove a PerfumeVariant;
- set or clear the single Bestseller Perfume.

Featured status can remain part of the Perfume update. Separate mutation files are not required unless implementation boundaries justify them.
