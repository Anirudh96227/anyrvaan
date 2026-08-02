import { useEffect, useRef, useState } from 'react';
import { BREATH_MS, timeSinceInput } from '../scripts/stillness';

/**
 * NEW FORESTS BEGIN
 * -------------------------------------------------------------------------
 * The Sky Dancers' own last line, running as the thing on the page. Bats cross
 * a moonlit river. They drop seeds as they go. Where a seed lands, a tree grows
 * — and it stays. Come back to the section later and the trees you planted are
 * still standing.
 *
 * The point is consequence. A flock that scatters from the pointer and returns
 * to its shape is a toy: nothing that happens to it matters a second later.
 * Here the only permanent thing on the page is the part the visitor caused, and
 * the caption counts it out loud the way the book would.
 *
 * How it's put together:
 *   - Each tree is grown, not drawn. Its branches are generated once from its
 *     own seed, then revealed over about five seconds, deepest branches last.
 *     No two are the same tree.
 *   - A finished tree is baked onto a static layer and stops costing anything
 *     per frame, so the forest can keep filling without the animation slowing.
 *   - The flock plants on its own at breath tempo. Doing nothing still tells
 *     the story; the pointer only lets you aim it.
 *
 * Contract: static under prefers-reduced-motion (grown forest, mid-flight
 * flock), asleep off screen and when the tab is hidden, thinner on coarse
 * pointers and low-core devices.
 */

const MOON = '186, 205, 240';
const LAMP = '240, 190, 120';
const MAX_TREES = 22;

const WORDS = [
	'No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
	'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
	'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one', 'Twenty-two',
];

interface Seg {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	wide: number;
	/** When this segment starts and finishes emerging, 0..1 of the tree's growth. */
	t0: number;
	t1: number;
	leaf: boolean;
}

/** A tree, generated once from its seed: trunk, branches, and a few leaf tufts. */
function growTree(rand: () => number, scale: number): Seg[] {
	const segs: Seg[] = [];
	const MAX_DEPTH = 5;

	function branch(x: number, y: number, ang: number, len: number, depth: number, t: number) {
		const x1 = x + Math.cos(ang) * len;
		const y1 = y + Math.sin(ang) * len;
		const span = 0.15 + depth * 0.02;
		segs.push({
			x0: x,
			y0: y,
			x1,
			y1,
			wide: Math.max(0.7, (MAX_DEPTH - depth) * 1.15 * scale),
			t0: t,
			t1: Math.min(1, t + span),
			leaf: false,
		});
		if (depth >= MAX_DEPTH) {
			// The canopy arrives last, and only at the ends.
			segs.push({
				x0: x1,
				y0: y1,
				x1,
				y1,
				wide: (2.2 + rand() * 2.4) * scale,
				t0: Math.min(0.97, t + span),
				t1: 1,
				leaf: true,
			});
			return;
		}
		const forks = rand() < 0.24 ? 3 : 2;
		for (let i = 0; i < forks; i++) {
			const spread = 0.42 + rand() * 0.46;
			const dir = i === 0 ? -1 : i === 1 ? 1 : rand() - 0.5;
			branch(x1, y1, ang + spread * dir, len * (0.66 + rand() * 0.16), depth + 1, t + span);
		}
	}

	// Trunks lean; a colonnade of verticals would read as a fence.
	branch(0, 0, -Math.PI / 2 + (rand() - 0.5) * 0.3, (26 + rand() * 12) * scale, 0, 0);
	return segs;
}

