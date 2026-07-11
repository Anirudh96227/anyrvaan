---
title: "AI Made Creation Cheap. Taste Got Expensive."
description: "A practical way to spot generic AI output in your own work, and a rubric for fixing it — not just a feeling about 'good taste.'"
date: 2026-07-05
tags: ["ai", "taste", "craft"]
heroMotif: "funnel"
---

A year or two ago, making something — a poster, a short video, an illustrated series — took either money or a skill most people didn't have. Now it takes a sentence and a few minutes of waiting. That part of the job is basically solved. Everyone reading this has the same generator I do, and it's already good enough that "I made this with AI" stopped being an interesting fact about a piece of work.

So the honest question isn't "should I use AI." It's: once the tool is free and everyone has it, what's the actual, teachable skill that decides whether your output is any good? This post is my attempt to answer that concretely — not with a mood, but with a rubric I actually use.

## The skill isn't prompting

Prompting has a ceiling you hit in a few weekends. What doesn't have a ceiling is knowing which of the twenty options in front of you is the right one — and being able to say precisely *why* the other nineteen aren't, instead of just feeling it.

That second part matters more than it sounds. "I don't know, this one just feels better" is not a skill. It's not transferable, you can't teach it to a client who's paying you to make the call, and you can't improve it on purpose because you can't tell what you're actually reacting to. The skill is being able to name the specific thing that's wrong. Once you can name it, you can go fix exactly that thing on the next generation, instead of re-rolling the whole prompt and hoping.

Here's the diagnostic table I actually use when a generated image feels "off" but I can't immediately say why:

<div class="diagnostic" data-diagnostic><p class="diagnostic__label">Pick the symptom your output has</p><div class="diagnostic__body"><ul class="diagnostic__symptoms"><li><button type="button" class="diagnostic__symptom" data-diag="1">Every face looks like a generic "AI face"</button></li><li><button type="button" class="diagnostic__symptom" data-diag="2">Lighting looks like a render, not a place</button></li><li><button type="button" class="diagnostic__symptom" data-diag="3">The composition is centered and safe</button></li><li><button type="button" class="diagnostic__symptom" data-diag="4">Everything is equally in focus</button></li><li><button type="button" class="diagnostic__symptom" data-diag="5">Technically correct, but still "looks AI"</button></li></ul><div class="diagnostic__result"><div class="diagnostic__panel" data-diag-panel="1"><p class="diagnostic__means"><b>What it means</b>You described a category, not a person.</p><p class="diagnostic__fix"><b>The question that fixes it</b>What's one physical detail only this character would have?</p></div><div class="diagnostic__panel" data-diag-panel="2"><p class="diagnostic__means"><b>What it means</b>No light source was ever specified.</p><p class="diagnostic__fix"><b>The question that fixes it</b>Where is the light actually coming from, and why is it there?</p></div><div class="diagnostic__panel" data-diag-panel="3"><p class="diagnostic__means"><b>What it means</b>Default framing — no directorial choice was made.</p><p class="diagnostic__fix"><b>The question that fixes it</b>What's happening at the edge of the frame that most versions ignore?</p></div><div class="diagnostic__panel" data-diag-panel="4"><p class="diagnostic__means"><b>What it means</b>No depth decision was made.</p><p class="diagnostic__fix"><b>The question that fixes it</b>What's the one thing you want someone to look at first?</p></div><div class="diagnostic__panel" data-diag-panel="5"><p class="diagnostic__means"><b>What it means</b>It's the statistical average of the training data.</p><p class="diagnostic__fix"><b>The question that fixes it</b>What's the least obvious correct answer to this prompt?</p></div></div></div></div>

I built this table from getting it wrong, repeatedly, on the [*Heroes, Off Duty*](/work/heroes-off-duty/) series — nine claymation portraits of legendary figures. Left alone, the generator will happily give you Sherlock investigating a clue, Arthur mid-swing, Odysseus at the helm — technically correct, instantly forgettable, because it's the average of every image of that character the model has ever seen. The keeper version — Sherlock kneeling at a village wall, revealing a hidden world inside an ordinary stone instead of solving a mystery — only showed up after I got specific about what was wrong with the obvious version, not just "try again."

## Why this is actually good news

If judgment is the scarce skill now, that's a better position to be in than it sounds. Judgment is learnable in a way that raw execution skill wasn't — you don't need ten years of drawing practice to get better at it, you need reps of rejecting things for specific, articulable reasons. Every generation you correctly diagnose using something like the table above is a rep. Most people doing this professionally right now are not doing those reps; they're regenerating on vibes and hoping the fifth attempt looks better than the first, without ever learning *why* one did.

The tools got democratized. The judgment didn't. That gap is where the actual paid work lives now — and unlike prompting, it's a gap you can close on purpose.

## How to Proceed

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Next AI-assisted piece: generate at least 10 versions before picking one. Force yourself to see the range before judging any single output.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>For each one you reject, write a single sentence for <em>why</em>. If the sentence is vague ("this one's just better"), you haven't found your actual standard yet — keep going.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Run your last AI-assisted project through the table above. Find at least one symptom in your own work, honestly.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Next time you're about to hit "regenerate," write the specific critique question first — not "make it better," an actual question from the table. Only then regenerate.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Keep every rejected output for one month in a folder instead of deleting them. At the end of the month, look through it once. The pattern in what you rejected is your taste, made visible.</span></li>
</ul>
