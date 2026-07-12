---
title: "Motion Born From Stillness"
description: "A working test for whether an animation earns its place on the screen — the principle the whole studio is built on, made practical."
date: 2026-05-18
tags: ["philosophy", "process"]
heroMotif: "ripple"
---

Most interfaces move because the tools make it easy, not because the moment calls for it. A hover lifts a card that didn't need lifting. A page fades when a hard cut would've been more honest. Motion turns into wallpaper — technically present, felt by no one, and quietly training people to stop noticing movement at all.

I start from the opposite assumption, and it's less a mood than a rule I can actually apply: rest is the default, and every animation has to earn its presence. "Use motion sparingly" is advice everyone nods along to and almost nobody can act on. This is my attempt at something more useful than a nod.

## The test: what is this motion for?

An animation earns its place if it does one of three jobs. It clarifies what just changed. It guides attention somewhere useful. Or it makes the interface feel more alive to the touch. If a piece of motion isn't doing at least one of those, it isn't restrained. It's noise wearing a nice easing curve.

The useful move, I've found, is to say the job out loud for each animation. If you can't name it, that's your answer already.

<div class="table-wrap">

| The motion | Wallpaper (cut it) | Earns its place (keep it) |
|---|---|---|
| A card lifting on hover | Because hover effects are expected | Because it signals the card is the thing you'll act on |
| A page transition | A default fade on every route change | A movement that shows where you came from |
| A number changing | It animates because a library made it easy | It counts up so you register that it changed |
| An ambient background | It loops forever because empty felt wrong | It responds to you, then returns to stillness |

</div>

## It isn't restraint for its own sake

The point of all this subtraction was never minimalism as a look. It's a bet about attention — a calmer surface holds it better than a busy one, and stillness is precisely what makes the motion that *is* there legible. If everything moves, nothing reads as meaningful. The one animation that matters gets lost among the twenty that don't.

You can see the bet taken pretty literally on this site's homepage. The background field renders zero frames when no one's near it — not slowed down, actually stopped — and only wakes when a cursor reaches for it, then eases back to rest. (The mechanics are in [Building a Cursor-Reactive Particle Field](/blog/building-a-cursor-reactive-particle-field/).) The motion there is genuinely born from stillness, rather than something layered on top of it afterward.

## The same rhythm, off-screen

I don't think this is only a UI principle, honestly. A pitch, a room, a product launch — the quiet moments are what make the loud ones land. A presentation that's all crescendo has no crescendo left to give. I try to build that rhythm into everything, not just the parts with a transition property, because the underlying idea doesn't change: contrast needs a baseline, and stillness is the baseline that makes movement mean something.

## Audit your own motion

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Open your current project and list every animation on one screen. Most people underestimate the count until they write it down.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>For each, name its job in one sentence: clarify, guide, or bring to life. No sentence means no job.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Cut every animation you couldn't name a job for. Live with the stiller version for a day before deciding you miss any of them.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Check that nothing loops forever purely for decoration. Ambient motion should respond to the person and then rest, not run on a treadmill.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Confirm the whole thing still makes sense with motion disabled entirely. For some visitors, by preference, it will be.</span></li>
</ul>
