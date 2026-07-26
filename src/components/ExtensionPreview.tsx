/**
 * EXTENSION PREVIEWS
 * -------------------------------------------------------------------------
 * Each extension's effect, running for real on a canvas, on a loop. Not a
 * recording — the same maths the extension uses, driven by one clock.
 *
 * The loop tells a small story rather than just toggling: a browser window,
 * a search typed into it letter by letter, results landing, and then the
 * effect arriving on top of the page you were just looking at.
 *
 * The page underneath is a search-results layout because that is where anyone
 * actually installs one of these and clicks it for the first time. It is
 * drawn from scratch and deliberately unbranded — a search engine's shape,
 * not any particular company's marks.
 */

import React, { useEffect, useRef } from 'react';

export type PreviewKind = 'one-sun' | 'typeset' | 'by-hand';

const W = 560;
const H = 315;
const LOOP = 11000;

// Beats, in ms. The effect lands on a page that was built in front of you.
const TYPE_A = 300, TYPE_B = 1750;   // the query being typed
const RES_A = 1900, RES_B = 2700;    // results landing
const ON_A = 3100, ON_B = 4500;      // the effect arriving
const OFF_A = 9400, OFF_B = 10200;   // and lifting

const QUERY = 'why does a page feel flat';

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

// ---- the page ------------------------------------------------------------

const CHROME_H = 26;
const PAGE_Y = CHROME_H;

type Rect = { x: number; y: number; w: number; h: number; depth: number; kind: string; text?: string };

const RESULTS = [
	{ url: 'designnotes.example / depth', title: 'Why flat interfaces read as flat', snip: 2 },
	{ url: 'typeworks.example / measure', title: 'Light, shadow, and the illusion of paper', snip: 2 },
	{ url: 'archive.example / drawing', title: 'Everything on screen was drawn by someone', snip: 1 },
];

/** Every box the effects can address. Depth stands in for DOM nesting. */
function layout(): Rect[] {
	const r: Rect[] = [];
	r.push({ x: 0, y: PAGE_Y, w: W, h: 44, depth: 1, kind: 'header' });
	r.push({ x: 108, y: PAGE_Y + 12, w: 268, h: 22, depth: 3, kind: 'searchbar' });
	r.push({ x: 22, y: PAGE_Y + 17, w: 66, h: 14, depth: 3, kind: 'logo' });
	r.push({ x: 108, y: PAGE_Y + 48, w: 150, h: 12, depth: 2, kind: 'tabs' });
	r.push({ x: 108, y: PAGE_Y + 70, w: 120, h: 8, depth: 2, kind: 'meta' });

	let y = PAGE_Y + 90;
	RESULTS.forEach((res, i) => {
		r.push({ x: 108, y, w: 250, h: 10, depth: 4, kind: 'url', text: res.url });
		r.push({ x: 108, y: y + 14, w: 250, h: 15, depth: 4, kind: 'title', text: res.title });
		for (let s = 0; s < res.snip; s++) {
			r.push({ x: 108, y: y + 34 + s * 11, w: s === res.snip - 1 ? 190 : 250, h: 6, depth: 5, kind: 'snip' });
		}
		y += 34 + res.snip * 11 + 16;
	});

	r.push({ x: 388, y: PAGE_Y + 90, w: 150, h: 96, depth: 3, kind: 'card' });
	r.push({ x: 388, y: PAGE_Y + 196, w: 150, h: 52, depth: 3, kind: 'card2' });
	return r;
}

const RECTS = layout();

// ---- palettes ------------------------------------------------------------

const LIGHT = {
	paper: '#ffffff',
	ink: '#1f1f1f',
	sub: '#5f6368',
	link: '#1a4fbb',
	url: '#3a7d4f',
	line: '#e3e6ea',
	chrome: '#dfe3e8',
};

