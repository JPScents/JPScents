# JPScents Design Extraction Checklist

Status: complete as one consolidated extraction pass; awaiting Freeman's architecture approval.

## Working rules

- [x] Process each logical unit separately within the consolidated pass.
- [x] Treat desktop, mobile, overlays, modals, and empty/error states as variants of the same unit.
- [x] Extract only what the design or approved product behaviour supports.
- [x] Separate confirmed facts from assumptions and open decisions.
- [x] Update the cumulative registries after every unit.
- [x] Keep each extraction concise and structured.
- [x] Apply Freeman’s requested consolidated approval boundary instead of pausing after every unit.
- [x] Do not create implementation tasks or delegate development during extraction.

## Approved terminology and routes

- [x] Replace catalogue-destination “Shop” with “Perfumes”.
- [x] Update public navigation, footers, CTAs, breadcrumbs, and related states.
- [x] Catalogue route: `/perfumes`
- [x] Product route: `/perfume/{slug}`
- [x] Order confirmation route: `/checkout/confirm`
- [x] Design Agent completed and visually checked the Paper updates.
- [x] Extract and confirm all remaining routes during their page passes.

## Extraction template for every unit

### Identity

- [x] Unit name
- [x] Source page and frames
- [x] Route, if applicable
- [x] Public, protected, or UI-only
- [x] Purpose

### Data and domain

- [x] Entities used
- [x] Relationships implied
- [x] Data displayed
- [x] Data entered
- [x] Derived/calculated data
- [x] Configuration dependencies

### Behaviour

- [x] Queries/reads implied
- [x] Mutations/writes implied
- [x] User actions
- [x] State transitions
- [x] Navigation outcomes
- [x] Persistence requirements
- [x] Failure and empty states

### Components

- [x] Reused component families
- [x] Page-specific components
- [x] Component variants
- [x] Components that should remain local
- [x] Potential duplication requiring later review

### Presentation

- [x] Desktop composition
- [x] Mobile composition
- [x] Responsive differences
- [x] Interaction states
- [x] Theme/style dependencies
- [x] Content and asset dependencies

### Quality requirements

- [x] Validation rules
- [x] Accessibility requirements
- [x] Loading and feedback behaviour
- [x] Security/privacy implications
- [x] Open decisions
- [x] Assumptions
- [x] Cumulative registries updated
- [ ] Freeman approved consolidated extraction

## Cumulative registries

Update these after every extraction:

- [x] Route and page registry
- [x] Entity/model registry
- [x] Relationship registry
- [x] Component and variant registry
- [x] Query/read registry
- [x] Mutation/write registry
- [x] State-transition registry
- [x] Theme and token registry
- [x] Responsive-rule registry
- [x] Validation and accessibility registry
- [x] Asset and content registry
- [x] Application configuration registry
- [x] Cross-page flow registry
- [x] Assumption and decision log

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

- [x] Public desktop header
- [x] Public mobile header/menu
- [x] Cart utility and count
- [x] Public footer
- [x] Admin desktop sidebar/topbar
- [x] Admin mobile header/menu
- [x] Public versus Admin shell ownership

## Phase 2 — Public component families

### 3. Product Cards

- [x] Desktop gallery card
- [x] Desktop catalogue card
- [x] Mobile gallery card
- [x] Mobile catalogue/list card
- [x] Price, availability, label, image, and CTA variants

### 4. Scent Character

- [x] Browse mode
- [x] Select mode
- [x] Desktop variants
- [x] Mobile variants
- [x] Default and selected states
- [x] Shared imagery and content requirements

### 5. Commerce Controls

- [x] Catalogue filter chips
- [x] Size selector
- [x] Default, selected, and unavailable size states
- [x] Quantity control
- [x] Availability indicator
- [x] Primary and secondary commerce actions

### 6. Cart & Order

- [x] Cart item variants
- [x] Drawer/bottom-sheet cart item
- [x] Full-cart item
- [x] Cart summary
- [x] Checkout summary
- [x] Confirmation summary
- [x] Quantity, removal, subtotal, and invalid-item states

### 7. Form Controls

- [x] Customer text field
- [x] Select field
- [x] Textarea
- [x] Optional/required treatment
- [x] Validation and error states
- [x] Admin fields
- [x] Admin tags
- [x] Toggles and secondary actions

## Phase 3 — Public pages and flows

### 8. Perfumes catalogue

Includes desktop, mobile, filters, and no-results state.

- [x] `/perfumes`
- [x] Catalogue query/filter behaviour
- [x] Product-card composition
- [x] Availability presentation
- [x] No-results state
- [x] Route-backed filter decisions

### 9. Perfume Detail

Includes desktop, mobile, recommendations, cart drawer, and bottom sheet.

