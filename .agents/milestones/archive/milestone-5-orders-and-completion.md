# Milestone 5: Orders and Completion

**Status:** Complete
**Version:** 1.0.0
**Last Updated:** 2026-08-28
**Completed:** 2026-08-28
**Depends On:** Milestone 4; starts from `2afde8f`
**Target Pull Request:** —
**Target Branch:** `main`
**Merge Mode:** Manual
**Merge Method:** squash
**Superseded By:** —

## Goal

Complete JPScents end to end with the cohesive Orders feature: public Checkout, atomic saved Order creation, secure Order Confirmation and WhatsApp handoff, protected Admin Orders list/detail/status operations, and the operational Admin Overview. Finish integration, responsive/accessibility verification, and local Supabase-backed workflows without adding payment, customer accounts, or speculative infrastructure.

## Design authority

- Paper Final Site is definitive for Checkout and Order Confirmation desktop/mobile frames at `/checkout` and `/checkout/confirm`.
- Paper Final Admin is definitive for Overview, Overview + Bestseller Selector, Orders list desktop/mobile, and Order Detail desktop/mobile.
- Use Paper MCP `get_jsx`, computed styles, and fill images for implementation values and screenshots only for verification. Do not modify Paper.
- Repository behavioural authority is `documentation/pages/public/05-checkout.md`, `06-order-confirmation.md`; `documentation/pages/admin/01-overview.md`, `04-orders.md`, `05-order-detail.md`; component references for Cart & Order, Form Controls, Admin Operations, Bestseller Selection; domain contracts and cumulative registries.

## Required behaviour

### Orders data and server operations

- Keep the approved existing Prisma models: Order, OrderItem, and OrderStatusEvent. Do not duplicate product name, slug, size, or image on OrderItem; retain placed `unitPriceMinor` as the transactional price fact and resolve display through the restricted variant/perfume relation.
- Implement only the confirmed cohesive operations: `createOrder`, `getOrderConfirmation`, `listOrders`, `getOrderByReference`, `updateOrderStatus`, and `getAdminOverview`. Reuse the existing eligible-Bestseller read/action rather than creating another merchandising layer.
- `createOrder` accepts the minimal Cart lines, server-validated checkout input, and a client-generated idempotency/submission key. It never trusts client price, subtotal, publication, or stock facts.
- In one database transaction, re-read Published Perfumes/variants, validate every requested quantity, conditionally decrement current stock so concurrent orders cannot oversell, create the Order and OrderItems, and create the initial `NEW` status event. Any conflict rolls back all writes and returns an actionable Cart/stock error.
- Duplicate submission keys return the already-created Order and never decrement stock twice. Generate a unique human-readable `JP-` reference and a cryptographically unguessable confirmation token without exposing either private customer data or tokens in logs/URLs.
- No payment is taken. Order cancellation does not automatically restore stock in this phase; Admin adjusts catalogue quantity deliberately. All four designed statuses may be selected by an authorized Admin; an unchanged status creates no duplicate event.

### Checkout `/checkout`

- Build the Paper-aligned desktop form-plus-summary and mobile single-column compositions over current resolved Cart data.
- Collect required full name, WhatsApp number, delivery area, delivery address; optional email and order note. Because client delivery-area values are unconfirmed, use a clearly labelled required free-text area field rather than fabricating locations; keep the control replaceable by configured options later without a generic form framework.
- Apply accessible client feedback and authoritative server validation. Normalize a plausible international/Nigerian WhatsApp number safely, validate optional email, trim lengths, reject empty/invalid Cart, and associate field/form errors with controls.
- Disable duplicate submissions. On recoverable failure, preserve form values and Cart; never decrement partial stock, clear Cart, navigate, or open WhatsApp.
- On server-confirmed success only, set secure confirmation access, clear the client Cart through its existing owner, and navigate to `/checkout/confirm`. Empty/unresolved/invalid Cart shows a clear recovery path to `/cart`.

### Confirmation `/checkout/confirm`

- Store the confirmation token in a short-lived HttpOnly, SameSite=Lax cookie (secure in production); never put it or customer details in a URL. Reference alone must not authorize Order access.
- `getOrderConfirmation` reads only that token and returns a public-safe projection: reference, placed item prices/quantities with resolved catalogue display, subtotal, and next steps. Refresh/direct access works while the cookie is valid; missing/invalid access renders a privacy-safe recovery state.
- Render the Paper success/reference, summary, next-steps, Copy Reference, Continue on WhatsApp, and Continue Browsing states. Cart is already clear before the page renders.
- Generate a correctly encoded WhatsApp URL/message containing the Order reference and concise item context. The business number is a documented non-secret server configuration value. If absent, preserve the saved Order/reference and visibly disable only the WhatsApp launch rather than inventing a recipient.

### Protected Admin Orders

