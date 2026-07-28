/**
 * TOOL BUTTONS
 * -------------------------------------------------------------------------
 * The seven things on /microtools — three calculators, four extensions — as
 * small buttons that each carry a live mark rather than an icon.
 *
 * Each mark is its own page's full preview boiled down to one gesture at
 * 64 px: concrete rises and resets, a surge bar overshoots its limit, air
 * crosses a duct, swatches walk a hue ramp, a paragraph re-sets itself, a
 * box gets drawn by hand. Idle they move slowly; pointing at one (or tabbing
 * to it) leans on the gesture rather than starting a different animation, so
 * the button never shows you something the page behind it doesn't.
 *
 * All six share a single requestAnimationFrame loop. Six independent loops
 * on one page is six wake-ups a frame for what is, in total, about forty
 * shapes — so the ticker below is module-level and every mark subscribes.
 */

import React, { useEffect, useRef } from 'react';

export type MarkKind =
	| 'concrete'
	| 'electrical'
	| 'hvac'
	| 'colourway'
	| 'typeset'
	| 'by-hand'
	| 'cold-read'
	| 'depth'
	| 'cutout'
	| 'prompt'
	| 'rmbg';

/** Authoring size. Displayed around 40 px, so the bitmap is oversampled. */
const S = 64;

// ---- shared ticker --------------------------------------------------------

type Sub = (now: number) => void;
const subs = new Set<Sub>();
let rafId = 0;

function tick(now: number) {
	for (const f of subs) f(now);
	rafId = subs.size ? requestAnimationFrame(tick) : 0;
}

function subscribe(f: Sub) {
	subs.add(f);
	if (!rafId) rafId = requestAnimationFrame(tick);
	return () => {
		subs.delete(f);
		if (!subs.size && rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
	};
}

// ---- maths ----------------------------------------------------------------

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
	const x = clamp01(t);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
	ctx.beginPath();
	ctx.moveTo(x + k, y);
	ctx.arcTo(x + w, y, x + w, y + h, k);
	ctx.arcTo(x + w, y + h, x, y + h, k);
	ctx.arcTo(x, y + h, x, y, k);
	ctx.arcTo(x, y, x + w, y, k);
	ctx.closePath();
}

// ---- palette --------------------------------------------------------------
// `e` is the hover/focus energy, 0 to 1. Marks brighten with it rather than
// changing colour, so nothing on the page suddenly gains a hue on hover.

const ink = (e: number, a = 1) => `rgba(${170 + 70 * e},${176 + 70 * e},${186 + 65 * e},${a})`;
const dim = (e: number, a = 1) => `rgba(${104 + 60 * e},${110 + 60 * e},${120 + 58 * e},${a})`;
const WARN = '#f2b53c';
const ACCENT = '#8ba6ff';

// ---- marks ----------------------------------------------------------------

