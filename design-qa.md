# Design QA — Homepage and Product Detail disclosures

## Comparison target

- Source visual truth: Paper Final Site (`01M1176ZB9DXCTZEH57YQGHY2Q`, page `3-0`), Homepage desktop/mobile and Product Detail desktop/mobile frames.
- Source exports:
  - `/Users/freemancodz/Downloads/01 · Homepage · Desktop@0.5x.png`
  - `/Users/freemancodz/Downloads/12 · Homepage · Mobile.png`
  - `/Users/freemancodz/Downloads/Ordering reassurance FAQs@0.5x.png`
  - `/Users/freemancodz/Downloads/Mobile FAQ.png`
  - `/Users/freemancodz/Downloads/Frame@0.5x.png` (desktop perfume profile)
  - `/Users/freemancodz/Downloads/Frame (4).png` (mobile perfume disclosures)
- Verified implementation: `http://localhost:3002` from the production build, using the opt-in local Paper-aligned demo catalogue.
- Implementation captures and combined comparisons: `output/playwright/`.

## Viewports and normalization

| Target                     |                        Source pixels | Implementation pixels | CSS viewport / density                                           | Combined evidence                                                      |
| -------------------------- | -----------------------------------: | --------------------: | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Homepage desktop           | 720 × 3055 at 0.5× (1440 × 6110 CSS) |           1440 × 6111 | 1440 × 900, DPR 1; implementation downsampled to 720 px wide     | `output/playwright/compare-homepage-desktop.png`                       |
| Homepage mobile            |                           390 × 4243 |            390 × 4228 | 390 × 844, DPR 1                                                 | `output/playwright/compare-homepage-mobile.png`                        |
| Homepage FAQ desktop       |                    720 × 410 at 0.5× |            1440 × 820 | 1440 px CSS width; implementation downsampled to 720 px wide     | `output/playwright/compare-focus-homepage-desktop-faq.png`             |
| Homepage FAQ mobile        |                            390 × 423 |             390 × 427 | 390 px CSS width, DPR 1                                          | `output/playwright/compare-focus-homepage-mobile-faq.png`              |
| Product profile desktop    |                    648 × 114 at 0.5× |            1296 × 227 | 1296 px content width; implementation downsampled to 648 px wide | `output/playwright/compare-focus-product-detail-desktop-profile.png`   |
| Product disclosures mobile |                            350 × 223 |             350 × 227 | 390 px viewport with 20 px gutters, DPR 1                        | `output/playwright/compare-focus-product-detail-mobile-accordions.png` |

The focused comparisons use matching collapsed disclosure states. The broader Product Detail captures intentionally contain only two related items because the opt-in local catalogue has three total items and the current product is correctly excluded; this content-state difference is outside the disclosure/profile comparison.

## Findings

No actionable P0, P1, or P2 differences remain in the requested homepage, Homepage FAQ, or Product Detail disclosure/profile areas.

- Fonts and typography: Cormorant Garamond and Inter roles, sizes, line heights, casing, and responsive hierarchy match the Paper frames. Product-specific profile wording remains data-driven rather than hard-coded to the mock.
- Spacing and layout rhythm: the desktop homepage now uses Paper's exact fixed section heights; the complete page differs from the 6110 px source by one border pixel. Mobile full-page height differs by 15 px across 4243 px and has no visible accumulated drift.
- Colors and tokens: warm surfaces, muted green guidance section, borders, text colors, and dark actions match the existing project tokens and Paper source.
- Image quality and asset fidelity: the four scent-character images and three controlled perfume placeholder SVGs are the actual design assets, rendered without CSS recreation. They remain explicitly non-client demo content.
- Copy and content: headings, CTA labels, FAQ questions, ordering steps, and disclosure labels follow Paper. FAQ answers are behavior-based provisional copy pending confirmed client policy.
- Accessibility and interaction: FAQ and Product Detail rows use native disclosure semantics, keyboard-operable summaries, visible expanded content, and non-text state is not required to understand the control.

## Comparison history

### Iteration 1 — blocked

- [P1] Homepage desktop sections were materially compressed compared with Paper.
- [P1] Visible product imagery used a generic CSS bottle instead of the available controlled Paper artwork.
- [P2] Homepage FAQ composition was a generic card/grid treatment instead of a single disclosure list.
- [P2] Product Detail used one generic disclosure layout at both breakpoints; Paper uses a static desktop profile and mobile disclosures.
- [P2] A desktop-only ordering CTA leaked into mobile because competing display utilities resolved incorrectly.
- [P2] Product Detail display heading was oversized and wrapped differently on mobile.

### Fixes applied

- Applied the measured desktop section heights and exact desktop/mobile homepage compositions from Paper.
- Reused the Paper-controlled scent and perfume placeholder assets for the opt-in demo state.
- Rebuilt FAQ rows as responsive native disclosures with the designed questions and row geometry.
- Split Product Detail into the Paper desktop profile and mobile Scent profile / Delivery / Payment disclosures.
- Isolated the desktop-only ordering CTA inside a responsive wrapper.
- Corrected Product Detail display type to the measured mobile and desktop sizes.

### Iteration 2 — passed

- Full-page and focused side-by-side comparisons show aligned hierarchy, section proportions, grids, disclosure rows, borders, type roles, and responsive composition.
- Homepage FAQ expansion and Product Detail Scent profile expansion were exercised successfully.
- Production-browser console check: 0 errors, 0 warnings.

## Primary interactions tested

- Open Homepage FAQ and verify the answer appears and the plus changes to a minus.
- Open Product Detail Scent profile and verify Character, Occasion, and Day / Night values appear.
- Verify mobile disclosures are collapsed in the captured default state.
- Verify desktop renders the static two-column profile rather than accordions.

## Follow-up polish

- [P3] Replace all controlled bottle artwork, demo catalogue content, prices, and provisional FAQ answers when the client supplies confirmed content. Production remains empty unless real catalogue records are added.

final result: passed