export default function ExtensionPreview({ kind, atMs }: { kind: PreviewKind; atMs?: number }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const cv = canvasRef.current;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(devicePixelRatio || 1, 2);
		cv.width = W * dpr;
		cv.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const pinned = typeof atMs === 'number';
		let raf = 0;
		let started = 0;

		function frame(now: number) {
			if (!started) started = now;
			draw(ctx!, kind, (now - started) % LOOP);
			raf = requestAnimationFrame(frame);
		}

		const io = new IntersectionObserver(
			([e]) => {
				if (pinned || mq.matches) return;
				if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
				if (!e.isIntersecting && raf) {
					cancelAnimationFrame(raf);
					raf = 0;
				}
			},
			{ threshold: 0.05 }
		);
		io.observe(cv);

		if (pinned) draw(ctx, kind, atMs! % LOOP);
		else if (mq.matches) draw(ctx, kind, 6000); // one settled frame
		else raf = requestAnimationFrame(frame);

		return () => {
			io.disconnect();
			if (raf) cancelAnimationFrame(raf);
		};
	}, [kind, atMs]);

	return (
		<canvas
			ref={canvasRef}
			className="block aspect-video w-full"
			role="img"
			aria-label={LABELS[kind]}
			style={{ background: '#07080a' }}
		/>
	);
}

const LABELS: Record<PreviewKind, string> = {
	'one-sun':
		'A search is typed into a browser, results appear, and then every element on the page lifts and casts a long shadow that swings as the light moves.',
	typeset:
		'A search is typed into a browser, results appear, and then the page is re-set in a different typeface as a wave passes down it.',
	'by-hand':
		'A search is typed into a browser, results appear, and then the whole page is redrawn in pen strokes on paper, box by box.',
};

// ---------------------------------------------------------------------------

function draw(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number) {
	ctx.clearRect(0, 0, W, H);
	const typed = ramp(t, TYPE_A, TYPE_B);
	const results = easeOut(ramp(t, RES_A, RES_B));
	const on = ramp(t, ON_A, ON_B) * (1 - ramp(t, OFF_A, OFF_B));

	if (kind === 'one-sun') drawSun(ctx, t, on, typed, results);
	else if (kind === 'typeset') drawTypeset(ctx, t, on, typed, results);
	else drawByHand(ctx, t, on, typed, results);

	drawChrome(ctx, typed);
	drawMotes(ctx, kind, t, on);
}

