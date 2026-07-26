// BLOOM
// Pages don't load — they grow. Every block on the page unfurls up from its
// own base, staggered by how far down the page it sits, so the growth spreads
// like something rooted rather than everything popping at once. When it
// settles, a subset keeps breathing: a pixel of drift, a fraction of a degree,
// slow enough that you feel it before you see it.
//
// Deliberately not a scale-0.95-fade-in. It grows: clipped from the bottom
// edge, squashed on the vertical, tilted a hair off-axis, released on an
// expo-out curve so it arrives and stops rather than easing vaguely in.

(() => {
	const NAME = 'bloom';
	const STYLE_ID = 'anyrvaan-bloom';
	const READOUT_ID = 'anyrvaan-bloom-readout';
	const GROWN = 'anyrvaan-bloom-grown';
	const ITEM = 'anyrvaan-bloom-item';
	const BREATHE = 'anyrvaan-bloom-breathe';

	const GROW_MS = 660;
	const STAGGER_MS = 34;
	const MAX_ITEMS = 380;
	const MAX_BREATHERS = 90;

	const root = document.documentElement;
	const isOn = () => !!document.getElementById(STYLE_ID);

	const buildSheet = () => {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
.${ITEM} {
	opacity: 0;
	transform: translateY(15px) scaleY(0.82) rotate(var(--bloom-tilt, 0deg));
	transform-origin: 50% 100%;
	clip-path: inset(100% 0 0 0);
	will-change: transform, opacity, clip-path;
}

.${ITEM}.${GROWN} {
	opacity: 1;
	transform: none;
	clip-path: inset(0 0 0 0);
	/* expo-out: the idea lands and stops, it doesn't drift to a halt */
	transition:
		opacity ${GROW_MS}ms cubic-bezier(0.16, 1, 0.3, 1) var(--bloom-delay, 0ms),
		transform ${GROW_MS}ms cubic-bezier(0.16, 1, 0.3, 1) var(--bloom-delay, 0ms),
		clip-path ${GROW_MS}ms cubic-bezier(0.16, 1, 0.3, 1) var(--bloom-delay, 0ms);
}

/* Ambient life, once everything has arrived. Small enough to be deniable. */
.${BREATHE} {
	animation: anyrvaan-bloom-breathe var(--bloom-breath, 7s) ease-in-out var(--bloom-phase, 0s) infinite;
	will-change: transform;
}
@keyframes anyrvaan-bloom-breathe {
	0%, 100% { transform: translateY(0) rotate(0deg); }
	50% { transform: translateY(-1.4px) rotate(var(--bloom-tilt, 0deg)); }
}

@media (prefers-reduced-motion: reduce) {
	.${ITEM} { opacity: 1; transform: none; clip-path: none; }
	.${BREATHE} { animation: none; }
}

#${READOUT_ID} {
	position: fixed !important;
	bottom: 22px !important;
	left: 22px !important;
	z-index: 2147483647 !important;
	margin: 0 !important;
	font: 500 11px/1.4 ui-monospace, "Cascadia Mono", "Courier New", monospace !important;
	letter-spacing: 0.34em !important;
	text-transform: uppercase !important;
	color: rgba(236, 230, 219, 0.78) !important;
	background: rgba(8, 10, 12, 0.82) !important;
	border: 1px solid rgba(236, 230, 219, 0.22) !important;
	padding: 7px 12px !important;
	pointer-events: none !important;
	opacity: 0;
	transition: opacity 500ms ease !important;
}
#${READOUT_ID}[data-show="1"] { opacity: 1 !important; }
`;
		return style;
	};

	// Pick one coherent layer of blocks: things a reader would call "an
	// element". Nested descendants are dropped so a card doesn't grow while
	// its own paragraph grows separately inside it.
	const SELECTOR = [
		'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'img', 'video', 'figure',
		'button', 'blockquote', 'pre', 'table', 'article > div', 'section > div',
		'main > div', 'form', 'label', 'input', 'textarea', 'select',
		'[class*="card"]', '[class*="tile"]', '[class*="item"]',
	].join(',');

	const collect = () => {
		const candidates = [];
		document.querySelectorAll(SELECTOR).forEach((el) => {
			if (el.closest('#' + READOUT_ID)) return;
			const rect = el.getBoundingClientRect();
			if (rect.width < 16 || rect.height < 12) return;
			if (rect.height > window.innerHeight * 3) return; // page-sized wrappers
			const cs = getComputedStyle(el);
			if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
			candidates.push({ el, top: rect.top + window.scrollY, left: rect.left });
		});

		// Drop anything whose ancestor is already coming along.
		const chosen = new Set(candidates.map((c) => c.el));
		const items = candidates.filter(({ el }) => {
			let p = el.parentElement;
			while (p) {
				if (chosen.has(p)) return false;
				p = p.parentElement;
			}
			return true;
		});
		items.sort((a, b) => a.top - b.top || a.left - b.left);
		return items.slice(0, MAX_ITEMS);
	};

	const clearTimers = () => {
		(window.__anyrvaanBloomTimers || []).forEach(clearTimeout);
		window.__anyrvaanBloomTimers = [];
	};

	const on = () => {
		if (isOn()) return;
		root.appendChild(buildSheet());
		clearTimers();

		const growing = collect();

		// Stagger by position on the page, not by index, so the growth reads as
		// one wave travelling down rather than a queue emptying.
		const first = growing.length ? growing[0].top : 0;
		const last = growing.length ? growing[growing.length - 1].top : 1;
		const span = Math.max(1, last - first);

		growing.forEach(({ el, top }, i) => {
			const wave = ((top - first) / span) * growing.length * STAGGER_MS;
			const jitter = ((i * 37) % 11) * 6; // deterministic, keeps it un-mechanical
			const tilt = (((i * 53) % 9) - 4) * 0.11; // -0.44deg … +0.44deg
			el.style.setProperty('--bloom-delay', `${Math.round(wave + jitter)}ms`);
			el.style.setProperty('--bloom-tilt', `${tilt.toFixed(2)}deg`);
			el.classList.add(ITEM);
		});

		// Force a frame so the initial (collapsed) state is real before we release.
		void root.offsetWidth;
		requestAnimationFrame(() => {
			growing.forEach(({ el }) => el.classList.add(GROWN));
		});

		// Once everything has landed, hand a slow breath to the larger blocks
		// and drop the transform machinery from the rest.
		const settleAt = GROW_MS + growing.length * STAGGER_MS + 400;
		window.__anyrvaanBloomTimers.push(
			setTimeout(() => {
				if (!isOn()) return;
				growing
					.filter(({ el }) => el.getBoundingClientRect().height > 40)
					.slice(0, MAX_BREATHERS)
					.forEach(({ el }, i) => {
						el.style.setProperty('--bloom-breath', `${(6.5 + ((i * 29) % 40) / 10).toFixed(1)}s`);
						el.style.setProperty('--bloom-phase', `-${((i * 17) % 60) / 10}s`);
						el.classList.add(BREATHE);
					});
				growing.forEach(({ el }) => (el.style.willChange = ''));
			}, settleAt)
		);

		const readout = document.createElement('div');
		readout.id = READOUT_ID;
		readout.textContent = `bloom — ${growing.length} grown`;
		root.appendChild(readout);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		window.__anyrvaanBloomTimers.push(
			setTimeout(() => readout.setAttribute('data-show', '0'), 3200)
		);
	};

	const off = () => {
		clearTimers();
		document.querySelectorAll('.' + ITEM).forEach((el) => {
			el.classList.remove(ITEM, GROWN, BREATHE);
			el.style.removeProperty('--bloom-delay');
			el.style.removeProperty('--bloom-tilt');
			el.style.removeProperty('--bloom-breath');
			el.style.removeProperty('--bloom-phase');
		});
		const readout = document.getElementById(READOUT_ID);
		if (readout) readout.remove();
		const sheet = document.getElementById(STYLE_ID);
		if (sheet) sheet.remove();
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
	const SLOT_MS = 250; // this one goes first

	if (!window.__anyrvaanBoundBloom) {
		window.__anyrvaanBoundBloom = true;
		window.addEventListener(EVENT, () => {
			off();
			clearTimeout(window.__anyrvaanBloomSlot);
			window.__anyrvaanBloomSlot = setTimeout(on, SLOT_MS);
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
