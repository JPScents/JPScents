# Help Me Choose

## Identity

| Field | Value |
| --- | --- |
| Type | Public Catalogue flow |
| Sources | Final Site Preferences/Results desktop/mobile; Notion Help Me Choose behaviour |
| Route/access | `/help-me-choose` · public; results are route state, not a second route |
| Purpose | Return a deterministic shortlist of available Perfumes from maintained enum selections. |

## Data and domain

- **Entities:** Perfume, PerfumeVariant; ScentCharacter[], Occasion[], TimeOfDay[].
- **Displayed/entered:** multi-select scent characters, multi-select occasion, Day/Night or Either; result reason/rank.
- **Derived:** Either means no time filter; score equals transparent enum matches; availability gates candidates.
- **Configuration:** enum labels, result limit, match labels/reason templates.

## Operations

| Kind | Requirement | Trigger/result |
| --- | --- | --- |
| Read | `recommendPerfumes(preferences)` | Return ranked available Perfume projections and match reasons |
| Write | Update local/search state | Submit preferences, show results, adjust choices |

## Components

- Public shell, Scent Character Select, choice buttons, preference summary, Recommendation Result, empty state.
- Desktop preferences use main form plus summary panel; mobile is linear. Results use three-column comparison desktop and leading/compact stack mobile.
- Match reason/strength remains Help Me Choose-local, not a generic Product Card concern.

## Behaviour and presentation

- Multiple scent and occasion selections are allowed; Time choice is single Day/Night/Either.
- Results stay on `/help-me-choose`; search parameters may preserve/share valid enum choices.
- Rank by number/weight of exact matches, then merchandising tie-breaker; exclude unpublished and zero-stock Perfumes.
- No match offers Adjust Preferences and Browse All Perfumes.
- With no available catalogue, the flow stops before preferences and explains that recommendations begin once perfumes are published.

## Quality

- Choice controls expose pressed/checked state; results announcement/focus is managed; ranking reasons use plain language; invalid URL values are ignored.

## Decisions

- **Confirmed:** deterministic, no AI.
- **Confirmed:** one route for preferences/results.
- **Confirmed:** enum arrays allow multiple selections; Either is not stored.
- **Assumed:** query parameters preserve the result state.
- **Open:** normalize the public “Evening” label with the stored/Admin `DATE_NIGHT` enum before implementation.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
