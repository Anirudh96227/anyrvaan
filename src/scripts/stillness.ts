// The site's shared sense of stillness.
//
// One module owns "when did the visitor last do anything?" and the tempo
// everything settles at. Effects subscribe instead of wiring their own
// listeners, so the whole site agrees on what "still" means.
//
// Two laws every consumer signs up to:
//   1. Zero animation frames at rest — subscribers may only run a rAF loop
//      while something is actually in transition.
//   2. Nothing ambient reacts faster than a heartbeat; functional UI (links,
//      buttons) stays instant. Ambient motion settles at breath speed.

/** One resting human breath: ~5.5s in, ~5.5s out. The site's master tempo. */
export const BREATH_MS = 11000;

/** The floor for any ambient reaction — the site never startles. */
export const HEARTBEAT_MS = 800;

/**
 * Raised-cosine ease for long settles — starts and ends weightless, like an
 * exhale, instead of the snap of a marketing curve. Input 0..1, output 0..1.
 */
export const breatheEase = (t: number): number =>
	0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/**
 * Dev/testing throttle: append `?stillness=fast` to shrink the long waits
 * (the 60s gift becomes 6s) without touching the transition durations —
 * patience can be shortened for testing; the breath itself is not for sale.
 */
export function scaleTime(ms: number): number {
	if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('stillness') === 'fast') {
		return Math.max(1000, ms / 10);
	}
	return ms;
}

let lastInput = typeof performance !== 'undefined' ? performance.now() : 0;
const activityCbs = new Set<() => void>();
let mounted = false;

function markInput() {
	lastInput = performance.now();
	for (const cb of activityCbs) cb();
}

/** Attach the singleton input listeners (idempotent). */
function mount() {
	if (mounted || typeof window === 'undefined') return;
	mounted = true;
	const opts = { passive: true } as AddEventListenerOptions;
	window.addEventListener('pointermove', markInput, opts);
	window.addEventListener('pointerdown', markInput, opts);
	window.addEventListener('wheel', markInput, opts);
	window.addEventListener('scroll', markInput, opts);
	window.addEventListener('keydown', markInput, opts);
	window.addEventListener('touchstart', markInput, opts);
	// Returning to the tab counts as arriving, not as having waited.
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) markInput();
	});
}

/** Milliseconds since the visitor last did anything. */
export function timeSinceInput(): number {
	return performance.now() - lastInput;
}

/**
 * Subscribe to every user input. Callbacks fire on pointermove, so keep them
 * to a guard-and-return unless something is actually in progress.
 * Returns an unsubscribe function.
 */
export function onActivity(cb: () => void): () => void {
	mount();
	activityCbs.add(cb);
	return () => activityCbs.delete(cb);
}

/**
 * Fire `cb` once the visitor has been quiet for `quietMs`. After firing, it
 * re-arms on the next input, so true stillness is rewarded every time it
 * happens, not just once. Returns a dispose function.
 *
 * Implementation: a lazy timer chain that checks remaining quiet time when it
 * wakes, rather than resetting a timeout on every pointermove.
 */
export function onQuiet(quietMs: number, cb: () => void): () => void {
	mount();
	let timer = 0;
	let disposed = false;
	let fired = false;

	const schedule = () => {
		if (disposed) return;
		clearTimeout(timer);
		const remaining = quietMs - timeSinceInput();
		timer = window.setTimeout(
			() => {
				if (disposed) return;
				if (timeSinceInput() >= quietMs) {
					fired = true;
					cb();
				} else {
					schedule();
				}
			},
			Math.max(64, remaining)
		);
	};

	const offActivity = onActivity(() => {
		if (fired) {
			// Quiet was broken after the reward — arm the next round.
			fired = false;
			schedule();
		}
	});

	schedule();
	return () => {
		disposed = true;
		clearTimeout(timer);
		offActivity();
	};
}
