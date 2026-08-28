# Component and Variant Registry

## Shared application UI

- `ModalShell`: shadcn Dialog composition standardising heading, description, close, body, action footer, focus and responsive sizing.
- Public shell: desktop/mobile Header, mobile menu, Cart utility/badge, Footer.
- Admin shell: desktop sidebar/topbar and mobile header/menu.

## Public families

| Family | Variants |
| --- | --- |
| Product Card | Gallery Plate and Catalogue/List; desktop/mobile; available/unavailable; optional label |
| Scent Character | Browse and Select; desktop/mobile; default/selected |
| Commerce Controls | Filter chip, size option, quantity control, availability indicator, primary/secondary action |
| Cart & Order | Preview item, full-cart item, cart/checkout/confirmation summaries, invalid line |
| Form Controls | text, select, textarea, required/optional, invalid, disabled |

## Admin families

| Family | Variants |
| --- | --- |
| Admin Operations | toolbar, search/filter, perfume row, order row, mobile order card, status badge |
| Perfume Editor | create/configured state, image area, attributes, merchandising controls, preview |
| Variant Management | list, empty state, Add/Edit Variant modal |
| Bestseller Selection | current summary and single-selection modal |

Page-only editorial sections, dashboards, and composed forms stay local until proven reusable. Product Cards share a projection, not one conditional mega-component.
