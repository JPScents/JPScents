# Perfume Detail and Cart Preview

## Identity

| Field | Value |
| --- | --- |
| Type | Public Catalogue page with Cart UI state |
| Sources | Final Site Product Detail desktop/mobile and Cart drawer/bottom-sheet variants |
| Route/access | `/perfume/{slug}` · public; cart preview is UI-only |
| Purpose | Explain one Perfume, select an exact variant/quantity, and add it without leaving the page. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant, Cart/CartItem.
- **Displayed:** image, merchandising label, cue/description, enum attributes, variant price/quantity availability, related Perfumes, resolved Cart.
- **Entered:** selected variant and quantity.
- **Derived:** starting/selected price, availability, maximum quantity, deterministic related products.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `getPerfumeBySlug` | Public Perfume with variants |
| Read | `getRelatedPerfumes` | Small available set sharing attributes, excluding current Perfume |
| Read | Resolve current cart variants | Populate preview |
| Write | Local `addCartItem` / update / remove | Merge same variant and open preview |

## Components

- Public shell, Product Gallery, SizeOption, QuantityStepper, Add to Cart, scent-profile rows/disclosures, Gallery Product Cards, Cart Preview.
- Desktop cart preview is a right drawer; mobile is a rounded bottom sheet; both compose the same resolved cart operations.
- Purchase composition and profile content remain page-local.

## Behaviour and presentation

- Multiple variants require selection; zero-quantity variants are disabled; quantity cannot exceed stock.
- Add to Cart opens preview and preserves underlying route/scroll.
- Preview supports close/continue, Checkout, Full Cart, quantity changes, removal.
- Missing/unpublished slug returns not-found; stock changes surface clearly rather than silently adding invalid quantity.

## Quality

- Variant selection uses radio semantics; quantity changes are announced; overlay traps/returns focus and supports Escape; underlying content is inert while open.

## Decisions

- **Confirmed:** no navigation after Add to Cart.
- **Confirmed:** related Perfumes reuse Gallery Product Cards.
- **Assumed:** a single available variant may preselect; multiple variants do not.
- **Open:** final image-gallery count and mobile sticky purchase behaviour.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
