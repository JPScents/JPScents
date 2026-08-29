# Design Foundations

## Authority

| Concern            | Source                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Behaviour          | Notion `06 — Website Structure — Internal`                                                      |
| Public UI          | [Paper — Final Site](https://app.paper.design/file/01M1176ZB9DXCTZEH57YQGHY2Q/3-0)              |
| Admin UI           | [Paper — Final Admin](https://app.paper.design/file/01M1176ZB9DXCTZEH57YQGHY2Q/2-0)             |
| Component variants | [Paper — Workspace / Exploration](https://app.paper.design/file/01M1176ZB9DXCTZEH57YQGHY2Q/1-0) |
| Implemented tokens | `foundations/01-theme-and-configuration.md` and source configuration                            |

## Reusable rules

- Quiet Scent Gallery: refined, calm, product-led, editorial, and restrained.
- Cormorant Garamond owns display hierarchy; Inter owns body, labels, controls, and operational Admin UI.
- Light-only warm ivory/white, stone, charcoal, muted green/olive, and restrained amber.
- Public content uses a 1296px desktop container with 72px gutters and 20px mobile gutters.
- Admin uses a 248px sidebar and denser 34px content padding.
- Mostly flat surfaces, hairline borders, crisp low-radius controls, little/no unnecessary shadow.
- Product imagery supplies most colour. Current imagery and generated scent assets are controlled placeholders.
- Mobile is an intentional composition: stacked product plates, compact list treatments, single-column checkout, card-based Admin orders, bottom-sheet cart.
- Every interactive control requires visible hover, focus, pressed, disabled, loading, success, error, empty, and unavailable treatment where relevant.

## Shared modal rule

Use shadcn Dialog through `ModalShell`. The shell owns accessible title/description relationships, close control, overlay, focus trap/return, Escape behaviour, scroll containment, body, footer/action placement, and responsive width. Specific variant, product-preview, and bestseller modals compose it and remain feature-owned.

## Asset rule

Do not treat placeholder bottle imagery, generated scent-character images, logo text treatments, prices, catalogue names, or operational counts as confirmed client content. Final brand assets, product photography, catalogue data, WhatsApp number, delivery areas, FAQ answers, and policy copy remain content dependencies.
