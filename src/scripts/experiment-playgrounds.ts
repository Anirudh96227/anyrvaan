// Full interactive playgrounds for the Interaction Lab. Each card's hover shows
// the *idea* (the typographic sketch in experiment-previews.ts); clicking through
// to /experiments/[slug] mounts one of these — a real, full-stage interactive
// system that demonstrates the concept, with live parameters and a reset.
//
// One entry per slug in PLAYGROUNDS. The shared engine (mountPlayground, bottom)
// handles canvas sizing/DPR, pointer + touch tracking, the RAF loop, the control
// panel DOM, reset, reduced-motion, and pausing off-screen. A playground only
// implements init/frame (+ optional onDown/onReset) and declares its controls.

const INK = '96,165,250'; // primary blue
const ICE = '147,197,253'; // lighter blue
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);

function hash2(x: number, y: number) {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}
// Smooth value noise in [0,1] — cheap flow-field / organic driver.
function noise2(x: number, y: number) {
	const xi = Math.floor(x),
		yi = Math.floor(y);
	const xf = x - xi,
		yf = y - yi;
	const u = xf * xf * (3 - 2 * xf),
		v = yf * yf * (3 - 2 * yf);
	const tl = hash2(xi, yi),
		tr = hash2(xi + 1, yi),
		bl = hash2(xi, yi + 1),
		br = hash2(xi + 1, yi + 1);
	return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
}

export interface Param {
	key: string;
	label: string;
	type?: 'range' | 'toggle' | 'text';
	min?: number;
	max?: number;
	step?: number;
	value?: number;
	on?: boolean;
	text?: string;
	format?: (v: number) => string;
}

export interface PGPointer {
	x: number;
	y: number;
	vx: number;
	vy: number;
	down: boolean;
	inside: boolean;
	moved: boolean;
	idle: number; // ms since the pointer last moved
}

export interface PGEnv {
	ctx: CanvasRenderingContext2D;
	w: number;
	h: number;
	t: number; // ms since start
	dt: number; // ms since last frame (clamped 0..50)
	pointer: PGPointer;
	params: Record<string, number>;
	flags: Record<string, boolean>;
	text: Record<string, string>;
	reduced: boolean;
	codename: string;
	theme: 'light' | 'dark';
}

export interface Playground {
	hint: string;
	params?: Param[];
	init(env: PGEnv): any;
	frame(env: PGEnv, state: any): void;
	onDown?(env: PGEnv, state: any): void;
	onReset?(env: PGEnv, state: any): void;
}

// A transparent offscreen buffer used by playgrounds that accumulate (persist
// paint, grow structure). Kept at CSS-pixel resolution for simplicity.
function offscreen(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return { c, x: c.getContext('2d')! };
}

// Rounded-rect path (ctx.roundRect isn't universal); leaves the path current
// so callers can fill/stroke/clip.
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const rad = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + rad, y);
	ctx.arcTo(x + w, y, x + w, y + h, rad);
	ctx.arcTo(x + w, y + h, x, y + h, rad);
	ctx.arcTo(x, y + h, x, y, rad);
	ctx.arcTo(x, y, x + w, y, rad);
	ctx.closePath();
}

// A heart outline centred on (cx,cy), scaled by s.
function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
	ctx.beginPath();
	ctx.moveTo(cx, cy + s * 0.35);
	ctx.bezierCurveTo(cx + s, cy - s * 0.25, cx + s * 0.55, cy - s * 0.95, cx, cy - s * 0.35);
	ctx.bezierCurveTo(cx - s * 0.55, cy - s * 0.95, cx - s, cy - s * 0.25, cx, cy + s * 0.35);
	ctx.closePath();
}

// Heart-burst: a ring + a ring of particles fired from a point.
function fireBurst(s: any, x: number, y: number, r: number) {
	const parts = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + rnd(0.3, -0.3) }));
	s.bursts.push({ x, y, r, t: 0, parts });
}

// Rubber-stamp impression: a double-ruled box + word, with random ink dropout.
const STAMP_WORDS = ['APPROVED', 'FILED', 'SEEN', 'PAID', 'DRAFT'];
function startStamp(s: any, env: PGEnv, x: number, y: number) {
	const word = s.wi % 2 === 0 ? env.codename.toUpperCase() : STAMP_WORDS[(Math.random() * STAMP_WORDS.length) | 0];
	s.wi++;
	s.anim = { x, y, rot: rnd(0.14, -0.14), word, t: 0 };
}
function drawStamp(
	ctx: CanvasRenderingContext2D,
	word: string,
	x: number,
	y: number,
	rot: number,
	sc: number,
	light: boolean,
	alpha: number
) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.scale(sc, sc);
	const col = light ? `rgba(190,58,48,${alpha})` : `rgba(239,90,80,${alpha})`;
	ctx.strokeStyle = col;
	ctx.fillStyle = col;
	ctx.lineWidth = 3;
	const fs = 38;
	ctx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	const tw = ctx.measureText(word).width;
	const pad = 15;
	rr(ctx, -tw / 2 - pad, -fs / 2 - pad, tw + pad * 2, fs + pad * 2, 6);
	ctx.stroke();
	ctx.fillText(word, 0, 2);
	// Rough ink: punch out a scatter of specks so the impression looks worn.
	ctx.globalCompositeOperation = 'destination-out';
	for (let i = 0; i < 50; i++) {
		ctx.globalAlpha = Math.random() * 0.5;
		ctx.fillRect(rnd(tw / 2 + pad, -tw / 2 - pad), rnd(fs / 2 + pad, -fs / 2 - pad), 2, 2);
	}
	ctx.restore();
}

