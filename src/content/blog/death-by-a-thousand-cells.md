---
title: "Death by a Thousand Cells"
description: "A spreadsheet doesn't fail because the numbers are wrong. It fails because nothing about it moves — and that's reason enough to rebuild it as a dashboard."
date: 2026-07-13
tags: ["data visualization", "react", "process"]
hero: "cell-flood"
demo: "sheet-to-dashboard"
---

I've sat in a lot of meetings where someone shares their screen, and it's a spreadsheet, and the first thirty seconds are just everyone squinting at it trying to find the number that matters. Nobody in that room thinks the spreadsheet is wrong. The math is fine. What's actually happening is that every cell is shouting at the same volume, so the one number that changed has to fight for attention against forty that didn't.

That's the whole case for a dashboard, once you strip away the buzzwords. Not that the numbers were bad. That nothing about how they were shown told you where to look.

## Why a spreadsheet loses your attention before it loses your trust

Watch above and you'll see the same forty-odd numbers rendered two ways — a spreadsheet on the left, a dashboard on the right, with the values themselves streaming across the gap between them. What I keep noticing, watching it loop, is that the number never actually changes. Only the way it's presented does. That's a strange thing to sit with. The data was never the problem.

A spreadsheet asks you to read. Row by row, column by column, holding a running comparison in your head as you go, because the sheet itself isn't going to do that comparison for you. A dashboard asks you to look. The bar that grew is the bar that grew — you don't have to hold anything in your head, because the shape already did the holding for you.

## What actually separates the two panels

<div class="table-wrap">

| The spreadsheet (left) | The dashboard (right) |
|---|---|
| Every value has equal visual weight | The one that changed is the one that's obvious |
| You have to read it, row by row | You can see it, at a glance |
| A snapshot — "last edited: stale copy" | Live — it updates as data arrives |
| Answers "what is the number" | Answers "what does the number mean" |
| Correct, but static | Correct, and legible |

</div>

Neither panel is lying. I want to be careful about that, because it's tempting to talk about spreadsheets like they're deceptive, and they're not. The spreadsheet's numbers and the dashboard's numbers are the same numbers, always. The only thing that changed is which one respects how attention actually works, and which one just assumes you'll supply the attention yourself.

## The part that's easy to get wrong

Here's where I think a lot of dashboards quietly fail, even good-looking ones: they animate the destination and skip the journey. A bar that just appears, fully grown, teaches you nothing about where the number came from. It's not really a step up from the spreadsheet — it's just a spreadsheet wearing a nicer shirt.

What seemed to matter more, watching this over and over, was the transfer itself — a value visibly leaving its source and arriving somewhere, the bar filling as it lands rather than snapping into place. That's the difference between a dashboard that shows you an answer and one that lets you watch the answer get made. The second kind is the one people actually start to trust, because they've seen where the number was standing a second ago.

## How to try this yourself

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Find the spreadsheet in your own work that everyone squints at before a meeting. That's your dashboard candidate, not the one that already looks fine.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Identify the one number people actually scan for first. Design so that number is the loudest thing on the screen, and let everything else go quiet.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Animate the journey, not just the destination. A bar that visibly fills teaches where the number came from; one that appears fully formed teaches nothing.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Don't dress up the same static snapshot as a dashboard. If it doesn't update, it's still a spreadsheet, just with a chart pasted over it.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Ask what a stranger would notice first, with no context. If the honest answer is "nothing in particular," the spreadsheet hasn't finished becoming a dashboard yet.</span></li>
</ul>
