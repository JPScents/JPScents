# Scent Character

## Identity

| Field   | Value                                                                            |
| ------- | -------------------------------------------------------------------------------- |
| Type    | Catalogue component family                                                       |
| Sources | Workspace `Scent Character`; Home; Help Me Choose desktop/mobile                 |
| Access  | Browse link or selectable preference control                                     |
| Purpose | Provide one visual language for the four maintained scent-character enum values. |

## Data and domain

- **Entity:** `ScentCharacter` enum: Fresh, Warm, Sweet, Woody.
- **Displayed:** stable ordinal, label, optional cue, controlled imagery, selection mark.
- **Entered:** zero or more selected values in Help Me Choose.
- **Configuration:** enum labels, cues, imagery, and filtered-catalogue URL construction.

## Operations

| Kind  | Requirement                       | Trigger/result                          |
| ----- | --------------------------------- | --------------------------------------- |
| Read  | Read enum configuration           | Render all supported choices            |
| Write | Update local preference selection | Toggle choice without a server mutation |

## Components

- **Variants:** Browse desktop large; Browse mobile compact; Select desktop; Select mobile; default/selected.
- **Ownership:** Catalogue owns the family and enum mapping.
- **Duplication review:** browse and select share content/visual treatment but remain explicit interaction variants.

## Behaviour and presentation

- Browse navigates to `/perfumes?scent=<value>`.
- Select supports multiple values and uses border/inset emphasis, top-right check, and semantic pressed/checked state.
- Natural imagery is decorative support; label/state remain understandable without it.

## Quality

- Use buttons for selection and links for navigation; announce state programmatically; provide visible focus; do not rely on the checkmark alone.

## Decisions

- **Confirmed:** enum values are fixed for this phase; multiple selections are allowed.
- **Confirmed:** generated scent images are controlled placeholders, not client photography.
- **Open:** client approval or replacement of the four images.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
