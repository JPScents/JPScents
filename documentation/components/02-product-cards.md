# Product Cards

## Identity

| Field | Value |
| --- | --- |
| Type | Catalogue component family |
| Sources | Workspace `Product Cards`; Home, Perfumes, Product Detail, Help Me Choose, Product Preview |
| Access | Reused public/Admin preview presentation |
| Purpose | Present a consistent shoppable Perfume projection in gallery and catalogue contexts. |

## Data and domain

- **Entities:** Perfume with PerfumeVariants.
- **Displayed:** primary image, name, scent cue/characters, starting price, derived availability, optional Featured/Bestseller label, CTA.
- **Derived:** primary image, minimum in-stock price, overall availability from published status and variant quantity.
- **Configuration:** locale/currency formatter and placeholder image.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | Receive a reusable Perfume card projection | Parent query supplies card data |
| Write | None | Card navigates to Product Detail |

## Components

- **Reused:** `ProductCard`, product image, merchandising badge, price, availability indicator.
- **Variants:** Gallery Plate desktop/mobile; Catalogue Card desktop/mobile; recommendation result is a separate composition using the same projection.
- **Local:** homepage compact secondary rows and Help Me Choose match reason remain parent-owned compositions.
- **Duplication review:** do not create a different data mapper per page; one projection feeds explicit visual variants.

## Behaviour and presentation

- Entire meaningful card area is navigable without nesting interactive controls.
- Desktop Gallery uses large editorial plates; Catalogue is denser. Mobile may use one leading large item plus compact items where the final frame does so.
- Missing image, unavailable, loading, and long-content states must preserve layout.

## Quality

- Images require useful alt text or empty alt when decorative; price/availability cannot rely on colour alone; card links require visible focus.

## Decisions

- **Confirmed:** two intentional presentations, not one card controlled by many page flags.
- **Assumed:** unavailable published Perfumes may remain visible only where a designed unavailable state requires it; default public lists prioritise available Perfumes.
- **Open:** final product photography and confirmed catalogue copy.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
