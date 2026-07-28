// COLD READ
// ---------------------------------------------------------------------------
// You answer questions about an article before you've read it, and what you
// got wrong becomes a highlighted trail through the page telling you where to
// actually start. A cross isn't a failure here — it's a bookmark.
//
// Two decisions worth stating, because both are load-bearing:
//
// The page is covered while you answer. A quiz you can scroll past to find the
// answers is a reading comprehension test with the book open, which is nothing.
// The scrim blurs rather than hides, so you can see there is an article there
// and roughly how long it is, but not read a word of it.
//
// Highlights are painted as an overlay of rectangles taken from each Range,
// not by wrapping text in <mark>. Wrapping mutates someone else's DOM, breaks
// on re-rendering pages, and invalidates the very offsets that produced it.
// The CSS Custom Highlight API would be the tidier answer, but its registry
// lives on the window and content scripts run in an isolated world — so this
// takes the route that is certain to work rather than the one that is neater.

(() => {
	const HOST_ID = 'anyrvaan-cold-read';

	// Re-injection toggles. Clicking the icon on a page that's already quizzing
	// should put it away, not start a second one on top.
	const existing = document.getElementById(HOST_ID);
	if (existing) {
		if (typeof existing.__coldReadTeardown === 'function') existing.__coldReadTeardown();
		else existing.remove();
		return;
	}

	const Spine = window.__coldReadSpine;
	const Quiz = window.__coldReadQuiz;
	if (!Spine || !Quiz) return;

	const DEFAULTS = {
		count: 6,
		confidence: true,
		dim: true,
		showKnown: false,
		motes: true,
	};

	const VERDICT = {
		knew: { key: 'knew', label: 'You knew this', tint: 'rgba(63,169,106,0.20)', line: '#3fa96a' },
		worth: { key: 'worth', label: 'Worth a read', tint: 'rgba(242,181,60,0.30)', line: '#E9A73C' },
		lucky: { key: 'lucky', label: 'Lucky — worth a skim', tint: 'rgba(139,166,255,0.14)', line: '#8ba6ff' },
		fresh: { key: 'fresh', label: 'New to you', tint: 'rgba(139,166,255,0.24)', line: '#8ba6ff' },
	};

	/** The 2×2 that is the whole point: confidence against correctness. */
	function verdictOf(correct, sure) {
		if (correct) return sure ? VERDICT.knew : VERDICT.lucky;
		return sure ? VERDICT.worth : VERDICT.fresh;
	}

	chrome.storage.sync.get(DEFAULTS, (cfg) => {
		try {
			start({ ...DEFAULTS, ...cfg });
		} catch (err) {
			console.warn('Cold Read failed:', err);
		}
	});

	// ---- boot --------------------------------------------------------------

	function start(cfg) {
		const container = Spine.pickContainer();
		const spine = Spine.build(container);
		const lang = document.documentElement.lang || 'en';
		const sentences = Spine.sentences(spine, lang);

		// Declining is a feature. Narrative and opinion writing has few factual
		// anchors, and filler questions would poison trust in the real ones.
		if (sentences.length < 8) {
			return toast("There isn't enough prose on this page to quiz you on.");
		}

		const questions = Quiz.build(sentences, cfg.count);
		if (questions.length < 3) {
			return toast("Couldn't find enough specifics here worth asking about.");
		}

		mount(questions, spine, cfg);
	}

	// ---- chrome ------------------------------------------------------------

	function toast(message) {
		const host = document.createElement('div');
		host.id = HOST_ID;
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = `<style>${BASE_CSS}</style>
			<div class="toast" role="status">${esc(message)}</div>`;
		document.documentElement.appendChild(host);
		host.__coldReadTeardown = () => host.remove();
		setTimeout(() => host.remove(), 3600);
	}

	const esc = (s) =>
		String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

	function mount(questions, spine, cfg) {
		const host = document.createElement('div');
		host.id = HOST_ID;
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = `<style>${BASE_CSS}</style>
			<div class="scrim" data-on="${cfg.dim ? '1' : '0'}"></div>
			<canvas class="motes"></canvas>
			<div class="stage" role="dialog" aria-modal="true" aria-label="Cold Read quiz"></div>
			<div class="rail" hidden></div>
			<div class="layer" hidden></div>`;
		document.documentElement.appendChild(host);

		const scrim = root.querySelector('.scrim');
		const stage = root.querySelector('.stage');
		const rail = root.querySelector('.rail');
		const layer = root.querySelector('.layer');
		const stopMotes = startMotes(root.querySelector('.motes'), cfg);

		const state = {
			i: 0,
			results: [], // { question, chosen, correct, sure, verdict }
			done: false,
		};

		let onResize = null;
		let onKey = null;

		function teardown() {
			if (onResize) removeEventListener('resize', onResize);
			if (onKey) removeEventListener('keydown', onKey, true);
			stopMotes();
			document.documentElement.style.removeProperty('overflow');
			host.remove();
		}
		host.__coldReadTeardown = teardown;

		// Esc closes, which any modal owes you.
		onKey = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				teardown();
			}
		};
		addEventListener('keydown', onKey, true);

		// Scrolling behind a blurred page is disorienting, so it's held still
		// while answering, then given straight back.
		if (cfg.dim) document.documentElement.style.overflow = 'hidden';

		renderQuestion();

		// ---- question -------------------------------------------------------

		function renderQuestion() {
			const q = questions[state.i];
			const n = questions.length;

			stage.innerHTML = `
				<div class="card">
					<div class="head">
						<span class="mark">Cold Read</span>
						<span class="dots">${questions
							.map((_, i) => `<i data-state="${i < state.i ? 'done' : i === state.i ? 'now' : ''}"></i>`)
							.join('')}</span>
						<button class="x" title="Close (Esc)" aria-label="Close">&times;</button>
					</div>
					<p class="count">Question ${state.i + 1} of ${n}</p>
					<p class="stem">${esc(q.stem).replace('______', '<b class="blank">______</b>')}</p>
					<div class="opts">
						${q.options
							.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`)
							.join('')}
					</div>
					<p class="hint">Answer before you read it — that's the whole idea.</p>
				</div>`;

			stage.querySelector('.x').onclick = teardown;
			for (const btn of stage.querySelectorAll('.opt')) {
				btn.onclick = () => {
					const chosen = q.options[Number(btn.dataset.i)];
					if (cfg.confidence) askConfidence(q, chosen, btn);
					else record(q, chosen, true);
				};
			}
		}

		/**
		 * One extra tap, and it buys the entire product. Someone confidently
		 * wrong is exactly who this helps, and a score out of ten buries them
		 * next to someone who guessed right.
		 */
		function askConfidence(q, chosen, btn) {
			for (const b of stage.querySelectorAll('.opt')) {
				b.disabled = true;
				b.classList.toggle('picked', b === btn);
			}
			const bar = document.createElement('div');
			bar.className = 'conf';
			bar.innerHTML = `
				<span>How sure are you?</span>
				<button data-sure="1">Sure</button>
				<button data-sure="0">Guessing</button>`;
			stage.querySelector('.card').appendChild(bar);
			for (const b of bar.querySelectorAll('button')) {
				b.onclick = () => record(q, chosen, b.dataset.sure === '1');
			}
		}

		function record(q, chosen, sure) {
			const correct = chosen === q.answer;
			state.results.push({ question: q, chosen, correct, sure, verdict: verdictOf(correct, sure) });
			renderReveal(q, chosen, correct, sure);
		}

		function renderReveal(q, chosen, correct, sure) {
			const v = verdictOf(correct, sure);
			const last = state.i === questions.length - 1;

			stage.innerHTML = `
				<div class="card">
					<div class="head">
						<span class="mark">Cold Read</span>
						<span class="dots">${questions
							.map((_, i) => `<i data-state="${i <= state.i ? 'done' : ''}"></i>`)
							.join('')}</span>
						<button class="x" title="Close (Esc)" aria-label="Close">&times;</button>
					</div>
					<p class="verdict" style="--line:${v.line}">
						<span class="glyph">${correct ? '&#10003;' : '&#10007;'}</span> ${esc(v.label)}
					</p>
					<p class="answer">${correct ? 'The answer is' : 'You said <s>' + esc(chosen) + '</s>. It is'}
						<b>${esc(q.answer)}</b>.</p>
					<blockquote class="src">${esc(q.source)}</blockquote>
					<div class="row">
						<button class="ghost" data-act="show">Show me where</button>
						<button class="go" data-act="next">${last ? 'See the trail' : 'Next'}</button>
					</div>
				</div>`;

			stage.querySelector('.x').onclick = teardown;
			stage.querySelector('[data-act="show"]').onclick = () => {
				// Peek at the source without ending the quiz: lift the scrim,
				// scroll to the sentence, put the scrim back.
				scrim.dataset.on = '0';
				document.documentElement.style.removeProperty('overflow');
				scrollToSentence(q, v);
				setTimeout(() => {
					if (state.done) return;
					if (cfg.dim) {
						scrim.dataset.on = '1';
						document.documentElement.style.overflow = 'hidden';
					}
				}, 2600);
			};
			stage.querySelector('[data-act="next"]').onclick = () => {
				if (last) finish();
				else {
					state.i++;
					renderQuestion();
				}
			};
		}

		// ---- the trail ------------------------------------------------------

		function finish() {
			state.done = true;
			document.documentElement.style.removeProperty('overflow');
			scrim.dataset.on = '0';

			const sure = state.results.filter((r) => r.sure);
			const sureWrong = sure.filter((r) => !r.correct);
			const worth = state.results.filter((r) => !r.correct);

			// The headline sentence. Deliberately never a score.
			let line;
			if (!worth.length) line = 'You already knew all of it. Read it for the writing, not the facts.';
			else if (sureWrong.length)
				line = `You were sure about ${sure.length}, and wrong on ${sureWrong.length} of them. Those are marked in the page.`;
			else
				line = `${worth.length} thing${worth.length === 1 ? '' : 's'} worth reading for. They're marked in the page.`;

			stage.innerHTML = `
				<div class="card done">
					<div class="head">
						<span class="mark">Cold Read</span>
						<button class="x" title="Close (Esc)" aria-label="Close">&times;</button>
					</div>
					<p class="line">${esc(line)}</p>
					<ul class="legend">
						${state.results
							.map(
								(r) =>
									`<li style="--line:${r.verdict.line}"><span>${esc(r.verdict.label)}</span><em>${esc(
										r.question.answer
									)}</em></li>`
							)
							.join('')}
					</ul>
					<div class="row">
						<button class="ghost" data-act="clear">Clear the marks</button>
						<button class="go" data-act="read">Start reading</button>
					</div>
				</div>`;

			stage.querySelector('.x').onclick = teardown;
			stage.querySelector('[data-act="clear"]').onclick = teardown;
			stage.querySelector('[data-act="read"]').onclick = () => {
				stage.classList.add('tucked');
				const first = state.results.find((r) => !r.correct) || state.results[0];
				if (first) scrollToSentence(first.question, first.verdict);
			};

			paintTrail();
		}

		/** Rectangles per sentence, in document coordinates, in one overlay. */
		function paintTrail() {
			const marks = state.results.filter((r) => (cfg.showKnown ? true : !r.correct));
			layer.hidden = false;
			rail.hidden = false;

			const draw = () => {
				layer.innerHTML = '';
				rail.innerHTML = '';
				const docH = Math.max(
					document.documentElement.scrollHeight,
					document.body ? document.body.scrollHeight : 0
				);

				for (const r of marks) {
					const range = Spine.rangeFor(spine, r.question.start, r.question.end);
					if (!range) continue;
					const rects = Array.from(range.getClientRects()).filter((x) => x.width > 1 && x.height > 1);
					if (!rects.length) continue;

					for (const box of rects) {
						const b = document.createElement('span');
						b.className = 'hl';
						b.style.cssText = `left:${box.left + scrollX}px;top:${box.top + scrollY}px;width:${box.width}px;height:${box.height}px;background:${r.verdict.tint};box-shadow:inset 0 -2px 0 ${r.verdict.line}`;
						layer.appendChild(b);
					}

					// One tick on the rail, at the sentence's place in the document.
					const tick = document.createElement('button');
					tick.className = 'tick';
					tick.style.cssText = `top:${((rects[0].top + scrollY) / docH) * 100}%;background:${r.verdict.line}`;
					tick.title = r.verdict.label;
					tick.onclick = () => scrollToSentence(r.question, r.verdict);
					rail.appendChild(tick);
				}
			};

			draw();
			// Reflow moves every rectangle, so they're redrawn — but only on
			// resize, since document-coordinate boxes ride scrolling for free.
			let t = 0;
			onResize = () => {
				clearTimeout(t);
				t = setTimeout(draw, 150);
			};
			addEventListener('resize', onResize);
		}

		function scrollToSentence(q, verdict) {
			if (Spine.stale(spine)) return;
			const range = Spine.rangeFor(spine, q.start, q.end);
			if (!range) return;
			const box = range.getBoundingClientRect();
			if (!box.height) return;
			scrollTo({ top: box.top + scrollY - innerHeight / 3, behavior: 'smooth' });

			// A flare on arrival, so the eye is told where to land even when the
			// trail already has a dozen marks on it.
			const flare = document.createElement('span');
			flare.className = 'flare';
			flare.style.cssText = `left:${box.left + scrollX}px;top:${box.top + scrollY}px;width:${box.width}px;height:${box.height}px;--line:${(verdict || VERDICT.worth).line}`;
			layer.hidden = false;
			layer.appendChild(flare);
			setTimeout(() => flare.remove(), 1800);
		}
	}

	// ---- motes: questions, drifting in -------------------------------------
	// The trait every extension in this set shares — it notices when you stop.
	// Colourway drifts pigment, Typeset letterforms, By Hand graphite. Here it
	// is question marks, with the odd tick and cross among them, curling toward
	// the pointer and taken by it.
	//
	// They arrive on their own schedule and never the same gap twice, so you
	// can't learn to expect them. Over a blurred page mid-question they read as
	// what they are: the things you haven't answered yet, still in the air.

	const GLYPHS = ['?', '?', '?', '?', '?', '✓', '✗', '¶'];

	function startMotes(cv, cfg) {
		if (!cv || !cfg.motes || matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return () => {};
		}
		const ctx = cv.getContext('2d');
		if (!ctx) return () => {};

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
			const n = 2 + Math.floor(Math.random() * 3);
			for (let i = 0; i < n; i++) {
				const edge = Math.floor(Math.random() * 4);
				const t = Math.random();
				const s =
					edge === 0 ? { x: t * innerWidth, y: -20 }
					: edge === 1 ? { x: innerWidth + 20, y: t * innerHeight }
					: edge === 2 ? { x: t * innerWidth, y: innerHeight + 20 }
					: { x: -20, y: t * innerHeight };
				motes.push({
					x0: s.x, y0: s.y, x: s.x, y: s.y,
					t: -i * (0.07 + Math.random() * 0.12),
					life: 2.8 + Math.random() * 2.6,
					curl: (Math.random() - 0.5) * 170,
					size: 12 + Math.random() * 14,
					rot: (Math.random() - 0.5) * 0.8,
					ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
					flare: 0,
				});
			}
		};
		let timer = setTimeout(function again() {
			burst();
			timer = setTimeout(again, 3800 + Math.random() * 12000);
		}, 1600 + Math.random() * 2600);

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
				// Travels toward where the pointer was when it set off, swept
				// sideways on the way, so the path is an arc rather than a line.
				const dx = cursor.x - m.x0;
				const dy = cursor.y - m.y0;
				const nl = Math.hypot(-dy, dx) || 1;
				const sw = Math.sin(pr * Math.PI) * m.curl;
				m.x = m.x0 + dx * e + (-dy / nl) * sw;
				m.y = m.y0 + dy * e + (dx / nl) * sw;
				if (Math.hypot(cursor.x - m.x, cursor.y - m.y) < 16 || pr >= 1) {
					m.flare = Math.max(m.flare, 1);
				}
				if (m.flare > 0) {
					m.flare -= dt * 3.2;
					if (m.flare <= 0) {
						motes.splice(i, 1);
						continue;
					}
				}
				const a = (m.flare > 0 ? m.flare : Math.sin(pr * Math.PI) * 0.85 + 0.1) * 0.9;
				ctx.save();
				ctx.translate(m.x, m.y);
				ctx.rotate(m.rot * (1 - pr));
				ctx.font = `${m.size * (m.flare > 0 ? 1 + (1 - m.flare) * 0.7 : 1)}px Georgia, "Iowan Old Style", serif`;
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
		};
	}

	// ---- styles ------------------------------------------------------------
	// All of it inside the shadow root, so the page's own CSS can't reach in
	// and the extension can't leak out. Typeset taught that lesson.

	const BASE_CSS = `
	:host { all: initial; }
	* { box-sizing: border-box; margin: 0; padding: 0; }

	.scrim {
		position: fixed; inset: 0; z-index: 2147483640;
		background: rgba(8,8,11,0.72);
		backdrop-filter: blur(7px) saturate(0.7);
		-webkit-backdrop-filter: blur(7px) saturate(0.7);
		opacity: 0; pointer-events: none;
		transition: opacity 520ms cubic-bezier(0.16,1,0.3,1);
	}
	.scrim[data-on="1"] { opacity: 1; pointer-events: auto; }

	.stage {
		position: fixed; inset: 0; z-index: 2147483645;
		display: grid; place-items: center; padding: 24px;
		pointer-events: none;
		transition: transform 620ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease;
	}
	.stage.tucked { transform: translateY(115%); opacity: 0; pointer-events: none; }

	.card {
		pointer-events: auto;
		width: min(560px, 100%);
		max-height: 84vh; overflow-y: auto;
		background: #0a0a0d;
		border: 1px solid rgba(236,230,219,0.14);
		padding: 26px 28px 24px;
		color: #ECE6DB;
		font: 15px/1.6 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
		box-shadow: 0 30px 80px rgba(0,0,0,0.6);
		animation: rise 520ms cubic-bezier(0.16,1,0.3,1) both;
	}
	@keyframes rise { from { opacity: 0; transform: translateY(14px); } }

	.head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
	.mark {
		font: 500 10.5px/1 ui-monospace, "Cascadia Mono", monospace;
		letter-spacing: 0.28em; text-transform: uppercase;
		color: rgba(236,230,219,0.45);
	}
	.dots { display: flex; gap: 5px; margin-left: auto; }
	.dots i { width: 5px; height: 5px; border-radius: 50%; background: rgba(236,230,219,0.18); transition: background 300ms ease; }
	.dots i[data-state="done"] { background: rgba(236,230,219,0.5); }
	.dots i[data-state="now"] { background: #E9A73C; }
	.x {
		border: 0; background: none; cursor: pointer; padding: 0 0 0 6px;
		color: rgba(236,230,219,0.4); font-size: 20px; line-height: 1;
	}
	.x:hover { color: #ECE6DB; }

	.count { font-size: 12px; color: rgba(236,230,219,0.4); margin-bottom: 10px; }
	.stem {
		font: 400 19px/1.5 Georgia, "Iowan Old Style", serif;
		margin-bottom: 20px; color: #ECE6DB;
	}
	.blank { color: #E9A73C; font-weight: 400; letter-spacing: 0.06em; }
	.hint { margin-top: 14px; font-size: 12px; color: rgba(236,230,219,0.32); }

	.opts { display: grid; gap: 7px; }
	.opt {
		text-align: left; cursor: pointer;
		border: 1px solid rgba(236,230,219,0.14);
		background: transparent; color: rgba(236,230,219,0.85);
		padding: 11px 14px; font: inherit; font-size: 14.5px;
		transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease;
	}
	.opt:hover:not(:disabled) { border-color: rgba(236,230,219,0.4); color: #ECE6DB; }
	.opt:disabled { cursor: default; opacity: 0.4; }
	.opt.picked { border-color: #E9A73C; color: #ECE6DB; opacity: 1; }

	.conf {
		display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
		margin-top: 18px; padding-top: 16px;
		border-top: 1px solid rgba(236,230,219,0.09);
		font-size: 13px; color: rgba(236,230,219,0.55);
		animation: rise 340ms cubic-bezier(0.16,1,0.3,1) both;
	}
	.conf button {
		cursor: pointer; border: 1px solid rgba(236,230,219,0.2);
		background: transparent; color: #ECE6DB; font: inherit;
		padding: 6px 15px; transition: border-color 160ms ease, background-color 160ms ease;
	}
	.conf button:hover { border-color: #E9A73C; background: rgba(233,167,60,0.09); }

	.verdict {
		display: flex; align-items: center; gap: 10px;
		font: 400 20px/1.3 Georgia, "Iowan Old Style", serif;
		color: var(--line); margin-bottom: 12px;
	}
	.verdict .glyph { font-size: 17px; }
	.answer { font-size: 15px; color: rgba(236,230,219,0.8); margin-bottom: 16px; }
	.answer b { color: #ECE6DB; font-weight: 600; }
	.answer s { color: rgba(236,230,219,0.4); }
	.src {
		border-left: 2px solid rgba(236,230,219,0.18);
		padding: 2px 0 2px 14px; margin-bottom: 20px;
		font: 400 14px/1.65 Georgia, "Iowan Old Style", serif;
		color: rgba(236,230,219,0.62);
	}

	.row { display: flex; gap: 10px; align-items: center; }
	.ghost, .go {
		cursor: pointer; font: inherit; font-size: 13.5px; padding: 9px 18px;
		transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
	}
	.ghost { border: 1px solid rgba(236,230,219,0.18); background: transparent; color: rgba(236,230,219,0.7); }
	.ghost:hover { border-color: rgba(236,230,219,0.45); color: #ECE6DB; }
	.go { margin-left: auto; border: 1px solid #E9A73C; background: rgba(233,167,60,0.14); color: #ECE6DB; }
	.go:hover { background: rgba(233,167,60,0.26); }

	.done .line { font: 400 19px/1.5 Georgia, "Iowan Old Style", serif; margin-bottom: 20px; }
	.legend { list-style: none; margin-bottom: 22px; }
	.legend li {
		display: flex; align-items: baseline; gap: 12px;
		padding: 8px 0 8px 12px; border-left: 2px solid var(--line);
		border-bottom: 1px solid rgba(236,230,219,0.06);
		font-size: 13px;
	}
	.legend li:last-child { border-bottom: 0; }
	.legend span { color: rgba(236,230,219,0.55); flex: 1; }
	.legend em { font-style: normal; color: #ECE6DB; }

	.layer { position: absolute; inset: 0; z-index: 2147483630; pointer-events: none; }
	.hl {
		position: absolute; border-radius: 2px;
		animation: sweep 460ms cubic-bezier(0.16,1,0.3,1) both;
	}
	@keyframes sweep { from { transform: scaleX(0.2); opacity: 0; transform-origin: left; } }
	.flare {
		position: absolute; border-radius: 2px;
		box-shadow: 0 0 0 3px var(--line);
		animation: flare 1800ms ease-out both;
	}
	@keyframes flare { 0% { opacity: 0; } 18% { opacity: 0.9; } 100% { opacity: 0; } }

	/* Above the scrim, below the card — so they drift over the blurred page
	   while you're deciding, but never across what you're reading. */
	.motes {
		position: fixed; inset: 0; width: 100%; height: 100%;
		z-index: 2147483642; pointer-events: none;
	}

	.rail {
		position: fixed; right: 0; top: 0; bottom: 0; width: 12px;
		z-index: 2147483641; pointer-events: none;
	}
	.tick {
		position: absolute; right: 3px; width: 6px; height: 6px;
		border: 0; border-radius: 50%; padding: 0; cursor: pointer;
		pointer-events: auto; opacity: 0.75;
		transition: transform 200ms ease, opacity 200ms ease;
	}
	.tick:hover { transform: scale(1.9); opacity: 1; }

	.toast {
		position: fixed; right: 18px; bottom: 18px; z-index: 2147483646;
		background: #0a0a0d; color: #ECE6DB;
		border: 1px solid rgba(236,230,219,0.16);
		padding: 13px 17px; max-width: 320px;
		font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
		box-shadow: 0 20px 50px rgba(0,0,0,0.5);
		animation: rise 400ms cubic-bezier(0.16,1,0.3,1) both;
	}

	@media (prefers-reduced-motion: reduce) {
		.scrim, .stage, .card, .conf, .hl, .flare, .tick { transition: none; animation: none; }
	}`;
})();
