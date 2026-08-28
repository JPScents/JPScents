# Admin Perfumes

## Identity

| Field | Value |
| --- | --- |
| Type | Protected Catalogue Admin page |
| Sources | Final Admin `Perfumes · Desktop`; Workspace Admin Operations |
| Route/access | `/admin/perfumes` · authenticated Admin only |
| Purpose | Search and review catalogue readiness, stock, and homepage merchandising before editing. |

## Data and domain

- **Entities:** Perfume and PerfumeVariant.
- **Displayed:** image, name, enum summary, variant count, available-variant count, Featured/Bestseller flags.
- **Entered:** search, availability filter, homepage placement filter.
- **Derived:** available variants from quantity; overall availability; merchandising summary.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `listAdminPerfumes(filters)` | Operational catalogue projection |
| Write | None | Create/edit navigation only |

## Components

- Admin shell, Admin filters, Perfume table rows, status/placement badges, empty/no-results state.
- Desktop final uses fixed-lane table; mobile treatment is not designed and should use readable cards only if Admin Perfume mobile support is required.

## Behaviour and presentation

- Add Perfume navigates `/admin/perfumes/new`; Edit navigates stable-ID route.
- Search matches name; availability derives from stock; homepage filter covers Featured/Bestseller.
- Filtered no-results preserves filters and offers clear/reset; a genuine empty catalogue offers Add Perfume.

## Quality

- Search/filter state has labels, table headers are semantic, and destructive actions are absent from the list to prevent accidental removal.

## Decisions

- **Confirmed:** list is operational and read-only apart from navigation.
- **Confirmed:** quantity drives availability summary.
- **Open:** whether this Admin page must be fully supported on mobile; no definitive frame exists.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
