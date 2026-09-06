---
name: feature-structure
description: Refactor or implement repository features with enforced responsibility folders, semantic naming, minimal abstractions, and explicit simplification evidence.
---

# Feature Structure

Read the project's AGENTS.md and README, then apply this standard to the whole requested feature and its affected consumers. Existing names and folders are evidence to examine, not architectural authority. Current instructions supersede older structural choices in archived milestones; preserve their still-applicable business requirements.

## What refactor means

Understand behavior and data flow, question every existing responsibility and abstraction, remove unnecessary code, merge needless layers, and correct ownership and names without breaking behavior. A rename, split, or move is useful only when it resolves an identified problem. A few opportunistic fixes do not complete a feature-wide refactor.

For each module, determine what it actually does, who calls it, whether it needs to exist separately, and its permitted location below. First consider deletion or merging into a cohesive owner. Split mixed responsibilities only where their boundaries matter. Keep compliant code; do not manufacture churn, deletion quotas, or one file per function. Report unresolved in-scope violations instead of declaring the feature complete.

## Feature layout and root allowlist

Use one responsibility-based pattern for all features. Folders are optional; locations are mandatory when the responsibility exists. A frontend feature may need components, hooks, and browser storage with no services or repositories. Do not scaffold empty folders or forwarding layers.

```text
src/features/<feature>/
  index.ts                 # Public exports; runtime-neutral with server/client entries
  server.ts                # Optional server-only public exports
  client.ts                # Optional client public exports
  actions/                 # Callable server entry points and framework effects
  components/              # Domain UI; admin/ and public/ only when useful
  hooks/                   # React state and interaction lifecycles
  providers/               # Shared React context boundaries, when needed
  repositories/            # Database reads/writes and query definitions
  services/                # Business rules, transactions, application orchestration
  mappers/                 # Pure record/input/output transformations
  parsers/                 # Decode and normalize external input
  validators/              # Reusable imperative validation rules
  schemas/                 # Actual declarative runtime validation contracts only
  types/                   # Substantial/shared feature contracts
  utils/                   # Focused pure helpers
  constants/               # Named static domain values
  storage/                 # Browser persistence and its payload format
  server/                  # Request-context helpers, narrowly scoped below
```

The only allowed root files are `index.ts`, `server.ts`, `client.ts`, and optional maintained `README.md` / `AGENTS.md`. Entry points contain explicit re-exports and runtime markers only, not implementations, type definitions, wildcard exports, or renamed catch-all modules. Keep only entry points actual consumers need. Use `index.ts` for runtime-neutral exports rather than a parallel `shared.ts`.

Root implementations such as `orders.query.ts`, `orders.mutation.ts`, `orders.projection.ts`, `admin-catalogue.ts`, `cart-storage.ts`, `CartProvider.tsx`, and `types.ts` are noncompliant. Inspect and classify their contents; do not mechanically move them intact. No grandfathering during a full refactor of that feature. Unrelated features remain outside the task.

Do not invent buckets such as `helpers`, `managers`, `data`, `queries`, or `mutations` to evade these responsibilities. A genuinely uncovered responsibility needs an explicit standards decision, not an ad hoc folder. Do not add nesting solely to shorten files. Tests remain in the project's root `tests/` tree, mirroring source ownership.

## Responsibilities and names

### Repositories

Use `repositories/<entity>.repository.ts`, for example `repositories/order.repository.ts`. Reads and writes are functions in a cohesive repository: `findOrderByReference`, `listOrderRecords`, `createOrderRecord`, `updateOrderStatus`. A query reads persisted data; a mutation writes it. These are operation descriptions, not separate architectural layers or `.query.ts` / `.mutation.ts` file categories.

Repositories own Prisma calls, `where` / `select` / `include` definitions, ordering, limits, and persistence-level conditional writes. Keep query payload types beside those definitions. Return intentional database shapes. Narrow selects are data access; converting those records to application/public/admin contracts is mapping.

Do not put React, cookies, redirects, route revalidation, image signing, application workflow decisions, or HTTP/FormData parsing here. A repository may enforce database conditions required by its caller; the service decides business policy. Use the supplied transaction client for participating operations.

Actual database access justifies a concrete repository module, even for one operation; it does not justify a generic CRUD wrapper, base class, interface for hypothetical replacements, or a forwarding service. Keep reads and writes together unless a substantial independent responsibility warrants another descriptively named repository. Do not create a read/write split by default.

### Services

Use `services/<entity-or-workflow>.service.ts`, for example `services/order.service.ts`. Services own meaningful business policy or orchestration: customer identity resolution, order creation with stock deduction, cancellation and restocking, or loading records and signed image URLs before mapping an application result.

A business operation owns its transaction here and passes that transaction client into repository functions and participating public feature APIs. Transaction setup may use the application Prisma client; individual model reads/writes belong to repositories. Network calls stay outside database transactions.

