/**
 * EXTENSION PREVIEWS
 * -------------------------------------------------------------------------
 * Each extension's effect, running for real on a canvas, on a loop. Not a
 * recording — the same maths the extension uses, driven by one clock.
 *
 * The loop tells a small story rather than just toggling: a browser window, a
 * search typed into it, results springing in, and then the effect arriving on
 * the page you just watched get built. It then holds still for four seconds,
 * because the held frame is the thing worth looking at, and lifts.
 *
 * The page underneath is deliberately NOT a replica of anyone's search engine.
 * A near-miss copy of a familiar interface reads as a cheap imitation of it —
 * the wrong wordmark, the wrong grey. So it is a clean, neutral results page
 * set in Space Grotesk, the same face as the rest of the site, which also
 * gives an effect that moves type or colour something honest to move.
 *
 * Authored at 1120×630 and displayed around 900, so hairlines stay hairlines
 * and text has enough pixels to hold an edge.
 */

import React, { useEffect, useRef } from 'react';

export type PreviewKind = 'colourway' | 'typeset' | 'by-hand' | 'cold-read';

const W = 1120;
const H = 630;
const LOOP = 11000;

/** The window sits inset, with room around it for its own shadow. */
const WIN = { x: 48, y: 34, w: 1024, h: 562, r: 14 };
const CHROME_H = 58;
const PAGE = { x: WIN.x, y: WIN.y + CHROME_H, w: WIN.w, h: WIN.h - CHROME_H };
const GUT = 56;

// Beats. The setup is brisk, the payoff is long: 1.2s typing, 0.7s of results
// landing, 1.8s for the effect to arrive, then 4.2s of holding still.
const TYPE_A = 260, TYPE_B = 1500;
const RES_A = 1560, RES_B = 2260;
const ON_A = 2560, ON_B = 4360;
const OFF_A = 8600, OFF_B = 9520;

const UI = '"Space Grotesk", ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
	const x = clamp01(t);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * A damped harmonic oscillator, sampled at `t` seconds — the same solver
 * Remotion's spring() uses, ported so the previews move in the same
 * vocabulary as the films without pulling in Remotion to do it.
 */
function spring(t: number, stiffness = 170, damping = 22, mass = 1) {
	if (t <= 0) return 0;
	const w0 = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	if (zeta < 1) {
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
	}
	return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
}

const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

// ---- a clean dark interface ----------------------------------------------
// Every token is a hex string so Colourway can put all of them through the
// same remap. Alpha is applied separately, never baked into the colour.

const D = {
	void: '#0a0b0d',
	chrome: '#1b1d21',
	bg: '#131518',
	pill: '#1f2227',
	ink: '#eef0f3',
	sub: '#9aa2ac',
	faint: '#6d757f',
	link: '#9db8ff',
	line: '#25282d',
	accent: '#8ba6ff',
};

// ---- what each one is looking up -----------------------------------------

type Result = { site: string; url: string; title: string; snip: string[]; dot: string };

const PAGES: Record<PreviewKind, { query: string; results: Result[] }> = {
	colourway: {
		query: 'dark mode that does not wreck the colours',
		results: [
			{
				site: 'Colour Notes', url: 'colournotes.example › oklch › mapping', dot: '#4b7bec',
				title: 'Why inverting a page ruins it, and what to do instead',
				snip: ['In HSL, fifty per cent lightness means something different', 'for yellow than it does for blue. In OKLCH it does not.'],
			},
			{
				site: 'Contrast', url: 'contrast.example › apca › dark', dot: '#e8564a',
				title: 'APCA, and why the old ratio misjudges dark backgrounds',
				snip: ['A pair that passes the 2.1 ratio can still be unreadable', 'when the background is the dark one.'],
			},
			{
				site: 'Schemes', url: 'schemes.example › complementary', dot: '#f2b53c',
				title: 'A scheme is a relationship, not a single colour',
				snip: ['Tint the neutrals. Leave the colours their own hue.'],
			},
		],
	},
	typeset: {
		query: 'best font pairing for long reading',
		results: [
			{
				site: 'Type Works', url: 'typeworks.example › pairing › reading', dot: '#4b7bec',
				title: 'Pairing a display face with something you can read',
				snip: ['The two faces should disagree about one thing and agree', 'about everything else.'],
			},
			{
				site: 'Measure', url: 'measure.example › line-length', dot: '#3fa96a',
				title: 'Sixty-six characters, and why the number keeps coming back',
				snip: ['Past about seventy the eye starts losing its place on', 'the return sweep.'],
			},
			{
				site: 'Practical Typography', url: 'practicaltype.example › leading', dot: '#e8564a',
				title: 'Line height is set by the face, not by the rule',
				snip: ['A tall x-height wants more leading than the same size', 'in a face with a small one.'],
			},
		],
	},
	'cold-read': {
		query: 'why do we forget what we just read',
		results: [
			{
				site: 'Retrieval', url: 'retrieval.example › testing › effect', dot: '#4b7bec',
				title: 'Testing yourself beats reading it twice',
				snip: ['Trying to recall something changes what happens next —', 'and it works even when you get it wrong.'],
			},
			{
				site: 'Fluency', url: 'fluency.example › illusion', dot: '#e8564a',
				title: 'The illusion that reading it means knowing it',
				snip: ['Familiarity feels like understanding, right up until', 'somebody asks you a question about it.'],
			},
			{
				site: 'Spacing', url: 'spacing.example › intervals', dot: '#3fa96a',
				title: 'Why the gap matters more than the hours',
				snip: ['The forgetting is not the enemy. It is the mechanism.'],
			},
		],
	},
	'by-hand': {
		query: 'why does handwriting look human',
		results: [
			{
				site: 'Drawing Notes', url: 'drawingnotes.example › line › tremor', dot: '#f2b53c',
				title: 'Nobody draws a straight line, and that is the point',
				snip: ['The wobble is not error. It is the record of a hand that', 'had to make decisions on the way.'],
			},
			{
				site: 'Letterform', url: 'letterform.example › script › hand', dot: '#4b7bec',
				title: 'Why a font of your handwriting still looks like a font',
				snip: ['Every a is identical. That is the only tell anyone needs.'],
			},
			{
				site: 'Sketching', url: 'sketching.example › ink › pressure', dot: '#3fa96a',
				title: 'Pressure, speed, and the weight of a pen stroke',
				snip: ['A line drawn quickly is thin at both ends and heavy', 'through the middle.'],
			},
		],
	},
};

// ---- layout --------------------------------------------------------------
// One list of boxes, carrying its own text and tone. Both By Hand and Typeset
// address this list, so there is no second copy of the layout to fall out of
// step with the first. `kind` is a union rather than a string, which is what
// caught the last round of typos here.

type RectKind =
	| 'mark' | 'field' | 'avatar' | 'tabs' | 'divider'
	| 'favicon' | 'site' | 'url' | 'title' | 'snip';

type Tone = 'ink' | 'sub' | 'faint' | 'link';

