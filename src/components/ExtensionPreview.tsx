/**
 * EXTENSION PREVIEWS
 * -------------------------------------------------------------------------
 * A small, fake page, and each extension's effect running on it on a loop —
 * the real behaviour rather than a recording of it. Each preview cycles:
 * a beat of the untouched page, the effect arriving, a hold, and back.
 *
 * Everything is drawn from a single clock so the loop stays in step, and the
 * whole thing goes still under prefers-reduced-motion.
 */

import React, { useEffect, useRef, useState } from 'react';

export type PreviewKind = 'one-sun' | 'typeset' | 'by-hand';

const W = 560;
const H = 315; // 16:9
const LOOP = 9000; // ms

/** The mock page every preview transforms. Laid out by hand in one coordinate
 *  space so the effects can address its boxes directly. */
type Box = { x: number; y: number; w: number; h: number; kind: 'nav' | 'head' | 'line' | 'media' | 'card' | 'btn'; depth: number; text?: string };

const BOXES: Box[] = [
	{ x: 0, y: 0, w: W, h: 26, kind: 'nav', depth: 1, text: 'THE QUARTERLY' },
	{ x: 26, y: 46, w: 300, h: 17, kind: 'head', depth: 2, text: 'The city that keeps' },
	{ x: 26, y: 66, w: 236, h: 17, kind: 'head', depth: 2, text: 'moving' },
	{ x: 26, y: 96, w: 300, h: 84, kind: 'media', depth: 3 },
	{ x: 26, y: 192, w: 300, h: 6, kind: 'line', depth: 4 },
	{ x: 26, y: 204, w: 300, h: 6, kind: 'line', depth: 4 },
	{ x: 26, y: 216, w: 218, h: 6, kind: 'line', depth: 4 },
	{ x: 26, y: 238, w: 300, h: 40, kind: 'card', depth: 3 },
	{ x: 350, y: 96, w: 184, h: 60, kind: 'card', depth: 3 },
	{ x: 364, y: 126, w: 96, h: 20, kind: 'btn', depth: 5, text: 'Get the offer' },
	{ x: 350, y: 170, w: 184, h: 34, kind: 'card', depth: 4 },
	{ x: 350, y: 214, w: 184, h: 34, kind: 'card', depth: 4 },
	{ x: 350, y: 258, w: 184, h: 20, kind: 'line', depth: 4 },
];

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

export default function ExtensionPreview({ kind, atMs }: { kind: PreviewKind; atMs?: number }) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mq.matches);
		const cv = canvasRef.current;
		if (!cv) return;
		const ctx = cv.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(devicePixelRatio || 1, 2);
		cv.width = W * dpr;
		cv.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		let raf = 0;
		let started = 0;
		let visible = true;

		// Pause when off-screen — a page of these should cost nothing to scroll past.
		const pinned = typeof atMs === 'number';
		const io = new IntersectionObserver(
			([e]) => {
				visible = e.isIntersecting;
				if (visible && !raf && !mq.matches && !pinned) raf = requestAnimationFrame(frame);
				if (!visible && raf) {
					cancelAnimationFrame(raf);
					raf = 0;
				}
			},
			{ threshold: 0.05 }
		);
		io.observe(cv);

		function frame(now: number) {
			if (!started) started = now;
			const t = (now - started) % LOOP;
			draw(ctx!, kind, t);
			raf = requestAnimationFrame(frame);
		}

		// `atMs` pins the loop to one moment — used to check a specific beat
		// without waiting for it, and by anything that wants a still frame.
		if (typeof atMs === 'number') draw(ctx, kind, atMs % LOOP);
		else if (mq.matches) draw(ctx, kind, LOOP * 0.55); // one settled frame
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
	'one-sun': 'A looping demonstration: a cursor moves across a page and every element casts a long shadow that swings with it, warming as the light lowers.',
	typeset: 'A looping demonstration: a page dims from the top down and comes back re-set in a different typeface with corrected line height.',
	'by-hand': 'A looping demonstration: a page is redrawn box by box in pen strokes on paper, in reading order.',
};

// ---------------------------------------------------------------------------

