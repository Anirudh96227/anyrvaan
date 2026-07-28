/**
 * VISUAL TOOLS — shared plumbing
 * ---------------------------------------------------------------------------
 * Four tools on this site run a model in the browser: depth, cutout,
 * image-to-prompt, background removal. They share every part except the model
 * itself, so all of that lives here once — the dropzone, the two-phase loader,
 * the model chooser, the result toolbar, the before/after divider.
 *
 * The two-phase loader is the important one. A model download and a model
 * running are different waits and deserve different shapes: the download is
 * determinate and worth a real bar with megabytes on it, and the inference is
 * indeterminate and gets a slow breathing pulse instead. One spinner for both
 * is how you end up with a screen that looks frozen.
 *
 * Workers are created here rather than in the pages, because `new URL(...,
 * import.meta.url)` has to sit in a real module at a stable path for Vite to
 * find and bundle the worker. Inline <script> in an .astro file is not that.
 */

// ---- workers --------------------------------------------------------------

export type WorkerKind = 'depth' | 'sam' | 'vlm' | 'rmbg';

export function makeWorker(kind: WorkerKind): Worker {
	switch (kind) {
		case 'depth':
			return new Worker(new URL('../workers/depth.ts', import.meta.url), { type: 'module' });
		case 'sam':
			return new Worker(new URL('../workers/sam.ts', import.meta.url), { type: 'module' });
		case 'vlm':
			return new Worker(new URL('../workers/vlm.ts', import.meta.url), { type: 'module' });
		default:
			return new Worker(new URL('../workers/rmbg.ts', import.meta.url), { type: 'module' });
	}
}

// ---- small helpers --------------------------------------------------------

export const $ = <T extends HTMLElement>(root: ParentNode, sel: string) =>
	root.querySelector(sel) as T | null;

export const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

export function downloadURL(url: string, name: string) {
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export function downloadCanvas(cv: HTMLCanvasElement, name: string, type = 'image/png', q?: number) {
	cv.toBlob(
		(blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			downloadURL(url, name);
			setTimeout(() => URL.revokeObjectURL(url), 4000);
		},
		type,
		q
	);
}

/** Copy, with the button saying so — the only feedback anyone reads. */
export async function copyText(text: string, btn?: HTMLElement) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		// Clipboard is permission-gated and refuses in some embeds; the textarea
		// route still works there.
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.cssText = 'position:fixed;opacity:0';
		document.body.appendChild(ta);
		ta.select();
		try {
			document.execCommand('copy');
		} catch {
			/* nothing left to try */
		}
		ta.remove();
	}
	if (btn) {
		const was = btn.textContent;
		btn.textContent = 'Copied';
		btn.setAttribute('data-copied', '');
		setTimeout(() => {
			btn.textContent = was;
			btn.removeAttribute('data-copied');
		}, 1400);
	}
}

// ---- dropzone -------------------------------------------------------------

/**
 * Click, drag, or paste. Paste is bound to the document rather than the zone,
 * because a paste event only reaches an element that has focus and nobody
 * clicks a dropzone before pasting into it.
 */
export function mountDropzone(zone: HTMLElement, onImage: (file: File) => void) {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.style.display = 'none';
	zone.appendChild(input);

	const take = (f: File | null | undefined) => {
		if (f && f.type.startsWith('image/')) onImage(f);
	};

	zone.addEventListener('click', (e) => {
		if ((e.target as HTMLElement).closest('button,a')) return;
		input.click();
	});
	input.addEventListener('change', () => take(input.files?.[0]));

	let depth = 0;
	const over = (on: boolean) => zone.classList.toggle('is-over', on);
	zone.addEventListener('dragenter', (e) => {
		e.preventDefault();
		depth++;
		over(true);
	});
	zone.addEventListener('dragover', (e) => e.preventDefault());
	zone.addEventListener('dragleave', () => {
		depth = Math.max(0, depth - 1);
		if (!depth) over(false);
	});
	zone.addEventListener('drop', (e) => {
		e.preventDefault();
		depth = 0;
		over(false);
		take(e.dataTransfer?.files?.[0]);
	});

	const onPaste = (e: ClipboardEvent) => {
		if (!zone.isConnected) return;
		for (const item of Array.from(e.clipboardData?.items ?? [])) {
			if (item.type.startsWith('image/')) {
				take(item.getAsFile());
				break;
			}
		}
	};
	document.addEventListener('paste', onPaste);
	return () => document.removeEventListener('paste', onPaste);
}

/** A File as both a bitmap to draw and a URL the model can be pointed at. */
export async function readImage(file: File) {
	const url = URL.createObjectURL(file);
	const img = new Image();
	img.decoding = 'async';
	await new Promise((res, rej) => {
		img.onload = res;
		img.onerror = rej;
		img.src = url;
	});
	return { img, url };
}

/** Fit within a box without upscaling — models get slow well before 2048px. */
export function fitTo(w: number, h: number, max: number) {
	const s = Math.min(1, max / Math.max(w, h));
	return { w: Math.round(w * s), h: Math.round(h * s), scale: s };
}

// ---- the two-phase loader -------------------------------------------------

export type LoaderPhase = 'idle' | 'download' | 'run' | 'error';

export class Loader {
	el: HTMLElement;
	private bar: HTMLElement | null;
	private pct: HTMLElement | null;
	private note: HTMLElement | null;
	private title: HTMLElement | null;
	private retryFn: (() => void) | null = null;
	/** Per-file totals, because the callback reports each shard separately. */
	private files = new Map<string, { loaded: number; total: number }>();

