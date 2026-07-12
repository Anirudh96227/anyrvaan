---
title: "Notes on an Editorial Type System"
description: "How one variable font and eight fluid steps became an entire type system — and how to build one small enough to actually hold in your head."
date: 2026-07-02
tags: ["typography", "design-systems"]
heroMotif: "graph"
---

The whole site runs on one typeface — Space Grotesk, self-hosted as a single variable file — and eight type steps. No secondary display face, no icon font, no per-page overrides. I wanted that constraint on purpose: a studio whose work is partly about restraint should probably have a type system that practices what it preaches. Here's how it's built, and how you'd build your own.

## One variable file, not a pile of static weights

A variable font makes weight a continuous axis instead of a handful of fixed cuts, and that's paid off twice here. The scale can pick the exact weight each step needs — 300 for a long, quiet intro paragraph, 500 for a subhead — without shipping five separate font files. And the hero wordmark can animate its weight directly, breathing between 370 and 440 as a real property change, instead of crossfading between two static pictures of the same word.

One file, every weight, plus the ability to move continuously between them. That's a lot of range for a single network request.

## clamp() instead of breakpoints

Each step is defined once as `clamp(min, fluid, max)`, so type scales smoothly between a phone and a wide desktop instead of jumping at three or four fixed breakpoints. Some steps do fluid work. Some deliberately don't. The whole system fits in one small table I can actually keep in my head:

<div class="table-wrap">

| Step | Role | Scales fluidly? |
|---|---|---|
| `display` | The big statement — hero moments | Yes, dramatically |
| `h1` – `h3` | Section and subsection headings | Yes, gently |
| `body-lg` | Long-form intro paragraphs | Barely |
| `body` | Default reading text | No — fixed and comfortable |
| `small` | Captions, metadata | No |
| `eyebrow` | Tiny uppercase labels | No — a fixed, quiet marker |

</div>

The eyebrow label — 0.75rem, wide letter-spacing, uppercase — never needs to scale. It's a small constant marker. The display and heading steps do the fluid work. Deciding which steps scale is most of the actual design, more than any specific number.

## A scale, not a size list

Here's the distinction that makes it a system instead of a list of numbers. Tailwind's theme layer lets a single utility like `text-h2` carry size, line-height, letter-spacing, and weight together, instead of a size class paired with separate tracking and leading classes at every call site.

That bundling is the whole game, really. A type scale guarantees every heading on the site sits at the same optical rhythm automatically. A type size list only guarantees the font sizes are right, and leaves line-height and spacing to drift heading by heading, page by page, until nothing quite lines up and no one can say why.

## Small enough to not drift

The result is a system I can hold in my head — eight names, one font file. That's the actual goal, more than any specific value chosen along the way. A type system you have to look up is a type system that will drift, because the moment it's easier to eyeball a size than recall the right token, people start eyeballing. Keep it small enough to remember and the consistency mostly takes care of itself.

## Build your own

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Count the type sizes in your current project. More than eight or nine, and you probably have duplicates doing the same job — merge them.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Name each step by its role — heading, body, caption — not its pixel size. Roles survive redesigns; "18px" doesn't.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Bundle line-height, letter-spacing, and weight into each step, so one name carries the whole look, not just the size.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Decide deliberately which steps scale with the viewport and which stay fixed. Headings usually scale; body and labels usually shouldn't.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Try one variable font before reaching for several static weights. One file that moves continuously often replaces a whole folder of them.</span></li>
</ul>
