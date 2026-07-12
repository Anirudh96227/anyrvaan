import { useEffect, useRef } from 'react';

/**
 * Spreadsheet → dashboard, animated. Two equal, 3D-tilted light panels (product
 * -shot style) face each other across a gap: a financial spreadsheet on the
 * right, a revenue dashboard on the left. Square "data packets" of blue light
 * stream from each revenue cell across the gap into the matching bar, whose
 * value ticks up as it arrives — then it drains and loops. DOM panels (crisp 3D
 * text) + a canvas overlay for the packets. Pauses off-screen; static under
 * reduced motion. The visual argument of the case study.
 */
const rows = [
	{ m: 'Jan', revenue: 3.84, cogs: 1.11, margin: 71 },
	{ m: 'Feb', revenue: 4.2, cogs: 1.38, margin: 67 },
	{ m: 'Mar', revenue: 4.91, cogs: 1.42, margin: 71 },
	{ m: 'Apr', revenue: 5.2, cogs: 1.5, margin: 71 },
	{ m: 'May', revenue: 5.62, cogs: 1.62, margin: 71 },
	{ m: 'Jun', revenue: 6.1, cogs: 1.7, margin: 72 },
];
const maxRev = Math.max(...rows.map((r) => r.revenue));
const activeIdx = rows.length - 1; // highlighted bar (latest)