	constructor(el: HTMLElement) {
		this.el = el;
		el.innerHTML = `
			<div class="vai-load__inner">
				<p class="vai-load__title"></p>
				<div class="vai-load__track"><i class="vai-load__bar"></i></div>
				<p class="vai-load__note"></p>
				<p class="vai-load__pct"></p>
				<button type="button" class="vai-btn vai-load__retry">Retry</button>
			</div>`;
		this.bar = $(el, '.vai-load__bar');
		this.pct = $(el, '.vai-load__pct');
		this.note = $(el, '.vai-load__note');
		this.title = $(el, '.vai-load__title');
		$(el, '.vai-load__retry')?.addEventListener('click', () => this.retryFn?.());
		this.set('idle');
	}

	set(phase: LoaderPhase) {
		this.el.dataset.phase = phase;
	}

	/** Feed this the raw progress_callback payload from transformers.js. */
	progress(p: any, modelLabel: string) {
		if (p?.status === 'progress' && p.file) {
			this.files.set(p.file, { loaded: p.total ? p.loaded ?? 0 : 0, total: p.total ?? 0 });
		}
		let loaded = 0;
		let total = 0;
		for (const f of this.files.values()) {
			loaded += f.loaded;
			total += f.total;
		}
		this.set('download');
		if (this.title) this.title.textContent = `Fetching ${modelLabel}`;
		const frac = total ? loaded / total : 0;
		if (this.bar) this.bar.style.width = `${(frac * 100).toFixed(1)}%`;
		if (this.pct) {
			this.pct.textContent = total
				? `${mb(loaded)} of ${mb(total)} · ${Math.round(frac * 100)}%`
				: 'starting…';
		}
		if (this.note) this.note.textContent = 'One-time download · runs offline forever after.';
	}

	/** Indeterminate phase — a slow breath, not a fast spinner. */
	running(label = 'Working on your image') {
		this.set('run');
		if (this.title) this.title.textContent = label;
		if (this.note) this.note.textContent = 'Running on your device.';
		if (this.pct) this.pct.textContent = '';
	}

	done() {
		this.files.clear();
		this.set('idle');
	}

	fail(message: string, retry?: () => void) {
		this.set('error');
		this.retryFn = retry ?? null;
		if (this.title) this.title.textContent = 'That didn’t work';
		if (this.note) this.note.textContent = message;
		if (this.pct) this.pct.textContent = '';
		$(this.el, '.vai-load__retry')!.hidden = !retry;
	}
}

// ---- before / after divider ----------------------------------------------

/**
 * A draggable split between two stacked layers. The top layer is clipped
 * rather than resized, so both images stay in register at any split position.
 */
export function mountSplit(wrap: HTMLElement) {
	const top = $(wrap, '.vai-split__top');
	const handle = $(wrap, '.vai-split__handle');
	if (!top || !handle) return;
	let at = 50;

	const apply = () => {
		top.style.clipPath = `inset(0 ${100 - at}% 0 0)`;
		handle.style.left = `${at}%`;
	};
	apply();

	const move = (clientX: number) => {
		const r = wrap.getBoundingClientRect();
		at = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
		apply();
	};

	let dragging = false;
	const down = (e: PointerEvent) => {
		dragging = true;
		handle.setPointerCapture(e.pointerId);
		move(e.clientX);
	};
	handle.addEventListener('pointerdown', down);
	handle.addEventListener('pointermove', (e) => dragging && move(e.clientX));
	handle.addEventListener('pointerup', (e) => {
		dragging = false;
		handle.releasePointerCapture(e.pointerId);
	});
	wrap.addEventListener('pointerdown', (e) => {
		if ((e.target as HTMLElement) === handle) return;
		move((e as PointerEvent).clientX);
	});
	// Keyboard, because a divider that only responds to a mouse is a divider
	// half the people who need it can't use.
	handle.tabIndex = 0;
	handle.setAttribute('role', 'slider');
	handle.setAttribute('aria-label', 'Reveal the original');
	handle.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') at = Math.max(0, at - 4);
		else if (e.key === 'ArrowRight') at = Math.min(100, at + 4);
		else return;
		e.preventDefault();
		apply();
	});
}

// ---- model chooser --------------------------------------------------------
// Which tier someone picked is remembered for the session, so moving between
// the four tools doesn't ask the same question four times.

const TIER_KEY = 'anyrvaan:vai-tier';

export type Tier = 'sleek' | 'accurate';

export const getTier = (): Tier =>
	(sessionStorage.getItem(TIER_KEY) as Tier | null) ?? 'sleek';

export const setTier = (t: Tier) => {
	try {
		sessionStorage.setItem(TIER_KEY, t);
	} catch {
		/* private mode — the default is fine */
	}
};

/** Wires the two tier cards and hands back the chosen one on confirm. */
export function mountChooser(root: ParentNode, onPick: (t: Tier) => void) {
	const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-tier]'));
	const current = getTier();
	for (const c of cards) {
		c.setAttribute('aria-pressed', String(c.dataset.tier === current));
		c.addEventListener('click', () => {
			const t = c.dataset.tier as Tier;
			setTier(t);
			for (const o of cards) o.setAttribute('aria-pressed', String(o === c));
			onPick(t);
		});
	}
	return current;
}
