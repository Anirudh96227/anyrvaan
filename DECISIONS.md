# Decisions Log

A running record of technical/architectural decisions and why they were
made. Newest at the top. Format: **Decision** — reasoning.

---

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
