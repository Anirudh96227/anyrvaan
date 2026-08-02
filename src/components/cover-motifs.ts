/**
 * COVER MOTIFS
 * -------------------------------------------------------------------------
 * One drawn card face per case study, in the same 1120×630 design space
 * WorkCover authors in. Each motif enacts its project's actual subject rather
 * than decorating it — they share the site's palette and restraint, but no
 * two of them use the same mechanic, because no two of the projects do.
 *
 *   diorama-shelf    a lamp crossing three lit miniature boxes on a shelf
 *   four-collections four small screens running four different methods at once
 *   orb-witness      one point crossing a horizon that changes era behind it
 *   cut-early        eight arcs that race toward closing and stop short
 *   atlas-index      a hundred cells, catalogued one at a time
 *   almost-nothing   a screen of badges going quiet until nothing is left
 *
 * Every motif is a pure function of `ms` — no state between frames, so any
 * frame can be pinned for review or for a reduced-motion still.
 */

const TAU = Math.PI * 2;

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeInOut = (t: number) => {
	const x = clamp01(t);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const hash = (i: number, s = 0) => {
	const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

const P = {
	void: '#08090b',
	panel: '#12151a',
	line: '#23272d',
	lineUp: '#333941',
	ink: '#e9ecf1',
	sub: '#8b939d',
	faint: '#565d66',
	cobalt: '139, 166, 255',
	amber: '226, 176, 92',
	ember: '235, 138, 62',
	phosphor: '110, 231, 183',
	red: '232, 86, 74',
};

const UI = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

function rr(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
	ctx.beginPath();
	ctx.moveTo(x + k, y);
	ctx.arcTo(x + w, y, x + w, y + h, k);
	ctx.arcTo(x + w, y + h, x, y + h, k);
	ctx.arcTo(x, y + h, x, y, k);
	ctx.arcTo(x, y, x + w, y, k);
	ctx.closePath();
}

function bg(ctx: CanvasRenderingContext2D, w: number, h: number, fill = P.void) {
	ctx.fillStyle = fill;
	ctx.fillRect(0, 0, w, h);
}

function eyebrow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
	const spaced = 'letterSpacing' in ctx;
	if (spaced) ctx.letterSpacing = '4px';
	ctx.font = `500 20px ${UI}`;
	ctx.fillStyle = P.sub;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(text, x, y);
	if (spaced) ctx.letterSpacing = '0px';
}

// ---------------------------------------------------------------------------
// MINIATURE MAGICAL INDIA — a lamp crossing three boxes on a shelf.
// The whole series is one trick: shrink something monumental until a light
// source is bigger than it is. So the light is the thing that moves here, and
// the monuments sit there being small.
// ---------------------------------------------------------------------------

/** Three landmarks reduced to the few strokes that still identify them. */
function landmark(ctx: CanvasRenderingContext2D, kind: number, x: number, base: number, s: number) {
	ctx.beginPath();
	if (kind === 0) {
		// a domed tomb: dome, drum, plinth, two slim towers
		ctx.moveTo(x - s * 0.5, base);
		ctx.lineTo(x - s * 0.5, base - s * 0.22);
		ctx.lineTo(x + s * 0.5, base - s * 0.22);
		ctx.lineTo(x + s * 0.5, base);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x, base - s * 0.34, s * 0.24, Math.PI, TAU);
		ctx.lineTo(x + s * 0.24, base - s * 0.22);
		ctx.lineTo(x - s * 0.24, base - s * 0.22);
		ctx.closePath();
		ctx.fill();
		for (const sx of [-1, 1]) {
			ctx.fillRect(x + sx * s * 0.44 - s * 0.03, base - s * 0.52, s * 0.06, s * 0.3);
		}
		return;
	}
	if (kind === 1) {
		// a stepped temple tower
		const steps = 5;
		for (let i = 0; i < steps; i++) {
			const tw = s * (0.62 - i * 0.09);
			const ty = base - (i + 1) * s * 0.11;
			ctx.fillRect(x - tw / 2, ty, tw, s * 0.11);
		}
		ctx.beginPath();
		ctx.arc(x, base - steps * s * 0.11 - s * 0.05, s * 0.06, 0, TAU);
		ctx.fill();
		return;
	}
	// a cliff monastery: a rock face with small cells clinging to it
	ctx.moveTo(x - s * 0.55, base);
	ctx.lineTo(x - s * 0.34, base - s * 0.58);
	ctx.lineTo(x - s * 0.05, base - s * 0.66);
	ctx.lineTo(x + s * 0.22, base - s * 0.4);
	ctx.lineTo(x + s * 0.55, base);
	ctx.closePath();
	ctx.fill();
	const keep = ctx.fillStyle;
	ctx.fillStyle = 'rgba(10, 12, 16, 0.75)';
	for (let i = 0; i < 5; i++) {
		const cx2 = x - s * 0.3 + i * s * 0.12;
		const cy2 = base - s * (0.14 + (i % 2) * 0.12);
		ctx.fillRect(cx2, cy2, s * 0.06, s * 0.09);
	}
	ctx.fillStyle = keep;
}

