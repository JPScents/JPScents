# JPScents product extraction

This directory is the single source of truth for product extraction, architecture, data contracts, design foundations, implementation rules, and cumulative registries produced before implementation.

## Workflow

The complete extraction pass follows these rules:

- analyze the definitive Paper frames and relevant source material;
- treat desktop, mobile, overlays, modals, and empty/error states as one logical unit;
- record confirmed facts, assumptions, and material open decisions separately;
- save the approved artifact using `templates/extraction.md`;
- update the cumulative registries;
- do not create implementation milestones until Freeman approves the consolidated foundation.

Desktop, mobile, and closely related UI states are reviewed as one logical unit. A design state does not become a route unless the product requires a distinct URL.

Implementation tasks and milestones are created only after the extraction pass is complete and the combined system shape is clear.

## Extracted system summary

- **Features:** `catalogue`, `cart`, and `orders` only. Checkout belongs to Orders; Homepage and Admin Overview are route compositions.
- **Public routes:** `/`, `/perfumes`, `/perfume/{slug}`, `/cart`, `/checkout`, `/checkout/confirm`, and `/help-me-choose`.
- **Admin routes:** `/admin`, Perfume list/create/edit, and Order list/detail. Authentication routing remains provider-dependent.
- **Persisted domain:** Perfume, PerfumeVariant, Order, OrderItem, and OrderStatusEvent. Cart remains client-side.
- **Shared UI:** public/Admin shells and a small `ModalShell`; feature-specific components stay with their owning feature.
- **Implementation gate:** the two remaining unchecked checklist items are consolidated approval and milestone authoring after approval. `Run Active Milestone` then executes an authored active contract.

## Structure

- `system` — workflow, architecture, data contracts, and durable design rules
- `system/deployment-and-operations.md` — release checks and the local/Supabase/Vercel handover runbook
- `foundations` — implemented application-wide foundations
- `components` — reusable component-family extraction references
- `pages/public` — public page and flow extraction references
- `pages/admin` — protected Admin page and flow extraction references
- `registries` — consolidated routes, models, operations, components, states, quality rules, content, and decisions
- `templates` — the required extraction format

## Status labels

- `Confirmed` — directly supported by an approved decision or definitive design/source
- `Assumed` — working choice that is safe for current planning but still needs confirmation
- `Open` — unresolved and capable of changing implementation

## Approval boundary

The complete extraction may be produced in one pass. Freeman's approval applies to the consolidated foundation rather than requiring approval after each file. Only after that approval may `Run Active Milestone` be used to author and execute implementation milestones.

The approved implementation sequence and ownership model live in `system/implementation-roadmap.md`.
