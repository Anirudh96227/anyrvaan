# Decisions Log

A running record of technical/architectural decisions and why they were
made. Newest at the top. Format: **Decision** — reasoning.

---

### 2026-07-11 — Space Grotesk self-hosted as a variable woff2

Downloaded the variable font (latin, weights 300–700 in one ~22 KB file)
from Fontsource's CDN, pinned to `@fontsource-variable/space-grotesk@5.2.10`,
and committed it to `public/fonts/`. Self-hosting (vs Google Fonts CDN) for
privacy, performance, and control — no third-party request per visit.
Variable format chosen so one file covers every weight. `public/` (not
`src/assets/`) so the URL stays stable and unhashed, which the hardcoded
`@font-face` src and preload href depend on.

### 2026-07-11 — OFL license committed alongside the font

Self-hosting an OFL font is redistribution, which requires the license text
to travel with the file. `public/fonts/OFL.txt` committed for compliance. No
on-page attribution required.

### 2026-07-11 — `font-display: swap`, preload with `crossorigin`

`swap` guarantees text is never invisible while the font loads (brand font
appears the instant it arrives); the preload keeps that swap window tiny.
`crossorigin` is mandatory on the preload even same-origin — fonts fetch in
anonymous CORS mode, so without it the preload wouldn't match and the font
would download twice.

### 2026-07-11 — Type scale as Tailwind v4 `@theme` tokens

Scale defined in CSS (`--text-*` tokens with line-height/tracking/weight
companions), not ad-hoc utility classes in markup. Gives semantic utilities
(`text-display`, `text-eyebrow`) that describe *what* an element is rather
than *how* it looks, and keeps every size decision in one place. `clamp()`
for fluid sizing without breakpoint classes.

### 2026-07-11 — No italic utility

The variable file is upright-only; the `italic` utility would fake a slant.
Dropped the tagline's italic in favor of honest upright light weight.

### 2026-07-11 — Project lives at `D:\Anyrvaan`, own folder

Kept separate from Documents/Downloads/OneDrive so it's a clean, dedicated
VS Code workspace. Not placed in OneDrive specifically to avoid Git file-lock
issues that cloud-sync can cause on Windows.

### 2026-07-11 — Astro `minimal` template, no demo content

Chose `minimal` over a themed starter so there's nothing to strip out later
— every file in the project is one we intentionally added.

### 2026-07-11 — TypeScript `strict` mode from the start

Turned on the strongest type-checking preset immediately rather than
loosening later. Easier to start strict than to retrofit strictness onto a
growing codebase.

### 2026-07-11 — Tailwind CSS v4 via `astro add tailwind`

Astro's official integration wires the Vite plugin and config automatically.
v4 requires no separate `tailwind.config.js`/PostCSS setup for basic use —
one `@import "tailwindcss";` in `global.css` is enough.

### 2026-07-11 — Git initialized manually, not by `create-astro`

Scaffolded with `--no-git` so the first Git commit happens as a deliberate,
explained step rather than a side effect of running a scaffolding tool.

### 2026-07-11 — Git identity: name "Anyrvaan", branch default "main"

Commits are attributed to the studio, not the individual, since this is
studio work. `init.defaultBranch` set globally to `main` (GitHub's current
default) instead of Git's historical `master`.
