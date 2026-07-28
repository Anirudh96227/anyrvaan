/**
 * TOOL PREVIEWS
 * -------------------------------------------------------------------------
 * One canvas per calculator, running on a loop. Same architecture as
 * ExtensionPreview — one clock, one draw call, no recording — but these have a
 * different job. An extension preview shows you an effect. A calculator has no
 * effect to show, so instead each of these animates the one thing about its
 * subject that people get wrong:
 *
 *   concrete    a slab fills, bags count out, and the waste allowance lands as
 *               ten more bags on top — because the volume was never the hard
 *               part, the bag count is.
 *   electrical  five appliances add up to 2,900 W, then one motor starts and
 *               the draw jumps to 4,450 W — the reason a 3.5 kW generator is
 *               the wrong answer to "I need 2,900 watts".
 *   hvac        the same 151 CFM through a 5" duct and a 7" duct, so the
 *               velocity difference is something you watch rather than read.
 *
 * Authored at 1120×630 and displayed around 900, so hairlines stay hairlines
 * and text has enough pixels to hold an edge.
 */

import React, { useEffect, useRef } from 'react';

export type ToolKind = 'concrete' | 'electrical' | 'hvac';

const W = 1120;
const H = 630;
const LOOP = 11000;

const UI = '"Space Grotesk", ui-sans-serif, system-ui, "Segoe UI", sans-serif';

// ---- shared maths ---------------------------------------------------------

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
	const x = clamp01(t);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Damped harmonic oscillator, sampled at `t` seconds — same solver as the films. */
function spring(t: number, stiffness = 170, damping = 20, mass = 1) {
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

// ---- palette --------------------------------------------------------------
// The same neutral ramp the site runs on, plus three signal colours used
// sparingly: amber for "this is the bit that catches people out", red for an
// actual overload, green only once a number has come back inside its limit.

const C = {
	void: '#0a0b0d',
	panel: '#131518',
	panelUp: '#191c20',
	line: '#25282d',
	lineUp: '#33373d',
	ink: '#eef0f3',
	sub: '#9aa2ac',
	faint: '#6d757f',
	dim: '#4a515a',
	accent: '#8ba6ff',
	warn: '#f2b53c',
	hot: '#e8564a',
	good: '#3fa96a',
	grey: '#8d9199',
	greyDk: '#5e636b',
};

// ---- canvas helpers -------------------------------------------------------

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

type TextOpts = {
	size?: number;
	weight?: number;
	color?: string;
	align?: CanvasTextAlign;
	track?: number;
	alpha?: number;
};

/**
 * `letterSpacing` is the only way to track canvas text without drawing it a
 * glyph at a time, and it is missing on older Safari — so it is set behind a
 * feature check and always put back, since the property is sticky on the
 * context rather than part of the save/restore state in every engine.
 */
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}) {
	const { size = 16, weight = 400, color = C.ink, align = 'left', track = 0, alpha = 1 } = o;
	if (alpha <= 0.002) return;
	ctx.save();
	ctx.globalAlpha *= alpha;
	ctx.font = `${weight} ${size}px ${UI}`;
	ctx.fillStyle = color;
	ctx.textAlign = align;
	ctx.textBaseline = 'alphabetic';
	const canTrack = 'letterSpacing' in ctx;
	if (track && canTrack) (ctx as any).letterSpacing = `${track}px`;
	ctx.fillText(s, x, y);
	if (track && canTrack) (ctx as any).letterSpacing = '0px';
	ctx.restore();
}

/** Small caps-ish label — the canvas equivalent of the site's `text-eyebrow`. */
function eyebrow(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}) {
	text(ctx, s.toUpperCase(), x, y, { size: 12, weight: 500, color: C.faint, track: 2.4, ...o });
}

function dashLine(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	dash: number[] = [5, 5],
	width = 1
) {
	ctx.save();
	ctx.setLineDash(dash);
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.restore();
}

/** Counts a number up over a ramp, so readouts settle rather than snap. */
const countTo = (v: number, p: number) => v * easeOut(p);

const fmt = (n: number, dp = 0) =>
	n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** The panel every readout sits in — one shape, so the three previews match. */
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
	rr(ctx, x, y, w, h, 16);
	ctx.fillStyle = C.panel;
	ctx.fill();
	ctx.strokeStyle = C.line;
	ctx.lineWidth = 1;
	ctx.stroke();
}

/** Every preview opens on the same near-black and lifts on the same fade. */
function stage(ctx: CanvasRenderingContext2D, t: number) {
	ctx.clearRect(0, 0, W, H);
	ctx.fillStyle = C.void;
	ctx.fillRect(0, 0, W, H);
	// In and out at the loop seam, so the reset is a breath rather than a cut.
	const inA = easeOut(ramp(t, 0, 500));
	const outA = 1 - easeInOut(ramp(t, LOOP - 700, LOOP - 60));
	ctx.globalAlpha = Math.min(inA, outA);
}

// =========================================================================
//  CONCRETE — a slab fills, then turns into a bag count
// =========================================================================

// 4.00 m × 3.00 m × 100 mm = 1.20 m³. At 0.0117 m³ per 25 kg bag that is 103
// bags; the 10% waste allowance is the ten extra at the end, which is the
// whole reason the second half of this animation exists.
const SLAB = { l: 4, w: 3, thk: 100, vol: 1.2, bags: 103, bagsWaste: 113 };

