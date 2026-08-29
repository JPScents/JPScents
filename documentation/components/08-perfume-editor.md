# Perfume Editor

## Identity

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Type    | Catalogue Admin component family                                  |
| Sources | Workspace `Perfume Editor`; Create/Edit Perfume frames            |
| Access  | Protected Admin route composition                                 |
| Purpose | Reuse the same Perfume editing surface for create and edit flows. |

## Data and domain

- **Entities:** Perfume and its enum arrays.
- **Displayed/entered:** name, status, description, Featured, scent characters, occasions, times of day, primary image summary.
- **Derived:** recommendation summary and selected group count.

## Operations

| Kind  | Requirement                  | Trigger/result                            |
| ----- | ---------------------------- | ----------------------------------------- |
| Read  | Load Perfume for edit        | Populate controlled form                  |
| Write | Create or update Perfume     | Persist validated owning fields           |
| Write | Upload/replace primary image | Store asset then update Perfume reference |

## Components

- `PerfumeEditor` with create/edit initial-state variants; feature-owned field groups; shared form controls.
- Variant Manager and Preview are composed children, not embedded into a generic form schema.
- Bestseller is managed from Overview; editor shows explanatory link only.

## Behaviour and presentation

- Create defaults to Draft; publishing requires name, description, image, at least one variant with quantity/price, and maintained attributes required by the public experience.
- Preview uses unsaved form state and the shared Product Card presentation; it does not persist.
- Unsaved changes require navigation protection when data would be lost.

## Quality

- Errors focus the first invalid field and preserve other input; image replacement has progress/failure feedback and useful alt-text handling.

## Decisions

- **Confirmed:** create/edit share one editor component, not separate implementations.
- **Confirmed:** multiple enum options may be selected.
- **Open:** whether `scentCue` receives its own Admin field—the current editor shows only Description but public cards require a short cue.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
