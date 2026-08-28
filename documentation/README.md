# JPScents product extraction

This directory is the source of truth for the lightweight planning artifacts produced before implementation.

## Workflow

For each logical product area:

- analyze the definitive Paper frames and relevant source material;
- present a concise extraction for review;
- revise until approved;
- save the approved artifact using `templates/extraction.md`;
- update only the affected cumulative registries;
- move to the next area.

Desktop, mobile, and closely related UI states are reviewed as one logical unit. A design state does not become a route unless the product requires a distinct URL.

Implementation tasks and milestones are created only after the extraction pass is complete and the combined system shape is clear.

## Structure

- `foundations` — approved application-wide foundations
- `extractions` — approved page, state, component-family, and admin-area extractions
- `registries` — cumulative facts discovered across extractions
- `templates` — the required extraction format

## Status labels

- `Confirmed` — directly supported by an approved decision or definitive design/source
- `Assumed` — working choice that is safe for current planning but still needs confirmation
- `Open` — unresolved and capable of changing implementation
