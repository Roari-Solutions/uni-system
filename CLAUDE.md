# uni-system

## Front-end work: UT Design System is mandatory

Before writing, editing, or reviewing **any** front-end code in this project (UI,
components, pages, styles, layout, tokens, CSS, markup, Figma-to-code work), read
the master design system first:

**`~/.claude/design-systems/UT-design-system.md`**

Read it in full at the start of the task — do not work from memory or from a summary.

That document is the single source of truth for the university website's visual
system, and **all of its rules apply here**. In particular:

- Use only the approved semantic palette (`#EBAD3E`, `#AD7006`, `#ECC580`, `#764A01`,
  `#E2EAEC`, `#C6D8D8`, `#FFFFFF`, `#1B2A38`). No arbitrary hex values, no neon,
  purple, unrelated blues, or random gradients.
- Use design tokens, never hard-coded visual values (see §43 for the token model).
- Typography: Tajawal for Arabic, Inter for English; the type scale, weights, and
  line heights in §7–§9 are fixed. Never compress Arabic typography.
- 8px spacing foundation, 1320px max container, 12-column grid (§10–§11).
- Reuse existing components before creating new ones; never redesign shared
  components at page level.
- Arabic (RTL) and English (LTR) must share one component architecture, and RTL is a
  true layout transformation — direction, alignment, flex flow, order, icon and
  chevron mirroring — not a text swap (§20).
- Design interactive states (hover, active, focus, disabled) explicitly; visible
  focus ring on everything keyboard-reachable (§37).
- Respect the prohibited directions list in §48 (no glassmorphism, heavy shadows,
  dashboard-dense grids, over-animation, etc.).
- Never fabricate institutional facts — statistics, contacts, accreditations, dates.
  Use the explicit placeholder format from §45.
- Validate against the §50 review checklist before calling front-end work complete.

The approved College Page is the visual benchmark; every page must feel like a
sibling of it, not a new product.

### Project-specific notes

- The front end lives in `frontend/` (React 19 + TypeScript + Vite + Tailwind v4,
  `react-i18next` for AR/EN).
- Tailwind v4 has no `tailwind.config.js` — define the design tokens from §43 in CSS
  via `@theme` in the main stylesheet and reference them through Tailwind utilities
  rather than repeating raw hex values in components.
- Drive RTL/LTR off `dir` on `<html>` and use logical properties / Tailwind logical
  utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`) instead of
  left/right ones, so direction flips are real layout transformations.
- Icons: the design system mandates **Lucide** (§15). This project currently depends
  on `@heroicons/react`. Do not mix icon families — flag the conflict and get a
  decision before adding icons in a new family.
