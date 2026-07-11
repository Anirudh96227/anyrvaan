# Design System

This is a living document. It only records decisions we've actually made —
not aspirational rules. Update it every time a milestone adds or changes a
visual/motion decision.

## Status: Milestone 0

Only the bare foundation exists so far. Most of this file will fill in as
we build the hero, navigation, and case study templates.

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

- **Typeface:** Space Grotesk, self-hosted (not yet added — planned for an
  early milestone, before we build real page content).
- **Scale:** large, editorial sizes (`text-5xl`–`text-7xl` for hero-level
  type so far). No formal type scale defined yet.

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
