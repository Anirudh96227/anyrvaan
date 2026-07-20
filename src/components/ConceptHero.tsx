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
	const [selectedEraIndex, setSelectedEraIndex] = useState<number>(0);
	const [activeLabel, setActiveLabel] = useState<string>('');
	const [timecode, setTimecode] = useState<string>('00:00:00:00');
	const [isCinematic, setIsCinematic] = useState<boolean>(false);
	const [isTheater, setIsTheater] = useState<boolean>(false);
	const [isPaused, setIsPaused] = useState<boolean>(false);
	const [degaussFlash, setDegaussFlash] = useState<number>(0);
	const [enableLoupe, setEnableLoupe] = useState<boolean>(true);

	// Interactive Minesweeper state inside Win95 canvas
	const [minesGrid, setMinesGrid] = useState<Array<{ clicked: boolean; mine: boolean; count: number }>>(() =>
		Array.from({ length: 9 }, (_, i) => ({
			clicked: false,
			mine: i === 4 || i === 7,
			count: i === 4 || i === 7 ? 9 : (i % 2 === 0 ? 1 : 2),
		}))
	);

	const timeOffsetRef = useRef<number>(0);
	const isDraggingRef = useRef<boolean>(false);
	const lastXRef = useRef<number>(0);
	const selectedEraRef = useRef<number>(selectedEraIndex);
	selectedEraRef.current = selectedEraIndex;

	const eras = [
		{ name: '1982 — COMMODORE 64', label: 'C64 BASIC' },
		{ name: '1984 — MACINTOSH 128K', label: 'MAC OS 1' },
		{ name: '1995 — WINDOWS 95', label: 'WIN 95' },
		{ name: '1999 — WINAMP 2.0', label: 'WINAMP' },
		{ name: '2007 — FIRST iPHONE', label: 'iPHONE' },
	];

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

	const triggerDegauss = () => {
		setDegaussFlash(1);
		setTimeout(() => setDegaussFlash(0), 400);
	};

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
		let isMouseOver = false;

		const onPointerDown = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			const px = e.clientX - rect.left;
			const py = e.clientY - rect.top;

			// Check interactive Minesweeper clicks when Win95 era is active
			if (preset === 'retro' && (selectedEraRef.current === 2 || selectedEraRef.current === 0)) {
				const mX = w * 0.32;
				const mY = h * 0.22;
				const gridX = mX + 24;
				const gridY = mY + 60;
				const cellSize = 28;

				if (px >= gridX && px <= gridX + cellSize * 3 && py >= gridY && py <= gridY + cellSize * 3) {
					const col = Math.floor((px - gridX) / cellSize);
					const row = Math.floor((py - gridY) / cellSize);
					const idx = row * 3 + col;
					if (idx >= 0 && idx < 9) {
						setMinesGrid((prev) =>
							prev.map((cell, i) => (i === idx ? { ...cell, clicked: true } : cell))
						);
						triggerDegauss();
						return;
					}
				}
			}

			isDraggingRef.current = true;
			lastXRef.current = e.clientX;
		};

		const onPointerMove = (e: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;
			isMouseOver = true;

			if (isDraggingRef.current) {
				const dx = e.clientX - lastXRef.current;
				timeOffsetRef.current += dx * 40;
				lastXRef.current = e.clientX;
			}
		};

		const onPointerLeave = () => {
			isMouseOver = false;
			isDraggingRef.current = false;
		};

		const onPointerUp = () => {
			isDraggingRef.current = false;
		};

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('pointerleave', onPointerLeave);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		let animId = 0;
		let lastFrameTime = performance.now();
		let accumulatedTime = 0;

		// -------------------------------------------------------------------------
		// PRESET 1: RETRO COMPUTING — Interactive morph across 5 eras
		// -------------------------------------------------------------------------
		const drawRetro = (t: number) => {
			ctx.fillStyle = '#06080e';
			ctx.fillRect(0, 0, w, h);

			const currentEra = selectedEraRef.current;
			setActiveLabel(eras[currentEra]?.name || eras[0].name);

			// Dynamic CRT scanline sweep
			ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
			const scanOffset = (t * 0.04) % 4;
			for (let y = scanOffset; y < h; y += 4) {
				ctx.fillRect(0, y, w, 1);
			}

			if (currentEra === 0) {
				// C64 BASIC (1982)
				ctx.fillStyle = '#3a3ab0';
				ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
				ctx.fillStyle = '#a0a0ff';
				ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);

				ctx.fillStyle = '#3a3ab0';
				ctx.font = 'bold 14px monospace';
				ctx.fillText('**** COMMODORE 64 BASIC V2 ****', w * 0.19, h * 0.28);
				ctx.fillText('64K RAM SYSTEM  38911 BASIC BYTES FREE', w * 0.19, h * 0.35);
				ctx.fillText('READY.', w * 0.19, h * 0.44);

				// Interactive typing command
				const chars = "LOAD '*',8,1";
				const count = Math.min(chars.length, Math.floor((t * 0.005) % 18));
				ctx.fillText(chars.slice(0, count), w * 0.19, h * 0.52);

				if (Math.sin(t * 0.008) > 0) {
					ctx.fillRect(w * 0.19 + count * 8.5, h * 0.48, 10, 14);
				}
			} else if (currentEra === 1) {
				// Macintosh System 1 (1984)
				ctx.fillStyle = '#d4d8de';
				ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
				ctx.strokeStyle = '#101418';
				ctx.lineWidth = 2;
				ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);

				// Top Menu bar
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, 26);
				ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, 26);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('  File  Edit  View  Special', w * 0.15, h * 0.12 + 18);

				// Macintosh Window
				const winW = w * 0.48;
				const winH = h * 0.42;
				const wx = w * 0.22 + Math.sin(t * 0.001) * 10;
				const wy = h * 0.28;
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(wx, wy, winW, winH);
				ctx.strokeRect(wx, wy, winW, winH);
				ctx.fillStyle = '#000000';
				ctx.fillRect(wx, wy, winW, 20);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('System Folder (1-bit)', wx + 20, wy + 14);

				// Folder icons inside Mac Window
				for (let fi = 0; fi < 3; fi++) {
					ctx.fillStyle = '#000000';
					ctx.fillRect(wx + 30 + fi * 60, wy + 38, 32, 24);
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(wx + 32 + fi * 60, wy + 40, 28, 20);
				}
			} else if (currentEra === 2) {
				// Windows 95 (1995) + Interactive Minesweeper
				ctx.fillStyle = '#008080';
				ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

				// Taskbar
				const tbY = h * 0.9 - 28;
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(w * 0.1, tbY, w * 0.8, 28);
				ctx.strokeStyle = '#ffffff';
				ctx.strokeRect(w * 0.1, tbY, w * 0.8, 28);

				// Start button
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(w * 0.11, tbY + 3, 75, 22);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Start', w * 0.11 + 24, tbY + 18);

				// Minesweeper window
				const mX = w * 0.32;
				const mY = h * 0.22;
				const mW = w * 0.36;
				const mH = h * 0.52;
				ctx.fillStyle = '#c0c0c0';
				ctx.fillRect(mX, mY, mW, mH);
				ctx.strokeStyle = '#808080';
				ctx.strokeRect(mX, mY, mW, mH);

				// Title bar
				ctx.fillStyle = '#000080';
				ctx.fillRect(mX + 3, mY + 3, mW - 6, 22);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Minesweeper — Click Cells!', mX + 10, mY + 18);

				// Minesweeper grid (3x3 interactive)
				const gridX = mX + 24;
				const gridY = mY + 60;
				const cellSize = 28;
				minesGrid.forEach((cell, idx) => {
					const r = Math.floor(idx / 3);
					const c = idx % 3;
					const cx = gridX + c * cellSize;
					const cy = gridY + r * cellSize;

					ctx.fillStyle = cell.clicked ? '#e0e0e0' : '#c0c0c0';
					ctx.fillRect(cx, cy, cellSize - 2, cellSize - 2);
					ctx.strokeStyle = cell.clicked ? '#808080' : '#ffffff';
					ctx.strokeRect(cx, cy, cellSize - 2, cellSize - 2);

					if (cell.clicked) {
						ctx.fillStyle = cell.mine ? '#ef4444' : '#0000ff';
						ctx.font = 'bold 14px monospace';
						ctx.fillText(cell.mine ? '💣' : String(cell.count), cx + 7, cy + 19);
					}
				});
			} else if (currentEra === 3) {
				// Winamp 2.0 (1999)
				ctx.fillStyle = '#12151e';
				ctx.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64);
				ctx.strokeStyle = '#353e50';
				ctx.strokeRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64);

				// Glowing LED Display
				ctx.fillStyle = '#000000';
				ctx.fillRect(w * 0.22, h * 0.24, w * 0.56, 32);
				ctx.fillStyle = '#00ff66';
				ctx.font = 'bold 12px monospace';
				ctx.fillText('WINAMP - 01. ANYRVAAN AUDIO SYSTEM (1999)', w * 0.24, h * 0.24 + 20);

				// Spectrum visualizer bars
				const bars = 20;
				const barW = (w * 0.52) / bars;
				for (let i = 0; i < bars; i++) {
					const bh = (Math.sin(t * 0.006 + i * 0.35) * 0.45 + 0.55) * (h * 0.32);
					const colorGrad = ctx.createLinearGradient(0, h * 0.7, 0, h * 0.38);
					colorGrad.addColorStop(0, '#3b82f6');
					colorGrad.addColorStop(0.5, '#60a5fa');
					colorGrad.addColorStop(1, '#00ff66');
					ctx.fillStyle = colorGrad;
					ctx.fillRect(w * 0.22 + i * (barW + 2), h * 0.7 - bh, barW - 2, bh);
				}
			} else {
				// iPhone 1st Gen (2007)
				const phoneW = w * 0.34;
				const phoneH = h * 0.75;
				const px = (w - phoneW) / 2;
				const py = (h - phoneH) / 2;

				ctx.fillStyle = '#1c1c1e';
				ctx.fillRect(px, py, phoneW, phoneH);
				ctx.strokeStyle = '#48484a';
				ctx.strokeRect(px, py, phoneW, phoneH);

				// Screen Glossy App Grid
				ctx.fillStyle = '#000000';
				ctx.fillRect(px + 10, py + 24, phoneW - 20, phoneH - 48);

				const icons = ['📱', '✉️', '📷', '🎵', '🌐', '⚙️', '📅', '💡'];
				icons.forEach((ic, i) => {
					const r = Math.floor(i / 4);
					const c = i % 4;
					const ix = px + 24 + c * (phoneW * 0.2);
					const iy = py + 50 + r * 50;

					ctx.fillStyle = 'rgba(255,255,255,0.1)';
					ctx.fillRect(ix, iy, 32, 32);
					ctx.font = '16px sans-serif';
					ctx.fillText(ic, ix + 7, iy + 22);
				});

				// Slide to Unlock
				const slideX = px + 20 + (Math.sin(t * 0.003) * 0.5 + 0.5) * (phoneW - 100);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
				ctx.fillRect(px + 20, py + phoneH - 55, phoneW - 40, 24);
				ctx.fillStyle = '#ffffff';
				ctx.font = '11px sans-serif';
				ctx.fillText('slide to unlock >', slideX, py + phoneH - 39);
			}

			// Pixel Magnifier Loupe on Mouse Hover
			if (enableLoupe && isMouseOver) {
				const loupeRadius = 45;
				ctx.save();
				ctx.beginPath();
				ctx.arc(mouseX, mouseY, loupeRadius, 0, Math.PI * 2);
				ctx.clip();

				// Zoomed 2.5x rendering
				ctx.fillStyle = '#000000';
				ctx.fillRect(mouseX - loupeRadius, mouseY - loupeRadius, loupeRadius * 2, loupeRadius * 2);
				ctx.drawImage(
					canvas,
					(mouseX - 20) * dpr,
					(mouseY - 20) * dpr,
					40 * dpr,
					40 * dpr,
					mouseX - loupeRadius,
					mouseY - loupeRadius,
					loupeRadius * 2,
					loupeRadius * 2
				);

				// Pixel Grid lines over Loupe
				ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
				ctx.lineWidth = 1;
				ctx.stroke();

				ctx.restore();

				// Loupe border ring
				ctx.strokeStyle = '#60a5fa';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(mouseX, mouseY, loupeRadius, 0, Math.PI * 2);
				ctx.stroke();

				ctx.fillStyle = '#60a5fa';
				ctx.font = 'bold 9px monospace';
				ctx.fillText('2.5x LOUPE', mouseX - 22, mouseY + loupeRadius + 14);
			}

			// Degauss glitch flash effect
			if (degaussFlash > 0) {
				ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
				ctx.fillRect(0, 0, w, h);
			}
		};

		const render = (now: number) => {
			const delta = now - lastFrameTime;
			lastFrameTime = now;

			if (!isPaused && !reduceMotion) {
				accumulatedTime += delta;
			}
			const totalTime = accumulatedTime + timeOffsetRef.current;

			// Update live film timecode string (HH:MM:SS:FF)
			const secTotal = Math.floor(totalTime / 1000);
			const framesCount = Math.floor((totalTime % 1000) / (1000 / 24));
			const ss = String(secTotal % 60).padStart(2, '0');
			const mm = String(Math.floor(secTotal / 60) % 60).padStart(2, '0');
			const hh = String(Math.floor(secTotal / 3600)).padStart(2, '0');
			const ff = String(framesCount).padStart(2, '0');
			setTimecode(`${hh}:${mm}:${ss}:${ff}`);

			drawRetro(totalTime);

			if (!reduceMotion) {
				animId = requestAnimationFrame(render);
			}
		};

		animId = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', resize);
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointerleave', onPointerLeave);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}, [preset, isPaused, enableLoupe, degaussFlash, minesGrid]);

	return (
		<div className="mx-auto max-w-4xl px-6 pb-12">
			{/* Interactive Era Selector Dial / Tabs */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
				<div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
					{eras.map((era, idx) => (
						<button
							key={era.name}
							type="button"
							onClick={() => {
								setSelectedEraIndex(idx);
								triggerDegauss();
							}}
							className={`rounded-full px-3 py-1 text-xs font-mono transition-all duration-300 ${
								selectedEraIndex === idx
									? 'border border-blue-400 bg-blue-500/20 text-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.3)]'
									: 'border border-white/10 bg-black/40 text-neutral-400 hover:border-white/30 hover:text-white'
							}`}
						>
							{era.label}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={triggerDegauss}
					className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
				>
					⚡ Degauss Glitch
				</button>
			</div>

			<div className="glow-frame reveal rounded-2xl">
				<div
					className={`glow-frame__inner relative overflow-hidden border border-white/10 bg-neutral-950 transition-all duration-500 ${
						isCinematic ? 'aspect-[2.39/1]' : 'aspect-video'
					}`}
				>
					<canvas ref={canvasRef} className="h-full w-full block cursor-crosshair" />

					{/* Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
							{activeLabel || title || 'LIVE RETRO ENGINE'}
						</span>
					</div>

					{/* Viewfinder Timecode */}
					<div className="pointer-events-none absolute top-4 right-4 flex items-center gap-4 text-xs font-mono text-neutral-400">
						<span className="hidden sm:inline opacity-70">24 FPS • CRT SCAN</span>
						<span className="text-blue-400 tabular-nums font-bold tracking-widest">{timecode}</span>
					</div>

					{/* Interactive Loupe Toggle Badge */}
					<button
						type="button"
						onClick={() => setEnableLoupe(!enableLoupe)}
						className={`absolute top-4 left-4 rounded-full border px-3 py-1 text-[11px] font-mono transition-colors backdrop-blur-md ${
							enableLoupe
								? 'border-blue-400/40 bg-blue-500/20 text-blue-300'
								: 'border-white/10 bg-black/50 text-neutral-400 hover:text-white'
						}`}
					>
						🔍 Pixel Loupe {enableLoupe ? 'ON' : 'OFF'}
					</button>

					{/* Interactive Controls Toolbar */}
					<div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 p-1.5 backdrop-blur-md">
						<button
							type="button"
							onClick={() => setIsPaused(!isPaused)}
							className="rounded-full px-2.5 py-1 text-[11px] font-mono text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
						>
							{isPaused ? '▶ Play' : '⏸ Pause'}
						</button>
						<button
							type="button"
							onClick={() => setIsCinematic(!isCinematic)}
							className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${
								isCinematic ? 'bg-blue-500/30 text-blue-300' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
							}`}
						>
							{isCinematic ? '2.39:1 Cinema' : '16:9'}
						</button>
						<button
							type="button"
							onClick={() => setIsTheater(!isTheater)}
							className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${
								isTheater ? 'bg-amber-500/30 text-amber-300' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
							}`}
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
