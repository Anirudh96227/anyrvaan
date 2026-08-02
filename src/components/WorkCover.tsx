/**
 * WORK COVER
 * -------------------------------------------------------------------------
 * A card face drawn in code instead of photographed. Used on the /work index
 * (and anywhere a work card renders) for the one project whose subject IS the
 * renderer — so the card demonstrates the claim rather than illustrating it
 * with a still the system happened to produce.
 *
 *   render-mandala   A plotter arm sweeps once around the frame, laying down
 *                    rings, spokes and petals as it passes their angle. It
 *                    holds a breath on the finished figure, clears, and starts
 *                    the next one with different parameters — symmetry, ring
 *                    count, petal width — while a counter climbs toward three
 *                    hundred. Devotion on the canvas, a batch queue underneath.
 *
 * Authored at 1120×630 and displayed around 500, so hairlines stay hairlines.
 * Contract, same as the rest of the site: one still, fully composed frame
 * under prefers-reduced-motion, and zero frames while off-screen.
 */

import { useEffect, useRef } from 'react';
import { EXTRA_MOTIFS, type ExtraMotif } from './cover-motifs';

export type CoverMotif = 'render-mandala' | ExtraMotif;

const W = 1120;
const H = 630;

/** One render, start to finish. */
const CYCLE = 4200;
/** The batch is already well underway by the time anyone arrives. */
const BASE = 46;
const TOTAL = 300;
/** Cells in the progress strip — one row of the queue, recycled. */
const CELLS = 30;

const UI = '"Space Grotesk", ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const TAU = Math.PI * 2;

// ---- shared maths ---------------------------------------------------------

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

// ---- palette --------------------------------------------------------------
// The site's neutral ramp plus the one cobalt it already uses for light. The
// accent marks what the machine is doing right now; everything it has already
// laid down settles back to neutral.

const C = {
	void: '#08090b',
	line: '#23272d',
	ink: '#e9ecf1',
	sub: '#8b939d',
	faint: '#565d66',
	accent: '139, 166, 255',
};

// ---- geometry -------------------------------------------------------------

const CX = W / 2;
const CY = 282;
const R = 190;

/**
 * Every render is the same code with different numbers. Symmetry, ring count
 * and petal width come off the job number, so no two passes in a row look
 * alike and none of them were designed by hand.
 */
function params(seed: number) {
	const k = [6, 8, 12, 10][seed % 4];
	const rings = 3 + (seed % 3);
	return {
		k,
		rings,
		rot: hash(seed, 3) * TAU,
		wide: 0.16 + hash(seed, 7) * 0.14,
		dot: hash(seed, 11) > 0.45,
	};
}

/** A leaf pointing outward from the centre, drawn as two mirrored curves. */
function petal(
	ctx: CanvasRenderingContext2D,
	th: number,
	r0: number,
	r1: number,
	wide: number
) {
	const ux = Math.cos(th);
	const uy = Math.sin(th);
	const nx = -uy;
	const ny = ux;
	const span = (r1 - r0) * wide;
	const mr = (r0 + r1) / 2;
	const ix = CX + ux * r0;
	const iy = CY + uy * r0;
	const ox = CX + ux * r1;
	const oy = CY + uy * r1;
	const mx = CX + ux * mr;
	const my = CY + uy * mr;
	ctx.beginPath();
	ctx.moveTo(ix, iy);
	ctx.quadraticCurveTo(mx + nx * span, my + ny * span, ox, oy);
	ctx.quadraticCurveTo(mx - nx * span, my - ny * span, ix, iy);
	ctx.closePath();
}

/** The corner ticks of a render viewport — the frame the machine works inside. */
function viewport(ctx: CanvasRenderingContext2D) {
	const pad = R + 46;
	const arm = 26;
	ctx.strokeStyle = C.line;
	ctx.lineWidth = 1.5;
	for (const sx of [-1, 1]) {
		for (const sy of [-1, 1]) {
			const x = CX + sx * pad;
			const y = CY + sy * pad;
			ctx.beginPath();
			ctx.moveTo(x - sx * arm, y);
			ctx.lineTo(x, y);
			ctx.lineTo(x, y - sy * arm);
			ctx.stroke();
		}
	}
}

// ---- the figure -----------------------------------------------------------

/**
 * `p` is how far the arm has travelled, 0..1 of a full turn. Anything whose
 * angle the arm has already passed is on the canvas; anything ahead of it
 * isn't there yet.
 */
