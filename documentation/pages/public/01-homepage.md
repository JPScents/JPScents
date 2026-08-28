# Homepage

## Identity

| Field | Value |
| --- | --- |
| Type | Public page |
| Sources | Final Site `Homepage · Desktop` and `Homepage · Mobile`; Notion Home structure |
| Route/access | `/` · public |
| Purpose | Lead with a real shoppable Perfume, offer curated browsing/guidance, and explain the Order-first flow. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant; configuration content.
- **Displayed:** hero Perfume, three featured available Perfumes, scent characters, guidance preview, ordering steps, FAQs.
- **Derived:** hero fallback order: eligible Bestseller → Featured → suitable available Perfume; starting prices and availability.
- **Configuration:** hero/fallback limits, FAQ/ordering copy, scent-character configuration.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `getFeaturedPerfumes` | Return hero selection plus small featured available list |
| Write | None | All actions navigate to Catalogue/Product/Help routes |

## Components

- **Reused:** public shell, Gallery Product Card, Scent Character Browse, ordering step, FAQ disclosure, buttons.
- **Local:** hero composition, Help Me Choose preview, closing CTA.
- **Responsive:** desktop uses asymmetric hero and three-column plates; mobile stacks hero, uses one prominent product plus compact rows, two-column scent tiles, and linear steps.

## Behaviour and presentation

- Product imagery/name/CTA link to `/perfume/{slug}`; browse links `/perfumes`; guidance links `/help-me-choose`.
- Missing merchandising selection falls back gracefully; empty catalogue shows guidance rather than broken hero.
- FAQ answers must come from confirmed client policy, not placeholder copy.

## Quality

- Hero and product links require accessible names; FAQ uses disclosure semantics; large images reserve dimensions; no placeholder facts ship as production content.

## Decisions

- **Confirmed:** homepage is route composition, not a feature.
- **Confirmed:** query name is `getFeaturedPerfumes`.
- **Open:** final FAQ answers, logo, imagery, and whether Browse by Scent remains worthwhile at real catalogue size.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