function draw(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number) {
	ctx.clearRect(0, 0, W, H);
	// phase: 0 before, 1 arriving, 2 held, 3 leaving
	const p = t / LOOP;
	const arrive = clamp01((p - 0.12) / 0.3); // 0 → 1 as the effect lands
	const leave = clamp01((p - 0.86) / 0.1);
	const on = arrive * (1 - leave);

	if (kind === 'one-sun') drawSun(ctx, t, on);
	else if (kind === 'typeset') drawTypeset(ctx, t, on, p);
	else drawByHand(ctx, t, on);

	drawMotes(ctx, kind, t, on);
}

/** The page itself, in whichever palette the effect calls for. */
function paintPage(
	ctx: CanvasRenderingContext2D,
	opts: { paper: string; ink: string; accent: string; flat?: boolean; font?: string; headFont?: string }
) {
	ctx.fillStyle = opts.paper;
	ctx.fillRect(0, 0, W, H);
	for (const b of BOXES) {
		if (b.kind === 'nav') {
			ctx.fillStyle = opts.flat ? 'transparent' : opts.accent;
			if (!opts.flat) ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = opts.flat ? opts.ink : '#ffffff';
			ctx.font = `600 11px ${opts.headFont || 'Georgia, serif'}`;
			ctx.fillText(b.text!, 14, 17);
		} else if (b.kind === 'head') {
			ctx.fillStyle = opts.ink;
			ctx.font = `400 17px ${opts.headFont || 'Georgia, serif'}`;
			ctx.fillText(b.text!, b.x, b.y + 14);
		} else if (b.kind === 'line') {
			ctx.fillStyle = opts.ink;
			ctx.globalAlpha = 0.22;
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.globalAlpha = 1;
		} else if (b.kind === 'media') {
			const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
			g.addColorStop(0, '#2e6ea8');
			g.addColorStop(1, '#b4472e');
			ctx.fillStyle = opts.flat ? 'rgba(0,0,0,0.05)' : g;
			ctx.fillRect(b.x, b.y, b.w, b.h);
		} else if (b.kind === 'card') {
			ctx.fillStyle = opts.flat ? 'transparent' : 'rgba(0,0,0,0.05)';
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.strokeStyle = 'rgba(0,0,0,0.12)';
			ctx.lineWidth = 1;
			ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
			ctx.fillStyle = opts.ink;
			ctx.globalAlpha = 0.3;
			ctx.fillRect(b.x + 10, b.y + 11, b.w * 0.5, 5);
			ctx.fillRect(b.x + 10, b.y + 22, b.w * 0.72, 4);
			ctx.globalAlpha = 1;
		} else if (b.kind === 'btn') {
			ctx.fillStyle = opts.flat ? 'transparent' : opts.accent;
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = opts.flat ? opts.ink : '#fff';
			ctx.font = `500 9px ${opts.font || 'ui-sans-serif, system-ui'}`;
			ctx.fillText(b.text!, b.x + 9, b.y + 13);
		}
	}
}

// ---- One Sun ---------------------------------------------------------------

function drawSun(ctx: CanvasRenderingContext2D, t: number, on: number) {
	// The sun travels, so the shadows swing — the whole point of the effect.
	const a = (t / LOOP) * Math.PI * 2;
	const sx = W * 0.5 + Math.cos(a - 1.2) * W * 0.42;
	const sy = -30 + Math.sin(a * 0.8) * 26;
	// as the loop nears its end the light lowers and warms
	const sink = clamp01(((t / LOOP) - 0.55) / 0.3);
	const warm = `rgba(255, ${Math.round(212 - sink * 40)}, ${Math.round(150 - sink * 60)}, `;

	ctx.save();

	// Paper first, then the shadows, then the page on top of them — so the
	// shadows read as being underneath, which is the whole illusion.
	ctx.fillStyle = '#fffdf8';
	ctx.fillRect(0, 0, W, H);

	// one shared direction, length by depth — a distant sun
	const dx = W / 2 - sx;
	const dy = H / 2 - sy;
	const l = Math.hypot(dx, dy) || 1;
	const ux = (dx / l) * (1 + sink * 1.6) * on;
	const uy = (dy / l) * (1 + sink * 1.6) * on;

	if (on > 0.01) {
		for (const b of BOXES) {
			if (b.kind === 'line') continue; // rules don't float
			const h = b.depth * 5.2;
			ctx.fillStyle = `rgba(46, 34, 22, ${(0.42 * on).toFixed(3)})`;
			ctx.filter = `blur(${(1.6 + b.depth * 0.8).toFixed(1)}px)`;
			ctx.fillRect(b.x + ux * h, b.y + uy * h, b.w, b.h);
			ctx.filter = 'none';
		}
		// text throws its own shadow, letter-shaped — the moment of the thing
		ctx.save();
		ctx.filter = 'blur(1.4px)';
		ctx.fillStyle = `rgba(46, 34, 22, ${(0.5 * on).toFixed(3)})`;
		for (const b of BOXES) {
			if (b.kind !== 'head') continue;
			const h = b.depth * 5.2;
			ctx.font = '400 17px Georgia, serif';
			ctx.fillText(b.text!, b.x + ux * h, b.y + 14 + uy * h);
		}
		ctx.restore();
	}

	paintPageOver(ctx);

	if (on > 0.01) {
		const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.8);
		g.addColorStop(0, warm + (0.34 * on).toFixed(3) + ')');
		g.addColorStop(0.5, warm + (0.08 * on).toFixed(3) + ')');
		g.addColorStop(1, 'rgba(255,200,150,0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
	}
	ctx.restore();
	drawCursor(ctx, sx, Math.max(2, sy + 40), on);
}

