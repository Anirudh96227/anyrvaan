import { useEffect, useRef, useState } from 'react';

export type ConceptPreset =
	| 'retro'
	| 'ui-replicas'
	| 'dashboard'
	| 'effects'
	| 'spiritual'
	| 'anti-ui';

interface ConceptHeroProps {
	preset: ConceptPreset;
	title?: string;
	subtitle?: string;
}

export default function ConceptHero({ preset, title, subtitle }: ConceptHeroProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [activeLabel, setActiveLabel] = useState<string>('');
	const [timecode, setTimecode] = useState<string>('00:00:00:00');
	const [isCinematic, setIsCinematic] = useState<boolean>(false); // 2.39:1 Anamorphic mode toggle
	const [isTheater, setIsTheater] = useState<boolean>(false); // Dim page background toggle
	const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
	const [isPaused, setIsPaused] = useState<boolean>(false);

	const timeOffsetRef = useRef<number>(0);
	const isDraggingRef = useRef<boolean>(false);
	const lastXRef = useRef<number>(0);

	// Theater mode effect: toggles dark backdrop on body
	useEffect(() => {
		if (isTheater) {
			document.documentElement.classList.add('theater-mode');
		} else {
			document.documentElement.classList.remove('theater-mode');
		}
		return () => {
			document.documentElement.classList.remove('theater-mode');
		};
	}, [isTheater]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		let w = 0;
		let h = 0;

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			w = rect.width;
			h = rect.height;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		window.addEventListener('resize', resize);

		let mouseX = w / 2;
		let mouseY = h / 2;

		const onPointerDown = (e: PointerEvent) => {
			isDraggingRef.current = true;
			lastXRef.current = e.clientX;
		};

		const onPointerMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;

			if (isDraggingRef.current) {
				const dx = e.clientX - lastXRef.current;
				timeOffsetRef.current += dx * 30; // Interactive timeline scrubbing
				lastXRef.current = e.clientX;
			}
		};

		const onPointerUp = () => {
			isDraggingRef.current = false;
		};

		canvas.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		let animId = 0;
		let lastFrameTime = performance.now();
		let accumulatedTime = 0;

		// -------------------------------------------------------------------------
		// PRESET 1: RETRO COMPUTING — Looping morph across C64, Mac, Win95, Winamp
		// -------------------------------------------------------------------------
		const drawRetro = (t: number) => {
			ctx.fillStyle = '#05070a';
			ctx.fillRect(0, 0, w, h);

			const phase = Math.abs((t * 0.00035) % 4); // 4 eras
			const eraIndex = Math.floor(phase);

			const eras = ['1982 — COMMODORE 64', '1984 — MACINTOSH 128K', '1995 — WINDOWS 95', '1999 — WINAMP 2.0'];
			setActiveLabel(eras[eraIndex] || eras[0]);

			// Ambient CRT scanlines
			ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
			for (let y = 0; y < h; y += 4) {
				ctx.fillRect(0, y, w, 1);
			}

			if (eraIndex === 0) {
				// C64 BASIC cold boot
				ctx.fillStyle = '#3c3cb8';
				ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
				ctx.fillStyle = '#a0a0ff';
				ctx.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64);

				ctx.fillStyle = '#3c3cb8';
				ctx.font = 'bold 13px monospace';
				ctx.fillText('*** COMMODORE 64 BASIC V2 ***', w * 0.22, h * 0.32);
				ctx.fillText('64K RAM SYSTEM  38911 BASIC BYTES FREE', w * 0.22, h * 0.38);
				ctx.fillText('READY.', w * 0.22, h * 0.46);

				if (Math.sin(t * 0.008) > 0) {
					ctx.fillRect(w * 0.22 + 60, h * 0.43, 10, 14);
				}
			} else if (eraIndex === 1) {
				// Macintosh System 1 (1984)
				ctx.fillStyle = '#d8dce2';
				ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
				ctx.strokeStyle = '#101418';
				ctx.lineWidth = 2;
				ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);

				// Menu bar
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, 24);
				ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, 24);
				ctx.fillStyle = '#000000';
				ctx.font = '12px sans-serif';
				ctx.fillText('  File  Edit  View  Special', w * 0.18, h * 0.15 + 16);

				// Mac Window
				const winW = w * 0.45;
				const winH = h * 0.4;
				const wx = w * 0.25;
				const wy = h * 0.32;
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(wx, wy, winW, winH);
				ctx.strokeRect(wx, wy, winW, winH);
				ctx.fillStyle = '#000000';
				ctx.fillRect(wx, wy, winW, 18);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('System Folder', wx + 24, wy + 14);
			} else if (eraIndex === 2) {
				// Windows 95
				ctx.fillStyle = '#008080'; // Teal desktop
				ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);

				// Taskbar
				const tbY = h * 0.88 - 28;
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(w * 0.12, tbY, w * 0.76, 28);
				ctx.strokeStyle = '#ffffff';
				ctx.strokeRect(w * 0.12, tbY, w * 0.76, 28);

				// Start button
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(w * 0.13, tbY + 3, 70, 22);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Start', w * 0.13 + 24, tbY + 18);

				// Minesweeper window
				const mX = w * 0.32;
				const mY = h * 0.22;
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(mX, mY, w * 0.36, h * 0.48);
				ctx.strokeStyle = '#808080';
				ctx.strokeRect(mX, mY, w * 0.36, h * 0.48);

				// Title bar
				ctx.fillStyle = '#000080';
				ctx.fillRect(mX + 3, mY + 3, w * 0.36 - 6, 20);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Minesweeper', mX + 10, mY + 17);
			} else {
				// Winamp 2.0
				ctx.fillStyle = '#141720';
				ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
				ctx.strokeStyle = '#3a4252';
				ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);

				// Equalizer bars
				const bars = 18;
				const barW = (w * 0.5) / bars;
				for (let i = 0; i < bars; i++) {
					const bh = (Math.sin(t * 0.005 + i * 0.4) * 0.4 + 0.5) * (h * 0.35);
					ctx.fillStyle = 'rgb(96, 165, 250)';
					ctx.fillRect(w * 0.24 + i * (barW + 2), h * 0.65 - bh, barW - 2, bh);
				}

				ctx.fillStyle = '#00ff66';
				ctx.font = '12px monospace';
				ctx.fillText('WINAMP - 01. ANYRVAAN AUDIO SYSTEM', w * 0.24, h * 0.28);
			}
		};

		// -------------------------------------------------------------------------
		// PRESET 2: UI REPLICAS — Hand-built UI with simulated mouse motion
		// -------------------------------------------------------------------------
		const drawUIReplicas = (t: number) => {
			ctx.fillStyle = '#0a0d14';
			ctx.fillRect(0, 0, w, h);
			setActiveLabel('PIXEL-PERFECT UI REPLICATION');

			const appX = w * 0.1;
			const appY = h * 0.1;
			const appW = w * 0.8;
			const appH = h * 0.8;

			ctx.fillStyle = '#121622';
			ctx.fillRect(appX, appY, appW, appH);
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
			ctx.strokeRect(appX, appY, appW, appH);

			// Sidebar
			ctx.fillStyle = '#0b0e17';
			ctx.fillRect(appX, appY, appW * 0.26, appH);

			ctx.fillStyle = 'rgba(255,255,255,0.7)';
			ctx.font = 'bold 12px sans-serif';
			ctx.fillText('Anyrvaan Studio', appX + 16, appY + 28);

			const channels = ['# general', '# motion-design', '# code-experiments', '# showcase'];
			channels.forEach((ch, idx) => {
				ctx.fillStyle = idx === 1 ? 'rgba(96, 165, 250, 0.2)' : 'transparent';
				ctx.fillRect(appX + 8, appY + 54 + idx * 28, appW * 0.23, 22);
				ctx.fillStyle = idx === 1 ? '#60a5fa' : 'rgba(255,255,255,0.5)';
				ctx.font = '12px sans-serif';
				ctx.fillText(ch, appX + 16, appY + 70 + idx * 28);
			});

			const mainX = appX + appW * 0.26 + 20;
			ctx.fillStyle = '#ffffff';
			ctx.font = '13px sans-serif';
			ctx.fillText('rebuilt-component.tsx', mainX, appY + 28);

			const codeLines = [
				'const button = createHandCraftedUI();',
				'button.onHover(() => ripple({ color: "#60a5fa" }));',
				'// Every pixel placed by hand',
				'return <AppInterface precision="pixel" />;',
			];

			codeLines.forEach((line, idx) => {
				ctx.fillStyle = line.startsWith('//') ? 'rgba(255,255,255,0.35)' : 'rgba(245,248,255,0.85)';
				ctx.font = '12px monospace';
				ctx.fillText(line, mainX, appY + 70 + idx * 26);
			});

			// Simulated Mouse Cursor movement
			const mx = mainX + Math.sin(t * 0.002) * 110 + 90;
			const my = appY + 110 + Math.cos(t * 0.003) * 35;

			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.moveTo(mx, my);
			ctx.lineTo(mx + 11, my + 13);
			ctx.lineTo(mx + 5, my + 13);
			ctx.lineTo(mx, my + 18);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = '#000000';
			ctx.stroke();
		};

		// -------------------------------------------------------------------------
		// PRESET 3: DASHBOARD CINEMA — Live status incident recovery
		// -------------------------------------------------------------------------
		const drawDashboard = (t: number) => {
			ctx.fillStyle = '#05070a';
			ctx.fillRect(0, 0, w, h);

			const p = Math.abs((t * 0.0004) % 1);
			const isIncident = p > 0.3 && p < 0.7;
			setActiveLabel(isIncident ? 'STATUS: INCIDENT RECOVERY' : 'STATUS: ALL SYSTEMS OPTIMAL');

			ctx.strokeStyle = 'rgba(255,255,255,0.03)';
			for (let x = 0; x < w; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
				ctx.stroke();
			}

			const cx = w * 0.15;
			const cy = h * 0.2;
			const cw = w * 0.7;
			const ch = h * 0.6;

			ctx.fillStyle = '#0b0e16';
			ctx.fillRect(cx, cy, cw, ch);
			ctx.strokeStyle = isIncident ? 'rgba(239, 68, 68, 0.4)' : 'rgba(96, 165, 250, 0.2)';
			ctx.strokeRect(cx, cy, cw, ch);

			ctx.fillStyle = isIncident ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)';
			ctx.fillRect(cx, cy, cw, 34);
			ctx.fillStyle = isIncident ? '#ef4444' : '#22c55e';
			ctx.font = 'bold 12px sans-serif';
			ctx.fillText(isIncident ? '● ALERT: SYSTEM LATENCY SPIKE' : '● ALL SYSTEMS HEALTHY', cx + 16, cy + 22);

			ctx.beginPath();
			ctx.lineWidth = 2.5;
			ctx.strokeStyle = isIncident ? '#ef4444' : '#60a5fa';
			const points = 30;
			const step = cw / points;

			for (let i = 0; i <= points; i++) {
				const px = cx + i * step;
				let py = cy + ch * 0.6;
				if (isIncident && i > 12 && i < 22) {
					py -= Math.sin((i - 12) * 0.3) * (ch * 0.4);
				}
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.stroke();
		};

		// -------------------------------------------------------------------------
		// PRESET 4 & DEFAULT: EFFECTS INDEX / SPIRITUAL / ANTI-UI
		// -------------------------------------------------------------------------
		const drawEffects = (t: number) => {
			ctx.fillStyle = '#06080e';
			ctx.fillRect(0, 0, w, h);
			setActiveLabel('MICRO-ANIMATION MATRIX');

			const cols = 8;
			const rows = 4;
			const cellW = w / cols;
			const cellH = h / rows;

			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const x = c * cellW + cellW / 2;
					const y = r * cellH + cellH / 2;

					const dist = Math.hypot(mouseX - x, mouseY - y);
					const wave = Math.sin(t * 0.003 - (c + r) * 0.4);
					const size = Math.max(2, 6 + wave * 4 + (dist < 100 ? (100 - dist) * 0.1 : 0));

					ctx.fillStyle = dist < 100 ? '#60a5fa' : 'rgba(255, 255, 255, 0.25)';
					ctx.beginPath();
					ctx.arc(x, y, size, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		};

		const render = (now: number) => {
			const delta = now - lastFrameTime;
			lastFrameTime = now;

			if (!isPaused && !reduceMotion) {
				accumulatedTime += delta * speedMultiplier;
			}
			const totalTime = accumulatedTime + timeOffsetRef.current;

			// Update live film timecode string (HH:MM:SS:FF)
			const secTotal = Math.floor(totalTime / 1000);
			const frames = Math.floor((totalTime % 1000) / (1000 / 24));
			const ss = String(secTotal % 60).padStart(2, '0');
			const mm = String(Math.floor(secTotal / 60) % 60).padStart(2, '0');
			const hh = String(Math.floor(secTotal / 3600)).padStart(2, '0');
			const ff = String(frames).padStart(2, '0');
			setTimecode(`${hh}:${mm}:${ss}:${ff}`);

			switch (preset) {
				case 'retro':
					drawRetro(totalTime);
					break;
				case 'ui-replicas':
					drawUIReplicas(totalTime);
					break;
				case 'dashboard':
					drawDashboard(totalTime);
					break;
				case 'effects':
				case 'spiritual':
				case 'anti-ui':
				default:
					drawEffects(totalTime);
					break;
			}

			// Render subtle film grain sheen
			ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
			for (let i = 0; i < 20; i++) {
				ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
			}

			if (!reduceMotion) {
				animId = requestAnimationFrame(render);
			}
		};

		animId = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', resize);
			canvas.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}, [preset, isPaused, speedMultiplier]);

	return (
		<div className="mx-auto max-w-4xl px-6 pb-12">
			<div className="glow-frame reveal rounded-2xl">
				<div
					className={`glow-frame__inner relative overflow-hidden border border-white/10 bg-neutral-950 transition-all duration-500 ${
						isCinematic ? 'aspect-[2.39/1]' : 'aspect-video'
					}`}
				>
					<canvas ref={canvasRef} className="h-full w-full block cursor-ew-resize" />

					{/* Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
							{activeLabel || title || 'LIVE CONCEPT HERO'}
						</span>
					</div>

					{/* Film Viewfinder HUD / Timecode */}
					<div className="pointer-events-none absolute top-4 right-4 flex items-center gap-4 text-xs font-mono text-neutral-400">
						<span className="hidden sm:inline opacity-70">24 FPS • 4K</span>
						<span className="text-blue-400 tabular-nums font-bold tracking-widest">{timecode}</span>
					</div>

					{/* Drag-to-scrub hint */}
					<div className="pointer-events-none absolute top-4 left-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest opacity-80">
						Drag to scrub timeline
					</div>

					{/* Interactive Cinema Control Toolbar */}
					<div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 p-1.5 backdrop-blur-md">
						<button
							type="button"
							onClick={() => setIsPaused(!isPaused)}
							className="rounded-full px-2.5 py-1 text-[11px] font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
							aria-label="Toggle pause"
						>
							{isPaused ? '▶ Play' : '⏸ Pause'}
						</button>
						<button
							type="button"
							onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
							className="rounded-full px-2.5 py-1 text-[11px] font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
							aria-label="Toggle speed"
						>
							{speedMultiplier}x
						</button>
						<button
							type="button"
							onClick={() => setIsCinematic(!isCinematic)}
							className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${
								isCinematic ? 'bg-blue-500/30 text-blue-300' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
							}`}
							aria-label="Toggle 2.39:1 Cinema mode"
						>
							{isCinematic ? '2.39:1 Cinema' : '16:9'}
						</button>
						<button
							type="button"
							onClick={() => setIsTheater(!isTheater)}
							className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${
								isTheater ? 'bg-amber-500/30 text-amber-300' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
							}`}
							aria-label="Toggle Theater mode"
						>
							{isTheater ? 'Theater ON' : 'Theater'}
						</button>
					</div>
				</div>
			</div>
			{subtitle && (
				<p className="mt-3 text-center text-xs tracking-widest uppercase text-neutral-400">
					{subtitle}
				</p>
			)}
		</div>
	);
}
