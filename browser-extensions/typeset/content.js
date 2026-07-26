// TYPESET
// Re-sets any page in a pairing you actually chose, and does it as a wave:
// the page dims from the top down, the type changes underneath, and each line
// comes back with its leading and measure corrected.
//
// Every face here is one already installed on your machine. Nothing is
// downloaded, so this needs no network permission and works offline — and no
// site can be told which font you picked.

(() => {
	const STYLE_ID = 'anyrvaan-typeset';
	const FONT_ID = 'anyrvaan-typeset-font';
	const ON = 'anyrvaan-ts-on';
	const root = document.documentElement;
	const isOn = () => root.classList.contains(ON);

	// ---- the pairings -----------------------------------------------------
	// Each is a decision, not a font list: a face to be read in, a face to be
	// announced in, and a leading correction because x-heights differ.

	const PAIRINGS = {
		editorial: {
			label: 'Editorial',
			display: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
			body: 'Charter, "Bitstream Charter", Cambria, Georgia, serif',
			mono: 'Consolas, "Cascadia Mono", Menlo, ui-monospace, monospace',
			leading: 1.62,
			measure: 68,
		},
		technical: {
			label: 'Technical',
			display: '"Segoe UI", system-ui, -apple-system, Avenir, "Helvetica Neue", sans-serif',
			body: '"Segoe UI", system-ui, -apple-system, Avenir, "Helvetica Neue", sans-serif',
			mono: 'Consolas, "Cascadia Mono", Menlo, ui-monospace, monospace',
			leading: 1.58,
			measure: 74,
		},
		quiet: {
			label: 'Quiet',
			display: 'Optima, Candara, "Gill Sans", "Gill Sans MT", system-ui, sans-serif',
			body: 'Optima, Candara, "Gill Sans", "Gill Sans MT", system-ui, sans-serif',
			mono: 'Consolas, "Cascadia Mono", Menlo, ui-monospace, monospace',
			leading: 1.66,
			measure: 66,
		},
		display: {
			label: 'Display',
			display: 'Didot, "Bodoni MT", "Hoefler Text", "Playfair Display", Georgia, serif',
			body: 'system-ui, "Segoe UI", -apple-system, sans-serif',
			mono: 'Consolas, "Cascadia Mono", Menlo, ui-monospace, monospace',
			leading: 1.6,
			measure: 70,
		},
		typewriter: {
			label: 'Typewriter',
			display: '"Cascadia Mono", Consolas, Menlo, ui-monospace, monospace',
			body: '"Cascadia Mono", Consolas, Menlo, ui-monospace, monospace',
			mono: '"Cascadia Mono", Consolas, Menlo, ui-monospace, monospace',
			leading: 1.7,
			measure: 62,
		},
	};

	const SCALES = { compact: 0.94, normal: 1, generous: 1.08 };

	const DEFAULTS = {
		pairing: 'editorial',
		scale: 'normal',
		capMeasure: true,
		correctLeading: true,
		motes: true,
		perSite: {},
	};

	const host = location.hostname;

	// ---- what the site was already doing ----------------------------------
	// Read before touching. The one-line report is the honest part: it says
	// what it found and what it did about it.

	const readSite = () => {
		// The widest paragraph carrying real prose — not the first one in the
		// DOM, which on most sites is a sidebar promo and reports a measure of
		// about twenty characters.
		let sample = document.body;
		let best = 0;
		document.querySelectorAll('article p, main p, .post p, .content p, p').forEach((el) => {
			const len = (el.textContent || '').trim().length;
			if (len < 90) return;
			const w = el.getBoundingClientRect().width;
			if (w > best) {
				best = w;
				sample = el;
			}
		});
		const cs = getComputedStyle(sample);
		const fam = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
		const size = Math.round(parseFloat(cs.fontSize) || 16);
		const lh = parseFloat(cs.lineHeight);
		const ratio = lh && size ? (lh / size).toFixed(2) : '—';
		// characters per line, roughly: width / (0.5 * font-size)
		const w = sample.getBoundingClientRect().width || 640;
		const measure = Math.round(w / (size * 0.5));
		const serif = /serif|georgia|times|garamond|charter|palatino|book/i.test(cs.fontFamily) &&
			!/sans/i.test(cs.fontFamily);
		return { fam: fam || 'an unnamed face', size, ratio, measure, serif };
	};

	// ---- icon fonts, and other things to leave alone ----------------------
	// This is why most font extensions leave a trail of tofu: icon sets render
	// glyphs from the Private Use Area or by ligature. Override those and every
	// icon on the page turns into a stray letter.

	const ICON_FAMILY = /icon|material|fontawesome|font awesome|glyphicon|ionicons|feather|octicons|typcn|dashicons|elusive|entypo/i;
	const PUA = /[-0-￿D]/;

	const isIconish = (el) => {
		const cs = getComputedStyle(el);
		if (ICON_FAMILY.test(cs.fontFamily)) return true;
		const cls = String(el.className || '');
		if (/(^|[\s-])(icon|fa|fas|far|fab|material-icons|glyphicon)([\s-]|$)/i.test(cls)) return true;
		const t = (el.textContent || '').trim();
		if (t.length <= 3 && PUA.test(t)) return true;
		return false;
	};

	const SKIP = 'code,pre,kbd,samp,tt,[class*="icon"],[class*="Icon"],svg,math';

	// ---- the sheet --------------------------------------------------------

	const buildSheet = (cfg, p) => {
		const scale = SCALES[cfg.scale] || 1;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
html.${ON} body,
html.${ON} body :not(${SKIP}):not(.anyrvaan-ts-skip):not([class*="anyrvaan-ts"]) {
	font-family: ${p.body} !important;
}
html.${ON} :is(h1,h2,h3,h4,h5,h6,.title,[class*="headline"]):not(.anyrvaan-ts-skip) {
	font-family: ${p.display} !important;
	letter-spacing: -0.012em !important;
}
html.${ON} :is(code,pre,kbd,samp,tt),
html.${ON} :is(code,pre,kbd,samp,tt) * {
	font-family: ${p.mono} !important;
}
${cfg.correctLeading ? `
html.${ON} :is(p,li,blockquote,dd,figcaption) {
	line-height: ${(p.leading * scale).toFixed(3)} !important;
}
html.${ON} :is(h1,h2,h3) { line-height: 1.14 !important; }
` : ''}
${cfg.capMeasure ? `
html.${ON} :is(article,main) :is(p,li,blockquote) {
	max-width: ${Math.round(p.measure * scale)}ch !important;
}
` : ''}
${scale !== 1 ? `html.${ON} body { font-size: ${(scale * 100).toFixed(1)}% !important; }` : ''}

/* Nothing marked as an icon is ever touched. */
html.${ON} .anyrvaan-ts-skip,
html.${ON} .anyrvaan-ts-skip * {
	font-family: revert !important;
}

/* The wave: each element dips on its own delay, the type changes while it is
   dim, and it comes back re-set. */
html.${ON} [style*="--ts-d"],
html.anyrvaan-ts-swapping [style*="--ts-d"] {
	transition: opacity 200ms ease var(--ts-d, 0ms), filter 200ms ease var(--ts-d, 0ms) !important;
}
html.anyrvaan-ts-dip [style*="--ts-d"] {
	opacity: 0.22 !important;
	filter: blur(1.1px) !important;
}
@media (prefers-reduced-motion: reduce) {
	html.anyrvaan-ts-dip [style*="--ts-d"] { opacity: 1 !important; filter: none !important; }
}

#anyrvaan-ts-motes {
	position: fixed !important;
	inset: 0 !important;
	width: 100% !important;
	height: 100% !important;
	pointer-events: none !important;
	z-index: 2147483646 !important;
}
#anyrvaan-ts-readout {
	position: fixed !important;
	bottom: 22px !important;
	left: 22px !important;
	max-width: min(560px, calc(100vw - 44px)) !important;
	z-index: 2147483647 !important;
	margin: 0 !important;
	font: 500 11px/1.7 ui-monospace, "Cascadia Mono", "Courier New", monospace !important;
	letter-spacing: 0.1em !important;
	color: rgba(236, 230, 219, 0.86) !important;
	background: rgba(8, 10, 12, 0.9) !important;
	border: 1px solid rgba(236, 230, 219, 0.22) !important;
	padding: 9px 13px !important;
	pointer-events: none !important;
	opacity: 0;
	transition: opacity 500ms ease !important;
}
#anyrvaan-ts-readout[data-show="1"] { opacity: 1 !important; }
#anyrvaan-ts-readout b { color: #E9A73C; font-weight: 500; }
`;
		return style;
	};

	// ---- motes: letterforms, drifting in ----------------------------------

	const GLYPHS = ['a', 'g', 'e', 'ß', '&', 'Q', 'R', 'ffi', '¶', '§', 'æ', '@', 'k', 'y'];

	function startMotes(cfg, p) {
		if (!cfg.motes || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
		const cv = document.createElement('canvas');
		cv.id = 'anyrvaan-ts-motes';
		root.appendChild(cv);
		const ctx = cv.getContext('2d');
		const size = () => {
			const d = Math.min(devicePixelRatio || 1, 2);
			cv.width = innerWidth * d;
			cv.height = innerHeight * d;
			ctx.setTransform(d, 0, 0, d, 0, 0);
		};
		size();
		addEventListener('resize', size);

		const motes = [];
		const cursor = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
		const onMove = (e) => {
			cursor.x = e.clientX;
			cursor.y = e.clientY;
			cursor.seen = true;
		};
		addEventListener('pointermove', onMove, { passive: true });

		const burst = () => {
			if (!cursor.seen || document.hidden) return;
			const n = 2 + Math.floor(Math.random() * 4);
			for (let i = 0; i < n; i++) {
				const edge = Math.floor(Math.random() * 4);
				const t = Math.random();
				const s =
					edge === 0 ? { x: t * innerWidth, y: -20 } :
					edge === 1 ? { x: innerWidth + 20, y: t * innerHeight } :
					edge === 2 ? { x: t * innerWidth, y: innerHeight + 20 } :
					{ x: -20, y: t * innerHeight };
				motes.push({
					x0: s.x, y0: s.y, x: s.x, y: s.y,
					t: -i * (0.06 + Math.random() * 0.1),
					life: 2.6 + Math.random() * 2.4,
					curl: (Math.random() - 0.5) * 160,
					size: 11 + Math.random() * 13,
					rot: (Math.random() - 0.5) * 0.7,
					ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
					flare: 0,
				});
			}
		};
		let timer = setTimeout(function again() {
			burst();
			timer = setTimeout(again, 3600 + Math.random() * 12000);
		}, 1400 + Math.random() * 2400);

		let raf = 0;
		let last = performance.now();
		const frame = (now) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, innerWidth, innerHeight);
			for (let i = motes.length - 1; i >= 0; i--) {
				const m = motes[i];
				m.t += dt;
				if (m.t < 0) continue;
				const pr = Math.min(1, m.t / m.life);
				const e = 1 - Math.pow(1 - pr, 2.4);
				const dx = cursor.x - m.x0;
				const dy = cursor.y - m.y0;
				const nl = Math.hypot(-dy, dx) || 1;
				const sw = Math.sin(pr * Math.PI) * m.curl;
				m.x = m.x0 + dx * e + (-dy / nl) * sw;
				m.y = m.y0 + dy * e + (dx / nl) * sw;
				if (Math.hypot(cursor.x - m.x, cursor.y - m.y) < 16 || pr >= 1) m.flare = Math.max(m.flare, 1);
				if (m.flare > 0) {
					m.flare -= dt * 3.2;
					if (m.flare <= 0) { motes.splice(i, 1); continue; }
				}
				const a = (m.flare > 0 ? m.flare : Math.sin(pr * Math.PI) * 0.85 + 0.1) * 0.9;
				ctx.save();
				ctx.translate(m.x, m.y);
				ctx.rotate(m.rot * (1 - pr));
				ctx.font = `${m.size * (m.flare > 0 ? 1 + (1 - m.flare) * 0.7 : 1)}px ${p.display}`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.shadowColor = `rgba(233,167,60,${(a * 0.9).toFixed(3)})`;
				ctx.shadowBlur = 12;
				ctx.fillStyle = `rgba(255,238,205,${a.toFixed(3)})`;
				ctx.fillText(m.ch, 0, 0);
				ctx.restore();
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

	// ---- on / off ---------------------------------------------------------

	let teardown = null;

	const on = (cfg) => {
		if (isOn()) return;
		const key = cfg.perSite && cfg.perSite[host];
		const p = PAIRINGS[key || cfg.pairing] || PAIRINGS.editorial;
		const before = readSite();

		// Anything icon-shaped is fenced off before a single family changes.
		let skipped = 0;
		document.querySelectorAll('i,span,button,a,li,div').forEach((el) => {
			if (el.children.length > 2) return;
			if (isIconish(el)) {
				el.classList.add('anyrvaan-ts-skip');
				skipped++;
			}
		});

		// Give every block a delay proportional to how far down the page it is.
		const blocks = [...document.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption,td,th')];
		let maxD = 0;
		blocks.forEach((el) => {
			const top = el.getBoundingClientRect().top + scrollY;
			const d = Math.min(520, Math.max(0, (top - scrollY) * 0.45));
			el.style.setProperty('--ts-d', `${Math.round(d)}ms`);
			maxD = Math.max(maxD, d);
		});

		root.appendChild(buildSheet(cfg, p));
		root.classList.add(ON);

		// dip in a wave → swap underneath → come back re-set
		void root.offsetWidth;
		root.classList.add('anyrvaan-ts-dip');
		const t1 = setTimeout(() => {
			root.classList.add('anyrvaan-ts-swapping');
			root.classList.remove('anyrvaan-ts-dip');
		}, maxD + 240);

		const stopMotes = startMotes(cfg, p);

		const readout = document.createElement('div');
		readout.id = 'anyrvaan-ts-readout';
		readout.innerHTML =
			`Set in ${before.fam}, ${before.size}px/${before.ratio}, ~${before.measure} characters.<br>` +
			`Given <b>${p.label}</b>` +
			(cfg.correctLeading ? `, leading ${p.leading}` : '') +
			(cfg.capMeasure ? `, measure capped at ${p.measure}` : '') +
			(skipped ? `. ${skipped} icons left alone.` : '.') +
			`<br>Hold \` to see the site's own type.`;
		root.appendChild(readout);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		const t2 = setTimeout(() => readout.setAttribute('data-show', '0'), 6000);

		// Hold backquote to peek at the original — the only way to judge
		// honestly whether you improved it.
		const down = (e) => {
			if (e.code === 'Backquote' && !e.repeat) root.classList.remove(ON);
		};
		const up = (e) => {
			if (e.code === 'Backquote') root.classList.add(ON);
		};
		addEventListener('keydown', down);
		addEventListener('keyup', up);

		teardown = () => {
			clearTimeout(t1);
			clearTimeout(t2);
			removeEventListener('keydown', down);
			removeEventListener('keyup', up);
			stopMotes();
			readout.remove();
			root.classList.remove(ON, 'anyrvaan-ts-dip', 'anyrvaan-ts-swapping');
			document.querySelectorAll('.anyrvaan-ts-skip').forEach((el) => el.classList.remove('anyrvaan-ts-skip'));
			blocks.forEach((el) => el.style.removeProperty('--ts-d'));
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
			teardown = null;
		};
	};

	const off = () => {
		if (teardown) teardown();
		else {
			root.classList.remove(ON, 'anyrvaan-ts-dip', 'anyrvaan-ts-swapping');
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
		}
	};

	if (isOn()) off();
	else {
		try {
			chrome.storage.sync.get(DEFAULTS, (s) => on({ ...DEFAULTS, ...s }));
		} catch (e) {
			on(DEFAULTS);
		}
	}
})();
