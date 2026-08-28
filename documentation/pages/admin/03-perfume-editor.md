# Create and Edit Perfume

## Identity

| Field | Value |
| --- | --- |
| Type | Protected Catalogue Admin pages with modal states |
| Sources | Final Admin Create/Edit Perfume, Add Variant modal, Product Preview modal; Workspace editor/variant families |
| Route/access | `/admin/perfumes/new`; `/admin/perfumes/{id}` · authenticated Admin only |
| Purpose | Create/update a complete Perfume and its variants using one shared editor. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant and enum arrays.
- **Displayed/entered:** core fields, status, image, Featured, enum selections, variants, recommendation summary.
- **Derived:** slug, availability summaries, preview projection, group count.
- **Configuration:** enums, image rules, currency, size unit, slug rules.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `getAdminPerfume(id)` | Populate edit route and variant list |
| Write | `createPerfume` / `updatePerfume` | Persist validated Perfume fields |
| Write | upload/replace image | Update ordered Perfume image references |
| Write | add/update/delete variant | Manage stable child records |

## Components

- Admin shell, Perfume Editor, Variant Manager, `VariantModal`, `ProductPreviewModal`, shared ModalShell and form controls.
- Create/edit differ by initial state and submit mutation, not duplicated markup.
- Product preview renders unsaved current form state in Gallery/Compact card variations.

## Behaviour and presentation

- Create begins Draft with empty variants/image/attributes; Edit loads current values.
- Publishing requires complete customer-facing data and at least one positive-quantity variant.
- Save success updates dirty baseline; failures preserve edits; navigation with unsaved changes asks for confirmation.
- Bestseller remains Overview-managed; editor only links there.

## Quality

- Server authorization/validation guards every mutation; uploaded files are type/size checked; slug collision is handled; modal actions prevent duplicate submissions.

## Decisions

- **Confirmed:** stable ID Admin route; public slug is editable/derived separately.
- **Confirmed:** modal states are UI-only.
- **Confirmed:** variant quantity replaces availability toggle.
- **Open:** add a dedicated `scentCue` field to match public cards; image count currently behaves as one primary image despite the domain allowing an ordered list.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