function dioramaShelf(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	bg(ctx, w, h);
	const t = (ms % 10000) / 10000;
	const shelf = h * 0.72;
	const boxW = w * 0.24;
	const boxH = h * 0.34;
	const gap = (w - boxW * 3) / 4;

	// the shelf itself
	ctx.fillStyle = P.line;
	ctx.fillRect(w * 0.05, shelf, w * 0.9, h * 0.012);

	// the travelling lamp
	const lampX = w * (0.1 + easeInOut(t < 0.5 ? t * 2 : 2 - t * 2) * 0.8);
	const lampY = h * 0.16;

	for (let i = 0; i < 3; i++) {
		const bx = gap + i * (boxW + gap);
		const by = shelf - boxH;
		// how squarely the lamp is over this box
		const lit = clamp01(1 - Math.abs(lampX - (bx + boxW / 2)) / (boxW * 1.1));

		ctx.fillStyle = P.panel;
		rr(ctx, bx, by, boxW, boxH, 6);
		ctx.fill();
		ctx.strokeStyle = P.line;
		ctx.lineWidth = 1.4;
		ctx.stroke();

		// warm pool of light inside the box
		if (lit > 0.02) {
			const g = ctx.createLinearGradient(0, by, 0, by + boxH);
			g.addColorStop(0, `rgba(${P.amber}, ${(0.3 * lit).toFixed(3)})`);
			g.addColorStop(1, `rgba(${P.amber}, ${(0.05 * lit).toFixed(3)})`);
			ctx.save();
			rr(ctx, bx, by, boxW, boxH, 6);
			ctx.clip();
			ctx.fillStyle = g;
			ctx.fillRect(bx, by, boxW, boxH);
			ctx.restore();
		}

		// the monument, and the long shadow the lamp throws off it
		const cx = bx + boxW / 2;
		const base = by + boxH * 0.86;
		const s = boxH * 0.72;
		if (lit > 0.02) {
			ctx.save();
			rr(ctx, bx, by, boxW, boxH, 6);
			ctx.clip();
			ctx.globalAlpha = 0.5 * lit;
			ctx.fillStyle = '#000';
			ctx.translate(cx, base);
			ctx.transform(1, 0, (cx - lampX) / (base - lampY), 0.34, 0, 0);
			ctx.translate(-cx, -base);
			landmark(ctx, i, cx, base, s);
			ctx.restore();
		}
		// Lit or unlit, a monument stays a silhouette — the light is the subject
		// here, not the stone, so it never blows out to white.
		ctx.fillStyle = lit > 0.35 ? '#8e8778' : '#41474f';
		landmark(ctx, i, cx, base, s);
	}

	// the lamp, bigger than any of them
	const gl = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, h * 0.34);
	gl.addColorStop(0, `rgba(${P.amber}, 0.3)`);
	gl.addColorStop(1, `rgba(${P.amber}, 0)`);
	ctx.fillStyle = gl;
	ctx.fillRect(lampX - h * 0.34, lampY - h * 0.34, h * 0.68, h * 0.68);
	ctx.fillStyle = '#f0dcb0';
	ctx.beginPath();
	ctx.arc(lampX, lampY, 9, 0, TAU);
	ctx.fill();

	eyebrow(ctx, 'ONE LAMP, THIRTEEN PLACES', w * 0.05, h * 0.14);
}

// ---------------------------------------------------------------------------
// MOTION, MADE WITH CODE — four screens, four methods, one card.
// The case study's claim is that the same way of working aims at four
// unrelated worlds, so all four run at once and you can see they don't match.
// ---------------------------------------------------------------------------

