// COLD READ — the questions
// ---------------------------------------------------------------------------
// Every question is born from one sentence, which is what makes the source
// link free: a question can't exist without already knowing where it came from.
//
// There is no model in here. Answer spans are found by pattern, in priority
// order, and distractors are built by rule — numbers perturbed by magnitude
// and format-matched, entities borrowed from elsewhere in the same article.
// That covers the questions a small on-device model would generate anyway,
// without the 400 MB or the download that would break the promise this set
// makes about never touching the network.
//
// The discipline that matters: reject aggressively. Four good questions beat
// seven with one broken one, because a single obviously-silly wrong answer
// tells the reader the whole thing was guessed.

(() => {
	// Units come in two shapes and they need different endings. A unit ending
	// in a letter needs \b after it, or "5 m" would match inside "5 metres
	// wide" wrongly. A unit ending in a symbol must NOT have \b — there is no
	// word boundary between "%" and the space after it, so "70% of" would fail
	// to match at all and fall through to being read as a bare 70.
	const SYM_UNIT = '%|°C|°F|°|m³|m²|km²|ft³|ft²|in²|m2';
	// Longest first, so "miles" is never matched as a bare "m".
	const WORD_UNIT =
		'tonnes?|tons?|miles?|inches|inch|hours?|minutes?|seconds?|months?|weeks?|years?|days?|million|billion|trillion|thousand|percent|per cent|kWh|MW|kW|GB|MB|KB|TB|CFM|FPM|mph|kph|km|cm|mm|kg|lbs|lb|oz|px|Hz|ft|g|m|W|V';
	const MEASURE = `\\b\\d[\\d,]*(?:\\.\\d+)?\\s?(?:(?:${SYM_UNIT})|(?:${WORD_UNIT})\\b)`;

	const PATTERNS = [
		{ type: 'measure', re: new RegExp(MEASURE, 'i') },
		{ type: 'money', re: /(?:[$£€¥]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|trillion|k|m|bn))?)/i },
		{ type: 'year', re: /\b(?:1[5-9]\d{2}|20[0-5]\d)\b/ },
		{ type: 'number', re: /\b\d[\d,]*(?:\.\d+)?\b/ },
		{ type: 'proper', re: /\b[A-Z][a-zÀ-ÿ]{2,}(?:\s+(?:of|de|van|the)\s+[A-Z][a-zÀ-ÿ]+|\s+[A-Z][a-zÀ-ÿ]+){0,2}\b/ },
	];

	// Signals that a sentence has something concrete in it to ask about.
	const SIGNALS = [
		{ re: new RegExp(MEASURE, 'i'), w: 3.2 },
		{ re: /\b(?:1[5-9]\d{2}|20[0-5]\d)\b/, w: 2.4 },
		{ re: /\b\d/, w: 1.2 },
		{ re: /\b(?:more|less|fewer|greater|higher|lower|faster|slower|larger|smaller|twice|half|double|triple)\s+than\b/i, w: 1.8 },
		{ re: /\b(?:not|never|rarely|unlike|contrary|however|despite|instead of)\b/i, w: 1.3 },
		{ re: /\b(?:because|therefore|which means|so that|results? in|caused? by)\b/i, w: 1.1 },
	];

	const STOP = new Set(
		'the a an and or but if then than that this these those there their they it its of to in on at for from with by as is are was were be been being has have had not no will would can could should may might must do does did about into over under between during'.split(
			' '
		)
	);

	const clean = (s) => s.replace(/\s+/g, ' ').trim();

	// ---- number formatting -------------------------------------------------
	// A distractor that doesn't look like its answer is a giveaway, so
	// perturbed numbers are re-formatted with the original's own conventions:
	// same decimal places, same grouping, same prefix and suffix.

	function parseNumeric(span) {
		// The digits group must not swallow the space before a unit. If it does,
		// "25 kg" comes back out as "34kg" and the spacing alone tells the reader
		// which option is the real one.
		const m = span.match(/^([^\d]*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
		if (!m) return null;
		const [, prefix, digits, suffix] = m;
		const bare = digits.replace(/[,\s]/g, '');
		const value = parseFloat(bare);
		if (!isFinite(value)) return null;
		const dot = bare.indexOf('.');
		return {
			prefix,
			suffix,
			value,
			decimals: dot === -1 ? 0 : bare.length - dot - 1,
			grouped: /[,\s]/.test(digits),
		};
	}

	function formatLike(n, parts) {
		if (!isFinite(n)) return null;
		let v = Math.abs(n) >= 1000 && parts.decimals === 0 ? Math.round(n) : n;
		let s = v.toFixed(parts.decimals);
		if (parts.grouped) {
			const [i, d] = s.split('.');
			s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? `.${d}` : '');
		}
		return `${parts.prefix}${s}${parts.suffix}`;
	}

	/** Three wrong numbers that could plausibly have been the right one. */
	function numberDistractors(span, type) {
		const p = parseNumeric(span);
		if (!p || p.value === 0) return [];

		let candidates;
		if (type === 'year') {
			candidates = [p.value - 3, p.value + 4, p.value - 8, p.value + 11, p.value - 14];
		} else {
			candidates = [
				p.value * 2,
				p.value / 2,
				p.value * 1.35,
				p.value * 0.65,
				p.value * 10,
				p.value / 10,
			];
		}

		const seen = new Set([span.trim()]);
		const out = [];
		for (const c of candidates) {
			if (!isFinite(c) || c <= 0) continue;
			const s = formatLike(c, p);
			if (!s || seen.has(s.trim())) continue;
			seen.add(s.trim());
			out.push(s);
			if (out.length === 3) break;
		}
		return out;
	}

	// ---- entity distractors ------------------------------------------------

	/**
	 * Other spans of the same type from elsewhere in the article. Without
	 * embeddings the "similar but not identical" band is approximated by shape:
	 * comparable word count and length, and no shared word with the answer —
	 * a distractor containing the answer's own words reads as half-right.
	 */
	function entityDistractors(answer, pool) {
		const a = answer.toLowerCase();
		const aWords = new Set(a.split(/\s+/).filter((w) => w.length > 3));
		const aLen = answer.length;

		const scored = [];
		for (const cand of pool) {
			const c = cand.toLowerCase();
			if (c === a) continue;
			if (c.includes(a) || a.includes(c)) continue;
			let overlap = false;
			for (const w of c.split(/\s+/)) {
				if (w.length > 3 && aWords.has(w)) {
					overlap = true;
					break;
				}
			}
			if (overlap) continue;
			// Prefer ones that look like the answer without being it.
			scored.push({ cand, d: Math.abs(cand.length - aLen) });
		}

		scored.sort((x, y) => x.d - y.d);
		const out = [];
		const seen = new Set([a]);
		for (const { cand } of scored) {
			const k = cand.toLowerCase();
			if (seen.has(k)) continue;
			seen.add(k);
			out.push(cand);
			if (out.length === 3) break;
		}
		return out;
	}

	// ---- span finding ------------------------------------------------------

	function findSpan(sentence) {
		for (const { type, re } of PATTERNS) {
			const m = sentence.match(re);
			if (!m) continue;
			const text = m[0].trim();
			const at = m.index;

			// A capitalised first word is just a sentence start, not a name.
			if (type === 'proper') {
				if (at === 0) {
					const rest = sentence.slice(1).match(re);
					if (!rest) continue;
					const t2 = rest[0].trim();
					if (STOP.has(t2.toLowerCase())) continue;
					return { type, text: t2, at: rest.index + 1 };
				}
				if (STOP.has(text.toLowerCase())) continue;
			}
			// A bare number needs to be doing some work in the sentence.
			if (type === 'number' && text.replace(/\D/g, '').length < 2) continue;

			return { type, text, at };
		}
		return null;
	}

	/** Gather every span of a type across the article, for borrowing later. */
	function poolFor(type, sentences) {
		const pool = [];
		const re = PATTERNS.find((p) => p.type === type)?.re;
		if (!re) return pool;
		const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
		for (const s of sentences) {
			g.lastIndex = 0;
			let m;
			while ((m = g.exec(s.text))) {
				const t = m[0].trim();
				if (t && !STOP.has(t.toLowerCase())) pool.push(t);
				if (g.lastIndex === m.index) g.lastIndex++;
			}
		}
		return pool;
	}

	// ---- ranking -----------------------------------------------------------

	function score(sentence, i, total) {
		let s = 0;
		for (const sig of SIGNALS) if (sig.re.test(sentence.text)) s += sig.w;
		// Middling lengths make the best questions; very long ones are hard to read
		// as a stem, very short ones carry no context.
		const len = sentence.text.length;
		s += len > 80 && len < 240 ? 1.1 : 0;
		// Opening and closing lines are usually framing rather than substance.
		const pos = i / Math.max(1, total - 1);
		if (pos < 0.06 || pos > 0.94) s -= 1.4;
		return s;
	}

	// ---- assembly ----------------------------------------------------------

	const shuffle = (arr) => {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	};

	/**
	 * Pick `want` questions, spread across the article rather than clustered.
	 * Top-N by score reliably returns five sentences from one good paragraph,
	 * which is useless when the output is meant to be a map of the whole piece —
	 * so the article is cut into bands and each band offers its best candidate.
	 * That is the cheap stand-in for the diversity an embedding pass would give.
	 */
	function build(sentences, want = 6) {
		if (sentences.length < 8) return [];

		const pools = {
			proper: poolFor('proper', sentences),
			measure: poolFor('measure', sentences),
			money: poolFor('money', sentences),
		};

		const ranked = sentences
			.map((s, i) => ({ s, i, sc: score(s, i, sentences.length) }))
			.filter((x) => x.sc > 0);
		if (!ranked.length) return [];

		const bands = Math.min(want, ranked.length);
		const size = Math.ceil(sentences.length / bands);
		const picked = [];

		for (let b = 0; b < bands; b++) {
			const lo = b * size;
			const hi = lo + size;
			const inBand = ranked.filter((x) => x.i >= lo && x.i < hi).sort((a, c) => c.sc - a.sc);
			for (const cand of inBand) {
				const q = toQuestion(cand.s, pools);
				if (q) {
					picked.push(q);
					break;
				}
			}
		}

		// If bands came up short (a thin article, or spans that wouldn't build),
		// backfill from whatever is left over, best first.
		if (picked.length < want) {
			const used = new Set(picked.map((q) => q.sentenceIndex));
			for (const cand of ranked.slice().sort((a, c) => c.sc - a.sc)) {
				if (picked.length >= want) break;
				if (used.has(cand.s.index)) continue;
				const q = toQuestion(cand.s, pools);
				if (q) {
					picked.push(q);
					used.add(cand.s.index);
				}
			}
		}

		picked.sort((a, b) => a.sentenceIndex - b.sentenceIndex);
		return picked.slice(0, want);
	}

	function toQuestion(sentence, pools) {
		const span = findSpan(sentence.text);
		if (!span) return null;

		let distractors;
		if (span.type === 'measure' || span.type === 'number' || span.type === 'money') {
			distractors = numberDistractors(span.text, span.type);
		} else if (span.type === 'year') {
			distractors = numberDistractors(span.text, 'year');
		} else {
			distractors = entityDistractors(span.text, pools.proper);
		}

		// The rejection rule. Three distinct, plausible wrong answers or nothing.
		if (!distractors || distractors.length < 3) return null;

		const before = sentence.text.slice(0, span.at);
		const after = sentence.text.slice(span.at + span.text.length);
		// A stem needs enough on at least one side to be answerable.
		if (clean(before).length + clean(after).length < 35) return null;

		const options = shuffle([span.text, ...distractors.slice(0, 3)]);

		return {
			sentenceIndex: sentence.index,
			start: sentence.start,
			end: sentence.end,
			type: span.type,
			// Spliced into the original rather than joined from trimmed halves,
			// so punctuation keeps its spacing — "in ______, more" and not
			// "in ______ , more".
			stem: clean(`${before}______${after}`),
			source: sentence.text,
			answer: span.text,
			options,
		};
	}

	window.__coldReadQuiz = { build };
})();
