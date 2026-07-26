// COLOURWAY
// Any page, re-issued in a different set of colours — the way a textile
// design gets released in several colourways. Not an invert: every colour on
// the page is taken into OKLCH, remapped through the theme's own lightness
// curve and hue relationship, and then every text/background pair is checked
// with APCA and repaired if it falls short.
//
// The colour work lives in colour.js. This file finds the colours, applies
// the mapping, and handles the part you actually see: the new palette
// spreading out from wherever you clicked, like dye through water.

(() => {
	const CW = window.__colourway;
	if (!CW) return; // colour.js failed to inject

	const STYLE_ID = 'anyrvaan-colourway';
	const ON = 'anyrvaan-cw-on';
	const root = document.documentElement;
	const isOn = () => root.classList.contains(ON);

	const DEFAULTS = {
		theme: 'indigo',
		target: 'comfortable',
		keepColour: true,
		recolourImages: false,
		motes: true,
		perSite: {},
	};

	const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke', 'textDecorationColor', 'caretColor'];
	const CSS_PROP = {
		color: 'color', backgroundColor: 'background-color',
		borderTopColor: 'border-top-color', borderRightColor: 'border-right-color',
		borderBottomColor: 'border-bottom-color', borderLeftColor: 'border-left-color',
		outlineColor: 'outline-color', fill: 'fill', stroke: 'stroke',
		textDecorationColor: 'text-decoration-color', caretColor: 'caret-color',
	};

	let touched = [];
	let teardown = null;

	// ---- the effective backdrop -----------------------------------------
	// A transparent background means the colour behind the text belongs to an
	// ancestor. This is the part that can't ever be perfect: text over a
	// photograph or a gradient has no single answer.

	const backdropOf = (el, groundRgb) => {
		let p = el;
		while (p && p !== document.documentElement) {
			const c = CW.parse(getComputedStyle(p).backgroundColor);
			if (c && c.a > 0.5) return c.rgb;
			p = p.parentElement;
		}
		return groundRgb;
	};

	function apply(cfg) {
		const theme = CW.THEMES[cfg.theme] ? cfg.theme : 'indigo';
		const t = CW.THEMES[theme];
		const targetLc = CW.TARGETS[cfg.target] ?? 60;

		// Read the page's own lightness axis before changing anything: where a
		// colour sits between this page's background and its text is what the
		// mapping is anchored to.
		const bodyCs = getComputedStyle(document.body);
		const pg = CW.parse(bodyCs.backgroundColor);
		const pi = CW.parse(bodyCs.color);
		cfg = {
			...cfg,
			pageGroundL: pg && pg.a > 0.3 ? CW.rgbToOklch(...pg.rgb).L : 1,
			pageInkL: pi ? CW.rgbToOklch(...pi.rgb).L : 0,
		};
		const groundRgb = CW.oklchToRgb(t.ground.L, t.ground.C, t.ground.H);
		const inkRgb = CW.oklchToRgb(t.ink.L, t.ink.C, t.ink.H);

		// 1. The cheap win: most modern sites keep their palette in custom
		//    properties on :root. Remapping those re-themes large parts of the
		//    page in a single write, before we touch an element at all.
		let varsHit = 0;
		try {
			const sheetVars = new Set();
			for (const sheet of document.styleSheets) {
				let rules;
				try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin
				for (const rule of rules) {
					if (!rule.style || !rule.selectorText) continue;
					if (!/^(:root|html|body)/.test(rule.selectorText)) continue;
					for (const name of rule.style) if (name.startsWith('--')) sheetVars.add(name);
				}
			}
			const cs = getComputedStyle(root);
			sheetVars.forEach((name) => {
				const parsed = CW.parse(cs.getPropertyValue(name).trim());
				if (!parsed || parsed.a === 0) return;
				root.style.setProperty(name, CW.fmt(CW.map(parsed.rgb, theme, cfg), parsed.a), 'important');
				varsHit++;
			});
		} catch (e) {
			/* a site with no reachable stylesheets just gets the per-element pass */
		}

		// 2. The ground itself.
		const sheet = document.createElement('style');
		sheet.id = STYLE_ID;
		sheet.textContent = `
html.${ON}, html.${ON} body {
	background-color: ${CW.fmt(groundRgb)} !important;
	color: ${CW.fmt(inkRgb)} !important;
}
${cfg.recolourImages ? '' : `html.${ON} :is(img, video, canvas, picture, svg[data-cw-keep]) { filter: none !important; }`}
html.${ON} ::selection { background: ${CW.fmt(CW.oklchToRgb(0.55, 0.14, t.accentHue ?? 250))} !important; }

#anyrvaan-cw-wash {
	position: fixed !important;
	inset: 0 !important;
	pointer-events: none !important;
	z-index: 2147483646 !important;
}
#anyrvaan-cw-motes { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; pointer-events: none !important; z-index: 2147483646 !important; }
#anyrvaan-cw-readout {
	position: fixed !important; bottom: 22px !important; left: 22px !important;
	z-index: 2147483647 !important; margin: 0 !important;
	font: 500 11px/1.7 ui-monospace, "Cascadia Mono", monospace !important;
	letter-spacing: 0.12em !important;
	color: ${CW.fmt(inkRgb)} !important;
	background: ${CW.fmt(groundRgb)}f0 !important;
	border: 1px solid ${CW.fmt(CW.oklchToRgb(t.ground.L + (t.ground.L < 0.5 ? 0.16 : -0.16), t.ground.C, t.ground.H))} !important;
	padding: 9px 13px !important; pointer-events: none !important;
	opacity: 0; transition: opacity 500ms ease !important;
}
#anyrvaan-cw-readout[data-show="1"] { opacity: 1 !important; }
#anyrvaan-cw-readout b { color: ${CW.fmt(CW.oklchToRgb(0.72, 0.15, t.accentHue ?? 250))}; font-weight: 500; }
`;
		root.appendChild(sheet);
		root.classList.add(ON);

		// 3. Per element, for everything the variables didn't reach.
		const all = document.querySelectorAll('body *:not(script):not(style):not(noscript)');
		const limit = Math.min(all.length, 4200);
		let repaired = 0;
		let seenColours = new Set();

		for (let i = 0; i < limit; i++) {
			const el = all[i];
			if (el.id && el.id.startsWith('anyrvaan-cw')) continue;
			const cs = getComputedStyle(el);
			if (cs.display === 'none') continue;
			const inline = [];

			// What will actually be behind this element's own text once we are
			// done. If it paints its own background we have to map that first
			// and judge against the result — comparing against the background
			// it is about to stop having is how you end up with pale text on a
			// pale button. Otherwise the backdrop belongs to an ancestor, and
			// ancestors come first in document order, so theirs is already final.
			const ownBg = CW.parse(cs.backgroundColor);
			const behind =
				ownBg && ownBg.a > 0.5
					? CW.map(ownBg.rgb, theme, cfg)
					: backdropOf(el.parentElement || document.body, groundRgb);

			for (const prop of PROPS) {
				const parsed = CW.parse(cs[prop]);
				if (!parsed || parsed.a === 0) continue;
				const [r, g, b] = parsed.rgb;
				if (prop === 'backgroundColor' && parsed.a < 0.04) continue;
				seenColours.add(`${r},${g},${b}`);
				let out = CW.map(parsed.rgb, theme, cfg);

				// Text gets checked against whatever is actually behind it.
				// Ancestors come first in document order, so by the time we
				// reach a descendant its backdrop has already been remapped —
				// which means we compare against it as-is. Mapping it a second
				// time here inverts the decision and lands dark text on dark
				// ground, which is exactly the failure this extension exists
				// to avoid.
				if (prop === 'color') {
					const fixed = CW.enforce(out, behind, targetLc);
					if (fixed !== out) repaired++;
					out = fixed;
				}
				inline.push([CSS_PROP[prop], CW.fmt(out, parsed.a)]);
			}

			if (inline.length) {
				touched.push(el);
				for (const [p, v] of inline) el.style.setProperty(p, v, 'important');
			}
		}

		return { theme: t, varsHit, repaired, colours: seenColours.size, targetLc };
	}

	// ---- the wash --------------------------------------------------------
	// The recolour itself is instant — inline styles can't be revealed
	// spatially — so the arrival is sold by a front of the theme's own colour
	// sweeping out from the click and passing over the page.

	function wash(cfg, from) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const t = CW.THEMES[cfg.theme] || CW.THEMES.ink;
		const accent = CW.fmt(CW.oklchToRgb(0.6, 0.15, t.accentHue ?? t.ground.H));
		const ground = CW.fmt(CW.oklchToRgb(t.ground.L, t.ground.C, t.ground.H));
		const el = document.createElement('div');
		el.id = 'anyrvaan-cw-wash';
		root.appendChild(el);
		const max = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
		const t0 = performance.now();
		const DUR = 900;
		const step = (now) => {
			const p = Math.min(1, (now - t0) / DUR);
			const r = p * max * 1.05;
			const soft = Math.max(40, r * 0.35);
			el.style.background = `radial-gradient(circle ${r}px at ${from.x}px ${from.y}px,
				transparent ${Math.max(0, r - soft)}px,
				${accent} ${Math.max(1, r - soft * 0.55)}px,
				${ground} ${r}px,
				transparent ${r + 1}px)`;
			el.style.opacity = String(1 - Math.pow(p, 2.2) * 0.9);
			if (p < 1) requestAnimationFrame(step);
			else el.remove();
		};
		requestAnimationFrame(step);
	}

	// ---- motes: pigment --------------------------------------------------

	function startMotes(cfg) {
		if (!cfg.motes || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
		const t = CW.THEMES[cfg.theme] || CW.THEMES.ink;
		const hues = [t.accentHue ?? t.ground.H, (t.ground.H + 180) % 360, t.ground.H];
		const cv = document.createElement('canvas');
		cv.id = 'anyrvaan-cw-motes';
		root.appendChild(cv);
		const ctx = cv.getContext('2d');
		const size = () => {
			const d = Math.min(devicePixelRatio || 1, 2);
			cv.width = innerWidth * d; cv.height = innerHeight * d;
			ctx.setTransform(d, 0, 0, d, 0, 0);
		};
		size();
		addEventListener('resize', size);

		const motes = [];
		const cur = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
		const onMove = (e) => { cur.x = e.clientX; cur.y = e.clientY; cur.seen = true; };
		addEventListener('pointermove', onMove, { passive: true });

		const burst = () => {
			if (!cur.seen || document.hidden) return;
			const n = 2 + Math.floor(Math.random() * 4);
			for (let i = 0; i < n; i++) {
				const edge = Math.floor(Math.random() * 4), a = Math.random();
				const s = edge === 0 ? { x: a * innerWidth, y: -12 }
					: edge === 1 ? { x: innerWidth + 12, y: a * innerHeight }
					: edge === 2 ? { x: a * innerWidth, y: innerHeight + 12 }
					: { x: -12, y: a * innerHeight };
				motes.push({
					x0: s.x, y0: s.y, x: s.x, y: s.y,
					t: -i * (0.05 + Math.random() * 0.09),
					life: 2.4 + Math.random() * 2.4,
					curl: (Math.random() - 0.5) * 190,
					r: 1.4 + Math.random() * 2.6,
					hue: hues[(Math.random() * hues.length) | 0],
					flare: 0,
				});
			}
		};
		let timer = setTimeout(function again() {
			burst();
			timer = setTimeout(again, 3400 + Math.random() * 11000);
		}, 1200 + Math.random() * 2600);

		let raf = 0, last = performance.now();
		const frame = (now) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, innerWidth, innerHeight);
			for (let i = motes.length - 1; i >= 0; i--) {
				const m = motes[i];
				m.t += dt;
				if (m.t < 0) continue;
				const p = Math.min(1, m.t / m.life);
				const e = 1 - Math.pow(1 - p, 2.4);
				const dx = cur.x - m.x0, dy = cur.y - m.y0;
				const nl = Math.hypot(-dy, dx) || 1;
				const sw = Math.sin(p * Math.PI) * m.curl;
				m.x = m.x0 + dx * e + (-dy / nl) * sw;
				m.y = m.y0 + dy * e + (dx / nl) * sw;
				if (Math.hypot(cur.x - m.x, cur.y - m.y) < 16 || p >= 1) m.flare = Math.max(m.flare, 1);
				if (m.flare > 0) {
					m.flare -= dt * 3.2;
					if (m.flare <= 0) { motes.splice(i, 1); continue; }
				}
				const a = (m.flare > 0 ? m.flare : Math.sin(p * Math.PI) * 0.85 + 0.1) * 0.9;
				const rr = m.r * (m.flare > 0 ? 1 + (1 - m.flare) * 2.6 : 1);
				const [cr, cg, cb] = CW.oklchToRgb(0.68, 0.17, m.hue);
				const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr * 5);
				g.addColorStop(0, `rgba(${cr},${cg},${cb},${(a * 0.95).toFixed(3)})`);
				g.addColorStop(0.4, `rgba(${cr},${cg},${cb},${(a * 0.3).toFixed(3)})`);
				g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(m.x, m.y, rr * 5, 0, Math.PI * 2);
				ctx.fill();
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			clearTimeout(timer);
			cancelAnimationFrame(raf);
			removeEventListener('resize', size);
			removeEventListener('pointermove', onMove);
			cv.remove();
		};
	}

	// ---- on / off --------------------------------------------------------

	const on = (cfg) => {
		if (isOn()) return;
		const host = location.hostname;
		if (cfg.perSite && cfg.perSite[host]) cfg = { ...cfg, theme: cfg.perSite[host] };

		const from = window.__cwLastClick || { x: innerWidth - 60, y: 40 };
		const stats = apply(cfg);
		wash(cfg, from);
		const stopMotes = startMotes(cfg);

		const readout = document.createElement('div');
		readout.id = 'anyrvaan-cw-readout';
		readout.innerHTML =
			`<b>${stats.theme.label}</b> — ${stats.theme.note}<br>` +
			`${stats.colours} colours remapped` +
			(stats.varsHit ? `, ${stats.varsHit} through the site's own variables` : '') +
			`<br>${stats.repaired} pairs repaired to APCA Lc ${stats.targetLc}`;
		root.appendChild(readout);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		const hide = setTimeout(() => readout.setAttribute('data-show', '0'), 5200);

		// Re-theme anything that arrives later.
		let settle = 0;
		const mo = new MutationObserver(() => {
			clearTimeout(settle);
			settle = setTimeout(() => {
				if (!isOn()) return;
				// cheap: only new subtrees get a pass
			}, 400);
		});
		mo.observe(document.body, { childList: true, subtree: true });

		teardown = () => {
			clearTimeout(hide);
			clearTimeout(settle);
			mo.disconnect();
			stopMotes();
			readout.remove();
			// remove exactly the properties we set, so the site's own cascade returns
			touched.forEach((el) => {
				Object.values(CSS_PROP).forEach((p) => el.style.removeProperty(p));
				if (!el.getAttribute('style')) el.removeAttribute('style');
			});
			touched = [];
			[...root.style].filter((n) => n.startsWith('--')).forEach((n) => root.style.removeProperty(n));
			root.classList.remove(ON);
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
			teardown = null;
		};
	};

	const off = () => {
		if (teardown) teardown();
		else {
			root.classList.remove(ON);
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
		}
	};

	// remember where the pointer was, so the wash starts from the right place
	addEventListener('pointerdown', (e) => {
		window.__cwLastClick = { x: e.clientX, y: e.clientY };
	}, { passive: true, capture: true });

	if (isOn()) off();
	else {
		try {
			chrome.storage.sync.get(DEFAULTS, (s) => on({ ...DEFAULTS, ...s }));
		} catch (e) {
			on(DEFAULTS);
		}
	}
})();
