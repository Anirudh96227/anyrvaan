// UNDERCURRENT
// The page stays exactly where it is — readable, clickable, untouched. Over
// the top goes the layer you don't normally get to see: which boxes are the
// actual article and which are there to sell you something, where every
// outbound link really goes, how deep the markup is stacked under your
// cursor, and a slow current running down the spine of the content to show
// where the page's weight actually sits.
//
// Everything is drawn on one pointer-events:none canvas, so the site
// underneath keeps working normally while you look through it.

(() => {
	const NAME = 'undercurrent';
	const LAYER_ID = 'anyrvaan-undercurrent';
	const OFF_EVENT = 'anyrvaan-undercurrent-off';

	const isOn = () => !!document.getElementById(LAYER_ID);

	// Tearing down means telling the running layer to dismantle itself —
	// its listeners and rAF loop live inside on()'s closure.
	const off = () => {
		if (isOn()) window.dispatchEvent(new CustomEvent(OFF_EVENT));
	};

	const on = () => {
	if (isOn()) return;

	const COBALT = '96, 165, 250'; // structure
	const AMBER = '233, 167, 60'; // the thing you're being sold
	const INK = '236, 230, 219'; // content
	const MONO = '11px ui-monospace, "Cascadia Mono", "Courier New", monospace';

	const canvas = document.createElement('canvas');
	canvas.id = LAYER_ID;
	Object.assign(canvas.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		zIndex: '2147483646',
		pointerEvents: 'none',
	});
	document.documentElement.appendChild(canvas);
	const ctx = canvas.getContext('2d');

	const hud = document.createElement('div');
	hud.id = 'anyrvaan-undercurrent-hud';
	Object.assign(hud.style, {
		position: 'fixed',
		bottom: '22px',
		left: '22px',
		zIndex: '2147483647',
		font: MONO,
		lineHeight: '1.9',
		letterSpacing: '0.14em',
		textTransform: 'uppercase',
		color: `rgba(${INK}, 0.8)`,
		background: 'rgba(8, 10, 12, 0.84)',
		border: `1px solid rgba(${INK}, 0.2)`,
		padding: '10px 13px',
		pointerEvents: 'none',
		whiteSpace: 'pre',
	});
	document.documentElement.appendChild(hud);

	// ---- classification -------------------------------------------------

	const AD_HINT = /(^|[-_\s])(ad|ads|advert|advertisement|sponsor|sponsored|promo|promoted|banner|dfp|adsense|doubleclick|taboola|outbrain|criteo)([-_\s]|$)/i;
	const TRACK_PARAM = /(utm_|gclid|fbclid|mc_eid|ref=|affiliate|partner)/i;

	const isAd = (el) => {
		const bag = `${el.className || ''} ${el.id || ''} ${el.getAttribute('data-testid') || ''}`;
		if (AD_HINT.test(bag)) return true;
		if (el.matches('[data-ad], [data-ad-slot], ins.adsbygoogle, [aria-label*="advert" i]')) return true;
		if (el.tagName === 'IFRAME') {
			const src = el.getAttribute('src') || '';
			return /doubleclick|googlesyndication|adservice|taboola|outbrain|amazon-adsystem/i.test(src);
		}
		return false;
	};

	const depthOf = (el) => {
		let d = 0;
		let p = el;
		while (p && p !== document.body) {
			d++;
			p = p.parentElement;
		}
		return d;
	};

	// Cache document-space rects once, then each frame just subtract scroll.
	// Keeps the per-frame cost to arithmetic instead of layout.
	let nodes = [];
	let stats = { ad: 0, media: 0, text: 0, external: 0 };

	const scan = () => {
		nodes = [];
		stats = { ad: 0, media: 0, text: 0, external: 0 };
		const seen = new Set();

		const push = (el, kind, label) => {
			if (seen.has(el)) return;
			const r = el.getBoundingClientRect();
			if (r.width < 24 || r.height < 14) return;
			if (r.width > innerWidth * 2.2) return;
			seen.add(el);
			nodes.push({
				x: r.left + scrollX,
				y: r.top + scrollY,
				w: r.width,
				h: r.height,
				kind,
				label,
				depth: depthOf(el),
			});
			stats[kind] = (stats[kind] || 0) + 1;
		};

		document.querySelectorAll('div, section, aside, iframe, ins').forEach((el) => {
			if (isAd(el)) push(el, 'ad', 'AD');
		});
		document.querySelectorAll('img, video, picture, figure, canvas').forEach((el) => {
			push(el, 'media', el.tagName.toLowerCase());
		});
		document.querySelectorAll('p, h1, h2, h3, article, blockquote, li').forEach((el) => {
			if ((el.textContent || '').trim().length > 24) push(el, 'text', null);
		});

		// Links get a destination tag, because "where does this actually go"
		// is the question the page is least willing to answer.
		document.querySelectorAll('a[href]').forEach((el) => {
			let host = '';
			let tracked = false;
			try {
				const u = new URL(el.href, location.href);
				if (u.host && u.host !== location.host) host = u.host.replace(/^www\./, '');
				tracked = TRACK_PARAM.test(u.search);
			} catch {
				return;
			}
			if (!host && !tracked) return;
			const r = el.getBoundingClientRect();
			if (r.width < 8 || r.height < 8) return;
			nodes.push({
				x: r.left + scrollX,
				y: r.top + scrollY,
				w: r.width,
				h: r.height,
				kind: 'external',
				label: (tracked ? '⌁ ' : '') + (host || location.host.replace(/^www\./, '')),
				depth: depthOf(el),
			});
			stats.external++;
		});
	};

	// ---- the current ----------------------------------------------------

	// Particles ride down the page's content column, faster where the markup
	// is shallow and the page is mostly text, slower where it's dense.
	const N = 80;
	const particles = Array.from({ length: N }, (_, i) => ({
		p: i / N,
		drift: (i % 7) - 3,
		speed: 0.00042 + ((i * 13) % 9) * 0.00004,
		size: 0.9 + ((i * 29) % 5) * 0.32,
	}));

	let dpr = Math.min(devicePixelRatio || 1, 2);
	const resize = () => {
		dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = Math.floor(innerWidth * dpr);
		canvas.height = Math.floor(innerHeight * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	resize();

	// Where the content column actually sits, so the current runs down the
	// page's spine rather than the middle of the window.
	let spineX = innerWidth * 0.5;
	const findSpine = () => {
		const texts = nodes.filter((n) => n.kind === 'text');
		if (!texts.length) return;
		const lefts = texts.map((n) => n.x).sort((a, b) => a - b);
		const rights = texts.map((n) => n.x + n.w).sort((a, b) => a - b);
		const l = lefts[Math.floor(lefts.length / 2)];
		const r = rights[Math.floor(rights.length / 2)];
		spineX = (l + r) / 2 - scrollX;
	};

	let raf = 0;
	let t0 = performance.now();
	let alive = true;

	const draw = (now) => {
		if (!alive) return;
		const t = (now - t0) / 1000;
		const sx = scrollX;
		const sy = scrollY;
		ctx.clearRect(0, 0, innerWidth, innerHeight);

		// The wash that makes it read as "underneath" rather than "on top".
		ctx.fillStyle = 'rgba(4, 6, 9, 0.34)';
		ctx.fillRect(0, 0, innerWidth, innerHeight);

		ctx.font = MONO;
		ctx.textBaseline = 'top';

		for (const n of nodes) {
			const x = n.x - sx;
			const y = n.y - sy;
			if (y > innerHeight + 40 || y + n.h < -40) continue;

			if (n.kind === 'ad') {
				// The one alarm colour on the page, reserved for this.
				ctx.strokeStyle = `rgba(${AMBER}, 0.9)`;
				ctx.lineWidth = 1.4;
				ctx.setLineDash([5, 4]);
				ctx.strokeRect(x + 0.5, y + 0.5, n.w - 1, n.h - 1);
				ctx.setLineDash([]);
				ctx.fillStyle = `rgba(${AMBER}, 0.14)`;
				ctx.fillRect(x, y, n.w, n.h);
				ctx.fillStyle = `rgba(${AMBER}, 0.95)`;
				ctx.fillText('SOLD TO YOU', x + 6, y + 6);
			} else if (n.kind === 'media') {
				ctx.strokeStyle = `rgba(${COBALT}, 0.5)`;
				ctx.lineWidth = 1;
				ctx.strokeRect(x + 0.5, y + 0.5, n.w - 1, n.h - 1);
			} else if (n.kind === 'text') {
				// Depth is drawn as weight: the deeper it's buried in the
				// markup, the heavier the hairline holding it.
				const d = Math.min(1, (n.depth - 3) / 16);
				ctx.strokeStyle = `rgba(${INK}, ${0.1 + d * 0.3})`;
				ctx.lineWidth = 1;
				ctx.strokeRect(x + 0.5, y + 0.5, n.w - 1, n.h - 1);
			} else if (n.kind === 'external') {
				ctx.fillStyle = `rgba(${COBALT}, 0.22)`;
				ctx.fillRect(x, y + n.h - 1.5, n.w, 1.5);
				if (n.w > 40) {
					const label = n.label.slice(0, 26);
					const tw = ctx.measureText(label).width;
					ctx.fillStyle = 'rgba(4, 6, 9, 0.9)';
					ctx.fillRect(x, y + n.h + 2, tw + 8, 15);
					ctx.fillStyle = `rgba(${COBALT}, 0.9)`;
					ctx.fillText(label, x + 4, y + n.h + 5);
				}
			}
		}

		// The current itself — the page's weight, moving.
		const docH = Math.max(1, document.documentElement.scrollHeight);
		for (const p of particles) {
			const prog = (p.p + t * p.speed * 1000) % 1;
			const yDoc = prog * docH;
			const y = yDoc - sy;
			if (y < -20 || y > innerHeight + 20) continue;
			const x = spineX + Math.sin(prog * 15 + p.drift) * 46 + p.drift * 4;
			const fade = Math.sin(prog * Math.PI) * 0.75 + 0.25;
			ctx.beginPath();
			ctx.arc(x, y, p.size, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${COBALT}, ${(0.5 * fade).toFixed(3)})`;
			ctx.fill();
			// a short tail, so it reads as flow and not as dots
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y - 16 * fade);
			ctx.strokeStyle = `rgba(${COBALT}, ${(0.16 * fade).toFixed(3)})`;
			ctx.lineWidth = p.size * 0.8;
			ctx.stroke();
		}

		raf = requestAnimationFrame(draw);
	};

	const refresh = () => {
		scan();
		findSpine();
		const pct = stats.text + stats.ad ? Math.round((stats.ad / (stats.text + stats.ad)) * 100) : 0;
		hud.textContent =
			`UNDERCURRENT\n` +
			`${stats.text} content · ${stats.media} media\n` +
			`${stats.ad} selling to you (${pct}%)\n` +
			`${stats.external} links leave this site`;
	};

	refresh();
	raf = requestAnimationFrame(draw);

	// Re-measure when the page changes shape under us, but cheaply.
	let settle = 0;
	const onChange = () => {
		clearTimeout(settle);
		settle = setTimeout(refresh, 220);
	};
	addEventListener('resize', () => {
		resize();
		onChange();
	});
	addEventListener('scroll', onChange, { passive: true });
	const mo = new MutationObserver(onChange);
	mo.observe(document.body, { childList: true, subtree: true });

	const teardown = () => {
		alive = false;
		cancelAnimationFrame(raf);
		clearTimeout(settle);
		mo.disconnect();
		removeEventListener('resize', resize);
		removeEventListener('scroll', onChange);
		canvas.remove();
		hud.remove();
		window.removeEventListener(OFF_EVENT, teardown);
	};
	window.addEventListener(OFF_EVENT, teardown);
	};

	// ---- the full stack ---------------------------------------------------
	// Content scripts from different extensions run in separate isolated
	// worlds and cannot share objects. They do share the DOM, so the handshake
	// is an attribute on <html> and the trigger is a DOM event — both cross
	// worlds. Click all three icons inside a second and a half and the set
	// performs in order instead of toggling: the page grows in, gets X-rayed,
	// then strips to bone.
	const STAMP = 'data-anyrvaan-stack';
	const EVENT = 'anyrvaan:fullstack';
	const WINDOW_MS = 1500;
	const SLOT_ON = 3000; // this one goes second …
	const SLOT_OFF = 5900; // … and lifts before the strip

	const root = document.documentElement;

	if (!window.__anyrvaanBoundUc) {
		window.__anyrvaanBoundUc = true;
		window.addEventListener(EVENT, () => {
			off();
			(window.__anyrvaanUcSlots || []).forEach(clearTimeout);
			window.__anyrvaanUcSlots = [setTimeout(on, SLOT_ON), setTimeout(off, SLOT_OFF)];
		});
	}

	const now = Date.now();
	let stamps = [];
	try {
		stamps = JSON.parse(root.getAttribute(STAMP) || '[]');
	} catch (e) {
		stamps = [];
	}
	stamps = stamps.filter((s) => now - s.t < WINDOW_MS && s.n !== NAME);
	stamps.push({ n: NAME, t: now });
	root.setAttribute(STAMP, JSON.stringify(stamps));

	if (new Set(stamps.map((s) => s.n)).size >= 3) {
		root.removeAttribute(STAMP);
		window.dispatchEvent(new CustomEvent(EVENT));
		return;
	}

	isOn() ? off() : on();
})();
