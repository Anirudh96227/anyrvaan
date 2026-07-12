---
title: "Why the Best AI Art Doesn't Look Like AI Art Anymore"
description: "The tells that mark an image as machine-made — and the specific directorial moves that remove them."
date: 2026-03-28
tags: ["ai", "craft", "art-direction"]
heroMotif: "funnel"
---

You can usually spot AI art in a fraction of a second, and I've started asking myself why — because the answer turns out to be a to-do list. The tells aren't really about the technology. They're about defaults, the choices a model makes when nobody makes a choice for it. The best AI-assisted work doesn't look machine-made because someone overrode every one of those defaults on purpose.

## The tells are all defaults

Left alone, a generator reaches for the center of everything it's seen. Perfect symmetry, because symmetry is average. Over-rendering, because more detail reads as "more effort" in the training data. A slightly plastic sheen, faces pointed straight at the camera, lighting from nowhere in particular. None of these are really mistakes. They're the visual sound of no decision being made.

Which means the fix is never "better prompting" in some abstract sense. It's making the specific decision the model declined to make.

<div class="table-wrap">

| The AI tell | Why it happens | The directorial override |
|---|---|---|
| Uncanny symmetry | Symmetry is the statistical average | Compose off-center; let the subject sit at an edge |
| Over-rendered, too much detail everywhere | Detail correlates with "effort" in training data | Decide what's in focus and let the rest fall away |
| Everything already resolved and finished | The model defaults to the "complete" version of anything | Catch the subject a beat before it becomes what it's about to become |
| Faces to camera, posed | Portraits in the data face forward | Turn the subject away; catch them mid-action or at rest |
| Light from nowhere | No light source was ever specified | Name where the light is, and why it's there |

</div>

## A worked example: refusing the finished version

For [*Rough Cut Divinity*](/work/rough-cut-divinity/), the whole look leans on overriding that "already resolved" default. Ask for lightning and a generator will happily hand you a sword — because a sword is the tidy, finished, statistically likely answer. What I actually wanted was the lightning a beat before it decides to be anything. Every piece is specified as caught mid-transformation on purpose: a lotus not yet fully open, two forms mid-merge, neither one settled. That's not a decoration. It's a direct veto of the model's instinct to hand you the completed, recognizable, average version of the idea. The image stops looking like every other generated god not because the model got better, but because the generic reflex — finish it, resolve it, make it legible at a glance — got a specific instruction instead.

## "Looks unresolved" is the same skill as "looks intentional"

Here's the part that generalizes past images entirely. Whether you're directing a generator, laying out a page, or editing a video, what separates the work from slop is the presence of decisions a viewer can feel. Off-center framing feels chosen. A single deliberate light feels chosen. Restraint — leaving most of the frame quiet, or most of the story unresolved — feels chosen. The machine's defaults never feel chosen, because they weren't. Your whole job, as far as I can tell, is to leave fingerprints. (For the harder discipline of choosing among outputs once you've made that decision, see [Twenty Images, One Keeper](/blog/twenty-images-one-keeper/).)

## A de-slopping pass

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Break the symmetry. If the composition is centered and balanced by default, deliberately pull the subject off-axis.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Specify a real light source and where it's coming from. That single detail beats any amount of "high quality, detailed."</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Choose one thing to be in focus and let everything else soften. Uniform detail is the loudest tell there is.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Ask for the moment before the obvious resolution, not the resolution itself. It's the fastest way to dodge the average answer.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Do a final pass in a real editor — crop, grade, adjust. A human hand on the last 5% often erases the machine-made feel entirely.</span></li>
</ul>