- `/admin/orders` reads newest first, supports direct URL-backed search by reference/customer/phone and the four approved status filters, and renders the definitive desktop fixed-lane table plus mobile cards. Do not implement Export Orders; it is not required by product authority.
- `/admin/orders/{reference}` shows protected customer/delivery/note data, placed-price items/subtotal, current status, ordered activity history, and customer WhatsApp continuation. Missing Orders return an Admin-safe not-found state.
- Every Orders Admin read/write remains behind the existing Supabase Admin identity boundary. Status updates validate the enum server-side, atomically write one event with from/to status, revalidate affected Admin routes, and expose explicit success/failure feedback.
- Customer WhatsApp continuation uses the normalized customer number and reference/item context. Never expose protected details to public caches, query strings, console output, or analytics.

### Admin Overview and final integration

- Replace the placeholder `/admin` with the designed operational composition: Orders awaiting action (`NEW` + `AWAITING_PAYMENT`), available Published Perfumes, zero-stock variants, Orders in the current Monday-based week, three recent Orders, catalogue attention, and current Bestseller.
- Reuse the existing Bestseller selector and action. Update candidate order counts from actual OrderItems and revalidate `/admin` when Bestseller changes; do not add charts, revenue analytics, or a separate analytics feature.
- Preserve desktop Overview hierarchy and provide a calm stacked mobile layout using existing Admin patterns. Links go to the confirmed Admin routes.
- Complete all approved public/Admin routes and cross-page flows. Remove staging/placeholder implementation copy that claims unfinished functionality, while retaining controlled product/brand/content placeholders whose client facts are genuinely unconfirmed.

## Ownership and source shape

- `src/features/orders` owns validation, order creation/reads/status operations, Checkout/Confirmation/Admin order presentations, WhatsApp URL construction, and focused tests. Keep cohesive modules; split only public form, Admin presentations, and server operations where client/server boundaries require it.
- `src/features/cart` gains only the narrow `clearCart` operation consumed after confirmed Order creation; Cart remains client-owned and must not import Orders.
- Route files own access, search-parameter normalization, not-found/redirect boundaries, and composition only.
- Admin Overview may compose Orders reads with existing Catalogue reads/components at the route boundary. Update the existing catalogue candidate projection directly for actual order counts; do not create a cross-feature service/repository layer.
- Reuse existing shells, Dialog/ModalShell, currency formatter, ProductBottlePlaceholder/image conventions, theme tokens, site configuration, Prisma/Supabase clients, Admin auth, and route builders. Add no form/state/query library unless an unavoidable current requirement is proven.

## Constraints

- Follow `AGENTS.md`, approved documentation, all archived milestones, local Supabase/Prisma rules, and existing project patterns.
- Use one GPT-5.6 Terra Medium implementation agent on shared local `main`; commit locally but do not push. The Sol orchestrator independently reviews exact-head correctness, security, transactions, design, and end-to-end behaviour before push.
- Prefer direct server actions/reads and small client islands. No API controller layer, repositories, service classes, generic DTO mapping framework, event bus, queue, payment adapter, or workflow engine.
- Never inspect or output secret environment files/values. Add only documented variable names to `.env.example`. No secret/token/customer data may enter source, tests, output, URLs, or commits.
- Existing catalogue, Cart, Admin auth/storage, and public discovery behavior must remain intact. Product image storage remains private and server-authorized.
- Exact client business number, final delivery areas, final photography/logo/policy copy, production Supabase, and deployment remain controlled handoffs, not invented implementation facts.

## Explicitly out of scope

- Online payment, payment provider code, customer accounts, stock reservation, automatic cancellation restock, courier/delivery pricing, tax, discounts, invoices, email/SMS systems, CRM, accounting, logistics, export/reporting, charts, or advanced analytics.
- Pagination before proven volume, background jobs, webhooks, queues, AI recommendations, notification infrastructure, or generic audit logging beyond OrderStatusEvent.
- Redesigning completed Catalogue/Cart surfaces or unrelated refactoring.

## Required tests

1. Checkout validation covers required/optional fields, length/email/phone normalization, invalid/malformed Cart input, and field/form error mapping without leaking private data.
2. Order creation proves authoritative current price/publication/stock checks, atomic conditional decrement plus Order/items/initial event, multi-item totals, rollback on any conflict, idempotent duplicate submission, and unique reference/token behavior.
3. Confirmation access proves token-cookie authorization, reference-only rejection, public-safe projection, refresh/recovery states, Cart clear only after success, reference copying, and configured/unconfigured WhatsApp handoff encoding.
4. Admin reads prove search/status normalization, newest-first projections, protected Order detail/activity, Overview counts/current-week/recent/catalogue attention, and actual Bestseller candidate order counts.
5. Admin mutations prove authorization, valid/invalid/unchanged status handling, status-event atomicity, no automatic cancellation restock, and affected route revalidation.
6. Checkout/Confirmation/Admin Orders/Overview component tests cover designed populated, empty/failure, responsive presentation boundaries, validation feedback, duplicate-submit blocking, and keyboard/accessibility semantics.
7. Existing Platform/Catalogue/Cart tests remain green; migration state, Prisma validate/generate, ESLint, TypeScript, all focused tests, deterministic local seed, and production build pass.
8. The orchestrator completes a real local Supabase purchase flow, verifies stock decrement/idempotency/confirmation/reload/Cart clearing, exercises authorized Admin flows as access permits, compares every named Paper frame at 1440px/390px, and checks the latest browser console.