function fourCollections(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	bg(ctx, w, h);
	const pad = w * 0.05;
	const gap = w * 0.02;
	const pw = (w - pad * 2 - gap) / 2;
	const ph = (h - pad * 2 - gap - h * 0.08) / 2;
	const top = pad + h * 0.08;

	const panels = [
		{ x: pad, y: top, label: 'COUNTERS' },
		{ x: pad + pw + gap, y: top, label: 'PATTERNS' },
		{ x: pad, y: top + ph + gap, label: 'MACHINES' },
		{ x: pad + pw + gap, y: top + ph + gap, label: 'INTERFACES' },
	];

	panels.forEach((p, i) => {
		ctx.fillStyle = P.panel;
		rr(ctx, p.x, p.y, pw, ph, 8);
		ctx.fill();
		ctx.strokeStyle = P.line;
		ctx.lineWidth = 1.4;
		ctx.stroke();

		ctx.save();
		rr(ctx, p.x, p.y, pw, ph, 8);
		ctx.clip();
		const cx = p.x + pw / 2;
		const cy = p.y + ph / 2;

		if (i === 0) {
			// a number counting, and a bar chasing it
			const v = Math.floor(((ms / 12) % 1000) + 1);
			ctx.font = `500 ${Math.round(ph * 0.34)}px ${UI}`;
			ctx.fillStyle = P.ink;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(v).padStart(3, '0'), cx, cy - ph * 0.08);
			const bw = pw * 0.6;
			ctx.fillStyle = P.line;
			ctx.fillRect(cx - bw / 2, cy + ph * 0.22, bw, 8);
			ctx.fillStyle = `rgba(${P.cobalt}, 0.9)`;
			ctx.fillRect(cx - bw / 2, cy + ph * 0.22, bw * ((ms / 2400) % 1), 8);
		} else if (i === 1) {
			// a pattern drawing itself, endlessly
			const p2 = (ms % 5200) / 5200;
			const rr2 = Math.min(pw, ph) * 0.3;
			ctx.strokeStyle = `rgba(${P.cobalt}, 0.85)`;
			ctx.lineWidth = 1.4;
			for (let k = 0; k < 9; k++) {
				const a0 = (k / 9) * TAU;
				ctx.beginPath();
				ctx.arc(cx, cy, rr2 * (0.4 + (k % 3) * 0.3), a0, a0 + TAU * p2 * 0.5);
				ctx.stroke();
			}
			ctx.fillStyle = `rgba(${P.cobalt}, 0.9)`;
			ctx.beginPath();
			ctx.arc(cx, cy, 3, 0, TAU);
			ctx.fill();
		} else if (i === 2) {
			// a terminal, typing
			ctx.font = `400 ${Math.round(ph * 0.13)}px ${UI}`;
			ctx.fillStyle = `rgba(${P.phosphor}, 0.85)`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			const lines = ['READY.', 'LOAD "*",8,1', 'SEARCHING...'];
			const shown = Math.floor((ms / 900) % (lines.length + 1));
			for (let l = 0; l < Math.min(shown, lines.length); l++) {
				ctx.fillText(lines[l], p.x + pw * 0.1, p.y + ph * (0.34 + l * 0.2));
			}
			if ((ms % 1000) < 550) {
				ctx.fillRect(p.x + pw * 0.1, p.y + ph * (0.28 + Math.min(shown, lines.length) * 0.2), ph * 0.08, ph * 0.09);
			}
			// scanlines
			ctx.fillStyle = 'rgba(0,0,0,0.25)';
			for (let y = p.y; y < p.y + ph; y += 4) ctx.fillRect(p.x, y, pw, 1.4);
		} else {
			// a window, and a cursor that clicks a button on a loop
			ctx.fillStyle = '#1b1f26';
			rr(ctx, p.x + pw * 0.12, p.y + ph * 0.2, pw * 0.76, ph * 0.6, 5);
			ctx.fill();
			ctx.fillStyle = P.line;
			ctx.fillRect(p.x + pw * 0.12, p.y + ph * 0.2, pw * 0.76, ph * 0.11);
			const bx = p.x + pw * 0.46;
			const by = p.y + ph * 0.52;
			const bwid = pw * 0.3;
			const bhei = ph * 0.16;
			const click = (ms % 2600) / 2600;
			const pressed = click > 0.52 && click < 0.62;
			ctx.fillStyle = pressed ? `rgba(${P.cobalt}, 1)` : `rgba(${P.cobalt}, 0.7)`;
			rr(ctx, bx, by + (pressed ? 1.5 : 0), bwid, bhei, 4);
			ctx.fill();
			// the cursor arriving, clicking, leaving
			const cxp = p.x + pw * (0.2 + easeInOut(clamp01(click * 2)) * 0.42);
			const cyp = p.y + ph * (0.82 - easeInOut(clamp01(click * 2)) * 0.22);
			ctx.fillStyle = '#f2f5fa';
			ctx.beginPath();
			ctx.moveTo(cxp, cyp);
			ctx.lineTo(cxp, cyp + ph * 0.13);
			ctx.lineTo(cxp + ph * 0.05, cyp + ph * 0.09);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();

		ctx.font = `500 15px ${UI}`;
		ctx.fillStyle = P.faint;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(p.label, p.x + 12, p.y + ph - 12);
	});

	eyebrow(ctx, 'FOUR COLLECTIONS, ONE METHOD', pad, h * 0.1);
}

// ---------------------------------------------------------------------------
// ECHOES OF ETERNITY — one point crossing a horizon that keeps changing.
// The film's whole structure: a witness that never interferes, moving through
// deep time, until it stops being able to only watch.
// ---------------------------------------------------------------------------

