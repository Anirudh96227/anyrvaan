---
title: "Motion Born From Stillness"
description: "A working test for whether an animation earns its place on the screen — the principle the whole studio is built on, made practical."
date: 2026-05-18
tags: ["philosophy", "process"]
heroMotif: "ripple"
---

Most interfaces move because the tools make it easy, not because the moment calls for it. A hover lifts a card that didn't need lifting. A page fades when a hard cut would have been more honest. Motion becomes wallpaper — technically present, felt by no one, and quietly training people to ignore movement altogether.

The studio starts from the opposite assumption, and it's less a mood than a rule you can apply: **rest is the default, and every animation has to justify its presence.** This post is about how to actually make that call, because "use motion sparingly" is advice everyone nods at and nobody can act on.

## The test: what is this motion *for*?

An animation earns its place if it does one of three specific jobs: it clarifies what just changed, it guides attention somewhere useful, or it makes the interface feel more alive to the touch. If a given piece of motion isn't doing at least one of those, it isn't restrained — it's noise wearing a nice easing curve.

The useful move is to name the job out loud for each animation. If you can't, that's your answer.

<div class="table-wrap">

| The motion | Wallpaper (cut it) | Earns its place (keep it) |
|---|---|---|
| A card lifting on hover | Because hover effects are expected | Because it signals the card is the thing you'll act on |
| A page transition | A default fade on every route change | A movement that shows where you came from |
| A number changing | It animates because a library made it easy | It counts up so you register that it changed |
| An ambient background | It loops forever because empty felt wrong | It responds to you, then returns to stillness |

</div>

## It isn't restraint for its own sake

The point of all this subtraction isn't minimalism as an aesthetic. It's a bet about attention: a calmer surface holds it better than a busy one, and stillness is precisely what makes the motion that *is* there legible. If everything moves, nothing reads as meaningful. The one animation that matters gets lost in the twenty that don't.

You can see the bet taken literally on this site's homepage. The background field renders zero frames when no one is near it — not slowed down, actually stopped — and wakes only when a cursor reaches for it, then eases back to rest. (The mechanics are in [Building a Cursor-Reactive Particle Field](/blog/building-a-cursor-reactive-particle-field/).) Motion there is genuinely *born* from stillness, rather than layered on top of it.

## The same rhythm, off-screen

This isn't only a UI principle. A pitch, a room, a product launch — the quiet moments are what make the loud ones land. A presentation that's all crescendo has no crescendo. The studio tries to build that rhythm into everything, not just the parts with a `transition` property, because the underlying idea is the same: contrast needs a baseline, and stillness is the baseline that makes movement mean something.

## Audit your own motion

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Open your current project and list every animation on one screen. Most people underestimate the count until they write it down.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>For each, name its job in one sentence: clarify, guide, or bring to life. No sentence means no job.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Cut every animation you couldn't name a job for. Live with the stiller version for a day before deciding you miss any of them.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Check that nothing loops forever for decoration. Ambient motion should respond to the person and then rest, not run on a treadmill.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Confirm the whole thing still makes sense with motion disabled entirely — because for some visitors, by preference, it will be.</span></li>
</ul>
