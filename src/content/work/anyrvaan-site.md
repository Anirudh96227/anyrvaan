---
title: "Anyrvaan.com"
summary: "The studio's own site, built as a working case study in restraint — a cursor-reactive particle field that costs nothing at rest, a fluid editorial type system, and motion that only ever answers to attention."
year: "2026"
tags: ["Web Design", "Front-end Engineering", "Design Systems"]
draft: true
---

The brief was self-issued: build a studio site that doesn't just describe the practice, but behaves like it. If the studio's position is that motion should be earned, not assumed, the site had to prove that in its own code before it could ask anyone to believe it.

That constraint shaped everything. The homepage hero runs on a particle field that renders zero frames when nobody's near it — not throttled, actually stopped — and wakes only when a cursor comes close enough to matter. The wordmark breathes on a variable font axis instead of crossfading between static weights. Type is set across eight fluid, `clamp()`-based steps in a single self-hosted variable face, so the whole site scales continuously between a phone and a wide desktop instead of jumping at fixed breakpoints.

Underneath, the site is fully static — Astro, Tailwind, and a content-collection architecture that treats case studies and journal entries as structured data instead of one-off pages. Adding a new case study, like this one, means writing a Markdown file and a video folder, not touching a template.

The outcome is the studio's most literal case study: not a description of the philosophy, but the philosophy, running in a browser.
