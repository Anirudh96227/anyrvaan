---
title: "Building a Cursor-Reactive Particle Field"
description: "The engineering behind an ambient background that costs nothing at rest — and the specific decisions that separate a tasteful field from a battery drain."
date: 2026-06-09
tags: ["engineering", "motion"]
heroMotif: "ripple"
---

The homepage sits on a field of a few dozen to a hundred-odd points, spaced in a loose grid with a little jitter so it never quite reads as a pattern. Left alone, they just sit there. Bring a cursor within about 170 pixels and the nearby points get pulled toward it, then ease back home the moment the cursor drifts off. That's the entire interaction — no scenes, no timeline, no settings panel. What I actually want to talk about is the engineering underneath it, and the small decisions that were the difference between something tasteful and something that quietly drains a laptop battery.

## The one constraint that shaped everything: zero cost at rest

I kept coming back to one rule while building this: a field that idles at 60fps because "it's just a canvas" is a field that costs someone real battery to render a decorative background they're not even touching. I wasn't willing to ship that, and it ended up deciding almost everything else.

So the render loop only asks for another frame when something is actually moving — a particle still easing home, a pointer still active. The moment every point settles within its threshold, the loop stops itself. No `requestAnimationFrame` firing, nothing showing up on a profiler. The resting state of the whole animation is, genuinely, no animation at all. (This is the literal, in-code version of something I wrote about more generally in [Motion Born From Stillness](/blog/motion-born-from-stillness/).)

## The decisions that mattered more than I expected

The interaction itself is simple. Making it feel right, and cost nothing, came down to a handful of small, unglamorous calls:

<div class="table-wrap">

| Decision | The naive approach | What it actually took | Why |
|---|---|---|---|
| Pull strength | Linear falloff by distance | Squared falloff | Linear felt uniformly magnetic; squared feels like a real field with a soft edge |
| When to stop reacting | Stop on the last move event | Stay "active" for 900ms after | So the field doesn't snap to rest the instant a hand pauses mid-gesture |
| Weaker devices | Ship one version to everyone | Coarser grid + capped pixel ratio on low-core devices; touch skips it entirely | The same file shouldn't tax a mid-range phone to look crisp on a desktop |
| Reduced motion | A toggle bolted on later | Field renders once, statically; loop never starts | It's a promise not to move, so nothing moves — not a dimmer switch |

</div>

## Reduced motion is load-bearing, not a courtesy

That last row deserves its own paragraph. I think it's the one people treat as an afterthought most often. When a visitor's asked their system not to animate things, the field renders one static frame and the loop never starts at all. Same visual object, no motion promised, none delivered. Building that in from the start, instead of bolting it on later as an accessibility patch, is what let the rest of the code stay simple — because "not moving" was already a real state the whole system understood, not an exception someone had to remember.

## If you're building ambient motion

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Decide your rest-state cost first. If the honest answer is "60fps forever," redesign until idle actually means zero frames.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Make the loop self-stopping: only request the next frame while something's genuinely in motion, and let it halt on its own.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Profile on a mid-range phone, not your dev machine. Add device tiering before it's a complaint, not after.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Treat reduced-motion as a real state from day one — a static render and a loop that never begins, not a feature you gray out later.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Tune the feel, not just the function. A squared falloff, a short idle grace period — the small curves are what make it feel alive instead of mechanical.</span></li>
</ul>
