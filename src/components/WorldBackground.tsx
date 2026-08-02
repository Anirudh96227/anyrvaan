import { useEffect, useRef } from 'react';
import { BREATH_MS, timeSinceInput } from '../scripts/stillness';

/**
 * An ambient "world" behind a case study or post — one fixed, low-opacity
 * canvas whose motif matches the piece's subject. One mood per meaning, not
 * a palette swap:
 *   retro         — CRT scanlines drifting, with a slow phosphor flicker
 *   spiritual     — concentric rings of dots, breathing and turning
 *   dashboard     — a faint data grid with a scan pulse sweeping across
 *   ui            — a cell grid lit by a slow-drifting cursor of light
 *   effects       — sparse particles drifting like the homepage field
 *   orb-trail     — a single point on a long slow loop, trailing behind it
 *                   (echoes-of-eternity: the witness that keeps moving)
 *   grid-swarm    — a dense field of cells lighting in a traveling wave
 *                   (effects-library: 300 instances, one system)
 *   diorama-drift — fixed warm points, lit as a slow spotlight sweeps past
 *                   (miniature-india: light crossing dioramas on a shelf)
 *   almost-nothing— a handful of barely-there dots, the thesis as the visual
 *                   (anti-ui-atlas: the best tool disappears)
 *   code-pulse    — thin lines flickering on/off like a terminal cursor
 *                   (motion-made-with-code: many small builds, one method)
 *   suspended-arc — short arcs that swing toward completion and stop early,
 *                   every time (sketch-to-video: the films stop before they land)
 *   dusk-to-night — one field of lamps carried from warm dusk to moonlight as
 *                   you scroll (childrens-stories: two films, two hours)
 *
 * Contract (same as the rest of the site): static under prefers-reduced-motion,
 * paused when the tab is hidden, thinner on coarse pointers / low-core devices,
 * and kept faint enough that body copy stays readable straight over it.
 */
export type World =
	| 'retro'
	| 'spiritual'
	| 'dashboard'
	| 'ui'
	| 'effects'
	| 'orb-trail'
	| 'grid-swarm'
	| 'diorama-drift'
	| 'almost-nothing'
	| 'code-pulse'
	| 'suspended-arc'
	| 'enso'
	| 'dusk-to-night';

const COBALT = '96, 165, 250'; // the site's one signal blue, rgb
const PHOSPHOR = '110, 231, 183'; // faint CRT green, retro only
const AMBER = '240, 190, 120'; // warm ember — diorama-drift only
const MOON = '186, 205, 240'; // cool moonlight — dusk-to-night only