function orbWitness(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	const CY_ = 12000;
	const t = (ms % CY_) / CY_;
	const p = easeInOut(ramp(t, 0.04, 0.82));

	const sky = ctx.createLinearGradient(0, 0, 0, h);
	sky.addColorStop(0, '#07080b');
	sky.addColorStop(1, '#0e1117');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, w, h);

	const ground = h * 0.76;
	const ox = w * (0.08 + p * 0.84);
	const oy = ground - h * 0.3 - Math.sin(p * Math.PI) * h * 0.12;

	// The horizon changes era as the orb passes over it — jungle, then
	// monuments, then towers. Each era is drawn only where the orb has been.
	const eras = 3;
	for (let e = 0; e < eras; e++) {
		const x0 = (e / eras) * w;
		const x1 = ((e + 1) / eras) * w;
		const arrived = clamp01((ox - x0) / (w / eras));
		if (arrived <= 0) continue;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x0, 0, (x1 - x0) * arrived, h);
		ctx.clip();
		// Few and large, so each era is a shape you can name at a glance —
		// dense little bars just read as a waveform.
		const n = 7;
		ctx.fillStyle = '#1a212b';
		for (let i = 0; i < n; i++) {
			const bw = (x1 - x0) / n;
			const bx = x0 + bw * i;
			if (e === 0) {
				// jungle: overlapping canopy, tall and irregular
				const bh = h * (0.2 + hash(i, 1) * 0.18);
				ctx.beginPath();
				ctx.moveTo(bx - bw * 0.15, ground);
				ctx.quadraticCurveTo(bx + bw * 0.5, ground - bh, bx + bw * 1.15, ground);
				ctx.closePath();
				ctx.fill();
			} else if (e === 1) {
				// monuments: a squat plinth, and every third one a dome
				const bh = h * (i % 3 === 1 ? 0.3 : 0.14);
				ctx.fillRect(bx + bw * 0.14, ground - bh, bw * 0.72, bh);
				if (i % 3 === 1) {
					ctx.beginPath();
					ctx.arc(bx + bw * 0.5, ground - bh, bw * 0.36, Math.PI, TAU);
					ctx.fill();
				}
			} else {
				// towers: tall, thin, and lit
				const bh = h * (0.22 + hash(i, 9) * 0.3);
				ctx.fillRect(bx + bw * 0.22, ground - bh, bw * 0.56, bh);
				ctx.fillStyle = `rgba(${P.amber}, 0.35)`;
				for (let ry = 0; ry < 5; ry++) {
					if (hash(i * 7 + ry, 4) < 0.45) continue;
					ctx.fillRect(bx + bw * 0.32, ground - bh + ry * (bh / 5) + bh * 0.06, bw * 0.14, bh * 0.05);
				}
				ctx.fillStyle = '#1a212b';
			}
		}
		ctx.restore();
	}

	ctx.fillStyle = '#0a0d12';
	ctx.fillRect(0, ground, w, h - ground);
	ctx.strokeStyle = 'rgba(139, 166, 255, 0.16)';
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(0, ground);
	ctx.lineTo(w, ground);
	ctx.stroke();

	// the trail it leaves behind
	ctx.lineCap = 'round';
	for (let i = 1; i <= 40; i++) {
		const q = p * (1 - i / 60);
		const tx = w * (0.08 + q * 0.84);
		const ty = ground - h * 0.3 - Math.sin(q * Math.PI) * h * 0.12;
		ctx.fillStyle = `rgba(${P.cobalt}, ${(0.16 * (1 - i / 40)).toFixed(3)})`;
		ctx.beginPath();
		ctx.arc(tx, ty, 3 + (1 - i / 40) * 5, 0, TAU);
		ctx.fill();
	}

	// It stops being a sphere at the end — the one thing it was never doing.
	const becoming = ramp(t, 0.84, 0.95);
	const gl = ctx.createRadialGradient(ox, oy, 0, ox, oy, h * 0.2);
	gl.addColorStop(0, `rgba(${P.cobalt}, 0.4)`);
	gl.addColorStop(1, `rgba(${P.cobalt}, 0)`);
	ctx.fillStyle = gl;
	ctx.fillRect(ox - h * 0.2, oy - h * 0.2, h * 0.4, h * 0.4);
	if (becoming < 0.02) {
		ctx.fillStyle = '#eef2f9';
		ctx.beginPath();
		ctx.arc(ox, oy, 13, 0, TAU);
		ctx.fill();
	} else {
		// a standing figure of light, resolving out of the sphere
		const s = h * 0.2 * becoming;
		ctx.fillStyle = '#eef2f9';
		ctx.beginPath();
		ctx.arc(ox, oy - s * 0.5, 13 * (1 - becoming * 0.4), 0, TAU);
		ctx.fill();
		ctx.globalAlpha = becoming;
		ctx.fillRect(ox - s * 0.09, oy - s * 0.34, s * 0.18, s * 0.9);
		ctx.globalAlpha = 1;
	}

	eyebrow(ctx, 'A WITNESS, NOT A NARRATOR', w * 0.05, h * 0.13);
}

// ---------------------------------------------------------------------------
// SKETCH TO VIDEO — eight arcs that stop a beat before they close.
// The films are cut early on purpose; the card is too. It never resolves,
// however long anyone waits.
// ---------------------------------------------------------------------------

