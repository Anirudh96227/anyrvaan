// The Interaction Lab gallery's prototypes. Shared between the gallery
// grid (src/pages/experiments.astro) and each detail page
// (src/pages/experiments/[slug].astro). ExperimentCard.astro and [slug].astro
// key their hover/ambient CSS patterns off `slug` directly.
//
// Two layers of copy, because the card and the detail page show different things:
//   • description / fullDescription — the *idea*. This matches the card's hover
//     sketch (the codename's own letters performing the effect), the teaser.
//   • playground — the *real thing*. This matches the full interactive system on
//     the detail page (src/scripts/experiment-playgrounds.ts). Keep it describing
//     what a visitor actually does and sees when they click through.
export interface Experiment {
	slug: string;
	order: number;
	codename: string;
	classification: string;
	description: string;
	fullDescription: string;
	playground: string;
	tags: string[];
	// Detail-page playground surface. 'light' playgrounds (paper, type specimen,
	// ink-on-paper) read better on a pale ground; everything else stays 'dark'.
	// The card hover sketch is always on the dark gallery — this is detail-only.
	theme?: 'light' | 'dark';
	// For experiments rebuilt from a case study — a small "adapted from" credit
	// on the detail page linking back to the source work.
	source?: { label: string; href: string };
}

// Experiments 17–24 are rebuilt from the "A Field Guide to App Animations" atlas
// (src/content/work/ui-animation-atlas.md) — iconic, self-contained UI animations
// turned into live playgrounds. Their `source` links back to that case study.
const ATLAS = { label: 'A Field Guide to App Animations', href: '/work/ui-animation-atlas/' };

