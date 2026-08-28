---
name: design-to-development
description: Translate approved product and visual sources into maintainable UI while preserving source precedence, accessibility, responsive behaviour, and established foundations.
---

# Design to Development

Read `docs/design-foundations.md`, the relevant product source, and the final visual reference before implementing UI.

## Source handling

- Follow the precedence recorded in `docs/project-workflow.md`.
- Latest approved client corrections win over older material.
- Product sources govern behaviour; final visual references govern presentation.
- Final implementation references win over exploratory designs. Exploratory material may clarify tokens, states, and notes only.
- Do not silently invent material content, behaviour, or visual decisions. Resolve or report genuine ambiguity.

## Implementation

- Inspect existing tokens, primitives, shared components, and nearby screens before adding anything.
- Implement incrementally by coherent page/feature section; preserve domain ownership.
- Reuse shared foundations where they match. Keep one-off or domain-specific UI local until reuse is proven.
- Treat desktop and mobile as intentional compositions, not automatic scaling of one frame.
- Keep motion purposeful, restrained, performant, responsive, and respectful of reduced-motion preferences.
- Do not add dependencies, generic design systems, or animation frameworks without a current need.

## Verification

- Compare representative desktop and mobile widths with the approved reference.
- Exercise realistic content and relevant loading, empty, error, disabled, hover, focus, pressed, and destructive states.
- Check semantic structure, keyboard operation, focus visibility, accessible names, touch targets, contrast, reduced motion, overflow, and layout stability.
- Update `docs/design-foundations.md` only when a reusable foundation changed; screen-specific implementation does not require a new global rule.
