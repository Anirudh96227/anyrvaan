/**
 * EXTENSION PREVIEWS
 * -------------------------------------------------------------------------
 * Each extension's effect, running for real on a canvas, on a loop. Not a
 * recording — the same maths the extension uses, driven by one clock.
 *
 * The loop tells a small story rather than just toggling: a browser window,
 * a search typed into it letter by letter, results landing, and then the
 * effect arriving on the page you just watched get built. Each extension
 * searches for something to do with its own subject.
 *
 * The page underneath is a dark-mode search-results layout, because that is
 * where anyone actually installs one of these and clicks it for the first
 * time — and because an effect about light reads for more against a dark
 * page than a white one.
 */

import React, { useEffect, useRef } from 'react';

export type PreviewKind = 'colourway' | 'typeset' | 'by-hand';

const W = 560;
const H = 315;
const LOOP = 11000;

const TYPE_A = 300, TYPE_B = 1750;   // the query being typed
const RES_A = 1900, RES_B = 2700;    // results landing
const ON_A = 3100, ON_B = 4500;      // the effect arriving
const OFF_A = 9400, OFF_B = 10200;   // and lifting

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

// ---- what each one is looking up -----------------------------------------

type Result = { site: string; url: string; title: string; snip: string[]; dot: string };

const PAGES: Record<PreviewKind, { query: string; results: Result[] }> = {
	'colourway': {
		query: 'dark mode that does not wreck the colours',
		results: [
			{
				site: 'Colour Notes', url: 'https://colournotes.example › oklch › mapping', dot: '#4b7bec',
				title: 'Why inverting a page ruins it, and what to do instead',
				snip: ['In HSL, fifty per cent lightness means something different for', 'yellow than for blue. In OKLCH it does not.'],
			},
			{
				site: 'Contrast', url: 'https://contrast.example › apca › dark', dot: '#e8564a',
				title: 'APCA, and why the old ratio misjudges dark backgrounds',
				snip: ['A pair that passes the 2.1 ratio can still be unreadable when', 'the background is dark.'],
			},
			{
				site: 'Schemes', url: 'https://schemes.example › complementary', dot: '#f2b53c',
				title: 'A scheme is a relationship, not a single colour',
				snip: ['Tint the neutrals. Leave the colours their own hue.'],
			},
		],
	},
	typeset: {
		query: 'best font pairing for long reading',
		results: [
			{
				site: 'Type Works', url: 'https://typeworks.example › pairing › reading', dot: '#4b7bec',
				title: 'Pairing a display face with something you can read',
				snip: ['The two faces should disagree about one thing and agree', 'about everything else.'],
			},
			{
				site: 'Measure', url: 'https://measure.example › line-length', dot: '#3fa96a',
				title: 'Sixty-six characters, and why the number keeps coming back',
				snip: ['Past about seventy the eye starts losing its place on the', 'return sweep.'],
			},
			{
				site: 'Practical Typography', url: 'https://practicaltype.example › leading', dot: '#e8564a',
				title: 'Line height is set by the face, not by the rule',
				snip: ['A tall x-height wants more leading than the same size in a', 'face with a small one.'],
			},
		],
	},
	'by-hand': {
		query: 'why does handwriting look human',
		results: [
			{
				site: 'Drawing Notes', url: 'https://drawingnotes.example › line › tremor', dot: '#f2b53c',
				title: 'Nobody draws a straight line, and that is the point',
				snip: ['The wobble is not error. It is the record of a hand that had', 'to make decisions on the way.'],
			},
			{
				site: 'Letterform', url: 'https://letterform.example › script › hand', dot: '#4b7bec',
				title: 'Why a font of your handwriting still looks like a font',
				snip: ['Every a is identical. That is the only tell anyone needs.'],
			},
			{
				site: 'Sketching', url: 'https://sketching.example › ink › pressure', dot: '#3fa96a',
				title: 'Pressure, speed, and the weight of a pen stroke',
				snip: ['A line drawn quickly is thin at both ends and heavy through', 'the middle.'],
			},
		],
	},
};

