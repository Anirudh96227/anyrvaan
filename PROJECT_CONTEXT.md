# Project Context

## What this is

Anyrvaan is Anirudh's creative technology studio. This website is not a
portfolio, not an agency site, not a SaaS landing page — it is meant to feel
like entering a carefully designed digital experience. The website itself is
the first case study the studio produces.

## Who's building it

- **Anirudh** — multimedia designer moving into creative technology.
  Background in design, motion graphics, branding, and AI tools. Understands
  design deeply; is still learning to code. Has never built a production
  website, never properly used Git, never architected a frontend
  application. Wants to learn while building, not just receive finished code.
- **Claude** — acting as senior frontend engineer, creative technologist,
  technical mentor, code reviewer, and architect. Expected to explain the why
  before the how, and to push back when a feature would hurt performance,
  accessibility, maintainability, or the project's philosophy.

## Working environment

- Local development in VS Code on an older laptop — lightweight tools,
  avoid unnecessary complexity, performance matters.
- Workflow: VS Code → Git → GitHub → Cloudflare Pages. Git is never skipped.
  Commits happen at meaningful milestones with meaningful messages.

## How we work

The project is built one milestone at a time. Every milestone:

1. Explains its goal before writing code.
2. States what files will be created/changed and why.
3. Leaves the site in a working state.
4. Is tested locally before being committed.
5. Is committed to Git with a clear message.

See [TODO.md](./TODO.md) for the milestone roadmap and
[DECISIONS.md](./DECISIONS.md) for the rationale behind specific technical
choices.

## Site structure (planned)

- Home
- Work
- Experiments
- Studio
- Contact
- *(later)* Journal, Research, Music, Tools

## Case study format

Case studies are told as a story, not a sales pitch:

Context → Thinking → Exploration → Iterations → Lessons → Outcome

## Adaptive memory (future idea, not yet built)

Eventually the site may remember interaction locally (favorite sections,
time spent, interaction depth) using `localStorage` only — no accounts, no
personal data, no identity tracking. The goal is a site that gently adapts,
never one that manipulates.
