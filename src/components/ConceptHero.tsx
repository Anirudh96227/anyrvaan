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
		{ name: '1982 — COMMODORE 64', label: 'C64 BASIC (1982)' },
		{ name: '1984 — MACINTOSH 128K', label: 'MAC SYSTEM 1 (1984)' },
		{ name: '1985 — MS-DOS 3.3', label: 'MS-DOS (1985)' },
		{ name: '1995 — WINDOWS 95', label: 'WINDOWS 95 (1995)' },
		{ name: '1996 — GEOCITIES WEB', label: 'GEOCITIES (1996)' },
		{ name: '1999 — WINAMP 2.80', label: 'WINAMP 2.0 (1999)' },
		{ name: '2004 — iPod CLICK WHEEL', label: 'iPOD (2004)' },
		{ name: '2006 — BLACKBERRY CURVE', label: 'BLACKBERRY (2006)' },
		{ name: '2007 — FIRST iPHONE', label: 'FIRST iPHONE (2007)' },
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
		document.documentElement.classList.remove('degauss-active');
		void document.documentElement.offsetWidth;
		document.documentElement.classList.add('degauss-active');

		setTimeout(() => {
			setDegaussFlash(0);
			document.documentElement.classList.remove('degauss-active');
		}, 450);
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

			// Check interactive Minesweeper clicks when Win95 era is active (index 3)
			if (preset === 'retro' && selectedEraRef.current === 3) {
				const mX = w * 0.32;
				const mY = h * 0.22;
				const gridX = mX + 24;
				const gridY = mY + 68;
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

		// Helper: 3D Bevel Box (used in Win95 and classic GUIs)
		const drawBevelBox = (
			x: number,
			y: number,
			bw: number,
			bh: number,
			inset: boolean = false,
			bg: string = '#c0c0c0'
		) => {
			ctx.fillStyle = bg;
			ctx.fillRect(x, y, bw, bh);

			const light = inset ? '#808080' : '#ffffff';
			const dark = inset ? '#ffffff' : '#808080';

			ctx.fillStyle = light;
			ctx.fillRect(x, y, bw, 2);
			ctx.fillRect(x, y, 2, bh);

			ctx.fillStyle = dark;
			ctx.fillRect(x + bw - 2, y, 2, bh);
			ctx.fillRect(x, y + bh - 2, bw, 2);
		};

		// -------------------------------------------------------------------------
		// PRESET 1: RETRO COMPUTING — Ultra-Realistic Simulation across ALL 9 Eras
		// -------------------------------------------------------------------------
		const drawRetro = (t: number) => {
			ctx.fillStyle = '#04060a';
			ctx.fillRect(0, 0, w, h);

			const currentEra = selectedEraRef.current;
			setActiveLabel(eras[currentEra]?.name || eras[0].name);

			// CRT Scanline Pattern
			ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
			const scanOffset = (t * 0.04) % 4;
			for (let y = scanOffset; y < h; y += 4) {
				ctx.fillRect(0, y, w, 1);
			}

			if (currentEra === 0) {
				// 1. COMMODORE 64 (1982) - Authentic VIC-II Colors & PETSCII Font
				const frameMarginX = w * 0.1;
				const frameMarginY = h * 0.1;
				ctx.fillStyle = '#403285'; // C64 Outer Border
				ctx.fillRect(frameMarginX, frameMarginY, w * 0.8, h * 0.8);

				const screenX = w * 0.15;
				const screenY = h * 0.15;
				const screenW = w * 0.7;
				const screenH = h * 0.7;
				ctx.fillStyle = '#7b68ee'; // C64 Inner Canvas
				ctx.fillRect(screenX, screenY, screenW, screenH);

				ctx.fillStyle = '#a597ee'; // C64 Light Blue Text
				ctx.font = 'bold 13px monospace';
				ctx.fillText('**** COMMODORE 64 BASIC V2 ****', screenX + 30, screenY + 40);
				ctx.fillText('64K RAM SYSTEM  38911 BASIC BYTES FREE', screenX + 30, screenY + 65);
				ctx.fillText('READY.', screenX + 30, screenY + 100);

				const cmdText = "LOAD \"*\",8,1";
				const step = Math.floor((t * 0.004) % 24);
				const typed = step < 12 ? cmdText.slice(0, step) : cmdText;
				ctx.fillText(typed, screenX + 30, screenY + 130);

				if (step >= 12 && step < 18) {
					ctx.fillText('SEARCHING FOR *', screenX + 30, screenY + 155);
					ctx.fillText('LOADING', screenX + 30, screenY + 180);
					ctx.fillText('READY.', screenX + 30, screenY + 205);
				}

				// Blinking C64 Cursor
				if (Math.sin(t * 0.008) > 0) {
					const curX = screenX + 30 + (step < 12 ? typed.length * 8 : 0);
					const curY = step < 12 ? screenY + 118 : screenY + 210;
					ctx.fillRect(curX, curY, 10, 14);
				}
			} else if (currentEra === 1) {
				// 2. MACINTOSH SYSTEM 1 (1984) - 1-Bit Dithered Desktop & Pixel Windows
				const bgX = w * 0.1;
				const bgY = h * 0.1;
				const bgW = w * 0.8;
				const bgH = h * 0.8;

				ctx.fillStyle = '#e2e6eb';
				ctx.fillRect(bgX, bgY, bgW, bgH);

				// 1-bit Checkerboard Stipple Pattern
				ctx.fillStyle = 'rgba(0,0,0,0.08)';
				for (let py = bgY; py < bgY + bgH; py += 4) {
					for (let px = bgX + (py % 8 === 0 ? 0 : 2); px < bgX + bgW; px += 4) {
						ctx.fillRect(px, py, 2, 2);
					}
				}

				// Top Menu Bar
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(bgX, bgY, bgW, 26);
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = 1;
				ctx.strokeRect(bgX, bgY, bgW, 26);

				ctx.fillStyle = '#000000';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('  File  Edit  View  Special', bgX + 16, bgY + 18);

				// Mac HD Desktop Icon (Top Right)
				const hdX = bgX + bgW - 70;
				const hdY = bgY + 45;
				ctx.strokeRect(hdX, hdY, 36, 28);
				ctx.fillRect(hdX + 28, hdY + 10, 4, 8);
				ctx.font = '10px sans-serif';
				ctx.fillText('Macintosh HD', hdX - 12, hdY + 42);

				// Mac Window
				const winX = bgX + 40 + Math.sin(t * 0.001) * 6;
				const winY = bgY + 50;
				const winW = bgW - 140;
				const winH = bgH - 90;

				// Drop Shadow
				ctx.fillStyle = '#000000';
				ctx.fillRect(winX + 4, winY + 4, winW, winH);

				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX, winY, winW, winH);
				ctx.strokeRect(winX, winY, winW, winH);

				// Title bar with horizontal pinstripes
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX, winY, winW, 20);
				ctx.strokeRect(winX, winY, winW, 20);

				ctx.fillStyle = '#000000';
				for (let ly = winY + 4; ly < winY + 18; ly += 3) {
					ctx.fillRect(winX + 24, ly, winW - 32, 1);
				}
				// Close box
				ctx.strokeRect(winX + 6, winY + 4, 12, 12);
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX + 8, winY + 6, 8, 8);

				// Title Text
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX + winW / 2 - 45, winY + 3, 90, 14);
				ctx.fillStyle = '#000000';
				ctx.fillText('System Folder', winX + winW / 2 - 38, winY + 14);

				// File icons inside Mac window
				const items = ['Finder', 'System', 'Clipboard', 'Empty Folder'];
				items.forEach((item, idx) => {
					const ix = winX + 30 + (idx % 3) * 85;
					const iy = winY + 40 + Math.floor(idx / 3) * 65;
					ctx.strokeRect(ix, iy, 32, 26);
					ctx.fillRect(ix + 6, iy + 4, 20, 2);
					ctx.fillText(item, ix - 6, iy + 42);
				});
			} else if (currentEra === 2) {
				// 3. MS-DOS 3.3 (1985) - IBM PC Monospace Amber/Green VGA Terminal
				const dosX = w * 0.1;
				const dosY = h * 0.1;
				const dosW = w * 0.8;
				const dosH = h * 0.8;

				ctx.fillStyle = '#000000';
				ctx.fillRect(dosX, dosY, dosW, dosH);
				ctx.strokeStyle = '#1a331a';
				ctx.strokeRect(dosX, dosY, dosW, dosH);

				ctx.fillStyle = '#00ff66';
				ctx.font = '13px monospace';

				ctx.fillText('MS-DOS Version 3.30 (C)Copyright Microsoft Corp 1981-1987', dosX + 24, dosY + 35);
				ctx.fillText('C:\\> VER', dosX + 24, dosY + 65);
				ctx.fillText('C:\\> DIR /W', dosX + 24, dosY + 95);

				ctx.fillText(' Volume in drive C has no label', dosX + 24, dosY + 125);
				ctx.fillText(' Directory of C:\\', dosX + 24, dosY + 145);

				ctx.fillText('[COMMAND.COM]   [AUTOEXEC.BAT]   [CONFIG.SYS]', dosX + 24, dosY + 180);
				ctx.fillText('[DOOM.EXE]      [RETRO.BAT]      [GRAPHICS.DRV]', dosX + 24, dosY + 205);

				ctx.fillText('       14 File(s)    12485760 bytes free', dosX + 24, dosY + 240);

				ctx.fillText('C:\\> _', dosX + 24, dosY + 270);
				if (Math.sin(t * 0.01) > 0) {
					ctx.fillRect(dosX + 64, dosY + 258, 10, 14);
				}
			} else if (currentEra === 3) {
				// 4. WINDOWS 95 (1995) - 3D Inset Bevels & Playable Minesweeper
				const winX = w * 0.08;
				const winY = h * 0.08;
				const winW = w * 0.84;
				const winH = h * 0.84;

				// Teal Desktop
				ctx.fillStyle = '#008080';
				ctx.fillRect(winX, winY, winW, winH);

				// Desktop Icons (My Computer & Recycle Bin)
				drawBevelBox(winX + 20, winY + 25, 36, 32, false, '#c0c0c0');
				ctx.fillStyle = '#000080';
				ctx.fillRect(winX + 24, winY + 29, 28, 18);
				ctx.fillStyle = '#ffffff';
				ctx.font = '10px sans-serif';
				ctx.fillText('My Computer', winX + 10, winY + 70);

				// Taskbar
				const tbY = winY + winH - 32;
				drawBevelBox(winX, tbY, winW, 32, false, '#c0c0c0');

				// Start Button
				drawBevelBox(winX + 4, tbY + 4, 75, 24, false, '#c0c0c0');
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Start', winX + 28, tbY + 20);
				// Windows logo colors in start button
				ctx.fillStyle = '#ff0000';
				ctx.fillRect(winX + 12, tbY + 9, 5, 5);
				ctx.fillStyle = '#00ff00';
				ctx.fillRect(winX + 18, tbY + 9, 5, 5);

				// Minesweeper Window
				const mX = winX + winW * 0.28;
				const mY = winY + winH * 0.14;
				const mW = winW * 0.44;
				const mH = winH * 0.64;

				drawBevelBox(mX, mY, mW, mH, false, '#c0c0c0');

				// Title bar
				ctx.fillStyle = '#000080';
				ctx.fillRect(mX + 3, mY + 3, mW - 6, 22);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Minesweeper', mX + 10, mY + 18);

				// Minesweeper Scoreboard Header
				drawBevelBox(mX + 12, mY + 32, mW - 24, 34, true, '#c0c0c0');

				// LED Bomb Counter
				ctx.fillStyle = '#000000';
				ctx.fillRect(mX + 20, mY + 37, 42, 24);
				ctx.fillStyle = '#ff0000';
				ctx.font = 'bold 16px monospace';
				ctx.fillText('010', mX + 24, mY + 55);

				// Yellow Smiley Face Reset Button
				const smileyX = mX + mW / 2 - 12;
				drawBevelBox(smileyX, mY + 37, 24, 24, false, '#c0c0c0');
				ctx.fillStyle = '#ffff00';
				ctx.beginPath();
				ctx.arc(smileyX + 12, mY + 49, 8, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#000000';
				ctx.fillRect(smileyX + 8, mY + 46, 2, 3);
				ctx.fillRect(smileyX + 14, mY + 46, 2, 3);

				// Minesweeper Grid (3x3 interactive)
				const gridX = mX + mW / 2 - 42;
				const gridY = mY + 76;
				const cellSize = 28;

				drawBevelBox(gridX - 4, gridY - 4, cellSize * 3 + 8, cellSize * 3 + 8, true, '#c0c0c0');

				minesGrid.forEach((cell, idx) => {
					const r = Math.floor(idx / 3);
					const c = idx % 3;
					const cx = gridX + c * cellSize;
					const cy = gridY + r * cellSize;

					drawBevelBox(cx, cy, cellSize - 2, cellSize - 2, cell.clicked, '#c0c0c0');

					if (cell.clicked) {
						ctx.fillStyle = cell.mine ? '#ef4444' : '#0000ff';
						ctx.font = 'bold 14px monospace';
						ctx.fillText(cell.mine ? '💣' : String(cell.count), cx + 7, cy + 19);
					}
				});
			} else if (currentEra === 4) {
				// 5. GEOCITIES WEB (1996) - Netscape 3.0 Browser & 90s Web Artifacts
				const netX = w * 0.08;
				const netY = h * 0.08;
				const netW = w * 0.84;
				const netH = h * 0.84;

				// Netscape Browser Window
				drawBevelBox(netX, netY, netW, netH, false, '#c0c0c0');

				// Browser Title Bar
				ctx.fillStyle = '#000080';
				ctx.fillRect(netX + 3, netY + 3, netW - 6, 20);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Netscape Navigator - [Welcome to My GeoCities Site!]', netX + 8, netY + 17);

				// Address Bar
				drawBevelBox(netX + 8, netY + 28, netW - 16, 26, true, '#ffffff');
				ctx.fillStyle = '#000000';
				ctx.font = '11px monospace';
				ctx.fillText('Location: http://www.geocities.com/SiliconValley/Peaks/4281/', netX + 16, netY + 45);

				// Web Content Area
				const webY = netY + 60;
				const webH = netH - 68;
				ctx.fillStyle = '#080018';
				ctx.fillRect(netX + 8, webY, netW - 16, webH);

				// Starfield Background Stars
				ctx.fillStyle = '#ffffff';
				for (let i = 0; i < 40; i++) {
					const sx = netX + 12 + ((i * 41) % (netW - 24));
					const sy = webY + 8 + ((i * 59) % (webH - 16));
					ctx.fillRect(sx, sy, 2, 2);
				}

				// Under Construction Banner
				ctx.fillStyle = '#ffcc00';
				ctx.fillRect(netX + netW * 0.2, webY + 15, netW * 0.6, 28);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 12px monospace';
				ctx.fillText('⚠️ UNDER CONSTRUCTION ⚠️', netX + netW * 0.28, webY + 34);

				// Scrolling Marquee Text
				const marqueeX = netX + 20 + ((t * 0.08) % (netW - 180));
				ctx.fillStyle = '#ff00ff';
				ctx.font = 'bold 13px sans-serif';
				ctx.fillText('*** WELCOME TO MY 1996 HOMEPAGE! ***', marqueeX, webY + 75);

				// Rainbow HR rule
				const grad = ctx.createLinearGradient(netX + 20, 0, netX + netW - 20, 0);
				grad.addColorStop(0, '#ff0000');
				grad.addColorStop(0.2, '#ffff00');
				grad.addColorStop(0.4, '#00ff00');
				grad.addColorStop(0.6, '#00ffff');
				grad.addColorStop(0.8, '#0000ff');
				grad.addColorStop(1, '#ff00ff');
				ctx.fillStyle = grad;
				ctx.fillRect(netX + 20, webY + 95, netW - 40, 4);

				// Hit Counter Box
				ctx.fillStyle = '#000000';
				ctx.fillRect(netX + netW / 2 - 70, webY + 115, 140, 30);
				ctx.strokeStyle = '#00ff00';
				ctx.strokeRect(netX + netW / 2 - 70, webY + 115, 140, 30);
				ctx.fillStyle = '#00ff00';
				ctx.font = 'bold 14px monospace';
				ctx.fillText('VISITORS: 004281', netX + netW / 2 - 62, webY + 135);
			} else if (currentEra === 5) {
				// 6. WINAMP 2.80 (1999) - Pixel Skin & Bouncing LED Spectrum
				const waX = w * 0.16;
				const waY = h * 0.16;
				const waW = w * 0.68;
				const waH = h * 0.68;

				ctx.fillStyle = '#232936';
				ctx.fillRect(waX, waY, waW, waH);
				ctx.strokeStyle = '#455066';
				ctx.lineWidth = 2;
				ctx.strokeRect(waX, waY, waW, waH);

				// Top Winamp Title Bar
				ctx.fillStyle = '#10141d';
				ctx.fillRect(waX + 4, waY + 4, waW - 8, 20);
				ctx.fillStyle = '#00ff66';
				ctx.font = 'bold 11px monospace';
				ctx.fillText('WINAMP - 01. ANYRVAAN AUDIO SYSTEM (1999)', waX + 12, waY + 18);

				// LED Display Box
				ctx.fillStyle = '#000000';
				ctx.fillRect(waX + 16, waY + 32, waW - 32, 45);
				ctx.strokeStyle = '#00ff66';
				ctx.strokeRect(waX + 16, waY + 32, waW - 32, 45);

				// Time Readout
				ctx.fillStyle = '#00ff66';
				ctx.font = 'bold 18px monospace';
				ctx.fillText('02:14', waX + 24, waY + 62);
				ctx.font = '10px monospace';
				ctx.fillText('128 kbps  44 kHz  STEREO', waX + 100, waY + 52);

				// 24-Band LED Equalizer Bars
				const bars = 22;
				const barW = (waW - 48) / bars;
				const eqY = waY + 90;
				const eqH = waH - 110;

				for (let i = 0; i < bars; i++) {
					const bh = (Math.sin(t * 0.007 + i * 0.35) * 0.45 + 0.55) * eqH;
					const bx = waX + 24 + i * barW;

					const colorGrad = ctx.createLinearGradient(0, eqY + eqH, 0, eqY);
					colorGrad.addColorStop(0, '#2563eb');
					colorGrad.addColorStop(0.5, '#60a5fa');
					colorGrad.addColorStop(1, '#00ff66');

					ctx.fillStyle = colorGrad;
					ctx.fillRect(bx, eqY + eqH - bh, barW - 2, bh);
				}
			} else if (currentEra === 6) {
				// 7. iPod CLICK WHEEL (2004) - Metallic Chassis & Backlit LCD Display
				const podW = w * 0.36;
				const podH = h * 0.82;
				const px = (w - podW) / 2;
				const py = (h - podH) / 2;

				// White & Silver Gradient Body
				const bodyGrad = ctx.createLinearGradient(px, py, px + podW, py + podH);
				bodyGrad.addColorStop(0, '#ffffff');
				bodyGrad.addColorStop(1, '#e2e6ee');
				ctx.fillStyle = bodyGrad;
				ctx.fillRect(px, py, podW, podH);
				ctx.strokeStyle = '#c0c6d2';
				ctx.strokeRect(px, py, podW, podH);

				// Blue Backlit LCD Screen
				ctx.fillStyle = '#7dd3fc';
				ctx.fillRect(px + 18, py + 18, podW - 36, podH * 0.4);
				ctx.strokeStyle = '#38bdf8';
				ctx.strokeRect(px + 18, py + 18, podW - 36, podH * 0.4);

				// Header bar
				ctx.fillStyle = '#0284c7';
				ctx.fillRect(px + 18, py + 18, podW - 36, 20);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Now Playing', px + 26, py + 32);
				ctx.fillText('🔋', px + podW - 38, py + 32);

				// Song Info
				ctx.fillStyle = '#0f172a';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('Innerbloom (Retro Cut)', px + 26, py + 58);
				ctx.font = '11px sans-serif';
				ctx.fillText('Anyrvaan — UI Archaeology', px + 26, py + 76);

				// Timeline Scrubber
				ctx.fillStyle = '#94a3b8';
				ctx.fillRect(px + 26, py + 92, podW - 52, 6);
				ctx.fillStyle = '#0284c7';
				ctx.fillRect(px + 26, py + 92, (podW - 52) * 0.55, 6);

				ctx.fillStyle = '#0f172a';
				ctx.font = '10px monospace';
				ctx.fillText('2:14 / 4:08', px + 26, py + 112);

				// Click Wheel Housing
				const wheelCx = px + podW / 2;
				const wheelCy = py + podH * 0.72;
				const wheelRadius = podW * 0.28;

				ctx.fillStyle = '#f8fafc';
				ctx.beginPath();
				ctx.arc(wheelCx, wheelCy, wheelRadius, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#cbd5e1';
				ctx.stroke();

				// Wheel Engraved Text
				ctx.fillStyle = '#64748b';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('MENU', wheelCx - 15, wheelCy - wheelRadius + 16);
				ctx.fillText('⏯', wheelCx - 6, wheelCy + wheelRadius - 8);
				ctx.fillText('⏮', wheelCx - wheelRadius + 8, wheelCy + 4);
				ctx.fillText('⏭', wheelCx + wheelRadius - 20, wheelCy + 4);

				// Center Action Button
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(wheelCx, wheelCy, podW * 0.09, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#cbd5e1';
				ctx.stroke();
			} else if (currentEra === 7) {
				// 8. BLACKBERRY CURVE (2006) - QWERTY Handset & BBM Messaging UI
				const bbW = w * 0.42;
				const bbH = h * 0.84;
				const bx = (w - bbW) / 2;
				const by = (h - bbH) / 2;

				// Metallic Dark Blue Body
				ctx.fillStyle = '#161c28';
				ctx.fillRect(bx, by, bbW, bbH);
				ctx.strokeStyle = '#323c50';
				ctx.strokeRect(bx, by, bbW, bbH);

				// Display Screen
				ctx.fillStyle = '#090d16';
				ctx.fillRect(bx + 16, by + 16, bbW - 32, bbH * 0.46);

				// Top Status Bar
				ctx.fillStyle = '#00a0ff';
				ctx.fillRect(bx + 16, by + 16, bbW - 32, 22);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('BBM  3G 📶 14:28', bx + 22, by + 31);

				// Chat Bubble 1 (Incoming)
				ctx.fillStyle = '#222d3f';
				ctx.fillRect(bx + 24, by + 48, bbW - 60, 32);
				ctx.fillStyle = '#ffffff';
				ctx.font = '10px sans-serif';
				ctx.fillText('Hey! Is the new UI live?', bx + 30, by + 68);

				// Chat Bubble 2 (Outgoing)
				ctx.fillStyle = '#0084ff';
				ctx.fillRect(bx + 50, by + 90, bbW - 60, 32);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Yeah, pixel perfect 🚀', bx + 56, by + 110);

				// Glowing Trackball
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(bx + bbW / 2, by + bbH * 0.55, 8, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#60a5fa';
				ctx.stroke();

				// QWERTY Keyboard Layout
				ctx.fillStyle = '#2a3446';
				for (let r = 0; r < 3; r++) {
					for (let c = 0; c < 9; c++) {
						ctx.fillRect(bx + 20 + c * (bbW * 0.095), by + bbH * 0.65 + r * 14, 10, 8);
					}
				}
			} else {
				// 9. FIRST iPHONE (2007) - Multi-Touch Screen & Glossy iOS 1 Icons
				const phoneW = w * 0.36;
				const phoneH = h * 0.82;
				const px = (w - phoneW) / 2;
				const py = (h - phoneH) / 2;

				ctx.fillStyle = '#1b1b1e';
				ctx.fillRect(px, py, phoneW, phoneH);
				ctx.strokeStyle = '#404044';
				ctx.strokeRect(px, py, phoneW, phoneH);

				// Screen Display
				ctx.fillStyle = '#000000';
				ctx.fillRect(px + 12, px + 24, phoneW - 24, phoneH - 48);

				// iOS Status Bar
				ctx.fillStyle = '#ffffff';
				ctx.font = '10px sans-serif';
				ctx.fillText('AT&T 📶  14:28  🔋', px + 20, py + 38);

				// Glossy App Grid
				const appIcons = ['📱 Phone', '✉️ Mail', '🌐 Safari', '🎵 iPod', '📷 Photos', '⚙️ Settings'];
				appIcons.forEach((ic, i) => {
					const r = Math.floor(i / 3);
					const c = i % 3;
					const ix = px + 24 + c * (phoneW * 0.28);
					const iy = py + 55 + r * 54;

					ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
					ctx.fillRect(ix, iy, 34, 34);
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
					ctx.strokeRect(ix, iy, 34, 34);

					ctx.fillStyle = '#ffffff';
					ctx.font = '10px sans-serif';
					ctx.fillText(ic.split(' ')[0], ix + 8, iy + 22);
				});

				// Slide to Unlock Track
				const slideX = px + 20 + (Math.sin(t * 0.003) * 0.5 + 0.5) * (phoneW - 100);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
				ctx.fillRect(px + 20, py + phoneH - 60, phoneW - 40, 26);
				ctx.fillStyle = '#ffffff';
				ctx.font = '11px sans-serif';
				ctx.fillText('slide to unlock >', slideX, py + phoneH - 43);
			}

			// Pixel Magnifier Loupe on Mouse Hover
			if (enableLoupe && isMouseOver) {
				const loupeRadius = 45;
				ctx.save();
				ctx.beginPath();
				ctx.arc(mouseX, mouseY, loupeRadius, 0, Math.PI * 2);
				ctx.clip();

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

				ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
				ctx.lineWidth = 1;
				ctx.stroke();

				ctx.restore();

				ctx.strokeStyle = '#60a5fa';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(mouseX, mouseY, loupeRadius, 0, Math.PI * 2);
				ctx.stroke();

				ctx.fillStyle = '#60a5fa';
				ctx.font = 'bold 9px monospace';
				ctx.fillText('2.5x LOUPE', mouseX - 22, mouseY + loupeRadius + 14);
			}

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
			{/* Interactive Era Selector Dial / Tabs (ALL 9 ERAS) */}
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
