# Bestseller Selection

## Identity

| Field   | Value                                                                                 |
| ------- | ------------------------------------------------------------------------------------- |
| Type    | Catalogue Admin component family                                                      |
| Sources | Workspace `Bestseller Selection`; Admin Overview and selector overlay                 |
| Access  | Protected Admin Overview modal                                                        |
| Purpose | Maintain exactly one eligible storefront Bestseller with minimal operational context. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant, OrderItem-derived order count.
- **Displayed:** current selection, primary image, characters, order count, variant count, total quantity.
- **Derived:** eligibility requires Published and at least one variant with quantity greater than zero.

## Operations

| Kind  | Requirement                                | Trigger/result                                     |
| ----- | ------------------------------------------ | -------------------------------------------------- |
| Read  | Search eligible Perfumes by name/character | Populate selector results                          |
| Write | Replace Bestseller                         | Atomically clear previous and set selected Perfume |

## Components

- Overview summary, searchable result row, current/available/selected/ineligible state, feature-owned selector composed with `ModalShell`.
- Search/results remain Catalogue-owned; modal chrome is shared.

## Behaviour and presentation

- Selecting a new Bestseller replaces the previous selection atomically.
- Current Bestseller is visibly selected and cannot create a duplicate state.
- Unpublished/out-of-stock Perfumes are excluded or explicitly disabled.

## Quality

- Search has a label, results are keyboard selectable, selected state is announced, and replacement success/failure receives feedback.

## Decisions

- **Confirmed:** exactly zero or one active Bestseller; manual control remains.
- **Confirmed:** order count is lightweight context, not an automatic ranking system.
- **Open:** whether unpublishing/depleting the current Bestseller clears it automatically or requires Admin replacement.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