type Rect = {
	kind: RectKind;
	x: number; y: number; w: number; h: number;
	radius?: number;
	text?: string;
	size?: number;
	weight?: number;
	tone?: Tone;
	fill?: string;
	group?: number; // which result it belongs to, for staggering
};

function layout(kind: PreviewKind): Rect[] {
	const p = PAGES[kind];
	const L = PAGE.x + GUT;
	const r: Rect[] = [];

	r.push({ kind: 'mark', x: L, y: PAGE.y + 32, w: 28, h: 28, radius: 9 });
	r.push({
		kind: 'field', x: L + 50, y: PAGE.y + 26, w: 620, h: 44, radius: 22,
		text: p.query, size: 16.5, weight: 400, tone: 'ink',
	});
	r.push({ kind: 'avatar', x: PAGE.x + PAGE.w - GUT - 32, y: PAGE.y + 32, w: 32, h: 32, radius: 16 });

	r.push({ kind: 'tabs', x: L, y: PAGE.y + 98, w: 300, h: 16 });
	r.push({ kind: 'divider', x: PAGE.x, y: PAGE.y + 126, w: PAGE.w, h: 1 });

	p.results.forEach((res, i) => {
		const y = PAGE.y + 150 + i * 112;
		const g = i;
		r.push({ kind: 'favicon', x: L, y, w: 30, h: 30, radius: 10, fill: res.dot, text: res.site[0], group: g });
		r.push({ kind: 'site', x: L + 42, y: y + 1, w: 260, h: 16, text: res.site, size: 13.5, weight: 500, tone: 'ink', group: g });
		r.push({ kind: 'url', x: L + 42, y: y + 18, w: 300, h: 14, text: res.url, size: 12, weight: 400, tone: 'faint', group: g });
		r.push({ kind: 'title', x: L, y: y + 42, w: 660, h: 24, text: res.title, size: 19.5, weight: 400, tone: 'link', group: g });
		res.snip.forEach((s, j) => {
			r.push({
				kind: 'snip', x: L, y: y + 74 + j * 19, w: 620, h: 15,
				text: s, size: 13.5, weight: 400, tone: 'sub', group: g,
			});
		});
	});
	return r;
}

const RECTS: Record<PreviewKind, Rect[]> = {
	colourway: layout('colourway'),
	typeset: layout('typeset'),
	'by-hand': layout('by-hand'),
	'cold-read': layout('cold-read'),
};

// ---- component -----------------------------------------------------------

export default function ExtensionPreview({ kind, atMs }: { kind: PreviewKind; atMs?: number }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const cv = canvasRef.current;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(devicePixelRatio || 1, 2);
		cv.width = Math.round(W * dpr);
		cv.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const pinned = typeof atMs === 'number';
		let raf = 0;
		let started = 0;
		let alive = true;

		function frame(now: number) {
			if (!started) started = now;
			const elapsed = now - started;
			// The mote seed advances every loop, so no two passes take the
			// same path — which is the claim the page makes about them.
			draw(ctx!, kind, elapsed % LOOP, Math.floor(elapsed / LOOP));
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

		/**
		 * Canvas takes no part in font-display: swap — whatever is loaded at
		 * the moment of the fillText call is what gets drawn, permanently. So
		 * wait for Space Grotesk before the first frame, or the held frame is
		 * set in a fallback face.
		 */
		function begin() {
			if (!alive) return;
			io.observe(cv!);
			if (pinned) draw(ctx!, kind, atMs! % LOOP, 0);
			else if (mq.matches) draw(ctx!, kind, HERO[kind], 0);
			else raf = requestAnimationFrame(frame);
		}

		const fonts = (document as Document).fonts;
		if (fonts) {
			Promise.all([
				fonts.load(`400 17px ${UI}`),
				fonts.load(`500 17px ${UI}`),
				fonts.load(`600 17px ${UI}`),
			])
				.then(begin)
				.catch(begin);
		} else {
			begin();
		}

		return () => {
			alive = false;
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
			style={{ background: D.void }}
		/>
	);
}

/** The one frame worth holding, per effect, for anyone who has asked for no motion. */
const HERO: Record<PreviewKind, number> = {
	colourway: 6200,
	typeset: 6200,
	'by-hand': 6600,
	// The held frame is the trail, not the quiz card — the marks in the page
	// are the thing worth looking at once everything has stopped moving.
	'cold-read': 8200,
};

const LABELS: Record<PreviewKind, string> = {
	colourway:
		'A search is typed into a browser, results appear, and then the whole page is re-coloured into a different scheme as the new palette spreads out from the cursor.',
	typeset:
		'A search is typed into a browser, results appear, and then the page is re-set in a different typeface as a wave passes down it.',
	'by-hand':
		'A search is typed into a browser, results appear, and then the whole page is redrawn in pen strokes on paper, box by box.',
	'cold-read':
		'A search is typed into a browser, results appear, and then the page goes behind a wash while a question is asked about it. The answer given is wrong, and when the wash lifts the sentences the questions came from are marked in the page.',
};

// ---------------------------------------------------------------------------

function draw(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number, seed: number) {
	ctx.clearRect(0, 0, W, H);
	ctx.textBaseline = 'top';

	const typed = ramp(t, TYPE_A, TYPE_B);
	const results = easeOut(ramp(t, RES_A, RES_B));
	const rise = ramp(t, ON_A, ON_B);
	const fall = ramp(t, OFF_A, OFF_B);
	const on = rise * (1 - fall);

	drawBackdrop(ctx);

	// A slow push-in that returns to where it started, so the loop closes
	// without a jump. Enough to feel alive, not enough to notice.
	const phase = (t / LOOP) * Math.PI * 2;
	const z = 1 + 0.02 * (0.5 - 0.5 * Math.cos(phase));
	const dy = -5 * Math.sin(phase);
	ctx.save();
	ctx.translate(W / 2, H / 2);
	ctx.scale(z, z);
	ctx.translate(-W / 2, -H / 2 + dy);

	// The window, its shadow, and everything clipped inside it.
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.6)';
	ctx.shadowBlur = 54;
	ctx.shadowOffsetY = 20;
	ctx.fillStyle = D.chrome;
	roundRect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, WIN.r);
	ctx.fill();
	ctx.restore();

	ctx.save();
	roundRect(ctx, WIN.x, WIN.y, WIN.w, WIN.h, WIN.r);
	ctx.clip();

	if (kind === 'colourway') drawColourway(ctx, t, on, typed, results);
	else if (kind === 'typeset') drawTypeset(ctx, t, rise, fall, on, typed, results);
	else if (kind === 'cold-read') drawColdRead(ctx, t, typed, results);
	else drawByHand(ctx, t, on, typed, results);

	drawChrome(ctx, kind, typed, on);
	ctx.restore();

	// A one-pixel lit edge along the top of the glass, which is most of what
	// makes a flat rectangle read as a pane of something.
	ctx.strokeStyle = 'rgba(255,255,255,0.09)';
	ctx.lineWidth = 1;
	roundRect(ctx, WIN.x + 0.5, WIN.y + 0.5, WIN.w - 1, WIN.h - 1, WIN.r);
	ctx.stroke();

	// Motes live outside the window — they arrive from the edges of the
	// screen, not from inside the page.
	drawMotes(ctx, kind, t, on, seed);
	ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const rr = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + rr, y);
	ctx.arcTo(x + w, y, x + w, y + h, rr);
	ctx.arcTo(x + w, y + h, x, y + h, rr);
	ctx.arcTo(x, y + h, x, y, rr);
	ctx.arcTo(x, y, x + w, y, rr);
	ctx.closePath();
}