/** Small deterministic PRNG so a tree is the same tree if it's ever rebuilt. */
function mulberry(a: number) {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface Props {
	label?: string;
}

export default function NewForests({
	label = 'Bats crossing a moonlit river, dropping seeds that grow into trees',
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [planted, setPlanted] = useState(0);
	const plantedRef = useRef(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const coarse = matchMedia('(pointer: coarse)').matches;
		const lowTier = coarse || (navigator.hardwareConcurrency || 8) <= 4;
		const dpr = Math.min(window.devicePixelRatio || 1, lowTier ? 1.25 : 2);

		let w = 0;
		let h = 0;

		// Finished trees are baked here once and never redrawn per frame.
		const layer = document.createElement('canvas');
		const lctx = layer.getContext('2d');

		interface Bat {
			x: number;
			y: number;
			ty: number;
			vx: number;
			seed: number;
			size: number;
			/** ms until this one drops a seed of its own accord. */
			next: number;
		}
		interface Seed {
			x: number;
			y: number;
			vx: number;
			vy: number;
			seed: number;
			/** Sent by the visitor rather than dropped on the flock's own schedule. */
			byHand: boolean;
		}
		interface Tree {
			x: number;
			y: number;
			segs: Seg[];
			grow: number;
			scale: number;
		}

		const BAT_N = lowTier ? 7 : 11;
		let bats: Bat[] = [];
		let seeds: Seed[] = [];
		let growing: Tree[] = [];
		let done: Tree[] = [];

		const groundY = (x: number) => h * 0.83 + Math.sin(x * 0.0042 + 1.1) * h * 0.022;

		function bakeLayer() {
			if (!lctx) return;
			lctx.setTransform(1, 0, 0, 1, 0, 0);
			lctx.clearRect(0, 0, layer.width, layer.height);
			lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			for (const tr of done) paintTree(lctx, tr, 1);
		}

		function seedBats() {
			bats = [];
			for (let i = 0; i < BAT_N; i++) {
				const dir = i % 2 === 0 ? 1 : -1;
				// Staggered by index, not randomised: giving every bat the same short
				// starting interval made the whole flock plant at once and the bank
				// filled in the first ten seconds. First tree at about six seconds,
				// then roughly one every nine, and after that each bat drops to its
				// own much slower cycle.
				const first = 6000 + i * 9000 + Math.random() * 9000;
				bats.push({
					x: Math.random() * w,
					y: h * (0.1 + Math.random() * 0.36),
					ty: h * (0.1 + Math.random() * 0.36),
					vx: dir * (0.5 + Math.random() * 0.5),
					seed: Math.random() * 1000,
					size: 0.62 + Math.random() * 0.4,
					next: first,
				});
			}
		}

		let sized = false;
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			w = rect.width;
			h = rect.height;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			layer.width = canvas.width;
			layer.height = canvas.height;
			if (!sized) {
				seedBats();
				sized = true;
			}
			bakeLayer();
		};
		resize();

		let px = -1e4;
		let py = -1e4;
		const onMove = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			px = e.clientX - r.left;
			py = e.clientY - r.top;
		};
		const onLeave = () => {
			px = -1e4;
			py = -1e4;
		};

		function plantAt(x: number, fromX: number, fromY: number, byHand: boolean) {
			seeds.push({
				x: fromX,
				y: fromY,
				// Aimed, not dropped — a seed that only falls straight down would
				// make the pointer pointless.
				vx: (x - fromX) / 90,
				vy: 0.4,
				seed: Math.random() * 1e9,
				byHand,
			});
		}

		// Tapping sends the nearest bat's seed to where you tapped.
		const onDown = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			const tx = e.clientX - r.left;
			let best = bats[0];
			let bestD = Infinity;
			for (const b of bats) {
				const d = Math.abs(b.x - tx);
				if (d < bestD) {
					bestD = d;
					best = b;
				}
			}
			if (best) plantAt(tx, best.x, best.y, true);
		};

		function drawBat(c: CanvasRenderingContext2D, bx: number, by: number, dir: number, flap: number, s: number, fill: string) {
			c.save();
			c.translate(bx, by);
			c.scale(dir * s, s);
			c.fillStyle = fill;
			const tip = -5.5 * flap + 1.5;
			c.beginPath();
			c.moveTo(0, -2.6);
			c.quadraticCurveTo(-4, -5 + tip * 0.5, -10.5, tip);
			c.quadraticCurveTo(-7.5, tip + 2.2, -6, tip + 3.4);
			c.quadraticCurveTo(-5.4, tip + 1.4, -4.2, tip + 2.6);
			c.quadraticCurveTo(-2.6, 1.4, 0, 3.2);
			c.quadraticCurveTo(2.6, 1.4, 4.2, tip + 2.6);
			c.quadraticCurveTo(5.4, tip + 1.4, 6, tip + 3.4);
			c.quadraticCurveTo(7.5, tip + 2.2, 10.5, tip);
			c.quadraticCurveTo(4, -5 + tip * 0.5, 0, -2.6);
			c.closePath();
			c.fill();
			c.beginPath();
			c.arc(0, -3.4, 1.8, 0, Math.PI * 2);
			c.fill();
			c.beginPath();
			c.moveTo(-1.5, -4.6);
			c.lineTo(-2.1, -7.1);
			c.lineTo(-0.3, -5.2);
			c.closePath();
			c.moveTo(1.5, -4.6);
			c.lineTo(2.1, -7.1);
			c.lineTo(0.3, -5.2);
			c.closePath();
			c.fill();
			c.restore();
		}

		function paintTree(c: CanvasRenderingContext2D, tr: Tree, grow: number) {
			c.save();
			c.translate(tr.x, tr.y);
			c.lineCap = 'round';
			for (const s of tr.segs) {
				if (grow <= s.t0) continue;
				const p = Math.min(1, (grow - s.t0) / (s.t1 - s.t0));
				if (s.leaf) {
					c.fillStyle = `rgba(11, 15, 22, ${(0.72 * p).toFixed(3)})`;
					c.beginPath();
					c.arc(s.x0, s.y0, s.wide * p, 0, Math.PI * 2);
					c.fill();
					continue;
				}
				const ex = s.x0 + (s.x1 - s.x0) * p;
				const ey = s.y0 + (s.y1 - s.y0) * p;
				c.strokeStyle = 'rgba(9, 12, 18, 0.92)';
				c.lineWidth = s.wide;
				c.beginPath();
				c.moveTo(s.x0, s.y0);
				c.lineTo(ex, ey);
				c.stroke();
				// The moon is off to the right, so that edge of every limb catches it.
				c.strokeStyle = `rgba(${MOON}, 0.14)`;
				c.lineWidth = Math.max(0.5, s.wide * 0.34);
				c.beginPath();
				c.moveTo(s.x0 + s.wide * 0.32, s.y0);
				c.lineTo(ex + s.wide * 0.32, ey);
				c.stroke();
			}
			c.restore();
		}

		function step(t: number, dt: number) {
			const stillness = Math.min(1, timeSinceInput() / BREATH_MS);

			for (const b of bats) {
				// A steer toward the pointer's height when it's over the scene, so
				// the flock answers without being dragged around by it.
				if (py > 0 && py < h * 0.62) b.ty += (py - b.ty) * 0.02;
				else if (Math.random() < 0.004) b.ty = h * (0.1 + Math.random() * 0.36);
				b.y += (b.ty - b.y) * 0.014 * dt;
				b.y += Math.sin(t * 0.0022 + b.seed) * 0.22 * dt;
				b.x += b.vx * dt * 1.5;
				if (b.x < -30) b.x = w + 30;
				if (b.x > w + 30) b.x = -30;

				// Left alone, they keep planting — but slowly. Across the flock this
				// is a tree every ten seconds or so, which is the point: the bank
				// should still be filling when you come back to it, not finished
				// before you've read the paragraph above it.
				b.next -= dt * 16.67 * (1 + stillness);
				if (b.next <= 0 && done.length + growing.length < MAX_TREES) {
					b.next = 70000 + Math.random() * 90000;
					plantAt(b.x + (Math.random() - 0.5) * w * 0.3, b.x, b.y, false);
				}
			}

			for (let i = seeds.length - 1; i >= 0; i--) {
				const s = seeds[i];
				s.vy += 0.055 * dt;
				s.x += s.vx * dt;
				s.y += s.vy * dt;
				if (s.y >= groundY(s.x)) {
					seeds.splice(i, 1);
					// At the cap the flock stops planting, but a seed the visitor sent
					// always takes — the oldest tree makes way for it below. Nothing
					// the visitor does should quietly do nothing.
					if (!s.byHand && done.length + growing.length >= MAX_TREES) continue;
					const rand = mulberry(s.seed);
					const scale = 0.85 + rand() * 0.5;
					growing.push({ x: s.x, y: groundY(s.x), segs: growTree(rand, scale), grow: 0, scale });
				}
			}

			for (let i = growing.length - 1; i >= 0; i--) {
				const tr = growing[i];
				tr.grow = Math.min(1, tr.grow + dt / 300); // ~5s to full height
				if (tr.grow >= 1) {
					growing.splice(i, 1);
					done.push(tr);
					// The oldest makes way, so the bank never turns into a wall.
					if (done.length > MAX_TREES) done.shift();
					bakeLayer();
					plantedRef.current = done.length;
					setPlanted(done.length);
				}
			}
		}

		function draw(t: number) {
			ctx!.clearRect(0, 0, w, h);

			// Sky: darkest overhead, barely lifting toward the far bank.
			const sky = ctx!.createLinearGradient(0, 0, 0, h * 0.66);
			sky.addColorStop(0, 'rgba(10, 14, 26, 0)');
			sky.addColorStop(1, 'rgba(38, 52, 84, 0.42)');
			ctx!.fillStyle = sky;
			ctx!.fillRect(0, 0, w, h * 0.66);

			// The moon, flat as a full moon is, with its glow on the water below.
			const mX = w * 0.78;
			const mY = h * 0.24;
			const mR = Math.min(w, h) * 0.15;
			const halo = ctx!.createRadialGradient(mX, mY, 0, mX, mY, mR * 5);
			halo.addColorStop(0, `rgba(${MOON}, 0.13)`);
			halo.addColorStop(1, `rgba(${MOON}, 0)`);
			ctx!.fillStyle = halo;
			ctx!.fillRect(0, 0, w, h);
			ctx!.fillStyle = `rgba(${MOON}, 0.42)`;
			ctx!.beginPath();
			ctx!.arc(mX, mY, mR, 0, Math.PI * 2);
			ctx!.fill();
			ctx!.save();
			ctx!.beginPath();
			ctx!.arc(mX, mY, mR, 0, Math.PI * 2);
			ctx!.clip();
			ctx!.fillStyle = 'rgba(96, 112, 140, 0.2)';
			ctx!.beginPath();
			ctx!.arc(mX - mR * 0.24, mY - mR * 0.3, mR * 0.34, 0, Math.PI * 2);
			ctx!.arc(mX + mR * 0.18, mY + mR * 0.02, mR * 0.26, 0, Math.PI * 2);
			ctx!.arc(mX - mR * 0.06, mY + mR * 0.32, mR * 0.3, 0, Math.PI * 2);
			ctx!.fill();
			ctx!.restore();

			// The far bank: a town asleep with a few windows still on.
			const bank = h * 0.62;
			ctx!.fillStyle = 'rgba(12, 17, 28, 0.9)';
			ctx!.beginPath();
			ctx!.moveTo(0, bank);
			for (let x = 0; x <= w; x += 24) {
				ctx!.lineTo(x, bank - 6 - Math.abs(Math.sin(x * 0.021 + 2.4)) * 16);
			}
			ctx!.lineTo(w, bank);
			ctx!.closePath();
			ctx!.fill();
			for (let i = 0; i < 26; i++) {
				const lx = ((i * 137.5) % 100) * (w / 100);
				const flick = 0.6 + 0.4 * Math.sin(t * 0.0014 + i * 2.1);
				ctx!.fillStyle = `rgba(${LAMP}, ${(0.34 * flick).toFixed(3)})`;
				ctx!.fillRect(lx, bank - 4 - (i % 4) * 2.5, 1.6, 1.6);
			}

			// The river, and the moon broken across it.
			ctx!.fillStyle = 'rgba(16, 24, 42, 0.55)';
			ctx!.fillRect(0, bank, w, h - bank);
			for (let k = 0; k < 16; k++) {
				const ry = bank + 3 + k * ((groundY(mX) - bank) / 16);
				const wob = Math.sin(t * 0.0012 + k * 1.6) * (3 + k * 0.9);
				const len = 10 + k * 2.4;
				ctx!.strokeStyle = `rgba(${MOON}, ${(0.2 * (1 - k / 18)).toFixed(3)})`;
				ctx!.lineWidth = 1.2;
				ctx!.beginPath();
				ctx!.moveTo(mX - len / 2 + wob, ry);
				ctx!.lineTo(mX + len / 2 + wob, ry);
				ctx!.stroke();
			}

			// The near bank the forest stands on.
			ctx!.fillStyle = 'rgba(7, 10, 16, 0.96)';
			ctx!.beginPath();
			ctx!.moveTo(0, h);
			for (let x = 0; x <= w; x += 12) ctx!.lineTo(x, groundY(x));
			ctx!.lineTo(w, h);
			ctx!.closePath();
			ctx!.fill();

			// Everything already grown, in one blit.
			if (lctx) {
				ctx!.save();
				ctx!.setTransform(1, 0, 0, 1, 0, 0);
				ctx!.drawImage(layer, 0, 0);
				ctx!.restore();
			}
			for (const tr of growing) paintTree(ctx!, tr, tr.grow);

			// Seeds in the air — small, warm, and the only moving light here.
			for (const s of seeds) {
				ctx!.fillStyle = `rgba(${LAMP}, 0.85)`;
				ctx!.beginPath();
				ctx!.arc(s.x, s.y, 1.7, 0, Math.PI * 2);
				ctx!.fill();
				ctx!.fillStyle = `rgba(${LAMP}, 0.16)`;
				ctx!.beginPath();
				ctx!.arc(s.x, s.y, 5.5, 0, Math.PI * 2);
				ctx!.fill();
			}

			for (const b of bats) {
				const flap = 0.5 + 0.5 * Math.sin(t * 0.013 + b.seed * 3);
				// Against the moon they're silhouettes; against the sky, moonlit.
				const onMoon = Math.hypot(b.x - mX, b.y - mY) < mR * 1.05;
				drawBat(
					ctx!,
					b.x,
					b.y,
					b.vx >= 0 ? 1 : -1,
					flap,
					b.size,
					onMoon ? 'rgba(10, 14, 22, 0.9)' : `rgba(${MOON}, 0.36)`
				);
			}
		}

		let raf = 0;
		let running = false;
		let last = 0;
		const loop = (t: number) => {
			const dt = Math.min(2.4, last ? (t - last) / 16.67 : 1);
			last = t;
			step(t, dt);
			draw(t);
			raf = requestAnimationFrame(loop);
		};
		const start = () => {
			if (running || reduce) return;
			running = true;
			last = 0;
			raf = requestAnimationFrame(loop);
		};
		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		if (reduce) {
			// The end of the story rather than the middle of it: a grown stand of
			// trees and the flock already across.
			for (let i = 0; i < 9; i++) {
				const rand = mulberry(1000 + i * 7717);
				const gx = (0.06 + rand() * 0.88) * w;
				done.push({ x: gx, y: groundY(gx), segs: growTree(rand, 0.85 + rand() * 0.5), grow: 1, scale: 1 });
			}
			bakeLayer();
			plantedRef.current = done.length;
			setPlanted(done.length);
		}
		draw(0);

		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) start();
				else stop();
			},
			{ threshold: 0.05 }
		);
		io.observe(canvas);

		const onVis = () => {
			if (document.hidden) stop();
			else if (!reduce) start();
		};
		let rt = 0;
		const onResize = () => {
			clearTimeout(rt);
			rt = window.setTimeout(() => {
				resize();
				draw(0);
			}, 180);
		};

		canvas.addEventListener('pointermove', onMove, { passive: true });
		canvas.addEventListener('pointerleave', onLeave, { passive: true });
		canvas.addEventListener('pointerdown', onDown);
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('resize', onResize);

		return () => {
			stop();
			io.disconnect();
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerleave', onLeave);
			canvas.removeEventListener('pointerdown', onDown);
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
			clearTimeout(rt);
		};
	}, []);

	const count =
		planted >= MAX_TREES
			? 'A forest.'
			: planted === 1
				? 'One tree.'
				: `${WORDS[planted] ?? planted} trees.`;

	return (
		<div className="mx-auto max-w-5xl">
			<div className="glow-frame reveal rounded-2xl">
				<div className="glow-frame__inner aspect-[4/3] overflow-hidden border border-white/10 bg-neutral-950 sm:aspect-[21/9]">
					<canvas ref={canvasRef} className="block h-full w-full touch-none" role="img" aria-label={label} />
				</div>
			</div>
			<div className="reveal mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
				<p className="text-small text-neutral-400">
					They plant it themselves if you leave them to it. Tap the bank to send one where you want it.
				</p>
				<p aria-live="polite" className="text-small tabular-nums text-neutral-200">
					{count}
				</p>
			</div>
		</div>
	);
}
