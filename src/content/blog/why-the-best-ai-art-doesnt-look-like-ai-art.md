---
title: "Why the Best AI Art Doesn't Look Like AI Art Anymore"
description: "The tells that mark an image as machine-made — and the specific directorial moves that remove them."
date: 2026-03-28
tags: ["ai", "craft", "art-direction"]
heroMotif: "funnel"
---

You can usually spot AI art in a fraction of a second, and it's worth asking *why* — because the answer is a to-do list. The tells aren't really about the technology. They're about defaults: the choices the model makes when nobody makes a choice for it. The best AI-assisted work doesn't look machine-made because someone overrode every one of those defaults on purpose.

## The tells are all defaults

Left alone, a generator reaches for the center of everything it has seen. Perfect symmetry, because symmetry is average. Over-rendering, because more detail reads as "more effort" in the training data. A slightly plastic sheen, faces pointed at the camera, lighting that comes from nowhere in particular. None of these are mistakes exactly — they're the visual sound of no decision being made.

Which means the fix is never "better prompting" in the abstract. It's making the specific decision the model declined to make.

<div class="table-wrap">

| The AI tell | Why it happens | The directorial override |
|---|---|---|
| Uncanny symmetry | Symmetry is the statistical average | Compose off-center; let the subject sit at an edge |
| Over-rendered, too much detail everywhere | Detail correlates with "effort" in training data | Decide what's in focus and let the rest fall away |
| Plastic, glossy surfaces | Gloss photographs as "high quality" | Ask for a real material — clay, paper, worn metal |
| Faces to camera, posed | Portraits in the data face forward | Turn the subject away; catch them mid-action or at rest |
| Light from nowhere | No light source was ever specified | Name where the light is, and why it's there |

</div>

## A worked example: making it clay

For the [*Heroes, Off Duty*](/work/heroes-off-duty/) series, the entire look leans on overriding the gloss tell. Every scene is specified as handmade claymation — visible fingerprints, tool marks, muted earth tones, one soft warm light with no obvious source. Those aren't decorations; each is a direct veto of a default. "Visible fingerprints" kills the plastic sheen. "One warm light" kills the light-from-nowhere flatness. The image stops looking generated not because the model got better, but because every generic reflex got a specific instruction instead.

## "Looks handmade" is the same skill as "looks intentional"

Here's the part that generalizes beyond images. Whether you're directing a generator, laying out a page, or editing a video, the thing that separates it from slop is the presence of decisions a viewer can feel. Off-center framing feels chosen. A single deliberate light feels chosen. Restraint — leaving most of the frame quiet — feels chosen. The machine's defaults never feel chosen, because they weren't. Your whole job is to leave fingerprints. (For the harder discipline of *choosing* among outputs, see [Twenty Images, One Keeper](/blog/twenty-images-one-keeper/).)

## A de-slopping pass

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Break the symmetry. If the composition is centered and balanced by default, deliberately pull the subject off-axis.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Specify a real material and a real light source. "Clay, lit warmly from the left" beats any amount of "high quality, detailed."</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Choose one thing to be in focus and let everything else soften. Uniform detail is the loudest tell there is.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Turn faces and subjects away from the camera. Caught mid-action reads as real; posed-to-lens reads as generated.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Do a final pass in a real editor — crop, grade, adjust. A human hand on the last 5% is often what erases the machine-made feel entirely.</span></li>
</ul>
