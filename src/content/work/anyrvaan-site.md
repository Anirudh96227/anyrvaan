---
title: "The Studio Site"
summary: "The studio's own site, built as a working case study in restraint — a cursor-reactive particle field that costs nothing at rest, a fluid editorial type system, and motion that only ever answers to attention."
year: "2026"
tags: ["Web Design", "Front-end Engineering", "Design Systems"]
cover: "../../assets/work/anyrvaan-site.jpg"
coverAlt: "The Anyrvaan wordmark glowing over a field of particles on the site itself"
draft: true
---

I built this site as its own case study. The idea I kept in front of me was to make it behave like the work instead of just talking about the work. If I'm going to say motion should be earned, the site had to earn its own first, in its own code, before I could ask anyone to believe me.

That shaped everything. The homepage hero runs a particle field that renders zero frames when nobody's near it — actually stopped — and wakes only when a cursor comes close enough to matter. The wordmark breathes along a variable-font axis. Type is set in eight fluid, `clamp()`-based steps in one self-hosted variable face, so the whole site scales smoothly between a phone and a wide desktop.

Underneath, it's fully static — Astro, Tailwind, and a content-collection setup that treats case studies and journal entries as structured data. Adding a new case study, like this one, is writing a Markdown file and dropping in a video folder. No template surgery.

So this is the studio's most literal piece of work: the philosophy, running in a browser, where you can right-click and check it against what I claimed.
