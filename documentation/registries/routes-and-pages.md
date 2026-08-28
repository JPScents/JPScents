# Route and Page Registry

## Public routes

| Route | Page | Ownership | Status |
| --- | --- | --- | --- |
| `/` | Homepage | route composition | Confirmed |
| `/perfumes` | Perfumes catalogue | catalogue | Confirmed |
| `/perfume/{slug}` | Perfume detail | catalogue + cart interaction | Confirmed |
| `/cart` | Full Cart | cart | Confirmed |
| `/checkout` | Checkout | orders | Confirmed |
| `/checkout/confirm` | Order Confirmation | orders | Confirmed |
| `/help-me-choose` | Preferences and results | catalogue | Confirmed; one route |

Help Me Choose results use route state/search parameters on `/help-me-choose`; there is no separate results page.

## Protected Admin routes

| Route | Page | Ownership | Status |
| --- | --- | --- | --- |
| `/admin` | Overview | route composition | Confirmed |
| `/admin/perfumes` | Perfume list | catalogue | Confirmed |
| `/admin/perfumes/new` | Create Perfume | catalogue | Confirmed |
| `/admin/perfumes/{id}` | Edit Perfume | catalogue | Confirmed |
| `/admin/orders` | Order list | orders | Confirmed |
| `/admin/orders/{reference}` | Order Detail | orders | Confirmed |

## Authentication routes

| Route | Purpose | Access | Status |
| --- | --- | --- | --- |
| `/admin/login` | Request the trusted Admin magic link | Public; exact-email allowlist enforced server-side | Confirmed |
| `/auth/confirm` | Exchange/verify the one-time link and establish the Admin session | Public callback; redirects immediately | Confirmed |

The callback always lands on `/admin` after verifying both the exact trusted email and `app_metadata.role=admin`. It is not a page and accepts no caller-controlled destination.

## UI-only states

- desktop cart drawer and mobile cart bottom sheet;
- mobile public/Admin navigation menus;
- Perfumes no-results and Cart empty states;
- Help Me Choose results and no-match states;
- Add/Edit Variant, Product Preview, and Bestseller Selection modals;
- unavailable/disabled, validation, loading, and submission feedback states.

These states do not receive routes unless a later requirement proves a direct-link need.
