# JPScents Design Extraction Checklist

## Working rules

- [ ] Process one logical unit at a time.
- [ ] Treat desktop, mobile, overlays, modals, and empty/error states as variants of the same unit.
- [ ] Extract only what the design or approved product behaviour supports.
- [ ] Separate confirmed facts from assumptions and open decisions.
- [ ] Update the cumulative registries after every unit.
- [ ] Keep each extraction concise and structured.
- [ ] Pause for Freeman’s approval before continuing to the next unit.
- [ ] Do not create implementation tasks or delegate development during extraction.

## Approved terminology and routes

- [x] Replace catalogue-destination “Shop” with “Perfumes”.
- [x] Update public navigation, footers, CTAs, breadcrumbs, and related states.
- [x] Catalogue route: `/perfumes`
- [x] Product route: `/perfume/{slug}`
- [x] Order confirmation route: `/checkout/confirm`
- [x] Design Agent completed and visually checked the Paper updates.
- [ ] Extract and confirm all remaining routes during their page passes.

## Extraction template for every unit

### Identity

- [ ] Unit name
- [ ] Source page and frames
- [ ] Route, if applicable
- [ ] Public, protected, or UI-only
- [ ] Purpose

### Data and domain

- [ ] Entities used
- [ ] Relationships implied
- [ ] Data displayed
- [ ] Data entered
- [ ] Derived/calculated data
- [ ] Configuration dependencies

### Behaviour

- [ ] Queries/reads implied
- [ ] Mutations/writes implied
- [ ] User actions
- [ ] State transitions
- [ ] Navigation outcomes
- [ ] Persistence requirements
- [ ] Failure and empty states

### Components

- [ ] Reused component families
- [ ] Page-specific components
- [ ] Component variants
- [ ] Components that should remain local
- [ ] Potential duplication requiring later review

### Presentation

- [ ] Desktop composition
- [ ] Mobile composition
- [ ] Responsive differences
- [ ] Interaction states
- [ ] Theme/style dependencies
- [ ] Content and asset dependencies

### Quality requirements

- [ ] Validation rules
- [ ] Accessibility requirements
- [ ] Loading and feedback behaviour
- [ ] Security/privacy implications
- [ ] Open decisions
- [ ] Assumptions
- [ ] Cumulative registries updated
- [ ] Freeman approved extraction

## Cumulative registries

Update these after every extraction:

- [ ] Route and page registry
- [ ] Entity/model registry
- [ ] Relationship registry
- [ ] Component and variant registry
- [ ] Query/read registry
- [ ] Mutation/write registry
- [ ] State-transition registry
- [ ] Theme and token registry
- [ ] Responsive-rule registry
- [ ] Validation and accessibility registry
- [ ] Asset and content registry
- [ ] Application configuration registry
- [ ] Cross-page flow registry
- [ ] Assumption and decision log

# Extraction order

## Phase 1 — Application foundations

### 1. Theme, design foundations, assets, and configuration

- [x] Colour roles
- [x] Typography families, weights, and hierarchy
- [x] Resolve intended use of Inter versus remaining System Sans references
- [x] Spacing and layout rhythm
- [x] Borders, radii, and shadows
- [x] Responsive widths and composition rules
- [x] Availability, success, warning, and error treatments
- [x] Button and link conventions
- [x] Product-image conventions
- [x] Logo and placeholder-asset status
- [x] Currency formatting
- [x] WhatsApp configuration
- [x] Order-reference configuration
- [x] Other application-wide constants
- [x] Convert the foundations into a preliminary implementation token registry

### 2. Navigation & Shells component family

- [ ] Public desktop header
- [ ] Public mobile header/menu
- [ ] Cart utility and count
- [ ] Public footer
- [ ] Admin desktop sidebar/topbar
- [ ] Admin mobile header/menu
- [ ] Public versus Admin shell ownership

## Phase 2 — Public component families

### 3. Product Cards

- [ ] Desktop gallery card
- [ ] Desktop catalogue card
- [ ] Mobile gallery card
- [ ] Mobile catalogue/list card
- [ ] Price, availability, label, image, and CTA variants

### 4. Scent Character

- [ ] Browse mode
- [ ] Select mode
- [ ] Desktop variants
- [ ] Mobile variants
- [ ] Default and selected states
- [ ] Shared imagery and content requirements

### 5. Commerce Controls

- [ ] Catalogue filter chips
- [ ] Size selector
- [ ] Default, selected, and unavailable size states
- [ ] Quantity control
- [ ] Availability indicator
- [ ] Primary and secondary commerce actions

### 6. Cart & Order

- [ ] Cart item variants
- [ ] Drawer/bottom-sheet cart item
- [ ] Full-cart item
- [ ] Cart summary
- [ ] Checkout summary
- [ ] Confirmation summary
- [ ] Quantity, removal, subtotal, and invalid-item states

### 7. Form Controls

- [ ] Customer text field
- [ ] Select field
- [ ] Textarea
- [ ] Optional/required treatment
- [ ] Validation and error states
- [ ] Admin fields
- [ ] Admin tags
- [ ] Toggles and secondary actions

## Phase 3 — Public pages and flows

### 8. Perfumes catalogue

Includes desktop, mobile, filters, and no-results state.

- [ ] `/perfumes`
- [ ] Catalogue query/filter behaviour
- [ ] Product-card composition
- [ ] Availability presentation
- [ ] No-results state
- [ ] Route-backed filter decisions

