# Perfumes Catalogue

## Identity

| Field | Value |
| --- | --- |
| Type | Public Catalogue page |
| Sources | Final Site `Perfumes` desktop/mobile and `Perfumes No Results` |
| Route/access | `/perfumes` · public |
| Purpose | Show published Perfumes and let customers narrow available options simply. |

## Data and domain

- **Entities:** Perfume and PerfumeVariant.
- **Displayed:** card projection, active scent-character filter, result count, reassurance copy.
- **Entered:** scent-character filter.
- **Derived:** availability, starting price, filtered count.
- **Configuration:** enum labels and catalogue reassurance content.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `listPerfumes({ scentCharacter })` | Published catalogue projection filtered by optional enum |
| Write | Update search parameters | `/perfumes?scent=<enum>`; clear removes parameter |

## Components

- Public shell, Catalogue Product Card, FilterChip, no-results state.
- Catalogue introduction/reassurance remain local.
- Desktop uses three-column dense cards; mobile uses a vertical catalogue presentation and compact More filter if needed.

## Behaviour and presentation

- Default shows all published Perfumes; available Perfumes lead.
- A genuinely empty catalogue shows a client-content preparation state without misleading recovery actions.
- A filtered no-result state preserves filters and offers Clear Filters and Find My Scent.
- Unknown filter values are ignored or normalized safely.

## Quality

- Search parameters have canonical enum parsing; filter state is announced; loading does not shift the grid; no-results heading receives focus after a user-driven filter change where appropriate.

## Decisions

- **Confirmed:** only scent-character filtering is required initially.
- **Confirmed:** filters are route-backed search parameters, not separate pages.
- **Open:** whether unavailable Perfumes appear after available products or are excluded entirely.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
