# Decision, Assumption, and Risk Log

## Approved/confirmed

- Customer terminology is Perfumes, with `/perfumes` and `/perfume/{slug}`.
- Confirmation is `/checkout/confirm`; Help Me Choose uses one route.
- Current conversion is a saved Order with a reference; no online payment.
- Checkout belongs to Orders; Cart remains a client-side feature.
- Features are limited to catalogue, cart, and orders.
- CartItem stores only variant identifier and quantity.
- OrderItem references Order and PerfumeVariant; descriptive product state is not copied.
- OrderItem retains immutable placed price to keep historical totals correct.
- PerfumeVariant stores quantity; availability is derived.
- Recommendation attributes are controlled enum arrays with multiple selection.
- Shared `ModalShell` standardises modal anatomy without becoming a configuration engine.
- Local Supabase through Docker hosts development data/Auth/Storage; Prisma ORM 7 owns application schema, migrations, generated client, and database connection.
- Supabase Auth protects Admin and Supabase Storage owns product images.
- The only accepted Admin identity is the JPScents email preserved in the submitted client record, and it must also carry the trusted Supabase Admin role.
- Admin sign-in is passwordless through a Supabase email magic link. Requests never create users; `/auth/confirm` rechecks the exact email and trusted role before entering Admin.
- No client catalogue was supplied. Empty data is the launch baseline; placeholder products are opt-in local demo fixtures only.

## Assumptions requiring confirmation

- Nigerian locale/currency and whole-Naira presentation.
- `mL` is the only first-release size unit.
- The proposed Occasion values and `DATE_NIGHT` naming are the final content taxonomy.
- Related Perfumes are ranked by shared attributes using a simple deterministic rule.
- Featured may contain multiple Perfumes; Bestseller is at most one.
- The designed Admin status set is sufficient for launch.

## Open launch handoffs

- production Auth-user provisioning, exact callback allowlist, and SMTP handoff for the already-confirmed Admin email;
- image limits, ordering, and deletion/retirement rules;
- deployment target;
- exact reference format and collision strategy;
- allowed Order status transition matrix and whether cancellation restores quantity;
- confirmation URL token shape/retention;
- final WhatsApp number and message wording;
- reconcile public `Evening` wording with Admin `Date night` enum choice;
- whether Orders export is in initial scope;
- final client logo, photography, catalogue, FAQ, and delivery content.

## Principal risks

- historical Order presentation changes when current Perfume descriptive data changes; this is an accepted consequence of the no-description-snapshot decision;
- no cart reservation means quantity can change before checkout; server revalidation and clear recovery are mandatory;
- deleting a referenced PerfumeVariant would break historical lookups, so referenced variants require soft retirement or deletion prevention;
- confirmation privacy fails if reference alone grants access;
- placeholder assets can be mistaken for approved content unless visibly tracked.
