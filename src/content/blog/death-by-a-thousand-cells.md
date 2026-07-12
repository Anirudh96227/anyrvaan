---
title: "Death by a Thousand Cells"
description: "Why I built a live spreadsheet-to-dashboard animation in React instead of writing about the idea — and what watching data actually move taught me that a sentence couldn't."
date: 2026-07-13
tags: ["data visualization", "react", "process"]
demo: "sheet-to-dashboard"
---

The piece above is running live in your browser, not playing back as a video. A spreadsheet on the left, a dashboard on the right, and a stream of small blue squares carrying each value across the gap — arriving, and the bar it belongs to filling in as it lands. It loops forever, costs nothing when it's off screen, and it's the whole argument of this post: **a spreadsheet doesn't fail because the numbers are wrong. It fails because nothing about it moves.**

## Why I built it instead of writing it

I could have made this point in a paragraph — "raw data is hard to read, a chart is easy to read." True, and forgettable. What actually convinced me wasn't the sentence, it was watching a single number leave a cell and become part of a shape. The value doesn't change identity when it moves; the *display* of it does. Seeing that happen, over and over, made an abstract claim about "legibility" into something I could point at.

That's really the whole case for building demonstrations instead of describing them: some ideas only land once you can watch them happen.

## What actually separates the two panels

<div class="table-wrap">

| The spreadsheet (left) | The dashboard (right) |
|---|---|
| Every value has equal visual weight | The one that changed is the one that's obvious |
| You have to *read* it, row by row | You can *see* it, at a glance |
| A snapshot — "last edited: stale copy" | Live — it updates as data arrives |
| Answers "what is the number" | Answers "what does the number mean" |
| Correct, but static | Correct, and legible |

</div>

Neither panel is lying. The spreadsheet's numbers and the dashboard's numbers are the same numbers. The only thing that changed is which one respects how attention actually works — and that's the entire pitch for a dashboard, stripped of every buzzword.

## The build, briefly

This is the one piece on the site built in React and TypeScript rather than plain JavaScript — a deliberate exception, not a drift in stack. The two panels are real DOM, tilted in 3D with a CSS `perspective`, because text set in an actual 3D transform stays crisp in a way a flat image or a canvas-rendered label never quite does. The data packets crossing the gap are a separate `<canvas>` layer on top, reading the live screen position of each source cell and target bar every frame — so the light genuinely travels from one to the other, not along a pre-baked path. React's job here is narrow and specific: keep two DOM trees and one canvas in sync as the same state ticks forward. That's a good reason to reach for a framework. It is not, on this site, the default.

## How to try this yourself

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Pick one claim you'd normally write a sentence to argue. Ask if it would land harder as something a viewer watches happen instead.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Find the "before" and "after" state of your data — the raw form and the readable form — and make the difference between them the whole point.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Animate the transfer, not just the destination. A bar that appears fully formed teaches nothing; a bar that visibly fills teaches where the number came from.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Reach for a framework only for the part that needs it. Here, that was two views staying in sync — everywhere else on this site, plain JavaScript is still enough.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Let it loop, and let it rest when no one's looking — an intersection observer pausing the animation off-screen costs you nothing and saves a visitor's battery.</span></li>
</ul>