/** Browser furniture. Sells "this is your actual browser" more than the page does. */
function drawChrome(ctx: CanvasRenderingContext2D, typed: number) {
	ctx.fillStyle = LIGHT.chrome;
	ctx.fillRect(0, 0, W, CHROME_H);
	ctx.fillStyle = '#c3c8cf';
	[0, 1, 2].forEach((i) => {
		ctx.beginPath();
		ctx.arc(14 + i * 11, 13, 3.4, 0, Math.PI * 2);
		ctx.fill();
	});
	// the address pill, filling in as the search is typed
	ctx.fillStyle = '#f5f7f9';
	roundRect(ctx, 56, 5.5, W - 112, 15, 7.5);
	ctx.fill();
	ctx.fillStyle = '#8b9098';
	ctx.font = '8px ui-monospace, monospace';
	const shown = QUERY.slice(0, Math.round(QUERY.length * typed));
	ctx.fillText(typed < 1 ? 'search.example' : `search.example/?q=${shown.replace(/ /g, '+')}`, 66, 15.5);
	// the extension's own button, lit once it has been clicked
	ctx.fillStyle = 'rgba(96,165,250,0.9)';
	roundRect(ctx, W - 46, 6, 14, 14, 3.5);
	ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/**
 * The search page. `fonts` lets Typeset swap faces mid-page; `flat` strips
 * the colour so By Hand can draw over bare structure.
 */
function paintSearch(
	ctx: CanvasRenderingContext2D,
	opts: {
		typed: number;
		results: number;
		headFont?: (r: Rect) => string;
		bodyFont?: (r: Rect) => string;
		leading?: (r: Rect) => number;
		/** Skip the background fill — the caller has already laid down paper,
		 *  and in One Sun's case a set of shadows it would otherwise erase. */
		noBg?: boolean;
	}
) {
	const head = opts.headFont || (() => 'system-ui, "Segoe UI", sans-serif');
	const body = opts.bodyFont || (() => 'system-ui, "Segoe UI", sans-serif');

	if (!opts.noBg) {
		ctx.fillStyle = LIGHT.paper;
		ctx.fillRect(0, PAGE_Y, W, H - PAGE_Y);
	}

	// header rule
	ctx.fillStyle = LIGHT.line;
	ctx.fillRect(0, PAGE_Y + 43, W, 1);

	// the mark — a shape, not anyone's logo
	const lg = RECTS.find((r) => r.kind === 'logo')!;
	const dots = ['#4b7bec', '#e8564a', '#f2b53c', '#3fa96a'];
	dots.forEach((c, i) => {
		ctx.fillStyle = c;
		ctx.beginPath();
		ctx.arc(lg.x + 5 + i * 11, lg.y + 7, 4.2, 0, Math.PI * 2);
		ctx.fill();
	});

	// search field, with the query appearing letter by letter
	const sb = RECTS.find((r) => r.kind === 'searchbar')!;
	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#d6dae0';
	ctx.lineWidth = 1;
	roundRect(ctx, sb.x, sb.y, sb.w, sb.h, sb.h / 2);
	ctx.fill();
	ctx.stroke();
	const shown = QUERY.slice(0, Math.round(QUERY.length * opts.typed));
	ctx.fillStyle = LIGHT.ink;
	ctx.font = `11px ${body(sb)}`;
	ctx.fillText(shown, sb.x + 12, sb.y + 15);
	if (opts.typed < 1 && Math.floor(Date.now() / 400) % 2 === 0) {
		const wq = ctx.measureText(shown).width;
		ctx.fillRect(sb.x + 13 + wq, sb.y + 5, 1, 12);
	}
	// magnifier
	ctx.strokeStyle = '#9aa0a6';
	ctx.lineWidth = 1.3;
	ctx.beginPath();
	ctx.arc(sb.x + sb.w - 15, sb.y + 10, 3.6, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(sb.x + sb.w - 12.4, sb.y + 12.6);
	ctx.lineTo(sb.x + sb.w - 10, sb.y + 15);
	ctx.stroke();

	if (opts.results <= 0.01) return;
	ctx.save();
	ctx.globalAlpha = opts.results;

	// tabs
	const tabs = ['All', 'Images', 'News', 'Videos'];
	ctx.font = `9px ${body(RECTS[3])}`;
	let tx = 108;
	tabs.forEach((tb, i) => {
		ctx.fillStyle = i === 0 ? LIGHT.link : LIGHT.sub;
		ctx.fillText(tb, tx, PAGE_Y + 57);
		if (i === 0) ctx.fillRect(tx, PAGE_Y + 61, ctx.measureText(tb).width, 1.5);
		tx += ctx.measureText(tb).width + 14;
	});

	ctx.fillStyle = LIGHT.sub;
	ctx.font = `8px ${body(RECTS[4])}`;
	ctx.fillText('About 1,240,000 results (0.38 seconds)', 108, PAGE_Y + 77);

	// results, each sliding up a little as it lands
	for (const r of RECTS) {
		const rise = (1 - opts.results) * 10;
		if (r.kind === 'url') {
			ctx.fillStyle = LIGHT.url;
			ctx.font = `8.5px ${body(r)}`;
			ctx.fillText(r.text!, r.x, r.y + 8 + rise);
		} else if (r.kind === 'title') {
			ctx.fillStyle = LIGHT.link;
			ctx.font = `${opts.leading ? 13 : 13}px ${head(r)}`;
			ctx.fillText(r.text!, r.x, r.y + 12 + rise);
		} else if (r.kind === 'snip') {
			ctx.fillStyle = '#cfd4da';
			ctx.fillRect(r.x, r.y + rise + (opts.leading ? opts.leading(r) : 0), r.w, r.h);
		} else if (r.kind === 'card' || r.kind === 'card2') {
			ctx.fillStyle = '#ffffff';
			ctx.strokeStyle = LIGHT.line;
			ctx.lineWidth = 1;
			roundRect(ctx, r.x, r.y + rise, r.w, r.h, 6);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#e9edf1';
			ctx.fillRect(r.x + 10, r.y + rise + 10, r.w - 20, r.kind === 'card' ? 34 : 12);
			ctx.fillStyle = '#d3d9df';
			ctx.fillRect(r.x + 10, r.y + rise + (r.kind === 'card' ? 52 : 28), r.w - 40, 6);
			ctx.fillRect(r.x + 10, r.y + rise + (r.kind === 'card' ? 64 : 38), r.w - 26, 6);
		}
	}
	ctx.restore();
}

// ---- One Sun ---------------------------------------------------------------

function drawSun(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number) {
	const a = (t / LOOP) * Math.PI * 2;
	const sx = W * 0.5 + Math.cos(a * 1.6 - 1.1) * W * 0.46;
	const sy = 6 + Math.sin(a * 1.2) * 30;
	const sink = clamp01((t - 6200) / 3000); // the light lowers as the loop runs on
	const warmR = 255, warmG = Math.round(216 - sink * 46), warmB = Math.round(158 - sink * 74);

	ctx.fillStyle = LIGHT.paper;
	ctx.fillRect(0, PAGE_Y, W, H - PAGE_Y);

	const dx = W / 2 - sx;
	const dy = H / 2 - sy;
	const l = Math.hypot(dx, dy) || 1;
	const stretch = 1 + sink * 1.9;
	const ux = (dx / l) * stretch * on;
	const uy = (dy / l) * stretch * on;

	if (on > 0.01 && results > 0.2) {
		// Shadows first, so they sit under the page. Skewed, not just offset —
		// a projected shadow leans away from the light.
		for (const r of RECTS) {
			if (r.kind === 'snip' || r.kind === 'tabs' || r.kind === 'meta') continue;
			const h = r.depth * 5.6;
			ctx.save();
			ctx.filter = `blur(${(1.4 + r.depth * 0.9).toFixed(1)}px)`;
			ctx.fillStyle = `rgba(52, 38, 24, ${(0.34 * on).toFixed(3)})`;
			ctx.beginPath();
			ctx.moveTo(r.x, r.y + r.h);
			ctx.lineTo(r.x + r.w, r.y + r.h);
			ctx.lineTo(r.x + r.w + ux * h, r.y + r.h + uy * h);
			ctx.lineTo(r.x + ux * h, r.y + r.h + uy * h);
			ctx.closePath();
			ctx.fill();
			ctx.fillRect(r.x + ux * h * 0.5, r.y + uy * h * 0.5, r.w, r.h);
			ctx.restore();
		}
		// glyph-shaped shadows under the result titles
		ctx.save();
		ctx.filter = 'blur(1.2px)';
		ctx.fillStyle = `rgba(52, 38, 24, ${(0.45 * on).toFixed(3)})`;
		for (const r of RECTS) {
			if (r.kind !== 'title') continue;
			const h = r.depth * 5.6;
			ctx.font = '13px system-ui, "Segoe UI", sans-serif';
			ctx.fillText(r.text!, r.x + ux * h, r.y + 12 + uy * h);
		}
		ctx.restore();
	}

	paintSearch(ctx, { typed, results, noBg: true });

	if (on > 0.01) {
		// shafts of light, thrown from wherever the sun is
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 9; i++) {
			const ang = Math.atan2(H / 2 - sy, W / 2 - sx) + (i - 4) * 0.13 + Math.sin(t / 2600 + i) * 0.02;
			const len = W * 1.2;
			const wdt = 8 + hash(i, 4) * 16;
			const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
			g.addColorStop(0, `rgba(${warmR}, ${warmG}, ${warmB}, ${(0.11 * on).toFixed(3)})`);
			g.addColorStop(1, `rgba(${warmR}, ${warmG}, ${warmB}, 0)`);
			ctx.fillStyle = g;
			ctx.save();
			ctx.translate(sx, sy);
			ctx.rotate(ang);
			ctx.beginPath();
			ctx.moveTo(0, -2);
			ctx.lineTo(len, -wdt);
			ctx.lineTo(len, wdt);
			ctx.lineTo(0, 2);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		ctx.restore();

		// the light pooling where it lands
		const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.85);
		g.addColorStop(0, `rgba(${warmR}, ${warmG}, ${warmB}, ${(0.34 * on).toFixed(3)})`);
		g.addColorStop(0.45, `rgba(${warmR}, ${warmG}, ${warmB}, ${(0.08 * on).toFixed(3)})`);
		g.addColorStop(1, 'rgba(255,200,150,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, PAGE_Y, W, H - PAGE_Y);
	}
	drawCursor(ctx, sx, Math.max(PAGE_Y + 2, sy + 34));
}

// ---- Typeset ---------------------------------------------------------------

function drawTypeset(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number) {
	const sweep = easeOut(ramp(t, ON_A, ON_B + 900));
	const band = PAGE_Y + sweep * (H - PAGE_Y + 70) - 35;
	const done = (r: Rect) => on > 0.02 && r.y + r.h < band;

	paintSearch(ctx, {
		typed,
		results,
		headFont: (r) => (done(r) ? '"Iowan Old Style", Palatino, Georgia, serif' : 'system-ui, "Segoe UI", sans-serif'),
		bodyFont: (r) => (done(r) ? 'Charter, Cambria, Georgia, serif' : 'system-ui, "Segoe UI", sans-serif'),
		leading: (r) => (done(r) ? 2.5 : 0),
	});

	if (on > 0.02 && band > PAGE_Y - 30 && band < H + 30) {
		// the wave itself, and a shimmer of loose letters riding its edge
		const g = ctx.createLinearGradient(0, band - 46, 0, band);
		g.addColorStop(0, 'rgba(233,167,60,0)');
		g.addColorStop(1, 'rgba(233,167,60,0.2)');
		ctx.fillStyle = g;
		ctx.fillRect(0, band - 46, W, 46);
		ctx.fillStyle = 'rgba(233,167,60,0.9)';
		ctx.fillRect(0, band, W, 1.4);

		ctx.save();
		ctx.font = '9px "Iowan Old Style", Palatino, Georgia, serif';
		for (let i = 0; i < 12; i++) {
			const x = ((i * 71 + Math.floor(t / 40)) % W);
			const dy2 = Math.sin(t / 300 + i) * 5;
			ctx.fillStyle = `rgba(255,236,200,${(0.5 + 0.4 * hash(i, 2)).toFixed(2)})`;
			ctx.fillText('aegQ&¶'[i % 6], x, band - 6 + dy2);
		}
		ctx.restore();
	}
}

// ---- By Hand ---------------------------------------------------------------

function drawByHand(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number) {
	if (on < 0.02) {
		paintSearch(ctx, { typed, results });
		return;
	}

	// paper
	ctx.fillStyle = '#fbfaf7';
	ctx.fillRect(0, PAGE_Y, W, H - PAGE_Y);

	const order = [...RECTS].sort((a, b) => a.y - b.y || a.x - b.x);
	const per = 1 / (order.length + 2);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	let nib: { x: number; y: number } | null = null;

	order.forEach((r, i) => {
		const local = clamp01((on - i * per * 0.85) / (per * 2.6));
		if (local <= 0) return;

		if (r.kind === 'snip' || r.kind === 'meta' || r.kind === 'tabs') {
			// ruled lines, drawn left to right
			ctx.strokeStyle = `rgba(60,58,55,${(0.45 * local).toFixed(2)})`;
			ctx.lineWidth = 1.1;
			const p = wobble(ctx, r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2, i, local);
			if (local < 1) nib = p;
			return;
		}

		const segs: [number, number, number, number][] = [
			[r.x, r.y, r.x + r.w, r.y],
			[r.x + r.w, r.y, r.x + r.w, r.y + r.h],
			[r.x + r.w, r.y + r.h, r.x, r.y + r.h],
			[r.x, r.y + r.h, r.x, r.y],
		];
		ctx.strokeStyle = `rgba(60,58,55,${(0.55 * local).toFixed(2)})`;
		ctx.lineWidth = 1.2;
		for (let s = 0; s < 4; s++) {
			const sl = clamp01((local - s / 4) * 4);
			if (sl <= 0) continue;
			const p = wobble(ctx, segs[s][0], segs[s][1], segs[s][2], segs[s][3], i * 4 + s, sl);
			if (sl < 1) nib = p;
			// ink pools where the hand pauses at a corner
			if (sl >= 1) {
				ctx.fillStyle = `rgba(60,58,55,${(0.22 * local).toFixed(2)})`;
				ctx.beginPath();
				ctx.arc(segs[s][2], segs[s][3], 1.3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		if (r.text) {
			ctx.fillStyle = `rgba(60,58,55,${(0.9 * local).toFixed(2)})`;
			ctx.font =
				r.kind === 'title'
					? '13px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
					: '8.5px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
			ctx.fillText(r.text, r.x + 2, r.y + (r.kind === 'title' ? 12 : 8));
		}
		if (r.kind === 'title' && local > 0.7) {
			// underline it, the way people underline
			ctx.strokeStyle = `rgba(60,58,55,${(0.5 * local).toFixed(2)})`;
			wobble(ctx, r.x, r.y + r.h + 2, r.x + r.w * 0.8, r.y + r.h + 2, i + 400, (local - 0.7) / 0.3);
		}
	});

	// the query, in the same hand
	ctx.fillStyle = 'rgba(60,58,55,0.9)';
	ctx.font = '11px "Segoe Print", "Bradley Hand", cursive';
	ctx.fillText(QUERY.slice(0, Math.round(QUERY.length * typed)), 120, PAGE_Y + 27);

	// grain
	ctx.save();
	ctx.globalAlpha = 0.05;
	for (let i = 0; i < 240; i++) {
		ctx.fillStyle = '#2a2724';
		ctx.fillRect(hash(i, 9) * W, PAGE_Y + hash(i, 10) * (H - PAGE_Y), 1, 1);
	}
	ctx.restore();

	// the nib, visible wherever the hand currently is
	if (nib) {
		const n = nib as { x: number; y: number };
		ctx.fillStyle = 'rgba(40,38,36,0.9)';
		ctx.beginPath();
		ctx.arc(n.x, n.y, 1.9, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = 'rgba(40,38,36,0.5)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(n.x, n.y);
		ctx.lineTo(n.x + 7, n.y - 11);
		ctx.stroke();
	}
}

function wobble(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	seed: number,
	prog: number
) {
	const len = Math.hypot(x2 - x1, y2 - y1);
	const steps = Math.max(4, Math.round(len / 10));
	const nx = -(y2 - y1) / (len || 1);
	const ny = (x2 - x1) / (len || 1);
	const upto = Math.max(1, Math.round(steps * prog));
	let last = { x: x1, y: y1 };
	ctx.beginPath();
	for (let i = 0; i <= upto; i++) {
		const tt = i / steps;
		const off = (hash(seed * 31 + i, 2) - 0.5) * 2.2;
		const px = x1 + (x2 - x1) * tt + nx * off;
		const py = y1 + (y2 - y1) * tt + ny * off;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
		last = { x: px, y: py };
	}
	ctx.stroke();
	return last;
}

// ---- cursor + motes --------------------------------------------------------

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(0, 15);
	ctx.lineTo(4, 11.5);
	ctx.lineTo(6.5, 17);
	ctx.lineTo(9, 16);
	ctx.lineTo(6.5, 10.6);
	ctx.lineTo(11.5, 10.5);
	ctx.closePath();
	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = 'rgba(20,20,24,0.85)';
	ctx.lineWidth = 1.1;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function cursorAt(kind: PreviewKind, t: number) {
	const a = (t / LOOP) * Math.PI * 2;
	if (kind === 'one-sun') {
		return { x: W * 0.5 + Math.cos(a * 1.6 - 1.1) * W * 0.46, y: 6 + Math.sin(a * 1.2) * 30 + 34 };
	}
	return { x: W * 0.5 + Math.cos(a * 0.9) * W * 0.32, y: H * 0.55 + Math.sin(a * 1.4) * H * 0.28 };
}

/** Each effect's own species, drifting in from an edge and taken by the cursor. */
function drawMotes(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number, on: number) {
	if (on < 0.05) return;
	const c = cursorAt(kind, t);
	for (let i = 0; i < 9; i++) {
		const cycle = 2400 + hash(i, 1) * 3800;
		const phase = ((t + hash(i, 2) * 11000) % cycle) / cycle;
		if (phase > 0.95) continue;
		const edge = Math.floor(hash(i, 3) * 4);
		const along = hash(i, 4);
		const s =
			edge === 0 ? { x: along * W, y: -8 } :
			edge === 1 ? { x: W + 8, y: along * H } :
			edge === 2 ? { x: along * W, y: H + 8 } :
			{ x: -8, y: along * H };
		const e = 1 - Math.pow(1 - phase, 2.5);
		const dx = c.x - s.x;
		const dy = c.y - s.y;
		const nl = Math.hypot(-dy, dx) || 1;
		const swing = Math.sin(phase * Math.PI) * (hash(i, 5) - 0.5) * 140;
		const x = s.x + dx * e + (-dy / nl) * swing;
		const y = s.y + dy * e + (dx / nl) * swing;
		const near = Math.hypot(c.x - x, c.y - y);
		const merge = near < 20 ? 1 - near / 20 : 0;
		const a = (Math.sin(phase * Math.PI) * 0.9 + 0.1) * on;

		ctx.save();
		if (kind === 'typeset') {
			ctx.font = `${9 + hash(i, 6) * 9 + merge * 8}px "Iowan Old Style", Palatino, Georgia, serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(2)})`;
			ctx.shadowBlur = 12;
			ctx.fillStyle = `rgba(120,86,30,${a.toFixed(2)})`;
			ctx.fillText('aegQ&¶§'[i % 7], x, y);
		} else if (kind === 'by-hand') {
			ctx.translate(x, y);
			ctx.rotate(phase * 7 + i);
			ctx.strokeStyle = `rgba(60,58,55,${a.toFixed(2)})`;
			ctx.lineWidth = 1.3;
			ctx.lineCap = 'round';
			const L = 4 + hash(i, 7) * 6 + merge * 7;
			ctx.beginPath();
			ctx.moveTo(-L / 2, 0);
			ctx.lineTo(L / 2, 0);
			ctx.stroke();
		} else {
			const r = (1 + hash(i, 8) * 1.7) * (1 + merge * 3.4);
			const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
			g.addColorStop(0, `rgba(255,232,178,${(a * 0.95).toFixed(2)})`);
			g.addColorStop(0.35, `rgba(255,206,128,${(a * 0.3).toFixed(2)})`);
			g.addColorStop(1, 'rgba(255,206,128,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r * 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(255,250,235,${(a * 0.9).toFixed(2)})`;
			ctx.beginPath();
			ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}
	if (kind !== 'one-sun') drawCursor(ctx, c.x, c.y);
}
