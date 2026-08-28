---
name: feature-structure
description: Incrementally implement or refactor a feature or page using domain ownership and focused data-layer conventions while preserving unrelated architecture.
---

# Feature Structure

Apply only the rules defined here. Already compliant means leave it unchanged; partially compliant means complete only the missing parts; outside this skill means preserve it.

## Ownership

- Keep domain code inside `features/<domain>/` until real reuse proves otherwise.
- A route/page that composes existing domains is not automatically a feature. Keep page-only presentation in `components/<page>/`.
- Organise public and Admin behaviour by domain. Admin-only UI may live in `components/admin/`; do not create a mixed feature-root `admin/` bucket.
- Do not create empty layers or duplicate files for structural symmetry.

## Feature boundary

- A feature exposes intentional external consumers through its root `index.ts`.
- Export only public components, services, functions, and types.
- External route/application code imports the feature entry point. Feature internals import concrete modules directly.
- Features do not import other features. Compose domains at the route/application boundary or move proven shared code to an appropriate shared capability.
- Remove wrappers whose only purpose is re-exporting or composition already clear at the route.

## Responsibilities

- `actions/`: delivery adapters; authenticate, parse, invoke services, and handle framework concerns. Use one exported action per file; Admin files end `.admin.action.ts`.
- `schemas/`: external-input schemas. Do not maintain parallel schema and validation implementations.
- `parsers/`: decode transport input, invoke schemas, and return typed input. Form parsers end `-form.parser.ts`.
- `validators/`: substantial pure state-aware domain validation only. Validators receive normalized input and already-loaded state; they perform no I/O.
- `repositories/`: direct database/external data access.
- `services/`: coordinate queries or mutations; do not add a parallel use-case layer.
- `mappers/`: transform persisted/external records into application projections.
- `utils/`: pure feature utilities. Avoid catch-all `helpers.ts`, `utils.ts`, or catalogue dumping grounds.
- `constants/index.ts`: immutable feature-owned values only.
- `types/index.ts`: real feature inputs, projections, serialization boundaries, or UI state—not duplicate persisted models.

## Repository and service sizing

- Start with `<feature>.repository.ts` while reads and writes remain cohesive.
- When genuinely oversized or substantially mixed, replace it with `<feature>.query.repository.ts` and `<feature>.mutation.repository.ts`.
- Never retain the catch-all repository alongside the split pair.
- Query repositories own direct reads, including reads needed by mutation services. Mutation repositories own writes.
- Keep raw query definitions with their sole consumer. Add `<feature>.queries.ts` only when definitions are genuinely shared or establish a deliberate generated-payload boundary.
- Split by data responsibility, not page, Admin/public surface, or individual use case.
- When both service responsibilities are substantial, use `<feature>.query.service.ts` and `<feature>.mutation.service.ts`; do not create one service per function.

## Components, constants, and utilities

- Give each meaningful React component a PascalCase file and name.
- Keep one-component utilities in `utils/<component-name>.utils.ts` using the lowercase kebab-case component filename.
- Keep single-consumer page copy/constants local to the owning component.
- Mappers derive ready-to-render labels, formatted values, and destination URLs where those are part of the projection.
- Move only genuinely reused scalar formatting to shared utilities.

## Shared UI

- Low-level UI primitives live in `components/ui/`.
- Proven public shared layout lives in `components/shared/public/`; proven Admin shared layout lives in `components/shared/admin/`.
- Reusable empty/error/loading primitives may live in `components/ui/states/`.
- Do not promote feature-specific behaviour.

## Refactoring

Inspect first. Preserve behaviour, styling, responsiveness, motion, public APIs, and unrelated patterns. Update imports, exports, routes, tests, and documentation made stale by the change. Remove obsolete files only after proving no responsibility or reference remains. Run relevant checks.