## Acceptance criteria

- [x] A valid multi-item Cart can create exactly one saved Order/reference, atomically decrement stock, clear after success, and render secure refreshable confirmation before WhatsApp.
- [x] Invalid, changed, concurrent, failed, and duplicate submissions behave safely and recoverably without partial writes, duplicate Orders, or lost Cart/form state.
- [x] Checkout and Confirmation match the approved desktop/mobile hierarchy, validate accessibly, expose no payment flow, and degrade safely when WhatsApp configuration is absent.
- [x] Protected Admin Orders list/detail/status/activity and WhatsApp continuation work with responsive Paper-aligned desktop/mobile presentations.
- [x] Admin Overview is operational and data-backed, reuses the existing Bestseller selection, and contains no unjustified analytics/export machinery.
- [x] All approved routes, feature boundaries, models, minimal queries/mutations, shared components, and critical customer/Admin flows are complete without unnecessary layers or dependencies.
- [x] Existing behavior and required automated, transaction, local-platform, security/privacy, browser-console, responsive, and Paper visual verification pass.
- [x] The orchestrator records an independent review of the exact milestone commit before push.

## Manual tasks

1. Before a real customer deployment, configure the client-confirmed JPScents WhatsApp business number and final delivery-area policy.
2. Provision the first production Supabase Auth user with trusted `app_metadata.role = "admin"` using the provider's secure Admin workflow.

## Manual acceptance criteria

- [ ] Freeman may confirm the completed public purchase and Admin operations visually after the orchestrator's verified local implementation pass.
- [ ] The client confirms the real WhatsApp recipient, delivery-area wording/options, final catalogue imagery/logo, and remaining policy copy before launch.

## Completion Record

**Implementation Outcome:** Complete. JPScents now has transaction-backed Checkout and saved Orders, secure refreshable Confirmation, safe WhatsApp handoff, protected Admin Orders list/detail/status/activity, data-backed Admin Overview, real Bestseller order counts, and the success-only Cart clear. The final orchestrator pass also added concise readable references, controlled image fallbacks, graceful missing-Auth configuration handling, dynamic protected routes, and suppression of Server Function argument logging because Checkout input contains private customer data.
**Important Decisions:** Confirmation access uses a 24-hour HttpOnly SameSite=Lax cookie scoped to `/checkout/confirm`; references use seven ambiguity-resistant cryptographic characters after `JP-`; malformed or absent business WhatsApp configuration disables only the handoff; cancellation deliberately does not restock; delivery area remains required free text until the client confirms maintained options.
**Contract Deviations:** No product-scope deviation. A live authenticated Admin browser session was not possible because the local Supabase publishable key/Admin identity are not configured in the process environment; the protected redirect, missing-configuration recovery, authorization boundary, Admin operations, and responsive presentations were verified through route, component, action, and domain tests. Production Admin provisioning remains the documented manual task.
**Verification Summary:** Exact reviewed head `4bb97ddb03920f7a2aec95e5631d0fd18e08ab75` passes zero-warning ESLint, TypeScript, all 47 Vitest tests, Prisma validate/generate, and the production build. Local Supabase Docker services are healthy. A real two-item browser purchase created one `NEW` Order and initial event with placed prices totaling ₦2,900, decremented the two source variants from 12→11 and 10→9, cleared Cart only after success, survived confirmation reload, rejected direct confirmation access after cookie removal, preserved form/Cart on validation failure, and exposed no browser-console errors. Checkout and Confirmation were compared against Paper at 1440px and 390px; responsive overflow, summaries, imagery/fallbacks, actions, privacy recovery, and unconfigured WhatsApp states were checked. Server Function invocation logging was verified disabled.
**Review Outcome:** APPROVE — the Sol orchestrator reviewed the full milestone diff through exact head, required four focused agent correction passes plus final local amendments, and found no remaining blocker, high, medium, or low findings.
**Reviewed Head:** `4bb97ddb03920f7a2aec95e5631d0fd18e08ab75`
**Pull Request:** —
**Merge Commit:** —
**Follow-up Notes:** Configure the client-confirmed WhatsApp number, delivery policy, final content/assets, production Supabase environment, and first trusted production Admin before launch. Online payment remains intentionally out of scope.