export const experiments: Experiment[] = [
	{
		slug: 'residual',
		order: 1,
		codename: 'Residual',
		classification: 'Temporal · Motion',
		description:
			'The word drifts on a slow loop, and its earlier positions linger behind it as pale afterimages — several versions of the same text fading at their own rates.',
		fullDescription:
			'The word drifts on a slow loop, and its earlier positions linger behind it as pale afterimages — several versions of the same text overlapping and fading at their own rates.',
		playground:
			'Your motion is recorded and replayed on staggered delays, so several past cursors keep moving through the space at once — overlapping timelines trailing behind you. Go still and an ambient hand keeps the loop alive. Tune how many timelines run and how far apart they sit.',
		tags: ['Canvas', 'Afterimage'],
	},
	{
		slug: 'fold',
		order: 2,
		codename: 'Fold',
		classification: 'Geometry · Physics',
		description:
			'A crease travels across the word. Every letter past it tips over the fold, shrinking and dimming as the line of type bends away from you.',
		fullDescription:
			'A crease travels across the word. Every letter past it tips over the fold line, shrinking and dimming as if the line of type were bending away from you like paper.',
		playground:
			'A real sheet of grainy paper. Grab the nearest corner and drag: the paper peels up and folds over, showing its textured back and a faint bleed of the print, with a lit crease, shadow pooling in the valley, and a soft shadow cast on the sheet below. Let go and it springs flat. Tune how springy the paper is.',
		tags: ['Canvas', 'Transforms'],
		theme: 'light',
	},
	{
		slug: 'flux-ink',
		order: 3,
		codename: 'Flux Ink',
		classification: 'Fluid · Motion',
		description:
			'The letters go soft and heavy, sagging on their own cycles while droplets of ink gather at their undersides and fall away.',
		fullDescription:
			'The letters go soft and heavy, sagging on their own cycles while droplets of ink gather at their undersides and fall away under gravity.',
		playground:
			'Click and drag to pour ink. Each droplet falls under gravity, pushes against its neighbours into a flowing fluid, and pools along the floor. Dial the gravity and viscosity and watch the ink change how it behaves.',
		tags: ['Canvas', 'Fluid'],
	},
	{
		slug: 'pulse-type',
		order: 4,
		codename: 'Pulse Type',
		classification: 'Living Typography',
		description:
			'Every letter keeps its own rhythm — rising, swelling, and fading a beat out of step with its neighbors — while the word stays readable.',
		fullDescription:
			'Every letter keeps its own rhythm — rising, swelling, and fading on a beat slightly out of step with its neighbors — while the word as a whole stays readable.',
		playground:
			'A type specimen that breathes. Every glyph keeps its own rhythm, and letters swell and lift as your cursor passes over them. Type your own word and dial the rate and amplitude of the pulse.',
		tags: ['Variable fonts', 'Canvas'],
		theme: 'light',
	},
	{
		slug: 'lumen',
		order: 5,
		codename: 'Lumen',
		classification: 'Dynamic Lighting',
		description:
			'A small light drifts along the line. Letters brighten and glow as it passes, each throwing a faint shadow the other way.',
		fullDescription:
			'A small light drifts along the line. Letters brighten and glow as it passes over them, each throwing a faint shadow the other way, so the word seems lit from a moving source.',
		playground:
			'A light source you carry. Move it across a relief of tiles — each brightens by how close it sits to the light and casts a soft shadow directly away from it. Adjust the light’s reach and the length of the shadows.',
		tags: ['Canvas', 'Lighting'],
	},
	{
		slug: 'swarm',
		order: 6,
		codename: 'Swarm',
		classification: 'Emergent Systems',
		description:
			'The letters scatter into loose debris, tumble, then fly back and snap into place — the word assembling itself out of noise before breaking apart again.',
		fullDescription:
			'The letters scatter into loose debris, tumble through the frame, then fly back and snap into place — the word assembling itself out of noise, holding a moment, and breaking apart again.',
		playground:
			'Hundreds of agents flock in real time — aligning, cohering, and steering clear of each other into living formations. Lead them with your cursor, or hold the button to scatter the flock, and tune the forces that hold it together.',
		tags: ['Canvas', 'Particles'],
	},
	{
		slug: 'field',
		order: 7,
		codename: 'Field',
		classification: 'Procedural Fields',
		description:
			'Each letter behaves like a compass needle, swinging to point toward a moving pole — the whole word reorienting like iron filings around a magnet.',
		fullDescription:
			'Each letter behaves like a compass needle, swinging to point toward a moving pole (your cursor, or a circling one). The whole word reorients like iron filings following a magnet.',
		playground:
			'A procedural flow field made of thousands of streaming particles. Every streamline follows a noise field you can rescale — and your cursor becomes a pole that curls the whole flow around it as you move.',
		tags: ['Canvas', 'Pointer'],
	},
	{
		slug: 'residue',
		order: 8,
		codename: 'Residue',
		classification: 'Persistent Systems',
		description:
			'Letters warm and glow where a passing sweep touches them, then cool slowly — so the word keeps a fading trace of where it has been touched.',
		fullDescription:
			'Letters warm and glow where a passing sweep (or your cursor) touches them, then cool slowly back down — so the word keeps a fading trace of where it has recently been touched.',
		playground:
			'A sheet of paper that never forgets. Draw, and the graphite you lay down stays, building a visual history of where you’ve been — and it’s saved to your browser, so your marks are still here the next time you visit. Reset clears the page.',
		tags: ['Canvas', 'Memory'],
		theme: 'light',
	},
	{
		slug: 'paradox',
		order: 9,
		codename: 'Paradox',
		classification: 'Optical Systems',
		description:
			'The word casts a reflection, but the reflection runs on where it thinks you are going — sliding ahead of the real motion instead of mirroring it.',
		fullDescription:
			'The word casts a reflection below itself, but the reflection runs on predicted motion — where it thinks you are going — sliding ahead of the real word instead of mirroring its present.',
		playground:
			'An object follows your cursor while its reflection runs on prediction, leaping ahead to where your motion is heading rather than mirroring where you are now. Push the prediction further and watch the reflection lead instead of follow.',
		tags: ['Canvas', 'Prediction'],
	},
	{
		slug: 'spectrum',
		order: 10,
		codename: 'Spectrum',
		classification: 'Spectral Motion',
		description:
			'The word splits into red, green, and blue copies that drift apart and recombine, fusing back to white wherever they overlap.',
		fullDescription:
			'The word splits into separate red, green, and blue copies that drift apart on their own cycles and recombine, fusing back to white wherever they overlap — chromatic aberration of the type itself.',
		playground:
			'The word’s red, green, and blue channels are three springs. Pull your cursor to fling them apart into chromatic aberration; bring it back to centre and they snap together into clean white. Tune the separation and springiness.',
		tags: ['Canvas', 'Blend modes'],
	},
	{
		slug: 'membrane',
		order: 11,
		codename: 'Membrane',
		classification: 'Surface Simulation',
		description:
			'The line behaves like a taut surface. A touch sends a ripple outward, and each letter lifts and glows for a moment as the wave passes through it.',
		fullDescription:
			'The line behaves like a taut surface. A touch (or an ambient tap) sends a ripple travelling outward, and each letter lifts and glows for a moment as the wavefront passes through it.',
		playground:
			'A taut spring mesh. Push into it and the displacement propagates node to node, rippling across the whole surface and slowly settling. Tune the tension and damping to make it slack and wobbly or drum-tight.',
		tags: ['Canvas', 'Waves'],
	},
	{
		slug: 'mirage',
		order: 12,
		codename: 'Mirage',
		classification: 'Visual Perception',
		description:
			'Thin horizontal bands of the word slide against each other, so the type shimmers like air over hot ground without ever really moving.',
		fullDescription:
			'The word is drawn in thin horizontal bands, each displaced by its own travelling wave, so the type shimmers like air over hot ground — motion built entirely from perception, never actual movement.',
		playground:
			'Heat haze over a desert horizon. The scene is redrawn in thin strips, each slid by a travelling wave that shimmers hardest where your cursor heats the air. Adjust how much heat there is and how fast it shimmers.',
		tags: ['Canvas', 'Perception'],
	},
	{
		slug: 'growth',
		order: 13,
		codename: 'Growth',
		classification: 'Organic Growth',
		description:
			'Each letter grows up from the baseline in turn — a thin stem rising first — overshoots, settles, then the word dissolves and begins again.',
		fullDescription:
			'Each letter grows up from the baseline in sequence — a thin stem rising ahead of it — overshoots, settles into place, then the whole word dissolves and grows itself again from nothing.',
		playground:
			'Click to plant a seed and branches climb, bend toward your cursor, split, and keep growing into vines and roots. What grows stays on screen. Tune the growth rate and how readily each branch forks.',
		tags: ['Canvas', 'Procedural'],
	},
	{
		slug: 'cadence',
		order: 14,
		codename: 'Cadence',
		classification: 'Motion Choreography',
		description:
			"A pulse runs through the word left to right, lifting and brightening each letter as it arrives — an equalizer moving to a beat you can't hear.",
		fullDescription:
			"A pulse runs through the word from left to right, lifting, swelling, and brightening each letter as it arrives — an equalizer moving to a beat you can't hear, motion standing in for sound.",
		playground:
			'A step sequencer where motion stands in for sound. Click the grid to compose a looping pattern; a playhead sweeps across it and every hit fires a visual pulse. Set the tempo and watch your composition play itself.',
		tags: ['Canvas', 'Choreography'],
	},
	{
		slug: 'collapse',
		order: 15,
		codename: 'Collapse',
		classification: 'Quantum Interaction',
		description:
			'Every letter flickers between two possible positions at once, then settles — left to right — into a single definite word, and starts over.',
		fullDescription:
			'Every letter flickers between two superposed positions at once, a white state and a blue one, then settles left to right into a single definite word, holds, and starts the cycle over.',
		playground:
			'A grid of cells held in superposition, each flickering between several ghost states at once. Your cursor measures the cells it passes, collapsing them to a single crisp outcome before they blur back — click to reroll every outcome.',
		tags: ['Canvas', 'State'],
	},
	{
		slug: 'infinite',
		order: 16,
		codename: 'Infinite',
		classification: 'Spatial Perspective',
		description:
			'Copies of the word recede toward a vanishing point, each smaller and dimmer than the last, drifting sideways as you move — the same text falling away into distance.',
		fullDescription:
			'Copies of the word recede toward a vanishing point above, each smaller and dimmer than the last through depth fog, and parallax sideways as you move — the same text stretching away into endless distance.',
		playground:
			'An endless receding landscape. A perspective grid streams toward you through depth fog while parallax stars drift overhead; steer the horizon with your cursor. Adjust the speed and fog — there is no far edge to reach.',
		tags: ['Canvas', 'Parallax'],
	},
	{
		slug: 'split-flap',
		order: 17,
		codename: 'Solari',
		classification: 'Mechanical Display',
		description:
			'The letters riffle through the alphabet like a split-flap departure board, each cell clattering to a stop a beat after the one before it.',
		fullDescription:
			'The letters riffle through the alphabet like a split-flap departure board, each cell cycling through characters and clattering to a stop a beat after the one before it, so the word settles left-to-right.',
		playground:
			'A Solari departure board. Type any message and every cell riffles through the whole alphabet before landing, the row settling left-to-right with a clatter you can almost hear. Leave it be and it re-spells itself.',
		tags: ['Canvas', 'Mechanical'],
		source: ATLAS,
	},
	{
		slug: 'heart-burst',
		order: 18,
		codename: 'Bloom',
		classification: 'Feedback · Motion',
		description:
			'A tap blooms a ring that shatters into particles as the mark pops into place — the flick of a “like”.',
		fullDescription:
			'A tap blooms a ring that shatters into a spray of particles as the filled mark pops into place with an overshoot — the exact flick of a “like”.',
		playground:
			'The like animation, rebuilt. Click anywhere and a ring blooms and shatters into particles while the heart pops in with an overshoot — the grammar of a tap-to-like, down to the timing. Tune the burst size.',
		tags: ['Canvas', 'Particles'],
		source: ATLAS,
	},
	{
		slug: 'odometer',
		order: 19,
		codename: 'Tally',
		classification: 'Mechanical Display',
		description:
			'Number wheels roll past each other, a higher wheel turning only at the instant the wheel beneath it rolls over.',
		fullDescription:
			'Number wheels roll vertically past each other, the next value dragging the current one out, and a higher wheel turning only at the instant the wheel beneath it rolls over from nine to zero.',
		playground:
			'Mechanical number wheels. Drag up or down to spin the count, or click to add one; each wheel rolls, and a high wheel only turns at the moment the wheel below it carries. Set the digit count and the auto-drift.',
		tags: ['Canvas', 'Mechanical'],
		source: ATLAS,
	},
	{
		slug: 'gauge',
		order: 20,
		codename: 'Needle',
		classification: 'Instrument Physics',
		description:
			'A needle swings to its mark, overshoots by a hair, and settles in a single damped bob — weight you can read.',
		fullDescription:
			'A needle swings to its mark, overshoots it by a few degrees, and settles back in a single damped oscillation — mass and inertia made visible, not an easing curve.',
		playground:
			'A physical gauge. Drag across the dial to set a target and the needle overshoots it by a few degrees, then settles in one damped swing — weight and inertia, not an easing curve. Tune the stiffness and damping.',
		tags: ['Canvas', 'Spring'],
		source: ATLAS,
	},
	{
		slug: 'phosphor',
		order: 21,
		codename: 'Phosphor',
		classification: 'Terminal · Phosphor',
		description:
			'Characters print across a green phosphor screen at typing speed, each glowing for a frame and trailing a dim ghost, scanlines and all.',
		fullDescription:
			'Characters print across a green phosphor screen at cursor speed, each glowing overbright for a frame and trailing a dim ghost of the text behind, over scanlines and a soft tube vignette.',
		playground:
			'A green-screen terminal. Type a command and it prints at cursor speed, each character glowing overbright for a frame and trailing a dim ghost, over scanlines and a soft vignette, with a blinking block cursor. Set the type speed.',
		tags: ['Canvas', 'CRT'],
		source: ATLAS,
	},
	{
		slug: 'knob',
		order: 22,
		codename: 'Detent',
		classification: 'Tactile Control',
		description:
			'A control that turns in notches, clicking from one detent to the next rather than sliding free.',
		fullDescription:
			'A control that turns in notches — snapping from one physical detent to the next with a tick rather than sliding freely, each mark on the ring brightening as it passes.',
		playground:
			'A detented rotary knob. Drag around it to turn through fixed detents — it clicks from notch to notch instead of gliding, and each tick lights as it passes. Set how many detents the ring has.',
		tags: ['Canvas', 'Pointer'],
		source: ATLAS,
	},
	{
		slug: 'stamp',
		order: 23,
		codename: 'Impress',
		classification: 'Print · Paper',
		description:
			'A rubber stamp slams down, overshoots, and lifts to leave rough ink pressed slightly off-square.',
		fullDescription:
			'A rubber stamp slams down with an overshoot, holds for a moment, and lifts to leave rough, dropout-flecked ink pressed slightly off-square into the paper.',
		playground:
			'A rubber stamp on paper. Click anywhere to slam an impression: it overshoots, holds, and lifts to leave rough, dropout-flecked ink pressed slightly off-square. Impressions pile up — or switch to one at a time.',
		tags: ['Canvas', 'Print'],
		theme: 'light',
		source: ATLAS,
	},
	{
		slug: 'pull-refresh',
		order: 24,
		codename: 'Rebound',
		classification: 'Gesture · Elastic',
		description:
			'Pull the list past its edge and it stretches, resists, and springs back — the rubber-band of a refresh.',
		fullDescription:
			'Pull the list past its edge and it stretches with real rubber-band resistance, a spinner arming as you cross the threshold, then springs back and drops a fresh row in.',
		playground:
			'The pull-to-refresh gesture. Drag the list down past its top and it stretches with rubber-band resistance; a spinner arms as you pass the line, and releasing snaps it back and drops a fresh row in. Tune the arm distance.',
		tags: ['Canvas', 'Gesture'],
		source: ATLAS,
	},
];
