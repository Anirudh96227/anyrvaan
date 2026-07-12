// Typography-first canvas sketches for the Interaction Lab. Each experiment's
// effect is applied to the codename's own glyphs — the letters fold, melt,
// scatter, sag, split into RGB, ripple — rather than to a panel behind them.
// While a sketch runs, the real DOM text is hidden and the canvas draws a
// per-glyph replica of it (same computed font/size/color), so the word itself
// appears to perform the effect. One renderer per slug drives BOTH the card's
// hover preview and the fullscreen page (auto mode) — the hover really is a
// miniature of the full thing. Every sketch also self-demonstrates with an
// ambient driver when the pointer isn't near, so nothing reads as static.

export interface PointerState {
	x: number | null;
	y: number | null;
}

export interface WordLayout {
	chars: string[];
	widths: number[];
	cxs: number[]; // center x of each glyph slot
	left: number;
	totalW: number;
	baselineY: number;
	ascent: number;
	descent: number;
	fontSize: number;
	font: string;
	fill: string;
}

export interface Env {
	w: number;
	h: number;
	g: WordLayout;
}

export interface Renderer {
	init?: (env: Env) => any;
	draw: (
		ctx: CanvasRenderingContext2D,
		env: Env,
		elapsed: number,
		state: any,
		pointer: PointerState
	) => void;
}

interface Mod {
	dx?: number;
	dy?: number;
	rot?: number;
	sx?: number;
	sy?: number;
	alpha?: number;
	fill?: string;
	glow?: number; // blue shadowBlur radius
}

const BLUE = (a: number) => `rgba(147,197,253,${a})`;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Draw every glyph at its slot, each transformed by `mod`. Transforms are
// applied around the glyph's own (center, baseline) point so rotation/scale
// read as the letter itself tipping, growing, squishing.
function glyphs(
	ctx: CanvasRenderingContext2D,
	g: WordLayout,
	mod?: (i: number, ch: string) => Mod | void
) {
	ctx.font = g.font;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'alphabetic';
	for (let i = 0; i < g.chars.length; i++) {
		const m = (mod && mod(i, g.chars[i])) || {};
		if (m.alpha !== undefined && m.alpha <= 0) continue;
		ctx.save();
		ctx.translate(g.cxs[i] + (m.dx ?? 0), g.baselineY + (m.dy ?? 0));
		if (m.rot) ctx.rotate(m.rot);
		if (m.sx !== undefined || m.sy !== undefined) ctx.scale(m.sx ?? 1, m.sy ?? 1);
		if (m.glow) {
			ctx.shadowColor = 'rgba(96,165,250,0.9)';
			ctx.shadowBlur = m.glow;
		}
		ctx.globalAlpha = m.alpha ?? 1;
		ctx.fillStyle = m.fill ?? g.fill;
		ctx.fillText(g.chars[i], 0, 0);
		ctx.restore();
	}
	ctx.globalAlpha = 1;
}

// The whole word, uniformly offset — used for echoes, reflections, ghosts.
function word(
	ctx: CanvasRenderingContext2D,
	g: WordLayout,
	dx = 0,
	dy = 0,
	alpha = 1,
	fill?: string
) {
	glyphs(ctx, g, () => ({ dx, dy, alpha, fill }));
}