export const PLAYGROUNDS: Record<string, Playground> = {
	// 01 Residual — the system records your motion and replays it on staggered
	// delays, so several past "you" keep interacting at once: overlapping
	// timelines. When you go still, an ambient hand keeps the loop alive.
	residual: {
		hint: 'Move the cursor — your motion replays on delayed timelines behind you.',
		params: [
			{ key: 'echoes', label: 'Timelines', min: 2, max: 8, step: 1, value: 5 },
			{ key: 'delay', label: 'Delay', min: 200, max: 1400, step: 50, value: 600, format: (v) => `${v | 0}ms` },
			{ key: 'trail', label: 'Trail', min: 20, max: 200, step: 10, value: 90 },
		],
		init: () => ({ hist: [] as { x: number; y: number; t: number }[] }),
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			// Effective input: the real pointer if it's recently active, else an
			// ambient Lissajous hand so the timelines never freeze.
			let ix = p.x,
				iy = p.y;
			if (!p.moved || p.idle > 900) {
				ix = w / 2 + Math.sin(t / 1300) * w * 0.32 + Math.sin(t / 640) * w * 0.06;
				iy = h / 2 + Math.cos(t / 1000) * h * 0.28 + Math.cos(t / 520) * h * 0.05;
			}
			s.hist.push({ x: ix, y: iy, t });
			while (s.hist.length && t - s.hist[0].t > 9000) s.hist.shift();
			ctx.clearRect(0, 0, w, h);
			const sampleAt = (target: number) => {
				const H = s.hist;
				for (let i = H.length - 1; i >= 0; i--) if (H[i].t <= target) return H[i];
				return H[0];
			};
			// Faint path of the recent trail.
			const trailN = env.params.trail | 0;
			ctx.beginPath();
			for (let i = Math.max(0, s.hist.length - trailN); i < s.hist.length; i++) {
				const pt = s.hist[i];
				i === Math.max(0, s.hist.length - trailN) ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
			}
			ctx.strokeStyle = `rgba(${INK},0.14)`;
			ctx.lineWidth = 1;
			ctx.stroke();
			const n = env.params.echoes | 0;
			for (let k = n; k >= 1; k--) {
				const e = sampleAt(t - env.params.delay * k);
				if (!e) continue;
				const a = (1 - k / (n + 1)) * 0.8;
				ctx.beginPath();
				ctx.arc(e.x, e.y, 6 + k, 0, TAU);
				ctx.strokeStyle = `rgba(${ICE},${a})`;
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
			// Live head.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, 26);
			g.addColorStop(0, `rgba(${INK},0.7)`);
			g.addColorStop(1, `rgba(${INK},0)`);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(ix, iy, 26, 0, TAU);
			ctx.fill();
			ctx.restore();
			ctx.fillStyle = 'rgba(230,240,255,1)';
			ctx.beginPath();
			ctx.arc(ix, iy, 5, 0, TAU);
			ctx.fill();
		},
	},

	// 02 Fold — a sheet of textured cardstock. Grab the nearest corner and drag
	// to fold it over: the flap shows the paper's grainy back (with a faint,
	// mirrored bleed of the print), a lit crease ridge, ambient shadow pooling in
	// the valley, and a soft shadow cast on the sheet below. Release to flatten.
	fold: {
		hint: 'Drag from a corner to fold the paper over. Release to let it flatten.',
		params: [{ key: 'ease', label: 'Springiness', min: 4, max: 24, step: 1, value: 12 }],
		init: (env) => {
			// Real paper on a light page; grainy cardstock on a dark one. Baked once.
			const light = env.theme === 'light';
			const pal = light
				? {
						front: '#f4f0e6',
						back: '#e8e2d3',
						sLight: '255,252,245',
						sDark: '120,105,80',
						fiber: 'rgba(140,125,100,0.05)',
						rule: 'rgba(70,96,150,0.10)',
						margin: 'rgba(200,90,80,0.24)',
						inkHi: 'rgba(255,255,255,0.5)',
						ink: 'rgba(42,39,33,0.9)',
						vg: 'rgba(70,55,30,0.16)',
					}
				: {
						front: '#18171c',
						back: '#131217',
						sLight: '255,255,255',
						sDark: '0,0,0',
						fiber: 'rgba(205,205,215,0.03)',
						rule: 'rgba(120,150,205,0.07)',
						margin: 'rgba(190,95,85,0.16)',
						inkHi: 'rgba(255,255,255,0.05)',
						ink: 'rgba(228,230,238,0.16)',
						vg: 'rgba(0,0,0,0.32)',
					};
			// base tone, fibre speckle, hairline fibres, vignette, and (front only)
			// ruled lines, a margin, and the ink title.
			const bake = (w: number, h: number, back: boolean) => {
				const { c, x } = offscreen(w, h);
				x.fillStyle = back ? pal.back : pal.front;
				x.fillRect(0, 0, w, h);
				const specks = Math.floor((w * h) / 46);
				for (let i = 0; i < specks; i++) {
					const px = Math.random() * w,
						py = Math.random() * h;
					x.fillStyle =
						Math.random() > 0.5
							? `rgba(${pal.sLight},${Math.random() * 0.05})`
							: `rgba(${pal.sDark},${Math.random() * 0.06})`;
					x.fillRect(px, py, 1, 1);
				}
				x.strokeStyle = pal.fiber;
				x.lineWidth = 1;
				for (let i = 0; i < Math.floor(w / 5); i++) {
					const px = Math.random() * w,
						py = Math.random() * h,
						len = 6 + Math.random() * 24,
						ang = Math.random() * 0.5 - 0.25;
					x.beginPath();
					x.moveTo(px, py);
					x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
					x.stroke();
				}
				if (!back) {
					x.strokeStyle = pal.rule;
					x.lineWidth = 1;
					for (let y = Math.round(h * 0.22); y < h * 0.9; y += 46) {
						x.beginPath();
						x.moveTo(w * 0.07, y);
						x.lineTo(w * 0.93, y);
						x.stroke();
					}
					x.strokeStyle = pal.margin;
					x.beginPath();
					x.moveTo(w * 0.12, h * 0.14);
					x.lineTo(w * 0.12, h * 0.88);
					x.stroke();
					// Ink title, with a 1px offset copy so it reads slightly embossed.
					const fs = Math.min(w * 0.15, h * 0.2);
					x.font = `600 ${fs}px "Space Grotesk", system-ui, sans-serif`;
					x.textAlign = 'left';
					x.textBaseline = 'middle';
					x.fillStyle = pal.inkHi;
					x.fillText(env.codename, w * 0.14, h * 0.5 + (light ? 1 : -1));
					x.fillStyle = pal.ink;
					x.fillText(env.codename, w * 0.14, h * 0.5);
				}
				const vg = x.createRadialGradient(
					w / 2,
					h / 2,
					Math.min(w, h) * 0.15,
					w / 2,
					h / 2,
					Math.max(w, h) * 0.72
				);
				vg.addColorStop(0, 'rgba(0,0,0,0)');
				vg.addColorStop(1, pal.vg);
				x.fillStyle = vg;
				x.fillRect(0, 0, w, h);
				return { c, x };
			};
			const build = (w: number, h: number) => ({ front: bake(w, h, false), back: bake(w, h, true) });
			const b = build(env.w, env.h);
			return { fold: 0, corner: 2, tx: 0, build, bw: Math.round(env.w), bh: Math.round(env.h), ...b };
		},
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			const light = env.theme === 'light';
			if (s.bw !== Math.round(w) || s.bh !== Math.round(h)) {
				const b = s.build(w, h);
				s.front = b.front;
				s.back = b.back;
				s.bw = Math.round(w);
				s.bh = Math.round(h);
			}
			const corners = [
				[0, 0],
				[w, 0],
				[w, h],
				[0, h],
			];
			// Each corner's two edge directions (unit), so the crease and folded
			// tip land like a real square dog-ear rather than a guessed triangle.
			const edges = [
				[
					[1, 0],
					[0, 1],
				],
				[
					[-1, 0],
					[0, 1],
				],
				[
					[-1, 0],
					[0, -1],
				],
				[
					[1, 0],
					[0, -1],
				],
			];
			let target = 0;
			if (p.down && p.inside) {
				let best = 0,
					bd = Infinity;
				for (let i = 0; i < 4; i++) {
					const d = Math.hypot(p.x - corners[i][0], p.y - corners[i][1]);
					if (d < bd) {
						bd = d;
						best = i;
					}
				}
				s.corner = best;
				target = clamp(bd / Math.hypot(w, h), 0, 0.62);
			} else if (!p.moved || p.idle > 1200) {
				// Idle: a small dog-ear breathes on the bottom-right, inviting a drag.
				s.corner = 2;
				target = 0.09 + Math.sin(t / 1500) * 0.03;
			}
			s.fold += (target - s.fold) * (env.params.ease / 100 + 0.05);
			const f = s.fold;
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(s.front.c, 0, 0, w, h);
			if (f < 0.004) return;

			const c = corners[s.corner];
			const size = f * Math.hypot(w, h);
			const e = edges[s.corner];
			const A: [number, number] = [c[0] + e[0][0] * size, c[1] + e[0][1] * size];
			const B: [number, number] = [c[0] + e[1][0] * size, c[1] + e[1][1] * size];
			const tip: [number, number] = [
				c[0] + (e[0][0] + e[1][0]) * size,
				c[1] + (e[0][1] + e[1][1]) * size,
			];
			const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
			let tnx = tip[0] - mid[0],
				tny = tip[1] - mid[1];
			const tl = Math.hypot(tnx, tny) || 1;
			tnx /= tl;
			tny /= tl;

			// Soft shadow the lifted flap casts on the sheet, peeking past its edges.
			ctx.save();
			ctx.filter = 'blur(7px)';
			ctx.fillStyle = light ? 'rgba(60,45,22,0.32)' : 'rgba(0,0,0,0.5)';
			ctx.beginPath();
			ctx.moveTo(A[0] + tnx * 5, A[1] + tny * 5);
			ctx.lineTo(tip[0] + tnx * 9, tip[1] + tny * 9);
			ctx.lineTo(B[0] + tnx * 5, B[1] + tny * 5);
			ctx.closePath();
			ctx.fill();
			ctx.restore();

			// The folded flap, clipped to the dog-ear triangle.
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(A[0], A[1]);
			ctx.lineTo(tip[0], tip[1]);
			ctx.lineTo(B[0], B[1]);
			ctx.closePath();
			ctx.clip();
			// Grainy back of the paper.
			ctx.drawImage(s.back.c, 0, 0, w, h);
			// Faint mirrored bleed of the print showing through the back: reflect
			// the front across the crease line so the corner's ink lands on the flap.
			const th = Math.atan2(B[1] - A[1], B[0] - A[0]);
			ctx.save();
			ctx.globalAlpha = 0.12;
			ctx.translate(A[0], A[1]);
			ctx.rotate(th);
			ctx.scale(1, -1);
			ctx.rotate(-th);
			ctx.translate(-A[0], -A[1]);
			ctx.drawImage(s.front.c, 0, 0, w, h);
			ctx.restore();
			// Ambient occlusion pooling in the valley, easing to a sheen at the tip.
			const og = ctx.createLinearGradient(mid[0], mid[1], tip[0], tip[1]);
			og.addColorStop(0, light ? 'rgba(70,55,28,0.34)' : 'rgba(0,0,0,0.5)');
			og.addColorStop(0.4, light ? 'rgba(70,55,28,0.08)' : 'rgba(0,0,0,0.12)');
			og.addColorStop(1, light ? 'rgba(255,255,255,0.5)' : 'rgba(255,252,244,0.08)');
			ctx.fillStyle = og;
			ctx.fillRect(0, 0, w, h);
			ctx.restore();

			// The crease: a dark contact line on the sheet, then a bright folded ridge.
			ctx.lineCap = 'round';
			ctx.strokeStyle = light ? 'rgba(80,62,32,0.3)' : 'rgba(0,0,0,0.45)';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(A[0], A[1]);
			ctx.lineTo(B[0], B[1]);
			ctx.stroke();
			ctx.strokeStyle = light ? 'rgba(255,255,255,0.85)' : 'rgba(255,252,245,0.6)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(A[0], A[1]);
			ctx.lineTo(B[0], B[1]);
			ctx.stroke();
		},
	},

	// 03 Flux Ink — drag to inject ink. Droplets fall under gravity, repel each
	// other into a fluid, and pool at the bottom. Blue metaball rendering.
	'flux-ink': {
		hint: 'Click and drag to pour ink. Watch it fall, flow, and pool.',
		params: [
			{ key: 'gravity', label: 'Gravity', min: 0, max: 40, step: 1, value: 20 },
			{ key: 'viscosity', label: 'Viscosity', min: 60, max: 99, step: 1, value: 88, format: (v) => `${v}%` },
		],
		init: (env) => ({ ps: [] as any[], drip: 0 }),
		frame(env, s) {
			const { ctx, w, h, dt, pointer: p } = env;
			const g = env.params.gravity * 0.0006;
			const damp = env.params.viscosity / 100;
			const R = 9;
			// Inject on drag; ambient drip from the top so it's never empty.
			const emit = (x: number, y: number, n: number) => {
				for (let i = 0; i < n && s.ps.length < 200; i++)
					s.ps.push({ x: x + rnd(6, -6), y: y + rnd(6, -6), vx: rnd(0.4, -0.4), vy: rnd(0.4, 0) });
			};
			if (p.down && p.inside) emit(p.x, p.y, 3);
			s.drip += dt;
			if (s.drip > 320 && s.ps.length < 120) {
				s.drip = 0;
				emit(rnd(w * 0.7, w * 0.3), -6, 2);
			}
			const ps = s.ps;
			const step = clamp(dt, 8, 24);
			// Pairwise soft repulsion → fluid spread + pooling.
			for (let i = 0; i < ps.length; i++) {
				const a = ps[i];
				for (let j = i + 1; j < ps.length; j++) {
					const b = ps[j];
					const dx = b.x - a.x,
						dy = b.y - a.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < R * R * 4 && d2 > 0.01) {
						const d = Math.sqrt(d2);
						const force = (1 - d / (R * 2)) * 0.5;
						const nx = dx / d,
							ny = dy / d;
						a.vx -= nx * force;
						a.vy -= ny * force;
						b.vx += nx * force;
						b.vy += ny * force;
					}
				}
			}
			ctx.clearRect(0, 0, w, h);
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			for (const a of ps) {
				a.vy += g * step;
				a.vx *= damp;
				a.vy *= damp;
				a.x += a.vx * step;
				a.y += a.vy * step;
				if (a.x < R) {
					a.x = R;
					a.vx *= -0.3;
				}
				if (a.x > w - R) {
					a.x = w - R;
					a.vx *= -0.3;
				}
				if (a.y > h - R) {
					a.y = h - R;
					a.vy *= -0.25;
					a.vx *= 0.9;
				}
				const gr = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, R * 2.2);
				gr.addColorStop(0, `rgba(${INK},0.5)`);
				gr.addColorStop(0.6, `rgba(${INK},0.12)`);
				gr.addColorStop(1, `rgba(${INK},0)`);
				ctx.fillStyle = gr;
				ctx.beginPath();
				ctx.arc(a.x, a.y, R * 2.2, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
			// Cull anything that fell off the bottom edge.
			for (let i = ps.length - 1; i >= 0; i--) if (ps[i].y > h + 60) ps.splice(i, 1);
		},
		onReset: (env, s) => {
			s.ps = [];
		},
	},

	// 04 Pulse Type — living typography. Every glyph keeps its own rhythm, and
	// letters near the cursor swell brighter. Type your own word.
	'pulse-type': {
		hint: 'Move across the word. Change the text and rhythm in the controls.',
		params: [
			{ key: 'word', label: 'Word', type: 'text', text: '' },
			{ key: 'rate', label: 'Rate', min: 40, max: 400, step: 10, value: 160 },
			{ key: 'amp', label: 'Amplitude', min: 0, max: 60, step: 1, value: 26, format: (v) => `${v}%` },
		],
		init: (env) => ({}),
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const word = (env.text.word || env.codename).slice(0, 14) || env.codename;
			const fs = Math.min(w / (word.length * 0.72), h * 0.4);
			ctx.font = `600 ${fs}px "Space Grotesk", system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const widths = [...word].map((c) => ctx.measureText(c).width);
			const total = widths.reduce((a, b) => a + b, 0);
			let x = w / 2 - total / 2;
			const amp = env.params.amp / 100;
			for (let i = 0; i < word.length; i++) {
				const cw = widths[i];
				const cx = x + cw / 2;
				const cy = h / 2;
				const beat = Math.sin(t / env.params.rate + i * 0.7) * 0.5 + 0.5;
				const near = p.moved ? clamp(1 - Math.hypot(p.x - cx, p.y - cy) / (fs * 1.2), 0, 1) : 0;
				const scale = 1 + beat * amp + near * 0.35;
				const bright = 0.45 + beat * 0.3 + near * 0.55;
				ctx.save();
				ctx.translate(cx, cy);
				ctx.scale(scale, scale);
				if (near > 0.1) {
					ctx.shadowColor =
						env.theme === 'light' ? `rgba(${INK},${near})` : `rgba(${ICE},${near})`;
					ctx.shadowBlur = fs * 0.4 * near;
				}
				ctx.fillStyle =
					env.theme === 'light'
						? near > 0.05
							? `rgba(${INK},${bright})`
							: `rgba(30,28,24,${bright})`
						: near > 0.05
							? `rgba(${Math.round(230 - 130 * (1 - near))},${Math.round(240 - 60 * (1 - near))},255,${bright})`
							: `rgba(245,245,245,${bright})`;
				ctx.fillText(word[i], 0, 0);
				ctx.restore();
				x += cw;
			}
		},
	},

	// 05 Lumen — a light at the cursor sweeps a relief of tiles; each tile
	// brightens by proximity and casts a soft shadow directly away from the light.
	lumen: {
		hint: 'Move the light around. Tiles brighten and cast shadows away from it.',
		params: [
			{ key: 'radius', label: 'Light reach', min: 120, max: 520, step: 10, value: 300 },
			{ key: 'height', label: 'Shadow length', min: 4, max: 40, step: 1, value: 18 },
		],
		init: (env) => {
			const build = (w: number, h: number) => {
				const gap = 62;
				const cols = Math.ceil(w / gap) + 1;
				const rows = Math.ceil(h / gap) + 1;
				const tiles: any[] = [];
				for (let r = 0; r < rows; r++)
					for (let c = 0; c < cols; c++)
						tiles.push({ x: c * gap + gap / 2, y: r * gap + gap / 2, s: gap * 0.34 });
				return tiles;
			};
			return { tiles: build(env.w, env.h), build, bw: Math.round(env.w), bh: Math.round(env.h) };
		},
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			if (s.bw !== Math.round(w) || s.bh !== Math.round(h)) {
				s.tiles = s.build(w, h);
				s.bw = Math.round(w);
				s.bh = Math.round(h);
			}
			const lx = p.moved ? p.x : w / 2 + Math.cos(t / 1600) * w * 0.3;
			const ly = p.moved ? p.y : h / 2 + Math.sin(t / 1600) * h * 0.3;
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = 'rgba(0,0,0,0.25)';
			ctx.fillRect(0, 0, w, h);
			const reach = env.params.radius;
			const hgt = env.params.height / 100;
			// Shadows first.
			for (const tl of s.tiles) {
				const dx = tl.x - lx,
					dy = tl.y - ly;
				const d = Math.hypot(dx, dy);
				if (d > reach) continue;
				const k = (1 - d / reach) * hgt * 3;
				ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - d / reach)})`;
				ctx.fillRect(tl.x - tl.s / 2 + dx * k * 0.15, tl.y - tl.s / 2 + dy * k * 0.15, tl.s, tl.s);
			}
			// Lit faces.
			for (const tl of s.tiles) {
				const d = Math.hypot(tl.x - lx, tl.y - ly);
				const b = clamp(1 - d / reach, 0, 1);
				const c = Math.round(40 + b * 200);
				ctx.fillStyle = `rgb(${Math.round(c * 0.7)},${Math.round(c * 0.82)},${Math.min(255, c + 30)})`;
				ctx.fillRect(tl.x - tl.s / 2, tl.y - tl.s / 2, tl.s, tl.s);
			}
			// The light itself.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, reach * 0.5);
			g.addColorStop(0, 'rgba(255,244,214,0.35)');
			g.addColorStop(1, 'rgba(255,244,214,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(lx, ly, reach * 0.5, 0, TAU);
			ctx.fill();
			ctx.restore();
		},
	},

	// 06 Swarm — boids. Hundreds of agents align, cohere, and separate into
	// living flocks. The cursor pulls them in, or scatters them while pressed.
	swarm: {
		hint: 'Move to lead the flock. Hold the button to scatter it.',
		params: [
			{ key: 'count', label: 'Agents', min: 60, max: 400, step: 20, value: 220 },
			{ key: 'align', label: 'Alignment', min: 0, max: 100, step: 5, value: 55 },
			{ key: 'cohesion', label: 'Cohesion', min: 0, max: 100, step: 5, value: 45 },
		],
		init: (env) => {
			const b: any[] = [];
			for (let i = 0; i < 400; i++)
				b.push({ x: rnd(env.w), y: rnd(env.h), vx: rnd(1, -1), vy: rnd(1, -1) });
			return { b };
		},
		frame(env, s) {
			const { ctx, w, h, pointer: p } = env;
			const N = env.params.count | 0;
			const alignK = env.params.align / 1000;
			const cohK = env.params.cohesion / 3000;
			ctx.fillStyle = 'rgba(9,9,11,0.28)';
			ctx.fillRect(0, 0, w, h);
			for (let i = 0; i < N; i++) {
				const a = s.b[i];
				let ax = 0,
					ay = 0,
					cx = 0,
					cy = 0,
					sx = 0,
					sy = 0,
					cnt = 0;
				for (let j = 0; j < N; j++) {
					if (i === j) continue;
					const dx = s.b[j].x - a.x,
						dy = s.b[j].y - a.y;
					const d2 = dx * dx + dy * dy;
					if (d2 < 2600) {
						ax += s.b[j].vx;
						ay += s.b[j].vy;
						cx += s.b[j].x;
						cy += s.b[j].y;
						if (d2 < 340 && d2 > 0.01) {
							sx -= dx / d2 * 12;
							sy -= dy / d2 * 12;
						}
						cnt++;
					}
				}
				if (cnt) {
					a.vx += (ax / cnt - a.vx) * alignK + (cx / cnt - a.x) * cohK + sx * 0.02;
					a.vy += (ay / cnt - a.vy) * alignK + (cy / cnt - a.y) * cohK + sy * 0.02;
				}
				// Cursor: attract, or repel while pressed.
				if (p.moved) {
					const dx = p.x - a.x,
						dy = p.y - a.y;
					const d = Math.hypot(dx, dy) + 0.01;
					const dir = p.down ? -1 : 1;
					if (d < 320) {
						a.vx += (dx / d) * dir * 0.12;
						a.vy += (dy / d) * dir * 0.12;
					}
				}
				const sp = Math.hypot(a.vx, a.vy);
				if (sp > 2.6) {
					a.vx = (a.vx / sp) * 2.6;
					a.vy = (a.vy / sp) * 2.6;
				}
				a.x += a.vx;
				a.y += a.vy;
				if (a.x < 0) a.x += w;
				if (a.x > w) a.x -= w;
				if (a.y < 0) a.y += h;
				if (a.y > h) a.y -= h;
				const ang = Math.atan2(a.vy, a.vx);
				ctx.save();
				ctx.translate(a.x, a.y);
				ctx.rotate(ang);
				ctx.fillStyle = `rgba(${ICE},0.85)`;
				ctx.beginPath();
				ctx.moveTo(5, 0);
				ctx.lineTo(-3, 2.2);
				ctx.lineTo(-3, -2.2);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
			}
		},
	},

	// 07 Field — a procedural flow field. Particles stream along a noise field
	// you can warp: the cursor becomes a pole that bends every streamline.
	field: {
		hint: 'Move through the field — the flow bends around your cursor.',
		params: [
			{ key: 'scale', label: 'Field scale', min: 2, max: 20, step: 1, value: 7 },
			{ key: 'speed', label: 'Flow speed', min: 4, max: 40, step: 1, value: 18 },
			{ key: 'force', label: 'Cursor pull', min: 0, max: 100, step: 5, value: 55 },
		],
		init: (env) => {
			const off = offscreen(env.w, env.h);
			const P: any[] = [];
			for (let i = 0; i < 900; i++) P.push({ x: rnd(env.w), y: rnd(env.h), px: 0, py: 0 });
			for (const p of P) {
				p.px = p.x;
				p.py = p.y;
			}
			return { off, P };
		},
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			if (s.off.c.width !== Math.round(w) || s.off.c.height !== Math.round(h)) {
				s.off = offscreen(w, h);
			}
			const off = s.off.x as CanvasRenderingContext2D;
			// Fade the trail buffer slightly each frame.
			off.fillStyle = 'rgba(9,9,11,0.06)';
			off.fillRect(0, 0, w, h);
			const scale = env.params.scale / 1000;
			const sp = env.params.speed / 10;
			const fk = env.params.force / 100;
			off.strokeStyle = `rgba(${ICE},0.35)`;
			off.lineWidth = 1;
			off.beginPath();
			for (const pt of s.P) {
				let ang = noise2(pt.x * scale, pt.y * scale + t * 0.00006) * TAU * 2;
				let vx = Math.cos(ang) * sp,
					vy = Math.sin(ang) * sp;
				if (p.moved) {
					const dx = pt.x - p.x,
						dy = pt.y - p.y;
					const d = Math.hypot(dx, dy) + 0.01;
					if (d < 260) {
						const push = (1 - d / 260) * fk * 3;
						// Curl around the pole rather than straight away.
						vx += (-dy / d) * push * sp;
						vy += (dx / d) * push * sp;
					}
				}
				pt.px = pt.x;
				pt.py = pt.y;
				pt.x += vx;
				pt.y += vy;
				if (pt.x < 0 || pt.x > w || pt.y < 0 || pt.y > h) {
					pt.x = rnd(w);
					pt.y = rnd(h);
					pt.px = pt.x;
					pt.py = pt.y;
					continue;
				}
				off.moveTo(pt.px, pt.py);
				off.lineTo(pt.x, pt.y);
			}
			off.stroke();
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(s.off.c, 0, 0, w, h);
		},
	},

	// 08 Residue — the cursor lays down dust that never clears, building a
	// history of where you've been. Your drawing is saved across visits.
	residue: {
		hint: 'Draw. The dust stays — and is remembered next time you visit.',
		params: [
			{ key: 'size', label: 'Brush', min: 4, max: 40, step: 2, value: 16 },
			{ key: 'fade', label: 'Slow fade', type: 'toggle', on: false },
		],
		init: (env) => {
			const off = offscreen(env.w, env.h);
			try {
				const saved = localStorage.getItem('lab-residue');
				if (saved) {
					const img = new Image();
					img.onload = () => off.x.drawImage(img, 0, 0, env.w, env.h);
					img.src = saved;
				}
			} catch {}
			return { off, save: 0, lx: -1, ly: -1 };
		},
		frame(env, s) {
			const { ctx, w, h, dt, pointer: p } = env;
			if (s.off.c.width !== Math.round(w) || s.off.c.height !== Math.round(h)) {
				const next = offscreen(w, h);
				next.x.drawImage(s.off.c, 0, 0, w, h);
				s.off = next;
			}
			const off = s.off.x as CanvasRenderingContext2D;
			const light = env.theme === 'light';
			if (env.flags.fade) {
				// Fade toward the surface: pale wash on paper, dark wash on the void.
				off.fillStyle = light ? 'rgba(241,237,226,0.02)' : 'rgba(9,9,11,0.012)';
				off.fillRect(0, 0, w, h);
			}
			if (p.moved && p.inside) {
				const br = env.params.size;
				const steps = Math.max(1, Math.hypot(p.x - s.lx, p.y - s.ly) / 3);
				for (let k = 0; k < steps; k++) {
					const x = s.lx < 0 ? p.x : s.lx + (p.x - s.lx) * (k / steps);
					const y = s.ly < 0 ? p.y : s.ly + (p.y - s.ly) * (k / steps);
					for (let d = 0; d < 5; d++) {
						const a = rnd(TAU),
							r = rnd(br);
						off.fillStyle = light ? `rgba(40,38,34,${rnd(0.4, 0.08)})` : `rgba(${ICE},${rnd(0.5, 0.1)})`;
						off.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6);
					}
				}
				s.lx = p.x;
				s.ly = p.y;
			} else {
				s.lx = -1;
				s.ly = -1;
			}
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(s.off.c, 0, 0, w, h);
			// Throttled persistence.
			s.save += dt;
			if (s.save > 2000) {
				s.save = 0;
				try {
					localStorage.setItem('lab-residue', s.off.c.toDataURL('image/png'));
				} catch {}
			}
		},
		onReset: (env, s) => {
			s.off.x.clearRect(0, 0, env.w, env.h);
			try {
				localStorage.removeItem('lab-residue');
			} catch {}
		},
	},

	// 09 Paradox — every object casts a reflection, but the reflection runs on
	// predicted motion: it slides ahead of where the real one is now.
	paradox: {
		hint: 'Move around. The reflection leads you — it predicts, not mirrors.',
		params: [{ key: 'lead', label: 'Prediction', min: 0, max: 100, step: 5, value: 55 }],
		init: (env) => {
			const dots: any[] = [];
			for (let i = 0; i < 7; i++)
				dots.push({ x: env.w * (0.2 + i * 0.1), y: env.h * 0.4, vx: 0, vy: 0, ox: env.w * (0.2 + i * 0.1), oy: env.h * 0.4 });
			return { dots, hx: env.w / 2, hy: env.h / 2, vx: 0, vy: 0 };
		},
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const my = h * 0.5; // mirror line
			const tx = p.moved && p.idle < 1500 ? p.x : w / 2 + Math.sin(t / 900) * w * 0.34;
			const ty = p.moved && p.idle < 1500 ? Math.min(p.y, my - 20) : my - 60 - Math.abs(Math.sin(t / 1300)) * h * 0.2;
			s.vx = s.vx * 0.8 + (tx - s.hx) * 0.2;
			s.vy = s.vy * 0.8 + (ty - s.hy) * 0.2;
			s.hx += (tx - s.hx) * 0.18;
			s.hy += (ty - s.hy) * 0.18;
			// Mirror line.
			ctx.strokeStyle = 'rgba(255,255,255,0.12)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, my);
			ctx.lineTo(w, my);
			ctx.stroke();
			const lead = env.params.lead / 100;
			const drawObj = (x: number, y: number, r: number, predicted: boolean) => {
				ctx.save();
				if (predicted) ctx.globalCompositeOperation = 'lighter';
				const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
				g.addColorStop(0, predicted ? `rgba(${INK},0.6)` : 'rgba(235,242,255,0.9)');
				g.addColorStop(1, `rgba(${INK},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(x, y, r * 2.4, 0, TAU);
				ctx.fill();
				ctx.restore();
			};
			// Real object + a small trailing chain.
			drawObj(s.hx, s.hy, 9, false);
			// Predicted reflection: reflect across mirror, then push forward by
			// velocity * lead so it arrives before the real object does.
			const rx = s.hx + s.vx * lead * 6;
			const ry = my + (my - (s.hy + s.vy * lead * 6));
			drawObj(rx, ry, 9, true);
			ctx.strokeStyle = `rgba(${ICE},0.25)`;
			ctx.setLineDash([3, 4]);
			ctx.beginPath();
			ctx.moveTo(s.hx, s.hy);
			ctx.lineTo(rx, ry);
			ctx.stroke();
			ctx.setLineDash([]);
		},
	},

	// 10 Spectrum — the word's red, green, and blue channels separate under a
	// gravity you steer with the cursor, fusing back to white where they align.
	spectrum: {
		hint: 'Pull the cursor to fling the color channels apart; center to recombine.',
		params: [
			{ key: 'sep', label: 'Separation', min: 10, max: 120, step: 5, value: 55 },
			{ key: 'spring', label: 'Springiness', min: 2, max: 20, step: 1, value: 8 },
		],
		init: (env) => ({
			ch: [0, 1, 2].map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
		}),
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const cx = w / 2,
				cy = h / 2;
			const sep = env.params.sep;
			const k = env.params.spring / 1000;
			let pull = { x: 0, y: 0 };
			if (p.moved && p.idle < 1500) pull = { x: (p.x - cx) / w, y: (p.y - cy) / h };
			else pull = { x: Math.sin(t / 1100) * 0.4, y: Math.cos(t / 1400) * 0.2 };
			const word = env.codename.toUpperCase();
			const fs = Math.min(w / (word.length * 0.7), h * 0.32);
			ctx.font = `700 ${fs}px "Space Grotesk", system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const cols = ['248,113,113', '74,222,128', `${INK}`];
			ctx.save();
			ctx.globalCompositeOperation = 'screen';
			for (let c = 0; c < 3; c++) {
				const dir = c - 1; // -1, 0, +1
				const tx = pull.x * sep * dir;
				const ty = pull.y * sep * dir;
				const st = s.ch[c];
				st.vx = (st.vx + (tx - st.x) * k) * 0.86;
				st.vy = (st.vy + (ty - st.y) * k) * 0.86;
				st.x += st.vx;
				st.y += st.vy;
				ctx.fillStyle = `rgb(${cols[c]})`;
				ctx.fillText(word, cx + st.x, cy + st.y);
			}
			ctx.restore();
		},
	},

	// 11 Membrane — a taut spring mesh. Push it with the cursor and waves
	// propagate node to node, ripple across the surface, and settle.
	membrane: {
		hint: 'Push into the surface. Waves ripple outward and settle.',
		params: [
			{ key: 'tension', label: 'Tension', min: 4, max: 30, step: 1, value: 16 },
			{ key: 'damping', label: 'Damping', min: 80, max: 99, step: 1, value: 94, format: (v) => `${v}%` },
		],
		init: (env) => {
			const build = (w: number, h: number) => {
				const cols = 26;
				const rows = Math.max(8, Math.round((cols * h) / w));
				const gx = w / (cols - 1),
					gy = h / (rows - 1);
				const n: any[] = [];
				for (let r = 0; r < rows; r++)
					for (let c = 0; c < cols; c++)
						n.push({ ox: c * gx, oy: r * gy, x: c * gx, y: r * gy, vx: 0, vy: 0, c, r });
				return { n, cols, rows };
			};
			const m = build(env.w, env.h);
			return { ...m, build };
		},
		frame(env, s) {
			const { ctx, w, h, pointer: p } = env;
			if (Math.abs(s.n[s.n.length - 1].ox - w) > 4 || Math.abs(s.n[s.n.length - 1].oy - h) > 4) {
				const m = s.build(w, h);
				s.n = m.n;
				s.cols = m.cols;
				s.rows = m.rows;
			}
			const { n, cols, rows } = s;
			const k = env.params.tension / 1000;
			const damp = env.params.damping / 100;
			const idx = (c: number, r: number) => r * cols + c;
			for (const nd of n) {
				// Spring home + neighbor coupling.
				let fx = (nd.ox - nd.x) * k * 0.4;
				let fy = (nd.oy - nd.y) * k * 0.4;
				const nb = [
					[nd.c - 1, nd.r],
					[nd.c + 1, nd.r],
					[nd.c, nd.r - 1],
					[nd.c, nd.r + 1],
				];
				for (const [c, r] of nb) {
					if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
					const o = n[idx(c, r)];
					fx += (o.x - nd.x) * k;
					fy += (o.y - nd.y) * k;
				}
				nd.vx = (nd.vx + fx) * damp;
				nd.vy = (nd.vy + fy) * damp;
			}
			if (p.moved && p.inside) {
				for (const nd of n) {
					const dx = nd.x - p.x,
						dy = nd.y - p.y;
					const d = Math.hypot(dx, dy);
					if (d < 90 && d > 0.01) {
						const f = (1 - d / 90) * 3;
						nd.vx += (dx / d) * f;
						nd.vy += (dy / d) * f;
					}
				}
			}
			for (const nd of n) {
				nd.x += nd.vx;
				nd.y += nd.vy;
			}
			ctx.clearRect(0, 0, w, h);
			ctx.strokeStyle = `rgba(${INK},0.22)`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const nd = n[idx(c, r)];
					if (c < cols - 1) {
						const o = n[idx(c + 1, r)];
						ctx.moveTo(nd.x, nd.y);
						ctx.lineTo(o.x, o.y);
					}
					if (r < rows - 1) {
						const o = n[idx(c, r + 1)];
						ctx.moveTo(nd.x, nd.y);
						ctx.lineTo(o.x, o.y);
					}
				}
			}
			ctx.stroke();
			// Glow the most displaced nodes.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			for (const nd of n) {
				const disp = Math.hypot(nd.x - nd.ox, nd.y - nd.oy);
				if (disp < 6) continue;
				const a = clamp(disp / 60, 0, 0.7);
				ctx.fillStyle = `rgba(${ICE},${a})`;
				ctx.beginPath();
				ctx.arc(nd.x, nd.y, 2.4, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		},
	},

	// 12 Mirage — heat haze. The scene is drawn in thin horizontal strips, each
	// slid by a travelling wave that intensifies where the cursor "heats" it.
	mirage: {
		hint: 'Move across the horizon — the air shimmers hottest under your cursor.',
		params: [
			{ key: 'heat', label: 'Heat', min: 4, max: 40, step: 1, value: 18 },
			{ key: 'speed', label: 'Shimmer', min: 4, max: 30, step: 1, value: 14 },
		],
		init: (env) => ({ off: offscreen(env.w, env.h), w: 0, h: 0 }),
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			if (s.w !== Math.round(w) || s.h !== Math.round(h)) {
				s.off = offscreen(w, h);
				s.w = Math.round(w);
				s.h = Math.round(h);
				// Paint the static scene once: sky, sun, ground, word on the horizon.
				const o = s.off.x as CanvasRenderingContext2D;
				const sky = o.createLinearGradient(0, 0, 0, h * 0.6);
				sky.addColorStop(0, '#0b1220');
				sky.addColorStop(1, '#1a2740');
				o.fillStyle = sky;
				o.fillRect(0, 0, w, h * 0.6);
				const grd = o.createLinearGradient(0, h * 0.6, 0, h);
				grd.addColorStop(0, '#241a12');
				grd.addColorStop(1, '#0a0706');
				o.fillStyle = grd;
				o.fillRect(0, h * 0.6, w, h * 0.4);
				o.save();
				o.globalCompositeOperation = 'lighter';
				const sun = o.createRadialGradient(w / 2, h * 0.58, 0, w / 2, h * 0.58, h * 0.3);
				sun.addColorStop(0, 'rgba(255,214,170,0.5)');
				sun.addColorStop(1, 'rgba(255,214,170,0)');
				o.fillStyle = sun;
				o.fillRect(0, 0, w, h);
				o.restore();
				o.fillStyle = 'rgba(240,240,245,0.85)';
				o.textAlign = 'center';
				o.textBaseline = 'middle';
				o.font = `600 ${Math.min(w / (env.codename.length * 0.7), h * 0.14)}px "Space Grotesk", system-ui, sans-serif`;
				o.fillText(env.codename.toUpperCase(), w / 2, h * 0.52);
			}
			const heat = env.params.heat;
			const spd = env.params.speed / 6;
			const strip = 3;
			ctx.clearRect(0, 0, w, h);
			for (let y = 0; y < h; y += strip) {
				// Haze grows toward the ground and near the cursor's x/y.
				const groundBias = clamp((y - h * 0.45) / (h * 0.55), 0, 1);
				let localHeat = 1;
				if (p.moved) {
					const d = Math.abs(y - p.y);
					localHeat = 1 + clamp(1 - d / 160, 0, 1) * 2;
				}
				const amp = heat * 0.08 * groundBias * localHeat;
				const dx = Math.sin(y / 6 + t * 0.004 * spd) * amp;
				ctx.drawImage(s.off.c, 0, y, w, strip, dx, y, w, strip);
			}
		},
	},

	// 13 Growth — click to plant a seed. Branches climb, bend toward the cursor,
	// split, and keep growing into roots/vines. Your growth persists on screen.
	growth: {
		hint: 'Click to plant. Branches grow and bend toward your cursor.',
		params: [
			{ key: 'speed', label: 'Growth', min: 4, max: 30, step: 1, value: 14 },
			{ key: 'branch', label: 'Branching', min: 0, max: 100, step: 5, value: 40 },
		],
		init: (env) => {
			const off = offscreen(env.w, env.h);
			const tips: any[] = [];
			const seed = (x: number, y: number) => {
				for (let i = 0; i < 2; i++)
					tips.push({ x, y, a: -Math.PI / 2 + rnd(0.5, -0.5), life: rnd(120, 70), width: 3 });
			};
			seed(env.w / 2, env.h - 6);
			return { off, tips, seed, w: Math.round(env.w), h: Math.round(env.h) };
		},
		frame(env, s) {
			const { ctx, w, h, pointer: p } = env;
			if (s.w !== Math.round(w) || s.h !== Math.round(h)) {
				const next = offscreen(w, h);
				next.x.drawImage(s.off.c, 0, 0, w, h);
				s.off = next;
				s.w = Math.round(w);
				s.h = Math.round(h);
			}
			const off = s.off.x as CanvasRenderingContext2D;
			const speed = env.params.speed / 6;
			const branchP = env.params.branch / 100;
			const steps = Math.max(1, Math.round(speed));
			for (let it = 0; it < steps; it++) {
				for (let i = s.tips.length - 1; i >= 0; i--) {
					const tp = s.tips[i];
					const nx = tp.x + Math.cos(tp.a) * 3;
					const ny = tp.y + Math.sin(tp.a) * 3;
					off.strokeStyle = `rgba(${ICE},0.5)`;
					off.lineWidth = tp.width;
					off.lineCap = 'round';
					off.beginPath();
					off.moveTo(tp.x, tp.y);
					off.lineTo(nx, ny);
					off.stroke();
					tp.x = nx;
					tp.y = ny;
					// Steer: gentle upward + noise + toward cursor if near.
					tp.a += (noise2(tp.x * 0.01, tp.y * 0.01) - 0.5) * 0.5;
					if (p.moved) {
						const want = Math.atan2(p.y - tp.y, p.x - tp.x);
						let diff = want - tp.a;
						while (diff > Math.PI) diff -= TAU;
						while (diff < -Math.PI) diff += TAU;
						const d = Math.hypot(p.x - tp.x, p.y - tp.y);
						tp.a += diff * clamp(1 - d / 400, 0, 1) * 0.08;
					}
					tp.width = Math.max(0.4, tp.width * 0.992);
					tp.life--;
					if (tp.life <= 0 || tp.x < -20 || tp.x > w + 20 || tp.y < -20) {
						s.tips.splice(i, 1);
						continue;
					}
					if (Math.random() < branchP * 0.02 && s.tips.length < 60 && tp.width > 0.8) {
						s.tips.push({ x: tp.x, y: tp.y, a: tp.a + rnd(0.9, 0.4) * (Math.random() < 0.5 ? -1 : 1), life: tp.life * 0.7, width: tp.width * 0.7 });
					}
				}
			}
			// Ambient reseed so it's alive without clicking.
			if (s.tips.length === 0) s.seed(rnd(w * 0.8, w * 0.2), h - 6);
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(s.off.c, 0, 0, w, h);
			// Glow the live tips.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			for (const tp of s.tips) {
				const g = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, 7);
				g.addColorStop(0, `rgba(${ICE},0.8)`);
				g.addColorStop(1, `rgba(${INK},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(tp.x, tp.y, 7, 0, TAU);
				ctx.fill();
			}
			ctx.restore();
		},
		onDown: (env, s) => {
			if (env.pointer.inside) s.seed(env.pointer.x, env.pointer.y);
		},
		onReset: (env, s) => {
			s.off.x.clearRect(0, 0, env.w, env.h);
			s.tips.length = 0;
			s.seed(env.w / 2, env.h - 6);
		},
	},

	// 14 Cadence — a step sequencer where motion stands in for sound. Click the
	// grid to compose a loop; a playhead sweeps it and each hit fires a pulse.
	cadence: {
		hint: 'Click the grid to compose. The playhead plays your loop as motion.',
		params: [{ key: 'tempo', label: 'Tempo', min: 60, max: 220, step: 5, value: 120, format: (v) => `${v | 0} bpm` }],
		init: (env) => {
			const rows = 5,
				steps = 16;
			const cells: boolean[][] = Array.from({ length: rows }, () => Array(steps).fill(false));
			// A pleasant default so it's alive on arrival.
			cells[0][0] = cells[0][8] = true;
			cells[2][4] = cells[2][12] = true;
			cells[4][2] = cells[4][6] = cells[4][10] = cells[4][14] = true;
			return { rows, steps, cells, trig: Array(rows).fill(-9999), lastStep: -1 };
		},
		frame(env, s) {
			const { ctx, w, h, t } = env;
			ctx.clearRect(0, 0, w, h);
			const padX = w * 0.08,
				padTop = h * 0.14,
				padBot = h * 0.16;
			const gw = w - padX * 2,
				gh = h - padTop - padBot;
			const cw = gw / s.steps,
				chh = gh / s.rows;
			const beatMs = 60000 / env.params.tempo / 2; // 8th notes
			const playF = (t / beatMs) % s.steps;
			const cur = Math.floor(playF);
			if (cur !== s.lastStep) {
				s.lastStep = cur;
				for (let r = 0; r < s.rows; r++) if (s.cells[r][cur]) s.trig[r] = t;
			}
			const rowCol = ['239,68,68', '234,179,8', '34,197,94', `${INK}`, '168,85,247'];
			// Grid + cells.
			for (let r = 0; r < s.rows; r++) {
				for (let c = 0; c < s.steps; c++) {
					const x = padX + c * cw,
						y = padTop + r * chh;
					ctx.strokeStyle = 'rgba(255,255,255,0.06)';
					ctx.lineWidth = 1;
					ctx.strokeRect(x + 1, y + 1, cw - 2, chh - 2);
					if (s.cells[r][c]) {
						const on = c === cur ? 1 : 0.5;
						ctx.fillStyle = `rgba(${rowCol[r]},${0.35 + on * 0.5})`;
						ctx.fillRect(x + 3, y + 3, cw - 6, chh - 6);
					}
				}
			}
			// Playhead.
			const px = padX + (playF % s.steps) * cw;
			ctx.fillStyle = 'rgba(255,255,255,0.16)';
			ctx.fillRect(px, padTop, cw, gh);
			// Row "instruments" pulsing on the right margin.
			for (let r = 0; r < s.rows; r++) {
				const age = t - s.trig[r];
				const pulse = clamp(1 - age / 300, 0, 1);
				const y = padTop + r * chh + chh / 2;
				const rad = 6 + pulse * chh * 0.4;
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = `rgba(${rowCol[r]},${0.25 + pulse * 0.6})`;
				ctx.beginPath();
				ctx.arc(w - padX * 0.5, y, rad, 0, TAU);
				ctx.fill();
				ctx.restore();
			}
		},
		onDown: (env, s) => {
			const { w, h, pointer: p } = env;
			if (!p.inside) return;
			const padX = w * 0.08,
				padTop = h * 0.14,
				padBot = h * 0.16;
			const gw = w - padX * 2,
				gh = h - padTop - padBot;
			const cw = gw / s.steps,
				chh = gh / s.rows;
			const c = Math.floor((p.x - padX) / cw);
			const r = Math.floor((p.y - padTop) / chh);
			if (c >= 0 && c < s.steps && r >= 0 && r < s.rows) s.cells[r][c] = !s.cells[r][c];
		},
		onReset: (env, s) => {
			for (const row of s.cells) row.fill(false);
		},
	},

	// 15 Collapse — a grid of cells held in superposition, each flickering
	// between several ghost states at once. The cursor "measures" nearby cells,
	// collapsing them to a single crisp outcome before they blur again.
	collapse: {
		hint: 'Move across the grid — cells collapse from many states into one.',
		params: [
			{ key: 'radius', label: 'Measure radius', min: 60, max: 300, step: 10, value: 150 },
			{ key: 'flicker', label: 'Coherence', min: 2, max: 20, step: 1, value: 9 },
		],
		init: (env) => {
			const build = () => {
				const gap = 74;
				const cols = Math.max(3, Math.floor(env.w / gap));
				const rows = Math.max(2, Math.floor(env.h / gap));
				const ox = (env.w - cols * gap) / 2 + gap / 2;
				const oy = (env.h - rows * gap) / 2 + gap / 2;
				const cells: any[] = [];
				for (let r = 0; r < rows; r++)
					for (let c = 0; c < cols; c++)
						cells.push({ x: ox + c * gap, y: oy + r * gap, state: (Math.random() * 4) | 0, seed: rnd(100), col: 0 });
				return cells;
			};
			return { cells: build(), build };
		},
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const R = env.params.radius;
			const fl = env.params.flicker;
			const sz = 15;
			for (const cell of s.cells) {
				const near = p.moved ? clamp(1 - Math.hypot(p.x - cell.x, p.y - cell.y) / R, 0, 1) : 0;
				cell.col += ((near > 0.15 ? 1 : 0) - cell.col) * 0.2;
				const collapsed = cell.col;
				if (collapsed > 0.6) {
					// Definite state: one crisp glyph-square with orientation by state.
					ctx.save();
					ctx.translate(cell.x, cell.y);
					ctx.rotate((cell.state / 4) * TAU);
					ctx.fillStyle = `rgba(${ICE},${0.5 + collapsed * 0.5})`;
					ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.5);
					ctx.restore();
				} else {
					// Superposition: a few offset ghosts flickering.
					for (let g = 0; g < 3; g++) {
						const ph = t / (30 + fl * 6) + cell.seed + g * 2.1;
						const ox = Math.sin(ph) * sz * 0.6;
						const oy = Math.cos(ph * 1.3) * sz * 0.6;
						const a = (0.1 + (Math.sin(ph * 2) * 0.5 + 0.5) * 0.22) * (1 - collapsed);
						ctx.save();
						ctx.translate(cell.x + ox, cell.y + oy);
						ctx.rotate(ph);
						ctx.fillStyle = g === 2 ? `rgba(${INK},${a})` : `rgba(235,240,255,${a})`;
						ctx.fillRect(-sz / 2, -sz / 4, sz, sz * 0.4);
						ctx.restore();
					}
				}
			}
		},
		onDown: (env, s) => {
			// A click re-rolls the definite outcomes.
			for (const c of s.cells) c.state = (Math.random() * 4) | 0;
		},
	},

	// 16 Infinite — an endless receding landscape. A perspective grid streams
	// toward you through depth fog; the cursor steers the horizon. No far edge.
	infinite: {
		hint: 'Move left/right to steer. The ground streams on forever.',
		params: [
			{ key: 'speed', label: 'Speed', min: 4, max: 40, step: 1, value: 16 },
			{ key: 'fog', label: 'Fog', min: 0, max: 100, step: 5, value: 55 },
		],
		init: (env) => ({ z: 0, stars: Array.from({ length: 70 }, () => ({ x: rnd(1), y: rnd(1), s: rnd(1.6, 0.4) })) }),
		frame(env, s) {
			const { ctx, w, h, dt, pointer: p } = env;
			const hy = h * 0.42; // horizon
			s.z += (env.params.speed / 10) * (dt / 16);
			const pan = p.moved ? (p.x / w - 0.5) : Math.sin(env.t / 3000) * 0.3;
			// Sky.
			const sky = ctx.createLinearGradient(0, 0, 0, hy);
			sky.addColorStop(0, '#070b16');
			sky.addColorStop(1, '#132038');
			ctx.fillStyle = sky;
			ctx.fillRect(0, 0, w, hy);
			// Parallax stars.
			for (const st of s.stars) {
				const sx = ((st.x - pan * 0.15 + 1) % 1) * w;
				const sy = st.y * hy;
				ctx.fillStyle = `rgba(${ICE},${0.3 + st.s * 0.3})`;
				ctx.fillRect(sx, sy, st.s, st.s);
			}
			// Ground.
			ctx.fillStyle = '#0a0d13';
			ctx.fillRect(0, hy, w, h - hy);
			const vx = w / 2 - pan * w * 0.5; // vanishing point x
			ctx.strokeStyle = `rgba(${INK},0.35)`;
			ctx.lineWidth = 1;
			// Receding horizontal lines (rows), spaced by perspective, scrolling.
			for (let i = 1; i <= 22; i++) {
				const zz = i - (s.z % 1);
				const p2 = zz / 22;
				const y = hy + Math.pow(p2, 2.2) * (h - hy);
				if (y < hy || y > h) continue;
				const a = clamp(1 - p2, 0, 1) * 0.5;
				ctx.strokeStyle = `rgba(${INK},${a})`;
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}
			// Converging vertical lines.
			for (let i = -10; i <= 10; i++) {
				const bx = vx + i * (w * 0.11);
				ctx.strokeStyle = `rgba(${INK},0.18)`;
				ctx.beginPath();
				ctx.moveTo(vx + i * 8, hy);
				ctx.lineTo(bx, h);
				ctx.stroke();
			}
			// Depth fog near the horizon.
			const fog = env.params.fog / 100;
			const fg = ctx.createLinearGradient(0, hy, 0, hy + (h - hy) * 0.6);
			fg.addColorStop(0, `rgba(19,32,56,${fog})`);
			fg.addColorStop(1, 'rgba(19,32,56,0)');
			ctx.fillStyle = fg;
			ctx.fillRect(0, hy, w, (h - hy) * 0.6);
			// Sun on the horizon.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			const sun = ctx.createRadialGradient(vx, hy, 0, vx, hy, h * 0.25);
			sun.addColorStop(0, `rgba(${ICE},0.4)`);
			sun.addColorStop(1, `rgba(${ICE},0)`);
			ctx.fillStyle = sun;
			ctx.beginPath();
			ctx.arc(vx, hy, h * 0.25, 0, TAU);
			ctx.fill();
			ctx.restore();
		},
	},

	// ── From the case study "A Field Guide to App Animations" ──────────────────
	// The eight below rebuild iconic, self-contained UI animations from the atlas
	// as live, tunable playgrounds. See /work/ui-animation-atlas/.

	// 17 Split-Flap — a Solari departure board (atlas D01). Type a word and every
	// cell riffles through the alphabet before landing, settling left-to-right.
	'split-flap': {
		hint: 'Type a message — the board riffles through the alphabet to spell it.',
		params: [{ key: 'word', label: 'Message', type: 'text', text: '' }],
		init: () => {
			const cols = 11;
			const ALPHA = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			const cells = Array.from({ length: cols }, () => ({ idx: 0, tgt: 0, delay: 0, acc: 0, done: true }));
			return { cols, ALPHA, cells, reWord: 0 };
		},
		frame(env, s) {
			const { ctx, w, h, dt } = env;
			ctx.clearRect(0, 0, w, h);
			const raw = (env.text.word || env.codename).toUpperCase();
			s.reWord += dt;
			const ambient = !env.text.word && s.reWord > 3600;
			if (ambient) s.reWord = 0;
			const L = s.ALPHA.length;
			const cellW = Math.min((w * 0.86) / s.cols, h * 0.4);
			const cellH = cellW * 1.3;
			const x0 = w / 2 - (s.cols * cellW) / 2;
			const y0 = h / 2 - cellH / 2;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = `600 ${cellW * 0.66}px "Space Grotesk", system-ui, sans-serif`;
			for (let i = 0; i < s.cols; i++) {
				const ch = i < raw.length ? raw[i] : ' ';
				let tgt = s.ALPHA.indexOf(ch);
				if (tgt < 0) tgt = 0;
				const cell = s.cells[i];
				if (cell.tgt !== tgt) {
					cell.tgt = tgt;
					cell.done = false;
					cell.delay = i * 55;
				}
				if (ambient && Math.random() < 0.4) {
					cell.idx = (Math.random() * L) | 0;
					cell.done = false;
					cell.delay = i * 40;
				}
				if (!cell.done) {
					if (cell.delay > 0) cell.delay -= dt;
					else {
						cell.acc += dt;
						while (cell.acc > 42) {
							cell.acc -= 42;
							cell.idx = (cell.idx + 1) % L;
							if (cell.idx === cell.tgt) {
								cell.done = true;
								break;
							}
						}
					}
				}
				const cx = x0 + i * cellW + cellW / 2;
				rr(ctx, x0 + i * cellW + 1.5, y0, cellW - 3, cellH, 4);
				ctx.fillStyle = '#17171b';
				ctx.fill();
				ctx.strokeStyle = 'rgba(0,0,0,0.6)';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(x0 + i * cellW + 1.5, y0 + cellH / 2);
				ctx.lineTo(x0 + i * cellW + cellW - 1.5, y0 + cellH / 2);
				ctx.stroke();
				ctx.fillStyle = cell.done ? 'rgba(230,238,255,0.95)' : `rgba(${ICE},0.85)`;
				ctx.fillText(s.ALPHA[cell.idx], cx, y0 + cellH / 2);
			}
		},
	},

	// 18 Heart Burst — the like animation (atlas A09). Click to fire: a ring blooms
	// and shatters into particles as the heart pops in with an overshoot.
	'heart-burst': {
		hint: 'Click anywhere to like. Each tap fires a fresh burst.',
		params: [{ key: 'burst', label: 'Burst size', min: 40, max: 160, step: 10, value: 90 }],
		init: () => ({ bursts: [] as any[], liked: false, pop: 0, amb: 0 }),
		frame(env, s) {
			const { ctx, w, h, dt } = env;
			ctx.clearRect(0, 0, w, h);
			s.amb += dt;
			if (s.amb > 2600) {
				s.amb = 0;
				fireBurst(s, w / 2, h / 2, env.params.burst);
				s.liked = !s.liked;
				s.pop = 1;
			}
			const cx = w / 2,
				cy = h / 2;
			s.pop += (0 - s.pop) * 0.08;
			const hs = Math.min(w, h) * 0.13 * (1 + s.pop * 0.4);
			heartPath(ctx, cx, cy, hs);
			if (s.liked) {
				ctx.fillStyle = 'rgba(239,68,68,0.95)';
				ctx.fill();
			} else {
				ctx.strokeStyle = 'rgba(200,210,230,0.6)';
				ctx.lineWidth = 3;
				ctx.stroke();
			}
			for (let i = s.bursts.length - 1; i >= 0; i--) {
				const b = s.bursts[i];
				b.t += dt;
				const pr = b.t / 700;
				if (pr >= 1) {
					s.bursts.splice(i, 1);
					continue;
				}
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				const rad = b.r * (0.2 + pr * 0.9);
				ctx.strokeStyle = `rgba(${ICE},${(1 - pr) * 0.6})`;
				ctx.lineWidth = 3 * (1 - pr);
				ctx.beginPath();
				ctx.arc(b.x, b.y, rad, 0, TAU);
				ctx.stroke();
				for (const pt of b.parts) {
					const px = b.x + Math.cos(pt.a) * rad * 1.1;
					const py = b.y + Math.sin(pt.a) * rad * 1.1;
					ctx.fillStyle = `rgba(239,68,68,${1 - pr})`;
					ctx.beginPath();
					ctx.arc(px, py, 3 * (1 - pr) + 1, 0, TAU);
					ctx.fill();
				}
				ctx.restore();
			}
		},
		onDown(env, s) {
			if (!env.pointer.inside) return;
			fireBurst(s, env.pointer.x, env.pointer.y, env.params.burst);
			s.liked = !s.liked;
			s.pop = 1;
		},
	},

	// 19 Odometer — mechanical number wheels (atlas D10). Drag up/down to change the
	// count; a high wheel only rolls when the wheel below it carries.
	odometer: {
		hint: 'Drag up or down to spin the count. Click to add one.',
		params: [
			{ key: 'digits', label: 'Digits', min: 4, max: 8, step: 1, value: 6 },
			{ key: 'drift', label: 'Auto-count', min: 0, max: 20, step: 1, value: 4 },
		],
		init: () => ({ val: 0, disp: 0 }),
		frame(env, s) {
			const { ctx, w, h, dt, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			if (p.down && p.inside) s.val = Math.max(0, s.val - p.vy * 0.6);
			s.val += (env.params.drift / 1000) * dt;
			s.disp += (s.val - s.disp) * 0.16;
			const n = env.params.digits | 0;
			const cellW = Math.min((w * 0.66) / n, h * 0.5);
			const cellH = cellW * 1.4;
			const x0 = w / 2 - (n * cellW) / 2;
			const cy = h / 2;
			ctx.font = `600 ${cellW * 0.8}px "Space Grotesk", system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (let i = 0; i < n; i++) {
				const place = n - 1 - i;
				const scaled = s.disp / Math.pow(10, place);
				const base = Math.floor(scaled);
				const frac = scaled - base;
				const rollFrac = place === 0 ? frac : clamp((frac - 0.85) / 0.15, 0, 1);
				const digit = ((base % 10) + 10) % 10;
				const cx = x0 + i * cellW + cellW / 2;
				ctx.save();
				rr(ctx, x0 + i * cellW + 1.5, cy - cellH / 2, cellW - 3, cellH, 4);
				ctx.fillStyle = '#141418';
				ctx.fill();
				ctx.clip();
				const yOff = rollFrac * cellH;
				ctx.fillStyle = `rgba(${ICE},0.9)`;
				ctx.fillText(String(digit), cx, cy - yOff);
				ctx.fillText(String((digit + 1) % 10), cx, cy + cellH - yOff);
				ctx.restore();
				ctx.strokeStyle = 'rgba(0,0,0,0.5)';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x0 + i * cellW, cy);
				ctx.lineTo(x0 + (i + 1) * cellW, cy);
				ctx.stroke();
			}
		},
		onDown(env, s) {
			if (env.pointer.inside) s.val = Math.floor(s.val) + 1;
		},
	},

	// 20 Gauge — a physical needle (atlas D09). Drag to set a target; the needle
	// overshoots by a few degrees and settles in one damped swing. Mass, not easing.
	gauge: {
		hint: 'Drag across the dial to set the needle. Watch it overshoot and settle.',
		params: [
			{ key: 'stiffness', label: 'Stiffness', min: 4, max: 30, step: 1, value: 14 },
			{ key: 'damping', label: 'Damping', min: 70, max: 96, step: 1, value: 86, format: (v) => `${v}%` },
		],
		init: () => ({ ang: -0.6, vel: 0, tgt: -0.6 }),
		frame(env, s) {
			const { ctx, w, h, t, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const cx = w / 2,
				cy = h * 0.58,
				R = Math.min(w * 0.32, h * 0.42);
			const A0 = -Math.PI * 0.75,
				A1 = Math.PI * 0.75;
			if (p.moved && p.idle < 1500 && p.y < cy + R) {
				s.tgt = clamp(Math.atan2(p.y - cy, p.x - cx), A0, A1);
			} else {
				s.tgt = A0 + (Math.sin(t / 1400) * 0.5 + 0.5) * (A1 - A0);
			}
			const k = env.params.stiffness / 1000;
			const damp = env.params.damping / 100;
			s.vel = (s.vel + (s.tgt - s.ang) * k) * damp;
			s.ang += s.vel;
			ctx.strokeStyle = 'rgba(255,255,255,0.12)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(cx, cy, R, A0, A1);
			ctx.stroke();
			for (let i = 0; i <= 10; i++) {
				const a = A0 + (i / 10) * (A1 - A0);
				ctx.strokeStyle = i >= 8 ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.3)';
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10));
				ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
				ctx.stroke();
			}
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(s.ang);
			ctx.strokeStyle = `rgba(${ICE},0.95)`;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(-R * 0.12, 0);
			ctx.lineTo(R * 0.92, 0);
			ctx.stroke();
			ctx.restore();
			ctx.fillStyle = 'rgba(230,238,255,0.9)';
			ctx.beginPath();
			ctx.arc(cx, cy, R * 0.06, 0, TAU);
			ctx.fill();
			ctx.fillStyle = `rgba(${ICE},0.9)`;
			ctx.font = `600 ${R * 0.22}px "Space Grotesk", system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(Math.round(((s.ang - A0) / (A1 - A0)) * 100)), cx, cy + R * 0.5);
		},
	},

	// 21 Phosphor — a green-screen terminal (atlas C01/C02/C03). Type and the
	// characters print at cursor speed, over scanlines, with a blinking block cursor.
	phosphor: {
		hint: 'Type a command — it prints in phosphor with a blinking cursor.',
		params: [
			{ key: 'line', label: 'Command', type: 'text', text: '' },
			{ key: 'speed', label: 'Type speed', min: 6, max: 40, step: 1, value: 20 },
		],
		init: () => ({ shown: 0 }),
		frame(env, s) {
			const { ctx, w, h, dt, t } = env;
			const GREEN = '126,252,216';
			ctx.fillStyle = '#04120c';
			ctx.fillRect(0, 0, w, h);
			const target = '> ' + (env.text.line || env.codename.toUpperCase());
			s.shown += (env.params.speed / 1000) * dt * 8;
			if (s.shown > target.length) s.shown = target.length;
			const str = target.slice(0, Math.floor(s.shown));
			const fs = Math.min(h * 0.13, w * 0.055);
			ctx.font = `500 ${fs}px "Space Grotesk", ui-monospace, monospace`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			const tx = w * 0.12,
				ty = h * 0.5;
			ctx.fillStyle = `rgba(${GREEN},0.22)`;
			ctx.fillText(str, tx + 1.5, ty + 1.5);
			ctx.save();
			ctx.shadowColor = `rgba(${GREEN},0.8)`;
			ctx.shadowBlur = fs * 0.4;
			ctx.fillStyle = `rgba(${GREEN},0.95)`;
			ctx.fillText(str, tx, ty);
			ctx.restore();
			if (Math.floor(t / 260) % 2 === 0 || s.shown < target.length) {
				const cwm = ctx.measureText(str).width;
				ctx.fillStyle = `rgba(${GREEN},0.9)`;
				ctx.fillRect(tx + cwm + 3, ty - fs * 0.45, fs * 0.5, fs * 0.9);
			}
			ctx.fillStyle = 'rgba(0,0,0,0.18)';
			for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
			const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
			vg.addColorStop(0, 'rgba(0,0,0,0)');
			vg.addColorStop(1, 'rgba(0,0,0,0.5)');
			ctx.fillStyle = vg;
			ctx.fillRect(0, 0, w, h);
		},
	},

	// 22 Knob — a detented rotary control (atlas E03). Drag to turn it; it snaps
	// through physical detents, each tick brightening as it passes. Braun-quiet.
	knob: {
		hint: 'Drag around the knob to turn it through its detents.',
		params: [{ key: 'detents', label: 'Detents', min: 8, max: 36, step: 1, value: 24 }],
		init: () => ({ ang: 0, disp: 0, grabbed: false, grabAng: 0, grabStart: 0 }),
		frame(env, s) {
			const { ctx, w, h, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const cx = w / 2,
				cy = h / 2,
				R = Math.min(w, h) * 0.24;
			const D = env.params.detents | 0;
			const step = TAU / D;
			if (p.down && p.inside) {
				const a = Math.atan2(p.y - cy, p.x - cx);
				if (!s.grabbed) {
					s.grabbed = true;
					s.grabAng = a;
					s.grabStart = s.ang;
				}
				let da = a - s.grabAng;
				while (da > Math.PI) da -= TAU;
				while (da < -Math.PI) da += TAU;
				s.ang = s.grabStart + da;
			} else {
				s.grabbed = false;
				if (!p.moved || p.idle > 1500) s.ang += 0.004;
			}
			const snapped = Math.round(s.ang / step) * step;
			s.disp += (snapped - s.disp) * 0.3;
			const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
			g.addColorStop(0, '#3a3a42');
			g.addColorStop(1, '#17171b');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(cx, cy, R, 0, TAU);
			ctx.fill();
			ctx.strokeStyle = 'rgba(255,255,255,0.08)';
			ctx.lineWidth = 1;
			ctx.stroke();
			for (let i = 0; i < D; i++) {
				const a = i * step - Math.PI / 2;
				let diff = a - (s.disp - Math.PI / 2);
				diff = Math.atan2(Math.sin(diff), Math.cos(diff));
				const lit = Math.abs(diff) < step * 0.6;
				ctx.strokeStyle = `rgba(${ICE},${lit ? 0.9 : 0.2})`;
				ctx.lineWidth = lit ? 2 : 1;
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
				ctx.lineTo(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14));
				ctx.stroke();
			}
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(s.disp - Math.PI / 2);
			ctx.strokeStyle = `rgba(${ICE},0.95)`;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(R * 0.35, 0);
			ctx.lineTo(R * 0.8, 0);
			ctx.stroke();
			ctx.restore();
			ctx.fillStyle = `rgba(${ICE},0.85)`;
			ctx.font = `600 ${R * 0.3}px "Space Grotesk", system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String((((Math.round(s.disp / step) % D) + D) % D)), cx, cy);
		},
	},

	// 23 Stamp — a rubber stamp (atlas F05), on paper. Click to slam an impression:
	// it overshoots, holds, and leaves rough ink slightly off-axis. They pile up.
	stamp: {
		hint: 'Click anywhere to slam a stamp. They build up on the page.',
		params: [{ key: 'clear', label: 'One at a time', type: 'toggle', on: false }],
		init: (env) => {
			// Pre-ink one impression so the page arrives with a stamp on the paper.
			const off = offscreen(env.w, env.h);
			drawStamp(off.x, env.codename.toUpperCase(), env.w * 0.5, env.h * 0.46, -0.05, 1, env.theme === 'light', 0.9);
			return { off, bw: Math.round(env.w), bh: Math.round(env.h), anim: null as any, amb: 1400, wi: 1 };
		},
		frame(env, s) {
			const { ctx, w, h, dt } = env;
			const light = env.theme === 'light';
			if (s.bw !== Math.round(w) || s.bh !== Math.round(h)) {
				const nx = offscreen(w, h);
				nx.x.drawImage(s.off.c, 0, 0, w, h);
				s.off = nx;
				s.bw = Math.round(w);
				s.bh = Math.round(h);
			}
			s.amb += dt;
			if (s.amb > 3000 && !s.anim) {
				s.amb = 0;
				startStamp(s, env, rnd(w * 0.72, w * 0.28), rnd(h * 0.66, h * 0.34));
			}
			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(s.off.c, 0, 0, w, h);
			if (s.anim) {
				const a = s.anim;
				a.t += dt;
				const pr = a.t / 260;
				const sc = pr < 0.5 ? 1.5 - pr : 1;
				drawStamp(ctx, a.word, a.x, a.y, a.rot, sc, light, 1);
				if (pr >= 1) {
					if (env.flags.clear) s.off.x.clearRect(0, 0, w, h);
					drawStamp(s.off.x as CanvasRenderingContext2D, a.word, a.x, a.y, a.rot, 1, light, 0.92);
					s.anim = null;
				}
			}
		},
		onDown(env, s) {
			if (env.pointer.inside) startStamp(s, env, env.pointer.x, env.pointer.y);
		},
		onReset(env, s) {
			s.off.x.clearRect(0, 0, env.w, env.h);
			s.anim = null;
		},
	},

	// 24 Pull to Refresh — the elastic list gesture (atlas A05). Drag down past the
	// top and the content stretches; a spinner arms, and release snaps back with a
	// new row dropped in.
	'pull-refresh': {
		hint: 'Drag down from the top to refresh. Release past the arm line to load a row.',
		params: [{ key: 'threshold', label: 'Arm distance', min: 40, max: 160, step: 10, value: 90 }],
		init: () => ({ pull: 0, target: 0, refreshing: 0, rows: 6, newRow: 0, amb: 0, spin: 0, lastDown: false }),
		frame(env, s) {
			const { ctx, w, h, dt, pointer: p } = env;
			ctx.clearRect(0, 0, w, h);
			const colW = Math.min(w * 0.5, 420),
				x0 = w / 2 - colW / 2;
			const rowH = 54;
			const thr = env.params.threshold;
			if (p.down && p.inside) {
				s.target = clamp((p.y - h * 0.14) * 0.5, 0, 200);
			} else {
				if (s.lastDown && s.pull > thr) {
					s.refreshing = 1;
					s.spin = 0;
				}
				s.target = s.refreshing ? 60 : 0;
			}
			s.lastDown = p.down && p.inside;
			s.amb += dt;
			if (!p.moved && s.amb > 3800 && !s.refreshing) {
				s.amb = 0;
				s.refreshing = 1;
				s.spin = 0;
				s.pull = thr + 20;
			}
			s.pull += (s.target - s.pull) * 0.18;
			if (s.refreshing) {
				s.spin += dt;
				if (s.spin > 900) {
					s.refreshing = 0;
					s.newRow = 1;
					s.rows = Math.min(s.rows + 1, 9);
				}
			}
			ctx.save();
			rr(ctx, x0, h * 0.14, colW, h * 0.72, 12);
			ctx.fillStyle = 'rgba(255,255,255,0.02)';
			ctx.fill();
			ctx.clip();
			const sy = h * 0.14 + Math.min(s.pull, 70) / 2;
			ctx.strokeStyle = `rgba(${ICE},${clamp(s.pull / thr, 0, 1)})`;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			const a0 = s.refreshing ? s.spin / 120 : -Math.PI / 2;
			const a1 = s.refreshing ? a0 + Math.PI * 1.4 : -Math.PI / 2 + clamp(s.pull / thr, 0, 1) * TAU;
			ctx.beginPath();
			ctx.arc(w / 2, sy + 8, 12, a0, a1);
			ctx.stroke();
			const top = h * 0.14 + s.pull;
			for (let i = 0; i < s.rows; i++) {
				const ry = top + i * rowH + 8;
				const fresh = i === 0 && s.newRow > 0;
				rr(ctx, x0 + 12, ry, colW - 24, rowH - 10, 8);
				ctx.fillStyle = fresh ? `rgba(${INK},0.18)` : 'rgba(255,255,255,0.05)';
				ctx.fill();
				ctx.fillStyle = 'rgba(255,255,255,0.14)';
				ctx.fillRect(x0 + 24, ry + 12, colW * 0.4, 6);
				ctx.fillStyle = 'rgba(255,255,255,0.09)';
				ctx.fillRect(x0 + 24, ry + 26, colW * 0.6, 5);
			}
			ctx.restore();
			if (s.newRow > 0) s.newRow = Math.max(0, s.newRow - dt / 900);
		},
	},
};

