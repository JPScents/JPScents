# Milestone 3: Public Discovery

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2026-08-28
**Depends On:** Milestone 2; starts from `2b81456`
**Target Pull Request:** —
**Target Branch:** `main`
**Merge Mode:** Manual
**Merge Method:** squash
**Superseded By:** —

## Goal

Deliver the complete public discovery experience from the definitive Paper designs: the public shell, Homepage, Perfumes catalogue, Perfume Detail, and deterministic Help Me Choose flow, backed by real published catalogue data and a small reusable public component family. Establish the exact public product projections that Cart will consume next without implementing Cart persistence, overlays, Orders, or speculative abstractions.

## Design authority

- Paper Final Site is definitive for Homepage, Perfumes, Perfumes No Results, Perfume Detail, and Help Me Choose Preferences/Results in desktop and mobile compositions.
- Paper Workspace supplies the Navigation & Shells, Product Cards, Scent Character, and Commerce Controls families and variants.
- Use Paper MCP exports (`get_jsx`, computed styles, and fill images where relevant) for implementation values. Use screenshots only for visual verification and do not modify Paper.
- Repository documentation is the behavioural authority: `documentation/pages/public/01-homepage.md`, `02-perfumes.md`, `03-perfume-detail.md`, `07-help-me-choose.md`; components `01-navigation-and-shells.md` through `04-commerce-controls.md`; and the route/query/validation/responsive/asset registries.

## Required behaviour

### Public catalogue reads

- Add one cohesive public catalogue read module with only the confirmed operations: `getFeaturedPerfumes`, `listPerfumes`, `getPerfumeBySlug`, `getRelatedPerfumes`, and `recommendPerfumes`.
- Use one plain serializable Perfume-card projection for reusable cards: stable ID/slug, name, scent cue/characters, authorized primary-image URL/alt text or controlled placeholder, minimum positive-stock price, derived availability, and Featured/Bestseller label.
- Public reads include only Published Perfumes. The catalogue shows positive-stock Perfumes first and may retain Published zero-stock Perfumes afterward so the designed unavailable state is truthful. Homepage hero/list, related recommendations, and Help Me Choose results use only positive-stock Perfumes.
- `getFeaturedPerfumes` resolves hero precedence as eligible Bestseller, then Featured, then another available Perfume, and supplies the small Homepage product set without duplicate hero items where practical.
- `getRelatedPerfumes` excludes the current Perfume and deterministically favours shared maintained attributes, then merchandising/name tie-breakers.
- `recommendPerfumes` is deterministic: filter to available Published Perfumes, score exact maintained enum matches, expose a plain-language match reason, then use merchandising/name tie-breakers. Do not add AI, embeddings, personalization infrastructure, or a generic recommendation engine.

### Public shell and navigation

- Implement the distinct public layout/shell with the approved wordmark, centred desktop navigation, compact mobile navigation, and footer. Routes are Home, Perfumes, and Help Me Choose; preserve the Cart utility visual/count boundary for Milestone 4 without inventing Cart persistence here.
- Mobile menu is keyboard accessible, closes on navigation/Escape, restores focus, and uses the smallest suitable existing shadcn primitive. Do not build a conditional public/Admin mega-shell.
- Use configuration-backed route labels and approved controlled copy. Do not fabricate final client policy, logo, or product-photography facts.

### Product component families

- Implement explicit Gallery and Catalogue Product Card presentations over the same card projection. Preserve designed desktop/mobile compositions rather than creating one flag-heavy universal card.
- Implement Scent Character Browse and Select modes for Fresh, Warm, Sweet, and Woody using the existing controlled local image assets. Browse links to `/perfumes?scent=<enum>`; Select is a semantic multi-select control with visible selected border/inset/check treatment.
- Implement only the commerce controls used now: route-backed scent filter chips, accessible size radio options, stock/availability treatment, and a quantity stepper constrained between one and the selected variant's current stock.
- If a Perfume has exactly one available variant, preselect it; with multiple available variants require an explicit selection. Zero-stock variants remain visible but disabled.

