---
name: feature-structure
description: Implement or refactor Next.js features, route-local UI, and shared code using current domain ownership, clear runtime boundaries, and only justified layers.
---

# Feature Structure

Read the project's instructions and README for paths, framework versions, commands, and business constraints. These rules define decisions, not a folder template. Keep compliant code and unrelated architecture unchanged.

## Ownership and locality

- Routes own framework concerns and page composition. Keep page-only components, hooks, and substantial contracts beside the route in `_components/`, `_hooks/`, and, when useful, `_types/`.
- Features own domain behavior and domain UI, including code with one current consumer. Reuse across pages does not make domain code globally shared.
- Start with the narrowest owner. Promote code only when actual independent consumers need the same behavior; first check for an existing equivalent.
- Generic infrastructure, utilities, and UI primitives must not depend on features. Application shells may compose features through their public APIs.
- Allow justified one-way feature dependencies through public APIs. Do not import another feature's repositories or other internals, create cycles, or disguise domain dependencies behind shared facades.
- Keep infrastructure grouped by capability, pure generic functions in the project's shared utilities, and primitives in its UI folder. Preserve established `lib/`, `shared/`, and configuration distinctions when their responsibilities are clear.

## Runtime and public boundaries

- Fetch initial server data through server-only domain functions; avoid an internal HTTP round trip merely to call the same application's server code.
- Use Client Components for actual interaction/browser state. They can also render on the server: keep browser access out of module initialization and server rendering.
- Mark database and privileged infrastructure modules `server-only`. Validate runtime input and authorize protected actions and data operations; a hidden button or protected layout is insufficient authorization for an action.
- Return minimal intentional projections to the browser. Narrow TypeScript annotations do not strip runtime fields. Convert unsupported database values at the boundary and distinguish public/Admin data when their contracts differ.
- Export only actual external contracts. Use `index.ts` for a simple feature; use explicit `server.ts` and `client.ts` entry points when mixed runtime exports need separation. Keep shared types runtime-neutral and use type-only imports.
- Feature internals import concrete modules. Do not remove an entry point that protects a runtime/public boundary merely because it re-exports code.

## Responsibilities and extraction

| Responsibility     | Keep it simple                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component          | Own rendering, accessibility, styling, motion, and straightforward presentation handlers/state. Small local helper components may stay in the same file.                                                                                            |
| Hook               | Extract a cohesive React interaction or synchronization lifecycle when it clarifies ownership or supports real reuse. One consumer can justify it; one state variable does not require it. Expose intent-based actions when rules must be enforced. |
| Provider           | Share state only among consumers that actually need it. Place the context boundary at their nearest suitable common ancestor; keep it small. Do not add a provider for every feature.                                                               |
| Action             | Own the server entry point, input handling, authorization, and framework effects. Keep a simple operation cohesive; delegate substantial business orchestration.                                                                                    |
| Service            | Coordinate a meaningful business workflow or transaction. Avoid pass-through services and one service per function.                                                                                                                                 |
| Repository         | Own substantial or reused database operations. Extend an existing cohesive data module first; do not wrap every Prisma call or introduce interfaces for hypothetical database replacement.                                                          |
| Parser / validator | Decode, normalize, and validate external input. Keep the rules together unless substantial logic or real reuse warrants a separate pure validator.                                                                                                  |
| Mapper             | Produce an intentional application projection. Extract substantial or reused transformations; keep a small single-use projection beside its query.                                                                                                  |
| Utility            | A focused ordinary function, local to its owner by default. Extract for clarity or real reuse, without mandatory per-component utility files.                                                                                                       |

- Calculate derived values directly; do not mirror them in state with Effects. Use handlers for user-triggered work and Effects for synchronization with external systems. Pure functions are not hooks.
- Reuse pure validation rules across consumers when they must agree, while validating again at the server boundary. Do not require a parser → schema → validator chain.
- Use the project's existing validation approach. Add a schema library only for concrete complexity or reuse that justifies the dependency; a typed parameter is not runtime validation.
- A new layer must protect a real boundary, name a substantial current responsibility, or remove harmful duplication. Future scale, hypothetical reuse, symmetry, or satisfying an acronym is insufficient.
- Keep ordinary functions and cohesive modules as the default. No generic managers, base repositories, registries, automatic retries, recovery frameworks, caching systems, or new dependencies without a current requirement.
- Handle expected failures explicitly. Record unexpected failures once at the appropriate server boundary with sanitized operation/error metadata; do not log secrets or whole user payloads, silently swallow bugs, or claim cleanup succeeded without checking it.
- Preserve safeguards required by current business operations. Atomic writes, stock checks, identity conflicts, and duplicate-submission handling are not speculative merely because they handle failures.

## Types, naming, and sizing

- Use generated database models/query payload types internally. Define separate types for real input, serialized projection, or UI-state boundaries, not duplicate persisted models.
- Keep small props types with their component and infer hook return types. Reuse existing shapes with type-only imports, indexed access, or `Pick` when accurate; for example, `PublicPerfumeDetail["variants"]`.
- Use `types.ts` for substantial or reused feature contracts; use `types/` only when it improves navigation. Do not add empty/global type buckets or make fields optional to merge unrelated contracts.
- Use PascalCase for meaningful component files, `useMeaningfulName.ts` for hooks, and descriptive kebab-case names for ordinary modules. Preserve framework filenames.
- Keep established action names such as `save-perfume.admin.action.ts`. Group public/Admin UI under `components/` as needed; do not create a mixed-purpose Admin bucket.
- Start flat. Add `actions/`, `components/`, `hooks/`, or data-layer grouping folders only for actual contents. Cohesive data modules may use `<domain>.repository.ts` or `<domain>.service.ts`; split substantial query/mutation responsibilities only when useful, without keeping a duplicate catch-all.
- Keep query definitions beside their consumer unless reused. Avoid arbitrary line-count limits: split by understandable responsibilities, and use early returns and named steps to reduce difficult nesting.

## Database and Prisma

- Database access belongs to the owning domain on the server. Use the existing application client; never construct clients, adapters, or pools in feature code or per request.
- Reuse one client per runtime instance, including development reloads. A singleton is not one connection for the entire deployment. Preserve documented lazy initialization and deployment-specific pool settings.
- Do not disconnect the shared application client after requests. Standalone scripts and isolated integration tests may own a client and close it when finished.
- Let one business operation own its transaction. Pass the transaction client to every participating helper, including cross-feature calls. Do not use the global client inside that transaction or introduce nested transactions; with a small pool this can wait on the connection already held.
- Keep network operations outside database transactions. Use database constraints and conditional writes to protect actual concurrent business invariants.
- Select/filter/limit data for the consumer rather than fetching everything and adding speculative caching infrastructure.
- Preserve the project's migration authority and history. Inspect SQL constraints, policies, and triggers as well as the ORM schema before changing persisted behavior.

## Applying the standard

Inspect the whole target and its consumers before reorganizing it. Follow the project's delivery workflow through verification and commit; update routes, imports, exports, tests, and documentation affected by the change. Do not treat existing behavior bugs as folder cleanup or silently make product/schema decisions.

The guidance draws on [Next.js colocation](https://nextjs.org/docs/app/getting-started/project-structure), [server data boundaries](https://nextjs.org/docs/app/guides/data-security), [React hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), and [Prisma connection management](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-management). Check the installed framework guidance when implementation depends on version-specific behavior.
