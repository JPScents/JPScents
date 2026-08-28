# Theme and Token Registry

The exact implemented values live in `src/app/globals.css`; Paper remains the visual authority.

## Confirmed roles

- Typography: Cormorant Garamond for editorial display; Inter for body, controls, labels, and Admin.
- Public color roles: warm ivory canvas, warm-white surface, stone section, charcoal text, muted green surface, olive action, amber accent, hairline borders.
- Admin roles: light operational canvas and surface, dark charcoal sidebar, restrained action and border roles.
- Status roles: available/success, attention/warning, unavailable/muted, destructive/error.
- Geometry: crisp low-radius controls, mostly flat surfaces, restrained/no shadow; rounded mobile cart sheet is an explicit exception.
- Layout: 1440px public reference, 1296px public container, 72px desktop gutters, 20px mobile gutters; 248px Admin sidebar and 34px Admin content padding.

## Usage rules

- Use semantic roles rather than raw color values in feature code.
- Amber is decorative, not normal-size essential text on light surfaces.
- Responsive composition follows the Paper frames; tokens do not replace page-specific layout decisions.
- Do not invent a general animation, elevation, or radius scale until repeated design evidence requires it.