/** Concrete — a slab filling, then resetting to pour again. */
function markConcrete(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const x = 8, y = 17, w = 48, h = 31;
	const cycle = ((t / (4200 - 1500 * e)) % 1 + 1) % 1;
	// Fills over the first 70% of the cycle, holds, then resets.
	const fill = easeInOut(clamp01(cycle / 0.7));

	ctx.save();
	rr(ctx, x, y, w, h, 3);
	ctx.clip();
	const top = y + h - h * fill;
	ctx.fillStyle = ink(e, 0.26);
	ctx.fillRect(x, top, w, h);
	// A wet surface never sits flat.
	ctx.beginPath();
	ctx.moveTo(x, top + 2);
	for (let i = 0; i <= w; i += 4) {
		ctx.lineTo(x + i, top + Math.sin(i * 0.22 + t * 0.004) * 1.3);
	}
	ctx.lineTo(x + w, y + h);
	ctx.lineTo(x, y + h);
	ctx.closePath();
	ctx.fillStyle = ink(e, 0.3);
	ctx.fill();
	// Aggregate, revealed as the level passes it.
	for (let i = 0; i < 9; i++) {
		const px = x + 5 + hash(i, 1) * (w - 10);
		const py = y + 5 + hash(i, 2) * (h - 9);
		if (py < top) continue;
		ctx.fillStyle = ink(e, 0.5);
		ctx.beginPath();
		ctx.arc(px, py, 0.8 + hash(i, 3) * 0.7, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();

	rr(ctx, x, y, w, h, 3);
	ctx.strokeStyle = ink(e, 0.85);
	ctx.lineWidth = 1.6;
	ctx.stroke();
}

/** Electrical — a steady running bar, and a peak that overshoots the limit. */
function markElectrical(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const base = 51;
	const limit = 22;
	const cycle = ((t / (3200 - 900 * e)) % 1 + 1) % 1;
	// The surge is brief on purpose — that is the point being made.
	const surge = cycle < 0.22 ? Math.sin((cycle / 0.22) * Math.PI) : 0;

	ctx.strokeStyle = dim(e, 0.9);
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(6, base);
	ctx.lineTo(58, base);
	ctx.stroke();

	// Running.
	const rh = 17;
	ctx.fillStyle = ink(e, 0.22);
	ctx.fillRect(14, base - rh, 12, rh);
	ctx.strokeStyle = ink(e, 0.6);
	ctx.lineWidth = 1;
	ctx.strokeRect(14.5, base - rh + 0.5, 11, rh - 1);

	// Peak, which climbs past the dashed rating while it starts.
	const ph = rh + surge * 20;
	const over = base - ph < limit;
	ctx.fillStyle = over ? 'rgba(242,181,60,0.3)' : ink(e, 0.28);
	ctx.fillRect(38, base - ph, 12, ph);
	ctx.strokeStyle = over ? WARN : ink(e, 0.65);
	ctx.lineWidth = 1;
	ctx.strokeRect(38.5, base - ph + 0.5, 11, ph - 1);

	ctx.save();
	ctx.setLineDash([3, 3]);
	ctx.strokeStyle = over ? 'rgba(242,181,60,0.9)' : dim(e, 0.8);
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(6, limit);
	ctx.lineTo(58, limit);
	ctx.stroke();
	ctx.restore();
}

/** HVAC — air crossing a duct seen in section. */
function markHvac(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const cx = 32, cy = 32, r = 22;

	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.strokeStyle = ink(e, 0.85);
	ctx.lineWidth = 1.6;
	ctx.stroke();

	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
	ctx.clip();
	// Four lanes, faster in the middle — the same parabolic profile the duct
	// preview draws, at a twentieth of the size.
	for (let i = 0; i < 4; i++) {
		const lane = (i + 0.5) / 4;
		const y = cy - r + lane * r * 2;
		const prof = 1 - Math.pow((lane - 0.5) * 2, 2) * 0.75;
		const speed = (0.028 + 0.03 * e) * prof;
		const ph = ((t * speed * 0.01 + hash(i, 5)) % 1 + 1) % 1;
		const len = 10 + prof * 12;
		const px = -len + ph * (64 + len);
		const g = ctx.createLinearGradient(px - len, 0, px, 0);
		g.addColorStop(0, 'rgba(139,166,255,0)');
		g.addColorStop(1, `rgba(139,166,255,${0.35 + 0.5 * prof * (0.6 + 0.4 * e)})`);
		ctx.strokeStyle = g;
		ctx.lineWidth = 1 + prof * 1.4;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(px - len, y);
		ctx.lineTo(px, y);
		ctx.stroke();
	}
	ctx.restore();
}

/** Colourway — swatches walking a hue ramp, lightness held. */
function markColourway(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const n = 4;
	const w = 11, gap = 3.5;
	const total = n * w + (n - 1) * gap;
	const x0 = (S - total) / 2;
	const rot = (t * (0.012 + 0.014 * e)) % 360;
	for (let i = 0; i < n; i++) {
		const x = x0 + i * (w + gap);
		// Lightness is the axis that stays put; only hue travels. That is the
		// entire claim the extension makes, in four rectangles.
		const hue = (rot + i * 52) % 360;
		const light = 34 + i * 13;
		rr(ctx, x, 18, w, 28, 2.5);
		ctx.fillStyle = `hsl(${hue} ${46 + 18 * e}% ${light}%)`;
		ctx.fill();
		ctx.strokeStyle = `hsla(${hue} 50% ${light + 22}% / ${0.5 + 0.4 * e})`;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

/** Typeset — a paragraph re-setting its measure and leading. */
function markTypeset(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const cycle = ((t / (4600 - 1600 * e)) % 1 + 1) % 1;
	// Eases between a cramped setting and a corrected one, then back.
	const k = easeInOut(cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2);
	const lead = 7 + k * 3.2;
	const measure = 44 - k * 9;
	const top = 32 - lead * 1.5;

	// The heading stays put; only the body re-sets under it.
	ctx.fillStyle = ink(e, 0.9);
	rr(ctx, 12, 13, 26 + k * 6, 3.2, 1.6);
	ctx.fill();

	for (let i = 0; i < 4; i++) {
		const last = i === 3;
		const wdt = (last ? measure * 0.62 : measure) - (i % 2) * 3;
		ctx.fillStyle = ink(e, 0.34 + 0.1 * k);
		rr(ctx, 12, top + 10 + i * lead, wdt, 2.4, 1.2);
		ctx.fill();
	}
}

/** By Hand — a box drawn, wobbled, wiped, drawn again. */
function markByHand(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const period = 4200 - 1400 * e;
	const cycle = ((t / period) % 1 + 1) % 1;
	const seed = Math.floor(t / period);
	// Draws over the first 65%, holds, then lifts.
	const draw = easeOut(clamp01(cycle / 0.65));
	const fade = cycle > 0.86 ? 1 - (cycle - 0.86) / 0.14 : 1;

	const x = 13, y = 18, w = 38, h = 29;
	// Perimeter walked as one path, with a hand's tremor on it.
	const pts: [number, number][] = [];
	const per = 2 * (w + h);
	const steps = 68;
	for (let i = 0; i <= steps; i++) {
		const d = (i / steps) * per;
		let px: number, py: number;
		if (d < w) [px, py] = [x + d, y];
		else if (d < w + h) [px, py] = [x + w, y + (d - w)];
		else if (d < 2 * w + h) [px, py] = [x + w - (d - w - h), y + h];
		else [px, py] = [x, y + h - (d - 2 * w - h)];
		const j = 0.9 + 0.5 * e;
		pts.push([px + (hash(i, seed) - 0.5) * j, py + (hash(i, seed + 9) - 0.5) * j]);
	}

	const upto = Math.max(2, Math.floor(pts.length * draw));
	ctx.strokeStyle = ink(e, 0.9 * fade);
	ctx.lineWidth = 1.7;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(pts[0][0], pts[0][1]);
	for (let i = 1; i < upto; i++) ctx.lineTo(pts[i][0], pts[i][1]);
	ctx.stroke();

	// Nobody draws a rectangle right the first time, so the top edge gets a
	// second pass once the first lap is round.
	if (draw > 0.75) {
		const second = clamp01((draw - 0.75) / 0.25);
		ctx.strokeStyle = ink(e, 0.42 * fade);
		ctx.lineWidth = 1.3;
		ctx.beginPath();
		for (let i = 0; i <= Math.floor(steps * 0.28 * second); i++) {
			const d = (i / steps) * per;
			const px = x + d + (hash(i, seed + 21) - 0.5) * 1.5;
			const py = y + 1.6 + (hash(i, seed + 33) - 0.5) * 1.4;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.stroke();
	}
}

/** Cold Read — lines of text, one of them getting marked. */
function markColdRead(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const x = 13, w = 38;
	const rows = [0, 1, 2, 3];
	const cycle = ((t / (4400 - 1500 * e)) % 1 + 1) % 1;
	// The mark wipes across the third line, holds, then clears — the trail
	// arriving, which is what the extension actually leaves behind.
	const wipe = easeInOut(clamp01(cycle / 0.45));
	const gone = cycle > 0.82 ? (cycle - 0.82) / 0.18 : 0;

	for (const i of rows) {
		const y = 18 + i * 9;
		const last = i === 3;
		const lw = last ? w * 0.55 : w - (i % 2) * 5;

		if (i === 2 && wipe > 0.01) {
			ctx.fillStyle = `rgba(233,167,60,${(0.3 * (1 - gone)).toFixed(3)})`;
			ctx.fillRect(x - 2, y - 3.5, (lw + 4) * wipe, 8);
			ctx.fillStyle = `rgba(233,167,60,${(0.95 * (1 - gone)).toFixed(3)})`;
			ctx.fillRect(x - 2, y + 4, (lw + 4) * wipe, 1.4);
		}

		ctx.fillStyle = i === 2 ? ink(e, 0.8) : ink(e, 0.34);
		rr(ctx, x, y - 1.2, lw, 2.4, 1.2);
		ctx.fill();
	}

	// The rail tick, out at the right edge, where the real one lives.
	ctx.fillStyle = `rgba(233,167,60,${(0.85 * wipe * (1 - gone)).toFixed(3)})`;
	ctx.beginPath();
	ctx.arc(56, 36, 2.2, 0, Math.PI * 2);
	ctx.fill();
}

/** Depth & Parallax — three planes at different distances, drifting apart. */
function markDepth(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const sway = Math.sin(t * (0.0009 + 0.0011 * e));
	// Each plane moves by its own depth, which is the whole effect in one line.
	const planes = [
		{ y: 40, w: 44, h: 9, d: 1.0, a: 0.5 },
		{ y: 29, w: 34, h: 8, d: 0.55, a: 0.34 },
		{ y: 19, w: 24, h: 7, d: 0.22, a: 0.22 },
	];
	for (const p of planes) {
		const x = 32 - p.w / 2 + sway * 7 * p.d;
		rr(ctx, x, p.y, p.w, p.h, 2);
		ctx.fillStyle = ink(e, p.a);
		ctx.fill();
		ctx.strokeStyle = ink(e, p.a + 0.28);
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

/** Click-to-Cutout — a shape, a selection running round it, a click point. */
function markCutout(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const cx = 30, cy = 33, r = 15;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fillStyle = ink(e, 0.2);
	ctx.fill();

	// Marching ants. Offsetting the dash is what makes a selection read as live.
	ctx.save();
	ctx.setLineDash([4, 3]);
	ctx.lineDashOffset = -(t * (0.012 + 0.02 * e)) % 7;
	ctx.strokeStyle = ink(e, 0.95);
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();

	// The point that made it, pulsing.
	const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
	ctx.beginPath();
	ctx.arc(44, 22, 3.2, 0, Math.PI * 2);
	ctx.fillStyle = ACCENT;
	ctx.fill();
	ctx.beginPath();
	ctx.arc(44, 22, 3.2 + pulse * (4 + 3 * e), 0, Math.PI * 2);
	ctx.strokeStyle = `rgba(139,166,255,${(0.5 * (1 - pulse)).toFixed(3)})`;
	ctx.lineWidth = 1.2;
	ctx.stroke();
}

/** Image to Prompt — a picture on the left, words arriving on the right. */
function markPrompt(ctx: CanvasRenderingContext2D, t: number, e: number) {
	rr(ctx, 9, 20, 20, 20, 3);
	ctx.fillStyle = ink(e, 0.18);
	ctx.fill();
	ctx.strokeStyle = ink(e, 0.7);
	ctx.lineWidth = 1.2;
	ctx.stroke();
	// A horizon and a sun, so the square reads as a picture and not a box.
	ctx.beginPath();
	ctx.moveTo(11, 35);
	ctx.lineTo(17, 29);
	ctx.lineTo(23, 35);
	ctx.strokeStyle = ink(e, 0.55);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(23.5, 26, 2, 0, Math.PI * 2);
	ctx.fillStyle = ink(e, 0.5);
	ctx.fill();

	// Lines typing themselves out, one after another, then starting over.
	const cycle = ((t / (3800 - 1200 * e)) % 1 + 1) % 1;
	const widths = [22, 17, 20];
	for (let i = 0; i < 3; i++) {
		const local = clamp01((cycle - i * 0.16) / 0.3);
		if (local <= 0) continue;
		ctx.fillStyle = ink(e, 0.42);
		rr(ctx, 35, 22.5 + i * 7, widths[i] * easeOut(local), 2.4, 1.2);
		ctx.fill();
	}
}

/** Background Remover — the backdrop wiping away to chequerboard. */
function markRmbg(ctx: CanvasRenderingContext2D, t: number, e: number) {
	const x = 9, y = 15, w = 46, h = 34;
	const cycle = ((t / (4200 - 1400 * e)) % 1 + 1) % 1;
	const wipe = easeInOut(clamp01(cycle / 0.55));

	ctx.save();
	rr(ctx, x, y, w, h, 3);
	ctx.clip();

	// Backdrop on the left, transparency chequer revealed from the right.
	ctx.fillStyle = ink(e, 0.16);
	ctx.fillRect(x, y, w, h);
	const edge = x + w - w * wipe;
	for (let gy = y; gy < y + h; gy += 5) {
		for (let gx = x; gx < x + w; gx += 5) {
			if (gx < edge) continue;
			const on = ((gx / 5) | 0) % 2 === ((gy / 5) | 0) % 2;
			ctx.fillStyle = on ? ink(e, 0.1) : 'rgba(0,0,0,0)';
			ctx.fillRect(gx, gy, 5, 5);
		}
	}
	// The subject, which the wipe never touches — that is the point.
	ctx.beginPath();
	ctx.arc(32, 27, 7, 0, Math.PI * 2);
	ctx.fillStyle = ink(e, 0.72);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(20, 49);
	ctx.quadraticCurveTo(32, 33, 44, 49);
	ctx.fillStyle = ink(e, 0.72);
	ctx.fill();
	ctx.restore();

	rr(ctx, x, y, w, h, 3);
	ctx.strokeStyle = ink(e, 0.55);
	ctx.lineWidth = 1.2;
	ctx.stroke();
}

const MARKS: Record<MarkKind, (c: CanvasRenderingContext2D, t: number, e: number) => void> = {
	concrete: markConcrete,
	electrical: markElectrical,
	hvac: markHvac,
	colourway: markColourway,
	typeset: markTypeset,
	'by-hand': markByHand,
	'cold-read': markColdRead,
	depth: markDepth,
	cutout: markCutout,
	prompt: markPrompt,
	rmbg: markRmbg,
};

/** The frame each mark is worth holding when motion is switched off. */
const STILL: Record<MarkKind, number> = {
	concrete: 2600,
	electrical: 400,
	hvac: 1200,
	colourway: 0,
	typeset: 2300,
	'by-hand': 2600,
	'cold-read': 2000,
	depth: 900,
	cutout: 0,
	prompt: 2200,
	rmbg: 2400,
};

// ---- component ------------------------------------------------------------

export default function ToolButton({
	kind,
	name,
	sub,
	href,
	cta = 'Open it',
}: {
	kind: MarkKind;
	name: string;
	sub: string;
	href: string;
	cta?: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// Hover lives in a ref, not state — this changes every frame, and a
	// re-render per frame for six buttons is exactly what to avoid here.
	const want = useRef(0);
	const energy = useRef(0);

	useEffect(() => {
		const cv = canvasRef.current;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(devicePixelRatio || 1, 2);
		cv.width = Math.round(S * dpr);
		cv.height = Math.round(S * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const draw = MARKS[kind];
		const paint = (t: number, e: number) => {
			ctx.clearRect(0, 0, S, S);
			draw(ctx, t, e);
		};

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		if (mq.matches) {
			paint(STILL[kind], 0);
			return;
		}

		let unsub: (() => void) | null = null;
		const frame = (now: number) => {
			// Energy chases the pointer rather than snapping, so leaving a
			// button settles instead of cutting.
			energy.current += (want.current - energy.current) * 0.12;
			paint(now, energy.current);
		};

		// Off-screen buttons leave the shared ticker entirely.
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !unsub) unsub = subscribe(frame);
				else if (!entry.isIntersecting && unsub) {
					unsub();
					unsub = null;
				}
			},
			{ threshold: 0.01 }
		);
		io.observe(cv);

		return () => {
			io.disconnect();
			if (unsub) unsub();
		};
	}, [kind]);

	const on = () => {
		want.current = 1;
	};
	const off = () => {
		want.current = 0;
	};

	return (
		<a
			href={href}
			className="tool-btn"
			onPointerEnter={on}
			onPointerLeave={off}
			onFocus={on}
			onBlur={off}
		>
			<canvas ref={canvasRef} className="tool-btn__mark" aria-hidden="true" />
			<div>
				<p className="tool-btn__name">{name}</p>
				<p className="tool-btn__sub">{sub}</p>
				<p className="tool-btn__go">
					{cta}
					<span aria-hidden="true">&rarr;</span>
				</p>
			</div>
		</a>
	);
}
