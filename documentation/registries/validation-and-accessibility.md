# Validation and Accessibility Registry

## Validation

- Perfume: unique usable slug, required public content, controlled enum arrays, valid publication prerequisites.
- Variant: positive size, supported unit, non-negative integer price and quantity, unique size per Perfume.
- Cart: positive integer line quantity, not above currently resolved quantity, valid published parent and variant.
- Checkout: required name, normalized WhatsApp number, valid normalized optional email, Nigerian state, mapped city or `Other` custom city (maximum 80 characters), delivery address, and at least one valid Cart line.
- Customer identity: checkout creates only when neither identifier exists; it updates a WhatsApp-matched Customer, retains email when omitted, and rejects conflicting WhatsApp/email ownership without merging records.
- Order creation: repeat all catalogue, price, quantity, and publication checks on the server; enforce idempotency.
- Customer Admin writes: authenticated; unique normalized WhatsApp and optional email; deletion is blocked when Order history exists.
- Admin status and merchandising writes: authenticated, authorised, and constrained to valid values/eligible Perfumes. Cancellation is a separate explicit confirmation action.

## Accessibility

- Semantic landmarks and heading order for public and Admin shells.
- Every control has a visible label or accessible name; errors are associated with their fields.
- Keyboard operation, visible focus, and minimum touch target sizes for filters, selectors, quantities, menus, and Cart actions.
- Modal/drawer/sheet focus trap, Escape/close behaviour, focus restoration, correct dialog naming, and background inertness.
- Selection is never conveyed by colour alone; scent cards retain border/check/label cues.
- Product and scent imagery requires meaningful alt text; decorative imagery uses empty alt text.
- Status, errors, Cart-count updates, and submission feedback use appropriate live announcements without excessive interruption.
- Disabled/unavailable controls expose the reason and are not only visually muted.

## Privacy/security

- Order confirmation requires an unguessable access token; a human-readable reference alone is insufficient.
- Admin routes and writes require both a configured primary/optional-secondary Admin email and trusted Supabase Admin app metadata.
- Avoid customer details in URLs, logs, analytics, or WhatsApp links beyond the user-approved message content.
- Upload validation and storage rules must be defined with the selected image provider.
