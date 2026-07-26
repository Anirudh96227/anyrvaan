// BY HAND
// The page gets drawn. Not filtered — drawn: pen strokes travel along every
// box in reading order, top-left to bottom-right, at drawing speed, the way
// someone sketching a layout would go about it.
//
// Six media, each with its own physics — a marker bleeds and overlaps
// translucently, a ballpoint skips, charcoal smudges. Brush any element and it
// re-strokes with a new seed, so the wobble is never the same twice.
//
// Images are handled with SVG filters (turbulence + displacement), not pixel
// work: reading pixels from a cross-origin image taints the canvas and throws,
// and most images on the web are cross-origin. Filters never touch the bytes.

(() => {
	const STYLE_ID = 'anyrvaan-by-hand';
	const SVG_ID = 'anyrvaan-by-hand-svg';
	const CANVAS_ID = 'anyrvaan-by-hand-ink';
	const ON = 'anyrvaan-bh-on';
	const root = document.documentElement;
	const isOn = () => root.classList.contains(ON);

	// ---- the media --------------------------------------------------------

	const MEDIA = {
		pencil: {
			label: 'Pencil', ink: '60, 58, 55', width: 1.15, wobble: 1.5, passes: 2,
			alpha: 0.5, grain: 0.55, taper: 0.5, skip: 0, font: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
		},
		ballpoint: {
			label: 'Ballpoint', ink: '32, 46, 120', width: 0.85, wobble: 0.9, passes: 1,
			alpha: 0.85, grain: 0.12, taper: 0.2, skip: 0.1, font: '"Segoe Script", "Bradley Hand", cursive',
		},
		marker: {
			label: 'Marker', ink: '30, 30, 34', width: 3.4, wobble: 1.7, passes: 1,
			alpha: 0.42, grain: 0.05, taper: 0.1, skip: 0, font: '"Segoe Print", "Comic Sans MS", cursive',
		},
		brush: {
			label: 'Ink brush', ink: '18, 18, 20', width: 2.6, wobble: 2.1, passes: 1,
			alpha: 0.8, grain: 0.18, taper: 0.9, skip: 0, font: '"Segoe Script", "Bradley Hand", cursive',
		},
		charcoal: {
			label: 'Charcoal', ink: '38, 36, 34', width: 2.8, wobble: 2.6, passes: 3,
			alpha: 0.28, grain: 0.85, taper: 0.6, skip: 0.05, font: '"Segoe Print", "Comic Sans MS", cursive',
		},
		blueprint: {
			label: 'Blueprint', ink: '235, 242, 255', width: 1.1, wobble: 0.7, passes: 1,
			alpha: 0.85, grain: 0.1, taper: 0.15, skip: 0, font: '"Segoe UI", system-ui, sans-serif',
		},
	};

	const PAPERS = {
		white: { bg: '#fbfaf7', ink: null },
		cream: { bg: '#f6efdf', ink: null },
		graph: { bg: '#fbfaf7', grid: 'rgba(70,110,160,0.16)', cell: 22 },
		dots: { bg: '#fbfaf7', dot: 'rgba(60,60,60,0.22)', cell: 20 },
		blueprint: { bg: '#12386b', ink: '235, 242, 255', grid: 'rgba(255,255,255,0.1)', cell: 26 },
		kraft: { bg: '#c8a97e', ink: null },
	};

	const DEFAULTS = {
		medium: 'pencil',
		paper: 'white',
		images: 'wash', // wash | outline | leave
		messiness: 1,
		drawOn: true,
		handwriting: true,
	};

	// ---- deterministic-per-element noise ----------------------------------

	const rnd = (seed) => {
		let s = seed;
		return () => {
			s = (s * 16807) % 2147483647;
			return s / 2147483647;
		};
	};

	// ---- the sheet --------------------------------------------------------

	const buildSheet = (cfg) => {
		const m = MEDIA[cfg.medium] || MEDIA.pencil;
		const paper = PAPERS[cfg.paper] || PAPERS.white;
		const inkRGB = paper.ink || m.ink;
		const grid = paper.grid
			? `background-image:
				linear-gradient(${paper.grid} 1px, transparent 1px),
				linear-gradient(90deg, ${paper.grid} 1px, transparent 1px) !important;
			   background-size: ${paper.cell}px ${paper.cell}px !important;`
			: paper.dot
			? `background-image: radial-gradient(${paper.dot} 1px, transparent 1px) !important;
			   background-size: ${paper.cell}px ${paper.cell}px !important;`
			: '';

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
html.${ON} {
	background: ${paper.bg} !important;
	${grid}
	/* A sheet set down on a desk is never quite square. */
	transform: rotate(-0.12deg);
	transform-origin: 50% 0;
}
html.${ON} body {
	background: transparent !important;
	color: rgba(${inkRGB}, 0.92) !important;
}
/* Everything the site drew for itself comes off — its boxes are replaced by
   drawn ones on the canvas above. */
html.${ON} body *:not(svg):not(svg *):not([class*="anyrvaan-bh"]) {
	background-color: transparent !important;
	background-image: none !important;
	border-color: transparent !important;
	box-shadow: none !important;
	text-shadow: none !important;
	color: rgba(${inkRGB}, 0.92) !important;
	${cfg.handwriting ? `font-family: ${m.font} !important;` : ''}
}
html.${ON} :is(code,pre,kbd,samp) { font-family: ui-monospace, monospace !important; }
html.${ON} a {
	color: rgba(${inkRGB}, 0.92) !important;
	text-decoration: none !important;
}
/* Paper grain, in multiply, so it sits under the ink. */
html.${ON} body::before {
	content: '';
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 2147483644;
	opacity: 0.4;
	mix-blend-mode: multiply;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
}
/* A photo set as a background survives — only the site's gradients and
   flat fills come off. Without this, hero images just vanish. */
html.${ON} .anyrvaan-bh-photo {
	background-image: var(--bh-bg) !important;
	background-size: cover !important;
	background-position: center !important;
}
${cfg.images === 'wash' ? `
html.${ON} :is(img, video, picture, .anyrvaan-bh-photo) {
	filter: url(#anyrvaan-bh-wash) saturate(0.72) contrast(1.05) !important;
}` : cfg.images === 'outline' ? `
html.${ON} :is(img, video, picture, .anyrvaan-bh-photo) {
	filter: url(#anyrvaan-bh-outline) !important;
}` : ''}

#${CANVAS_ID} {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	pointer-events: none !important;
	z-index: 2147483645 !important;
}
#anyrvaan-bh-motes {
	position: fixed !important;
	inset: 0 !important;
	width: 100% !important;
	height: 100% !important;
	pointer-events: none !important;
	z-index: 2147483646 !important;
}
#anyrvaan-bh-readout {
	position: fixed !important;
	bottom: 22px !important;
	left: 22px !important;
	z-index: 2147483647 !important;
	margin: 0 !important;
	font: 500 11px/1.4 ui-monospace, "Cascadia Mono", monospace !important;
	letter-spacing: 0.28em !important;
	text-transform: uppercase !important;
	color: rgba(${inkRGB}, 0.75) !important;
	background: ${paper.bg}e0 !important;
	border: 1px solid rgba(${inkRGB}, 0.35) !important;
	padding: 7px 12px !important;
	pointer-events: none !important;
	opacity: 0;
	transition: opacity 500ms ease !important;
}
#anyrvaan-bh-readout[data-show="1"] { opacity: 1 !important; }
`;
		return style;
	};

	// The filters. feTurbulence + feDisplacementMap is what gives an edge the
	// wobble of something painted rather than printed.
	const buildFilters = (cfg) => {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.id = SVG_ID;
		svg.setAttribute('width', '0');
		svg.setAttribute('height', '0');
		svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
		svg.innerHTML = `
