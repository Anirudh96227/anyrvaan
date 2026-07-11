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

Rules (GSAP/Lenis not yet introduced — the hero motion below is pure CSS):

- Nothing moves without intention — no motion "because it's possible."
- Motion should originate from stillness (per the tagline), not run
  automatically on load unless it *is* the intentional stillness-to-motion
  moment (e.g. the hero).
- Monochrome only. No colored/neon glow. Light is treated as a physical
  phenomenon (raking across form), never as emitted color.
- Every motion feature must have a `prefers-reduced-motion: reduce` fallback
  that renders a calm, still, fully legible state.

## Hero wordmark

The homepage "Anyrvaan" wordmark is a **bespoke** treatment, intentionally
NOT part of the reusable type scale. Lives in a scoped `<style>` in
`src/pages/index.astro`.

- **Scale:** `clamp(3rem, 19vw, 16rem)` — sized in viewport-width units so it
  fills most of the screen on every device without clipping on phones.
- **Raking light sweep:** the glyphs are filled with a moving gradient (dim
  `#a3a3a3` base + one bright `#ffffff` band) via `background-clip: text`; the
  band sweeps diagonally across every ~6s, then rests off-screen. Reads as
  light revealing form, not neon.
- **Breathing:** the variable weight axis oscillates ~370↔440 over ~8s so the
  surface feels alive between light passes.
- **Descender note:** `background-clip: text` only paints within the line box,
  so a `padding-bottom` is required or descenders (the 'y' tail) get clipped.
- **Reduced motion:** all of the above is gated behind
  `@media (prefers-reduced-motion: no-preference)`; otherwise the wordmark is
  a still, solid `#fafafa`.

> Note: this is the *current* hero. The Milestone 3–4 concept (dissolve into
> particles / cursor-gravity) still stands as a future direction; when we get
> there we'll decide whether it replaces or layers with this treatment.

## Accessibility baseline

- Semantic HTML first, ARIA only where semantics fall short.
- Color contrast must hold against the near-black/soft-white palette even
  as secondary text tones are introduced.
- All interactive/motion features must have a reduced-motion fallback.