// ---- layout --------------------------------------------------------------

const CHROME_H = 30;
const PAGE_Y = CHROME_H;

type Rect = { x: number; y: number; w: number; h: number; depth: number; kind: string; text?: string };

/** Every box the effects can address. Depth stands in for DOM nesting. */
function layout(): Rect[] {
	const r: Rect[] = [];
	r.push({ x: 0, y: PAGE_Y, w: W, h: 46, depth: 1, kind: 'header' });
	r.push({ x: 22, y: PAGE_Y + 14, w: 62, h: 18, depth: 3, kind: 'logo' });
	r.push({ x: 100, y: PAGE_Y + 11, w: 300, h: 24, depth: 3, kind: 'searchbar' });
	r.push({ x: 100, y: PAGE_Y + 54, w: 190, h: 12, depth: 2, kind: 'tabs' });

	let y = PAGE_Y + 84;
	for (let i = 0; i < 3; i++) {
		r.push({ x: 100, y, w: 24, h: 24, depth: 4, kind: 'favicon' });
		r.push({ x: 132, y: y + 1, w: 240, h: 9, depth: 4, kind: 'site' });
		r.push({ x: 132, y: y + 13, w: 240, h: 8, depth: 4, kind: 'url' });
		r.push({ x: 100, y: y + 30, w: 340, h: 16, depth: 4, kind: 'title' });
		r.push({ x: 100, y: y + 52, w: 350, h: 9, depth: 5, kind: 'snip0' });
		r.push({ x: 100, y: y + 64, w: 300, h: 9, depth: 5, kind: 'snip1' });
		y += 92;
	}
	return r;
}

const RECTS = layout();