/** Re-draw only the page's own marks, so shadows sit behind them. */
function paintPageOver(ctx: CanvasRenderingContext2D) {
	for (const b of BOXES) {
		if (b.kind === 'media') {
			const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
			g.addColorStop(0, '#2e6ea8');
			g.addColorStop(1, '#b4472e');
			ctx.fillStyle = g;
			ctx.fillRect(b.x, b.y, b.w, b.h);
		} else if (b.kind === 'nav' || b.kind === 'btn') {
			ctx.fillStyle = '#123a5e';
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = '#fff';
			ctx.font = b.kind === 'nav' ? '600 11px Georgia, serif' : '500 9px ui-sans-serif, system-ui';
			ctx.fillText(b.text!, b.kind === 'nav' ? 14 : b.x + 9, b.kind === 'nav' ? 17 : b.y + 13);
		} else if (b.kind === 'head') {
			ctx.fillStyle = '#1c1c1c';
			ctx.font = '400 17px Georgia, serif';
			ctx.fillText(b.text!, b.x, b.y + 14);
		} else if (b.kind === 'line') {
			ctx.fillStyle = 'rgba(28,28,28,0.22)';
			ctx.fillRect(b.x, b.y, b.w, b.h);
		} else if (b.kind === 'card') {
			ctx.fillStyle = 'rgba(0,0,0,0.05)';
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = 'rgba(28,28,28,0.3)';
			ctx.fillRect(b.x + 10, b.y + 11, b.w * 0.5, 5);
			ctx.fillRect(b.x + 10, b.y + 22, b.w * 0.72, 4);
		}
	}
}

// ---- Typeset ---------------------------------------------------------------

function drawTypeset(ctx: CanvasRenderingContext2D, t: number, on: number, p: number) {
	// the wave: a band travelling down the page, type changed behind it
	const band = clamp01((p - 0.12) / 0.34) * (H + 90) - 45;
	const swapped = (b: Box) => b.y + b.h < band;

	ctx.fillStyle = '#fffdf8';
	ctx.fillRect(0, 0, W, H);

	for (const b of BOXES) {
		const done = on > 0.02 && swapped(b);
		const dip = on > 0.02 && Math.abs(b.y - band) < 40 ? 0.4 : 1;
		ctx.globalAlpha = dip;
		const head = done ? '"Iowan Old Style", Palatino, Georgia, serif' : 'Georgia, serif';
		const body = done ? 'Charter, Cambria, Georgia, serif' : 'ui-sans-serif, system-ui';
		if (b.kind === 'nav') {
			ctx.fillStyle = '#123a5e';
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = '#fff';
			ctx.font = `600 11px ${head}`;
			ctx.fillText(b.text!, 14, 17);
		} else if (b.kind === 'head') {
			ctx.fillStyle = '#1c1c1c';
			ctx.font = `400 ${done ? 18 : 17}px ${head}`;
			ctx.fillText(b.text!, b.x, b.y + 14);
		} else if (b.kind === 'line') {
			// leading correction: lines settle further apart once re-set
			ctx.fillStyle = 'rgba(28,28,28,0.22)';
			ctx.fillRect(b.x, b.y + (done ? 2 : 0), b.w * (done ? 0.88 : 1), b.h);
		} else if (b.kind === 'media') {
			const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
			g.addColorStop(0, '#2e6ea8');
			g.addColorStop(1, '#b4472e');
			ctx.fillStyle = g;
			ctx.fillRect(b.x, b.y, b.w, b.h);
		} else if (b.kind === 'card') {
			ctx.strokeStyle = 'rgba(0,0,0,0.12)';
			ctx.lineWidth = 1;
			ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
			ctx.fillStyle = 'rgba(28,28,28,0.3)';
			ctx.fillRect(b.x + 10, b.y + 11, b.w * 0.5, 5);
			ctx.fillRect(b.x + 10, b.y + 22, b.w * 0.72, 4);
		} else if (b.kind === 'btn') {
			ctx.fillStyle = '#123a5e';
			ctx.fillRect(b.x, b.y, b.w, b.h);
			ctx.fillStyle = '#fff';
			ctx.font = `500 9px ${body}`;
			ctx.fillText(b.text!, b.x + 9, b.y + 13);
		}
		ctx.globalAlpha = 1;
	}

	if (on > 0.02 && band > -40 && band < H + 40) {
		const g = ctx.createLinearGradient(0, band - 44, 0, band);
		g.addColorStop(0, 'rgba(233,167,60,0)');
		g.addColorStop(1, 'rgba(233,167,60,0.16)');
		ctx.fillStyle = g;
		ctx.fillRect(0, band - 44, W, 44);
		ctx.fillStyle = 'rgba(233,167,60,0.85)';
		ctx.fillRect(0, band, W, 1.4);
	}
}

