# Admin Overview

## Identity

| Field | Value |
| --- | --- |
| Type | Protected Admin composition page |
| Sources | Final Admin Overview and Bestseller Selector desktop frames |
| Route/access | `/admin` · authenticated Admin only |
| Purpose | Surface current operational attention, recent Orders, catalogue stock issues, and Bestseller control. |

## Data and domain

- **Entities:** Order, Perfume, PerfumeVariant, OrderItem-derived counts.
- **Displayed:** Orders awaiting action, available Perfumes, zero-stock variants, Orders this week, recent Orders, current Bestseller.
- **Derived:** all metrics from existing records; no analytics store.
- **Configuration:** attention statuses, recent-order limit, store URL.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `getAdminOverview` | Return four counts, recent Orders, catalogue attention, Bestseller summary |
| Read | Search Bestseller candidates | Open/search selector |
| Write | `setBestseller` | Atomically replace current selection |

## Components

- Admin shell, metric tile, recent Order rows, catalogue attention panel, Bestseller summary, Bestseller selector modal.
- Overview-specific metric/panel composition remains local.
- Desktop-only final reference; mobile should stack the same operational sections using existing Admin card patterns without inventing analytics.

## Behaviour and presentation

- Add Perfume navigates `/admin/perfumes/new`; rows open Order Detail; attention links Perfumes; selector composes ModalShell.
- Empty store replaces counts/lists with actionable zero states.
- Metric reads may load together; selector failures do not break the page.

## Quality

- Counts have contextual labels; tables preserve semantics; modal focus is managed; no sensitive customer data appears beyond the designed recent-order summary.

## Decisions

- **Confirmed:** the four designed operational counts are justified by existing data.
- **Confirmed:** no charts, revenue dashboards, or separate analytics feature.
- **Open:** exact statuses counted as “awaiting action.”

## Approval

- [ ] Included in Freeman's consolidated foundation approval
