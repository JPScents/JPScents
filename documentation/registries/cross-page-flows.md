# Cross-page Flow Registry

## Customer purchase

`Home / Perfumes / Help Me Choose → Perfume Detail → choose size → Add to Cart → drawer/sheet → Cart or Checkout → create saved Order → /checkout/confirm → WhatsApp`

- Add to Cart does not navigate.
- Cart may contain multiple Perfumes, variants, and quantities.
- Cart resolves current catalogue truth and does not reserve stock.
- Checkout belongs to Orders and creates the saved Order/reference before WhatsApp opens.
- Failed creation leaves Cart and recoverable form state intact.

## Discovery

- Home Featured/Bestseller, product cards, and scent-character links lead into catalogue/detail.
- Perfumes filters refine published products and can expose a route-backed scent filter.
- Help Me Choose deterministically ranks available Perfumes from maintained enums, then leads to detail.
- Product Detail recommendations reuse Gallery Plate cards.

## Catalogue administration

`Admin Perfumes → Create/Edit Perfume → images + enums + variants + merchandising → preview → save/publish`

Variant quantity drives availability. Bestseller selection is a focused single-selection operation, not a separate page.

## Order operations

`Admin Overview / Orders → Order Detail → inspect customer, delivery, lines and activity → update status / continue on WhatsApp`

Overview remains operational: recent Orders, items requiring attention, catalogue availability, and current Bestseller only.