// Google's dark surface, near enough that it reads as the real thing.
const D = {
	bg: '#202124',
	chrome: '#35373b',
	chromeTab: '#202124',
	pill: '#303134',
	pillEdge: '#5f6368',
	ink: '#e8eaed',
	sub: '#bdc1c6',
	link: '#99c3ff',
	line: '#3c4043',
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
		else if (mq.matches) draw(ctx, kind, 6000);
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
	'colourway':
		'A search is typed into a browser, results appear, and then the whole page is re-coloured into a different scheme as the new palette spreads out from the cursor.',
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

	if (kind === 'colourway') drawColourway(ctx, t, on, typed, results, kind);
	else if (kind === 'typeset') drawTypeset(ctx, t, on, typed, results, kind);
	else drawByHand(ctx, t, on, typed, results, kind);

	drawChrome(ctx, kind, typed, on);
	drawMotes(ctx, kind, t, on);
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

/** Browser furniture: a tab strip and an address bar, dark like the rest. */
function drawChrome(ctx: CanvasRenderingContext2D, kind: PreviewKind, typed: number, on: number) {
	const q = PAGES[kind].query;
	ctx.fillStyle = D.chrome;
	ctx.fillRect(0, 0, W, CHROME_H);

	// active tab
	ctx.fillStyle = D.chromeTab;
	roundRect(ctx, 8, 3, 132, CHROME_H - 3, 7);
	ctx.fill();
	ctx.fillStyle = '#8ab4f8';
	ctx.beginPath();
	ctx.arc(20, 15, 4, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = D.sub;
	ctx.font = '8px system-ui, "Segoe UI", sans-serif';
	const shown = q.slice(0, Math.round(q.length * typed));
	ctx.fillText((typed < 1 ? 'New tab' : shown).slice(0, 20), 30, 18);

	// address pill
	ctx.fillStyle = '#292a2d';
	roundRect(ctx, 150, 6, W - 210, 18, 9);
	ctx.fill();
	ctx.fillStyle = '#9aa0a6';
	ctx.font = '7.5px ui-monospace, monospace';
	ctx.fillText(
		typed < 1 ? 'google.com' : `google.com/search?q=${shown.replace(/ /g, '+')}`.slice(0, 58),
		160,
		18.5
	);

	// the extension's button, lit once it has been used
	ctx.fillStyle = on > 0.02 ? 'rgba(138,180,248,0.95)' : 'rgba(138,180,248,0.35)';
	roundRect(ctx, W - 48, 8, 15, 15, 4);
	ctx.fill();
	if (on > 0.02) {
		ctx.strokeStyle = 'rgba(138,180,248,0.5)';
		ctx.lineWidth = 1;
		roundRect(ctx, W - 51, 5, 21, 21, 6);
		ctx.stroke();
	}
}

/**
 * The results page. `headFont`/`bodyFont` let Typeset swap faces mid-page;
 * `noBg` lets One Sun lay down shadows before the page is painted over them.
 */
function paintSearch(
	ctx: CanvasRenderingContext2D,
	kind: PreviewKind,
	opts: {
		typed: number;
		results: number;
		headFont?: (r: Rect) => string;
		bodyFont?: (r: Rect) => string;
		leading?: (r: Rect) => number;
		noBg?: boolean;
	}
) {
	const page = PAGES[kind];
	const head = opts.headFont || (() => 'system-ui, "Segoe UI", Arial, sans-serif');
	const body = opts.bodyFont || (() => 'system-ui, "Segoe UI", Arial, sans-serif');
	const P = { ...D, ...(opts.palette || {}) };

	if (!opts.noBg) {
		ctx.fillStyle = P.bg;
		ctx.fillRect(0, PAGE_Y, W, H - PAGE_Y);
	}

	// wordmark
	const lg = RECTS.find((r) => r.kind === 'logo')!;
	ctx.font = '400 21px "Product Sans", system-ui, Arial, sans-serif';
	const letters = 'Google'.split('');
	const cols = ['#4285f4', '#ea4335', '#fbbc05', '#4285f4', '#34a853', '#ea4335'];
	let lx = lg.x;
	letters.forEach((ch, i) => {
		ctx.fillStyle = cols[i];
		ctx.fillText(ch, lx, lg.y + 15);
		lx += ctx.measureText(ch).width;
	});

	// search pill
	const sb = RECTS.find((r) => r.kind === 'searchbar')!;
	ctx.fillStyle = D.pill;
	roundRect(ctx, sb.x, sb.y, sb.w, sb.h, sb.h / 2);
	ctx.fill();
	const shown = page.query.slice(0, Math.round(page.query.length * opts.typed));
	ctx.fillStyle = P.ink;
	ctx.font = `11.5px ${body(sb)}`;
	ctx.fillText(shown, sb.x + 16, sb.y + 16);
	if (opts.typed < 1 && Math.floor(Date.now() / 400) % 2 === 0) {
		ctx.fillStyle = '#8ab4f8';
		ctx.fillRect(sb.x + 17 + ctx.measureText(shown).width, sb.y + 5, 1.2, 14);
	}
	// clear · mic · lens · search, as on the real thing
	ctx.strokeStyle = P.sub;
	ctx.lineWidth = 1.2;
	const icx = sb.x + sb.w - 62;
	ctx.beginPath();
	ctx.moveTo(icx - 4, sb.y + 8); ctx.lineTo(icx + 4, sb.y + 16);
	ctx.moveTo(icx + 4, sb.y + 8); ctx.lineTo(icx - 4, sb.y + 16);
	ctx.stroke();
	ctx.fillStyle = '#8ab4f8';
	roundRect(ctx, icx + 16, sb.y + 7, 5, 10, 2.5);
	ctx.fill();
	ctx.strokeStyle = '#8ab4f8';
	ctx.strokeRect(icx + 34, sb.y + 8, 9, 9);
	ctx.beginPath();
	ctx.arc(icx + 57, sb.y + 11, 4, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(icx + 60, sb.y + 14); ctx.lineTo(icx + 63, sb.y + 17);
	ctx.stroke();

	// apps grid + avatar
	ctx.fillStyle = P.sub;
	for (let a = 0; a < 9; a++) {
		ctx.beginPath();
		ctx.arc(W - 62 + (a % 3) * 5, PAGE_Y + 18 + Math.floor(a / 3) * 5, 1.1, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = '#e8a33c';
	ctx.beginPath();
	ctx.arc(W - 34, PAGE_Y + 23, 8, 0, Math.PI * 2);
	ctx.fill();

	if (opts.results <= 0.01) return;
	ctx.save();
	ctx.globalAlpha = opts.results;
	const rise = (1 - opts.results) * 10;

	// tabs
	const tabs = ['All', 'Images', 'Videos', 'News', 'Web'];
	ctx.font = `9px ${body(RECTS[3])}`;
	let tx = 100;
	tabs.forEach((tb, i) => {
		ctx.fillStyle = i === 0 ? '#8ab4f8' : P.sub;
		ctx.fillText(tb, tx, PAGE_Y + 62 + rise);
		if (i === 0) {
			ctx.fillRect(tx - 2, PAGE_Y + 68 + rise, ctx.measureText(tb).width + 4, 2);
		}
		tx += ctx.measureText(tb).width + 16;
	});
	ctx.fillStyle = P.line;
	ctx.fillRect(0, PAGE_Y + 70 + rise, W, 1);

	// results
	page.results.forEach((res, i) => {
		const fav = RECTS.filter((r) => r.kind === 'favicon')[i];
		const site = RECTS.filter((r) => r.kind === 'site')[i];
		const url = RECTS.filter((r) => r.kind === 'url')[i];
		const title = RECTS.filter((r) => r.kind === 'title')[i];
		const s0 = RECTS.filter((r) => r.kind === 'snip0')[i];
		const s1 = RECTS.filter((r) => r.kind === 'snip1')[i];
		const lead = opts.leading ? opts.leading(s0) : 0;

		ctx.fillStyle = res.dot;
		ctx.beginPath();
		ctx.arc(fav.x + 12, fav.y + 12 + rise, 11, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		ctx.font = `bold 10px ${body(fav)}`;
		ctx.fillText(res.site[0], fav.x + 8.5, fav.y + 16 + rise);

		ctx.fillStyle = P.ink;
		ctx.font = `9px ${body(site)}`;
		ctx.fillText(res.site, site.x, site.y + 8 + rise);
		ctx.fillStyle = P.sub;
		ctx.font = `8px ${body(url)}`;
		ctx.fillText(res.url, url.x, url.y + 7 + rise);

		ctx.fillStyle = P.link;
		ctx.font = `14px ${head(title)}`;
		ctx.fillText(res.title, title.x, title.y + 12 + rise);

		ctx.fillStyle = P.sub;
		ctx.font = `9px ${body(s0)}`;
		ctx.fillText(res.snip[0], s0.x, s0.y + 8 + rise + lead);
		if (res.snip[1]) ctx.fillText(res.snip[1], s1.x, s1.y + 8 + rise + lead * 2);
	});
	ctx.restore();
}

// ---- One Sun ---------------------------------------------------------------

function drawColourway(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number, kind: PreviewKind = 'colourway') {
	// The same maths the extension uses, cut down to what a preview needs:
	// the page's own lightness axis mapped onto the scheme's, neutrals taking
	// the scheme's hue, and colours keeping theirs.
	const THEME = { groundL: 0.19, groundC: 0.055, groundH: 275, inkL: 0.94, accentH: 75 };
	const pageG = 0.248; // the dark page's own ground lightness
	const pageI = 0.936; // and its text

	const remap = (hex: string) => {
		const [r, g, b] = hexToRgb(hex);
		const { L, C, H } = rgbToOklch(r, g, b);
		const n = Math.max(-0.2, Math.min(1.2, (L - pageG) / (pageI - pageG)));
		const outL = THEME.groundL + n * (THEME.inkL - THEME.groundL);
		const neutral = 1 - Math.min(1, C / 0.045);
		const outC = C * (1 - neutral) + (THEME.groundC + n * (0.02 - THEME.groundC)) * neutral;
		const outH = neutral > 0.5 ? THEME.groundH : H;
		return rgbToCss(oklchToRgb(outL, outC, outH));
	};

	// Everything gets its new colour at once; the arrival is sold by the wash.
	const P = on > 0.5;
	paintSearch(ctx, kind, {
		typed,
		results,
		palette: P
			? {
					bg: remap(D.bg),
					ink: remap(D.ink),
					sub: remap(D.sub),
					link: remap(D.link),
					line: remap(D.line),
			  }
			: undefined,
	});

	// the wash: the new palette spreading out from the cursor
	if (on > 0.02 && on < 1) {
		const c = cursorAt('colourway', t);
		const p = ramp(on, 0.02, 1);
		const max = Math.hypot(W, H);
		const r = p * max * 1.05;
		const soft = Math.max(28, r * 0.32);
		const accent = rgbToCss(oklchToRgb(0.62, 0.16, THEME.accentH));
		const ground = rgbToCss(oklchToRgb(THEME.groundL, THEME.groundC, THEME.groundH));
		const g = ctx.createRadialGradient(c.x, c.y, Math.max(0, r - soft), c.x, c.y, r);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(0.6, accent);
		g.addColorStop(1, ground);
		ctx.save();
		ctx.globalAlpha = 0.85 * (1 - Math.pow(p, 2.4));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	// the readout the extension actually shows
	if (on > 0.6) {
		const a2 = ramp(on, 0.6, 0.85);
		ctx.save();
		ctx.globalAlpha = a2;
		ctx.fillStyle = 'rgba(10,12,30,0.92)';
		ctx.fillRect(14, H - 52, 208, 38);
		ctx.strokeStyle = 'rgba(190,180,255,0.35)';
		ctx.lineWidth = 1;
		ctx.strokeRect(14.5, H - 51.5, 207, 37);
		ctx.fillStyle = rgbToCss(oklchToRgb(0.75, 0.15, THEME.accentH));
		ctx.font = '8px ui-monospace, monospace';
		ctx.fillText('Indigo — complementary, amber accent', 22, H - 38);
		ctx.fillStyle = 'rgba(225,228,245,0.85)';
		ctx.fillText('34 colours remapped', 22, H - 28);
		ctx.fillText('25 pairs repaired to APCA Lc 60', 22, H - 19);
		ctx.restore();
	}
}

// --- the colour maths, shared with the extension -------------------------

function hexToRgb(h: string): [number, number, number] {
	const s = h.replace('#', '');
	return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
const rgbToCss = ([r, g, b]: number[]) => `rgb(${r}, ${g}, ${b})`;
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function rgbToOklch(r: number, g: number, b: number) {
	const R = toLin(r / 255), G = toLin(g / 255), B = toLin(b / 255);
	const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
	const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
	const s2 = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2;
	const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2;
	return { L, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180) / Math.PI };
}

function oklchToRgb(L: number, C: number, H: number): number[] {
	const h = (H * Math.PI) / 180;
	const A = Math.cos(h) * C, B = Math.sin(h) * C;
	const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
	const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
	const s_ = L - 0.0894841775 * A - 1.291485548 * B;
	const l = l_ ** 3, m = m_ ** 3, s2 = s_ ** 3;
	const cl = (v: number) => Math.max(0, Math.min(255, Math.round(toSrgb(v) * 255)));
	return [
		cl(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2),
		cl(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2),
		cl(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s2),
	];
}

// ---- Typeset ---------------------------------------------------------------

function drawTypeset(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number, kind: PreviewKind = 'typeset') {
	const sweep = easeOut(ramp(t, ON_A, ON_B + 900));
	const band = PAGE_Y + sweep * (H - PAGE_Y + 70) - 35;
	const done = (r: Rect) => on > 0.02 && r.y + r.h < band;

	paintSearch(ctx, kind, {
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

function drawByHand(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number, kind: PreviewKind = 'by-hand') {
	if (on < 0.02) {
		paintSearch(ctx, kind, { typed, results });
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
	ctx.fillText(PAGES[kind].query.slice(0, Math.round(PAGES[kind].query.length * typed)), 120, PAGE_Y + 27);

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
	if (kind === 'colourway') {
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
	if (kind !== 'colourway') drawCursor(ctx, c.x, c.y);
}