export const RENDERERS: Record<string, Renderer> = {
	// 01 Residual — the word drifts on a slow loop and its previous positions
	// persist as fading blue afterimages: overlapping timelines of the same text.
	residual: {
		init: () => ({ hist: [] as { ox: number; oy: number; t: number }[] }),
		draw(ctx, env, e, s) {
			const { g, w, h } = env;
			const ox = Math.sin(e / 850) * g.fontSize * 0.55;
			const oy = Math.sin(e / 530) * g.fontSize * 0.3;
			s.hist.push({ ox, oy, t: e });
			while (s.hist.length && e - s.hist[0].t > 700) s.hist.shift();
			ctx.clearRect(0, 0, w, h);
			for (let i = 0; i < s.hist.length; i += 4) {
				const p = s.hist[i];
				const a = (1 - (e - p.t) / 700) * 0.35;
				word(ctx, g, p.ox, p.oy, a, BLUE(0.9));
			}
			word(ctx, g, ox, oy, 1);
		},
	},

	// 02 Fold — a crease sweeps in from the right; every letter past it tips
	// over the fold line, compressing and dimming like paper bending away.
	fold: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const cyc = (Math.sin(e / 1100) + 1) / 2;
			const foldX = g.left + g.totalW * (1 - cyc * 0.6);
			glyphs(ctx, g, (i) => {
				const cx = g.cxs[i];
				if (cx <= foldX) return {};
				const t = clamp((cx - foldX) / (g.totalW * 0.4), 0, 1);
				return {
					rot: t * 0.85,
					dy: t * t * g.fontSize * 0.4,
					sy: 1 - t * 0.3,
					alpha: 1 - t * 0.3,
					fill: BLUE(0.9),
				};
			});
			ctx.strokeStyle = BLUE(0.4);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(foldX, g.baselineY - g.ascent);
			ctx.lineTo(foldX + g.fontSize * 0.18, g.baselineY + g.descent);
			ctx.stroke();
		},
	},

	// 03 Flux Ink — the word goes soft (blur), letters sag on their own
	// cycles, and droplets of ink detach from glyph bottoms and fall.
	'flux-ink': {
		init: () => ({ drops: [] as { x: number; y: number; t: number }[], last: 0 }),
		draw(ctx, env, e, s) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			if (e - s.last > 240 && s.drops.length < 16) {
				s.last = e;
				const i = (Math.random() * g.chars.length) | 0;
				s.drops.push({
					x: g.cxs[i] + (Math.random() - 0.5) * g.widths[i] * 0.6,
					y: g.baselineY + g.descent * 0.4,
					t: e,
				});
			}
			ctx.save();
			ctx.filter = `blur(${Math.max(0.6, g.fontSize * 0.028)}px)`;
			glyphs(ctx, g, (i) => ({
				dy: (Math.sin(e / 640 + i * 1.7) * 0.5 + 0.5) * g.fontSize * 0.12,
				sx: 1 + Math.sin(e / 800 + i) * 0.04,
			}));
			ctx.restore();
			for (let k = s.drops.length - 1; k >= 0; k--) {
				const d = s.drops[k];
				const age = (e - d.t) / 1000;
				const y = d.y + age * age * g.fontSize * 2.4;
				if (y > h) {
					s.drops.splice(k, 1);
					continue;
				}
				ctx.beginPath();
				ctx.arc(d.x, y, Math.max(1, g.fontSize * 0.05 * (1 - age * 0.35)), 0, Math.PI * 2);
				ctx.fillStyle = BLUE(0.75 * Math.max(0, 1 - age * 0.8));
				ctx.fill();
			}
		},
	},

	// 04 Pulse Type — every glyph breathes, bounces, and blinks on its own
	// independent rhythm while the word stays readable.
	'pulse-type': {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			glyphs(ctx, g, (i) => ({
				dy: Math.sin(e / 260 + i * 0.8) * g.fontSize * 0.09,
				sy: 1 + Math.sin(e / 340 + i * 1.3) * 0.09,
				alpha: 0.65 + (Math.sin(e / 300 + i) * 0.5 + 0.5) * 0.35,
			}));
		},
	},

	// 05 Mesh — letters behave like points on stretched fabric: they're pulled
	// toward the cursor (or a roaming point) with distance falloff, tilting as
	// the fabric shears.
	mesh: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const px = ptr.x ?? g.left + ((Math.sin(e / 1300) + 1) / 2) * g.totalW;
			const py = ptr.y ?? g.baselineY - g.ascent * 0.5;
			glyphs(ctx, g, (i) => {
				const gy = g.baselineY - g.ascent * 0.35;
				const dx0 = px - g.cxs[i],
					dy0 = py - gy;
				const d = Math.hypot(dx0, dy0) + 0.001;
				const pull = Math.max(0, 1 - d / (g.fontSize * 4.5)) * g.fontSize * 0.42;
				return {
					dx: (dx0 / d) * pull,
					dy: (dy0 / d) * pull,
					rot: (dx0 / d) * pull * 0.018,
				};
			});
		},
	},

	// 06 Lumen — a small light travels along the word: letters near it flare
	// bright with a glow, and each casts a faint blue shadow away from it.
	lumen: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const lx = ptr.x ?? g.left + ((Math.sin(e / 1400) + 1) / 2) * g.totalW;
			const ly = g.baselineY - g.ascent * 1.5;
			glyphs(ctx, g, (i) => {
				const b = Math.max(0, 1 - Math.abs(g.cxs[i] - lx) / (g.totalW * 0.5));
				return {
					dx: (g.cxs[i] - lx) * 0.1,
					dy: g.fontSize * 0.2,
					alpha: 0.22 * b + 0.06,
					fill: BLUE(1),
				};
			});
			glyphs(ctx, g, (i) => {
				const b = Math.max(0, 1 - Math.abs(g.cxs[i] - lx) / (g.totalW * 0.5));
				return { fill: `rgba(255,255,255,${0.3 + b * 0.7})`, glow: b * g.fontSize * 0.5 };
			});
			const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, g.fontSize * 0.9);
			grad.addColorStop(0, 'rgba(255,244,214,0.6)');
			grad.addColorStop(1, 'rgba(255,244,214,0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(lx, ly, g.fontSize * 0.9, 0, Math.PI * 2);
			ctx.fill();
		},
	},

	// 07 Lag — the word sways, and two delayed copies of it run the same
	// motion 160ms and 320ms behind: visible parallel timelines trailing it.
	lag: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			for (let k = 2; k >= 0; k--) {
				const dx = Math.sin((e - k * 160) / 800) * g.fontSize * 0.65;
				if (k === 0) word(ctx, g, dx, 0, 1);
				else word(ctx, g, dx, 0, 0.4 - k * 0.12, BLUE(0.9));
			}
		},
	},

	// 08 Swarm — the letters scatter to random positions, tumbling, then fly
	// back and lock into the word, hold formation with a tiny hum, and scatter
	// again: particles forming language.
	swarm: {
		init: (env) => ({
			rand: env.g.chars.map(() => ({
				x: Math.random() * env.w,
				y: Math.random() * env.h,
				r: (Math.random() - 0.5) * 5,
			})),
		}),
		draw(ctx, env, e, s) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const cyc = (e % 4200) / 4200;
			const phase =
				cyc < 0.4 ? easeInOut(cyc / 0.4) : cyc < 0.72 ? 1 : easeInOut(1 - (cyc - 0.72) / 0.28);
			glyphs(ctx, g, (i) => {
				const r = s.rand[i];
				const jx = phase === 1 ? Math.sin(e / 200 + i * 2) * 0.8 : 0;
				return {
					dx: (r.x - g.cxs[i]) * (1 - phase) + jx,
					dy: (r.y - g.baselineY) * (1 - phase),
					rot: (1 - phase) * r.r,
					alpha: 0.3 + phase * 0.7,
					sx: 0.6 + phase * 0.4,
					sy: 0.6 + phase * 0.4,
				};
			});
		},
	},

	// 09 Drift — each letter slowly floats off its slot and back on long,
	// uncorrelated cycles: the word never quite holds still, dream-like.
	drift: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			glyphs(ctx, g, (i) => ({
				dx: Math.sin(e / (2600 + i * 300) + i * 2.4) * g.fontSize * 0.16,
				dy: Math.cos(e / (3100 + i * 260) + i * 1.7) * g.fontSize * 0.14,
				rot: Math.sin(e / (3600 + i * 200) + i) * 0.05,
			}));
		},
	},

	// 10 Mass — a heavy point (the cursor, or a roaming weight) drags nearby
	// letters downward; they sag under it with smoothed inertia and tilt along
	// the sag gradient, springing back up as it moves on.
	mass: {
		init: (env) => ({ sag: env.g.chars.map(() => 0) }),
		draw(ctx, env, e, s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const px = ptr.x ?? g.left + ((Math.sin(e / 1500) + 1) / 2) * g.totalW;
			glyphs(ctx, g, (i) => {
				const d = Math.abs(g.cxs[i] - px);
				const target = Math.max(0, 1 - d / (g.fontSize * 3)) * g.fontSize * 0.6;
				s.sag[i] += (target - s.sag[i]) * 0.1;
				const l = s.sag[i - 1] ?? s.sag[i],
					r = s.sag[i + 1] ?? s.sag[i];
				return { dy: s.sag[i], rot: (r - l) * 0.015 };
			});
		},
	},

	// 11 Field — every letter is a compass needle: it tilts to point toward
	// the cursor (or a circling pole), the whole word reorienting like iron
	// filings as the pole moves.
	field: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const px = ptr.x ?? g.left + g.totalW / 2 + Math.cos(e / 1200) * g.totalW * 0.55;
			const py = ptr.y ?? g.baselineY - g.ascent * 0.35 + Math.sin(e / 1200) * g.fontSize * 2;
			glyphs(ctx, g, (i) => {
				const gy = g.baselineY - g.ascent * 0.35;
				const ang = Math.atan2(py - gy, px - g.cxs[i]);
				const d = Math.hypot(px - g.cxs[i], py - gy);
				const strength = clamp(1 - d / (g.fontSize * 7), 0.25, 1);
				return {
					rot: Math.sin(ang) * 0.45 * strength,
					dx: Math.cos(ang) * 2 * strength,
				};
			});
		},
	},

	// 12 Residue — letters the cursor (or a slow ambient sweep) passes over
	// ignite blue and then cool very slowly, so the word visibly remembers
	// where it's been touched.
	residue: {
		init: (env) => ({ heat: env.g.chars.map(() => 0) }),
		draw(ctx, env, e, s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const sweepX = g.left + ((e / 2400) % 1) * g.totalW;
			for (let i = 0; i < g.chars.length; i++) {
				const gy = g.baselineY - g.ascent * 0.35;
				if (Math.abs(g.cxs[i] - sweepX) < g.fontSize * 0.5) s.heat[i] = Math.max(s.heat[i], 0.85);
				if (ptr.x != null && ptr.y != null) {
					if (Math.hypot(g.cxs[i] - ptr.x, gy - ptr.y) < g.fontSize * 1.1) s.heat[i] = 1;
				}
				s.heat[i] *= 0.994;
			}
			glyphs(ctx, g, (i) => {
				const t = s.heat[i];
				const rC = Math.round(250 - (250 - 147) * t);
				const gC = Math.round(250 - (250 - 197) * t);
				return {
					fill: `rgba(${rC},${gC},253,${0.45 + t * 0.55})`,
					glow: t * g.fontSize * 0.55,
				};
			});
		},
	},

	// 13 Paradox — the word has a mirrored reflection below it, but the
	// reflection moves by *predicted* motion (velocity extrapolated), sliding
	// ahead of the original instead of mirroring its present.
	paradox: {
		init: () => ({ lx: null as number | null, vx: 0 }),
		draw(ctx, env, e, s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			if (ptr.x != null && s.lx != null) s.vx = s.vx * 0.85 + (ptr.x - s.lx) * 0.15;
			s.lx = ptr.x;
			const v = ptr.x != null ? clamp(s.vx * 9, -g.fontSize * 1.4, g.fontSize * 1.4) : Math.cos(e / 700) * g.fontSize * 0.5;
			word(ctx, g, 0, 0, 1);
			const my = g.baselineY + g.descent + g.fontSize * 0.08;
			ctx.strokeStyle = 'rgba(255,255,255,0.14)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(g.left - g.fontSize * 0.5, my);
			ctx.lineTo(g.left + g.totalW + g.fontSize * 0.5, my);
			ctx.stroke();
			ctx.save();
			ctx.translate(0, my * 2);
			ctx.scale(1, -1);
			word(ctx, g, v, 0, 0.35, BLUE(0.95));
			ctx.restore();
		},
	},

	// 14 Drag — every letter spring-chases the same target with a different
	// stiffness, so the word elastically stretches apart, overshoots, and
	// snaps back together: friction and inertia made visible.
	drag: {
		init: (env) => ({
			x: env.g.chars.map(() => 0),
			v: env.g.chars.map(() => 0),
		}),
		draw(ctx, env, e, s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const center = g.left + g.totalW / 2;
			const target =
				ptr.x != null ? (ptr.x - center) * 0.4 : Math.sin(e / 900) * g.fontSize * 0.7;
			glyphs(ctx, g, (i) => {
				const k = 0.045 + (i / Math.max(1, g.chars.length - 1)) * 0.1;
				s.v[i] = (s.v[i] + (target - s.x[i]) * k) * 0.88;
				s.x[i] += s.v[i];
				return { dx: s.x[i], rot: s.v[i] * 0.01 };
			});
		},
	},

	// 15 Spectrum — the word's red, green, and blue channels separate and
	// oscillate independently, screen-blended so they fuse to white where
	// they overlap: literal chromatic aberration of the type.
	spectrum: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const amt =
				g.fontSize * 0.09 * (1 + Math.sin(e / 520)) + (ptr.x != null ? g.fontSize * 0.05 : 0);
			ctx.globalCompositeOperation = 'screen';
			glyphs(ctx, g, (i) => ({
				dx: -amt - Math.sin(e / 400 + i) * 1.6,
				fill: 'rgba(248,113,113,0.85)',
			}));
			glyphs(ctx, g, (i) => ({
				dy: amt * 0.6 + Math.cos(e / 460 + i) * 1.2,
				fill: 'rgba(74,222,128,0.85)',
			}));
			glyphs(ctx, g, (i) => ({
				dx: amt + Math.sin(e / 400 + i) * 1.6,
				fill: 'rgba(96,165,250,0.85)',
			}));
			ctx.globalCompositeOperation = 'source-over';
		},
	},

	// 16 Membrane — the word is a surface: waves spawned at the cursor (or
	// ambient touches) travel outward, and each letter lifts and glows as the
	// wavefront passes through it.
	membrane: {
		init: () => ({
			waves: [] as { x: number; y: number; t: number }[],
			lastAmbient: 0,
			lx: -9999,
			ly: -9999,
		}),
		draw(ctx, env, e, s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			if (ptr.x != null && ptr.y != null) {
				if (Math.hypot(ptr.x - s.lx, ptr.y - s.ly) > g.fontSize * 0.9) {
					s.waves.push({ x: ptr.x, y: ptr.y, t: e });
					s.lx = ptr.x;
					s.ly = ptr.y;
				}
			}
			if (e - s.lastAmbient > 1500) {
				s.lastAmbient = e;
				s.waves.push({
					x: g.left + Math.random() * g.totalW,
					y: g.baselineY - g.ascent * 0.35,
					t: e,
				});
			}
			s.waves = s.waves.filter((wv: any) => e - wv.t < 1400);
			glyphs(ctx, g, (i) => {
				let dy = 0,
					glow = 0;
				const gy = g.baselineY - g.ascent * 0.35;
				for (const wv of s.waves) {
					const age = e - wv.t;
					const rad = age * 0.12;
					const d = Math.abs(Math.hypot(g.cxs[i] - wv.x, gy - wv.y) - rad);
					const band = Math.max(0, 1 - d / (g.fontSize * 0.9));
					const fade = 1 - age / 1400;
					dy -= band * fade * g.fontSize * 0.32;
					glow += band * fade * g.fontSize * 0.45;
				}
				return { dy, glow: Math.min(g.fontSize * 0.6, glow) };
			});
		},
	},

	// 17 Twin — a second, blue copy of the word shadows the first, always
	// moving opposite to you (mirror-personality), blinking in and out like
	// something not quite stable.
	twin: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const center = g.left + g.totalW / 2;
			const off =
				ptr.x != null ? clamp((center - ptr.x) * 0.3, -g.fontSize * 1.6, g.fontSize * 1.6) : Math.sin(e / 1000) * g.fontSize * 0.6;
			const blink = Math.sin(e / 130) > -0.85 ? 1 : 0.15;
			word(ctx, g, off, -g.fontSize * 0.2, 0.4 * blink, BLUE(0.95));
			word(ctx, g, 0, 0, 1);
		},
	},

	// 18 Mirage — heat-haze: the word is drawn in thin horizontal slices, each
	// displaced by its own travelling sine, so the type shimmers like air over
	// hot ground while never actually moving.
	mirage: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const top = g.baselineY - g.ascent;
			const bottom = g.baselineY + g.descent;
			const strip = Math.max(2, Math.round(g.fontSize / 8));
			const amp = g.fontSize * 0.06 + (ptr.x != null ? g.fontSize * 0.05 : 0);
			for (let y = top; y < bottom; y += strip) {
				const dx = Math.sin(y / 5 + e / 240) * amp;
				ctx.save();
				ctx.beginPath();
				ctx.rect(0, y, w, strip);
				ctx.clip();
				word(ctx, g, dx, 0, 0.95);
				ctx.restore();
			}
		},
	},

	// 19 Morph — each letter squishes and stretches like soft clay, width and
	// height flowing on separate organic cycles while the word holds its line.
	morph: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			glyphs(ctx, g, (i) => ({
				sx: 1 + Math.sin(e / 620 + i * 1.9) * 0.18,
				sy: 1 + Math.cos(e / 540 + i * 1.3) * 0.18,
				dy: Math.sin(e / 800 + i) * g.fontSize * 0.05,
			}));
		},
	},

	// 20 Chrono — time runs at a different rate for each letter: the leftmost
	// bobs frantically, the rightmost in extreme slow motion — one word,
	// several clocks.
	chrono: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const n = Math.max(1, g.chars.length - 1);
			glyphs(ctx, g, (i) => {
				const speed = 0.15 + Math.pow(1 - i / n, 2) * 4;
				const t = e * speed;
				return {
					dy: Math.sin(t / 300) * g.fontSize * 0.14,
					alpha: 0.6 + (Math.sin(t / 300) * 0.5 + 0.5) * 0.4,
				};
			});
		},
	},

	// 21 Growth — the word grows: each letter sprouts up from the baseline in
	// sequence (a small blue stem rising first), overshoots, settles — then
	// the whole word dissolves and grows again.
	growth: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const cyc = e % 3800;
			glyphs(ctx, g, (i) => {
				const t0 = i * 150;
				const t = clamp((cyc - t0) / 450, 0, 1);
				const fade = cyc > 3200 ? clamp(1 - (cyc - 3200) / 600, 0, 1) : 1;
				if (t <= 0 || fade <= 0) return { alpha: 0 };
				const os = t < 1 ? 1 + Math.sin(t * Math.PI) * 0.22 : 1;
				return { sy: t * os, alpha: t * fade };
			});
			ctx.strokeStyle = BLUE(0.6);
			ctx.lineWidth = Math.max(1, g.fontSize * 0.045);
			for (let i = 0; i < g.chars.length; i++) {
				const t0 = i * 150;
				const st = clamp((cyc - t0 + 280) / 280, 0, 1);
				const t = clamp((cyc - t0) / 450, 0, 1);
				if (st <= 0 || t >= 1) continue;
				const y0 = g.baselineY + g.descent + g.fontSize * 0.12;
				ctx.globalAlpha = 1 - t;
				ctx.beginPath();
				ctx.moveTo(g.cxs[i], y0);
				ctx.lineTo(g.cxs[i], y0 - st * g.fontSize * 0.4);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
		},
	},

	// 22 Cadence — a beat travels through the word: each letter lifts, swells,
	// brightens and glows as the pulse reaches it, like an equalizer with no
	// sound.
	cadence: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			glyphs(ctx, g, (i) => {
				const p = Math.max(0, Math.sin(e / 320 - i * 0.7));
				return {
					dy: -p * g.fontSize * 0.22,
					sy: 1 + p * 0.15,
					alpha: 0.55 + p * 0.45,
					glow: p * g.fontSize * 0.4,
				};
			});
		},
	},

	// 23 Collapse — each letter flickers between two superposed positions (a
	// white state and a blue state), then settles left-to-right into a single
	// crisp outcome; hold; repeat.
	collapse: {
		draw(ctx, env, e) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const n = Math.max(1, g.chars.length);
			const cyc = e % 3200;
			glyphs(ctx, g, (i) => {
				const settleAt = 500 + (i / n) * 1600;
				if (cyc >= settleAt) return {};
				const flick = Math.sin(cyc / 45 + i * 7) > 0 ? 1 : -1;
				return { dx: flick * g.fontSize * 0.16, alpha: 0.5 };
			});
			glyphs(ctx, g, (i) => {
				const settleAt = 500 + (i / n) * 1600;
				if (cyc >= settleAt) return { alpha: 0 };
				const flick = Math.sin(cyc / 45 + i * 7) > 0 ? 1 : -1;
				return { dx: -flick * g.fontSize * 0.16, alpha: 0.3, fill: BLUE(0.95) };
			});
		},
	},

	// 24 Infinite — copies of the word recede toward a vanishing point above,
	// each smaller and fainter (depth fog), parallaxing sideways as you move:
	// the same text stretching into distance.
	infinite: {
		draw(ctx, env, e, _s, ptr) {
			const { g, w, h } = env;
			ctx.clearRect(0, 0, w, h);
			const center = g.left + g.totalW / 2;
			const par =
				ptr.x != null ? clamp((ptr.x - center) / g.totalW, -0.6, 0.6) : Math.sin(e / 2400) * 0.3;
			for (let k = 4; k >= 1; k--) {
				const sc = 1 / (1 + k * 0.32);
				ctx.save();
				ctx.translate(center + par * k * g.fontSize * 0.9, g.baselineY - k * g.fontSize * 0.5);
				ctx.scale(sc, sc);
				ctx.translate(-center, -g.baselineY);
				word(ctx, g, 0, 0, 0.45 / k, BLUE(0.9));
				ctx.restore();
			}
			word(ctx, g, 0, 0, 1);
		},
	},
};