const SLAB_BOX = { x: 78, y: 126, w: 480, h: 360 };
const SLAB_PANEL = { x: 620, y: 126, w: 440, h: 384 };

// Aggregate speckle field — fixed positions, revealed as the pour front passes,
// so the fill has grain instead of reading as a flat wash of grey.
const SPECKLES = Array.from({ length: 340 }, (_, i) => ({
	u: hash(i, 1),
	v: hash(i, 2),
	r: 0.7 + hash(i, 3) * 2.1,
	tone: hash(i, 4),
}));

function drawConcrete(ctx: CanvasRenderingContext2D, t: number) {
	const FORM_A = 180, FORM_B = 1150;
	const POUR_A = 1250, POUR_B = 4500;
	const VOL_A = 1600, VOL_B = 4700;
	const BAG_A = 4900, BAG_B = 6700;
	const WASTE_A = 7150, WASTE_B = 8050;

	stage(ctx, t);

	// ---- header ----
	eyebrow(ctx, 'Slab pour', 60, 60, { alpha: easeOut(ramp(t, 0, 500)) });
	text(ctx, `${SLAB.l.toFixed(2)} m × ${SLAB.w.toFixed(2)} m × ${SLAB.thk} mm`, 60, 92, {
		size: 21,
		weight: 500,
		color: C.ink,
		alpha: easeOut(ramp(t, 120, 700)),
	});

	const S = SLAB_BOX;

	// ---- formwork ----
	// The four sides draw in as one perimeter so it reads as timber being set,
	// not as a rectangle appearing.
	const fp = easeInOut(ramp(t, FORM_A, FORM_B));
	const per = 2 * (S.w + S.h);
	ctx.save();
	ctx.strokeStyle = C.lineUp;
	ctx.lineWidth = 3;
	ctx.setLineDash([per * fp, per]);
	ctx.strokeRect(S.x, S.y, S.w, S.h);
	ctx.restore();

	// ---- the pour ----
	const pp = easeInOut(ramp(t, POUR_A, POUR_B));
	if (pp > 0) {
		ctx.save();
		// A wavefront advancing left to right, wobbling as wet concrete does.
		// Clipping to the form is what keeps the wobble from leaking past it.
		rr(ctx, S.x, S.y, S.w, S.h, 2);
		ctx.clip();

		const front = S.x + pp * (S.w + 70) - 35;
		ctx.beginPath();
		ctx.moveTo(S.x - 10, S.y - 10);
		ctx.lineTo(S.x - 10, S.y + S.h + 10);
		for (let y = S.y + S.h + 10; y >= S.y - 10; y -= 12) {
			const wob = Math.sin(y * 0.031 + t * 0.004) * 16 + Math.sin(y * 0.011 - t * 0.002) * 9;
			ctx.lineTo(front + wob, y);
		}
		ctx.closePath();
		ctx.fillStyle = '#767b83';
		ctx.fill();

		// Grain, then a slow sheen across the wet surface.
		for (const sp of SPECKLES) {
			const sx = S.x + sp.u * S.w;
			const sy = S.y + sp.v * S.h;
			if (sx > front - 6) continue;
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = sp.tone > 0.72 ? '#9ba0a8' : sp.tone > 0.36 ? '#63686f' : '#8a8f97';
			ctx.beginPath();
			ctx.arc(sx, sy, sp.r, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;

		// The leading edge is lighter — that is where the water is.
		ctx.strokeStyle = 'rgba(190,196,205,0.5)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		for (let y = S.y - 10; y <= S.y + S.h + 10; y += 12) {
			const wob = Math.sin(y * 0.031 + t * 0.004) * 16 + Math.sin(y * 0.011 - t * 0.002) * 9;
			if (y === S.y - 10) ctx.moveTo(front + wob, y);
			else ctx.lineTo(front + wob, y);
		}
		ctx.stroke();
		ctx.restore();
	}

	// Form edge sits above the pour, so concrete reads as contained by it.
	if (fp >= 1) {
		ctx.strokeStyle = C.lineUp;
		ctx.lineWidth = 3;
		ctx.strokeRect(S.x, S.y, S.w, S.h);
	}

	// ---- chute ----
	// Only present while it is actually pouring; a chute left standing over a
	// finished slab is the kind of detail that makes a loop look fake.
	const chute = easeOut(ramp(t, POUR_A - 350, POUR_A + 150)) * (1 - easeOut(ramp(t, POUR_B - 250, POUR_B + 200)));
	if (chute > 0.01) {
		ctx.save();
		ctx.globalAlpha *= chute;
		ctx.fillStyle = C.panelUp;
		ctx.strokeStyle = C.lineUp;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(S.x - 34, S.y - 66);
		ctx.lineTo(S.x + 34, S.y - 66);
		ctx.lineTo(S.x + 16, S.y - 16);
		ctx.lineTo(S.x - 4, S.y - 16);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// Falling aggregate, seeded per particle so the stream never repeats.
		for (let i = 0; i < 22; i++) {
			const ph = (t * 0.0016 + hash(i, 7)) % 1;
			const px = S.x + 6 - hash(i, 8) * 14;
			const py = S.y - 16 + ph * 40;
			ctx.globalAlpha = chute * (1 - ph) * 0.85;
			ctx.fillStyle = C.grey;
			ctx.beginPath();
			ctx.arc(px, py, 1.6 + hash(i, 9) * 1.6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	// ---- dimension leader under the slab ----
	const dp = easeOut(ramp(t, FORM_B - 200, FORM_B + 500));
	if (dp > 0.01) {
		ctx.save();
		ctx.globalAlpha *= dp;
		const y = S.y + S.h + 30;
		dashLine(ctx, S.x, y, S.x + S.w, y, C.dim, [4, 6]);
		ctx.fillStyle = C.void;
		ctx.fillRect(S.x + S.w / 2 - 44, y - 9, 88, 18);
		text(ctx, '4.00 m', S.x + S.w / 2, y + 5, { size: 13, color: C.faint, align: 'center' });
		ctx.restore();
	}

	// ---- readout ----
	const P = SLAB_PANEL;
	const rp = easeOut(ramp(t, 700, 1400));
	ctx.save();
	ctx.globalAlpha *= rp;
	panel(ctx, P.x, P.y, P.w, P.h);

	eyebrow(ctx, 'Volume', P.x + 26, P.y + 40);
	const volP = ramp(t, VOL_A, VOL_B);
	const wasteP = easeOut(ramp(t, WASTE_A, WASTE_B));
	const vol = countTo(SLAB.vol, volP) * (1 + 0.1 * wasteP);
	text(ctx, vol.toFixed(2), P.x + 26, P.y + 90, { size: 44, weight: 500, color: C.ink });
	text(ctx, 'm³', P.x + 122, P.y + 90, { size: 18, color: C.faint });
	text(ctx, `${(vol * 1.30795).toFixed(2)} yd³ ready-mix`, P.x + P.w - 26, P.y + 90, {
		size: 14,
		color: C.dim,
		align: 'right',
	});

	dashLine(ctx, P.x + 26, P.y + 124, P.x + P.w - 26, P.y + 124, C.line, [3, 4]);

	// Bag grid — 113 rectangles, because a bag count is a quantity you have to
	// lift, and a number alone never conveys that.
	eyebrow(ctx, '25 kg bags', P.x + 26, P.y + 160);
	const bagP = ramp(t, BAG_A, BAG_B);
	const shown = Math.round(countTo(SLAB.bags, bagP));
	const extra = Math.round(countTo(SLAB.bagsWaste - SLAB.bags, ramp(t, WASTE_A, WASTE_B)));
	text(ctx, `${shown + extra}`, P.x + P.w - 26, P.y + 160, {
		size: 22,
		weight: 500,
		color: extra > 0 ? C.warn : C.ink,
		align: 'right',
	});

	const BW = 20, BH = 12, GX = 6, GY = 5, COLS = 14;
	const gx = P.x + 26, gy = P.y + 184;
	for (let i = 0; i < SLAB.bagsWaste; i++) {
		const isExtra = i >= SLAB.bags;
		const live = isExtra ? i - SLAB.bags < extra : i < shown;
		if (!live) continue;
		// Each bag springs in on its own micro-delay, so the grid fills like
		// stock being counted out rather than a bar sliding across.
		const at = isExtra
			? WASTE_A + (i - SLAB.bags) * 26
			: BAG_A + (i / SLAB.bags) * (BAG_B - BAG_A);
		const s = spring((t - at) / 1000, 210, 19);
		const col = i % COLS;
		const row = (i / COLS) | 0;
		const bx = gx + col * (BW + GX);
		const by = gy + row * (BH + GY);
		ctx.save();
		ctx.globalAlpha *= clamp01(s * 1.6);
		ctx.translate(bx + BW / 2, by + BH / 2);
		ctx.scale(0.72 + 0.28 * s, 0.72 + 0.28 * s);
		rr(ctx, -BW / 2, -BH / 2, BW, BH, 3);
		ctx.fillStyle = isExtra ? 'rgba(242,181,60,0.20)' : 'rgba(141,145,153,0.20)';
		ctx.fill();
		ctx.strokeStyle = isExtra ? 'rgba(242,181,60,0.65)' : 'rgba(141,145,153,0.55)';
		ctx.lineWidth = 1;
		ctx.stroke();
		// The band across a bag of cement, at bag scale.
		ctx.fillStyle = isExtra ? 'rgba(242,181,60,0.5)' : 'rgba(141,145,153,0.4)';
		ctx.fillRect(-BW / 2 + 4, -1, BW - 8, 2);
		ctx.restore();
	}
	ctx.restore();

	// ---- the point ----
	const noteP = easeOut(ramp(t, WASTE_B - 250, WASTE_B + 550));
	if (noteP > 0.01) {
		ctx.save();
		ctx.globalAlpha *= noteP;
		const ny = P.y + P.h + 34;
		rr(ctx, 60, ny, 1000, 54, 12);
		ctx.fillStyle = 'rgba(242,181,60,0.05)';
		ctx.fill();
		ctx.strokeStyle = 'rgba(242,181,60,0.22)';
		ctx.lineWidth = 1;
		ctx.stroke();
		text(ctx, '+10% waste', 84, ny + 33, { size: 15, weight: 500, color: C.warn });
		text(
			ctx,
			'— ten more bags. Spillage, an uneven sub-base, and the bit left in the mixer.',
			186,
			ny + 33,
			{ size: 15, color: C.sub }
		);
		ctx.restore();
	}

	ctx.globalAlpha = 1;
}

// =========================================================================
//  ELECTRICAL — five appliances, then one motor starts
// =========================================================================

// Chosen so the arithmetic makes the point on its own: the running total is
// comfortably under 3,500 W, and the peak is not.
const LOADS = [
	{ name: 'Refrigerator', run: 700, surge: 2200 },
	{ name: 'Lighting — LED, whole house', run: 200, surge: 200 },
	{ name: 'TV, router, chargers', run: 200, surge: 200 },
	{ name: 'Well pump — ½ HP', run: 1000, surge: 2100 },
	{ name: 'Furnace blower — ½ HP', run: 800, surge: 2350 },
];

const RUN_TOTAL = LOADS.reduce((a, l) => a + l.run, 0); // 2,900 W
const STARTER = LOADS[4]; // the blower — biggest surge *increment*, not biggest surge
const PEAK = RUN_TOTAL - STARTER.run + STARTER.surge; // 4,450 W

const GEN_SMALL = 3500;
const GEN_RIGHT = 4000;

function drawElectrical(ctx: CanvasRenderingContext2D, t: number) {
	const ON_A = 900, ON_STEP = 520;          // appliances switch on in turn
	const ON_B = ON_A + LOADS.length * ON_STEP;
	const SURGE_A = 4000, SURGE_PK = 4380, SURGE_B = 5400;
	const UP_A = 6100, UP_B = 6900;           // generator steps up a size

	stage(ctx, t);

	eyebrow(ctx, 'Standby load', 60, 60, { alpha: easeOut(ramp(t, 0, 500)) });
	text(ctx, 'What actually has to start', 60, 92, {
		size: 21,
		weight: 500,
		color: C.ink,
		alpha: easeOut(ramp(t, 120, 700)),
	});

	// ---- appliance list ----
	const LX = 60, LY = 150, LW = 430, RH = 62;
	for (let i = 0; i < LOADS.length; i++) {
		const l = LOADS[i];
		const at = ON_A + i * ON_STEP;
		const s = spring((t - at) / 1000, 190, 21);
		const on = clamp01(s * 1.4);
		const y = LY + i * RH;

		ctx.save();
		ctx.globalAlpha *= easeOut(ramp(t, at - 400, at));
		rr(ctx, LX, y, LW, RH - 10, 10);
		ctx.fillStyle = C.panel;
		ctx.fill();
		ctx.strokeStyle = C.line;
		ctx.lineWidth = 1;
		ctx.stroke();

		// The indicator that says this thing is drawing power.
		const isStarting = l === STARTER && t > SURGE_A && t < SURGE_B;
		const pulse = isStarting ? 0.5 + 0.5 * Math.sin((t - SURGE_A) * 0.03) : 0;
		ctx.save();
		ctx.globalAlpha *= 0.35 + 0.65 * on;
		ctx.beginPath();
		ctx.arc(LX + 24, y + 26, 5, 0, Math.PI * 2);
		ctx.fillStyle = isStarting ? C.warn : on > 0.5 ? C.accent : C.dim;
		ctx.fill();
		if (pulse > 0) {
			ctx.beginPath();
			ctx.arc(LX + 24, y + 26, 5 + pulse * 9, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(242,181,60,${0.5 * (1 - pulse)})`;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
		ctx.restore();

		text(ctx, l.name, LX + 44, y + 31, { size: 15, color: on > 0.5 ? C.ink : C.dim });
		text(ctx, `${fmt(Math.round(countTo(l.run, on)))} W`, LX + LW - 20, y + 31, {
			size: 15,
			weight: 500,
			color: on > 0.5 ? C.sub : C.dim,
			align: 'right',
		});
		// The surge figure only matters for the one that is about to start.
		if (isStarting) {
			text(ctx, `starting — ${fmt(l.surge)} W`, LX + LW - 20, y + 48, {
				size: 12,
				color: C.warn,
				align: 'right',
				alpha: 0.9,
			});
		}
		ctx.restore();
	}

	// Running total under the list.
	const totP = ramp(t, ON_A, ON_B);
	const totY = LY + LOADS.length * RH + 22;
	ctx.save();
	ctx.globalAlpha *= easeOut(ramp(t, ON_A, ON_A + 400));
	text(ctx, 'Running total', LX, totY, { size: 14, color: C.faint });
	text(ctx, `${fmt(Math.round(countTo(RUN_TOTAL, totP)))} W`, LX + LW - 20, totY, {
		size: 20,
		weight: 500,
		color: C.ink,
		align: 'right',
	});
	ctx.restore();

	// ---- chart ----
	const CH = { x: 545, y: 140, w: 515, h: 382 };
	const chP = easeOut(ramp(t, 500, 1200));
	ctx.save();
	ctx.globalAlpha *= chP;
	panel(ctx, CH.x, CH.y, CH.w, CH.h);

	const base = CH.y + CH.h - 62;
	const top = CH.y + 52;
	const MAXW = 6000;
	const yOf = (w: number) => base - (clamp01(w / MAXW) * (base - top));

	// Which generator is on the bench right now.
	const upP = easeInOut(ramp(t, UP_A, UP_B));
	const rated = GEN_SMALL + (GEN_RIGHT - GEN_SMALL) * upP;
	const surgeCap = rated * 1.25; // inverter sets are rated about a quarter over

	// Rating lines. The 80% line is the one that does the work — a generator
	// held at its plate rating all night is a generator you replace early.
	dashLine(ctx, CH.x + 20, yOf(rated), CH.x + CH.w - 20, yOf(rated), 'rgba(155,163,173,0.45)', [6, 5]);
	text(ctx, `Rated  ${fmt(Math.round(rated))} W`, CH.x + CH.w - 24, yOf(rated) - 9, {
		size: 12,
		color: C.sub,
		align: 'right',
	});
	dashLine(ctx, CH.x + 20, yOf(rated * 0.8), CH.x + CH.w - 20, yOf(rated * 0.8), 'rgba(242,181,60,0.4)', [3, 5]);
	text(ctx, '80% continuous', CH.x + CH.w - 24, yOf(rated * 0.8) - 9, {
		size: 12,
		color: 'rgba(242,181,60,0.85)',
		align: 'right',
	});
	dashLine(ctx, CH.x + 20, yOf(surgeCap), CH.x + CH.w - 20, yOf(surgeCap), 'rgba(155,163,173,0.22)', [2, 6]);
	text(ctx, `Surge  ${fmt(Math.round(surgeCap))} W`, CH.x + CH.w - 24, yOf(surgeCap) - 9, {
		size: 12,
		color: C.dim,
		align: 'right',
	});

	// Stacked running column.
	const colW = 104;
	const runX = CH.x + 78;
	let acc = 0;
	for (let i = 0; i < LOADS.length; i++) {
		const l = LOADS[i];
		const at = ON_A + i * ON_STEP;
		const g = clamp01(spring((t - at) / 1000, 190, 21) * 1.4);
		const h = (base - yOf(l.run)) * g;
		if (h < 0.5) continue;
		const y = base - acc - h;
		ctx.fillStyle = i % 2 ? 'rgba(139,166,255,0.30)' : 'rgba(139,166,255,0.42)';
		ctx.fillRect(runX, y, colW, h);
		ctx.strokeStyle = 'rgba(139,166,255,0.5)';
		ctx.lineWidth = 1;
		ctx.strokeRect(runX + 0.5, y + 0.5, colW - 1, h - 1);
		acc += h;
	}
	text(ctx, 'Running', runX + colW / 2, base + 26, { size: 13, color: C.faint, align: 'center' });
	text(ctx, `${fmt(Math.round(countTo(RUN_TOTAL, totP)))} W`, runX + colW / 2, base + 46, {
		size: 14,
		weight: 500,
		color: C.sub,
		align: 'center',
	});

	// Peak column — grows only when the blower actually starts, and drops back.
	const pkX = CH.x + 262;
	const surgeIn = easeOut(ramp(t, SURGE_A, SURGE_PK));
	const surgeOut = easeInOut(ramp(t, SURGE_PK + 500, SURGE_B));
	const pkVal = RUN_TOTAL + (PEAK - RUN_TOTAL) * (surgeIn - surgeIn * surgeOut);
	if (totP > 0.02) {
		const h = base - yOf(pkVal * Math.min(1, totP * 1.2));
		const over = pkVal > surgeCap + 1;
		const y = base - h;
		ctx.fillStyle = over ? 'rgba(232,86,74,0.28)' : 'rgba(63,169,106,0.24)';
		ctx.fillRect(pkX, y, colW, h);
		ctx.strokeStyle = over ? 'rgba(232,86,74,0.75)' : 'rgba(63,169,106,0.6)';
		ctx.lineWidth = 1;
		ctx.strokeRect(pkX + 0.5, y + 0.5, colW - 1, h - 1);

		// The cap on the column, so the eye has an edge to track.
		ctx.fillStyle = over ? C.hot : C.good;
		ctx.fillRect(pkX, y - 2, colW, 2.5);

		text(ctx, `${fmt(Math.round(pkVal))} W`, pkX + colW / 2, y - 12, {
			size: 15,
			weight: 500,
			color: over ? C.hot : C.good,
			align: 'center',
		});
		text(ctx, 'Peak', pkX + colW / 2, base + 26, { size: 13, color: C.faint, align: 'center' });
		text(ctx, 'on start', pkX + colW / 2, base + 46, { size: 12, color: C.dim, align: 'center' });
	}

	// Baseline last, so both columns sit on it.
	ctx.strokeStyle = C.lineUp;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(CH.x + 20, base + 0.5);
	ctx.lineTo(CH.x + CH.w - 20, base + 0.5);
	ctx.stroke();

	// Which set is on the bench.
	const genOver = pkVal > surgeCap + 1 || RUN_TOTAL > rated * 0.8;
	text(ctx, `Generator — ${fmt(Math.round(rated))} W`, CH.x + 24, CH.y + 34, {
		size: 14,
		weight: 500,
		color: genOver ? C.warn : C.good,
	});
	ctx.restore();

	// ---- the point ----
	const noteP = easeOut(ramp(t, UP_B - 200, UP_B + 600));
	if (noteP > 0.01) {
		ctx.save();
		ctx.globalAlpha *= noteP;
		const ny = CH.y + CH.h + 34;
		rr(ctx, 60, ny, 1000, 54, 12);
		ctx.fillStyle = 'rgba(139,166,255,0.05)';
		ctx.fill();
		ctx.strokeStyle = 'rgba(139,166,255,0.2)';
		ctx.lineWidth = 1;
		ctx.stroke();
		text(ctx, '2,900 W running', 84, ny + 33, { size: 15, weight: 500, color: C.accent });
		text(
			ctx,
			'— but 4,450 W the moment the blower starts, so the 3.5 kW set is the wrong answer.',
			236,
			ny + 33,
			{ size: 15, color: C.sub }
		);
		ctx.restore();
	}

	ctx.globalAlpha = 1;
}

// =========================================================================
//  HVAC — the same air through two different ducts
// =========================================================================

// 14 × 12 × 9 ft living room = 1,512 ft³. At 6 ACH that is 151 CFM. Through a
// 5" duct it moves at 1,109 FPM, which you can hear; through a 7" it is 566.
const ROOM = { l: 14, w: 12, h: 9, ft3: 1512, ach: 6, cfm: 151 };
const DUCT_SMALL = 5;
const DUCT_RIGHT = 7;

/** Velocity in FPM for a round duct of `dIn` inches passing `cfm`. */
const fpmFor = (cfm: number, dIn: number) => cfm / (Math.PI * Math.pow(dIn / 2, 2) / 144);

const MOTES = Array.from({ length: 46 }, (_, i) => ({
	off: hash(i, 11),
	lane: hash(i, 12),
	sz: 1.3 + hash(i, 13) * 1.6,
	sp: 0.85 + hash(i, 14) * 0.4,
}));

function drawHvac(ctx: CanvasRenderingContext2D, t: number) {
	const ROOM_A = 200, ROOM_B = 1150;
	const AIR_A = 1250;
	const CFM_A = 1500, CFM_B = 3600;
	const DUCT_A = 3900, DUCT_B = 4600;   // the undersized duct arrives
	const UP_A = 6500, UP_B = 7400;       // and steps up a size

	// The duct size drives both halves of this frame — the streak speed in the
	// room and the velocity readout beside it — so it is solved once, here.
	const upP = easeInOut(ramp(t, UP_A, UP_B));
	const dIn = DUCT_SMALL + (DUCT_RIGHT - DUCT_SMALL) * upP;
	const vel = fpmFor(ROOM.cfm, dIn);
	const noisy = vel > 900;

	stage(ctx, t);

	eyebrow(ctx, 'Room ventilation', 60, 60, { alpha: easeOut(ramp(t, 0, 500)) });
	text(ctx, `Living room — ${ROOM.l} × ${ROOM.w} × ${ROOM.h} ft`, 60, 92, {
		size: 21,
		weight: 500,
		color: C.ink,
		alpha: easeOut(ramp(t, 120, 700)),
	});

	// ---- room, in section ----
	const R = { x: 78, y: 140, w: 486, h: 322 };
	const rp = easeInOut(ramp(t, ROOM_A, ROOM_B));
	ctx.save();
	ctx.globalAlpha *= easeOut(ramp(t, ROOM_A, ROOM_A + 400));
	const per = 2 * (R.w + R.h);
	ctx.save();
	ctx.strokeStyle = C.lineUp;
	ctx.lineWidth = 2.5;
	ctx.setLineDash([per * rp, per]);
	ctx.strokeRect(R.x, R.y, R.w, R.h);
	ctx.restore();

	// Floor hatch, so the box reads as a room rather than a rectangle.
	if (rp > 0.9) {
		ctx.save();
		ctx.globalAlpha *= 0.5;
		for (let x = R.x + 12; x < R.x + R.w; x += 22) {
			dashLine(ctx, x, R.y + R.h, x - 11, R.y + R.h + 11, C.dim, [], 1);
		}
		ctx.restore();
	}

	// Supply high on the left wall, return low on the right — the diagonal is
	// the whole reason air crosses the room instead of short-circuiting.
	const grille = (gx: number, gy: number, label: string) => {
		rr(ctx, gx, gy, 56, 30, 4);
		ctx.fillStyle = C.panelUp;
		ctx.fill();
		ctx.strokeStyle = C.lineUp;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.save();
		ctx.globalAlpha *= 0.7;
		for (let i = 1; i <= 4; i++) {
			dashLine(ctx, gx + 6, gy + i * 6, gx + 50, gy + i * 6, C.dim, [], 1.5);
		}
		ctx.restore();
		text(ctx, label, gx + 28, gy + 46, { size: 11, color: C.dim, align: 'center' });
	};
	if (rp > 0.85) {
		ctx.save();
		ctx.globalAlpha *= easeOut(ramp(t, ROOM_B - 200, ROOM_B + 300));
		grille(R.x + 24, R.y + 26, 'SUPPLY');
		grille(R.x + R.w - 80, R.y + R.h - 60, 'RETURN');
		ctx.restore();
	}

	// ---- air ----
	// Motes run a supply→return arc. Their speed is tied to the duct on the
	// right, so choosing the bigger duct visibly calms the room.
	const airP = easeOut(ramp(t, AIR_A, AIR_A + 900));
	if (airP > 0.01) {
		const rate = 0.00016 * (vel / 566); // 7" duct is the calm baseline

		ctx.save();
		ctx.globalAlpha *= airP * 0.9;
		rr(ctx, R.x, R.y, R.w, R.h, 2);
		ctx.clip();
		const ax = R.x + 52, ay = R.y + 41;
		const bx = R.x + R.w - 52, by = R.y + R.h - 45;
		for (const m of MOTES) {
			const ph = ((t - AIR_A) * rate * m.sp + m.off) % 1;
			// A quadratic arc that sags toward the floor mid-room.
			const cx = R.x + R.w * (0.25 + m.lane * 0.5);
			const cy = R.y + R.h * (0.15 + m.lane * 0.95);
			const u = 1 - ph;
			const px = u * u * ax + 2 * u * ph * cx + ph * ph * bx;
			const py = u * u * ay + 2 * u * ph * cy + ph * ph * by;
			const fade = Math.sin(ph * Math.PI);
			ctx.globalAlpha = airP * 0.75 * fade;
			// The streak length is the velocity, drawn.
			const tail = 3 + (vel / 566) * 9;
			const gx = px - (bx - ax) * 0.0015 * tail;
			const gy2 = py - (by - ay) * 0.0015 * tail;
			const grad = ctx.createLinearGradient(gx, gy2, px, py);
			grad.addColorStop(0, 'rgba(139,166,255,0)');
			grad.addColorStop(1, 'rgba(139,166,255,0.85)');
			ctx.strokeStyle = grad;
			ctx.lineWidth = m.sz;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(gx, gy2);
			ctx.lineTo(px, py);
			ctx.stroke();
		}
		ctx.restore();
	}

	// Room readout, under the section.
	const cP = ramp(t, CFM_A, CFM_B);
	ctx.save();
	ctx.globalAlpha *= easeOut(ramp(t, CFM_A, CFM_A + 500));
	const ry = R.y + R.h + 46;
	text(ctx, `${fmt(Math.round(countTo(ROOM.ft3, cP)))} ft³`, R.x, ry, {
		size: 17,
		weight: 500,
		color: C.sub,
	});
	text(ctx, '×', R.x + 116, ry, { size: 14, color: C.dim });
	text(ctx, `${ROOM.ach} ACH`, R.x + 138, ry, { size: 17, weight: 500, color: C.sub });
	text(ctx, '÷ 60 =', R.x + 210, ry, { size: 14, color: C.dim });
	text(ctx, `${fmt(Math.round(countTo(ROOM.cfm, cP)))} CFM`, R.x + 268, ry, {
		size: 22,
		weight: 500,
		color: C.accent,
	});
	ctx.restore();
	ctx.restore();

	// ---- duct, in section ----
	const D = { x: 638, y: 140, w: 422, h: 382 };
	const dp = easeOut(ramp(t, DUCT_A, DUCT_B));
	ctx.save();
	ctx.globalAlpha *= dp;
	panel(ctx, D.x, D.y, D.w, D.h);

	text(ctx, 'Branch duct', D.x + 26, D.y + 40, { size: 14, color: C.faint });
	text(ctx, `${dIn.toFixed(dIn % 1 < 0.05 || dIn % 1 > 0.95 ? 0 : 1)}″ round`, D.x + D.w - 26, D.y + 40, {
		size: 18,
		weight: 500,
		color: C.ink,
		align: 'right',
	});

	// The duct is drawn to scale — 20 px per inch — so growing from 5" to 7"
	// is a physical change you watch, not a label that swaps.
	const PX = 20;
	const dh = dIn * PX;
	const dcy = D.y + 168;
	const dx0 = D.x + 34, dx1 = D.x + D.w - 34;
	ctx.save();
	ctx.fillStyle = 'rgba(139,166,255,0.06)';
	ctx.fillRect(dx0, dcy - dh / 2, dx1 - dx0, dh);
	ctx.strokeStyle = C.lineUp;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(dx0, dcy - dh / 2);
	ctx.lineTo(dx1, dcy - dh / 2);
	ctx.moveTo(dx0, dcy + dh / 2);
	ctx.lineTo(dx1, dcy + dh / 2);
	ctx.stroke();

	// Flow inside, at the velocity the maths gives.
	ctx.save();
	ctx.beginPath();
	ctx.rect(dx0, dcy - dh / 2, dx1 - dx0, dh);
	ctx.clip();
	for (let i = 0; i < 26; i++) {
		const speed = 0.00022 * (vel / 566);
		const ph = ((t - DUCT_A) * speed + hash(i, 21)) % 1;
		const lane = hash(i, 22);
		// Parabolic profile — fastest down the centre, slow at the wall.
		const off = (lane - 0.5) * dh * 0.86;
		const prof = 1 - Math.pow((off / (dh / 2)) * 0.95, 2);
		const px = dx0 + ph * (dx1 - dx0);
		const len = 10 + prof * (vel / 566) * 26;
		ctx.globalAlpha = 0.25 + prof * 0.5;
		const g = ctx.createLinearGradient(px - len, 0, px, 0);
		g.addColorStop(0, noisy ? 'rgba(242,181,60,0)' : 'rgba(139,166,255,0)');
		g.addColorStop(1, noisy ? 'rgba(242,181,60,0.9)' : 'rgba(139,166,255,0.9)');
		ctx.strokeStyle = g;
		ctx.lineWidth = 1.1 + prof * 1.4;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(px - len, dcy + off);
		ctx.lineTo(px, dcy + off);
		ctx.stroke();
	}
	ctx.restore();

	// Diameter leader.
	ctx.globalAlpha *= 0.8;
	dashLine(ctx, dx0 - 14, dcy - dh / 2, dx0 - 14, dcy + dh / 2, C.dim, [3, 3]);
	dashLine(ctx, dx0 - 19, dcy - dh / 2, dx0 - 9, dcy - dh / 2, C.dim, []);
	dashLine(ctx, dx0 - 19, dcy + dh / 2, dx0 - 9, dcy + dh / 2, C.dim, []);
	ctx.restore();

	// Velocity readout + a meter that goes amber past 900 FPM, which is about
	// where a branch duct starts to be audible in a quiet room.
	const vy = D.y + 262;
	text(ctx, 'Velocity', D.x + 26, vy, { size: 14, color: C.faint });
	text(ctx, `${fmt(Math.round(vel))} FPM`, D.x + D.w - 26, vy, {
		size: 26,
		weight: 500,
		color: noisy ? C.warn : C.good,
		align: 'right',
	});

	const mx = D.x + 26, mw = D.w - 52, my = vy + 20;
	rr(ctx, mx, my, mw, 8, 4);
	ctx.fillStyle = 'rgba(255,255,255,0.05)';
	ctx.fill();
	const fillW = mw * clamp01(vel / 1400);
	ctx.save();
	rr(ctx, mx, my, Math.max(fillW, 8), 8, 4);
	ctx.fillStyle = noisy ? C.warn : C.good;
	ctx.globalAlpha *= 0.8;
	ctx.fill();
	ctx.restore();
	// The threshold, marked on the meter.
	const tx = mx + mw * (900 / 1400);
	dashLine(ctx, tx, my - 5, tx, my + 13, 'rgba(255,255,255,0.35)', []);
	text(ctx, '900 — audible', tx, my + 30, { size: 11, color: C.dim, align: 'center' });

	text(ctx, noisy ? 'Undersized — you will hear this one' : 'Quiet, and within friction limits', D.x + 26, D.y + 348, {
		size: 14,
		color: noisy ? C.warn : C.sub,
	});
	ctx.restore();

	// ---- the point ----
	const noteP = easeOut(ramp(t, UP_B - 200, UP_B + 600));
	if (noteP > 0.01) {
		ctx.save();
		ctx.globalAlpha *= noteP;
		const ny = D.y + D.h + 34;
		rr(ctx, 60, ny, 1000, 54, 12);
		ctx.fillStyle = 'rgba(139,166,255,0.05)';
		ctx.fill();
		ctx.strokeStyle = 'rgba(139,166,255,0.2)';
		ctx.lineWidth = 1;
		ctx.stroke();
		text(ctx, 'Two inches of duct', 84, ny + 33, { size: 15, weight: 500, color: C.accent });
		text(
			ctx,
			'— the same 151 CFM, half the velocity. Duct size is a noise decision as much as a flow one.',
			270,
			ny + 33,
			{ size: 15, color: C.sub }
		);
		ctx.restore();
	}

	ctx.globalAlpha = 1;
}

// ---- dispatch -------------------------------------------------------------

function draw(ctx: CanvasRenderingContext2D, kind: ToolKind, t: number) {
	if (kind === 'concrete') drawConcrete(ctx, t);
	else if (kind === 'electrical') drawElectrical(ctx, t);
	else drawHvac(ctx, t);
}

/** The one frame worth holding, per tool, for anyone who has asked for no motion. */
const HERO: Record<ToolKind, number> = {
	concrete: 8600,
	electrical: 7600,
	hvac: 8100,
};

const LABELS: Record<ToolKind, string> = {
	concrete:
		'A 4 by 3 metre slab filling with concrete, resolving to 1.2 cubic metres and 103 bags of 25 kg mix, with ten more added as a 10 per cent waste allowance.',
	electrical:
		'Five appliances switching on to a running total of 2,900 watts, then a furnace blower starting and pushing the momentary draw to 4,450 watts — past what a 3.5 kilowatt generator can supply.',
	hvac:
		'A room being ventilated at 6 air changes an hour, 151 CFM, and the same airflow shown through a 5 inch duct at 1,109 feet per minute and a 7 inch duct at 566.',
};

// ---- component ------------------------------------------------------------

export default function ToolPreview({ kind, atMs }: { kind: ToolKind; atMs?: number }) {
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
			draw(ctx!, kind, (now - started) % LOOP);
			raf = requestAnimationFrame(frame);
		}

		// Off-screen previews stop entirely — three canvases on one page is
		// three rAF loops otherwise, and only one of them is ever being looked at.
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
		 * Canvas takes no part in font-display: swap — whatever is loaded at the
		 * moment of the fillText call is what gets drawn, permanently. So wait for
		 * Space Grotesk before the first frame, or the held frame is set in a
		 * fallback face.
		 */
		function begin() {
			if (!alive) return;
			io.observe(cv!);
			if (pinned) draw(ctx!, kind, atMs! % LOOP);
			else if (mq.matches) draw(ctx!, kind, HERO[kind]);
			else raf = requestAnimationFrame(frame);
		}

		const fonts = (document as Document).fonts;
		if (fonts) {
			Promise.all([fonts.load(`400 17px ${UI}`), fonts.load(`500 17px ${UI}`)])
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
			style={{ background: C.void }}
		/>
	);
}