### Routes and page composition

- `/` follows the Paper desktop/mobile hierarchy: eligible hero Perfume, small available product presentation, Browse by Scent Character, Help Me Choose preview, ordering steps, reassurance/FAQ area, and closing action. Policy-dependent FAQ answers remain controlled configuration/placeholders clearly marked for confirmation rather than invented client facts.
- `/perfumes` uses a canonical optional `scent` search parameter, result count, route-backed filter state, available-first cards, and the designed no-results state with Clear Filters and Find My Scent actions. Invalid enum values are ignored safely.
- `/perfume/{slug}` renders a published Perfume, primary image, merchandising/availability, description/attributes, all variants, size selection, quantity control, and three related Gallery cards; missing/unpublished slugs return not-found. Show the Add to Cart control in the correct designed state, but do not persist Cart data or open a cart overlay until Milestone 4 wires the owned Cart operation.
- `/help-me-choose` owns both Preferences and Results states on one route. Valid search parameters preserve/share selected scent characters, occasions, and Day/Night/Either; invalid values are ignored. Multiple scent/occasion choices and one time choice are supported. Either applies no time filter and is not stored. Public “Evening” copy maps explicitly to stored `DATE_NIGHT`.
- Help Me Choose results announce their update, show ranked available Perfumes and local match reasons, support Adjust Preferences, and provide a no-match path to adjust or browse all Perfumes.

## Ownership and source shape

- `src/features/catalogue` owns public catalogue reads, public product projections, Product Cards, Scent Character, commerce controls, Help Me Choose matching, and focused tests alongside the existing Admin catalogue implementation.
- Public route files/layouts own only route boundaries and page composition. Homepage sections that are used once remain local instead of becoming generic shared components.
- `src/components/shared` owns only the proven public shell pieces that cross public routes. Existing Admin shell and catalogue management behaviour must remain unchanged.
- Reuse the existing currency formatter, enum definitions, tokens, site configuration, Supabase signed-image mechanism, and controlled assets. Do not add repositories, API routes, DTO factories per page, a CMS, generic filter engine, or client data-fetching library.

## Constraints

- Follow `AGENTS.md`, approved documentation, archived milestone decisions, and project design/database/testing instructions.
- Use one GPT-5.6 Terra Medium implementation agent on shared local `main`; commit the complete milestone locally but do not push. The Sol orchestrator independently reviews and pushes after every gate passes.
- Inspect the current code and the named Paper frames/components before implementation. Preserve exact route terminology: `/perfumes`, `/perfume/{slug}`, and `/help-me-choose`.
- Server rendering is the default. Use narrow client islands only for mobile navigation, selection/quantity state, and Help Me Choose interactions that genuinely require it.
- Preserve private product-image storage; public pages receive authorized signed URLs from the server and never Storage credentials.
- Do not use final client facts that are still unconfirmed. The four scent-character assets are controlled generated placeholders.

## Explicitly out of scope

- Cart state/persistence, resolved Cart items, cart count behaviour, Add-to-Cart mutation, drawer/bottom sheet, `/cart`, Checkout, Orders, confirmation, WhatsApp, Admin Orders, or Admin Overview.
- Online payment, search beyond the approved scent-character filters, pagination before proven catalogue volume, AI recommendations, analytics, reviews, favourites, or a speculative image gallery.
- Reworking the completed Admin catalogue unless a minimal serialization/projection reuse correction is proven necessary.

## Required tests

