---
title: "Building a Cursor-Reactive Particle Field"
description: "The engineering behind an ambient background that costs nothing at rest — and the specific decisions that separate a tasteful field from a battery drain."
date: 2026-06-09
tags: ["engineering", "motion"]
heroMotif: "ripple"
---

The homepage sits on a field of a few dozen to a hundred-odd points, spaced in a loose grid with a little jitter so it doesn't read as a pattern. Left alone, they sit perfectly still. Bring a cursor within about 170 pixels and the nearby points get pulled toward it, then eased back home the moment the cursor moves on. That's the whole interaction — no scenes, no timelines, no config panel. This post is the engineering underneath it, and the decisions that made it tasteful instead of expensive.

## The one constraint that shaped everything: zero cost at rest

A field that idles at 60fps because "it's just a canvas" is a field that drains a laptop battery to render a decorative background nobody's touching. That's the thing I refused to ship, and it drove every other choice.

So the render loop only requests another frame when something is *actually* moving — a particle still easing home, or the pointer still active. The instant every point settles within its threshold, the loop stops itself. No `requestAnimationFrame` firing, no work, nothing on a profiler. The default state of the animation is genuinely no animation at all. (This is the literal, in-code version of a principle I wrote about separately in [Motion Born From Stillness](/blog/motion-born-from-stillness/).)

## The decisions that mattered more than expected

The interaction is simple; making it feel *right* and cost nothing came down to a handful of unglamorous calls:

<div class="table-wrap">

| Decision | The naive approach | What it actually took | Why |
|---|---|---|---|
| Pull strength | Linear falloff by distance | Squared falloff | Linear felt uniformly magnetic; squared feels like a real field with a soft edge |
| When to stop reacting | Stop on the last move event | Stay "active" for 900ms after | So the field doesn't snap to rest the instant a hand pauses mid-gesture |
| Weaker devices | Ship one version to everyone | Coarser grid + capped pixel ratio on low-core devices; touch skips it entirely | The same file shouldn't tax a mid-range phone to look crisp on a desktop |
| Reduced motion | A toggle bolted on later | Field renders once, statically; loop never starts | It's a promise not to move, so nothing moves — not a dimmer switch |

</div>

## Reduced motion is load-bearing, not a courtesy

That last row deserves its own paragraph, because it's the one most often treated as an afterthought. When a visitor has asked their system not to animate things, the field renders a single static frame and the render loop never starts at all. Same visual object, no motion promised, none delivered. Building that in from the start — rather than as a late accessibility patch — is what lets the rest of the code stay simple, because "not moving" is already a first-class state the whole system understands.

## If you're building ambient motion

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Decide your rest-state cost first. If the answer is "60fps forever," redesign until idle means zero frames. Battery is a feature.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Make the loop self-stopping: only request the next frame while something is genuinely in motion, and let it halt on its own.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Profile on a mid-range phone, not your dev machine. Add device tiering — coarser detail, capped pixel ratio — before it's a complaint.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Treat reduced-motion as a real state from the start: a static render and a loop that never begins, not a feature you gray out later.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Tune the feel, not just the function. Squared falloff, a short idle grace period — the small curves are what make it read as alive rather than mechanical.</span></li>
</ul>