// Mounts a sketch onto a canvas that overlays `textEl` (the real DOM text of
// the codename). The canvas is sized around the text with generous padding so
// effects can overflow the glyph box; while running, the DOM text is hidden
// and the canvas replica (same computed font/size/color) performs instead.
// Hover-gated by default (cards); `auto: true` runs continuously (full page).
export function mountExperimentPreview(
	canvas: HTMLCanvasElement,
	slug: string,
	codename: string,
	opts: { auto?: boolean; trigger?: HTMLElement | null; textEl: HTMLElement }
) {
	const renderer = RENDERERS[slug];
	const ctx = canvas.getContext('2d');
	if (!renderer || !ctx) return { destroy() {} };
	// Reduced motion: never swap the text out — the static word is the baseline.
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { destroy() {} };

	const textEl = opts.textEl;
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const pointer: PointerState = { x: null, y: null };
	let env: Env | null = null;
	let raf = 0,
		running = false,
		startT = 0,
		state: any = {};

	function layout(): boolean {
		const cs = getComputedStyle(textEl);
		const fontSize = parseFloat(cs.fontSize) || 16;
		const padX = Math.round(fontSize * 2);
		const padY = Math.round(fontSize * 2.2);
		canvas.style.left = `${-padX}px`;
		canvas.style.top = `${-padY}px`;
		canvas.style.width = `calc(100% + ${padX * 2}px)`;
		canvas.style.height = `calc(100% + ${padY * 2}px)`;
		const w = canvas.clientWidth,
			h = canvas.clientHeight;
		if (!w || !h) return false;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		const font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
		ctx!.font = font;
		const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0;
		const chars = [...codename];
		const widths = chars.map((c) => ctx!.measureText(c).width);
		const metrics = ctx!.measureText('Hg');
		const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
		const descent = metrics.fontBoundingBoxDescent || fontSize * 0.25;
		const lineH = textEl.clientHeight || fontSize * 1.25;
		const baselineY = padY + (lineH - (ascent + descent)) / 2 + ascent;
		const cxs: number[] = [];
		let x = padX;
		chars.forEach((_, i) => {
			cxs.push(x + widths[i] / 2);
			x += widths[i] + ls;
		});
		env = {
			w,
			h,
			g: {
				chars,
				widths,
				cxs,
				left: padX,
				totalW: x - ls - padX,
				baselineY,
				ascent,
				descent,
				fontSize,
				font,
				fill: cs.color || 'rgb(250,250,250)',
			},
		};
		return true;
	}

	function frame(t: number) {
		if (!running) return;
		if (!canvas.isConnected) {
			stop();
			return;
		}
		renderer.draw(ctx!, env!, t - startT, state, pointer);
		raf = requestAnimationFrame(frame);
	}
	function start() {
		if (running) return;
		if (!layout()) return;
		state = renderer.init ? renderer.init(env!) : {};
		textEl.style.visibility = 'hidden';
		running = true;
		startT = performance.now();
		raf = requestAnimationFrame(frame);
	}
	function stop() {
		running = false;
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		textEl.style.visibility = '';
		ctx!.clearRect(0, 0, canvas.width, canvas.height);
	}

	const target = opts.trigger ?? canvas.parentElement ?? canvas;
	const onMove = (e: PointerEvent) => {
		if (e.pointerType === 'touch') return;
		const rect = canvas.getBoundingClientRect();
		pointer.x = e.clientX - rect.left;
		pointer.y = e.clientY - rect.top;
	};
	const onPtrGone = () => {
		pointer.x = null;
		pointer.y = null;
	};
	target.addEventListener('pointermove', onMove, { passive: true });
	target.addEventListener('pointerleave', onPtrGone, { passive: true });

	let resizeT = 0;
	const onResize = () => {
		clearTimeout(resizeT);
		resizeT = window.setTimeout(() => {
			if (running) {
				stop();
				start();
			}
		}, 160);
	};
	window.addEventListener('resize', onResize);

	const isTouch = matchMedia('(pointer: coarse)').matches;
	const onEnter = () => start();
	const onLeave = () => stop();
	if (opts.auto) {
		// Wait for the real webfont so the canvas replica measures/matches it.
		if (document.fonts?.ready) document.fonts.ready.then(() => start());
		else start();
	} else if (!isTouch) {
		target.addEventListener('pointerenter', onEnter);
		target.addEventListener('pointerleave', onLeave);
	}

	return {
		destroy() {
			stop();
			target.removeEventListener('pointermove', onMove);
			target.removeEventListener('pointerleave', onPtrGone);
			target.removeEventListener('pointerenter', onEnter);
			target.removeEventListener('pointerleave', onLeave);
			window.removeEventListener('resize', onResize);
		},
	};
}