// ---- By Hand ---------------------------------------------------------------

function drawByHand(ctx: CanvasRenderingContext2D, t: number, on: number) {
	ctx.fillStyle = on > 0.02 ? '#fbfaf7' : '#fffdf8';
	ctx.fillRect(0, 0, W, H);

	if (on < 0.02) {
		paintPage(ctx, { paper: '#fffdf8', ink: '#1c1c1c', accent: '#123a5e' });
		return;
	}

	// strokes arrive in reading order
	const order = [...BOXES].sort((a, b) => a.y - b.y || a.x - b.x);
	const per = 1 / (order.length + 3);

	ctx.strokeStyle = 'rgba(60,58,55,0.5)';
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	order.forEach((b, i) => {
		const local = clamp01((on - i * per * 0.9) / (per * 2.4));
		if (local <= 0) return;
		const segs: [number, number, number, number][] = [
			[b.x, b.y, b.x + b.w, b.y],
			[b.x + b.w, b.y, b.x + b.w, b.y + b.h],
			[b.x + b.w, b.y + b.h, b.x, b.y + b.h],
			[b.x, b.y + b.h, b.x, b.y],
		];
		for (let s = 0; s < 4; s++) {
			const sl = clamp01((local - s / 4) * 4);
			if (sl <= 0) continue;
			wobbleLine(ctx, segs[s], i * 4 + s, sl);
		}
		// text, in a hand
		if (b.text) {
			ctx.fillStyle = `rgba(60,58,55,${(0.85 * local).toFixed(2)})`;
			ctx.font =
				b.kind === 'head'
					? '400 17px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
					: '500 10px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
			ctx.fillText(b.text, b.x + (b.kind === 'btn' ? 9 : b.kind === 'nav' ? 14 : 0), b.y + (b.kind === 'nav' ? 17 : b.kind === 'btn' ? 13 : 14));
		}
		if (b.kind === 'line') {
			ctx.fillStyle = `rgba(60,58,55,${(0.28 * local).toFixed(2)})`;
			ctx.fillRect(b.x, b.y, b.w * local, b.h * 0.6);
		}
	});
}

