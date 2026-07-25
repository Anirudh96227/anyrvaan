import { useEffect, useRef, useState } from 'react';

/**
 * Pulse — type a heart rate, or tap along to your own, and watch it drawn as
 * a live ECG-style trace with a beat that thumps in real time. No account,
 * no upload, nothing saved. The canvas sweeps like a real monitor: a
 * baseline with a P-QRS-T shape repeating at exactly your interval.
 */

const MIN_BPM = 30;
const MAX_BPM = 220;
const TAP_WINDOW_MS = 3000; // taps older than this are dropped from the average
const TAP_MAX_SAMPLES = 6; // rolling average of the last N intervals

function classify(bpm: number): string {
	if (bpm < 60) return 'Resting — athletic range';
	if (bpm <= 100) return 'Resting — typical range';
	if (bpm <= 140) return 'Elevated — light activity';
	if (bpm <= 170) return 'Elevated — vigorous activity';
	return 'High — peak exertion';
}

export default function Pulse() {
	const [bpm, setBpm] = useState(72);
	const [tapping, setTapping] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const bpmRef = useRef(bpm);
	bpmRef.current = bpm;
	const tapTimes = useRef<number[]>([]);
	const tapResetTimer = useRef(0);

	// ——— the trace ———
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const container = canvas.parentElement!;

		let W = 0,
			H = 0;
		const resize = () => {
			const r = container.getBoundingClientRect();
			W = r.width;
			H = r.height;
			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		// One heartbeat's shape as a function of phase (0..1 through the cycle):
		// a flat baseline, a small P bump, the sharp QRS spike, a rounded T bump,
		// then flat again — a simplified, honest ECG silhouette, not medical data.
		function beatShape(p: number): number {
			if (p < 0.12) return 0;
			if (p < 0.19) return 0.12 * Math.sin(((p - 0.12) / 0.07) * Math.PI); // P wave
			if (p < 0.24) return 0; // PR segment
			if (p < 0.27) return -0.15 * ((p - 0.24) / 0.03); // Q dip
			if (p < 0.3) return -0.15 + 1.15 * ((p - 0.27) / 0.03); // R spike up
			if (p < 0.34) return 1.0 - 1.35 * ((p - 0.3) / 0.04); // S dip
			if (p < 0.4) return -0.35 + 0.35 * ((p - 0.34) / 0.06); // back to baseline
			if (p < 0.58) return 0; // ST segment
			if (p < 0.74) return 0.22 * Math.sin(((p - 0.58) / 0.16) * Math.PI); // T wave
			return 0;
		}

		const SPEED_PX_S = 90; // trace scroll speed
		let history: number[] = new Array(Math.ceil(2000)).fill(0);
		let lastBeatFlash = 0;
		let raf = 0;
		let running = false;
		let last = 0;
		let elapsed = 0;

		function draw() {
			ctx!.clearRect(0, 0, W, H);
			const midY = H * 0.55;
			const amp = H * 0.32;

			const bpmNow = Math.max(MIN_BPM, Math.min(MAX_BPM, bpmRef.current));
			const periodMs = 60000 / bpmNow;
			const phase = (elapsed % periodMs) / periodMs;

			// scroll history left, push the newest sample on the right
			const px = Math.max(1, Math.round((SPEED_PX_S * 16.7) / 1000)); // ~px per frame at 60fps-equivalent
			history = history.slice(px);
			for (let i = 0; i < px; i++) history.push(beatShape(phase));

			// grid (very faint — the "monitor" feel)
			ctx!.strokeStyle = 'rgba(148, 163, 184, 0.08)';
			ctx!.lineWidth = 1;
			ctx!.beginPath();
			for (let x = W; x > 0; x -= 40) {
				ctx!.moveTo(x, 0);
				ctx!.lineTo(x, H);
			}
			ctx!.stroke();

			// the trace itself, right-aligned, newest sample at the right edge
			const start = Math.max(0, history.length - Math.ceil(W));
			ctx!.strokeStyle = 'rgba(45, 212, 191, 0.9)'; // mint
			ctx!.lineWidth = 2;
			ctx!.shadowColor = 'rgba(45, 212, 191, 0.55)';
			ctx!.shadowBlur = 8;
			ctx!.beginPath();
			for (let x = 0; x < W; x++) {
				const v = history[start + x] ?? 0;
				const y = midY - v * amp;
				if (x === 0) ctx!.moveTo(x, y);
				else ctx!.lineTo(x, y);
			}
			ctx!.stroke();
			ctx!.shadowBlur = 0;

			// the beat thump: a soft ring pulse fired once per R-spike
			if (phase < lastBeatFlash) {
				// wrapped around — a new beat started
			}
			lastBeatFlash = phase;
			const sinceR = phase < 0.3 ? 0.3 - phase : 1 - phase + 0.3; // rough distance from R spike
			const thump = Math.max(0, 1 - sinceR * 6);
			if (thump > 0.01) {
				const cx = W - 30,
					cy = midY - amp * 0.9;
				ctx!.fillStyle = `rgba(45, 212, 191, ${(0.5 * thump).toFixed(3)})`;
				ctx!.beginPath();
				ctx!.arc(cx, cy, 3 + thump * 10, 0, Math.PI * 2);
				ctx!.fill();
			}
		}

		function loop(t: number) {
			if (!last) last = t;
			elapsed += t - last;
			last = t;
			draw();
			raf = requestAnimationFrame(loop);
		}
		function start() {
			if (running) return;
			running = true;
			last = 0;
			raf = requestAnimationFrame(loop);
		}
		function stop() {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		}

		if (reduce) {
			draw();
		} else {
			start();
		}

		const onVis = () => {
			if (reduce) return;
			if (document.hidden) stop();
			else start();
		};
		let rt = 0;
		const onResize = () => {
			clearTimeout(rt);
			rt = window.setTimeout(() => {
				resize();
				history = new Array(Math.ceil(2000)).fill(0);
				if (reduce) draw();
			}, 150);
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('resize', onResize);

		return () => {
			stop();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
			clearTimeout(rt);
		};
	}, []);

	// ——— tap-to-measure ———
	function onTap() {
		const now = performance.now();
		tapTimes.current = tapTimes.current.filter((t) => now - t < TAP_WINDOW_MS);
		tapTimes.current.push(now);
		if (tapTimes.current.length > TAP_MAX_SAMPLES + 1) {
			tapTimes.current = tapTimes.current.slice(-(TAP_MAX_SAMPLES + 1));
		}
		if (tapTimes.current.length >= 2) {
			const intervals: number[] = [];
			for (let i = 1; i < tapTimes.current.length; i++) {
				intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
			}
			const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
			const measured = Math.round(60000 / avg);
			setBpm(Math.max(MIN_BPM, Math.min(MAX_BPM, measured)));
		}
		setTapping(true);
		clearTimeout(tapResetTimer.current);
		tapResetTimer.current = window.setTimeout(() => {
			setTapping(false);
			tapTimes.current = [];
		}, TAP_WINDOW_MS);
	}

	return (
		<div className="not-prose">
			<div className="rounded-2xl border border-white/10 bg-black">
				<div className="relative h-56 sm:h-64">
					<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
				</div>
				<div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/5 px-6 py-6">
					<div>
						<div className="flex items-baseline gap-2">
							<span className="text-h2 font-semibold tabular-nums text-neutral-50">{bpm}</span>
							<span className="text-small text-neutral-400">bpm</span>
						</div>
						<p className="mt-1 text-small text-neutral-500">{classify(bpm)}</p>
					</div>
					<div className="flex flex-1 flex-wrap items-center gap-4 sm:justify-end">
						<label className="flex items-center gap-3 text-small text-neutral-400">
							<span className="sr-only">Beats per minute</span>
							<input
								type="range"
								min={MIN_BPM}
								max={MAX_BPM}
								value={bpm}
								onInput={(e) => setBpm(Number((e.target as HTMLInputElement).value))}
								className="pulse-slider h-1 w-40 cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400 sm:w-56"
							/>
						</label>
						<button
							type="button"
							onPointerDown={onTap}
							className={[
								'select-none rounded-full border px-5 py-2 text-small font-medium transition-colors',
								tapping
									? 'border-teal-400/50 bg-teal-400/10 text-teal-300'
									: 'border-white/15 text-neutral-300 hover:border-white/30 hover:text-neutral-50',
							].join(' ')}
						>
							{tapping ? 'Keep tapping…' : 'Tap to your pulse'}
						</button>
					</div>
				</div>
			</div>
			<p className="mt-4 text-small text-neutral-500">
				Nothing here is measured, saved, or sent anywhere — the trace is a drawn illustration of
				the rate you enter, not a medical reading.
			</p>
		</div>
	);
}