Do not add services for simple forwarding, renaming a repository function, type annotations, or symmetry. Authorization that protects a callable operation is meaningful behavior, not a pass-through; preserve such guards when collapsing layers. Keep framework effects and request-context access in actions or the narrowly defined server helpers. Pure transformations belong in mappers; extracted validation belongs in parsers/validators.

### Actions

Use `actions/<verb-subject>.action.ts`, retaining `.admin.action.ts` for protected Admin operations, for example `actions/cancel-order.admin.action.ts`.

Actions are actual callable server entry points. Own runtime input handling, authorization, service/repository invocation, expected error responses, and framework effects such as cookie writes, redirects, and revalidation. A simple authorized write can call a repository directly; do not require a service in between. Keep substantial business workflows out of actions.

Do not label every server function an action or add `"use server"` to make an ordinary helper importable. Initial server reads should call an authorized server function directly without an internal HTTP round trip. Authorize protected public operations before data access; a layout or hidden button is insufficient. Do not expose unguarded protected repositories as public feature APIs.

### Mappers

Use `mappers/<subject>.mapper.ts`, for example `mappers/order.mapper.ts`, with functions such as `toPublicOrder` and `toAdminOrder`. Produce explicit domain, serialized, or presentation shapes; exclude private/unneeded fields and convert unsupported database values deliberately.

Mappers are pure: no database reads, signed-URL requests, cookies, React state, or service orchestration. Pass already-resolved external values into them. Prisma query definitions belong in repositories, not mappers. Do not introduce a parallel `.projection.ts` category. Small, obvious single-use object construction may stay at the consuming boundary; substantial/reused mapping belongs here, without a one-file-per-output rule.

### Parsers, validators, and schemas

- `parsers/<input>.parser.ts`: decode and normalize external input, such as FormData or an unknown payload, into a usable input or actionable errors. Keep directly related validation with its parser when cohesive.
- `validators/<rule>.validator.ts`: extracted pure imperative checks with actual reuse or substantial independent rules. Return validation results; do not query the database or orchestrate saves.
- `schemas/<subject>.schema.ts`: an actual declarative runtime validation contract interpreted by an established validator. An ordinary function that trims fields, checks conditions, or returns errors is a parser/validator, not a schema. TypeScript types alone are not runtime schemas.

The current project uses imperative parsers/validators and has no schema-library convention. Do not add Zod or another library, or wrap a function in a schema object, merely to keep `schemas/`. Reclassify the behavior; merge single-use validation into its parser when appropriate. Reuse rules that consumers must agree on while validating again at the server boundary. Do not enforce a parser → schema → validator chain.

### Types, utilities, and constants

- `types/index.ts` holds a small cohesive set of substantial/shared contracts. Split genuinely distinct groups into `types/<subject>.types.ts` only when useful. No root `types.ts`, runtime functions, or constants in types modules. Keep small component props and inferable hook returns local. Use generated database/query types internally and reuse existing contracts with indexed access or `Pick`, such as `PublicPerfumeDetail["variants"]`; do not duplicate persisted models or combine unrelated shapes with optional fields.
- `utils/<purpose>.ts` contains focused pure helpers, such as `format-price.ts` or `normalize-size.ts`. Name by behavior, not `helpers.ts`, `common.ts`, or `utils.ts`. Keep tiny single-use helpers with their owner unless extraction materially clarifies them. Do not hide parsing, mapping, persistence, business workflows, or side effects here.
- `constants/<subject>.ts` contains static domain values such as order statuses. Keep small constants local; extract only for shared use or a substantial named dataset. No mutable state, credentials, environment loading, or computed workflows.

### Components, hooks, and providers

- `components/<MeaningfulName>.tsx` owns rendering, accessibility, styling, and motion. Name the visible responsibility, such as `CartItem`, `CartButton`, or `CartCheckoutSummary`. Small presentation handlers/state and local helper components may remain together. Do not split markup into forwarding components or wrappers merely to shorten a file.
- `hooks/use<MeaningfulName>.ts` owns a cohesive stateful interaction or synchronization lifecycle. One consumer can justify a hook; one state variable does not require one. Expose intent-based actions when enforcing rules. Pure functions are not hooks. Calculate derived values directly, use handlers for user-triggered work, and reserve Effects for synchronization with external systems.
- `providers/<Feature>Provider.tsx` owns a genuinely shared context boundary at the nearest suitable common ancestor. Keep its consumer hook alongside it when cohesive; extract substantial state behavior into `hooks/`. Do not add a provider for every feature.

### Browser storage and request-context helpers

- `storage/<purpose>-storage.ts`, such as `storage/cart-storage.ts`, owns browser persistence, payload versioning, decoding, and expected unavailable-storage behavior. It does not own UI state or become a database repository/service. Keep browser access out of module initialization and server rendering.
- `server/<purpose>.ts`, such as `server/confirmation-cookie.ts`, is reserved for server-only request-context helpers shared by actual feature consumers: cookie/header access and their options. It is not a general server-code bucket; database operations, workflows, and mappers retain their own locations. Keep single-use request handling directly in its action or route instead of extracting this folder.

