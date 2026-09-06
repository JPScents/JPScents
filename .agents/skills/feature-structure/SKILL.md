---
name: feature-structure
description: Incrementally implement or refactor a feature or page using domain ownership and focused data-layer conventions while preserving unrelated architecture.
---

# Feature Structure

Apply only the rules defined here. Already compliant means leave it unchanged; partially compliant means complete only the missing parts; outside this skill means preserve it.

## Ownership

- Keep domain code inside `features/<domain>/` until real reuse proves otherwise.
- A route/page that composes existing domains is not automatically a feature. Keep route-only presentation and interactions beside the owning route in `_components/` and `_hooks/`; use `_types/` only when separate route-local contracts improve clarity. Keep domain-owned equivalents in the feature's `components/`, `hooks/`, and `types.ts` (or `types/` when substantial).
- Organise public and Admin behaviour by domain. Admin-only UI may live in `components/admin/`; do not create a mixed feature-root `admin/` bucket.
- Do not create empty layers or duplicate files for structural symmetry.

## Feature boundary

- A feature exposes intentional external consumers through its root `index.ts`.
- Export only public components, services, functions, and types.
- External route/application code imports the feature entry point. Feature internals import concrete modules directly.
- Prefer composing independent domains at the route/application boundary. A feature may depend on another domain through its intentional public API when ownership requires it (for example, cart reads published variants from catalogue). Keep dependencies one-way; never import another feature’s repositories, services, or other internals, and never create cycles. Do not move domain code into shared folders merely to avoid a justified dependency.
- Remove wrappers whose only purpose is re-exporting or composition already clear at the route.

## Responsibilities

- `actions/`: server entry points; authenticate where required, validate runtime input, and handle framework concerns. Keep a simple cohesive operation directly in its action; invoke a service when orchestration complexity or reuse justifies one. Use one exported action per file; Admin files end `.admin.action.ts`.
- `schemas/`: external-input schemas. Do not maintain parallel schema and validation implementations.
- `parsers/`: decode transport input, invoke schemas, and return typed input. Form parsers end `-form.parser.ts`.
- `validators/`: substantial pure state-aware domain validation only. Validators receive normalized input and already-loaded state; they perform no I/O.
- `repositories/`: direct database/external data access.
- `services/`: coordinate queries or mutations; do not add a parallel use-case layer.
- `mappers/`: transform persisted/external records into application projections.
- `utils/`: pure feature utilities. Avoid catch-all `helpers.ts`, `utils.ts`, or catalogue dumping grounds.
- `constants/index.ts`: immutable feature-owned values only.
- `types.ts` (or `types/` when substantial): real feature inputs, projections, serialization boundaries, or UI state—not duplicate persisted models.

## Repository and service sizing

- Layers are optional, not a feature template. Frontend features can consist of components, hooks, types, storage, and a server action. Add services, repositories, parsers, or mappers only when they clarify substantial responsibility or support real reuse; inline single-use pass-through layers.
- Database access belongs to the domain that owns the records. Extend its existing cohesive data module first; introduce a repository only when refactoring that domain warrants it. For example, published variant lookup belongs to catalogue, not cart.

- Start with `<feature>.repository.ts` while reads and writes remain cohesive.
- When genuinely oversized or substantially mixed, replace it with `<feature>.query.repository.ts` and `<feature>.mutation.repository.ts`.
- Never retain the catch-all repository alongside the split pair.
- Query repositories own direct reads, including reads needed by mutation services. Mutation repositories own writes.
- Keep raw query definitions with their sole consumer. Add `<feature>.queries.ts` only when definitions are genuinely shared or establish a deliberate generated-payload boundary.
- Split by data responsibility, not page, Admin/public surface, or individual use case.
- When both service responsibilities are substantial, use `<feature>.query.service.ts` and `<feature>.mutation.service.ts`; do not create one service per function.

## Components, constants, and utilities

- Give each meaningful React component a PascalCase file and name.
- Components own rendering, accessibility, styling, and presentation-specific behaviour such as motion preferences. Extract cohesive stateful interactions into named `use*.ts` hooks when this clarifies ownership; a single consumer is sufficient, but not every component needs a hook.
- Hooks own interaction state, derived behaviour, and handlers. Expose intent-based actions instead of raw setters when the actions enforce interaction rules. Keep pure transformations in ordinary functions or existing mappers rather than turning them into hooks.
- Reuse existing application types with type-only imports and indexed access where appropriate (for example, `PublicPerfumeDetail["variants"]`). Keep small props types beside their component and infer hook return types; separate types only for substantial or shared contracts, without duplicating the source model or adding empty folders.
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
