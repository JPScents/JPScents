# Milestone 2: Catalogue Management

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2026-08-28
**Depends On:** Milestone 1; starts from `e77b881`
**Target Pull Request:** —
**Target Branch:** `main`
**Merge Mode:** Manual
**Merge Method:** squash
**Superseded By:** —

## Goal

Deliver the complete protected Admin catalogue workflow on the approved platform: searchable Perfume operations, one shared create/edit editor, primary-image management, variant management, Featured control, and the single-Bestseller selection capability. Keep the feature cohesive and direct so the public discovery milestone can consume stable catalogue projections without inheriting Admin UI internals.

## Design authority

- Paper Final Admin is definitive: Perfumes Desktop, Create Perfume Desktop, Edit Perfume Desktop, Add Variant modal, Product Preview modal, and Bestseller Selector overlay.
- Paper Workspace component families provide Admin Operations, Perfume Editor, Variant Management, Bestseller Selection, Form Controls, and shared shell/modal variants.
- Approved repository references: `documentation/pages/admin/02-perfumes.md`, `03-perfume-editor.md`; component files `06-form-controls.md` through `10-bestseller-selection.md`; domain, query, mutation, route, validation, and asset registries.
- Use Paper MCP exports (`get_jsx`, computed styles, fill images where applicable) for exact implementation values; screenshots are verification references, not code inputs. Do not modify Paper.

## Required behaviour

### Catalogue reads

- Implement `listAdminPerfumes(filters)` as one direct server-side catalogue projection for `/admin/perfumes`: name search, derived availability/stock, variant counts, and Featured/Bestseller placement filters.
- Implement `getAdminPerfume(id)` for the shared editor, including ordered images, variants, and enum selections; invalid IDs return the route's not-found state.
- Implement eligible Bestseller candidate search by name and scent character. Eligibility is Published with at least one positive-quantity variant.
- Keep read modules few and cohesive. Do not introduce repositories, generic query builders, DTO factories, or API routes when server functions/actions suffice.

### Admin routes and operations

- Implement protected `/admin/perfumes`, `/admin/perfumes/new`, and `/admin/perfumes/{id}` routes using the existing Admin shell and server-enforced Admin identity.
- The list is operational and read-only apart from navigation. Preserve active search/filter state in the URL, provide clear/reset for no results, and use semantic desktop table lanes. At narrow widths provide a readable stacked treatment; do not invent a separate mobile Admin design.
- Create and edit use one feature-owned `PerfumeEditor`. Create defaults to Draft; edit loads current values. Both preserve entered values and return field/form feedback on failure.
- Persist name, stable unique slug, `scentCue`, description, status, Featured flag, and multiple selections from the approved ScentCharacter, Occasion, and TimeOfDay enums.
- Include `scentCue` as a dedicated maintained field because the approved public product projection requires it. It is not inferred from Description.
- Publishing requires complete customer-facing name/slug/scent cue/description, one primary image with useful alt text, maintained recommendation attributes, and at least one variant with positive quantity and a valid price.
- Preview uses unsaved editor state and the approved large/compact product-card treatment inside `ModalShell`; it never persists. It may remain Catalogue-owned until the public Product Card is implemented, then Milestone 3 may consolidate only proven duplication.
- Add minimal unsaved-change protection for genuinely lossy navigation and browser unload; do not build a routing framework.

### Primary image management

- Implement the current designed requirement as one primary image, while retaining the ordered `PerfumeImage` model for future confirmed needs.
- Accept JPEG, PNG, or WebP up to 5 MiB; validate both client feedback and server authority. Store under a stable `perfumes/{perfumeId}/...` path in the private bucket.
- Upload, replace, and remove through the authenticated Admin's Supabase Storage session. Update Prisma image metadata/path/alt text coherently and compensate predictable partial failures so a failed database write does not knowingly leave a new orphan.
- Render a calm controlled placeholder when no image exists. Do not mistake or label design placeholders as client photography.

### Variant management

- Implement feature-owned `VariantManager`, rows, empty state, and one add/edit `VariantModal` composed with shared `ModalShell`.
- Size must be positive; unit is currently mL; price and quantity are non-negative integers in storage; duplicate size/unit within a Perfume is rejected; display/parsing never relies on floating-point money.
- Quantity zero derives unavailable. Add/update uses stable variant identifiers.
- An unreferenced variant may be deleted after explicit confirmation. A variant referenced by an OrderItem must be retained; the Admin receives actionable guidance to set quantity to zero instead. Never cascade or rewrite historical Orders.
- Publishing and Bestseller eligibility are revalidated whenever a variant or parent change could make the Perfume ineligible.

### Featured and Bestseller

- Featured remains a normal Perfume update in the editor.
- Implement one atomic `setBestseller(perfumeId | null)` operation that clears the previous selection and selects only an eligible Perfume, preserving the database invariant.
- Implement the feature-owned searchable Bestseller selector/modal component and its states from Paper, but do not implement the Admin Overview page in this milestone. Milestone 5 will compose it into `/admin`.
- If an Admin tries to unpublish or remove the final positive stock from the active Bestseller, reject the change with guidance to replace/clear the Bestseller first. Do not silently change merchandising state.
- Order-count context in the selector may be zero until Orders exist; no analytics framework or automatic ranking.

### Shared form controls

- Add only the shadcn-backed input, textarea, select, checkbox/switch, button, and concise Field composition actually used by this milestone. Preserve persistent labels, descriptions, errors, focus, and required/optional text.
- Form field groups and validation remain Catalogue-owned. Do not create a generic schema-driven form renderer or modal configuration engine.

## Ownership and source shape