export default function WorldBackground({ theme }: { theme: World }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const coarse = matchMedia('(pointer: coarse)').matches;
		const lowTier = coarse || (navigator.hardwareConcurrency || 8) <= 4;
		const dpr = Math.min(window.devicePixelRatio || 1, lowTier ? 1 : 1.5);

		let w = 0,
			h = 0;
		const resize = () => {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		// Effects/particle seed (only used by the 'effects' world).
		const N = lowTier ? 26 : 46;
		const px = new Float32Array(N),
			py = new Float32Array(N),
			pr = new Float32Array(N),
			pv = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			px[i] = Math.random() * w;
			py[i] = Math.random() * h;
			pr[i] = 0.8 + Math.random() * 1.8;
			pv[i] = 0.06 + Math.random() * 0.16; // slow upward drift
		}

		// orb-trail: a short ring-buffer of the orb's recent positions.
		const TRAIL_LEN = 34;
		const trailX = new Float32Array(TRAIL_LEN);
		const trailY = new Float32Array(TRAIL_LEN);
		let trailFilled = false;

		// diorama-drift: fixed warm points (one per "diorama"), a spotlight
		// sweeps past and lights whichever it's nearest.
		const DIO_N = 13;
		const dioX = new Float32Array(DIO_N);
		const dioY = new Float32Array(DIO_N);
		for (let i = 0; i < DIO_N; i++) {
			dioX[i] = Math.random() * w;
			dioY[i] = Math.random() * h;
		}

		// suspended-arc: two rings, centred and concentric, on the same clock a
		// third of a cycle apart. An earlier version scattered eight small arcs at
		// random positions, which read as busy rather than withheld — and the
		// project is about one decision, made once. So: one gesture, held.

		// enso: the site's own mark, drawn slowly and left open. Each one takes
		// most of a minute to come round, rests, and lifts — the case study
		// about this site gets the thing this site keeps drawing.
		const ENSO_N = 4;
		const ensoX = new Float32Array(ENSO_N);
		const ensoY = new Float32Array(ENSO_N);
		const ensoR = new Float32Array(ENSO_N);
		const ensoSeed = new Float32Array(ENSO_N);
		for (let i = 0; i < ENSO_N; i++) {
			ensoX[i] = (0.18 + Math.random() * 0.64) * w;
			ensoY[i] = (0.12 + Math.random() * 0.76) * h;
			ensoR[i] = 46 + Math.random() * 74;
			ensoSeed[i] = Math.random() * 1000;
		}

		// dusk-to-night: a field of lamps, seeded low in the frame — diyas on
		// steps, lanterns along a bank. They never move. What changes across the
		// page is the hour they're burning in.
		const LAMP_N = lowTier ? 13 : 21;
		const lampX = new Float32Array(LAMP_N);
		const lampY = new Float32Array(LAMP_N);
		const lampSeed = new Float32Array(LAMP_N);
		for (let i = 0; i < LAMP_N; i++) {
			lampX[i] = Math.random() * w;
			// Weighted toward the lower half: light sits on the ground here, it
			// isn't scattered through the sky.
			lampY[i] = h * (0.38 + Math.pow(Math.random(), 0.7) * 0.56);
			lampSeed[i] = Math.random() * 1000;
		}

		// almost-nothing: very few, very faint, very slow.
		const FAINT_N = 7;
		const faintX = new Float32Array(FAINT_N);
		const faintY = new Float32Array(FAINT_N);
		const faintSeed = new Float32Array(FAINT_N);
		for (let i = 0; i < FAINT_N; i++) {
			faintX[i] = Math.random() * w;
			faintY[i] = Math.random() * h;
			faintSeed[i] = Math.random() * 1000;
		}

		let scrollMax = 1;
		const measureScroll = () => {
			const d = document.documentElement;
			scrollMax = Math.max(1, d.scrollHeight - d.clientHeight);
		};
		measureScroll();

		function draw(t: number) {
			ctx!.clearRect(0, 0, w, h);
			const cx = w / 2,
				cy = h * 0.42;

			// Scroll-driven light (#7): the world wakes as you travel into the
			// middle of the page and settles again at the ends — motion born from
			// the visitor's own scroll. A cobalt horizon rises with progress.
			const prog = Math.min(1, Math.max(0, (document.documentElement.scrollTop || window.scrollY) / scrollMax));
			const ignite = Math.sin(prog * Math.PI); // 0 → 1 → 0 across the page
			const light = 0.45 + 0.55 * ignite;

			// The shared breath: one resting human breath (BREATH_MS), the same
			// tempo the ensō draws at — so the world and the mark agree on what a
			// breath is instead of each inventing a rate. 0 → 1 → 0, weightless
			// at both turns.
			const breathPhase = (t % BREATH_MS) / BREATH_MS;
			const worldBreath = 0.5 - 0.5 * Math.cos(2 * Math.PI * breathPhase);

			// And the world reads the room: once the visitor stops scrolling and
			// actually settles in to read, it draws a fuller breath. Scan past
			// and it flattens out of the way. Never faster than the breath —
			// nothing here startles.
			const stillness = Math.min(1, timeSinceInput() / BREATH_MS);
			const swell = 1 + 0.16 * stillness * worldBreath;

			// Clamped: canvas silently ignores a globalAlpha outside 0..1, which
			// would leave the previous frame's value stuck instead of erroring.
			ctx!.globalAlpha = Math.min(1, light * (0.88 + 0.12 * stillness) * swell);

			if (theme === 'retro') {
				// drifting scanlines + a slow brightness flicker
				const off = (t * 0.012) % 6;
				const flick = 0.5 + 0.5 * Math.sin(t * 0.004);
				ctx!.strokeStyle = `rgba(${PHOSPHOR}, ${(0.11 + 0.05 * flick).toFixed(3)})`;
				ctx!.lineWidth = 1;
				ctx!.beginPath();
				for (let y = -6 + off; y < h; y += 6) {
					ctx!.moveTo(0, y);
					ctx!.lineTo(w, y);
				}
				ctx!.stroke();
				// a single soft phosphor bloom sweeping down
				const sweepY = ((t * 0.03) % (h + 300)) - 150;
				const g = ctx!.createRadialGradient(cx, sweepY, 0, cx, sweepY, 300);
				g.addColorStop(0, `rgba(${PHOSPHOR}, 0.13)`);
				g.addColorStop(1, `rgba(${PHOSPHOR}, 0)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(0, sweepY - 300, w, 600);
			} else if (theme === 'spiritual') {
				// concentric rings of dots, breathing + slowly turning — large
				// enough that the outer rings reach the frame's edges
				const breath = 1 + 0.04 * Math.sin(t * 0.0009);
				const rot = t * 0.00006;
				const rings = lowTier ? 5 : 6;
				const unit = Math.min(w, h) * 0.075;
				for (let r = 1; r <= rings; r++) {
					const rad = r * unit * breath;
					const count = 6 * r;
					const off = r % 2 ? rot : -rot + Math.PI / count;
					ctx!.fillStyle = `rgba(${r === 3 ? COBALT : '235,235,235'}, ${(0.62 - r * 0.055).toFixed(3)})`;
					for (let k = 0; k < count; k++) {
						const a = (k / count) * Math.PI * 2 + off;
						const x = cx + Math.cos(a) * rad;
						const y = cy + Math.sin(a) * rad;
						ctx!.beginPath();
						ctx!.arc(x, y, 1.8, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			} else if (theme === 'dashboard') {
				// faint grid + a horizontal scan pulse
				const cell = 64;
				ctx!.strokeStyle = `rgba(${COBALT}, 0.11)`;
				ctx!.lineWidth = 1;
				ctx!.beginPath();
				for (let x = 0; x < w; x += cell) {
					ctx!.moveTo(x, 0);
					ctx!.lineTo(x, h);
				}
				for (let y = 0; y < h; y += cell) {
					ctx!.moveTo(0, y);
					ctx!.lineTo(w, y);
				}
				ctx!.stroke();
				const sx = (t * 0.05) % (w + 260);
				const g = ctx!.createLinearGradient(sx - 260, 0, sx, 0);
				g.addColorStop(0, `rgba(${COBALT}, 0)`);
				g.addColorStop(1, `rgba(${COBALT}, 0.22)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(sx - 260, 0, 260, h);
			} else if (theme === 'ui') {
				// a cell grid lit by a slow-drifting cursor of light
				const cell = 46;
				const lx = cx + Math.cos(t * 0.00035) * w * 0.34;
				const ly = cy + Math.sin(t * 0.00045) * h * 0.32;
				for (let x = cell / 2; x < w; x += cell) {
					for (let y = cell / 2; y < h; y += cell) {
						const d = Math.hypot(x - lx, y - ly);
						const near = Math.max(0, 1 - d / 300);
						if (near <= 0.02) continue;
						ctx!.fillStyle = `rgba(${COBALT}, ${(0.6 * near * near).toFixed(3)})`;
						ctx!.beginPath();
						ctx!.arc(x, y, 1.4 + near * 1.8, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			} else if (theme === 'orb-trail') {
				// a single witness point on a long, slow, non-repeating loop —
				// the same dot-and-trail language as the SignalDot lineage
				const ox = cx + Math.sin(t * 0.00021) * w * 0.36 + Math.sin(t * 0.00007) * w * 0.12;
				const oy = cy + Math.cos(t * 0.00017) * h * 0.3 + Math.sin(t * 0.00011) * h * 0.14;
				for (let i = TRAIL_LEN - 1; i > 0; i--) {
					trailX[i] = trailX[i - 1];
					trailY[i] = trailY[i - 1];
				}
				trailX[0] = ox;
				trailY[0] = oy;
				if (!trailFilled) {
					// first frame: seed the whole buffer so the trail doesn't snake in from (0,0)
					for (let i = 1; i < TRAIL_LEN; i++) {
						trailX[i] = ox;
						trailY[i] = oy;
					}
					trailFilled = true;
				}
				for (let i = 1; i < TRAIL_LEN; i++) {
					const age = i / TRAIL_LEN;
					ctx!.strokeStyle = `rgba(${COBALT}, ${(0.32 * (1 - age)).toFixed(3)})`;
					ctx!.lineWidth = 2.4 * (1 - age);
					ctx!.beginPath();
					ctx!.moveTo(trailX[i - 1], trailY[i - 1]);
					ctx!.lineTo(trailX[i], trailY[i]);
					ctx!.stroke();
				}
				ctx!.fillStyle = `rgba(235,235,235, 0.75)`;
				ctx!.beginPath();
				ctx!.arc(ox, oy, 2.4, 0, Math.PI * 2);
				ctx!.fill();
			} else if (theme === 'grid-swarm') {
				// a dense field of cells, lighting on and off in a traveling wave —
				// many instances of one system, not a single hero element
				const cell = lowTier ? 46 : 34;
				for (let x = cell / 2; x < w; x += cell) {
					for (let y = cell / 2; y < h; y += cell) {
						const wave = Math.sin(x * 0.02 + y * 0.015 - t * 0.0016);
						const on = Math.max(0, wave) ** 3;
						if (on <= 0.02) continue;
						ctx!.fillStyle = `rgba(${COBALT}, ${(0.4 * on).toFixed(3)})`;
						ctx!.beginPath();
						ctx!.arc(x, y, 1 + on * 1.6, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			} else if (theme === 'diorama-drift') {
				// fixed warm points — a slow spotlight sweeps the frame, and each
				// diorama brightens only as the light passes near it
				const lx = cx + Math.cos(t * 0.00024) * w * 0.4;
				const ly = cy + Math.sin(t * 0.00031) * h * 0.34;
				for (let i = 0; i < DIO_N; i++) {
					const d = Math.hypot(dioX[i] - lx, dioY[i] - ly);
					const near = Math.max(0, 1 - d / 260);
					const glow = 0.14 + 0.55 * near ** 2;
					ctx!.fillStyle = `rgba(${AMBER}, ${glow.toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(dioX[i], dioY[i], 1.6 + near * 2.2, 0, Math.PI * 2);
					ctx!.fill();
				}
			} else if (theme === 'almost-nothing') {
				// the thesis as the visual: a tool you barely notice — a few dots,
				// nearly still, nearly invisible
				for (let i = 0; i < FAINT_N; i++) {
					const x = faintX[i] + Math.sin(t * 0.00006 + faintSeed[i]) * 14;
					const y = faintY[i] + Math.cos(t * 0.00005 + faintSeed[i]) * 10;
					const flicker = 0.5 + 0.5 * Math.sin(t * 0.00013 + faintSeed[i] * 3);
					ctx!.fillStyle = `rgba(235,235,235, ${(0.06 + 0.05 * flicker).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(x, y, 1.3, 0, Math.PI * 2);
					ctx!.fill();
				}
			} else if (theme === 'code-pulse') {
				// thin lines flickering like a terminal cursor across many
				// positions at once — many small builds, one method
				const cols = Math.floor(w / 90);
				for (let i = 0; i <= cols; i++) {
					const x = i * 90 + 30;
					const on = Math.sin(i * 12.9898 + Math.floor(t * 0.0022) * 4.14) * 43758.5453;
					const flicker = (on - Math.floor(on)) > 0.72 ? 1 : 0; // hard on/off, mechanical
					if (!flicker) continue;
					ctx!.strokeStyle = `rgba(${COBALT}, 0.16)`;
					ctx!.lineWidth = 1;
					ctx!.beginPath();
					ctx!.moveTo(x, 0);
					ctx!.lineTo(x, h);
					ctx!.stroke();
				}
			} else if (theme === 'suspended-arc') {
				// One ring, drawn at a constant rate and stopped dead a beat before
				// it closes. Constant rate is the whole point: nothing here eases,
				// because an eased stroke reads as a hand lifting, and this has to
				// read as a machine that was stopped. The ensō elsewhere on the site
				// is the opposite gesture and must not be confused with it.
				//
				// The part that never gets drawn is shown as a faint dotted phantom,
				// so the missing ending is visible rather than merely absent.
				const STOP_AT = 0.86; // never reaches 1
				const CYCLE = BREATH_MS * 4;
				const R = Math.min(w, h) * 0.3;

				for (let ring = 0; ring < 2; ring++) {
					// The second ring is larger, fainter, and a third of a cycle
					// behind — so the frame is never empty and never doubled.
					const rad = R * (ring === 0 ? 1 : 1.42);
					const weight = ring === 0 ? 1 : 0.34;
					const phase = ((t + ring * CYCLE * 0.34) % CYCLE) / CYCLE;

					const travelEnd = 0.34;
					const holdEnd = 0.82;
					let sweep: number;
					let alpha: number;
					if (phase < travelEnd) {
						sweep = STOP_AT * (phase / travelEnd); // linear — mechanical
						alpha = Math.min(1, (phase / travelEnd) * 5);
					} else if (phase < holdEnd) {
						sweep = STOP_AT; // the hold, which is most of the cycle
						alpha = 1;
					} else {
						sweep = STOP_AT;
						alpha = 1 - (phase - holdEnd) / (1 - holdEnd);
					}
					if (alpha <= 0.01) continue;

					// Start at the top and travel clockwise, so the gap that's left
					// sits at twelve o'clock and reads as deliberate.
					const start = -Math.PI / 2;
					const end = start + sweep * Math.PI * 2;

					// the ending that never arrives
					ctx!.setLineDash([2, 7]);
					ctx!.strokeStyle = `rgba(235,235,235, ${(0.07 * alpha * weight).toFixed(3)})`;
					ctx!.lineWidth = 1;
					ctx!.beginPath();
					ctx!.arc(cx, cy, rad, end, start + Math.PI * 2);
					ctx!.stroke();
					ctx!.setLineDash([]);

					ctx!.lineCap = 'round';
					ctx!.strokeStyle = `rgba(${COBALT}, ${(0.34 * alpha * weight).toFixed(3)})`;
					ctx!.lineWidth = ring === 0 ? 1.8 : 1.2;
					ctx!.beginPath();
					ctx!.arc(cx, cy, rad, start, end);
					ctx!.stroke();

					// The arrested head. It stops with the stroke and stays lit
					// through the hold — the only bright thing in the frame, sitting
					// exactly where the film would have finished.
					const hx = cx + Math.cos(end) * rad;
					const hy = cy + Math.sin(end) * rad;
					ctx!.fillStyle = `rgba(235,235,235, ${(0.16 * alpha * weight).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(hx, hy, 7, 0, Math.PI * 2);
					ctx!.fill();
					ctx!.fillStyle = `rgba(235,235,235, ${(0.7 * alpha * weight).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(hx, hy, 2, 0, Math.PI * 2);
					ctx!.fill();
				}
			} else if (theme === 'enso') {
				// Each circle draws itself brush-like — the stroke swells through
				// the middle of the sweep and thins at both ends — stops short of
				// closing, holds, and lifts. Same mark as the nav, same opening
				// left unclosed.
				const SWEEP = Math.PI * 1.82;
				for (let i = 0; i < ENSO_N; i++) {
					const cycle = 21000 + ensoSeed[i] * 9;
					const phase = ((t + ensoSeed[i] * 53) % cycle) / cycle;
					const drawEnd = 0.46;
					const holdEnd = 0.78;
					let p: number;
					let alpha: number;
					if (phase < drawEnd) {
						p = phase / drawEnd;
						p = 1 - Math.pow(1 - p, 2.2); // slows as it comes round
						alpha = Math.min(1, (phase / drawEnd) * 4);
					} else if (phase < holdEnd) {
						p = 1;
						alpha = 1;
					} else {
						p = 1;
						alpha = 1 - (phase - holdEnd) / (1 - holdEnd);
					}
					if (alpha <= 0.02) continue;

					const start = -Math.PI / 2 - 0.2 + ensoSeed[i];
					const R = ensoR[i];
					const steps = Math.max(40, Math.round(R * 1.1));
					const drawn = Math.floor(steps * p);
					ctx!.lineCap = 'round';
					for (let s = 0; s < drawn; s++) {
						const t0 = s / steps;
						const t1 = (s + 1) / steps;
						const a0 = start + SWEEP * t0;
						const a1 = start + SWEEP * t1;
						const wob = (a: number) => Math.sin(a * 5 + ensoSeed[i]);
						const r0 = R + R * 0.045 * wob(a0);
						const r1 = R + R * 0.045 * wob(a1);
						const body = Math.pow(Math.sin(Math.PI * t0), 0.35);
						ctx!.lineWidth = (0.7 + 1.1 * body) * (lowTier ? 0.8 : 1);
						ctx!.strokeStyle = `rgba(${COBALT}, ${(0.3 * alpha * (0.35 + 0.65 * body)).toFixed(3)})`;
						ctx!.beginPath();
						ctx!.moveTo(ensoX[i] + Math.cos(a0) * r0, ensoY[i] + Math.sin(a0) * r0);
						ctx!.lineTo(ensoX[i] + Math.cos(a1) * r1, ensoY[i] + Math.sin(a1) * r1);
						ctx!.stroke();
					}
				}
			} else if (theme === 'dusk-to-night') {
				// The hour changes, not the subject. One field of lamps is carried
				// from the last of the daylight into full moonlight, and the thing
				// driving the clock is the visitor's own scroll: the top of the page
				// is dusk, the bottom is after dark. Smoothstepped so neither end
				// arrives in a rush.
				const night = prog * prog * (3 - 2 * prog);
				// The two hours overlap rather than hand off. Straight crossfading
				// them leaves a dead middle — the warmth gone, the moon not yet up —
				// so the warm ground is held past halfway and the moon is brought in
				// early. For a while both are in the sky, which is what dusk is.
				const warm = Math.pow(1 - night, 0.65);
				const risen = Math.pow(night, 0.6);

				// This world must not dim at the page's ends the way the shared
				// `ignite` bell does — the night has to be fully present at the
				// bottom, which is exactly where that curve bottoms out. Keeps the
				// breath and the stillness swell, drops the bell.
				ctx!.globalAlpha = Math.min(1, (0.9 + 0.1 * worldBreath) * (0.92 + 0.08 * stillness));

				// The warm ground: low and to one side, the way the last light
				// actually falls — and gone by the time the moon is up.
				if (warm > 0.02) {
					const glow = ctx!.createRadialGradient(w * 0.3, h * 0.94, 0, w * 0.3, h * 0.94, Math.max(w, h) * 0.8);
					glow.addColorStop(0, `rgba(${AMBER}, ${(0.15 * warm).toFixed(3)})`);
					glow.addColorStop(1, `rgba(${AMBER}, 0)`);
					ctx!.fillStyle = glow;
					ctx!.fillRect(0, 0, w, h);
				}

				// The moon rises as the page darkens — off the top edge at dusk, well
				// up by the end. One disc and its halo; nothing else in the sky.
				if (risen > 0.02) {
					const moonX = w * 0.76;
					const moonY = h * (-0.16 + 0.42 * risen);
					const halo = ctx!.createRadialGradient(moonX, moonY, 0, moonX, moonY, Math.min(w, h) * 0.62);
					halo.addColorStop(0, `rgba(${MOON}, ${(0.16 * risen).toFixed(3)})`);
					halo.addColorStop(1, `rgba(${MOON}, 0)`);
					ctx!.fillStyle = halo;
					ctx!.fillRect(0, 0, w, h);
					// The disc itself is drawn soft rather than as a flat fill — a
					// hard-edged grey circle up there reads as a UI element, not as
					// the moon.
					const rad = 24 + 10 * risen;
					const disc = ctx!.createRadialGradient(moonX, moonY, 0, moonX, moonY, rad);
					disc.addColorStop(0, `rgba(${MOON}, ${(0.2 * risen).toFixed(3)})`);
					disc.addColorStop(0.62, `rgba(${MOON}, ${(0.15 * risen).toFixed(3)})`);
					disc.addColorStop(1, `rgba(${MOON}, 0)`);
					ctx!.fillStyle = disc;
					ctx!.beginPath();
					ctx!.arc(moonX, moonY, rad, 0, Math.PI * 2);
					ctx!.fill();
				}

				// The lamps, travelling warm → silver with the hour. Mixed once per
				// frame rather than per lamp: they're all burning in the same evening.
				const mix = (a: number, b: number) => Math.round(a + (b - a) * night);
				const lamp = `${mix(240, 186)}, ${mix(190, 205)}, ${mix(120, 240)}`;

				for (let i = 0; i < LAMP_N; i++) {
					const s = lampSeed[i];
					// Two sines that never come back into phase, so the field flickers
					// like a row of candles rather than pulsing in unison.
					const flame = 0.72 + 0.18 * Math.sin(t * 0.0021 + s) + 0.1 * Math.sin(t * 0.0053 + s * 2.3);
					const x = lampX[i];
					const y = lampY[i];
					const r = 1.4 + 1.5 * flame;

					ctx!.fillStyle = `rgba(${lamp}, ${(0.09 * flame).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(x, y, r * 4.2, 0, Math.PI * 2);
					ctx!.fill();
					// A flame reads brighter than a reflection of one, so the cores give
					// a little of themselves up to the night.
					ctx!.fillStyle = `rgba(${lamp}, ${(0.55 * flame * (1 - 0.3 * night)).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(x, y, r, 0, Math.PI * 2);
					ctx!.fill();

					// After dark the lamps find water under them: the light breaks into
					// a few short rungs that slide with the current. It only exists at
					// night, because at dusk you'd never notice it.
					if (risen > 0.12) {
						ctx!.lineWidth = 1.1;
						for (let k = 1; k <= 4; k++) {
							const ry = y + k * 9;
							if (ry > h) break;
							const wob = Math.sin(t * 0.0011 + s + k * 1.7) * (2 + k);
							ctx!.strokeStyle = `rgba(${lamp}, ${(0.26 * risen * flame * (1 - k / 5)).toFixed(3)})`;
							ctx!.beginPath();
							ctx!.moveTo(x - 4 - k + wob, ry);
							ctx!.lineTo(x + 4 + k + wob, ry);
							ctx!.stroke();
						}
					}
				}
			} else {
				// effects — sparse particles drifting slowly upward
				for (let i = 0; i < N; i++) {
					py[i] -= pv[i];
					if (py[i] < -4) {
						py[i] = h + 4;
						px[i] = Math.random() * w;
					}
					ctx!.fillStyle = `rgba(235,235,235, ${(0.2 + (pr[i] - 0.8) * 0.14).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(px[i], py[i], pr[i], 0, Math.PI * 2);
					ctx!.fill();
				}
			}

			// the horizon: a low cobalt glow that rises as you near the page's end.
			// dusk-to-night sits this one out — it paints its own sky, and a cobalt
			// band coming up under a moon would read as a second, competing hour.
			ctx!.globalAlpha = 1;
			if (prog > 0.55 && theme !== 'dusk-to-night') {
				const rise = (prog - 0.55) / 0.45;
				const g = ctx!.createLinearGradient(0, h, 0, h - 260 * rise);
				g.addColorStop(0, `rgba(${COBALT}, ${(0.16 * rise).toFixed(3)})`);
				g.addColorStop(1, `rgba(${COBALT}, 0)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(0, h - 260 * rise, w, 260 * rise);
			}
		}

		let raf = 0;
		let running = false;
		const loop = (t: number) => {
			draw(t);
			raf = requestAnimationFrame(loop);
		};
		const startLoop = () => {
			if (running) return;
			running = true;
			raf = requestAnimationFrame(loop);
		};
		const stopLoop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		// Under reduced motion there's no loop — but the scroll-driven part of a
		// world isn't animation, it's position, and freezing it would leave
		// dusk-to-night stuck at dusk for the whole page. So the frame is redrawn
		// on scroll instead: still nothing moves on its own.
		let staticRaf = 0;
		const onStaticScroll = () => {
			if (staticRaf) return;
			staticRaf = requestAnimationFrame(() => {
				staticRaf = 0;
				draw(0);
			});
		};

		if (reduce) {
			draw(0); // one static frame, no loop
			window.addEventListener('scroll', onStaticScroll, { passive: true });
		} else {
			startLoop();
		}

		const onVis = () => {
			if (reduce) return;
			if (document.hidden) stopLoop();
			else startLoop();
		};
		let rt = 0;
		const onResize = () => {
			clearTimeout(rt);
			rt = window.setTimeout(() => {
				resize();
				measureScroll();
				if (reduce) draw(0);
			}, 180);
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('resize', onResize);

		return () => {
			stopLoop();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onStaticScroll);
			if (staticRaf) cancelAnimationFrame(staticRaf);
			clearTimeout(rt);
		};
	}, [theme]);

	return (
		<canvas
			ref={ref}
			aria-hidden="true"
			style={{
				position: 'fixed',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: 0,
				pointerEvents: 'none',
				// Fade under the nav at the top and out at the very bottom; the world
				// stays evenly present across the rest, subtle enough to sit behind
				// high-contrast body copy without fighting it.
				maskImage: 'linear-gradient(180deg, transparent 0%, #000 11%, #000 90%, transparent 100%)',
				WebkitMaskImage:
					'linear-gradient(180deg, transparent 0%, #000 11%, #000 90%, transparent 100%)',
			}}
		/>
	);
}