1. Public projections exclude Draft Perfumes, sort availability correctly, compute starting price/labels, use safe signed-image fallbacks, and follow Homepage hero precedence.
2. Catalogue scent parsing/filtering handles valid, missing, and invalid values; no-results composition keeps recovery actions.
3. Detail reads enforce published slug access, include ordered variants, preselect only one available variant, disable zero-stock choices, constrain quantity, and rank related Perfumes without the current item.
4. Deterministic Help Me Choose parsing/ranking covers multiple enum choices, Either, invalid URL values, availability exclusion, stable tie-breaking, match reasons, results, and no-match recovery.
5. Public navigation/menu, Product Cards, Scent Character selection, variant controls, and Help Me Choose states have focused accessible interaction tests, including keyboard/Escape where relevant.
6. Existing Admin catalogue/auth tests remain green; Prisma generate, ESLint, TypeScript, focused tests, local Supabase-backed smoke reads, and production build pass.
7. The orchestrator visually compares all named desktop/mobile Paper frames, verifies responsive reflow at representative widths, and checks the latest browser console before approval.

## Acceptance criteria

- [x] `/`, `/perfumes`, `/perfume/{slug}`, and `/help-me-choose` are complete, data-backed, responsive public routes matching the approved design hierarchy.
- [x] The public shell/navigation/footer and required Product Card, Scent Character, filter, size, availability, and quantity families are cohesive and accessible.
- [x] Public catalogue queries and projections are minimal, deterministic, serializable, and exclude private/Draft data.
- [x] Homepage merchandising, catalogue filters/no-results, detail variants/related products, and Help Me Choose preferences/results/no-match behaviour work against real seeded catalogue data.
- [x] Cart-owned state and order behaviour are not prematurely introduced; the Milestone 4 wiring boundary is explicit.
- [x] Existing Admin catalogue operations remain intact and no unnecessary layers/dependencies/files are added.
- [x] Required automated, local-platform, browser-console, responsive, and Paper visual verification passes.
- [x] The orchestrator records an independent review of the exact milestone commit before push.

## Manual tasks

None required. Final client photography/logo/policy copy remains a later content handoff and must not block controlled implementation verification.

## Manual acceptance criteria

- [ ] Freeman may confirm the completed public discovery experience visually after the orchestrator's verified implementation pass.

## Completion Record

**Implementation Outcome:** Complete local implementation, amended after independent review: data-backed Homepage, Perfumes catalogue, Perfume Detail, and Help Me Choose routes; deterministic public projections/merchandising/recommendations; Paper-aligned public shell/footer, controlled product-bottle fallback, six-step ordering journey, reassurance content, and explicit non-persistent Cart boundary. The review correction removes customer-facing milestone/cart staging copy, uses public preference labels throughout Help Me Choose, brings catalogue/detail hierarchy closer to the approved desktop/mobile frames, and keeps Add to Cart present but non-persistent.
**Important Decisions:** Public reads use one direct server module and signed-image fallbacks; runtime Prisma creation is lazy so route configuration can build without runtime database credentials, while local development falls back only to the documented local Supabase database; seeded data remains deterministic and repeatable without an environment file.
**Contract Deviations:** None. GitHub CLI authentication is unavailable to `fmw`, but this direct-main workflow has no Pull Request and Git push authentication is functional.
**Verification Summary:** 29 Vitest tests, zero-warning ESLint, TypeScript, Prisma validate/generate, deterministic local seed with three controlled Perfumes, and production build pass. Focused tests cover published-only query constraints, availability/hero/related/recommendation ordering, detail serialization, Help Me Choose labels/results/no-match, controlled product-image fallback, and public menu/footer semantics including Escape/focus return. The orchestrator exercised every public route at 1440px and 390px, verified the mobile menu, found zero browser-console errors, and compared Homepage, Perfumes, Detail, Preferences, and three-result layouts directly with the definitive Paper frames. Final targeted corrections fixed mobile hero order, catalogue heading/card density, selectable scent proportions, and recommendation placeholder sizing.
**Review Outcome:** APPROVE
**Reviewed Head:** `0bb4835`
**Pull Request:** —
**Merge Commit:** —
**Follow-up Notes:** Cart persistence/overlay, Orders, Checkout, and Admin Overview remain intentionally unimplemented for their approved later milestones. Final client photography, logo, and policy content remain controlled content handoffs.
