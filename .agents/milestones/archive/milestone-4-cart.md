# Milestone 4: Cart

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2026-08-28
**Depends On:** Milestone 3; starts from `1f2be3e`
**Target Pull Request:** —
**Target Branch:** `main`
**Merge Mode:** Manual
**Merge Method:** squash
**Superseded By:** —

## Goal

Deliver the complete client-owned Cart experience from the definitive Paper designs: wire Product Detail Add to Cart, persist only stable variant identifiers and quantities, resolve current catalogue truth on the server, present the responsive Cart preview, and implement the dedicated `/cart` page with populated, empty, and invalid-line states. Preserve Checkout as the next Orders-owned destination without implementing order creation in this milestone.

## Design authority

- Paper Final Site is definitive for Perfume Detail + Cart desktop/mobile, Full Cart desktop/mobile, and Empty Cart desktop compositions.
- Relevant Final Site frames are `04 · Perfume Detail + Cart · D · /perfume/{slug}`, `05 · Full Cart · Desktop`, `11 · Cart · Empty · Desktop`, `15 · Perfume Detail + Cart · M · /perfume/{slug}`, and `16 · Full Cart · Mobile`.
- Paper Workspace supplies the Cart & Order component family. Use Paper MCP `get_jsx`, computed styles, and fill images where relevant for implementation values; use screenshots for visual verification only and do not modify Paper.
- Repository behavioural authority is `documentation/pages/public/04-cart.md`, `documentation/components/05-cart-and-order.md`, and the entity, query, mutation, state-transition, responsive, accessibility, configuration, and cross-page-flow registries.

## Required behaviour

### Cart state and catalogue resolution

- Cart is client-side only and stores one versioned browser payload containing lines with exactly `perfumeVariantId` and positive integer `quantity`. Do not duplicate perfume name, slug, size, image, or price in persisted Cart state.
- Hydration is defensive: malformed, unknown-version, duplicate, or invalid lines cannot crash rendering. Same-variant additions merge into one line.
- Add one direct server-owned `resolveCartItems` read that accepts the minimal Cart identifiers/quantities and returns a plain serializable projection of current Published Perfume, variant, authorized primary image or controlled placeholder, current unit price, current stock, requested quantity, line amount, and explicit validity/issue state.
- Current catalogue truth controls quantity limits and totals. Missing/unpublished, removed, zero-stock, and over-quantity lines remain visible with an actionable explanation and block Checkout until removed or reduced. They are not silently discarded or silently clamped during ordinary re-resolution.
- Derived Cart count is the sum of stored quantities; subtotal is the sum of valid current-price lines only. Cart does not reserve stock.

### Add to Cart and preview

- Wire the existing Perfume Detail size/quantity controls to the Cart. Multiple available sizes still require explicit selection; a single available size remains preselected. Add to Cart does not navigate away.
- Successful addition opens one accessible responsive Cart preview: a right-side drawer on desktop and a bottom sheet on mobile, matching the designed hierarchy. The surface shows the newly resolved Cart, quantity controls, removal, subtotal, Checkout, View Full Cart, and Keep/Continue Browsing.
- The header Cart utility displays the live quantity count and opens the preview when non-empty; `/cart` remains reachable as the dedicated full Cart page. Empty utility activation may navigate to `/cart` rather than opening an empty overlay.
- The preview traps focus, closes on Escape/close/Keep Browsing, restores focus, prevents underlying scroll, and announces Cart/quantity changes. Do not create separate desktop and mobile Cart stores or duplicate business logic.

### Full Cart route

- Implement public `/cart` with the designed desktop two-column list/summary composition and mobile stacked composition.
- Populated Cart supports quantity changes within current stock, removal, subtotal/item count, Continue Browsing to `/perfumes`, and a Checkout action targeting `/checkout`.
- Empty Cart is a state of `/cart`, not a separate route, and offers Browse Perfumes plus Find My Scent.
- Invalid lines show their issue and resolution action; Checkout is semantically and functionally disabled while any line is invalid, with a visible explanation.
- Persistence survives normal public navigation and reload. Storage events synchronize the Cart count/content between same-origin tabs where practical without adding a state-management dependency.

## Ownership and source shape

- `src/features/cart` owns the one Cart provider/store boundary, versioned persistence parsing, resolved Cart projection/read, preview, line presentations, summary, and focused tests. Keep cohesive code together; do not split every function or component into a separate file.
- `src/components/shared/public/PublicShell.tsx` consumes the Cart boundary for the live utility and responsive preview while retaining its existing navigation responsibilities.
- `src/features/catalogue/PublicControls.tsx` consumes the narrow Add-to-Cart operation; catalogue remains owner of variant selection presentation and catalogue reads.
- `/cart` route owns only page composition. Reuse proven leaf pieces, but do not build a universal line-item or modal abstraction with flag-heavy APIs.
- Reuse the existing Dialog/shadcn primitive, ModalShell where suitable, currency formatter, public image projection conventions, route configuration, theme tokens, and catalogue types. Add no state-management or client-fetching dependency.

## Constraints

