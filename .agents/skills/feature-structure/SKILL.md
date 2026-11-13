---
name: feature-structure
description: Refactor or implement repository features with enforced responsibility folders, semantic naming, minimal abstractions, and explicit simplification evidence.
---

# Feature Structure

Read the project's AGENTS.md and README, then apply this standard to the whole requested feature and its affected consumers. Existing names and folders are evidence to examine, not architectural authority. Current instructions supersede older structural choices in archived milestones; preserve their still-applicable business requirements.

## Approval before a new structure

Follow the [mandatory ADR checkpoint](../../../docs/engineering/CHANGE_CONTROL.md#mandatory-architecture-approval-contract). A new ownership, dependency, runtime, provider or transaction boundary needs explicit owner approval in an Accepted ADR before affected code. The Execution Agent stops and escalates unforeseen decisions to the Orchestrator; independent authorised work may continue. A requested refactor, existing implementation or passing checker is not approval for a new architecture. Apply approved successors only after contracts, tasks and verification instructions agree and the execution handoff is acknowledged. This skill's current layout remains operative until that adoption is authorised.

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
  repositories/            # All Prisma operations, transactions, query definitions
  services/                # Non-persistence business rules and application orchestration
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

Repositories own every Prisma database operation: model reads/writes, `$transaction` (both forms), raw SQL, `where` / `select` / `include` definitions, ordering, limits, and persistence-level conditional writes. Keep transaction clients and query payload types here. Return intentional database shapes or application outcomes, never a live Prisma client/delegate, deferred Prisma query, or transaction handle. Narrow selects are data access; converting records to public/admin contracts is mapping.

Expose meaningful atomic operations such as `createOrderWithStockDeduction` and `cancelOrderAndRestoreStock`. Their repository implementation opens and completes the transaction, including all checks that must remain atomic with the writes: identity conflicts, stock availability, duplicate submissions, and claiming a cancellation before restocking. Do not move those checks into a service that reads first and writes later. Repositories may use pure decision functions with ordinary values; do not call services from inside a transaction.

Do not put React, cookies, redirects, route revalidation, image signing, external communication, or HTTP/FormData parsing here. Translate expected Prisma errors to explicit application outcomes/errors here so callers do not need Prisma error classes. Unexpected failures remain observable; do not swallow them.

Pass an existing transaction client only between participating repository operations. When multiple features must participate atomically, expose the necessary repository-owned operation through the owning feature's intentional server-only public API; another repository may call it with the same transaction. Do not import feature internals or route the client through a service. Keep this dependency one-way. Do not invent a generic unit-of-work, `withTransaction` callback, or proxy that lets service code control Prisma indirectly.

Actual database access justifies a concrete repository module, even for one operation; it does not justify a generic CRUD wrapper, base class, interface for hypothetical replacements, or a forwarding service. Keep reads and writes together unless a substantial independent responsibility warrants another descriptively named repository. Do not create a read/write split by default.

### Services

Use `services/<entity-or-workflow>.service.ts`, for example `services/order.service.ts`. Services own meaningful non-persistence business policy or orchestration: choosing an application operation, calling an atomic repository operation, or loading records and signed image URLs before mapping an application result.

Services never import the application Prisma client, Prisma namespace/client APIs, or transaction-client types; never start, receive, pass, or control a transaction; and never execute model operations or raw SQL. They call repository operations with ordinary inputs and consume completed results. There is no transaction-setup exception. Generated model types and enum values are data contracts, not database access, and may still be used where appropriate. Repository-specific payload types may be exported as types without exposing client handles.

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

Routes own framework concerns, page composition, and page-only presentation/adapters. Use the route's `_components/`, `_hooks/`, `_types/`, `_utils/`, `_actions/`, or `_server/` only for actual contents, with the same semantic rules and names. Domain rules, domain UI, and persistence belong to the feature even with one consumer. Consumer count alone does not decide ownership.

For example, a perfume-detail purchase control connecting Catalogue variants to Cart is route-owned. Order creation and reusable checkout behavior remain Orders-owned; the checkout page's Cart-to-Orders adapter is route-local. Promote code only when actual independent consumers need the same behavior.

Use `src/features/customers` as the structural reference: actions, parsers, repositories, services, components and types occupy named responsibility folders. It is a reference, not a scaffold or exemption. Its read services retain authorization; its repository owns identity-conflict resolution, persistence errors, and transaction participation. Do not add these layers to a frontend feature merely to match its tree.

Fixture data belongs beside meaningful tests and contains only fields needed for the behavior under test. Use a small explicit Customer-shaped value with deterministic identity/contact/delivery fields as the reference. Add a fixture factory only when several tests need the same variations; no copied production modules, fixture service/repository layers, catch-all optional models, or global fixture framework. Demo catalogue data stays with its seed repository; the seed entry owns lifecycle only.

Generic shared infrastructure/utilities/UI primitives must not depend on features. Features may depend one-way on another feature's intentional public API, never its repositories or other internals. Application shells and routes may compose features. Database access belongs to its owning domain: published variant lookup is Catalogue-owned even when Cart requests it.

Mark privileged data/infrastructure modules `server-only`. Use explicit server/client entry points only when runtime separation is needed. Runtime-neutral types use type-only imports. Internals import concrete modules rather than their own public barrel. Narrow TypeScript annotations do not remove runtime fields; deliberately map what crosses the browser boundary.

## Apply the rules to mixed files

- `orders.query.ts`: database queries/selects move into `repositories/order.repository.ts`; authorization and any loading/signing/mapping orchestration belong at the appropriate authorized action/service boundary. Do not move that orchestration into a repository.
- `orders.mutation.ts`: the atomic order/stock/customer operation, its checks, and transaction ownership belong in `repositories/order.repository.ts`; parsing belongs in parsers. A service remains only for meaningful non-persistence orchestration. Small reference-generation helpers can stay with their owner. Do not copy the transaction callback into a service or break it into separately committed repository calls.
- `orders.projection.ts`: pure public/admin transformations belong in `mappers/order.mapper.ts`; Prisma includes remain with repositories, and image signing belongs in the calling orchestration outside transactions. Renaming the entire mixed file to `.mapper.ts` fails this standard.
- A Catalogue `*.schema.ts` function that decodes input belongs in a parser, or merges into its existing parser. A reusable pure rule may belong in validators. Moving it unchanged into a new folder without evaluating that distinction is incomplete.

## Database and behavioral safeguards

- Only repository implementations execute Prisma database operations. Actions, services, routes, hooks, mappers, validators, utilities, and request-context helpers must not import or re-export a database client or execute its operations. Client factories/proxies do not create an exception. Review affected consumers outside the feature too.
- Keep client construction and lazy singleton/pool configuration in the existing database infrastructure module; it contains no application queries or transactions. Never create feature/request clients or pools or disconnect the shared client after requests. Standalone tools may own client lifecycle, but their hand-written queries and transactions also belong in repository modules (local to the tool when strictly operational). Do not rewrite generated Prisma code or migrations to imitate application layers.
- A repository owns the transaction and supplies its client to every participating repository operation, including cross-feature calls. No global-client queries inside that transaction or nested transactions; a small pool can deadlock waiting for its held connection. Network calls remain outside transactions.
- Preserve atomic writes, stock checks, identity conflicts, idempotency, and single stock restoration. Use conditional writes and constraints for real concurrent invariants; do not replace them with read-then-write assumptions.
- Select/filter/limit records for the consumer. Do not compensate for oversized reads with speculative caching.
- Inspect relevant SQL constraints/triggers and policies before changing persisted behavior. Preserve migration authority/history and product rules.
- Handle expected failures explicitly. Record unexpected failures once with sanitized operation/error metadata; no secret/payload logging, silent error swallowing, or unverified cleanup claims.

## Structural enforcement and completion

From the repository root, run the bundled check for each refactored feature:

```bash
npm run architecture:check
```

The default command discovers every feature and runs automatically in `npm run check`. It checks the root allowlist, folder/file names, empty folders, export-only entry points, and recognizable Prisma imports/API access outside repositories. It also scans application source and operational scripts/seeds for database boundary violations and enforces public feature imports and generic shared independence. Use an explicit feature-directory argument for a scoped development check.

The checker reads only source files, never environment files. It does not perform whole-program data-flow analysis or prove that a correctly named module contains the right responsibility: review indirect client leaks, mixed responsibilities, transaction clients passed through other layers, oversized projections, dead exports, and unnecessary layers. Client initialization is allowed only in the established infrastructure module and standalone seed entry; review those files to ensure they remain lifecycle-only. Do not silence violations with aliases, re-exported clients, catch-all folders, new exceptions, or weakened checks.

Use the delivery skill's readability and verification requirements. Completion requires a passing structure check for the full target, a resolved responsibility review, meaningful behavioral verification, and a concise report of simplification and any retained justified abstractions. For a focused change rather than a whole-feature refactor, report existing out-of-scope structural violations without expanding the assignment. A standards-only change reports current violations without migrating application code.
