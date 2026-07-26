// COLOURWAY — the colour engine
// -------------------------------------------------------------------------
// Everything here works in OKLCH, where lightness, chroma and hue are
// separable and perceptually even. That is the whole reason this doesn't
// look like the invert filters: in HSL, "50% lightness" means something
// completely different for yellow than for blue, so any transform built on
// it wrecks a palette. In OKLab it doesn't.
//
// Contrast is judged with APCA rather than the WCAG 2.1 ratio, because 2.1
// is known to misjudge pairs on dark backgrounds — which is exactly the case
// this extension spends most of its time in.

(() => {
	const CW = (window.__colourway = window.__colourway || {});

	// ---- sRGB ⇄ OKLCH ----------------------------------------------------

	const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
	const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

	function rgbToOklch(r, g, b) {
		const R = toLin(r / 255), G = toLin(g / 255), B = toLin(b / 255);
		const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
		const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
		const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
		const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
		const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
		const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
		return { L, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180) / Math.PI };
	}

	function oklchToRgb(L, C, H) {
		const h = (H * Math.PI) / 180;
		const A = Math.cos(h) * C, B = Math.sin(h) * C;
		const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
		const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
		const s_ = L - 0.0894841775 * A - 1.291485548 * B;
		const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
		const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
		const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
		const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
		const cl = (v) => Math.max(0, Math.min(255, Math.round(toSrgb(v) * 255)));
		return [cl(r), cl(g), cl(b)];
	}

	// ---- APCA (published 0.1.9 constants) --------------------------------

	const Y = ([r, g, b]) =>
		0.2126729 * Math.pow(r / 255, 2.4) +
		0.7151522 * Math.pow(g / 255, 2.4) +
		0.072175 * Math.pow(b / 255, 2.4);

	function apca(txt, bg) {
		const T = 0.022, CLIP = 1.414, SC = 1.14, OFF = 0.027, CLAMP = 0.1;
		let yt = Y(txt), yb = Y(bg);
		yt = yt > T ? yt : yt + Math.pow(T - yt, CLIP);
		yb = yb > T ? yb : yb + Math.pow(T - yb, CLIP);
		if (Math.abs(yb - yt) < 0.0005) return 0;
		let c =
			yb > yt
				? (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * SC
				: (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * SC;
		if (Math.abs(c) < CLAMP) return 0;
		return (c > 0 ? c - OFF : c + OFF) * 100;
	}

	// ---- parsing ---------------------------------------------------------

	const RGB = /^rgba?\(([^)]+)\)$/i;
	function parse(css) {
		if (!css) return null;
		const s = css.trim();
		if (s === 'transparent') return { rgb: [0, 0, 0], a: 0 };
		const m = s.match(RGB);
		if (!m) return null;
		const p = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);
		if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null;
		return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
	}
	const fmt = ([r, g, b], a = 1) => (a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`);

	// ---- the themes ------------------------------------------------------
	//
	// Each is a scheme, not a tint: a ground, an ink, an accent hue chosen by
	// its relationship to the ground, and a curve describing how the page's
	// own lightness range is remapped into it.

	const THEMES = {
		ink: {
			label: 'Ink',
			ground: { L: 0.17, C: 0.006, H: 250 },
			ink: { L: 0.93, C: 0.012, H: 80 },
			accentShift: 0,
			chroma: 0.85,
			tint: 0.5,
			note: 'neutral dark',
		},
		paper: {
			label: 'Paper',
			ground: { L: 0.965, C: 0.012, H: 85 },
			ink: { L: 0.22, C: 0.01, H: 60 },
			accentShift: 0,
			chroma: 0.9,
			tint: 0.5,
			note: 'neutral light, warm',
		},
		indigo: {
			label: 'Indigo',
			ground: { L: 0.19, C: 0.055, H: 275 },
			ink: { L: 0.94, C: 0.02, H: 265 },
			// amber sits opposite indigo — the accent is the complement
			accentHue: 75,
			accentShift: 0.55,
			chroma: 1.0,
			tint: 1,
			note: 'complementary, amber accent',
		},
		teal: {
			label: 'Teal',
			ground: { L: 0.2, C: 0.05, H: 195 },
			ink: { L: 0.93, C: 0.025, H: 90 },
			// coral: split-complementary against teal
			accentHue: 35,
			accentShift: 0.55,
			chroma: 1.05,
			tint: 1,
			note: 'split-complementary, coral accent',
		},
		maximum: {
			label: 'Maximum',
			ground: { L: 0.06, C: 0, H: 0 },
			ink: { L: 1, C: 0, H: 0 },
			accentHue: 95,
			accentShift: 0.9,
			chroma: 0.35,
			tint: 0,
			note: 'highest contrast, one accent',
		},
	};

	const TARGETS = { comfortable: 60, high: 75, maximum: 90 };

	/**
	 * Map one colour into a theme.
	 *
	 * Lightness runs through a piecewise curve rather than being flipped, so
	 * near-white grounds go deep, near-black text lands on a soft off-white
	 * instead of a glaring pure one, and the mid-tones — where a site's actual
	 * design lives — move least.
	 *
	 * Hue is rotated *toward* the theme's anchor by a fraction, which keeps
	 * the distance between the page's own hues intact. Flattening every hue
	 * onto one value is what makes themed extensions look like a wash.
	 */
	function map(rgb, theme, opts) {
		const t = THEMES[theme] || THEMES.ink;
		const { L, C, H } = rgbToOklch(rgb[0], rgb[1], rgb[2]);

		// Map the page's *own* lightness axis onto the theme's. Where a colour
		// sits between this page's background and its text is what matters —
		// not whether it happens to be a high or low number. That one idea
		// makes all four cases work: light page into a dark theme inverts,
		// dark page into a dark theme doesn't, and both light and dark pages
		// land correctly in Paper. A blanket flip gets half of them wrong.
		const gL = opts.pageGroundL ?? 1;
		const iL = opts.pageInkL ?? 0;
		const span = iL - gL;
		let n = Math.abs(span) < 0.08 ? 1 - L : (L - gL) / span; // 0 at ground, 1 at ink
		n = Math.max(-0.25, Math.min(1.25, n));
		// ease the middle so the page's mid-tones keep their separation
		const eased = n < 0 || n > 1 ? n : n * n * (3 - 2 * n) * 0.35 + n * 0.65;
		let outL = t.ground.L + eased * (t.ink.L - t.ground.L);

		let outC = C * t.chroma * (opts.keepColour ? 1 : 0.9);
		let outH = H;

		// A page is mostly greys, and greys are what carry a scheme. Anything
		// near-neutral takes the theme's own hue and a chroma interpolated
		// along the ground→ink axis; anything that already has colour keeps
		// its own hue, only rotated part-way toward the accent so the page's
		// internal colour relationships survive.
		const neutrality = 1 - Math.min(1, C / 0.045);
		if (neutrality > 0 && t.tint) {
			const themeH = t.ground.H;
			const themeC = t.ground.C + eased * (t.ink.C - t.ground.C);
			const k = neutrality * t.tint;
			outH = k > 0.5 ? themeH : outH;
			outC = outC * (1 - k) + themeC * k;
		}
		if (t.accentHue != null && C > 0.045) {
			// Nudge a hue toward the scheme rather than shifting it. Anything more and
			// a blue link comes out violet — the page stops being itself.
			const d = ((t.accentHue - H + 540) % 360) - 180;
			outH = H + d * t.accentShift * 0.18;
			outC = Math.min(outC, 0.19);
		}
		if (theme === 'maximum') outC = Math.min(outC, 0.02);

		return oklchToRgb(Math.max(0, Math.min(1, outL)), Math.max(0, outC), outH);
	}

	/**
	 * Walk the text's lightness away from its background until the pair clears
	 * the APCA target — keeping its hue, and giving up chroma only as far as
	 * it has to. Returns the original when it already passes, so callers can
	 * count how many pairs actually needed repairing.
	 */
	function enforce(txtRgb, bgRgb, targetLc) {
		if (Math.abs(apca(txtRgb, bgRgb)) >= targetLc) return txtRgb;
		const { L, C, H } = rgbToOklch(txtRgb[0], txtRgb[1], txtRgb[2]);
		const bgL = rgbToOklch(bgRgb[0], bgRgb[1], bgRgb[2]).L;
		const dir = bgL < 0.5 ? 1 : -1; // dark ground → push the text lighter
		let best = txtRgb;
		let bestLc = Math.abs(apca(txtRgb, bgRgb));
		for (let i = 1; i <= 26; i++) {
			const nl = Math.max(0, Math.min(1, L + dir * i * 0.035));
			// very light or very dark text can't hold much chroma
			const nc = C * (1 - Math.min(0.55, i * 0.03));
			const cand = oklchToRgb(nl, nc, H);
			const lc = Math.abs(apca(cand, bgRgb));
			if (lc > bestLc) { bestLc = lc; best = cand; }
			if (lc >= targetLc) return cand;
			if (nl === 0 || nl === 1) break;
		}
		return best;
	}

	Object.assign(CW, { rgbToOklch, oklchToRgb, apca, parse, fmt, map, enforce, THEMES, TARGETS });
})();
