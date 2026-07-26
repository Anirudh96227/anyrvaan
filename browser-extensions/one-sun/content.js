// ONE SUN
// A flat page turns out to have had depth all along. The cursor is a sun —
// and because a sun is *distant*, every shadow on the page points the same
// direction; only length varies, by how deeply an element is buried in the
// markup. That one fact is what makes this cheap: the whole page reads two
// custom properties on <html>, so moving the light is a single style write,
// not a loop over hundreds of elements.
//
// Text casts real letter-shaped shadows (drop-shadow follows glyph alpha),
// and if you stop moving, the sun sets.

(() => {
	const NAME = 'one-sun';
	const STYLE_ID = 'anyrvaan-one-sun';
	const ON = 'anyrvaan-sun-on';
	const root = document.documentElement;
	const isOn = () => root.classList.contains(ON);

	// ---- settings ---------------------------------------------------------

	const LIGHTS = {
		noon: { len: 0.55, blur: 6, tint: '20, 22, 28', alpha: 0.38, warm: '255, 250, 235' },
		golden: { len: 1.5, blur: 10, tint: '60, 34, 20', alpha: 0.34, warm: '255, 196, 116' },
		blue: { len: 1.25, blur: 16, tint: '18, 26, 54', alpha: 0.4, warm: '150, 178, 255' },
		moon: { len: 1.0, blur: 20, tint: '10, 14, 26', alpha: 0.28, warm: '190, 208, 240' },
		studio: { len: 0.7, blur: 24, tint: '24, 24, 26', alpha: 0.26, warm: '245, 245, 245' },
	};

	const DEFAULTS = {
		light: 'golden',
		follow: true,
		angle: 135, // used when follow is off
		lengthScale: 1,
		castOnOthers: true,
		sunset: true,
		motes: true,
	};

	const load = (cb) => {
		try {
			chrome.storage.sync.get(DEFAULTS, (s) => cb({ ...DEFAULTS, ...s }));
		} catch (e) {
			cb(DEFAULTS);
		}
	};

	// ---- the sheet --------------------------------------------------------
	// Depth classes 1..8. Each element gets one based on how far down the DOM
	// it sits; the shadow offset is that depth times the shared sun vector.

	const buildSheet = (cfg) => {
		const L = LIGHTS[cfg.light] || LIGHTS.golden;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		let depths = '';
		for (let d = 1; d <= 8; d++) {
			const h = d * 3.2 * L.len * cfg.lengthScale;
			depths += `
html.${ON} .anyrvaan-sun-d${d} {
	--sun-h: ${h.toFixed(2)};
	box-shadow:
		calc(var(--sun-dx) * var(--sun-h) * 1px)
		calc(var(--sun-dy) * var(--sun-h) * 1px)
		${(L.blur + d * 1.5).toFixed(1)}px
		rgba(${L.tint}, ${(L.alpha * (cfg.castOnOthers ? 1 : 0.75)).toFixed(3)}) !important;
}
html.${ON} .anyrvaan-sun-t${d} {
	--sun-h: ${h.toFixed(2)};
	filter: drop-shadow(
		calc(var(--sun-dx) * var(--sun-h) * 1px)
		calc(var(--sun-dy) * var(--sun-h) * 1px)
		${(L.blur * 0.5 + d).toFixed(1)}px
		rgba(${L.tint}, ${(L.alpha + 0.12).toFixed(3)})
	) !important;
}`;
		}

		style.textContent = `
html.${ON} {
	--sun-dx: 0.7;
	--sun-dy: 0.7;
	--sun-warm: 0;
}
/* Everything the light touches eases, so the sun setting reads as movement
   rather than as a series of jumps. */
html.${ON} [class*="anyrvaan-sun-"] {
	transition: box-shadow 260ms linear, filter 260ms linear !important;
}
${depths}
/* The light itself, warming the page it falls on. */
html.${ON}::after {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 2147483645;
	background: radial-gradient(
		620px circle at var(--sun-px, 50%) var(--sun-py, 0%),
		rgba(${L.warm}, calc(0.14 + var(--sun-warm) * 0.1)) 0%,
		rgba(${L.warm}, 0.04) 42%,
		transparent 70%
	);
	mix-blend-mode: soft-light;
}
#anyrvaan-sun-motes {
	position: fixed !important;
	inset: 0 !important;
	width: 100% !important;
	height: 100% !important;
	pointer-events: none !important;
	z-index: 2147483646 !important;
}
#anyrvaan-sun-readout {
	position: fixed !important;
	bottom: 22px !important;
	left: 22px !important;
	z-index: 2147483647 !important;
	margin: 0 !important;
	font: 500 11px/1.4 ui-monospace, "Cascadia Mono", "Courier New", monospace !important;
	letter-spacing: 0.34em !important;
	text-transform: uppercase !important;
	color: rgba(236, 230, 219, 0.82) !important;
	background: rgba(8, 10, 12, 0.84) !important;
	border: 1px solid rgba(236, 230, 219, 0.22) !important;
	padding: 7px 12px !important;
	pointer-events: none !important;
	opacity: 0;
	transition: opacity 500ms ease !important;
}
#anyrvaan-sun-readout[data-show="1"] { opacity: 1 !important; }
@media (prefers-reduced-motion: reduce) {
	html.${ON} [class*="anyrvaan-sun-"] { transition: none !important; }
}
`;
		return style;
	};

	// ---- who gets a shadow ------------------------------------------------

	const BLOCK = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figure,figcaption,button,input,select,textarea,label,article,section>div,main>div,[class*="card"],[class*="btn"],[class*="button"],[class*="tile"]';
	const SHAPED = 'img,svg,video,picture,canvas'; // shaped things get a shaped shadow

	const depthOf = (el) => {
		let d = 0;
		let p = el;
		while (p && p !== document.body) {
			d++;
			p = p.parentElement;
		}
		return Math.max(1, Math.min(8, Math.round(d / 2)));
	};

	const mark = () => {
		let n = 0;
		const seen = new Set();
		document.querySelectorAll(SHAPED).forEach((el) => {
			const r = el.getBoundingClientRect();
			if (r.width < 18 || r.height < 18) return;
			el.classList.add('anyrvaan-sun-t' + depthOf(el));
			seen.add(el);
			n++;
		});
		document.querySelectorAll(BLOCK).forEach((el) => {
			if (seen.has(el)) return;
			const r = el.getBoundingClientRect();
			if (r.width < 24 || r.height < 12) return;
			if (r.height > innerHeight * 2.5) return;
			const cs = getComputedStyle(el);
			if (cs.position === 'fixed' || cs.display === 'none') return;
			// text-bearing leaves get glyph shadows; boxes get box shadows
			const textish = el.children.length === 0 && (el.textContent || '').trim().length > 0;
			el.classList.add((textish ? 'anyrvaan-sun-t' : 'anyrvaan-sun-d') + depthOf(el));
			seen.add(el);
			n++;
		});
		return n;
	};

	const unmark = () => {
		document.querySelectorAll('[class*="anyrvaan-sun-"]').forEach((el) => {
			el.className = el.className
				.split(/\s+/)
				.filter((c) => !/^anyrvaan-sun-[dt]\d$/.test(c))
				.join(' ');
		});
	};

	// ---- motes ------------------------------------------------------------
	// Dust in a sunbeam. They enter from an edge, curl inward, and are
	// swallowed by the light. Bursts arrive on their own schedule — the point
	// is that you don't know when.

	function startMotes(cfg) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || !cfg.motes) return () => {};
		const L = LIGHTS[cfg.light] || LIGHTS.golden;
		const cv = document.createElement('canvas');
		cv.id = 'anyrvaan-sun-motes';
		root.appendChild(cv);
		const ctx = cv.getContext('2d');
		let dpr = Math.min(devicePixelRatio || 1, 2);
		const size = () => {
			dpr = Math.min(devicePixelRatio || 1, 2);
			cv.width = innerWidth * dpr;
			cv.height = innerHeight * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		size();
		addEventListener('resize', size);

		const motes = [];
		let cursor = { x: innerWidth / 2, y: innerHeight * 0.2, seen: false };
		const onMove = (e) => {
			cursor.x = e.clientX;
			cursor.y = e.clientY;
			cursor.seen = true;
		};
		addEventListener('pointermove', onMove, { passive: true });

		const spawnBurst = () => {
			if (!cursor.seen || document.hidden) return;
			const n = 2 + Math.floor(Math.random() * 5);
			for (let i = 0; i < n; i++) {
				const edge = Math.floor(Math.random() * 4);
				const t = Math.random();
				const p =
					edge === 0 ? { x: t * innerWidth, y: -12 } :
					edge === 1 ? { x: innerWidth + 12, y: t * innerHeight } :
					edge === 2 ? { x: t * innerWidth, y: innerHeight + 12 } :
					{ x: -12, y: t * innerHeight };
				motes.push({
					x: p.x, y: p.y, x0: p.x, y0: p.y,
					t: -i * (0.05 + Math.random() * 0.09), // staggered inside the burst
					life: 2.4 + Math.random() * 2.6,
					curl: (Math.random() - 0.5) * 190,
					r: 0.9 + Math.random() * 1.9,
					flare: 0,
				});
			}
		};
		// The randomness is the magic: never the same gap twice.
		let burstTimer = setTimeout(function again() {
			spawnBurst();
			burstTimer = setTimeout(again, 3200 + Math.random() * 11000);
		}, 1200 + Math.random() * 2600);

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
				const p = Math.min(1, m.t / m.life);
				// ease toward the light, curling as it comes
				const e = 1 - Math.pow(1 - p, 2.4);
				const dx = cursor.x - m.x0;
				const dy = cursor.y - m.y0;
				const nx = -dy, ny = dx;
				const nl = Math.hypot(nx, ny) || 1;
				const swing = Math.sin(p * Math.PI) * m.curl;
				m.x = m.x0 + dx * e + (nx / nl) * swing;
				m.y = m.y0 + dy * e + (ny / nl) * swing;

				const near = Math.hypot(cursor.x - m.x, cursor.y - m.y);
				if (near < 15 || p >= 1) m.flare = Math.max(m.flare, 1);
				if (m.flare > 0) {
					m.flare -= dt * 3.4;
					if (m.flare <= 0) { motes.splice(i, 1); continue; }
				}
				const a = (m.flare > 0 ? m.flare : Math.sin(p * Math.PI) * 0.9 + 0.1) * 0.85;
				const rr = m.r * (m.flare > 0 ? 1 + (1 - m.flare) * 3.2 : 1);
				const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr * 5);
				g.addColorStop(0, `rgba(${L.warm}, ${(a * 0.95).toFixed(3)})`);
				g.addColorStop(0.35, `rgba(${L.warm}, ${(a * 0.34).toFixed(3)})`);
				g.addColorStop(1, `rgba(${L.warm}, 0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(m.x, m.y, rr * 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(255,255,255,${(a * 0.8).toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(m.x, m.y, rr * 0.5, 0, Math.PI * 2);
				ctx.fill();
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			clearTimeout(burstTimer);
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
		root.appendChild(buildSheet(cfg));
		const n = mark();

		const setSun = (dx, dy, px, py, warm) => {
			root.style.setProperty('--sun-dx', dx.toFixed(3));
			root.style.setProperty('--sun-dy', dy.toFixed(3));
			root.style.setProperty('--sun-px', px + 'px');
			root.style.setProperty('--sun-py', py + 'px');
			root.style.setProperty('--sun-warm', warm.toFixed(3));
		};

		// Where the light is, and therefore which way everything leans.
		let sunX = innerWidth * 0.5;
		let sunY = -innerHeight * 0.2;
		let idleSince = performance.now();
		let sunkenBy = 0;

		const project = () => {
			// A distant sun: direction only, normalised, so shadows stay parallel.
			const cx = innerWidth / 2;
			const cy = innerHeight / 2;
			let dx = cx - sunX;
			let dy = cy - sunY;
			const l = Math.hypot(dx, dy) || 1;
			// as it sets, shadows stretch
			const stretch = 1 + sunkenBy * 2.2;
			setSun((dx / l) * stretch, (dy / l) * stretch, sunX, sunY, sunkenBy);
		};

		const onMove = (e) => {
			if (!cfg.follow) return;
			sunX = e.clientX;
			sunY = e.clientY;
			idleSince = performance.now();
			sunkenBy = 0;
			project();
		};
		if (cfg.follow) addEventListener('pointermove', onMove, { passive: true });
		else {
			const a = (cfg.angle * Math.PI) / 180;
			sunX = innerWidth / 2 - Math.cos(a) * innerWidth;
			sunY = innerHeight / 2 - Math.sin(a) * innerHeight;
		}
		project();

		// The reward for stillness: stop moving and the light goes down.
		let sunTimer = 0;
		if (cfg.sunset && cfg.follow) {
			sunTimer = setInterval(() => {
				const idle = (performance.now() - idleSince) / 1000;
				if (idle < 3) return;
				sunkenBy = Math.min(1, (idle - 3) / 40);
				sunY += 1.2 * (1 - sunkenBy) + 0.3;
				project();
			}, 220);
		}

		const stopMotes = startMotes(cfg);

		// Re-mark when the page changes shape under us.
		let settle = 0;
		const mo = new MutationObserver(() => {
			clearTimeout(settle);
			settle = setTimeout(mark, 400);
		});
		mo.observe(document.body, { childList: true, subtree: true });

		void root.offsetWidth;
		root.classList.add(ON);

		const readout = document.createElement('div');
		readout.id = 'anyrvaan-sun-readout';
		readout.textContent = `one sun — ${n} things now have height`;
		root.appendChild(readout);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		const hide = setTimeout(() => readout.setAttribute('data-show', '0'), 2800);

		teardown = () => {
			clearInterval(sunTimer);
			clearTimeout(settle);
			clearTimeout(hide);
			mo.disconnect();
			removeEventListener('pointermove', onMove);
			stopMotes();
			readout.remove();
			root.classList.remove(ON);
			unmark();
			['--sun-dx', '--sun-dy', '--sun-px', '--sun-py', '--sun-warm'].forEach((p) =>
				root.style.removeProperty(p)
			);
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
			teardown = null;
		};
	};

	const off = () => {
		if (teardown) teardown();
		else {
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
			root.classList.remove(ON);
			unmark();
		}
	};

	// Toggle. State lives in the DOM, so a reload always returns the real page.
	if (isOn()) off();
	else load(on);
})();
