# Theme, design foundations, assets, and configuration

## Status

Implemented as the shared project foundation. No product routes, page sections, or features were created.

## Code ownership

| Concern                       | Location                 | Decision                                             |
| ----------------------------- | ------------------------ | ---------------------------------------------------- |
| Global semantic tokens        | `src/app/globals.css`    | Paper values mapped to Tailwind and shadcn variables |
| Fonts                         | `src/lib/fonts.ts`       | Cormorant Garamond display; Inter UI/body            |
| Application shell             | `src/app/layout.tsx`     | Font variables, language, base metadata, global CSS  |
| Site identity and route names | `src/config/site.ts`     | Typed non-secret configuration only                  |
| Commerce constants            | `src/config/commerce.ts` | Typed current-phase defaults only                    |
| shadcn integration            | `components.json`        | Radix-based, RSC-compatible, CSS variables enabled   |
| Shared class composition      | `src/lib/utils.ts`       | shadcn-compatible `cn` utility                       |

No global React provider exists yet. A provider will be introduced only when a real shared runtime concern—such as cart state—requires it.

## Confirmed design foundations

- Quiet Scent Gallery is a light, calm, product-led visual system.
- Cormorant Garamond is the display face; Inter is the UI/body face.
- Public surfaces use warm ivory, warm white, stone, charcoal, muted green, olive, and restrained amber.
- Admin reuses the same foundation with a denser layout and dark charcoal sidebar.
- Surfaces are mostly flat, with hairline borders, crisp geometry, and no default shadow system.
- Default controls have square corners; the mobile cart sheet is the intentional rounded exception.
- Public reference width is 1440px with a 1296px content container, 72px desktop gutters, and 20px mobile gutters.
- Admin foundation uses a 248px sidebar and 34px main-content padding.

## Implemented token groups

- Public canvas, surface, stone, green surface, text, olive, amber, and borders
- Admin canvas, surface, sidebar, action, and border colors
- Confirmed and attention order statuses
- Mobile and modal overlays
- Public container and gutters
- Admin sidebar and content dimensions
- Desktop/mobile header heights
- Sheet radius

Amber is decorative/accent use only at its current value; it does not have sufficient contrast for essential normal-sized text on the primary light surfaces.

## Configuration

| Value                  | Current setting                                                  | Status                          |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------- |
| Brand name             | JPScents                                                         | Confirmed                       |
| Public locale          | `en-NG`                                                          | Assumed                         |
| Currency               | `NGN`                                                            | Assumed                         |
| Size unit              | `mL`                                                             | Assumed                         |
| Payment mode           | Manual                                                           | Confirmed                       |
| WhatsApp handoff       | After saved order                                                | Confirmed                       |
| Order reference        | `JP-` plus at least four digits                                  | Assumed                         |
| Home path              | `/`                                                              | Confirmed                       |
| Catalogue path         | `/perfumes`                                                      | Confirmed                       |
| Product path           | `/perfume/{slug}`                                                | Confirmed                       |
| Cart path              | `/cart`                                                          | Confirmed                       |
| Checkout path          | `/checkout`                                                      | Confirmed                       |
| Confirmation path      | `/checkout/confirm`                                              | Confirmed                       |
| Help Me Choose path    | `/help-me-choose`                                                | Confirmed                       |
| Help Me Choose results | State/search parameters on `/help-me-choose`                     | Confirmed; not a separate route |
| Admin overview         | `/admin`                                                         | Confirmed                       |
| Admin perfumes         | `/admin/perfumes`, `/admin/perfumes/new`, `/admin/perfumes/{id}` | Confirmed                       |
| Admin orders           | `/admin/orders`, `/admin/orders/{reference}`                     | Confirmed                       |

Route values are configuration references only; the routes do not exist yet.

## Asset boundaries

- The four generated scent-character images are controlled placeholders available in the project-level `.design-imports` directory.
- Current bottle imagery and generated design assets are not client-confirmed product photography.
- Final logo, brand files, product photography, and complete catalogue content remain client dependencies.
- Placeholder assets are not copied into the application until their owning component or page is approved for implementation.

## Open decisions

- Confirm locale, currency formatting, and whether prices always display without decimals.
- Confirm the final order-reference format and collision strategy before the Orders milestone.
- Resolve the homepage header-height discrepancy when the navigation shell is extracted.
- Confirm final logo/brand assets and product photography before production content work.
- Define error/destructive colors from real designed states; the current destructive color is a provisional accessible foundation value.
