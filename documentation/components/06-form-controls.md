# Form Controls

## Identity

| Field | Value |
| --- | --- |
| Type | Shared UI component family |
| Sources | Workspace `Form Controls`; Checkout; Admin Editor; Admin Order Detail |
| Access | Public and protected forms |
| Purpose | Standardize labels, inputs, selections, validation, maintained tags, toggles, and actions. |

## Data and domain

- **Entered:** customer/delivery fields; Perfume fields; enum arrays; status; variant fields.
- **Configuration:** delivery areas, enum labels, field limits, currency and measurement unit.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Write | Submit owning feature form | Parent mutation validates authoritatively |
| Read | Read configured select/tag options | Render controlled choices |

## Components

- shadcn-backed `Input`, `Select`, `Textarea`, `Checkbox/Toggle`, field message, tag/multi-select, action buttons.
- Shared `Field` composition owns label, optional/required text, description, control association, and error message.
- Checkout and Admin field groups remain feature-owned.

## Behaviour and presentation

- Required/optional status appears in text, not placeholder-only.
- Validation runs on submit and may run on blur after a field has been touched.
- Server errors map to fields or a clear form-level message; values remain intact after failure.

## Quality

- Every control has a persistent label, described errors, visible focus, suitable input mode/autocomplete, and no inaccessible custom select behaviour.

## Decisions

- **Confirmed:** enum arrays use controlled multi-selection, not free-form tags.
- **Assumed:** checkout email remains optional.
- **Open:** final delivery-area options and field limits.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
