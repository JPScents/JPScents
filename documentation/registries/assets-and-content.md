# Asset and Content Registry

## Available controlled placeholders

- `.design-imports/scent-fresh-natural.png`
- `.design-imports/scent-warm-natural.png`
- `.design-imports/scent-sweet-natural.png`
- `.design-imports/scent-woody-natural.png`
- `public/perfume-placeholders/santal-veil.svg`
- `public/perfume-placeholders/amber-no-7.svg`
- `public/perfume-placeholders/citrus-linen.svg`

These are design assets or controlled placeholders, not confirmed client photography. The bundled bottle artwork is used only by the opt-in local demo catalogue so design review can match the Paper reference.

## Client-dependent content

- final logo and brand files;
- final product photography and image rights;
- complete perfume names, descriptions, scent cues, variants, prices, and quantities;
- recommendation enum selections;
- Featured/Bestseller choices;
- FAQ, delivery, ordering, and reassurance copy;
- business WhatsApp number and approved handoff wording.

## Rules

- Store ordered image references and alt text on Perfume; do not copy them into CartItem or OrderItem.
- Keep placeholder status explicit in demo fixtures and review environments; normal resets and production start empty.
- Product images follow the Paper crop/aspect-ratio conventions; Admin preview should use the same public projection.
- Content strings that are genuinely operational/configurable belong in typed configuration or data, not scattered through components.