function mandala(ctx: CanvasRenderingContext2D, p: number, seed: number, glow: number) {
	const { k, rings, rot, wide, dot } = params(seed);
	const start = -Math.PI / 2 + rot;
	const arm = start + TAU * p;

	// Light gathering under the figure as it completes.
	if (glow > 0.01) {
		const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
		g.addColorStop(0, `rgba(${C.accent}, ${(0.11 * glow).toFixed(3)})`);
		g.addColorStop(1, `rgba(${C.accent}, 0)`);
		ctx.fillStyle = g;
		ctx.fillRect(CX - R * 1.5, CY - R * 1.5, R * 3, R * 3);
	}

	// Rings: every one is drawn at once, by the same arm, in one turn.
	ctx.lineCap = 'round';
	for (let i = 0; i < rings; i++) {
		const r = R * ((i + 1) / rings);
		ctx.strokeStyle = i === rings - 1 ? 'rgba(233, 236, 241, 0.6)' : 'rgba(233, 236, 241, 0.3)';
		ctx.lineWidth = i === rings - 1 ? 1.6 : 1.1;
		ctx.beginPath();
		ctx.arc(CX, CY, r, start, arm);
		ctx.stroke();
	}

	// Spokes — the underlying scaffold, kept faint so the petals carry the figure.
	for (let j = 0; j < k; j++) {
		const frac = j / k;
		const pop = easeOut(ramp(p, frac, frac + 0.08));
		if (pop <= 0) continue;
		const th = start + frac * TAU;
		ctx.strokeStyle = `rgba(233, 236, 241, ${(0.1 * pop).toFixed(3)})`;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(CX, CY);
		ctx.lineTo(CX + Math.cos(th) * R, CY + Math.sin(th) * R);
		ctx.stroke();

		if (dot) {
			ctx.fillStyle = `rgba(${C.accent}, ${(0.7 * pop).toFixed(3)})`;
			ctx.beginPath();
			ctx.arc(CX + Math.cos(th) * R, CY + Math.sin(th) * R, 3, 0, TAU);
			ctx.fill();
		}
	}

	// Petals, ring by ring, each landing as the arm reaches its own angle.
	// Alternate rings are offset by half a slot so the rows interlock instead
	// of stacking into one long spoke — the difference between a mandala and
	// a radar sweep.
	for (let i = 0; i < rings; i++) {
		const r0 = R * (i / rings) + 3;
		const r1 = R * ((i + 1) / rings);
		const mr = (r0 + r1) / 2;
		const shift = (i % 2) * 0.5;
		// Wide enough to touch its neighbours, never wider than its own slot.
		const span = Math.min((r1 - r0) * 0.62, ((mr * TAU) / k) * (0.3 + wide));
		const outer = i === rings - 1;
		for (let j = 0; j < k; j++) {
			const frac = (j + shift) / k;
			const pop = easeOut(ramp(p, frac, frac + 0.09));
			if (pop <= 0) continue;
			const th = start + frac * TAU;
			petal(ctx, th, r0, r0 + (r1 - r0) * pop, span / Math.max(1, r1 - r0));
			ctx.fillStyle = `rgba(${C.accent}, ${(0.08 + 0.09 * (i / rings)).toFixed(3)})`;
			ctx.fill();
			ctx.strokeStyle = `rgba(233, 236, 241, ${((outer ? 0.52 : 0.34) * pop).toFixed(3)})`;
			ctx.lineWidth = outer ? 1.3 : 1;
			ctx.stroke();
		}
	}

	// Centre.
	ctx.fillStyle = `rgba(${C.accent}, 0.9)`;
	ctx.beginPath();
	ctx.arc(CX, CY, 4, 0, TAU);
	ctx.fill();

	// The arm itself, only while it is still working.
	if (p > 0 && p < 1) {
		const ex = CX + Math.cos(arm) * R;
		const ey = CY + Math.sin(arm) * R;
		const line = ctx.createLinearGradient(CX, CY, ex, ey);
		line.addColorStop(0, `rgba(${C.accent}, 0)`);
		line.addColorStop(1, `rgba(${C.accent}, 0.55)`);
		ctx.strokeStyle = line;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(CX, CY);
		ctx.lineTo(ex, ey);
		ctx.stroke();

		const head = ctx.createRadialGradient(ex, ey, 0, ex, ey, 26);
		head.addColorStop(0, `rgba(${C.accent}, 0.55)`);
		head.addColorStop(1, `rgba(${C.accent}, 0)`);
		ctx.fillStyle = head;
		ctx.beginPath();
		ctx.arc(ex, ey, 26, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#f4f6fa';
		ctx.beginPath();
		ctx.arc(ex, ey, 2.6, 0, TAU);
		ctx.fill();
	}
}

// ---- the machine around it ------------------------------------------------

function chrome(ctx: CanvasRenderingContext2D, count: number, p: number, seed: number) {
	const { k, rings } = params(seed);
	const spaced = 'letterSpacing' in ctx;

	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	if (spaced) ctx.letterSpacing = '4px';
	ctx.font = `500 20px ${UI}`;
	ctx.fillStyle = C.sub;
	ctx.fillText(p < 1 ? 'RENDERING' : 'RENDERED', 56, 70);
	if (spaced) ctx.letterSpacing = '0px';

	// The count, large enough to read at card size.
	ctx.font = `500 42px ${UI}`;
	ctx.fillStyle = C.ink;
	const label = String(count).padStart(3, '0');
	ctx.fillText(label, 56, 542);
	const lw = ctx.measureText(label).width;
	ctx.font = `400 22px ${UI}`;
	ctx.fillStyle = C.faint;
	ctx.fillText(` / ${TOTAL}`, 56 + lw + 4, 542);

	// The parameters this pass ran with — the part that changes by itself.
	ctx.textAlign = 'right';
	ctx.font = `400 20px ${UI}`;
	ctx.fillStyle = C.faint;
	ctx.fillText(`seed ${label} · sym ${k} · rings ${rings}`, W - 56, 542);
	ctx.textAlign = 'left';

	// The queue: one row of thirty, filling and recycling.
	const x0 = 56;
	const stripW = W - 112;
	const gap = 7;
	const cw = (stripW - gap * (CELLS - 1)) / CELLS;
	const y = 574;
	const done = (count - 1) % CELLS;
	for (let i = 0; i < CELLS; i++) {
		const x = x0 + i * (cw + gap);
		if (i < done) {
			ctx.fillStyle = `rgba(${C.accent}, 0.42)`;
			ctx.fillRect(x, y, cw, 10);
		} else if (i === done) {
			ctx.fillStyle = C.line;
			ctx.fillRect(x, y, cw, 10);
			ctx.fillStyle = `rgba(${C.accent}, 0.95)`;
			ctx.fillRect(x, y, cw * clamp01(p), 10);
		} else {
			ctx.fillStyle = C.line;
			ctx.fillRect(x, y, cw, 10);
		}
	}
}

function draw(ctx: CanvasRenderingContext2D, ms: number) {
	const cycle = Math.floor(ms / CYCLE);
	const t = (ms % CYCLE) / CYCLE;
	const seed = BASE + cycle;
	const count = ((seed - 1) % TOTAL) + 1;

	// Sweep, hold, clear. The arm travels at a constant rate because that's what
	// a machine does; the hold afterwards is the part that isn't machinery — the
	// only reason to slow down is so the thing it made can be looked at.
	const p = ramp(t, 0.03, 0.64);
	const glow = ramp(t, 0.48, 0.7);
	const out = 1 - easeOut(ramp(t, 0.9, 1));

	ctx.fillStyle = C.void;
	ctx.fillRect(0, 0, W, H);

	viewport(ctx);

	// The one before it, still faintly on the bed while the next is laid down.
	// Three hundred of these went past; the card shouldn't read as empty just
	// because the arm happens to be at the start of a turn.
	const ghost = 0.26 * (1 - clamp01(p * 1.7));
	if (ghost > 0.004) {
		ctx.save();
		ctx.globalAlpha = ghost * out;
		mandala(ctx, 1, seed - 1, 0);
		ctx.restore();
	}

	ctx.save();
	ctx.globalAlpha = out;
	mandala(ctx, p, seed, glow * out);
	ctx.restore();

	chrome(ctx, count, p, seed);
}

/** Dispatch: one motif per project that draws its own face. */
function paint(ctx: CanvasRenderingContext2D, motif: CoverMotif, ms: number) {
	if (motif === 'render-mandala') draw(ctx, ms);
	else EXTRA_MOTIFS[motif].draw(ctx, W, H, ms);
}

/** The frame each motif holds for a visitor who has asked for no motion. */
function stillAt(motif: CoverMotif): number {
	if (motif === 'render-mandala') return CYCLE * 0.78;
	return EXTRA_MOTIFS[motif].still;
}

// ---- component ------------------------------------------------------------

const BASE_LABELS: Record<'render-mandala', string> = {
	'render-mandala':
		'A mandala plotted ring by ring by a batch renderer — an arm sweeping once around the frame laying down petals as it passes — with the job number, its parameters, and a queue counting toward three hundred underneath.',
};

function labelFor(motif: CoverMotif): string {
	if (motif === 'render-mandala') return BASE_LABELS[motif];
	return EXTRA_MOTIFS[motif].label;
}

export default function WorkCover({
	motif,
	className = '',
	atMs,
}: {
	motif: CoverMotif;
	className?: string;
	/** Pin a single frame instead of running the loop — for stills and review. */
	atMs?: number;
}) {
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
			paint(ctx!, motif, now - started);
			raf = requestAnimationFrame(frame);
		}

		// A card grid is several of these at once; the ones nobody has scrolled
		// to should cost nothing.
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
		 * Canvas takes no part in font-display: swap — whatever face is loaded
		 * when fillText runs is what gets drawn, permanently. So wait for Space
		 * Grotesk, or a still frame ends up set in a fallback.
		 */
		function begin() {
			if (!alive) return;
			io.observe(cv!);
			// Reduced motion gets the frame worth keeping: one finished figure,
			// mid-hold, nothing moving.
			if (pinned) paint(ctx!, motif, atMs!);
			else if (mq.matches) paint(ctx!, motif, stillAt(motif));
			else raf = requestAnimationFrame(frame);
		}

		const fonts = (document as Document).fonts;
		if (fonts) {
			Promise.all([fonts.load(`400 22px ${UI}`), fonts.load(`500 42px ${UI}`)])
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
	}, [motif, atMs]);

	return (
		<canvas
			ref={canvasRef}
			className={`block aspect-video w-full ${className}`}
			role="img"
			aria-label={labelFor(motif)}
			style={{ background: C.void }}
		/>
	);
}
