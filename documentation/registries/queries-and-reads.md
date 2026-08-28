# Query and Read Registry

Names describe feature operations, not API contracts or required files.

## Catalogue

- `getFeaturedPerfumes` — homepage Bestseller/Featured merchandising and available product set.
- `listPerfumes` — published catalogue with scent and availability filters.
- `getPerfumeBySlug` — detail, variants, attributes, and publication state.
- `getRelatedPerfumes` — small available recommendation set excluding the current Perfume.
- `recommendPerfumes` — deterministic ranking from enum preferences and availability.
- `resolveCartItems` — current perfume/variant display data, price, quantity, and validity for identifiers in Cart.
- `listAdminPerfumes` — Admin search/filter list with stock and merchandising summary.
- `getAdminPerfume` — complete editor data by internal identifier.
- `searchBestsellerCandidates` — eligible published/in-stock Perfumes.

## Orders

- `getOrderConfirmation` — confirmation-safe Order view accessed with an unguessable token.
- `listOrders` — Admin search/filter list.
- `getOrderByReference` — protected operational Order detail and activity.
- `getAdminOverview` — operational counts, recent Orders, catalogue attention, and current Bestseller.

Admin-session resolution is an infrastructure read whose exact shape depends on the chosen authentication provider. Export Orders remains an open requirement rather than a confirmed query.