<defs>
	<filter id="anyrvaan-bh-wash">
		<feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="3" seed="7" result="n"/>
		<feDisplacementMap in="SourceGraphic" in2="n" scale="${(9 * cfg.messiness).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="d"/>
		<feGaussianBlur in="d" stdDeviation="0.6" result="b"/>
		<feComponentTransfer in="b">
			<feFuncR type="gamma" exponent="0.92"/>
			<feFuncG type="gamma" exponent="0.92"/>
			<feFuncB type="gamma" exponent="0.88"/>
		</feComponentTransfer>
	</filter>
	<filter id="anyrvaan-bh-outline">
		<feColorMatrix type="saturate" values="0" result="g"/>
		<feConvolveMatrix in="g" order="3" kernelMatrix="1 1 1 1 -8 1 1 1 1" result="e"/>
		<feComponentTransfer in="e" result="i">
			<feFuncR type="table" tableValues="1 0"/>
			<feFuncG type="table" tableValues="1 0"/>
			<feFuncB type="table" tableValues="1 0"/>
		</feComponentTransfer>
		<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="n"/>
		<feDisplacementMap in="i" in2="n" scale="${(5 * cfg.messiness).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/>
	</filter>
</defs>`;
		return svg;
	};

	// ---- drawing the boxes ------------------------------------------------

	const BOXES = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figure,img,video,button,input,select,textarea,table,pre,article,section>div,main>div,header,footer,nav,[class*="card"],[class*="btn"],[class*="button"],[class*="tile"],[class*="promo"],[class*="ad"]';

	function inkLayer(cfg) {
		const m = MEDIA[cfg.medium] || MEDIA.pencil;
		const paper = PAPERS[cfg.paper] || PAPERS.white;
		const inkRGB = paper.ink || m.ink;

		const cv = document.createElement('canvas');
		cv.id = CANVAS_ID;
		document.body.appendChild(cv);
		const ctx = cv.getContext('2d');

		let shapes = [];
		let dpr = Math.min(devicePixelRatio || 1, 2);

		const size = () => {
			dpr = Math.min(devicePixelRatio || 1, 2);
			const w = Math.max(document.documentElement.scrollWidth, innerWidth);
			const h = Math.max(document.documentElement.scrollHeight, innerHeight);
			cv.style.width = w + 'px';
			cv.style.height = h + 'px';
			cv.width = Math.min(w * dpr, 16000);
			cv.height = Math.min(h * dpr, 16000);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		// One wobbling line, drawn the way a hand draws it: never straight,
		// thicker in the middle of the stroke, tapering at both ends.
		const stroke = (x1, y1, x2, y2, seed, prog) => {
			const r = rnd(seed);
			const len = Math.hypot(x2 - x1, y2 - y1);
			const steps = Math.max(6, Math.min(90, Math.round(len / 9)));
			const wob = m.wobble * cfg.messiness;
			const nx = -(y2 - y1) / (len || 1);
			const ny = (x2 - x1) / (len || 1);
			const offs = [];
			for (let i = 0; i <= steps; i++) offs.push((r() - 0.5) * wob * 2);
			// smooth the noise so it reads as a hand, not as static
			for (let pass = 0; pass < 2; pass++)
				for (let i = 1; i < offs.length - 1; i++)
					offs[i] = (offs[i - 1] + offs[i] + offs[i + 1]) / 3;

			const upto = Math.max(1, Math.round(steps * prog));
			ctx.beginPath();
			for (let i = 0; i <= upto; i++) {
				const t = i / steps;
				const px = x1 + (x2 - x1) * t + nx * offs[i];
				const py = y1 + (y2 - y1) * t + ny * offs[i];
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			const body = Math.sin(Math.PI * Math.min(1, prog)) ** (m.taper * 0.6) || 1;
			ctx.lineWidth = m.width * (0.75 + 0.5 * body) * cfg.messiness;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.strokeStyle = `rgba(${inkRGB}, ${(m.alpha * (m.skip ? (r() > m.skip ? 1 : 0.25) : 1)).toFixed(3)})`;
			ctx.stroke();
		};

		const collect = () => {
			shapes = [];
			const seen = new Set();
			document.querySelectorAll(BOXES).forEach((el) => {
				if (el.closest('#anyrvaan-bh-readout')) return;
				const r = el.getBoundingClientRect();
				if (r.width < 26 || r.height < 14) return;
				if (r.width > innerWidth * 1.6) return;
				const cs = getComputedStyle(el);
				if (cs.display === 'none' || cs.visibility === 'hidden') return;
				if (seen.has(el)) return;
				seen.add(el);
				const isText = /^(P|H1|H2|H3|H4|H5|H6|LI|BLOCKQUOTE)$/.test(el.tagName);
				const isLink = el.tagName === 'A';
				shapes.push({
					el,
					x: r.left + scrollX,
					y: r.top + scrollY,
					w: r.width,
					h: r.height,
					seed: 1 + ((r.left * 7919 + r.top * 104729) | 0) % 2147483646,
					kind: isText ? 'underline' : isLink ? 'scribble' : 'box',
					tag: el.tagName,
					prog: 0,
				});
			});
			// reading order: top to bottom, left to right
			shapes.sort((a, b) => a.y - b.y || a.x - b.x);
		};

		const drawShape = (s) => {
			const p = s.prog;
			if (p <= 0) return;
			if (s.kind === 'underline') {
				// headings get a line under them, the way people underline
				if (/^H[1-3]$/.test(s.tag)) {
					stroke(s.x, s.y + s.h + 3, s.x + s.w * 0.72, s.y + s.h + 3, s.seed, p);
					if (p > 0.6) stroke(s.x + 2, s.y + s.h + 6, s.x + s.w * 0.62, s.y + s.h + 6, s.seed + 3, (p - 0.6) / 0.4);
				}
				return;
			}
			// a box, drawn as four strokes in order, plus a second pass because
			// nobody draws a rectangle right the first time
			const segs = [
				[s.x, s.y, s.x + s.w, s.y],
				[s.x + s.w, s.y, s.x + s.w, s.y + s.h],
				[s.x + s.w, s.y + s.h, s.x, s.y + s.h],
				[s.x, s.y + s.h, s.x, s.y],
			];
			for (let pass = 0; pass < m.passes; pass++) {
				for (let i = 0; i < 4; i++) {
					const from = i / 4;
					const local = Math.max(0, Math.min(1, (p - from) * 4));
					if (local <= 0) continue;
					const [a, b, c, d] = segs[i];
					stroke(a, b, c, d, s.seed + i * 13 + pass * 101, local);
				}
			}
		};

		const repaint = () => {
			ctx.clearRect(0, 0, cv.width, cv.height);
			for (const s of shapes) drawShape(s);
		};

		// The draw-on: strokes travel in reading order at drawing speed.
		let raf = 0;
		let t0 = 0;
		const PER = cfg.drawOn ? 45 : 0; // ms between one shape starting and the next
		const DUR = cfg.drawOn ? 420 : 0;
		const animate = (now) => {
			if (!t0) t0 = now;
			const t = now - t0;
			let done = true;
			shapes.forEach((s, i) => {
				const start = i * PER;
				const p = DUR ? Math.max(0, Math.min(1, (t - start) / DUR)) : 1;
				s.prog = p;
				if (p < 1) done = false;
			});
			repaint();
			if (!done) raf = requestAnimationFrame(animate);
		};

		const start = () => {
			size();
			collect();
			if (!cfg.drawOn || matchMedia('(prefers-reduced-motion: reduce)').matches) {
				shapes.forEach((s) => (s.prog = 1));
				repaint();
			} else {
				t0 = 0;
				raf = requestAnimationFrame(animate);
			}
		};

		// Brush an element and it redraws itself differently. Nothing here is
		// a fixed image.
		const onMove = (e) => {
			const el = document.elementFromPoint(e.clientX, e.clientY);
			if (!el) return;
			const s = shapes.find((sh) => sh.el === el || sh.el.contains(el));
			if (!s || s.prog < 1) return;
			if (s.lastTouch && performance.now() - s.lastTouch < 900) return;
			s.lastTouch = performance.now();
			s.seed = 1 + ((s.seed * 31 + 17) % 2147483646);
			repaint();
		};
		addEventListener('pointermove', onMove, { passive: true });

		let settle = 0;
		const relayout = () => {
			clearTimeout(settle);
			settle = setTimeout(() => {
				const keep = new Map(shapes.map((s) => [s.el, s.prog]));
				size();
				collect();
				shapes.forEach((s) => (s.prog = keep.has(s.el) ? keep.get(s.el) : 1));
				repaint();
			}, 220);
		};
		addEventListener('resize', relayout);
		addEventListener('scroll', relayout, { passive: true });
		const mo = new MutationObserver(relayout);
		mo.observe(document.body, { childList: true, subtree: true });

		start();

		return {
			count: () => shapes.length,
			destroy() {
				cancelAnimationFrame(raf);
				clearTimeout(settle);
				mo.disconnect();
				removeEventListener('pointermove', onMove);
				removeEventListener('resize', relayout);
				removeEventListener('scroll', relayout);
				cv.remove();
			},
		};
	}

	// ---- motes: graphite, drifting in -------------------------------------

	function startMotes(cfg) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
		const m = MEDIA[cfg.medium] || MEDIA.pencil;
		const paper = PAPERS[cfg.paper] || PAPERS.white;
		const inkRGB = paper.ink || m.ink;
		const cv = document.createElement('canvas');
		cv.id = 'anyrvaan-bh-motes';
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
		const cur = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
		const onMove = (e) => {
			cur.x = e.clientX;
			cur.y = e.clientY;
			cur.seen = true;
		};
		addEventListener('pointermove', onMove, { passive: true });

		const burst = () => {
			if (!cur.seen || document.hidden) return;
			const n = 3 + Math.floor(Math.random() * 5);
			for (let i = 0; i < n; i++) {
				const edge = Math.floor(Math.random() * 4);
				const t = Math.random();
				const s =
					edge === 0 ? { x: t * innerWidth, y: -14 } :
					edge === 1 ? { x: innerWidth + 14, y: t * innerHeight } :
					edge === 2 ? { x: t * innerWidth, y: innerHeight + 14 } :
					{ x: -14, y: t * innerHeight };
				motes.push({
					x0: s.x, y0: s.y, x: s.x, y: s.y,
					t: -i * (0.05 + Math.random() * 0.08),
					life: 2.2 + Math.random() * 2.4,
					curl: (Math.random() - 0.5) * 210,
					len: 3 + Math.random() * 7,
					rot: Math.random() * Math.PI,
					spin: (Math.random() - 0.5) * 3,
					flare: 0,
				});
			}
		};
		let timer = setTimeout(function again() {
			burst();
			timer = setTimeout(again, 3000 + Math.random() * 10000);
		}, 1000 + Math.random() * 2500);

		let raf = 0;
		let last = performance.now();
		const frame = (now) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, innerWidth, innerHeight);
			for (let i = motes.length - 1; i >= 0; i--) {
				const p0 = motes[i];
				p0.t += dt;
				if (p0.t < 0) continue;
				const pr = Math.min(1, p0.t / p0.life);
				const e = 1 - Math.pow(1 - pr, 2.3);
				const dx = cur.x - p0.x0;
				const dy = cur.y - p0.y0;
				const nl = Math.hypot(-dy, dx) || 1;
				const sw = Math.sin(pr * Math.PI) * p0.curl;
				p0.x = p0.x0 + dx * e + (-dy / nl) * sw;
				p0.y = p0.y0 + dy * e + (dx / nl) * sw;
				p0.rot += p0.spin * dt;
				if (Math.hypot(cur.x - p0.x, cur.y - p0.y) < 15 || pr >= 1) p0.flare = Math.max(p0.flare, 1);
				if (p0.flare > 0) {
					p0.flare -= dt * 3.2;
					if (p0.flare <= 0) { motes.splice(i, 1); continue; }
				}
				const a = (p0.flare > 0 ? p0.flare : Math.sin(pr * Math.PI) * 0.85 + 0.1) * 0.9;
				ctx.save();
				ctx.translate(p0.x, p0.y);
				ctx.rotate(p0.rot);
				ctx.strokeStyle = `rgba(${inkRGB}, ${a.toFixed(3)})`;
				ctx.lineWidth = m.width * 0.9;
				ctx.lineCap = 'round';
				ctx.shadowColor = `rgba(${inkRGB}, ${(a * 0.6).toFixed(3)})`;
				ctx.shadowBlur = 8;
				const L = p0.len * (p0.flare > 0 ? 1 + (1 - p0.flare) * 2 : 1);
				ctx.beginPath();
				ctx.moveTo(-L / 2, 0);
				ctx.lineTo(L / 2, 0);
				ctx.stroke();
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

		// Find real photographs set as backgrounds before the sheet strips
		// every background on the page, and hand them back afterwards.
		const photos = [];
		if (cfg.images !== 'leave') {
			document.querySelectorAll('div,section,header,figure,a,span').forEach((el) => {
				const bg = getComputedStyle(el).backgroundImage;
				if (!bg || bg.indexOf('url(') === -1) return;
				const r = el.getBoundingClientRect();
				if (r.width < 60 || r.height < 40) return;
				el.style.setProperty('--bh-bg', bg);
				el.classList.add('anyrvaan-bh-photo');
				photos.push(el);
			});
		}

		root.appendChild(buildSheet(cfg));
		if (cfg.images !== 'leave') document.body.appendChild(buildFilters(cfg));
		root.classList.add(ON);

		const ink = inkLayer(cfg);
		const stopMotes = startMotes(cfg);

		const m = MEDIA[cfg.medium] || MEDIA.pencil;
		const readout = document.createElement('div');
		readout.id = 'anyrvaan-bh-readout';
		readout.textContent = `by hand — ${ink.count()} boxes, drawn in ${m.label.toLowerCase()}`;
		root.appendChild(readout);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		const hide = setTimeout(() => readout.setAttribute('data-show', '0'), 3200);

		teardown = () => {
			clearTimeout(hide);
			ink.destroy();
			stopMotes();
			readout.remove();
			photos.forEach((el) => {
				el.classList.remove('anyrvaan-bh-photo');
				el.style.removeProperty('--bh-bg');
			});
			root.classList.remove(ON);
			const s = document.getElementById(STYLE_ID);
			if (s) s.remove();
			const g = document.getElementById(SVG_ID);
			if (g) g.remove();
			teardown = null;
		};
	};

	const off = () => {
		if (teardown) teardown();
		else {
			root.classList.remove(ON);
			[STYLE_ID, SVG_ID, CANVAS_ID].forEach((id) => {
				const n = document.getElementById(id);
				if (n) n.remove();
			});
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
