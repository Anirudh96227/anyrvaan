// NEGATIVE SPACE
// neti-neti, as a browser extension: remove everything the page isn't until
// only structure is left. Color, imagery, shadow, and radius come off; type,
// whitespace, and hairline outlines where the media used to be stay.
//
// Injected fresh on every toolbar click, so this file toggles rather than
// applies. State lives in the DOM (the <style> element + a root class), which
// means a reload also resets it — deliberate: the real page is the default,
// this is a lens you hold up.

(() => {
	const NAME = 'negative-space';
	const STYLE_ID = 'anyrvaan-negative-space';
	const READOUT_ID = 'anyrvaan-ns-readout';
	const ON = 'anyrvaan-ns-on';
	const FADE_MS = 620;
	const INK = 'rgba(20, 21, 15, ';

	const root = document.documentElement;

	const isOn = () => root.classList.contains(ON);

	const buildSheet = () => {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
/* Transitions sit outside the .on block so the return trip fades too. */
html.${ON},
html.${ON} body,
html.${ON} body *:not(svg):not(svg *) {
	transition: filter ${FADE_MS}ms ease, background-color ${FADE_MS}ms ease,
		border-color ${FADE_MS}ms ease, color ${FADE_MS}ms ease !important;
}

html.${ON} {
	filter: grayscale(1) contrast(1.04) !important;
	background: #f7f6f3 !important;
}

/* Every fill, shadow, and rounded corner comes off. What's left is the box
   model itself — which is the point. */
html.${ON} body,
html.${ON} body *:not(svg):not(svg *) {
	background-image: none !important;
	background-color: transparent !important;
	box-shadow: none !important;
	text-shadow: none !important;
	border-radius: 0 !important;
	color: ${INK}0.92) !important;
	border-color: ${INK}0.22) !important;
	outline-color: ${INK}0.22) !important;
}

/* Media becomes the hole it occupies. 'content' empties a replaced element
   while its own box, outline, and background keep painting — so the image is
   gone but its exact footprint survives as a hairline frame. */
html.${ON} :is(img, video, canvas, object, embed, iframe) {
	content: '' !important;
	box-sizing: border-box !important;
	outline: 1px solid ${INK}0.3) !important;
	outline-offset: -1px !important;
	background-image: repeating-linear-gradient(
		135deg,
		${INK}0.085) 0 1px,
		transparent 1px 11px
	) !important;
	color: transparent !important;
}

html.${ON} :is(picture, figure) {
	outline: 1px solid ${INK}0.16) !important;
	outline-offset: -1px !important;
}

/* Icons stay legible as marks, not as brand colour. */
html.${ON} svg {
	opacity: 0.3 !important;
	fill: ${INK}0.5) !important;
	stroke: ${INK}0.5) !important;
}

html.${ON} hr { border-color: ${INK}0.25) !important; }

/* Links keep their one job — being distinguishable — with an underline,
   since colour is no longer available to do it. */
html.${ON} a {
	text-decoration: underline !important;
	text-underline-offset: 2px !important;
	text-decoration-thickness: 1px !important;
}

/* Our own readout opts out of everything above. */
#${READOUT_ID} {
	position: fixed !important;
	bottom: 22px !important;
	left: 22px !important;
	z-index: 2147483647 !important;
	margin: 0 !important;
	font: 500 11px/1.4 ui-monospace, "Cascadia Mono", "Courier New", monospace !important;
	letter-spacing: 0.34em !important;
	text-transform: uppercase !important;
	color: ${INK}0.62) !important;
	background: rgba(247, 246, 243, 0.9) !important;
	border: 1px solid ${INK}0.2) !important;
	border-radius: 0 !important;
	padding: 7px 12px !important;
	pointer-events: none !important;
	opacity: 0;
	transition: opacity 500ms ease !important;
}
#${READOUT_ID}[data-show="1"] { opacity: 1 !important; }
`;
		return style;
	};

	const on = () => {
		if (isOn()) return;
		if (!document.getElementById(STYLE_ID)) root.appendChild(buildSheet());

		// Count what's about to go before it goes — the number is the whole
		// argument, and it's different on every site.
		const removed = document.querySelectorAll('img, video, canvas, iframe, object, embed').length;
		let readout = document.getElementById(READOUT_ID);
		if (!readout) {
			readout = document.createElement('div');
			readout.id = READOUT_ID;
			root.appendChild(readout);
		}
		readout.textContent = `neti neti — ${removed} removed`;

		// Force a reflow so the class change animates instead of snapping.
		void root.offsetWidth;
		root.classList.add(ON);
		requestAnimationFrame(() => readout.setAttribute('data-show', '1'));
		clearTimeout(window.__anyrvaanNsHide);
		window.__anyrvaanNsHide = setTimeout(() => readout.setAttribute('data-show', '0'), 2600);
	};

	const off = () => {
		const sheet = document.getElementById(STYLE_ID);
		const readout = document.getElementById(READOUT_ID);
		if (readout) readout.remove();
		if (!sheet) return;
		root.classList.remove(ON);
		clearTimeout(window.__anyrvaanNsHide);
		setTimeout(() => sheet.remove(), FADE_MS);
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
	const SLOT_MS = 6100; // this one goes last

	if (!window.__anyrvaanBoundNs) {
		window.__anyrvaanBoundNs = true;
		window.addEventListener(EVENT, () => {
			off();
			clearTimeout(window.__anyrvaanNsSlot);
			window.__anyrvaanNsSlot = setTimeout(on, SLOT_MS);
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