- Follow `AGENTS.md`, approved documentation, archived milestone decisions, and existing project patterns.
- Use one GPT-5.6 Terra Medium implementation agent on shared local `main`; commit the complete milestone locally but do not push. The Sol orchestrator independently reviews and pushes after every gate passes.
- Preserve completed Admin catalogue and public discovery behaviour. Server rendering remains the default outside the necessary Cart client island.
- Use current browser storage only; do not introduce a database Cart, customer account, anonymous session service, cookie Cart, stock reservation, API layer, repository abstraction, or speculative expiry mechanism.
- Do not inspect or print secret environment files. Local Supabase is the integration target and must remain the source of catalogue truth.
- Keep Checkout owned by the Orders milestone. The Cart may link to configured `/checkout`, but must not create Orders, decrement stock, collect customer details, clear Cart, or open WhatsApp.

## Explicitly out of scope

- Checkout page implementation, Order creation, confirmation, order references, WhatsApp handoff, inventory decrement, Admin Orders, or Admin Overview.
- Online payment, user accounts, server-side Cart persistence, stock reservation, delivery calculation, discounting, promotion codes, tax machinery, saved carts, wishlists, or analytics.
- Catalogue/Admin redesign or unrelated refactoring.

## Required tests

1. Persistence parsing/versioning handles valid, malformed, duplicate, invalid-quantity, and unsupported-version payloads without duplicating catalogue display state.
2. Add/merge, quantity change, removal, clear, count, and reload behaviour preserve the minimal Cart contract and do not silently exceed resolved current stock.
3. `resolveCartItems` enforces Published catalogue access, preserves requested line order, resolves current price/stock/image data, and classifies missing, unavailable, and over-quantity lines correctly.
4. Cart preview opens after Add to Cart, uses one responsive dialog surface, exposes all designed actions, supports keyboard/Escape/focus return, and announces changes.
5. `/cart` renders populated and empty states, calculates valid subtotal/count, blocks Checkout with invalid lines, and supports removal/quantity recovery.
6. Existing catalogue/Admin/auth tests remain green; Prisma generate/validate, ESLint, TypeScript, focused tests, local Supabase-backed Cart smoke behaviour, and production build pass.
7. The orchestrator visually compares all named desktop/mobile Paper frames, exercises responsive reflow at representative widths, reload persistence, and checks the latest browser console before approval.

## Acceptance criteria

- [x] Product Detail Add to Cart persists the selected variant/quantity and opens the correct responsive preview without navigation.
- [x] One minimal client Cart state drives the header count, preview, and `/cart`; persisted lines contain only variant identifier and quantity.
- [x] Cart presentation always re-resolves current server catalogue truth and handles invalid lines explicitly without stale duplicated display state.
- [x] Drawer, bottom sheet, populated Full Cart, and Empty Cart match the approved Paper hierarchy and are responsive and accessible.
- [x] Quantity, removal, subtotal, persistence, multi-tab synchronization, invalid-line recovery, and Checkout blocking work as specified.
- [x] Checkout/Orders/payment behaviour and unnecessary abstractions/dependencies remain out of scope.
- [x] Existing functionality and required automated, local-platform, browser-console, responsive, and Paper visual verification pass.
- [x] The orchestrator records an independent review of the exact milestone commit before push.

## Manual tasks

None required.

## Manual acceptance criteria

- [ ] Freeman may confirm the completed Cart experience visually after the orchestrator's verified implementation pass.

## Completion Record

**Implementation Outcome:** Complete local implementation: one versioned browser Cart payload with minimal UUID variant IDs/quantities, defensive parsing/storage synchronization and storage-denial guards; a direct server-owned catalogue resolver which independently rejects malformed IDs before database access; Product Detail add/merge with known-stock caps; responsive preview; live header utility; and populated, empty, resolving, failure, and invalid `/cart` states. Checkout only links to the configured route and creates no Order or stock mutation.
**Important Decisions:** Cart state remains client-owned in `src/features/cart`; catalogue display data is re-resolved by a server action for every Cart-state change and never enters local persistence. Resolution mismatch/failure blocks Checkout visibly. The responsive preview is one flex Dialog composition styled as a desktop right drawer and content-height mobile bottom sheet with a compact preview subtotal.
**Contract Deviations:** Cart clearing remains intentionally deferred to successful Order creation in Milestone 5, consistent with this contract's explicit prohibition on clearing Cart before Orders exist. GitHub CLI authentication remains unavailable to `fmw`, but this direct-main workflow has no Pull Request and Git push authentication is functional.
**Verification Summary:** On exact head `4cdc1693f45260f492a4a5a690f055b602ed6a3f`, Prisma validate/generate, zero-warning ESLint, TypeScript, production build, and all 35 Vitest tests pass. Focused Cart tests cover defensive/versioned persistence including denied browser storage and malformed UUIDs, capped merge/remove/count storage, resolver order/current price/stock and missing/unavailable/over-quantity classifications, preview opening/Escape/focus return, and invalid Checkout blocking. Local Supabase core Docker services are healthy. The orchestrator exercised live add, preview, reload persistence, quantity/removal, Full Cart, Empty Cart, malformed storage, valid-but-missing variants, and Checkout blocking; compared 1440px/390px results with all definitive Paper Cart frames; and confirmed zero current browser-console errors.
**Review Outcome:** APPROVE — no blocker, high, medium, or low findings remain after three focused correction passes.
**Reviewed Head:** `4cdc1693f45260f492a4a5a690f055b602ed6a3f`
**Pull Request:** —
**Merge Commit:** —
**Follow-up Notes:** Milestone 5 must invoke a Cart clear operation only after server-confirmed Order creation. Checkout, Orders, confirmation, stock decrement, and WhatsApp remain intentionally unimplemented here.
