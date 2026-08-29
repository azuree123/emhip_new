# EMHIP project

## Design system
- `styles.css` — global entry: fonts (Plus Jakarta Sans, Wix Madefor Display, Inter, Manrope) + token imports. Link this in every DC's `<helmet>`.
- `design-system/` — Figma-derived component set (`*.jsx` + `*.d.ts`), `fig-tokens.css` (colors, spacing, radii, type scale as CSS vars), `fig-assets.css`, `icon-data.js`, `assets/`.
- `screens/` — `Components.bundle.js` (built screen components, mounted via `component-from-global-scope`) + `fig-tokens.css` / `fig-assets.css` / `assets/`.

## Existing designs
- `EMHIP Prototype.dc.html` — screen switcher shell mounting screens from `screens/Components.bundle.js` at 1440px.

## Conventions
- Every design is a single `Name.dc.html` Design Component, inline styles only.
- Use token vars from `fig-tokens.css` (e.g. `var(--primary-gray-700)`, `var(--surface-gray-soft)`); numeric tokens are unitless — `calc(var(--spacing-4) * 1px)`.
- Brand accents used in the prototype chrome: `#E12628` (red), `#941C3C` (maroon), `#FFC629` (yellow) on `#2A2A2A` / `#ECECEC` neutrals.
- Type: Plus Jakarta Sans for UI, Wix Madefor Display for display headings.