### 9. Perfume Detail

Includes desktop, mobile, recommendations, cart drawer, and bottom sheet.

- [ ] `/perfume/{slug}`
- [ ] Perfume and variant data
- [ ] Required size selection
- [ ] Quantity and Add to Cart
- [ ] Related perfumes
- [ ] Desktop cart drawer
- [ ] Mobile cart bottom sheet
- [ ] Overlay behaviour and accessibility

### 10. Full Cart

Includes desktop, mobile, and empty state.

- [ ] Route confirmation
- [ ] Cart persistence
- [ ] Quantity updates
- [ ] Item removal
- [ ] Subtotal
- [ ] Invalid/unavailable item handling
- [ ] Empty-cart state
- [ ] Checkout eligibility

### 11. Checkout

Includes desktop and mobile.

- [ ] Route confirmation
- [ ] Contact details
- [ ] Delivery details
- [ ] Order review
- [ ] Validation
- [ ] Server-side cart revalidation
- [ ] Order creation
- [ ] Duplicate-submission protection
- [ ] Failure recovery

### 12. Order Confirmation

Includes desktop and mobile.

- [ ] `/checkout/confirm`
- [ ] Confirmation access/state requirements
- [ ] Human-readable order reference
- [ ] Order summary
- [ ] WhatsApp handoff
- [ ] Refresh/direct-access behaviour
- [ ] Cart-clearing point
- [ ] Continue-browsing path

### 13. Help Me Choose

Includes preferences and results on desktop and mobile.

- [ ] Preferences route
- [ ] Results route or state decision
- [ ] Preference data structure
- [ ] Deterministic matching behaviour
- [ ] Ranking and availability rules
- [ ] Adjust-preferences flow
- [ ] No-match behaviour
- [ ] Reuse of Scent Character and Product Cards

### 14. Homepage

Extract after its dependent components and flows are understood.

- [ ] `/`
- [ ] Featured/Bestseller hero
- [ ] Available perfumes
- [ ] Browse by scent character
- [ ] Help Me Choose preview
- [ ] Ordering steps
- [ ] FAQs/reassurance
- [ ] Closing CTA
- [ ] Homepage merchandising configuration

## Phase 4 — Admin component families

### 15. Admin Operations

- [ ] Desktop toolbar
- [ ] Search and filter controls
- [ ] Fixed-lane perfume rows
- [ ] Desktop order rows
- [ ] Order-status variants
- [ ] Mobile order cards
- [ ] Responsive table-to-card behaviour

### 16. Perfume Editor

- [ ] Configured state
- [ ] Empty/create state
- [ ] Product details
- [ ] Images
- [ ] Recommendation attributes
- [ ] Featured state
- [ ] Preview behaviour

### 17. Variant Management

- [ ] Variant list
- [ ] Populated and empty states
- [ ] Add-variant modal
- [ ] Edit-variant modal
- [ ] Size and measurement-unit handling
- [ ] Price and availability handling

### 18. Bestseller Selection

- [ ] Current Bestseller summary
- [ ] Searchable selection modal
- [ ] Single-selection behaviour
- [ ] Availability/publish eligibility
- [ ] Replacement behaviour

## Phase 5 — Admin pages and flows

### 19. Admin Perfumes

- [ ] Route and protection
- [ ] Catalogue list
- [ ] Search and filters
- [ ] Create Perfume entry
- [ ] Edit Perfume entry
- [ ] Availability and merchandising summary

### 20. Create/Edit Perfume

Includes create, edit, Add Variant modal, and Product Preview modal.

- [ ] Route structure
- [ ] Create versus edit behaviour
- [ ] Save/publish lifecycle
- [ ] Image management
- [ ] Recommendation attributes
- [ ] Variant management
- [ ] Featured/Bestseller controls
- [ ] Product preview
- [ ] Validation and unsaved-change handling

### 21. Admin Orders

Includes desktop and mobile list/detail.

- [ ] Route structure
- [ ] Order search and filtering
- [ ] Order summary rows/cards
- [ ] Order Detail
- [ ] Customer and delivery information
- [ ] Order items and snapshots
- [ ] Status updates
- [ ] Activity history
- [ ] Admin WhatsApp continuation
- [ ] Mobile operational behaviour

### 22. Admin Overview

Includes normal state and Bestseller selector overlay.

- [ ] Route and protection
- [ ] Operational summary counts
- [ ] Recent orders
- [ ] Catalogue-attention summary
- [ ] Featured/Bestseller summary
- [ ] Bestseller selector
- [ ] Remove unjustified analytics

## Phase 6 — Consolidation

- [ ] Review every public frame.
- [ ] Review every Admin frame.
- [ ] Review every component-family frame.
- [ ] Verify every frame is assigned to an extraction unit.
- [ ] Deduplicate components.
- [ ] Remove premature abstractions.
- [ ] Confirm shared versus public-only versus Admin-only ownership.
- [ ] Confirm complete route registry.
- [ ] Confirm complete entity/model registry.
- [ ] Confirm queries and mutations.
- [ ] Confirm theme and configuration.
- [ ] Confirm cross-page customer flow.
- [ ] Confirm Admin operational flow.
- [ ] Resolve or explicitly defer every open decision.
- [ ] Produce the approved development structure.
- [ ] Only then create the implementation workflow and implementation tasks.