- [x] `/perfume/{slug}`
- [x] Perfume and variant data
- [x] Required size selection
- [x] Quantity and Add to Cart
- [x] Related perfumes
- [x] Desktop cart drawer
- [x] Mobile cart bottom sheet
- [x] Overlay behaviour and accessibility

### 10. Full Cart

Includes desktop, mobile, and empty state.

- [x] Route confirmation
- [x] Cart persistence
- [x] Quantity updates
- [x] Item removal
- [x] Subtotal
- [x] Invalid/unavailable item handling
- [x] Empty-cart state
- [x] Checkout eligibility

### 11. Checkout

Includes desktop and mobile.

- [x] Route confirmation
- [x] Contact details
- [x] Delivery details
- [x] Order review
- [x] Validation
- [x] Server-side cart revalidation
- [x] Order creation
- [x] Duplicate-submission protection
- [x] Failure recovery

### 12. Order Confirmation

Includes desktop and mobile.

- [x] `/checkout/confirm`
- [x] Confirmation access/state requirements
- [x] Human-readable order reference
- [x] Order summary
- [x] WhatsApp handoff
- [x] Refresh/direct-access behaviour
- [x] Cart-clearing point
- [x] Continue-browsing path

### 13. Help Me Choose

Includes preferences and results on desktop and mobile.

- [x] Preferences route
- [x] Results route or state decision
- [x] Preference data structure
- [x] Deterministic matching behaviour
- [x] Ranking and availability rules
- [x] Adjust-preferences flow
- [x] No-match behaviour
- [x] Reuse of Scent Character and Product Cards

### 14. Homepage

Extract after its dependent components and flows are understood.

- [x] `/`
- [x] Featured/Bestseller hero
- [x] Available perfumes
- [x] Browse by scent character
- [x] Help Me Choose preview
- [x] Ordering steps
- [x] FAQs/reassurance
- [x] Closing CTA
- [x] Homepage merchandising configuration

## Phase 4 — Admin component families

### 15. Admin Operations

- [x] Desktop toolbar
- [x] Search and filter controls
- [x] Fixed-lane perfume rows
- [x] Desktop order rows
- [x] Order-status variants
- [x] Mobile order cards
- [x] Responsive table-to-card behaviour

### 16. Perfume Editor

- [x] Configured state
- [x] Empty/create state
- [x] Product details
- [x] Images
- [x] Recommendation attributes
- [x] Featured state
- [x] Preview behaviour

### 17. Variant Management

- [x] Variant list
- [x] Populated and empty states
- [x] Add-variant modal
- [x] Edit-variant modal
- [x] Size and measurement-unit handling
- [x] Price and availability handling

### 18. Bestseller Selection

- [x] Current Bestseller summary
- [x] Searchable selection modal
- [x] Single-selection behaviour
- [x] Availability/publish eligibility
- [x] Replacement behaviour

## Phase 5 — Admin pages and flows

### 19. Admin Perfumes

- [x] Route and protection
- [x] Catalogue list
- [x] Search and filters
- [x] Create Perfume entry
- [x] Edit Perfume entry
- [x] Availability and merchandising summary

### 20. Create/Edit Perfume

Includes create, edit, Add Variant modal, and Product Preview modal.

- [x] Route structure
- [x] Create versus edit behaviour
- [x] Save/publish lifecycle
- [x] Image management
- [x] Recommendation attributes
- [x] Variant management
- [x] Featured/Bestseller controls
- [x] Product preview
- [x] Validation and unsaved-change handling

### 21. Admin Orders

Includes desktop and mobile list/detail.

- [x] Route structure
- [x] Order search and filtering
- [x] Order summary rows/cards
- [x] Order Detail
- [x] Customer and delivery information
- [x] Order items and snapshots
- [x] Status updates
- [x] Activity history
- [x] Admin WhatsApp continuation
- [x] Mobile operational behaviour

### 22. Admin Overview

Includes normal state and Bestseller selector overlay.

- [x] Route and protection
- [x] Operational summary counts
- [x] Recent orders
- [x] Catalogue-attention summary
- [x] Featured/Bestseller summary
- [x] Bestseller selector
- [x] Remove unjustified analytics

## Phase 6 — Consolidation

- [x] Review every public frame.
- [x] Review every Admin frame.
- [x] Review every component-family frame.
- [x] Verify every frame is assigned to an extraction unit.
- [x] Deduplicate components.
- [x] Remove premature abstractions.
- [x] Confirm shared versus public-only versus Admin-only ownership.
- [x] Confirm complete route registry.
- [x] Confirm complete entity/model registry.
- [x] Confirm queries and mutations.
- [x] Confirm theme and configuration.
- [x] Confirm cross-page customer flow.
- [x] Confirm Admin operational flow.
- [x] Resolve or explicitly defer every open decision.
- [x] Produce the approved development structure.
- [ ] Only after approval, create implementation milestones through the Freeman milestone workflow.
