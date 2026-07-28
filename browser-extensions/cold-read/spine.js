// COLD READ — the spine
// ---------------------------------------------------------------------------
// Turns a page into a flat string of its article text, while keeping a map
// back to the exact text nodes every character came from. Everything else in
// this extension is downstream of that map: a question can only point at the
// sentence it came from if the sentence still knows where it lives.
//
// This is the reason Readability isn't used directly. It returns cleaned HTML
// from a *clone* of the document, which severs the link to the live nodes —
// and highlighting a clone highlights nothing. So its container-scoring idea
// is borrowed, applied to the live DOM, and the walking is done here.
//
// Offsets are stored, never Range objects. A Range is live and goes silently
// wrong the moment the page mutates, which lazy-loading and single-page apps
// do constantly. Ranges get rebuilt from offsets at the moment they're needed.

(() => {
	const BLOCKS = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, figcaption';

	// Subtrees whose text is never article prose.
	const SKIP_TAG = /^(NAV|FOOTER|ASIDE|HEADER|SCRIPT|STYLE|NOSCRIPT|CODE|PRE|BUTTON|SELECT|TEXTAREA|SVG|MATH|FORM|LABEL|IFRAME|VIDEO|AUDIO)$/;
	const SKIP_HINT = /(^|[-_\s])(comment|sidebar|footer|nav|menu|promo|related|share|social|subscribe|newsletter|cookie|banner|advert|byline|breadcrumb|pagination|toc|skip)([-_\s]|$)/i;

	const textOf = (el) => (el.textContent || '').trim();

	const linkDensity = (el) => {
		const len = textOf(el).length;
		if (!len) return 1;
		let links = 0;
		for (const a of el.querySelectorAll('a')) links += (a.textContent || '').length;
		return links / len;
	};

	const hidden = (el) => {
		if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
		const s = getComputedStyle(el);
		return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0';
	};

	/**
	 * Which element holds the article. Scores every paragraph and credits its
	 * ancestors, the way Readability does, then penalises link-heavy and
	 * obviously-furniture containers.
	 */
	function pickContainer() {
		const scores = new Map();

		for (const p of document.querySelectorAll('p, li')) {
			const len = textOf(p).length;
			if (len < 40) continue;
			if (linkDensity(p) > 0.5) continue; // a list of links, not a paragraph

			const base = Math.min(len, 600) / 100 + 1;
			let node = p.parentElement;
			let depth = 0;
			while (node && node !== document.documentElement && depth < 4) {
				scores.set(node, (scores.get(node) || 0) + base / (depth + 1));
				node = node.parentElement;
				depth++;
			}
		}

		let best = null;
		let bestScore = 0;
		for (const [el, raw] of scores) {
			if (hidden(el)) continue;
			let score = raw * (1 - Math.min(linkDensity(el), 0.9));
			if (el.tagName === 'ARTICLE' || el.tagName === 'MAIN') score *= 1.5;
			if (el.getAttribute && el.getAttribute('role') === 'main') score *= 1.4;
			const hint = `${el.className || ''} ${el.id || ''}`;
			if (SKIP_HINT.test(hint)) score *= 0.15;
			if (/(^|[-_\s])(article|post|content|story|entry|body|prose)([-_\s]|$)/i.test(hint)) score *= 1.25;
			if (score > bestScore) {
				bestScore = score;
				best = el;
			}
		}

		return best || document.querySelector('article, main') || document.body;
	}

	/** True if this element sits inside something we never read from. */
	function inSkippedSubtree(el, root) {
		let n = el;
		while (n && n !== root && n !== document.documentElement) {
			if (SKIP_TAG.test(n.tagName)) return true;
			if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true;
			const hint = `${n.className || ''} ${n.id || ''}`;
			if (typeof hint === 'string' && SKIP_HINT.test(hint)) return true;
			n = n.parentElement;
		}
		return false;
	}

	/** The outermost block elements inside the container — no nested doubles. */
	function collectBlocks(container) {
		const all = Array.from(container.querySelectorAll(BLOCKS));
		const set = new Set(all);
		const out = [];
		for (const el of all) {
			let p = el.parentElement;
			let nested = false;
			while (p && p !== container) {
				if (set.has(p)) {
					nested = true;
					break;
				}
				p = p.parentElement;
			}
			if (nested) continue;
			if (inSkippedSubtree(el, container)) continue;
			if (hidden(el)) continue;
			out.push(el);
		}
		return out.length ? out : [container];
	}

	/**
	 * Concatenate the container's text exactly as it appears in the nodes —
	 * no normalising, because normalising would shift every offset — and record
	 * where each text node landed. Block breaks are pushed in as unmapped
	 * newlines so two adjacent paragraphs can't fuse into one false sentence.
	 */
	function build(container) {
		const parts = [];
		const map = []; // { start, len, node }
		let cursor = 0;

		for (const block of collectBlocks(container)) {
			const before = cursor;
			const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
				acceptNode(node) {
					if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
					if (inSkippedSubtree(node.parentElement, container)) return NodeFilter.FILTER_REJECT;
					return NodeFilter.FILTER_ACCEPT;
				},
			});

			let node;
			while ((node = walker.nextNode())) {
				const v = node.nodeValue;
				if (!v) continue;
				map.push({ start: cursor, len: v.length, node });
				parts.push(v);
				cursor += v.length;
			}

			// Only break if this block actually contributed something.
			if (cursor > before) {
				parts.push('\n\n');
				cursor += 2;
			}
		}

		return { text: parts.join(''), map, container, signature: (container.textContent || '').length };
	}

	// ---- sentences ---------------------------------------------------------

	const WORDY = /[A-Za-zÀ-ɏ]{2,}/;

	/** Sentences worth asking about — long enough, prose rather than furniture. */
	function sentences(spine, lang) {
		const raw = [];

		if (typeof Intl !== 'undefined' && Intl.Segmenter) {
			const seg = new Intl.Segmenter(lang || 'en', { granularity: 'sentence' });
			for (const s of seg.segment(spine.text)) raw.push({ text: s.segment, index: s.index });
		} else {
			// Older engines: a plain split, which is worse at abbreviations and
			// decimals but keeps the extension working rather than blank.
			const re = /[^.!?]+[.!?]+[\s"')\]]*|[^.!?]+$/g;
			let m;
			while ((m = re.exec(spine.text))) raw.push({ text: m[0], index: m.index });
		}

		const out = [];
		for (const s of raw) {
			const lead = s.text.length - s.text.trimStart().length;
			const trimmed = s.text.trim();
			if (trimmed.length < 45 || trimmed.length > 400) continue;

			const words = trimmed.split(/\s+/).filter((w) => WORDY.test(w));
			if (words.length < 8) continue;
			// Mostly-symbols lines, code fragments and all-caps furniture.
			const letters = (trimmed.match(/[A-Za-zÀ-ɏ]/g) || []).length;
			if (letters / trimmed.length < 0.55) continue;
			if (trimmed === trimmed.toUpperCase()) continue;
			if (/^\s*[•·—–-]/.test(trimmed)) continue;

			out.push({
				index: out.length,
				text: trimmed,
				start: s.index + lead,
				end: s.index + lead + trimmed.length,
			});
		}
		return out;
	}

	// ---- offsets back to the page -----------------------------------------

	/** Which text node holds spine position `pos`. Binary search over the map. */
	function locate(map, pos) {
		let lo = 0;
		let hi = map.length - 1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			const e = map[mid];
			if (pos < e.start) hi = mid - 1;
			else if (pos >= e.start + e.len) lo = mid + 1;
			else return { node: e.node, offset: pos - e.start };
		}
		// Landed in a block break. Clamp to the end of the preceding node, which
		// is the nearest real position in the document.
		const e = map[Math.min(Math.max(hi, 0), map.length - 1)];
		return e ? { node: e.node, offset: Math.min(e.len, Math.max(0, pos - e.start)) } : null;
	}

	/** A live Range for a sentence, rebuilt fresh from its offsets. */
	function rangeFor(spine, start, end) {
		const a = locate(spine.map, start);
		const b = locate(spine.map, Math.max(start, end - 1));
		if (!a || !b || !a.node.isConnected || !b.node.isConnected) return null;
		try {
			const r = document.createRange();
			r.setStart(a.node, Math.min(a.offset, a.node.nodeValue.length));
			r.setEnd(b.node, Math.min(b.offset + 1, b.node.nodeValue.length));
			return r;
		} catch {
			return null;
		}
	}

	/** Has the page changed enough underneath us that the offsets are lies? */
	function stale(spine) {
		if (!spine.container || !spine.container.isConnected) return true;
		return (spine.container.textContent || '').length !== spine.signature;
	}

	window.__coldReadSpine = { pickContainer, build, sentences, rangeFor, stale };
})();
