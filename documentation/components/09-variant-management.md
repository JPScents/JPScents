# Variant Management

## Identity

| Field   | Value                                                                     |
| ------- | ------------------------------------------------------------------------- |
| Type    | Catalogue Admin component family                                          |
| Sources | Workspace `Variant Management`; Create/Edit Perfume and Add Variant modal |
| Access  | Protected Admin editor state/modal                                        |
| Purpose | Manage sellable size, price, and current quantity per PerfumeVariant.     |

## Data and domain

- **Entity:** PerfumeVariant child of Perfume.
- **Displayed/entered:** size value, unit, price, quantity.
- **Derived:** in/out of stock, available variant count, total stock.
- **Constraints:** unique size per Perfume; non-negative integer quantity/price; positive size.

## Operations

| Kind  | Requirement                       | Trigger/result                                          |
| ----- | --------------------------------- | ------------------------------------------------------- |
| Read  | Read variants with owning Perfume | Render list and edit defaults                           |
| Write | Add variant                       | Create child with stable identifier                     |
| Write | Update variant                    | Persist size, price, quantity                           |
| Write | Delete variant                    | Allowed only when no integrity/Order reference conflict |

## Components

- `VariantManager`, `VariantRow`, feature-owned `VariantModal` composed with shared `ModalShell`.
- Variants: populated/empty, in-stock/out-of-stock, add/edit, submitting/error.
- Modal header, close, body, and actions come from ModalShell; fields remain Catalogue-owned.

## Behaviour and presentation

- Zero quantity derives unavailable.
- The customer quantity maximum uses current quantity; Cart does not reserve units.
- Deletion requires confirmation and must not break historical Orders; referenced variants should normally be retained and made unsellable.

## Quality

- Numeric inputs use suitable constraints/input modes; currency parsing avoids floats; modal focus and Escape behaviour follow ModalShell.

## Decisions

- **Confirmed:** quantity replaces persisted `isAvailable`.
- **Confirmed:** size unit is currently mL but remains an enum/configured value.
- **Open:** exact deletion/retention policy for referenced variants.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
