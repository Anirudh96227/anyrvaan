import { useEffect, useRef } from 'react';

/**
 * An ambient "world" behind a case study — one fixed, low-opacity canvas whose
 * motif matches the project's subject. Five moods, one component:
 *   retro     — CRT scanlines drifting, with a slow phosphor flicker
 *   spiritual — concentric rings of dots, breathing and turning
 *   dashboard — a faint data grid with a scan pulse sweeping across
 *   ui        — a cell grid lit by a slow-drifting cursor of light
 *   effects   — sparse particles drifting like the homepage field
 *
 * Contract (same as the rest of the site): static under prefers-reduced-motion,
 * paused when the tab is hidden, thinner on coarse pointers / low-core devices,
 * and kept faint enough that body copy stays readable straight over it.
 */
export type World = 'retro' | 'spiritual' | 'dashboard' | 'ui' | 'effects';

const COBALT = '96, 165, 250'; // the site's one signal blue, rgb
const PHOSPHOR = '110, 231, 183'; // faint CRT green, retro only

export default function WorldBackground({ theme }: { theme: World }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const coarse = matchMedia('(pointer: coarse)').matches;
		const lowTier = coarse || (navigator.hardwareConcurrency || 8) <= 4;
		const dpr = Math.min(window.devicePixelRatio || 1, lowTier ? 1 : 1.5);

		let w = 0,
			h = 0;
		const resize = () => {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();

		// Effects/particle seed (only used by the 'effects' world).
		const N = lowTier ? 26 : 46;
		const px = new Float32Array(N),
			py = new Float32Array(N),
			pr = new Float32Array(N),
			pv = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			px[i] = Math.random() * w;
			py[i] = Math.random() * h;
			pr[i] = 0.8 + Math.random() * 1.8;
			pv[i] = 0.06 + Math.random() * 0.16; // slow upward drift
		}

		function draw(t: number) {
			ctx!.clearRect(0, 0, w, h);
			const cx = w / 2,
				cy = h * 0.42;

			if (theme === 'retro') {
				// drifting scanlines + a slow brightness flicker
				const off = (t * 0.012) % 6;
				const flick = 0.5 + 0.5 * Math.sin(t * 0.004);
				ctx!.strokeStyle = `rgba(${PHOSPHOR}, ${(0.11 + 0.05 * flick).toFixed(3)})`;
				ctx!.lineWidth = 1;
				ctx!.beginPath();
				for (let y = -6 + off; y < h; y += 6) {
					ctx!.moveTo(0, y);
					ctx!.lineTo(w, y);
				}
				ctx!.stroke();
				// a single soft phosphor bloom sweeping down
				const sweepY = ((t * 0.03) % (h + 300)) - 150;
				const g = ctx!.createRadialGradient(cx, sweepY, 0, cx, sweepY, 300);
				g.addColorStop(0, `rgba(${PHOSPHOR}, 0.13)`);
				g.addColorStop(1, `rgba(${PHOSPHOR}, 0)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(0, sweepY - 300, w, 600);
			} else if (theme === 'spiritual') {
				// concentric rings of dots, breathing + slowly turning — large
				// enough that the outer rings reach the frame's edges
				const breath = 1 + 0.04 * Math.sin(t * 0.0009);
				const rot = t * 0.00006;
				const rings = lowTier ? 5 : 6;
				const unit = Math.min(w, h) * 0.075;
				for (let r = 1; r <= rings; r++) {
					const rad = r * unit * breath;
					const count = 6 * r;
					const off = r % 2 ? rot : -rot + Math.PI / count;
					ctx!.fillStyle = `rgba(${r === 3 ? COBALT : '235,235,235'}, ${(0.62 - r * 0.055).toFixed(3)})`;
					for (let k = 0; k < count; k++) {
						const a = (k / count) * Math.PI * 2 + off;
						const x = cx + Math.cos(a) * rad;
						const y = cy + Math.sin(a) * rad;
						ctx!.beginPath();
						ctx!.arc(x, y, 1.8, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			} else if (theme === 'dashboard') {
				// faint grid + a horizontal scan pulse
				const cell = 64;
				ctx!.strokeStyle = `rgba(${COBALT}, 0.11)`;
				ctx!.lineWidth = 1;
				ctx!.beginPath();
				for (let x = 0; x < w; x += cell) {
					ctx!.moveTo(x, 0);
					ctx!.lineTo(x, h);
				}
				for (let y = 0; y < h; y += cell) {
					ctx!.moveTo(0, y);
					ctx!.lineTo(w, y);
				}
				ctx!.stroke();
				const sx = (t * 0.05) % (w + 260);
				const g = ctx!.createLinearGradient(sx - 260, 0, sx, 0);
				g.addColorStop(0, `rgba(${COBALT}, 0)`);
				g.addColorStop(1, `rgba(${COBALT}, 0.22)`);
				ctx!.fillStyle = g;
				ctx!.fillRect(sx - 260, 0, 260, h);
			} else if (theme === 'ui') {
				// a cell grid lit by a slow-drifting cursor of light
				const cell = 46;
				const lx = cx + Math.cos(t * 0.00035) * w * 0.34;
				const ly = cy + Math.sin(t * 0.00045) * h * 0.32;
				for (let x = cell / 2; x < w; x += cell) {
					for (let y = cell / 2; y < h; y += cell) {
						const d = Math.hypot(x - lx, y - ly);
						const near = Math.max(0, 1 - d / 300);
						if (near <= 0.02) continue;
						ctx!.fillStyle = `rgba(${COBALT}, ${(0.6 * near * near).toFixed(3)})`;
						ctx!.beginPath();
						ctx!.arc(x, y, 1.4 + near * 1.8, 0, Math.PI * 2);
						ctx!.fill();
					}
				}
			} else {
				// effects — sparse particles drifting slowly upward
				for (let i = 0; i < N; i++) {
					py[i] -= pv[i];
					if (py[i] < -4) {
						py[i] = h + 4;
						px[i] = Math.random() * w;
					}
					ctx!.fillStyle = `rgba(235,235,235, ${(0.2 + (pr[i] - 0.8) * 0.14).toFixed(3)})`;
					ctx!.beginPath();
					ctx!.arc(px[i], py[i], pr[i], 0, Math.PI * 2);
					ctx!.fill();
				}
			}
		}

		let raf = 0;
		let running = false;
		const loop = (t: number) => {
			draw(t);
			raf = requestAnimationFrame(loop);
		};
		const startLoop = () => {
			if (running) return;
			running = true;
			raf = requestAnimationFrame(loop);
		};
		const stopLoop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		if (reduce) {
			draw(0); // one static frame, no loop
		} else {
			startLoop();
		}

		const onVis = () => {
			if (reduce) return;
			if (document.hidden) stopLoop();
			else startLoop();
		};
		let rt = 0;
		const onResize = () => {
			clearTimeout(rt);
			rt = window.setTimeout(() => {
				resize();
				if (reduce) draw(0);
			}, 180);
		};
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('resize', onResize);

		return () => {
			stopLoop();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
			clearTimeout(rt);
		};
	}, [theme]);

	return (
		<canvas
			ref={ref}
			aria-hidden="true"
			style={{
				position: 'fixed',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: 0,
				pointerEvents: 'none',
				// Fade under the nav at the top and out at the very bottom; the world
				// stays evenly present across the rest, subtle enough to sit behind
				// high-contrast body copy without fighting it.
				maskImage: 'linear-gradient(180deg, transparent 0%, #000 11%, #000 90%, transparent 100%)',
				WebkitMaskImage:
					'linear-gradient(180deg, transparent 0%, #000 11%, #000 90%, transparent 100%)',
			}}
		/>
	);
}
