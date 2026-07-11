# Design System

This is a living document. It only records decisions we've actually made —
not aspirational rules. Update it every time a milestone adds or changes a
visual/motion decision.

## Status: Milestone 1

Foundation + typography. Color is still placeholder `neutral`; motion not
yet implemented.

## Color

Using Tailwind's built-in `neutral` scale for now (no custom palette yet):

| Token | Tailwind class | Use |
|---|---|---|
| Background | `neutral-950` | near-black base |
| Primary text | `neutral-50` | soft white |
| Secondary text | `neutral-300` / `neutral-400` | de-emphasized copy |

A custom palette (if `neutral` ever feels wrong) will be added to
`tailwind`'s theme config and documented here — not applied ad hoc in
markup.

## Typography

- **Typeface:** Space Grotesk, self-hosted as a single **variable** woff2
  (weights 300–700 in one ~22 KB file). Lives at
  `public/fonts/space-grotesk-variable.woff2`; declared via `@font-face` in
  `src/styles/global.css` with `font-display: swap`, preloaded in
  `Layout.astro` with `crossorigin`. License (`OFL.txt`) ships alongside it.
- **Registration:** set as the default `--font-sans` in the Tailwind v4
  `@theme` block, so the whole site uses Space Grotesk with no per-element
  font classes.
- **No italics:** the variable file is upright/roman only. Never use the
  `italic` utility — it produces a faux (browser-slanted) italic that looks
  wrong on this typeface.

### Type scale

Defined as Tailwind v4 `@theme` tokens in `global.css`. Each name is one
utility (e.g. `text-display`) carrying size + line-height + letter-spacing +
weight. Sizes use `clamp(min, fluid, max)` and assume a **16px root** — do
not change `html { font-size }`.

| Utility | Size (min → max) | Line-height | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `text-display` | 3.25 → 6 rem | 1.02 | -0.03em | 400 | one hero statement per page |
| `text-h1` | 2.5 → 3.5 rem | 1.08 | -0.02em | 400 | page / major section titles |
| `text-h2` | 1.9 → 2.45 rem | 1.15 | -0.015em | 500 | section headings |
| `text-h3` | 1.5 → 1.75 rem | 1.25 | -0.01em | 500 | sub-headings, project/card titles |
| `text-body-lg` | 1.2 → 1.3 rem | 1.6 | 0 | 300 | lead paragraphs, standfirst |
| `text-body` | 1.0625 rem (17px) | 1.65 | 0 | 400 | default long-form reading |
| `text-small` | 0.875 rem | 1.5 | 0.005em | 400 | captions, metadata, credits |
| `text-eyebrow` | 0.75 rem | 1.4 | 0.22em | 500 | section labels/kickers; add `uppercase` |

Scale ratio leans editorial (large display, restrained body). Tight leading
+ negative tracking bind large display type into an architectural mass;
generous leading on body copy reads calm and spacious.

## Spacing

No formal spacing scale yet beyond Tailwind's defaults. Whitespace should
lean generous — this is a stated brand value, not just a default.

## Motion

Not yet implemented. Rules to establish once GSAP/Lenis are introduced:

- Nothing moves without intention — no motion "because it's possible."
- Motion should originate from stillness (per the tagline), not run
  automatically on load unless it *is* the intentional stillness-to-motion
  moment (e.g. the hero).
- Respect `prefers-reduced-motion`.

## Accessibility baseline

- Semantic HTML first, ARIA only where semantics fall short.
- Color contrast must hold against the near-black/soft-white palette even
  as secondary text tones are introduced.
- All interactive/motion features must have a reduced-motion fallback.