- `src/features/catalogue` owns Admin catalogue reads, mutations/actions, validation, projections, editor/list/variant/Bestseller components, and their focused tests.
- `src/app/(admin)/admin/perfumes` owns only route boundaries, loading/not-found/error composition, and feature assembly.
- `src/components/ui` owns installed shadcn primitives; `src/components/shared` receives only the proven Field composition if both Admin and later Checkout can reuse it cleanly.
- `src/lib/supabase` and `src/db` may receive the smallest server-only additions needed for authenticated Storage and Prisma access; do not add service/repository layers.

## Constraints

- Follow `AGENTS.md`, the active milestone lifecycle, project feature/shared/database/design/commit skills, and approved documentation.
- Use one GPT-5.6 Terra Medium implementation agent on shared local `main`; commit the complete milestone locally but do not push. The Sol orchestrator independently reviews and pushes only after all gates pass.
- Inspect the current repository, local Next.js 16 docs, Supabase skill/docs, Prisma code, and Paper before implementation.
- Preserve the approved schema unless a concrete Milestone 2 requirement proves a minimal migration necessary. No speculative taxonomy, inventory ledger, CMS, analytics platform, API layer, or generic abstraction.
- Do not inspect secret environment files or print credentials. Use `.env.example` and documented variable names only.
- Do not fabricate final client facts, photography, logo assets, catalogue descriptions, or prices. Existing deterministic records remain controlled development placeholders.

## Explicitly out of scope

- Homepage, public Perfumes, public Perfume Detail, Help Me Choose, public Product Card consolidation, Cart, Checkout, Orders, confirmation, WhatsApp handoff, or Admin Overview/Orders pages.
- Online payments, stock reservation, cancellation restoration, pagination before proven volume, bulk import/export, analytics, inventory history, or remote deployment.
- Multiple-image gallery editing beyond the currently designed primary-image workflow.
- A separate mobile Admin catalogue visual system.

## Required tests

1. Admin catalogue projections cover search, availability, and merchandising filters with derived counts.
2. Create/update validation covers required published fields, enum arrays, slug conflicts, server authorization, preserved failure input, and Featured changes.
3. Variant add/update/delete covers numeric boundaries, duplicate sizes, quantity-derived availability, referenced-variant retention, and Bestseller eligibility conflicts.
4. Bestseller replacement is atomic, enforces eligible candidates, and cannot produce two active Bestsellers.
5. Image handling validates type/size/path/alt text and predictable upload/database compensation using focused mocks plus a local Storage smoke check where practical.
6. Routes reject unauthenticated/non-Admin access; list/editor/modal interactions are keyboard accessible; Dialog focus/Escape/close behaviour still passes.
7. Prisma format/validate/generate, local migration/reset and seed repeatability, ESLint, TypeScript, focused tests, and production build pass.
8. The orchestrator visually compares the running Admin catalogue/editor/modal states against the named Paper frames at desktop width and checks a narrow functional layout before approval.

## Acceptance criteria

- [x] Protected Perfume list/create/edit routes are complete and use real Prisma/Supabase data operations.
- [x] The editor owns the approved fields, publication rules, enum multi-selection, Featured setting, preview, feedback, and unsaved-change behaviour without duplicated create/edit markup.
- [x] Primary image upload/replace/remove is authorized, validated, coherent with metadata, and does not expose the private bucket.
- [x] Variant add/edit/delete and retention rules are enforced at the server boundary and represented clearly in UI states.
- [x] The single-Bestseller operation and reusable selector component are complete without prematurely building Admin Overview.
- [x] Admin operations/forms/modals follow Paper, responsive/accessibility requirements, and existing shared foundations.
- [x] Catalogue ownership remains direct and minimal; no excluded public/cart/order/analytics work or premature abstraction is introduced.
- [x] All required automated, local-platform, and visual verification passes.
- [x] The orchestrator records an independent review of the exact milestone commit before push.

## Manual tasks

None required for implementation. A named Admin credential is intentionally not committed; automated route and component verification may use controlled test identity/mocks without weakening production authorization.

## Manual acceptance criteria

- [ ] Freeman confirms the completed Admin catalogue workflow visually after the orchestrator's verified implementation pass.

## Completion Record

**Implementation Outcome:** Protected Perfume list/create/edit workflows now use Prisma and authenticated Supabase Storage with a shared responsive editor, staged Add Variant modal, live image preview, large/compact product preview, primary-image management, catalogue filters, and the single-Bestseller selector capability. Create allocates its stable ID/path before upload, performs one atomic Perfume/image/variant write, and removes the uploaded object if persistence fails.
**Important Decisions:** Dedicated `scentCue`; one current primary image workflow; referenced variants retained; active Bestseller must be explicitly replaced/cleared before an ineligible change; Bestseller selector implemented as Catalogue capability and composed into Overview later.
**Contract Deviations:** None
**Verification Summary:** ESLint, TypeScript, Prisma format/validate/generate, 15 focused tests, local Supabase reset/seed, and the production build pass. A real authenticated browser flow created a Perfume with a private Storage image and staged variant, verified the resulting editor/signed image, checked desktop and narrow states, and removed all temporary records. The latest browser console is clean. The orchestrator compared the catalogue, editor, and preview/modal states with the definitive Paper frames and found the spacing, hierarchy, contrast, responsive stacking, and control treatment consistent.
**Review Outcome:** APPROVE
**Reviewed Head:** `7856531`
**Pull Request:** —
**Merge Commit:** —
**Follow-up Notes:** Admin Overview will compose the already implemented Bestseller selector in Milestone 5. Freeman's optional hands-on visual acceptance remains available and is not an implementation blocker.