export default function SheetToDashboard() {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const srcEls = Array.from(container.querySelectorAll<HTMLElement>('[data-src]'));
		const valEls = Array.from(container.querySelectorAll<HTMLElement>('[data-kpi]'));
		const barEls = Array.from(container.querySelectorAll<HTMLElement>('[data-bar]'));

		let W = 0,
			H = 0;
		let srcPt: { x: number; y: number }[] = [];
		let tgtPt: { x: number; y: number }[] = [];

		function measure() {
			const cr = container!.getBoundingClientRect();
			W = cr.width;
			H = cr.height;
			canvas!.width = Math.round(W * dpr);
			canvas!.height = Math.round(H * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			const center = (el: HTMLElement) => {
				const r = el.getBoundingClientRect();
				return { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top };
			};
			srcPt = srcEls.map(center);
			tgtPt = valEls.map(center);
		}

		type Pk = { i: number; prog: number; speed: number; cx: number; cy: number; rot: number };
		let packs: Pk[] = [];
		let phase: 'fill' | 'hold' | 'drain' = 'fill';
		let progress = 0,
			phaseT = 0,
			spawnAcc = 0;
		let raf = 0,
			running = false,
			onScreen = true,
			lastT = 0;

		function applyValues() {
			for (let i = 0; i < rows.length; i++) {
				if (valEls[i]) valEls[i].textContent = '$' + (rows[i].revenue * progress).toFixed(2) + 'M';
				if (barEls[i])
					barEls[i].style.height = ((rows[i].revenue / maxRev) * progress * 92 + 2).toFixed(1) + '%';
			}
		}

		function spawn() {
			const i = (Math.random() * rows.length) | 0;
			const s = srcPt[i];
			const t = tgtPt[i];
			if (!s || !t) return;
			packs.push({
				i,
				prog: 0,
				speed: 0.55 + Math.random() * 0.4,
				cx: (s.x + t.x) / 2,
				cy: Math.min(s.y, t.y) - 40 - Math.random() * 44,
				rot: Math.random() * Math.PI,
			});
		}

		function step(dt: number) {
			phaseT += dt;
			if (phase === 'fill') {
				// Fast enough that a value is almost always either 0 (about to
				// start) or fully settled — a mid-transition snapshot is brief and
				// rare, rather than a long stretch of visibly "wrong" numbers.
				progress = Math.min(1, phaseT / 2400);
				if (phaseT >= 2400) {
					phase = 'hold';
					phaseT = 0;
					progress = 1;
				}
				spawnAcc += dt;
				while (spawnAcc > 90 && packs.length < 60) {
					spawnAcc -= 90;
					spawn();
				}
			} else if (phase === 'hold') {
				progress = 1;
				if (phaseT >= 4200) {
					phase = 'drain';
					phaseT = 0;
				}
			} else {
				progress = Math.max(0, 1 - phaseT / 650);
				if (phaseT >= 650) {
					phase = 'fill';
					phaseT = 0;
					progress = 0;
					packs = [];
				}
			}
			applyValues();
			for (let k = packs.length - 1; k >= 0; k--) {
				packs[k].prog += (packs[k].speed * dt) / 1000;
				if (packs[k].prog >= 1) packs.splice(k, 1);
			}
		}

		const bez = (a: number, b: number, c: number, t: number) => {
			const u = 1 - t;
			return u * u * a + 2 * u * t * c + t * t * b;
		};

		function draw() {
			ctx!.clearRect(0, 0, W, H);
			ctx!.save();
			ctx!.globalCompositeOperation = 'lighter';
			for (const p of packs) {
				const s = srcPt[p.i];
				const t = tgtPt[p.i];
				if (!s || !t) continue;
				const x = bez(s.x, t.x, p.cx, p.prog);
				const y = bez(s.y, t.y, p.cy, p.prog);
				const a = Math.sin(Math.min(1, p.prog) * Math.PI);
				const g = ctx!.createRadialGradient(x, y, 0, x, y, 11);
				g.addColorStop(0, `rgba(96,165,250,${0.85 * a})`);
				g.addColorStop(1, 'rgba(59,130,246,0)');
				ctx!.fillStyle = g;
				ctx!.beginPath();
				ctx!.arc(x, y, 11, 0, Math.PI * 2);
				ctx!.fill();
				ctx!.save();
				ctx!.translate(x, y);
				ctx!.rotate(p.rot + p.prog * 2.5);
				ctx!.fillStyle = `rgba(191,219,254,${a})`;
				ctx!.fillRect(-2.6, -2.6, 5.2, 5.2);
				ctx!.restore();
			}
			ctx!.restore();
		}

		function frame(t: number) {
			if (!running) return;
			const dt = Math.min(50, t - lastT || 16);
			lastT = t;
			step(dt);
			draw();
			raf = requestAnimationFrame(frame);
		}
		function start() {
			if (running || !onScreen) return;
			running = true;
			lastT = performance.now();
			raf = requestAnimationFrame(frame);
		}
		function stop() {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		}
		function staticFrame() {
			progress = 1;
			applyValues();
			ctx!.clearRect(0, 0, W, H);
		}

		requestAnimationFrame(() => {
			measure();
			if (reduce) staticFrame();
			else start();
		});

		const io = new IntersectionObserver(
			(es) => {
				onScreen = es[0].isIntersecting;
				if (reduce) return;
				onScreen ? start() : stop();
			},
			{ threshold: 0.1 }
		);
		io.observe(container);
		const onVis = () => {
			if (reduce) return;
			if (document.hidden) stop();
			else if (onScreen) start();
		};
		document.addEventListener('visibilitychange', onVis);
		let rt = 0;
		const ro = new ResizeObserver(() => {
			clearTimeout(rt);
			rt = window.setTimeout(() => {
				measure();
				if (reduce || !running) staticFrame();
			}, 150);
		});
		ro.observe(container);

		return () => {
			stop();
			io.disconnect();
			ro.disconnect();
			document.removeEventListener('visibilitychange', onVis);
			clearTimeout(rt);
		};
	}, []);

	return (
		<div ref={containerRef} className="stod">
			{/* Spreadsheet — left, the source */}
			<div className="stod-panel stod-sheet">
				<div className="stod-sheet__head">
					<span className="stod-file">Forecast.xlsx</span>
					<span className="stod-note">last edited: stale copy</span>
				</div>
				<table className="stod-table">
					<thead>
						<tr>
							<th>Month</th>
							<th>Revenue</th>
							<th>COGS</th>
							<th>Margin</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<tr key={i}>
								<td className="stod-day">{r.m}</td>
								<td className="stod-src" data-src={i}>
									${r.revenue.toFixed(2)}M
								</td>
								<td>${r.cogs.toFixed(2)}M</td>
								<td className="stod-hours">{r.margin}%</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Dashboard — right, the destination */}
			<div className="stod-panel stod-dash">
				<div className="stod-ptitle">
					<span>Revenue</span>
					<span className="stod-menu" aria-hidden="true">
						•••
					</span>
				</div>
				<div className="stod-bars">
					{rows.map((r, i) => (
						<div className={'stod-bar' + (i === activeIdx ? ' stod-bar--active' : '')} key={i}>
							<div className="stod-bar__tip">{i === activeIdx ? '▲ 8.5% MoM' : ' '}</div>
							<div className="stod-bar__val" data-kpi={i}>
								$0.00M
							</div>
							<div className="stod-bar__track">
								<div className="stod-bar__fill" data-bar={i} />
							</div>
							<div className="stod-bar__label">{r.m}</div>
						</div>
					))}
				</div>
				<div className="stod-chat" aria-hidden="true">
					<span className="stod-chat__spark">✦</span>
					Ask about this data
					<span className="stod-chat__chip">/revenue</span>
				</div>
			</div>

			<canvas ref={canvasRef} className="stod-canvas" aria-hidden="true" />
		</div>
	);
}