function cutEarly(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	bg(ctx, w, h);
	const CY_ = 9600;
	const t = (ms % CY_) / CY_;
	const cx = w / 2;
	const cy = h * 0.5;
	const cuts = 8;

	for (let i = 0; i < cuts; i++) {
		const r = Math.min(w, h) * (0.12 + (i / cuts) * 0.24);
		const begin = i * 0.085;
		// races around, then stops short — 0.82 of a turn, never more
		const q = easeOut(ramp(t, begin, begin + 0.3)) * 0.82;
		if (q <= 0) continue;
		const a0 = -Math.PI / 2;
		ctx.strokeStyle = `rgba(233, 236, 241, ${(0.16 + 0.3 * (i / cuts)).toFixed(3)})`;
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.arc(cx, cy, r, a0, a0 + TAU * q);
		ctx.stroke();
		// the gap where the ending would have been
		if (q >= 0.82) {
			const ga = a0 + TAU * 0.82;
			ctx.fillStyle = `rgba(${P.cobalt}, 0.85)`;
			ctx.beginPath();
			ctx.arc(cx + Math.cos(ga) * r, cy + Math.sin(ga) * r, 3.4, 0, TAU);
			ctx.fill();
		}
	}

	// a scrub bar doing the same thing, in a straight line
	const bx = w * 0.28;
	const bw = w * 0.44;
	const by = h * 0.87;
	ctx.fillStyle = P.line;
	ctx.fillRect(bx, by, bw, 6);
	const sq = easeOut(ramp(t, 0.02, 0.72)) * 0.82;
	ctx.fillStyle = `rgba(${P.cobalt}, 0.9)`;
	ctx.fillRect(bx, by, bw * sq, 6);
	ctx.fillStyle = 'rgba(233, 236, 241, 0.35)';
	ctx.fillRect(bx + bw * 0.82 - 1, by - 7, 2, 20);

	eyebrow(ctx, 'EIGHT CUTS, NONE FINISHED', w * 0.05, h * 0.13);
	ctx.font = `400 20px ${UI}`;
	ctx.fillStyle = P.faint;
	ctx.textAlign = 'right';
	ctx.fillText('stops at 82%', w * 0.95, h * 0.13);
	ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// A FIELD GUIDE TO APP ANIMATIONS — a hundred cells, catalogued one at a time.
// The guide's real subject is that nothing goes on the list from memory, so
// the card shows the checking: one entry lit, numbered, and written down.
// ---------------------------------------------------------------------------

function atlasIndex(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	bg(ctx, w, h);
	const cols = 20;
	const rows = 5;
	const pad = w * 0.05;
	const gw = w - pad * 2;
	const gh = h * 0.42;
	const top = h * 0.24;
	const cw = gw / cols;
	const ch = gh / rows;

	const step = 1100;
	const idx = Math.floor(ms / step) % (cols * rows);
	const phase = (ms % step) / step;

	for (let i = 0; i < cols * rows; i++) {
		const c = i % cols;
		const r = Math.floor(i / cols);
		const x = pad + c * cw;
		const y = top + r * ch;
		const on = i === idx;
		const done = i < idx;
		ctx.fillStyle = on ? '#1b2029' : P.panel;
		rr(ctx, x + 2, y + 2, cw - 5, ch - 5, 3);
		ctx.fill();
		ctx.strokeStyle = on ? `rgba(${P.cobalt}, 0.9)` : P.line;
		ctx.lineWidth = on ? 1.6 : 1;
		ctx.stroke();

		// each cell performs its own scrap of motion, forever
		const q = ((ms / (700 + (i % 7) * 90)) % 1);
		const mx = x + cw / 2;
		const my = y + ch / 2;
		const a = done ? 0.5 : on ? 1 : 0.28;
		ctx.fillStyle = `rgba(${P.cobalt}, ${a.toFixed(3)})`;
		const kind = i % 4;
		if (kind === 0) {
			ctx.fillRect(x + 5, my - 1.5, (cw - 11) * q, 3);
		} else if (kind === 1) {
			ctx.beginPath();
			ctx.arc(mx, my - Math.abs(Math.sin(q * Math.PI)) * ch * 0.22, 2.6, 0, TAU);
			ctx.fill();
		} else if (kind === 2) {
			ctx.strokeStyle = `rgba(${P.cobalt}, ${a.toFixed(3)})`;
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.arc(mx, my, ch * 0.2, q * TAU, q * TAU + 2);
			ctx.stroke();
		} else {
			ctx.globalAlpha = a * (0.3 + 0.7 * Math.abs(Math.sin(q * Math.PI)));
			ctx.fillRect(mx - cw * 0.16, my - 2, cw * 0.32, 4);
			ctx.globalAlpha = 1;
		}
	}

	// the entry being written down
	const n = String(idx + 1).padStart(3, '0');
	ctx.font = `500 44px ${UI}`;
	ctx.fillStyle = P.ink;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(n, pad, h * 0.86);
	const nw = ctx.measureText(n).width;
	ctx.font = `400 22px ${UI}`;
	ctx.fillStyle = P.faint;
	ctx.fillText(' / 100  ·  checked, not remembered', pad + nw + 8, h * 0.86);
	// a line typing itself under the number
	ctx.fillStyle = `rgba(${P.cobalt}, 0.7)`;
	ctx.fillRect(pad, h * 0.9, (w - pad * 2) * 0.5 * easeOut(phase), 3);

	eyebrow(ctx, 'A HUNDRED, LOOKED UP', pad, h * 0.13);
}

// ---------------------------------------------------------------------------
// A FIELD GUIDE TO QUIET APPS — badges going out until nothing is left.
// The mirror of the one above. It ends on an empty screen and stays there a
// long time, because that emptiness is the argument.
// ---------------------------------------------------------------------------

function almostNothing(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	bg(ctx, w, h);
	const CY_ = 14000;
	const t = (ms % CY_) / CY_;

	const cols = 4;
	const rows = 3;
	const pad = w * 0.16;
	const gw = w - pad * 2;
	const gh = h * 0.5;
	const top = h * 0.26;
	const cw = gw / cols;
	const chh = gh / rows;
	const count = cols * rows;

	// Badges go out one by one over the first 60%, then a long quiet. Note the
	// deliberate lack of a clamp on the product: `gone` has to run past 1 all
	// the way to `count`, or only the first badge ever leaves.
	const gone = ramp(t, 0.06, 0.6) * count;

	for (let i = 0; i < count; i++) {
		const c = i % cols;
		const r = Math.floor(i / cols);
		const x = pad + c * cw;
		const y = top + r * chh;
		const s = Math.min(cw, chh) * 0.52;
		const ix = x + cw / 2 - s / 2;
		const iy = y + chh / 2 - s / 2;

		ctx.fillStyle = P.panel;
		rr(ctx, ix, iy, s, s, s * 0.24);
		ctx.fill();
		ctx.strokeStyle = P.line;
		ctx.lineWidth = 1.2;
		ctx.stroke();

		// this badge's remaining life
		const life = clamp01(gone - i);
		const a = 1 - easeOut(life);
		if (a > 0.01) {
			const bx = ix + s * 0.86;
			const by = iy + s * 0.14;
			ctx.globalAlpha = a;
			ctx.fillStyle = `rgba(${P.red}, 1)`;
			ctx.beginPath();
			ctx.arc(bx, by, s * 0.17 * (0.7 + 0.3 * a), 0, TAU);
			ctx.fill();
			ctx.fillStyle = '#fff';
			ctx.font = `500 ${Math.round(s * 0.18)}px ${UI}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(String(1 + (i % 9)), bx, by + 1);
			ctx.globalAlpha = 1;
		}
	}

	const quiet = ramp(t, 0.62, 0.78);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	eyebrow(ctx, quiet > 0.5 ? 'NOTHING NEEDS YOU' : 'TWELVE THINGS NEED YOU', w * 0.05, h * 0.14);
}

// ---------------------------------------------------------------------------
// STORIES FOR CHILDREN — bats cross a moonlit river and the bank fills in.
// The Sky Dancers ends on "They drop seeds. New forests begin." So the card is
// that sentence: seven seeds fall, seven trees grow, the loop holds on the
// finished treeline, and it starts over.
// ---------------------------------------------------------------------------

interface TSeg {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	wide: number;
	t0: number;
	t1: number;
	leaf: boolean;
}

const TREE_N = 7;
/** Built once, in unit space (trunk length 1), then scaled at draw time. */
let TREES: TSeg[][] | null = null;

function buildTrees(): TSeg[][] {
	const out: TSeg[][] = [];
	const MAXD = 4;
	for (let i = 0; i < TREE_N; i++) {
		const segs: TSeg[] = [];
		let n = 0;
		// Drawn off the hash rather than Math.random, so every motif stays a pure
		// function of time — any frame can be pinned for a reduced-motion still.
		const rnd = () => hash(i * 37 + n++, 5);
		const branch = (x: number, y: number, ang: number, len: number, depth: number, t: number) => {
			const x1 = x + Math.cos(ang) * len;
			const y1 = y + Math.sin(ang) * len;
			const span = 0.18 + depth * 0.02;
			segs.push({ x0: x, y0: y, x1, y1, wide: (MAXD - depth) * 0.055 + 0.02, t0: t, t1: Math.min(1, t + span), leaf: false });
			if (depth >= MAXD) {
				segs.push({ x0: x1, y0: y1, x1, y1, wide: 0.1 + rnd() * 0.1, t0: Math.min(0.95, t + span), t1: 1, leaf: true });
				return;
			}
			const forks = rnd() < 0.28 ? 3 : 2;
			for (let f = 0; f < forks; f++) {
				const dir = f === 0 ? -1 : f === 1 ? 1 : rnd() - 0.5;
				branch(x1, y1, ang + (0.4 + rnd() * 0.45) * dir, len * (0.66 + rnd() * 0.16), depth + 1, t + span);
			}
		};
		branch(0, 0, -Math.PI / 2 + (hash(i, 7) - 0.5) * 0.3, 1, 0, 0);
		out.push(segs);
	}
	return out;
}

function bat(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, flap: number, s: number, fill: string) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(dir * s, s);
	ctx.fillStyle = fill;
	const tip = -5.5 * flap + 1.5;
	ctx.beginPath();
	ctx.moveTo(0, -2.6);
	ctx.quadraticCurveTo(-4, -5 + tip * 0.5, -10.5, tip);
	ctx.quadraticCurveTo(-7.5, tip + 2.2, -6, tip + 3.4);
	ctx.quadraticCurveTo(-5.4, tip + 1.4, -4.2, tip + 2.6);
	ctx.quadraticCurveTo(-2.6, 1.4, 0, 3.2);
	ctx.quadraticCurveTo(2.6, 1.4, 4.2, tip + 2.6);
	ctx.quadraticCurveTo(5.4, tip + 1.4, 6, tip + 3.4);
	ctx.quadraticCurveTo(7.5, tip + 2.2, 10.5, tip);
	ctx.quadraticCurveTo(4, -5 + tip * 0.5, 0, -2.6);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.arc(0, -3.4, 1.8, 0, TAU);
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(-1.5, -4.6);
	ctx.lineTo(-2.1, -7.1);
	ctx.lineTo(-0.3, -5.2);
	ctx.closePath();
	ctx.moveTo(1.5, -4.6);
	ctx.lineTo(2.1, -7.1);
	ctx.lineTo(0.3, -5.2);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

const MOONC = '186, 205, 240';

function nightPlanting(ctx: CanvasRenderingContext2D, w: number, h: number, ms: number) {
	const CY_ = 15000;
	const t = (ms % CY_) / CY_;
	if (!TREES) TREES = buildTrees();

	const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
	sky.addColorStop(0, '#06070c');
	sky.addColorStop(1, '#141b2c');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, w, h);

	// The moon. Flat, as a full moon is — a lit sphere would read as a pearl.
	const mX = w * 0.79;
	const mY = h * 0.27;
	const mR = h * 0.155;
	const halo = ctx.createRadialGradient(mX, mY, 0, mX, mY, mR * 4.5);
	halo.addColorStop(0, `rgba(${MOONC}, 0.14)`);
	halo.addColorStop(1, `rgba(${MOONC}, 0)`);
	ctx.fillStyle = halo;
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = `rgba(${MOONC}, 0.44)`;
	ctx.beginPath();
	ctx.arc(mX, mY, mR, 0, TAU);
	ctx.fill();
	ctx.save();
	ctx.beginPath();
	ctx.arc(mX, mY, mR, 0, TAU);
	ctx.clip();
	ctx.fillStyle = 'rgba(96, 112, 140, 0.22)';
	ctx.beginPath();
	ctx.arc(mX - mR * 0.26, mY - mR * 0.3, mR * 0.36, 0, TAU);
	ctx.arc(mX + mR * 0.2, mY + mR * 0.04, mR * 0.26, 0, TAU);
	ctx.arc(mX - mR * 0.04, mY + mR * 0.34, mR * 0.3, 0, TAU);
	ctx.fill();
	ctx.restore();

	// The far bank: a town asleep, a few windows still lit.
	const far = h * 0.6;
	ctx.fillStyle = '#0b1019';
	ctx.beginPath();
	ctx.moveTo(0, far);
	for (let x = 0; x <= w; x += 26) ctx.lineTo(x, far - 8 - Math.abs(Math.sin(x * 0.017 + 2.4)) * 26);
	ctx.lineTo(w, far);
	ctx.closePath();
	ctx.fill();
	for (let i = 0; i < 30; i++) {
		const lx = hash(i, 21) * w;
		ctx.fillStyle = `rgba(${P.amber}, ${(0.2 + 0.3 * Math.abs(Math.sin(ms * 0.0013 + i * 2.1))).toFixed(3)})`;
		ctx.fillRect(lx, far - 6 - (i % 4) * 4, 2.6, 2.6);
	}

	// The river, and the moon broken across it.
	const ground = h * 0.78;
	ctx.fillStyle = 'rgba(15, 23, 40, 0.75)';
	ctx.fillRect(0, far, w, ground - far);
	for (let k = 0; k < 14; k++) {
		const ry = far + 5 + k * ((ground - far) / 14);
		const wob = Math.sin(ms * 0.0011 + k * 1.6) * (4 + k * 1.1);
		const len = 16 + k * 3.4;
		ctx.strokeStyle = `rgba(${MOONC}, ${(0.2 * (1 - k / 16)).toFixed(3)})`;
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		ctx.moveTo(mX - len / 2 + wob, ry);
		ctx.lineTo(mX + len / 2 + wob, ry);
		ctx.stroke();
	}

	// The near bank the forest stands on.
	ctx.fillStyle = '#05070c';
	ctx.fillRect(0, ground, w, h - ground);

	// Seven seeds, seven trees, one after another — then a beat on the finished
	// treeline before it clears and starts again.
	const out = 1 - easeOut(ramp(t, 0.94, 1));
	// Tall enough that the crowns clear the far bank: a tree silhouetted against
	// the sky reads as a tree, one that stops at the horizon reads as scrub.
	const scale = h * 0.108;
	let standing = 0;

	ctx.save();
	ctx.globalAlpha = out;
	for (let i = 0; i < TREE_N; i++) {
		const start = 0.1 + i * 0.095;
		const tx = w * (0.09 + i * 0.128) + (hash(i, 11) - 0.5) * w * 0.04;
		const ty = ground + (hash(i, 13) - 0.5) * h * 0.02;
		const grow = easeOut(ramp(t, start, start + 0.2));
		if (grow >= 1) standing++;

		// The seed on its way down, in the beat before its tree appears.
		const fall = ramp(t, start - 0.07, start);
		if (fall > 0 && fall < 1) {
			const sx = tx + (1 - fall) * (mX - tx) * 0.5;
			const sy = h * 0.3 + (ty - h * 0.3) * (fall * fall);
			ctx.fillStyle = `rgba(${P.amber}, 0.16)`;
			ctx.beginPath();
			ctx.arc(sx, sy, 12, 0, TAU);
			ctx.fill();
			ctx.fillStyle = `rgba(${P.amber}, 0.95)`;
			ctx.beginPath();
			ctx.arc(sx, sy, 3.4, 0, TAU);
			ctx.fill();
		}
		if (grow <= 0) continue;

		ctx.save();
		ctx.translate(tx, ty);
		ctx.scale(scale, scale);
		ctx.lineCap = 'round';
		for (const s of TREES[i]) {
			if (grow <= s.t0) continue;
			const q = clamp01((grow - s.t0) / (s.t1 - s.t0));
			if (s.leaf) {
				ctx.fillStyle = `rgba(9, 12, 19, ${(0.8 * q).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(s.x0, s.y0, s.wide * q, 0, TAU);
				ctx.fill();
				continue;
			}
			const ex = s.x0 + (s.x1 - s.x0) * q;
			const ey = s.y0 + (s.y1 - s.y0) * q;
			ctx.strokeStyle = '#080b12';
			ctx.lineWidth = s.wide;
			ctx.beginPath();
			ctx.moveTo(s.x0, s.y0);
			ctx.lineTo(ex, ey);
			ctx.stroke();
			// The moon is off to the right, so that edge of every limb catches it.
			ctx.strokeStyle = `rgba(${MOONC}, 0.16)`;
			ctx.lineWidth = Math.max(0.012, s.wide * 0.34);
			ctx.beginPath();
			ctx.moveTo(s.x0 + s.wide * 0.32, s.y0);
			ctx.lineTo(ex + s.wide * 0.32, ey);
			ctx.stroke();
		}
		ctx.restore();
	}
	ctx.restore();

	// The flock, still crossing. Silhouettes over the moon, moonlit off it.
	for (let i = 0; i < 10; i++) {
		const dir = i % 2 === 0 ? 1 : -1;
		const sp = 17000 + hash(i, 31) * 12000;
		const q = ((ms + hash(i, 33) * sp) % sp) / sp;
		const bx = dir > 0 ? -40 + q * (w + 80) : w + 40 - q * (w + 80);
		const by = h * (0.1 + hash(i, 35) * 0.32) + Math.sin(ms * 0.0021 + i * 2.3) * h * 0.02;
		const onMoon = Math.hypot(bx - mX, by - mY) < mR * 1.05;
		bat(
			ctx,
			bx,
			by,
			dir,
			0.5 + 0.5 * Math.sin(ms * 0.012 + hash(i, 37) * TAU),
			1.5 + hash(i, 39) * 0.9,
			onMoon ? 'rgba(8, 11, 18, 0.92)' : `rgba(${MOONC}, 0.42)`
		);
	}

	// No eyebrow on this one, unlike the other motifs: the scene is already
	// legible without being captioned, and the title sits directly under the card.
	// Bottom-left, not top-right: the moon and its halo own that corner, and
	// small type laid over the glow was unreadable at card size.
	ctx.font = `400 22px ${UI}`;
	ctx.fillStyle = P.sub;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(standing === TREE_N ? 'new forests begin' : `${standing} planted`, w * 0.05, h * 0.94);
}

// ---------------------------------------------------------------------------

export type ExtraMotif =
	| 'diorama-shelf'
	| 'four-collections'
	| 'orb-witness'
	| 'cut-early'
	| 'atlas-index'
	| 'almost-nothing'
	| 'night-planting';

export const EXTRA_MOTIFS: Record<
	ExtraMotif,
	{ draw: (c: CanvasRenderingContext2D, w: number, h: number, ms: number) => void; still: number; label: string }
> = {
	'diorama-shelf': {
		draw: dioramaShelf,
		still: 3000,
		label:
			'Three miniature landmarks in lit boxes on a shelf, with a single lamp crossing above them — larger than any of the monuments it lights.',
	},
	'four-collections': {
		draw: fourCollections,
		still: 2000,
		label:
			'Four small screens running at once: a counter ticking, a pattern drawing itself, an old terminal typing, and a cursor clicking a button.',
	},
	'orb-witness': {
		draw: orbWitness,
		still: 8000,
		label:
			'A single point of light crossing a horizon that changes era behind it — jungle, then monuments, then towers — leaving a fading trail.',
	},
	'cut-early': {
		draw: cutEarly,
		still: 6000,
		label:
			'Eight arcs racing around toward closing and stopping short of it every time, with a scrub bar below that halts at the same point.',
	},
	'atlas-index': {
		draw: atlasIndex,
		still: 5000,
		label:
			'A hundred small cells each performing their own scrap of animation, with one lit and numbered at a time as it is checked and written down.',
	},
	'almost-nothing': {
		draw: almostNothing,
		still: 10500,
		label:
			'A grid of app icons whose red notification badges go out one by one until the screen is empty, and then stays empty.',
	},
	'night-planting': {
		draw: nightPlanting,
		// Late in the loop: every tree grown, the flock still crossing.
		still: 13600,
		label:
			'Bats crossing a full moon over a lantern-lit river town at night, dropping seeds that grow one by one into a line of trees along the near bank.',
	},
};