function wobbleLine(
	ctx: CanvasRenderingContext2D,
	[x1, y1, x2, y2]: [number, number, number, number],
	seed: number,
	prog: number
) {
	const len = Math.hypot(x2 - x1, y2 - y1);
	const steps = Math.max(4, Math.round(len / 12));
	const nx = -(y2 - y1) / (len || 1);
	const ny = (x2 - x1) / (len || 1);
	const upto = Math.max(1, Math.round(steps * prog));
	ctx.beginPath();
	for (let i = 0; i <= upto; i++) {
		const tt = i / steps;
		const off = (hash(seed * 31 + i, 2) - 0.5) * 2.4;
		const px = x1 + (x2 - x1) * tt + nx * off;
		const py = y1 + (y2 - y1) * tt + ny * off;
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.lineWidth = 1.1;
	ctx.stroke();
}

// ---- shared: the cursor, and the motes that merge into it ------------------

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, on: number) {
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
	ctx.fillStyle = '#ECE6DB';
	ctx.strokeStyle = 'rgba(7,8,10,0.8)';
	ctx.lineWidth = 1;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

/** Each effect has its own species. They come in from an edge, curl toward
 *  the cursor, and are taken by it — on a rhythm you can't predict. */
function drawMotes(ctx: CanvasRenderingContext2D, kind: PreviewKind, t: number, on: number) {
	if (on < 0.05) return;
	const cursor = cursorAt(kind, t);
	const N = 7;
	for (let i = 0; i < N; i++) {
		// each mote runs its own cycle, at its own offset — never in step
		const cycle = 2600 + hash(i, 1) * 3400;
		const phase = ((t + hash(i, 2) * 9000) % cycle) / cycle;
		if (phase > 0.94) continue;
		const edge = Math.floor(hash(i, 3) * 4);
		const along = hash(i, 4);
		const s =
			edge === 0 ? { x: along * W, y: -8 } :
			edge === 1 ? { x: W + 8, y: along * H } :
			edge === 2 ? { x: along * W, y: H + 8 } :
			{ x: -8, y: along * H };
		const e = 1 - Math.pow(1 - phase, 2.4);
		const dx = cursor.x - s.x;
		const dy = cursor.y - s.y;
		const nl = Math.hypot(-dy, dx) || 1;
		const swing = Math.sin(phase * Math.PI) * (hash(i, 5) - 0.5) * 120;
		const x = s.x + dx * e + (-dy / nl) * swing;
		const y = s.y + dy * e + (dx / nl) * swing;
		const near = Math.hypot(cursor.x - x, cursor.y - y);
		const merging = near < 18 ? 1 - near / 18 : 0;
		const a = (Math.sin(phase * Math.PI) * 0.9 + 0.1) * on;

		if (kind === 'typeset') {
			const glyphs = ['a', 'g', 'e', '&', 'Q', '¶', '@'];
			ctx.save();
			ctx.font = `${9 + hash(i, 6) * 9 + merging * 7}px "Iowan Old Style", Palatino, Georgia, serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(2)})`;
			ctx.shadowBlur = 10;
			ctx.fillStyle = `rgba(255,240,210,${a.toFixed(2)})`;
			ctx.fillText(glyphs[i % glyphs.length], x, y);
			ctx.restore();
		} else if (kind === 'by-hand') {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(phase * 6 + i);
			ctx.strokeStyle = `rgba(60,58,55,${a.toFixed(2)})`;
			ctx.shadowColor = `rgba(60,58,55,${(a * 0.6).toFixed(2)})`;
			ctx.shadowBlur = 6;
			ctx.lineWidth = 1.2;
			ctx.lineCap = 'round';
			const L = 4 + hash(i, 7) * 5 + merging * 6;
			ctx.beginPath();
			ctx.moveTo(-L / 2, 0);
			ctx.lineTo(L / 2, 0);
			ctx.stroke();
			ctx.restore();
		} else {
			const r = (1 + hash(i, 8) * 1.6) * (1 + merging * 3);
			const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
			g.addColorStop(0, `rgba(255,226,170,${(a * 0.95).toFixed(2)})`);
			g.addColorStop(0.35, `rgba(255,214,140,${(a * 0.32).toFixed(2)})`);
			g.addColorStop(1, 'rgba(255,214,140,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r * 5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = `rgba(255,255,255,${(a * 0.85).toFixed(2)})`;
			ctx.beginPath();
			ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	if (kind !== 'one-sun') drawCursor(ctx, cursor.x, cursor.y, on);
}

function cursorAt(kind: PreviewKind, t: number) {
	const a = (t / LOOP) * Math.PI * 2;
	if (kind === 'one-sun') {
		return { x: W * 0.5 + Math.cos(a - 1.2) * W * 0.42, y: 10 + Math.sin(a * 0.8) * 26 };
	}
	// a hand moving over the page, unhurried
	return {
		x: W * 0.5 + Math.cos(a * 0.9) * W * 0.3,
		y: H * 0.5 + Math.sin(a * 1.4) * H * 0.3,
	};
}
