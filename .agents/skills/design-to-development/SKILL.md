---
name: design-to-development
description: Implement approved visual or product references using existing UI foundations, with focused responsive and accessibility verification.
---

# Design to Development

Use for implementing visual references or changing UI design. An ordinary structural refactor preserves the current UI and does not require finding new design sources.

- Find the actual product requirements and approved visual references from the request or project documentation. Do not assume particular design files exist.
- Latest approved corrections take precedence. Product requirements govern behavior; final visual references govern presentation; exploratory designs supply context only.
- Inspect existing tokens, primitives, components, and nearby screens before adding anything. Keep one-off UI local and domain UI feature-owned.
- Resolve routine presentation choices using existing patterns. Ask only for material missing behavior or visual decisions that the evidence cannot settle; continue independent work.
- Treat desktop and mobile as intentional layouts. Preserve semantic structure, keyboard access, visible focus, accessible names, touch targets, contrast, reduced motion, and realistic content handling.
- Compare affected screens with the supplied reference at representative widths. Exercise relevant empty, pending, error, disabled, and interaction states; report any verification that could not be performed.
- Update existing design-foundation documentation only when a reusable foundation actually changes. Do not create a design system, dependency, animation framework, or global rule for a one-off screen.