// ── Engine ──────────────────────────────────────────────────────────────────
// Mounts a playground onto `canvas`, wiring pointer/touch, the RAF loop, the
// control panel (built into `controlsEl`), a reset button, reduced-motion, and
// off-screen/hidden pausing. Returns a destroy() for Astro view transitions.
export function mountPlayground(
	canvas: HTMLCanvasElement,
	slug: string,
	codename: string,
	controlsEl: HTMLElement | null,
	hintEl: HTMLElement | null
) {
	const pg = PLAYGROUNDS[slug];
	const ctx = canvas.getContext('2d');
	if (!pg || !ctx) return { destroy() {} };
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	const params: Record<string, number> = {};
	const flags: Record<string, boolean> = {};
	const text: Record<string, string> = {};
	for (const pdef of pg.params ?? []) {
		if (pdef.type === 'toggle') flags[pdef.key] = !!pdef.on;
		else if (pdef.type === 'text') text[pdef.key] = pdef.text ?? '';
		else params[pdef.key] = pdef.value ?? 0;
	}

	const pointer: PGPointer = { x: 0, y: 0, vx: 0, vy: 0, down: false, inside: false, moved: false, idle: 9999 };
	const theme: 'light' | 'dark' = canvas.dataset.theme === 'light' ? 'light' : 'dark';
	let w = 0,
		h = 0;
	const env: PGEnv = { ctx, w, h, t: 0, dt: 16, pointer, params, flags, text, reduced, codename, theme };
	let state: any = {};

	function layout() {
		w = canvas.clientWidth;
		h = canvas.clientHeight;
		if (!w || !h) return false;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		env.w = w;
		env.h = h;
		return true;
	}

	// Pointer + touch. Coordinates are canvas-relative CSS pixels.
	const setPos = (e: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		pointer.x = e.clientX - rect.left;
		pointer.y = e.clientY - rect.top;
		pointer.inside = true;
		pointer.moved = true;
		lastMove = performance.now();
	};
	const onMove = (e: PointerEvent) => setPos(e);
	const onDown = (e: PointerEvent) => {
		setPos(e);
		pointer.down = true;
		// Capture the pointer so a drag (finger or mouse) that strays outside the
		// canvas keeps driving the effect — essential for the dial/knob/fold drags
		// on touch, where the finger easily leaves the middle band.
		try {
			canvas.setPointerCapture(e.pointerId);
		} catch {}
		if (pg.onDown) pg.onDown(env, state);
	};
	const onUp = () => {
		pointer.down = false;
	};
	const onLeave = () => {
		// While captured, a drag outside shouldn't count as "left"; only clear
		// inside when no button/finger is down.
		if (pointer.down) return;
		pointer.inside = false;
	};
	canvas.addEventListener('pointermove', onMove, { passive: true });
	canvas.addEventListener('pointerdown', onDown, { passive: true });
	window.addEventListener('pointerup', onUp, { passive: true });
	canvas.addEventListener('pointerleave', onLeave, { passive: true });

	// Control panel.
	function buildControls() {
		if (!controlsEl) return;
		controlsEl.innerHTML = '';
		for (const pdef of pg.params ?? []) {
			if (pdef.type === 'toggle') {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'pg-toggle';
				btn.setAttribute('aria-pressed', String(!!pdef.on));
				btn.innerHTML = `<span>${pdef.label}</span><span class="pg-toggle__dot"></span>`;
				btn.addEventListener('click', () => {
					flags[pdef.key] = !flags[pdef.key];
					btn.setAttribute('aria-pressed', String(flags[pdef.key]));
				});
				controlsEl.appendChild(btn);
			} else if (pdef.type === 'text') {
				const wrap = document.createElement('label');
				wrap.className = 'pg-ctrl';
				const input = document.createElement('input');
				input.type = 'text';
				input.className = 'pg-text';
				input.placeholder = codename;
				input.maxLength = 14;
				input.value = pdef.text ?? '';
				input.addEventListener('input', () => (text[pdef.key] = input.value));
				wrap.innerHTML = `<span class="pg-ctrl__row"><span class="pg-ctrl__label">${pdef.label}</span></span>`;
				wrap.appendChild(input);
				controlsEl.appendChild(wrap);
			} else {
				const wrap = document.createElement('label');
				wrap.className = 'pg-ctrl';
				const fmt = pdef.format ?? ((v: number) => String(v));
				const val = document.createElement('span');
				val.className = 'pg-ctrl__val';
				val.textContent = fmt(params[pdef.key]);
				const input = document.createElement('input');
				input.type = 'range';
				input.className = 'pg-range';
				input.min = String(pdef.min ?? 0);
				input.max = String(pdef.max ?? 100);
				input.step = String(pdef.step ?? 1);
				input.value = String(params[pdef.key]);
				input.addEventListener('input', () => {
					params[pdef.key] = parseFloat(input.value);
					val.textContent = fmt(params[pdef.key]);
				});
				const row = document.createElement('span');
				row.className = 'pg-ctrl__row';
				const lab = document.createElement('span');
				lab.className = 'pg-ctrl__label';
				lab.textContent = pdef.label;
				row.appendChild(lab);
				row.appendChild(val);
				wrap.appendChild(row);
				wrap.appendChild(input);
				controlsEl.appendChild(wrap);
			}
		}
		const reset = document.createElement('button');
		reset.type = 'button';
		reset.className = 'pg-reset';
		reset.textContent = 'Reset';
		reset.addEventListener('click', () => {
			state = pg.init(env);
			if (pg.onReset) pg.onReset(env, state);
		});
		controlsEl.appendChild(reset);
	}

	// RAF loop.
	let raf = 0,
		running = false,
		start = 0,
		last = 0,
		lastMove = -9999,
		onScreen = true;
	function loop(now: number) {
		if (!running) return;
		if (!canvas.isConnected) return stop();
		env.dt = Math.min(50, now - last || 16);
		last = now;
		env.t = now - start;
		pointer.vx = pointer.x - (pointer as any)._pfx || 0;
		pointer.vy = pointer.y - (pointer as any)._pfy || 0;
		pointer.idle = now - lastMove;
		pg.frame(env, state);
		(pointer as any)._pfx = pointer.x;
		(pointer as any)._pfy = pointer.y;
		raf = requestAnimationFrame(loop);
	}
	function play() {
		if (running || !onScreen || document.hidden) return;
		if (!w && !layout()) return;
		running = true;
		last = performance.now();
		if (!start) start = last;
		raf = requestAnimationFrame(loop);
	}
	function stop() {
		running = false;
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	}

	buildControls();
	if (!layout()) {
		// Parent not sized yet — try once more next frame.
		requestAnimationFrame(() => {
			if (layout()) init();
		});
	} else {
		init();
	}

	function init() {
		state = pg.init(env);
		if (hintEl) hintEl.textContent = pg.hint;
		if (reduced) {
			// One static frame, no loop.
			env.t = 0;
			env.dt = 16;
			pointer.moved = false;
			pg.frame(env, state);
			return;
		}
		start = performance.now();
		play();
	}

	const io =
		'IntersectionObserver' in window
			? new IntersectionObserver(
					(es) => {
						onScreen = es[0].isIntersecting;
						if (reduced) return;
						onScreen ? play() : stop();
					},
					{ threshold: 0 }
				)
			: null;
	if (io) io.observe(canvas);
	const onVis = () => {
		if (reduced) return;
		document.hidden ? stop() : play();
	};
	document.addEventListener('visibilitychange', onVis);

	let resizeT = 0;
	const onResize = () => {
		clearTimeout(resizeT);
		resizeT = window.setTimeout(() => {
			if (layout() && reduced) pg.frame(env, state);
		}, 180);
	};
	window.addEventListener('resize', onResize);

	return {
		destroy() {
			stop();
			io?.disconnect();
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointerleave', onLeave);
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
		},
	};
}