Use descriptive kebab-case ordinary filenames and the responsibility suffixes above. Local helpers need not become exported modules. No wildcard barrels or per-folder forwarding `index.ts` files; `types/index.ts` is the defined contract module exception.

## Locality, public APIs, and the Customers reference

Routes own framework concerns, page composition, and page-only presentation/adapters. Use the route's `_components/`, `_hooks/`, `_types/`, `_utils/`, or `_server/` only for actual contents, with the same semantic rules and names. Domain rules, domain UI, and persistence belong to the feature even with one consumer. Consumer count alone does not decide ownership.

For example, a perfume-detail purchase control connecting Catalogue variants to Cart is route-owned. Order creation and reusable checkout behavior remain Orders-owned; the checkout page's Cart-to-Orders adapter is route-local. Promote code only when actual independent consumers need the same behavior.

Use `src/features/customers` as the structural reference: its action, parser, repository, service, components, and types occupy named responsibility folders. It is a reference, not a scaffold or exemption from review. Its `listCustomers` / `getCustomerById` forwarding services do not establish a convention worth copying. Its identity-conflict workflow is meaningful business logic. Inspect policy inside its repository just as critically. Fixture/test data, when needed, stays with meaningful tests; do not copy production modules into fixtures or invent a fixture framework.

Generic shared infrastructure/utilities/UI primitives must not depend on features. Features may depend one-way on another feature's intentional public API, never its repositories or other internals. Application shells and routes may compose features. Database access belongs to its owning domain: published variant lookup is Catalogue-owned even when Cart requests it.

Mark privileged data/infrastructure modules `server-only`. Use explicit server/client entry points only when runtime separation is needed. Runtime-neutral types use type-only imports. Internals import concrete modules rather than their own public barrel. Narrow TypeScript annotations do not remove runtime fields; deliberately map what crosses the browser boundary.

## Apply the rules to mixed files

- `orders.query.ts`: database queries/selects move into `repositories/order.repository.ts`; authorization and any loading/signing/mapping orchestration belong at the appropriate authorized action/service boundary. Do not move that orchestration into a repository.
- `orders.mutation.ts`: order/stock/customer workflow and transaction ownership belong in `services/order.service.ts`; persistence steps belong in repositories, input parsing in parsers, and small reference-generation helpers can stay local to their owner. Preserve atomic behavior while separating responsibilities.
- `orders.projection.ts`: pure public/admin transformations belong in `mappers/order.mapper.ts`; Prisma includes remain with repositories, and image signing belongs in the calling orchestration outside transactions. Renaming the entire mixed file to `.mapper.ts` fails this standard.
- A Catalogue `*.schema.ts` function that decodes input belongs in a parser, or merges into its existing parser. A reusable pure rule may belong in validators. Moving it unchanged into a new folder without evaluating that distinction is incomplete.

## Database and behavioral safeguards

- Use the existing application Prisma client; never create feature/request clients or pools, disconnect the shared client after requests, or change its documented lazy initialization and pool configuration casually.
- Pass the transaction client to every participating helper, including cross-feature calls. No global-client queries inside that transaction or nested transactions; a small pool can deadlock waiting for its held connection.
- Preserve atomic writes, stock checks, identity conflicts, idempotency, and single stock restoration. Use conditional writes and constraints for real concurrent invariants; do not replace them with read-then-write assumptions.
- Select/filter/limit records for the consumer. Do not compensate for oversized reads with speculative caching.
- Inspect relevant SQL constraints/triggers and policies before changing persisted behavior. Preserve migration authority/history and product rules.
- Handle expected failures explicitly. Record unexpected failures once with sanitized operation/error metadata; no secret/payload logging, silent error swallowing, or unverified cleanup claims.

## Structural enforcement and completion

From the repository root, run the bundled check for each refactored feature:

```bash
node .agents/skills/feature-structure/scripts/check-structure.mjs src/features/orders
```

It checks the root allowlist, folder/file names, empty folders, and export-only entry points. It reads only TypeScript entry-point source, not environment files. It does not prove semantic correctness: review every module's actual contents against the responsibilities above, including mixed files, dead exports, and unnecessary layers. Do not silence violations by renaming a mixed module, moving everything into `utils/`, adding exceptions, or weakening the check.

Use the delivery skill's readability and verification requirements. Completion requires a passing structure check for the full target, a resolved responsibility review, meaningful behavioral verification, and a concise report of simplification and any retained justified abstractions. For a focused change rather than a whole-feature refactor, report existing out-of-scope structural violations without expanding the assignment. A standards-only change reports current violations without migrating application code.
