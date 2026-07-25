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
 *   held-breath   — one near-motionless breathing glow + rare embers
 *                   (awakening-of-mahakal: the world gone still)
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
 *                   every time (rough-cut-divinity: cut a beat before the end)
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
	| 'held-breath'
	| 'orb-trail'
	| 'grid-swarm'
	| 'diorama-drift'
	| 'almost-nothing'
	| 'code-pulse'
	| 'suspended-arc';

const COBALT = '96, 165, 250'; // the site's one signal blue, rgb
const PHOSPHOR = '110, 231, 183'; // faint CRT green, retro only
const AMBER = '240, 190, 120'; // warm ember — held-breath + diorama-drift only

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

		// held-breath: a handful of rare embers, seeded once so they don't
		// reshuffle every render.
		const EMBER_N = 6;
		const emberX = new Float32Array(EMBER_N);
		const emberY = new Float32Array(EMBER_N);
		const emberSeed = new Float32Array(EMBER_N);
		for (let i = 0; i < EMBER_N; i++) {
			emberX[i] = Math.random() * w;
			emberY[i] = Math.random() * h;
			emberSeed[i] = Math.random() * 1000;
		}

		// diorama-drift: fixed warm points (one per "diorama"), a spotlight
		// sweeps past and lights whichever it's nearest.
		const DIO_N = 13;
		const dioX = new Float32Array(DIO_N);
		const dioY = new Float32Array(DIO_N);
		for (let i = 0; i < DIO_N; i++) {
			dioX[i] = Math.random() * w;
			dioY[i] = Math.random() * h;
		}

		// suspended-arc: a handful of arcs, each on its own slow clock, that
		// always swing toward completion and stop just short of it.
		const ARC_N = 8;
		const arcX = new Float32Array(ARC_N);
		const arcY = new Float32Array(ARC_N);
		const arcR = new Float32Array(ARC_N);
		const arcStart = new Float32Array(ARC_N);
		const arcSeed = new Float32Array(ARC_N);
		for (let i = 0; i < ARC_N; i++) {
			arcX[i] = Math.random() * w;
			arcY[i] = Math.random() * h;
			arcR[i] = 30 + Math.random() * 70;
			arcStart[i] = Math.random() * Math.PI * 2;
			arcSeed[i] = Math.random() * 1000;
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
			} else if (theme === 'held-breath') {
				// one near-motionless breathing glow — a 22s cycle, barely there —
				// plus rare embers that flare and fade one at a time
				const breath = 0.5 + 0.5 * Math.sin(t * 0.00029);
				const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
				g.addColorStop(0, `rgba(${AMBER}, ${(0.1 + 0.07 * breath).toFixed(3)})`);
				g.addColorStop(1, `rgba(${AMBER}, 0)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(0, 0, w, h);
				for (let i = 0; i < EMBER_N; i++) {
					const cycle = 9000 + emberSeed[i] * 11; // each ember on its own slow clock
					const phase = ((t + emberSeed[i] * 37) % cycle) / cycle;
					const flare = Math.max(0, Math.sin(phase * Math.PI)) ** 6; // long dark, brief flare
					if (flare <= 0.01) continue;
					ctx!.fillStyle = `rgba(${AMBER}, ${(0.5 * flare).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(emberX[i], emberY[i], 1.2 + flare * 1.4, 0, Math.PI * 2);
					ctx!.fill();
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
				// each arc swings toward closing and stops a beat early, holds,
				// fades, and starts again — never once completes the circle
				const STOP_AT = 0.82; // never reaches 1
				for (let i = 0; i < ARC_N; i++) {
					const cycle = 5200 + arcSeed[i] * 5; // each arc its own pace
					const phase = ((t + arcSeed[i] * 41) % cycle) / cycle;
					// swing (0 → STOP_AT) then hold then fade, as one 0..1 cycle
					const swingEnd = 0.4;
					const holdEnd = 0.75;
					let sweep: number;
					let alpha: number;
					if (phase < swingEnd) {
						const p = phase / swingEnd;
						sweep = STOP_AT * (1 - Math.pow(1 - p, 3)); // ease-out, arrested
						alpha = Math.min(1, p * 3);
					} else if (phase < holdEnd) {
						sweep = STOP_AT;
						alpha = 1;
					} else {
						const p = (phase - holdEnd) / (1 - holdEnd);
						sweep = STOP_AT;
						alpha = 1 - p;
					}
					ctx!.strokeStyle = `rgba(${COBALT}, ${(0.4 * alpha).toFixed(3)})`;
					ctx!.lineWidth = 1.6;
					ctx!.beginPath();
					ctx!.arc(arcX[i], arcY[i], arcR[i], arcStart[i], arcStart[i] + sweep * Math.PI * 2);
					ctx!.stroke();
					// the arrested tip — where it always stops
					if (alpha > 0.05) {
						const tipA = arcStart[i] + sweep * Math.PI * 2;
						ctx!.fillStyle = `rgba(235,235,235, ${(0.6 * alpha).toFixed(3)})`;
						ctx!.beginPath();
						ctx!.arc(arcX[i] + Math.cos(tipA) * arcR[i], arcY[i] + Math.sin(tipA) * arcR[i], 1.8, 0, Math.PI * 2);
						ctx!.fill();
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

			// the horizon: a low cobalt glow that rises as you near the page's end
			ctx!.globalAlpha = 1;
			if (prog > 0.55) {
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

		if (reduce) {
			draw(0); // one static frame, no loop
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