/** Depth behind the window: a lifted centre falling off to the corners. */
function drawBackdrop(ctx: CanvasRenderingContext2D) {
	ctx.fillStyle = D.void;
	ctx.fillRect(0, 0, W, H);
	const g = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.72);
	g.addColorStop(0, 'rgba(255,255,255,0.055)');
	g.addColorStop(0.55, 'rgba(255,255,255,0.015)');
	g.addColorStop(1, 'rgba(0,0,0,0.35)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
}

// ---- chrome --------------------------------------------------------------

/**
 * Browser furniture, kept to what a preview needs: three neutral dots, an
 * address pill, and the extension's own button lighting up once it has been
 * used. No tab strip — it was noise at this size.
 */
function drawChrome(ctx: CanvasRenderingContext2D, kind: PreviewKind, typed: number, on: number) {
	const q = PAGES[kind].query;
	ctx.fillStyle = D.chrome;
	ctx.fillRect(WIN.x, WIN.y, WIN.w, CHROME_H);
	ctx.fillStyle = D.line;
	ctx.fillRect(WIN.x, WIN.y + CHROME_H - 1, WIN.w, 1);

	for (let i = 0; i < 3; i++) {
		ctx.fillStyle = 'rgba(255,255,255,0.13)';
		ctx.beginPath();
		ctx.arc(WIN.x + 26 + i * 17, WIN.y + CHROME_H / 2, 4.5, 0, Math.PI * 2);
		ctx.fill();
	}

	const px = WIN.x + 98;
	const pw = WIN.w - 98 - 86;
	ctx.fillStyle = '#15171a';
	roundRect(ctx, px, WIN.y + 14, pw, 30, 15);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,255,255,0.055)';
	ctx.lineWidth = 1;
	roundRect(ctx, px + 0.5, WIN.y + 14.5, pw - 1, 29, 15);
	ctx.stroke();

	// a padlock, because an address bar without one looks wrong
	ctx.strokeStyle = D.faint;
	ctx.lineWidth = 1.3;
	ctx.beginPath();
	ctx.arc(px + 20, WIN.y + 27, 3.4, Math.PI, 0);
	ctx.stroke();
	ctx.fillStyle = D.faint;
	roundRect(ctx, px + 16, WIN.y + 27, 8, 7, 1.6);
	ctx.fill();

	const shown = q.slice(0, Math.round(q.length * typed));
	ctx.fillStyle = D.sub;
	ctx.font = `400 12.5px ${UI}`;
	ctx.fillText(
		typed < 1 ? 'search.example' : `search.example/?q=${shown.replace(/ /g, '+')}`,
		px + 34,
		WIN.y + 22
	);

	// the extension's button
	const bx = WIN.x + WIN.w - 58;
	const by = WIN.y + 17;
	const lit = clamp01(on * 3);
	if (lit > 0.02) {
		ctx.save();
		ctx.globalAlpha = lit * 0.5;
		ctx.fillStyle = D.accent;
		ctx.beginPath();
		ctx.arc(bx + 12, by + 12, 20, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	ctx.fillStyle = lit > 0.02 ? D.accent : 'rgba(255,255,255,0.16)';
	roundRect(ctx, bx, by, 24, 24, 7);
	ctx.fill();
	ctx.fillStyle = lit > 0.02 ? 'rgba(10,12,18,0.85)' : 'rgba(255,255,255,0.35)';
	roundRect(ctx, bx + 7, by + 7, 10, 10, 3);
	ctx.fill();
}

// ---- the page ------------------------------------------------------------

type PaintOpts = {
	typed: number;
	results: number;
	t: number;
	/** Colourway routes every colour on the page through this. */
	map?: (hex: string) => string;
	/** Typeset swaps the family, and corrects the leading, per box. */
	faceFor?: (r: Rect) => string | null;
	leadFor?: (r: Rect) => number;
	noBg?: boolean;
};

const TONE: Record<Tone, string> = { ink: D.ink, sub: D.sub, faint: D.faint, link: D.link };

function paintPage(ctx: CanvasRenderingContext2D, kind: PreviewKind, o: PaintOpts) {
	const page = PAGES[kind];
	const rects = RECTS[kind];
	const C = o.map ? o.map : (h: string) => h;

	if (!o.noBg) {
		ctx.fillStyle = C(D.bg);
		ctx.fillRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
	}

	/** Each result block springs in on its own beat, 90ms apart. */
	const groupSpring = (g: number | undefined) => {
		if (g === undefined) return { a: 1, dy: 0 };
		const sp = spring((o.t - RES_A - g * 90) / 1000);
		return { a: clamp01(sp * 1.25), dy: (1 - sp) * 16 };
	};

	for (const r of rects) {
		const { a, dy } = groupSpring(r.group);
		if (a <= 0.01) continue;
		const y = r.y + dy;
		const family = o.faceFor?.(r) ?? null;
		const face = family || UI;
		const lead = o.leadFor?.(r) ?? 0;

		ctx.save();
		ctx.globalAlpha = a;

		switch (r.kind) {
			case 'mark': {
				ctx.fillStyle = C(D.accent);
				roundRect(ctx, r.x, y, r.w, r.h, r.radius!);
				ctx.fill();
				ctx.fillStyle = C(D.bg);
				ctx.beginPath();
				ctx.arc(r.x + r.w / 2, y + r.h / 2, 5.5, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case 'field': {
				ctx.fillStyle = C(D.pill);
				roundRect(ctx, r.x, y, r.w, r.h, r.radius!);
				ctx.fill();
				ctx.strokeStyle = C(D.line);
				ctx.lineWidth = 1;
				roundRect(ctx, r.x + 0.5, y + 0.5, r.w - 1, r.h - 1, r.radius!);
				ctx.stroke();

				const shown = r.text!.slice(0, Math.round(r.text!.length * o.typed));
				ctx.fillStyle = C(TONE[r.tone!]);
				ctx.font = `${r.weight} ${r.size}px ${face}`;
				const ty = y + (r.h - r.size!) / 2 - 1;
				ctx.fillText(shown, r.x + 22, ty);
				if (o.typed < 1 && Math.floor(o.t / 420) % 2 === 0) {
					ctx.fillStyle = C(D.accent);
					ctx.fillRect(r.x + 23 + ctx.measureText(shown).width, ty - 1, 1.5, r.size! + 3);
				}
				// a divider and a search glyph, and nothing else
				ctx.strokeStyle = C(D.line);
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(r.x + r.w - 56, y + 12);
				ctx.lineTo(r.x + r.w - 56, y + r.h - 12);
				ctx.stroke();
				ctx.strokeStyle = C(D.accent);
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.arc(r.x + r.w - 33, y + r.h / 2 - 2, 5.5, 0, Math.PI * 2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(r.x + r.w - 29, y + r.h / 2 + 2.5);
				ctx.lineTo(r.x + r.w - 25, y + r.h / 2 + 7);
				ctx.stroke();
				break;
			}
			case 'avatar': {
				ctx.fillStyle = C('#e8a33c');
				ctx.beginPath();
				ctx.arc(r.x + r.w / 2, y + r.h / 2, r.w / 2, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case 'tabs': {
				const labels = ['All', 'Images', 'Videos', 'News'];
				ctx.font = `500 13px ${face}`;
				let tx = r.x;
				labels.forEach((lb, i) => {
					ctx.fillStyle = i === 0 ? C(D.accent) : C(D.faint);
					ctx.fillText(lb, tx, y);
					if (i === 0) {
						ctx.fillStyle = C(D.accent);
						ctx.fillRect(tx - 1, y + 21, ctx.measureText(lb).width + 2, 2);
					}
					tx += ctx.measureText(lb).width + 26;
				});
				break;
			}
			case 'divider': {
				ctx.fillStyle = C(D.line);
				ctx.fillRect(r.x, y, r.w, 1);
				break;
			}
			case 'favicon': {
				ctx.fillStyle = C(r.fill!);
				roundRect(ctx, r.x, y, r.w, r.h, r.radius!);
				ctx.fill();
				ctx.fillStyle = 'rgba(255,255,255,0.92)';
				ctx.font = `600 14px ${face}`;
				const tw = ctx.measureText(r.text!).width;
				ctx.fillText(r.text!, r.x + (r.w - tw) / 2, y + 7);
				break;
			}
			default: {
				ctx.fillStyle = C(TONE[r.tone!]);
				ctx.font = `${r.weight} ${r.size}px ${face}`;
				ctx.fillText(r.text!, r.x, y + lead);
			}
		}
		ctx.restore();
	}

	void page;
}

// ---- Colourway -----------------------------------------------------------

const THEME = { groundL: 0.19, groundC: 0.055, groundH: 275, inkL: 0.94, accentH: 75 };
const mapCache = new Map<string, string>();

/**
 * The same maths the extension uses, cut down to what a preview needs: the
 * page's own lightness axis mapped onto the scheme's, neutrals taking the
 * scheme's hue, and anything that already has colour keeping its own.
 */
function remap(hex: string): string {
	const hit = mapCache.get(hex);
	if (hit) return hit;
	const pageG = 0.19, pageI = 0.94;
	const [r, g, b] = hexToRgb(hex);
	const { L, C, H } = rgbToOklch(r, g, b);
	const n = Math.max(-0.2, Math.min(1.2, (L - pageG) / (pageI - pageG)));
	const outL = THEME.groundL + n * (THEME.inkL - THEME.groundL);
	const neutral = 1 - Math.min(1, C / 0.045);
	const outC = C * (1 - neutral) + (THEME.groundC + n * (0.02 - THEME.groundC)) * neutral;
	const outH = neutral > 0.5 ? THEME.groundH : H;
	const out = rgbToCss(oklchToRgb(outL, outC, outH));
	mapCache.set(hex, out);
	return out;
}

function drawColourway(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number) {
	// The page as the site shipped it.
	paintPage(ctx, 'colourway', { typed, results, t });

	const c = cursorAt('colourway', t);
	// Far enough to reach the furthest corner of the window and no further, so
	// half the effect really is half the page — the frame where you can see
	// the old scheme and the new one at once is the one worth having.
	const spread = easeInOut(on) * cornerReach(c);

	// And the same page in the new scheme, clipped to how far the wash has
	// got. The front is a hard clip rather than a cross-fade, so the colour
	// change is CAUSED by the thing sweeping across it — which is the whole
	// point of the effect and the one thing the old preview didn't do.
	if (spread > 1) {
		ctx.save();
		ctx.beginPath();
		ctx.arc(c.x, c.y, spread, 0, Math.PI * 2);
		ctx.clip();
		paintPage(ctx, 'colourway', { typed, results, t, map: remap });

		// a lit rim on the leading edge, and nothing more — no glowing ring
		if (on > 0.01 && on < 0.995) {
			const rim = ctx.createRadialGradient(c.x, c.y, Math.max(0, spread - 44), c.x, c.y, spread);
			rim.addColorStop(0, 'rgba(0,0,0,0)');
			rim.addColorStop(0.6, `rgba(${accentRgb()},0.10)`);
			rim.addColorStop(1, `rgba(${accentRgb()},0.42)`);
			ctx.fillStyle = rim;
			ctx.fillRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
		}
		ctx.restore();
	}

	// the readout the extension actually shows
	readout(ctx, on, 'rgba(18,17,32,0.95)', 'rgba(190,180,255,0.24)', (bx, by) => {
		// three swatches of the scheme it landed on
		[
			[THEME.groundL, THEME.groundC, THEME.groundH],
			[0.62, 0.16, THEME.accentH],
			[THEME.inkL, 0.02, THEME.groundH],
		].forEach((s, i) => {
			ctx.fillStyle = rgbToCss(oklchToRgb(s[0], s[1], s[2]));
			roundRect(ctx, bx + 18 + i * 19, by + 16, 14, 14, 4);
			ctx.fill();
		});
		ctx.fillStyle = rgbToCss(oklchToRgb(0.82, 0.13, THEME.accentH));
		ctx.font = `500 12.5px ${UI}`;
		ctx.fillText('Indigo — complementary', bx + 18, by + 42);
		ctx.fillStyle = 'rgba(225,228,245,0.6)';
		ctx.font = `400 11.5px ${UI}`;
		ctx.fillText('34 colours · 25 pairs repaired', bx + 18, by + 62);
	});
}

const accentRgb = () => oklchToRgb(0.62, 0.16, THEME.accentH).join(',');

/** Distance from a point to the furthest corner of the window. */
function cornerReach(p: { x: number; y: number }) {
	const cs = [
		[WIN.x, WIN.y], [WIN.x + WIN.w, WIN.y],
		[WIN.x, WIN.y + WIN.h], [WIN.x + WIN.w, WIN.y + WIN.h],
	];
	return Math.max(...cs.map(([x, y]) => Math.hypot(x - p.x, y - p.y)));
}

const PANEL = { w: 260, h: 88 };

/**
 * Both effects put up a small panel saying what they found and what they did.
 * It lives in the empty right-hand column — the result text stops at x 764,
 * so nothing has to be covered up to make room for it.
 */
function readout(
	ctx: CanvasRenderingContext2D,
	on: number,
	fill: string,
	edge: string,
	body: (bx: number, by: number) => void
) {
	const p = clamp01((on - 0.55) / 0.25);
	if (p <= 0.01) return;
	const bx = PAGE.x + PAGE.w - PANEL.w - 24;
	const by = PAGE.y + 150 + (1 - easeOut(p)) * 14;

	ctx.save();
	ctx.globalAlpha = p;
	ctx.shadowColor = 'rgba(0,0,0,0.55)';
	ctx.shadowBlur = 26;
	ctx.shadowOffsetY = 10;
	ctx.fillStyle = fill;
	roundRect(ctx, bx, by, PANEL.w, PANEL.h, 12);
	ctx.fill();
	ctx.restore();

	ctx.save();
	ctx.globalAlpha = p;
	ctx.strokeStyle = edge;
	ctx.lineWidth = 1;
	roundRect(ctx, bx + 0.5, by + 0.5, PANEL.w - 1, PANEL.h - 1, 12);
	ctx.stroke();
	body(bx, by);
	ctx.restore();
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

// ---- Typeset -------------------------------------------------------------

const SERIF_DISPLAY = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SERIF_BODY = 'Charter, Cambria, Georgia, serif';

function drawTypeset(
	ctx: CanvasRenderingContext2D,
	t: number,
	rise: number,
	fall: number,
	on: number,
	typed: number,
	results: number
) {
	const top = PAGE.y - 40;
	const span = PAGE.h + 80;
	// Two sweeps in the same direction: one lays the pairing on, one takes it
	// off again. Reverting by sweeping backwards would read as a rewind.
	const bandOn = top + easeInOut(rise) * span;
	const bandOff = top + easeInOut(fall) * span;

	const set = (r: Rect) => r.y + r.h < bandOn && !(r.y + r.h < bandOff);

	paintPage(ctx, 'typeset', {
		typed,
		results,
		t,
		faceFor: (r) => (set(r) ? (r.kind === 'title' ? SERIF_DISPLAY : SERIF_BODY) : null),
		leadFor: (r) => (set(r) ? (r.kind === 'snip' ? 3 : 1.5) : 0),
	});

	const band = fall > 0.001 ? bandOff : bandOn;
	const active = fall > 0.001 ? fall : rise;
	if (active > 0.001 && active < 0.999) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
		ctx.clip();

		// The wave bends across the page rather than ruling a line across it.
		const at = (x: number) => band + Math.sin((x / PAGE.w) * Math.PI * 2 + t / 700) * 7;

		const g = ctx.createLinearGradient(0, band - 90, 0, band + 6);
		g.addColorStop(0, 'rgba(233,167,60,0)');
		g.addColorStop(0.72, 'rgba(233,167,60,0.10)');
		g.addColorStop(1, 'rgba(233,167,60,0.20)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(PAGE.x, band - 90);
		for (let x = PAGE.x; x <= PAGE.x + PAGE.w; x += 8) ctx.lineTo(x, at(x));
		ctx.lineTo(PAGE.x + PAGE.w, band - 90);
		ctx.closePath();
		ctx.fill();

		// the front, three passes of falling opacity so it has a soft core
		[[3.4, 0.10], [2, 0.24], [1, 0.7]].forEach(([lw, a]) => {
			ctx.strokeStyle = `rgba(247,206,140,${a})`;
			ctx.lineWidth = lw;
			ctx.beginPath();
			for (let x = PAGE.x; x <= PAGE.x + PAGE.w; x += 8) {
				if (x === PAGE.x) ctx.moveTo(x, at(x));
				else ctx.lineTo(x, at(x));
			}
			ctx.stroke();
		});

		// loose letters riding the edge, moving continuously and lit, so they
		// read as part of the effect rather than as debris on the page
		for (let i = 0; i < 8; i++) {
			const x = PAGE.x + (((i * 241 + t * 0.055) % (PAGE.w + 80)) - 40);
			const wob = Math.sin(t / 340 + i * 1.7) * 9;
			const a = (0.35 + 0.45 * hash(i, 2)) * (1 - Math.abs(wob) / 22);
			if (a <= 0) continue;
			ctx.font = `${11 + hash(i, 3) * 8}px ${SERIF_DISPLAY}`;
			ctx.textBaseline = 'middle';
			ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(2)})`;
			ctx.shadowBlur = 14;
			ctx.fillStyle = `rgba(255,238,206,${a.toFixed(2)})`;
			ctx.fillText('aegQ&¶§'[i % 7], x, at(x) - 13 + wob);
		}
		ctx.textBaseline = 'top';
		ctx.restore();
	}

	// the readout, the same one the extension shows before it touches anything
	readout(ctx, on, 'rgba(26,20,12,0.95)', 'rgba(233,167,60,0.26)', (bx, by) => {
		ctx.fillStyle = 'rgba(247,206,140,0.95)';
		ctx.font = `500 12.5px ${UI}`;
		ctx.fillText('Editorial', bx + 18, by + 16);
		ctx.fillStyle = 'rgba(240,232,220,0.72)';
		ctx.font = `400 11.5px ${UI}`;
		ctx.fillText('Iowan Old Style · Charter', bx + 18, by + 40);
		ctx.fillStyle = 'rgba(240,232,220,0.45)';
		ctx.fillText('was 15/22 · now 16/26', bx + 18, by + 62);
	});
}

// ---- By Hand -------------------------------------------------------------

let grainTile: HTMLCanvasElement | null = null;
/** Built once and tiled, because a few thousand dots a frame is not free. */
function grain(): HTMLCanvasElement {
	if (grainTile) return grainTile;
	const c = document.createElement('canvas');
	c.width = c.height = 180;
	const g = c.getContext('2d')!;
	for (let i = 0; i < 7000; i++) {
		g.fillStyle = `rgba(74,68,60,${(0.04 + Math.random() * 0.1).toFixed(3)})`;
		g.fillRect(Math.random() * 180, Math.random() * 180, 1, 1);
	}
	grainTile = c;
	return c;
}

const INK = '60,58,55';

function drawByHand(ctx: CanvasRenderingContext2D, t: number, on: number, typed: number, results: number) {
	// Underneath is always the real page — the paper is laid over it, and on
	// the way out it lifts off to reveal it again.
	paintPage(ctx, 'by-hand', { typed, results, t });
	if (on < 0.005) return;

	const sheet = clamp01(on * 6);

	ctx.save();
	ctx.globalAlpha = sheet;
	ctx.beginPath();
	ctx.rect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
	ctx.clip();

	// The sheet sits a fraction of a degree off-square, which the page claims
	// and the old preview did not do.
	ctx.translate(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2);
	ctx.rotate(-0.0035);
	ctx.translate(-(PAGE.x + PAGE.w / 2), -(PAGE.y + PAGE.h / 2));

	ctx.fillStyle = '#fbfaf6';
	ctx.fillRect(PAGE.x - 20, PAGE.y - 20, PAGE.w + 40, PAGE.h + 40);
	const pat = ctx.createPattern(grain(), 'repeat');
	if (pat) {
		ctx.fillStyle = pat;
		ctx.fillRect(PAGE.x - 20, PAGE.y - 20, PAGE.w + 40, PAGE.h + 40);
	}

	const rects = RECTS['by-hand'];
	const order = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
	const per = 1 / (order.length + 2);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	let nib: { x: number; y: number } | null = null;

	order.forEach((r, i) => {
		const local = clamp01((on - i * per * 0.8) / (per * 2.6));
		if (local <= 0) return;

		// Body copy gets ruled lines, the way anyone sketching a page does it.
		// Headings and names get actual words. This is the branch that was
		// dead before — the kind names never matched, so nothing was written.
		if (r.kind === 'url' || r.kind === 'snip' || r.kind === 'tabs' || r.kind === 'divider') {
			ctx.strokeStyle = `rgba(${INK},${(0.4 * local).toFixed(2)})`;
			ctx.lineWidth = r.kind === 'divider' ? 1 : 1.3;
			const p = wobble(ctx, r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2, i, local);
			if (local < 1) nib = p;
			return;
		}

		if (r.kind === 'title' || r.kind === 'site') {
			const big = r.kind === 'title';
			ctx.fillStyle = `rgba(${INK},${(0.92 * local).toFixed(2)})`;
			// the hand faces run wider than Space Grotesk at the same size, so
			// they are set a shade smaller to stay inside the box they were
			// measured for
			ctx.font = `${big ? 17 : 12.5}px ${HAND}`;
			// letter by letter, with the baseline never quite settling
			const chars = r.text!.split('');
			const upto = Math.round(chars.length * local);
			let cx = r.x;
			for (let k = 0; k < upto; k++) {
				const jy = (hash(i * 97 + k, 5) - 0.5) * (big ? 2.2 : 1.4);
				ctx.fillText(chars[k], cx, r.y + jy);
				cx += ctx.measureText(chars[k]).width;
			}
			if (upto < chars.length) nib = { x: cx, y: r.y + r.h };
			if (big && local > 0.75) {
				// underlined twice, the way people underline
				const u = (local - 0.75) / 0.25;
				ctx.strokeStyle = `rgba(${INK},${(0.5 * local).toFixed(2)})`;
				ctx.lineWidth = 1.2;
				wobble(ctx, r.x, r.y + r.h + 3, r.x + cx - r.x, r.y + r.h + 3, i + 400, u);
				if (u > 0.5) wobble(ctx, r.x, r.y + r.h + 6.5, r.x + (cx - r.x) * 0.92, r.y + r.h + 6.5, i + 811, (u - 0.5) * 2);
			}
			return;
		}

		// everything else is a box, drawn edge by edge
		const segs: [number, number, number, number][] = [
			[r.x, r.y, r.x + r.w, r.y],
			[r.x + r.w, r.y, r.x + r.w, r.y + r.h],
			[r.x + r.w, r.y + r.h, r.x, r.y + r.h],
			[r.x, r.y + r.h, r.x, r.y],
		];
		ctx.strokeStyle = `rgba(${INK},${(0.55 * local).toFixed(2)})`;
		ctx.lineWidth = 1.4;
		for (let s = 0; s < 4; s++) {
			const sl = clamp01((local - s / 4) * 4);
			if (sl <= 0) continue;
			const p = wobble(ctx, segs[s][0], segs[s][1], segs[s][2], segs[s][3], i * 4 + s, sl);
			if (sl < 1) nib = p;
			if (sl >= 1) {
				// ink pools where the hand pauses at a corner
				ctx.fillStyle = `rgba(${INK},${(0.2 * local).toFixed(2)})`;
				ctx.beginPath();
				ctx.arc(segs[s][2], segs[s][3], 1.5, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		// a rectangle nobody gets right first time gets a second pass
		if (local >= 1 && (r.kind === 'field' || r.kind === 'favicon')) {
			ctx.strokeStyle = `rgba(${INK},0.22)`;
			ctx.lineWidth = 1;
			for (let s = 0; s < 4; s++) wobble(ctx, segs[s][0], segs[s][1], segs[s][2], segs[s][3], i * 4 + s + 55, 1);
		}
	});

	// the query, in the same hand
	const q = PAGES['by-hand'].query;
	ctx.fillStyle = `rgba(${INK},0.9)`;
	ctx.font = `17px ${HAND}`;
	ctx.fillText(q.slice(0, Math.round(q.length * typed)), PAGE.x + GUT + 72, PAGE.y + 40);

	// the nib, wherever the hand currently is
	if (nib) {
		const n = nib as { x: number; y: number };
		ctx.save();
		ctx.shadowColor = 'rgba(40,38,36,0.35)';
		ctx.shadowBlur = 5;
		ctx.shadowOffsetY = 2;
		ctx.strokeStyle = 'rgba(40,38,36,0.75)';
		ctx.lineWidth = 2.2;
		ctx.beginPath();
		ctx.moveTo(n.x, n.y);
		ctx.lineTo(n.x + 11, n.y - 17);
		ctx.stroke();
		ctx.restore();
		ctx.fillStyle = 'rgba(34,32,30,0.95)';
		ctx.beginPath();
		ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
	void t;
}

function wobble(
	ctx: CanvasRenderingContext2D,
	x1: number, y1: number, x2: number, y2: number,
	seed: number, prog: number
) {
	const len = Math.hypot(x2 - x1, y2 - y1);
	const steps = Math.max(4, Math.round(len / 12));
	const nx = -(y2 - y1) / (len || 1);
	const ny = (x2 - x1) / (len || 1);
	const upto = Math.max(1, Math.round(steps * prog));
	let last = { x: x1, y: y1 };
	ctx.beginPath();
	for (let i = 0; i <= upto; i++) {
		const tt = i / steps;
		const off = (hash(seed * 31 + i, 2) - 0.5) * 2.4;
		const px = x1 + (x2 - x1) * tt + nx * off;
		const py = y1 + (y2 - y1) * tt + ny * off;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
		last = { x: px, y: py };
	}
	ctx.stroke();
	return last;
}

// ---- cursor + motes ------------------------------------------------------

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(1.4, 1.4);
	ctx.beginPath();
	ctx.moveTo(0, 0);
	ctx.lineTo(0, 15);
	ctx.lineTo(4, 11.5);
	ctx.lineTo(6.5, 17);
	ctx.lineTo(9, 16);
	ctx.lineTo(6.5, 10.6);
	ctx.lineTo(11.5, 10.5);
	ctx.closePath();
	ctx.shadowColor = 'rgba(0,0,0,0.55)';
	ctx.shadowBlur = 6;
	ctx.shadowOffsetY = 2;
	ctx.fillStyle = '#ffffff';
	ctx.fill();
	ctx.shadowColor = 'transparent';
	ctx.strokeStyle = 'rgba(18,18,22,0.7)';
	ctx.lineWidth = 1;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.restore();
}

// ---- cold read -------------------------------------------------------------
// The only effect in the set that doesn't change the page. It covers it,
// asks a question, and then marks the sentences the questions came from —
// so the "effect" is really the trail left behind once the card has gone.
//
// Beats sit inside the shared window: the wash arrives at 2.6s, an answer is
// picked at 4.2s, the confidence tap at 4.8s, the verdict at 5.4s, and the
// wash lifts at 6.6s so the marks can sweep on underneath it.

const CR = {
	stem: ['Testing yourself beats', 'reading it ______'],
	options: ['twice', 'aloud', 'slowly', 'later'],
	answer: 0,
	picked: 3, // wrong, and confidently so — which is the whole point
	WASH_A: 2560, WASH_B: 3100,
	CARD_A: 2760, CARD_B: 3400,
	PICK: 4200,
	CONF_A: 4700, CONF_B: 5100,
	SURE: 5400,
	REVEAL: 5700,
	LIFT_A: 6600, LIFT_B: 7150,
	MARK_A: 6950, MARK_B: 8000,
};

function drawColdRead(ctx: CanvasRenderingContext2D, t: number, typed: number, results: number) {
	paintPage(ctx, 'cold-read', { typed, results, t });

	const rects = RECTS['cold-read'];
	const wash =
		easeInOut(ramp(t, CR.WASH_A, CR.WASH_B)) * (1 - easeInOut(ramp(t, CR.LIFT_A, CR.LIFT_B)));

	// ---- the marks, swept on under the lifting wash ----
	// Two of the three results: the one whose question was got wrong, in amber,
	// and one that was guessed, in blue. The third is left clean, because a
	// trail that covers everything is not a trail.
	const mark = easeOut(ramp(t, CR.MARK_A, CR.MARK_B)) * (1 - easeInOut(ramp(t, OFF_A, OFF_B)));
	if (mark > 0.01) {
		const bands: { group: number; kinds: RectKind[]; tint: string; line: string }[] = [
			{ group: 0, kinds: ['title'], tint: 'rgba(233,167,60,0.26)', line: '#E9A73C' },
			{ group: 1, kinds: ['snip'], tint: 'rgba(139,166,255,0.20)', line: '#8ba6ff' },
		];
		let n = 0;
		for (const band of bands) {
			for (const r of rects) {
				if (r.group !== band.group || !band.kinds.includes(r.kind)) continue;
				// Each bar wipes in from its left edge, one after another.
				const local = clamp01((mark - n * 0.12) / 0.5);
				n++;
				if (local <= 0.01) continue;
				const w = r.w * easeOut(local);
				ctx.save();
				ctx.globalAlpha = mark;
				ctx.fillStyle = band.tint;
				ctx.fillRect(r.x - 3, r.y - 2, w + 6, r.h + 5);
				ctx.fillStyle = band.line;
				ctx.fillRect(r.x - 3, r.y + r.h + 2, w + 6, 1.6);
				ctx.restore();
			}
		}

		// The rail, down the right edge of the page — a minimap of the marks.
		ctx.save();
		ctx.globalAlpha = mark;
		for (const band of bands) {
			const first = rects.find((r) => r.group === band.group && band.kinds.includes(r.kind));
			if (!first) continue;
			ctx.fillStyle = band.line;
			ctx.beginPath();
			ctx.arc(PAGE.x + PAGE.w - 14, first.y + 6, 3.6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	// ---- the wash ----
	if (wash > 0.01) {
		ctx.save();
		ctx.globalAlpha = wash;
		ctx.fillStyle = 'rgba(8,8,11,0.82)';
		ctx.fillRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
		ctx.restore();
	}

	// ---- the card ----
	const card =
		easeOut(ramp(t, CR.CARD_A, CR.CARD_B)) * (1 - easeInOut(ramp(t, CR.LIFT_A, CR.LIFT_B - 150)));
	if (card <= 0.01) return;

	const cw = 470;
	const chh = 300;
	const cx = PAGE.x + (PAGE.w - cw) / 2;
	const cy = PAGE.y + (PAGE.h - chh) / 2 + (1 - easeOut(ramp(t, CR.CARD_A, CR.CARD_B))) * 22;

	ctx.save();
	ctx.globalAlpha = card;

	roundRect(ctx, cx, cy, cw, chh, 10);
	ctx.fillStyle = '#0a0a0d';
	ctx.fill();
	ctx.strokeStyle = 'rgba(236,230,219,0.16)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// Eyebrow and progress dots.
	ctx.font = `500 11px ${UI}`;
	ctx.fillStyle = 'rgba(236,230,219,0.45)';
	ctx.fillText('COLD READ', cx + 26, cy + 26);
	for (let i = 0; i < 6; i++) {
		ctx.fillStyle = i === 1 ? '#E9A73C' : i < 1 ? 'rgba(236,230,219,0.5)' : 'rgba(236,230,219,0.18)';
		ctx.beginPath();
		ctx.arc(cx + cw - 26 - (5 - i) * 11, cy + 30, 2.6, 0, Math.PI * 2);
		ctx.fill();
	}

	// The stem, with the blank in amber.
	ctx.font = `400 22px ${SERIF_DISPLAY}`;
	ctx.fillStyle = '#ECE6DB';
	ctx.fillText(CR.stem[0], cx + 26, cy + 58);
	const head = 'reading it ';
	ctx.fillText(head, cx + 26, cy + 90);
	ctx.fillStyle = '#E9A73C';
	ctx.fillText('______', cx + 26 + ctx.measureText(head).width, cy + 90);

	const revealed = t >= CR.REVEAL;

	if (!revealed) {
		// Four options, two up two across, with the picked one outlined.
		const ow = (cw - 52 - 10) / 2;
		for (let i = 0; i < 4; i++) {
			const ox = cx + 26 + (i % 2) * (ow + 10);
			const oy = cy + 138 + Math.floor(i / 2) * 44;
			const isPicked = t >= CR.PICK && i === CR.picked;
			roundRect(ctx, ox, oy, ow, 36, 4);
			ctx.strokeStyle = isPicked ? '#E9A73C' : 'rgba(236,230,219,0.14)';
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.font = `400 15px ${UI}`;
			ctx.fillStyle = isPicked ? '#ECE6DB' : 'rgba(236,230,219,0.72)';
			ctx.fillText(CR.options[i], ox + 14, oy + 12);
		}

		// The confidence row — one tap, and the reason the verdict can say
		// "worth a read" rather than just "wrong".
		const conf = easeOut(ramp(t, CR.CONF_A, CR.CONF_B));
		if (conf > 0.01) {
			ctx.save();
			ctx.globalAlpha = card * conf;
			ctx.strokeStyle = 'rgba(236,230,219,0.09)';
			ctx.beginPath();
			ctx.moveTo(cx + 26, cy + 236);
			ctx.lineTo(cx + cw - 26, cy + 236);
			ctx.stroke();
			ctx.font = `400 13px ${UI}`;
			ctx.fillStyle = 'rgba(236,230,219,0.55)';
			ctx.fillText('How sure are you?', cx + 26, cy + 256);
			const sure = t >= CR.SURE;
			roundRect(ctx, cx + 178, cy + 248, 74, 30, 3);
			ctx.strokeStyle = sure ? '#E9A73C' : 'rgba(236,230,219,0.2)';
			ctx.stroke();
			if (sure) {
				ctx.fillStyle = 'rgba(233,167,60,0.14)';
				ctx.fill();
			}
			ctx.fillStyle = '#ECE6DB';
			ctx.fillText('Sure', cx + 200, cy + 258);
			roundRect(ctx, cx + 260, cy + 248, 96, 30, 3);
			ctx.strokeStyle = 'rgba(236,230,219,0.2)';
			ctx.stroke();
			ctx.fillStyle = 'rgba(236,230,219,0.72)';
			ctx.fillText('Guessing', cx + 276, cy + 258);
			ctx.restore();
		}
	} else {
		// The verdict. Never a score — the words are the product.
		const rv = easeOut(ramp(t, CR.REVEAL, CR.REVEAL + 420));
		ctx.save();
		ctx.globalAlpha = card * rv;
		ctx.font = `400 24px ${SERIF_DISPLAY}`;
		ctx.fillStyle = '#E9A73C';
		ctx.fillText('✗  Worth a read', cx + 26, cy + 146);
		ctx.font = `400 15px ${UI}`;
		ctx.fillStyle = 'rgba(236,230,219,0.78)';
		ctx.fillText('You said “later”. It is “twice”.', cx + 26, cy + 190);
		ctx.font = `400 13px ${UI}`;
		ctx.fillStyle = 'rgba(236,230,219,0.45)';
		ctx.fillText('You were sure — so this one gets marked in the page.', cx + 26, cy + 220);
		roundRect(ctx, cx + 26, cy + 248, 150, 32, 3);
		ctx.strokeStyle = 'rgba(233,167,60,0.7)';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = 'rgba(233,167,60,0.12)';
		ctx.fill();
		ctx.font = `400 13px ${UI}`;
		ctx.fillStyle = '#ECE6DB';
		ctx.fillText('See the trail', cx + 56, cy + 258);
		ctx.restore();
	}

	ctx.restore();
}

function cursorAt(kind: PreviewKind, t: number) {
	const a = (t / LOOP) * Math.PI * 2;
	if (kind === 'colourway') {
		// stays up near its own button, which is what it just clicked
		return { x: W * 0.5 + Math.cos(a * 1.4 - 1.1) * W * 0.4, y: PAGE.y + 34 + Math.sin(a * 1.2) * 46 };
	}
	return { x: W * 0.5 + Math.cos(a * 0.9) * W * 0.3, y: H * 0.55 + Math.sin(a * 1.4) * H * 0.26 };
}

/**
 * Each effect's own species, drifting in from an edge of the screen, curling
 * toward the pointer, and taken by it. Three size tiers so the field reads as
 * having depth rather than as one flat layer of dots.
 */
function drawMotes(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number, on: number, seed: number) {
	const c = cursorAt(kind, t);
	// They only turn up once the effect has landed and the cursor has come to
	// rest, which is both what the page promises and the only way they read as
	// motes rather than as debris scattered across a page mid-sweep.
	const settled = clamp01((on - 0.86) / 0.1);
	if (settled <= 0.01) {
		drawCursor(ctx, c.x, c.y);
		return;
	}
	on = settled;
	const N = 20;
	for (let i = 0; i < N; i++) {
		const s0 = i + seed * 31.7;
		const cycle = 2600 + hash(s0, 1) * 4200;
		const phase = ((t + hash(s0, 2) * LOOP) % cycle) / cycle;
		if (phase > 0.96) continue;
		const edge = Math.floor(hash(s0, 3) * 4);
		const along = hash(s0, 4);
		const src =
			edge === 0 ? { x: along * W, y: -10 } :
			edge === 1 ? { x: W + 10, y: along * H } :
			edge === 2 ? { x: along * W, y: H + 10 } :
			{ x: -10, y: along * H };
		// Accelerating in, not easing out. On an ease-out they spend most of
		// their life near the pointer and pile into a clump there; on an
		// ease-in they hang out at the edges and are taken quickly.
		const e = Math.pow(phase, 1.7);
		const dx = c.x - src.x;
		const dy = c.y - src.y;
		const nl = Math.hypot(-dy, dx) || 1;
		const swing = Math.sin(phase * Math.PI) * (hash(s0, 5) - 0.5) * 190;
		const x = src.x + dx * e + (-dy / nl) * swing;
		const y = src.y + dy * e + (dx / nl) * swing;
		const near = Math.hypot(c.x - x, c.y - y);
		const merge = near < 26 ? 1 - near / 26 : 0;
		const tier = 0.55 + hash(s0, 11) * 0.85;
		// gone by the time they get there — the pointer takes them
		const a = (Math.sin(phase * Math.PI) * 0.9 + 0.1) * on * (0.45 + tier * 0.45) * (1 - Math.pow(phase, 3));

		ctx.save();
		if (kind === 'typeset') {
			ctx.font = `${(11 + hash(s0, 6) * 10) * tier + merge * 10}px ${SERIF_DISPLAY}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(2)})`;
			ctx.shadowBlur = 16;
			ctx.fillStyle = `rgba(255,226,178,${a.toFixed(2)})`;
			ctx.fillText('aegQ&¶§'[i % 7], x, y);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
		} else if (kind === 'cold-read') {
			// Questions, with the odd tick and cross among them.
			ctx.font = `${(12 + hash(s0, 6) * 9) * tier + merge * 10}px ${SERIF_DISPLAY}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(2)})`;
			ctx.shadowBlur = 16;
			ctx.fillStyle = `rgba(255,238,205,${a.toFixed(2)})`;
			ctx.fillText('?????✓✗'[i % 7], x, y);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
		} else if (kind === 'by-hand') {
			ctx.translate(x, y);
			ctx.rotate(phase * 7 + i);
			ctx.strokeStyle = `rgba(196,190,180,${a.toFixed(2)})`;
			ctx.lineWidth = 1.3 * tier;
			ctx.lineCap = 'round';
			const L = (5 + hash(s0, 7) * 8) * tier + merge * 9;
			ctx.beginPath();
			ctx.moveTo(-L / 2, 0);
			ctx.lineTo(L / 2, 0);
			ctx.stroke();
		} else {
			const r = (1.4 + hash(s0, 8) * 2) * tier * (1 + merge * 3.2);
			const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
			g.addColorStop(0, `rgba(255,232,186,${(a * 0.95).toFixed(2)})`);
			g.addColorStop(0.35, `rgba(255,206,136,${(a * 0.28).toFixed(2)})`);
			g.addColorStop(1, 'rgba(255,206,136,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r * 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(255,250,238,${(a * 0.9).toFixed(2)})`;
			ctx.beginPath();
			ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}
	drawCursor(ctx, c.x, c.y);
}
