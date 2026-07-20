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
	const [activeKey, setActiveKey] = useState<string>('');

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

	// Listen for physical keyboard typing to light up BlackBerry QWERTY keys!
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key.length === 1) {
				setActiveKey(e.key.toUpperCase());
				setTimeout(() => setActiveKey(''), 350);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

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
			const rect = canvas.getBoundingClientRect();
			const px = e.clientX - rect.left;
			const py = e.clientY - rect.top;

			// Check interactive Minesweeper clicks when Win95 era is active (index 3)
			if (preset === 'retro' && selectedEraRef.current === 3) {
				const mX = w * 0.28;
				const mY = h * 0.16;
				const gridX = mX + (w * 0.44) / 2 - 42;
				const gridY = mY + 70;
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

			if (isDraggingRef.current) {
				const dx = e.clientX - lastXRef.current;
				timeOffsetRef.current += dx * 40;
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

		// Helper: 3D Bevel Box (Classic Win95 / Netscape UI)
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
		// FULL-BLEED 16:9 REALISTIC UI SIMULATION ENGINE FOR ALL 9 ERAS
		// -------------------------------------------------------------------------
		const drawRetro = (t: number) => {
			ctx.fillStyle = '#04060a';
			ctx.fillRect(0, 0, w, h);

			const currentEra = selectedEraRef.current;
			setActiveLabel(eras[currentEra]?.name || eras[0].name);

			// CRT Scanline Overlay
			ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
			const scanOffset = (t * 0.04) % 4;
			for (let y = scanOffset; y < h; y += 4) {
				ctx.fillRect(0, y, w, 1);
			}

			if (currentEra === 0) {
				// 1. COMMODORE 64 (1982)
				ctx.fillStyle = '#352879';
				ctx.fillRect(0, 0, w, h);

				const screenX = w * 0.12;
				const screenY = h * 0.12;
				const screenW = w * 0.76;
				const screenH = h * 0.76;

				ctx.fillStyle = '#6c5eb5';
				ctx.fillRect(screenX, screenY, screenW, screenH);

				ctx.fillStyle = '#a397ff';
				ctx.font = 'bold 14px monospace';

				ctx.fillText('**** COMMODORE 64 BASIC V2 ****', screenX + 35, screenY + 45);
				ctx.fillText(' 64K RAM SYSTEM  38911 BASIC BYTES FREE', screenX + 35, screenY + 70);
				ctx.fillText('READY.', screenX + 35, screenY + 110);

				const cmd = "10 PRINT \"ANYRVAAN RETRO COMPUTING\"";
				const step = Math.floor((t * 0.005) % 28);
				const typed = step < 16 ? cmd.slice(0, step) : cmd;

				ctx.fillText(typed, screenX + 35, screenY + 140);

				if (step >= 16) {
					ctx.fillText('20 GOTO 10', screenX + 35, screenY + 165);
					ctx.fillText('RUN', screenX + 35, screenY + 190);
					ctx.fillText('ANYRVAAN RETRO COMPUTING', screenX + 35, screenY + 215);
					ctx.fillText('ANYRVAAN RETRO COMPUTING', screenX + 35, screenY + 240);
				}

				if (Math.sin(t * 0.008) > 0) {
					const curX = screenX + 35 + (step < 16 ? typed.length * 8.5 : 0);
					const curY = step < 16 ? screenY + 128 : screenY + 252;
					ctx.fillRect(curX, curY, 10, 15);
				}
			} else if (currentEra === 1) {
				// 2. MACINTOSH SYSTEM 1 (1984)
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, w, h);

				ctx.fillStyle = 'rgba(0,0,0,0.14)';
				for (let py = 0; py < h; py += 4) {
					for (let px = (py % 8 === 0 ? 0 : 2); px < w; px += 4) {
						ctx.fillRect(px, py, 2, 2);
					}
				}

				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, w, 28);
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = 1;
				ctx.strokeRect(0, 0, w, 28);

				ctx.fillStyle = '#000000';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('  File  Edit  View  Special', 20, 18);

				ctx.strokeRect(w - 75, 45, 36, 28);
				ctx.fillRect(w - 47, 55, 4, 8);
				ctx.font = '10px sans-serif';
				ctx.fillText('Macintosh HD', w - 85, 88);

				ctx.strokeRect(w - 70, h - 75, 30, 35);
				ctx.fillText('Trash', w - 72, h - 25);

				const winX = w * 0.15 + Math.sin(t * 0.001) * 6;
				const winY = h * 0.16;
				const winW = w * 0.65;
				const winH = h * 0.68;

				ctx.fillStyle = '#000000';
				ctx.fillRect(winX + 4, winY + 4, winW, winH);

				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX, winY, winW, winH);
				ctx.strokeRect(winX, winY, winW, winH);

				ctx.strokeRect(winX, winY, winW, 22);
				for (let ly = winY + 5; ly < winY + 19; ly += 3) {
					ctx.fillRect(winX + 26, ly, winW - 36, 1);
				}

				ctx.strokeRect(winX + 6, winY + 5, 12, 12);
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX + 8, winY + 7, 8, 8);

				ctx.fillStyle = '#ffffff';
				ctx.fillRect(winX + winW / 2 - 50, winY + 3, 100, 16);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('System Folder', winX + winW / 2 - 42, winY + 15);

				const items = [
					{ name: 'Finder', icon: '😃' },
					{ name: 'System', icon: '💻' },
					{ name: 'MacWrite', icon: '📝' },
					{ name: 'MacPaint', icon: '🎨' },
					{ name: 'Control Panel', icon: '🎛️' },
					{ name: 'Clipboard', icon: '📋' },
				];
				items.forEach((item, idx) => {
					const ix = winX + 35 + (idx % 3) * 110;
					const iy = winY + 45 + Math.floor(idx / 3) * 75;
					ctx.strokeRect(ix, iy, 34, 30);
					ctx.font = '16px sans-serif';
					ctx.fillText(item.icon, ix + 8, iy + 22);
					ctx.font = '10px sans-serif';
					ctx.fillText(item.name, ix - 6, iy + 48);
				});
			} else if (currentEra === 2) {
				// 3. MS-DOS 3.3 (1985)
				ctx.fillStyle = '#040904';
				ctx.fillRect(0, 0, w, h);

				ctx.fillStyle = '#00ff66';
				ctx.font = '14px monospace';

				ctx.fillText('MS-DOS Version 3.30 (C)Copyright Microsoft Corp 1981-1987', 40, 50);
				ctx.fillText('C:\\> VER', 40, 85);
				ctx.fillText('C:\\> DIR /W', 40, 115);

				ctx.fillText(' Volume in drive C is DOS_SYSTEM', 40, 145);
				ctx.fillText(' Directory of C:\\', 40, 165);

				ctx.fillText('[COMMAND.COM]   [AUTOEXEC.BAT]   [CONFIG.SYS]    [DOOM.EXE]', 40, 200);
				ctx.fillText('[WOLF3D.EXE]    [RETRO.BAT]      [GRAPHICS.DRV]  [SYSTEM.DAT]', 40, 225);

				ctx.fillText('       10 File(s)    14,285,760 bytes free', 40, 265);

				ctx.fillText('C:\\> DOOM.EXE', 40, 300);
				ctx.fillText('Loading DOOM Engine v1.1...', 40, 325);

				ctx.fillText('C:\\> _', 40, 360);
				if (Math.sin(t * 0.01) > 0) {
					ctx.fillRect(80, 348, 10, 15);
				}
			} else if (currentEra === 3) {
				// 4. WINDOWS 95 (1995)
				ctx.fillStyle = '#008080';
				ctx.fillRect(0, 0, w, h);

				const desktopIcons = [
					{ name: 'My Computer', x: 25, y: 30 },
					{ name: 'Network', x: 25, y: 105 },
					{ name: 'Recycle Bin', x: 25, y: 180 },
					{ name: 'Internet Explorer', x: 25, y: 255 },
				];
				desktopIcons.forEach((ic) => {
					drawBevelBox(ic.x, ic.y, 36, 32, false, '#c0c0c0');
					ctx.fillStyle = '#000080';
					ctx.fillRect(ic.x + 4, ic.y + 4, 28, 24);
					ctx.fillStyle = '#ffffff';
					ctx.font = '11px sans-serif';
					ctx.fillText(ic.name, ic.x - 8, ic.y + 46);
				});

				const tbY = h - 34;
				drawBevelBox(0, tbY, w, 34, false, '#c0c0c0');

				drawBevelBox(4, tbY + 4, 80, 26, false, '#c0c0c0');
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Start', 32, tbY + 21);
				ctx.fillStyle = '#ff0000';
				ctx.fillRect(14, tbY + 10, 5, 5);
				ctx.fillStyle = '#00ff00';
				ctx.fillRect(20, tbY + 10, 5, 5);

				drawBevelBox(w - 80, tbY + 4, 74, 26, true, '#c0c0c0');
				ctx.fillStyle = '#000000';
				ctx.font = '11px sans-serif';
				ctx.fillText('14:28 PM', w - 70, tbY + 21);

				const mX = w * 0.28;
				const mY = h * 0.16;
				const mW = w * 0.44;
				const mH = h * 0.65;

				drawBevelBox(mX, mY, mW, mH, false, '#c0c0c0');

				ctx.fillStyle = '#000080';
				ctx.fillRect(mX + 3, mY + 3, mW - 6, 22);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Minesweeper', mX + 10, mY + 18);

				drawBevelBox(mX + 12, mY + 32, mW - 24, 34, true, '#c0c0c0');

				ctx.fillStyle = '#000000';
				ctx.fillRect(mX + 20, mY + 37, 42, 24);
				ctx.fillStyle = '#ff0000';
				ctx.font = 'bold 16px monospace';
				ctx.fillText('010', mX + 24, mY + 55);

				const smileyX = mX + mW / 2 - 12;
				drawBevelBox(smileyX, mY + 37, 24, 24, false, '#c0c0c0');
				ctx.fillStyle = '#ffff00';
				ctx.beginPath();
				ctx.arc(smileyX + 12, mY + 49, 8, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#000000';
				ctx.fillRect(smileyX + 8, mY + 46, 2, 3);
				ctx.fillRect(smileyX + 14, mY + 46, 2, 3);

				const gridX = mX + mW / 2 - 42;
				const gridY = mY + 70;
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
				// 5. GEOCITIES WEB (1996)
				drawBevelBox(0, 0, w, h, false, '#c0c0c0');

				ctx.fillStyle = '#000080';
				ctx.fillRect(3, 3, w - 6, 22);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Netscape Navigator - [Welcome to Anirudh\'s GeoCities Homepage!]', 10, 18);

				drawBevelBox(8, 30, w - 16, 26, true, '#ffffff');
				ctx.fillStyle = '#000000';
				ctx.font = '11px monospace';
				ctx.fillText('Location: http://www.geocities.com/SiliconValley/Heights/4281/', 16, 47);

				const webY = 62;
				const webH = h - 66;
				ctx.fillStyle = '#080018';
				ctx.fillRect(8, webY, w - 16, webH);

				ctx.fillStyle = '#ffffff';
				for (let i = 0; i < 60; i++) {
					const sx = 12 + ((i * 41) % (w - 24));
					const sy = webY + 8 + ((i * 59) % (webH - 16));
					ctx.fillRect(sx, sy, 2, 2);
				}

				ctx.fillStyle = '#ffcc00';
				ctx.fillRect(w * 0.2, webY + 20, w * 0.6, 30);
				ctx.fillStyle = '#000000';
				ctx.font = 'bold 13px monospace';
				ctx.fillText('⚠️ UNDER CONSTRUCTION ⚠️', w * 0.28, webY + 40);

				const marqueeX = 20 + ((t * 0.08) % (w - 220));
				ctx.fillStyle = '#ff00ff';
				ctx.font = 'bold 14px sans-serif';
				ctx.fillText('*** WELCOME TO MY 1996 RETRO HOMEPAGE! ***', marqueeX, webY + 85);

				const grad = ctx.createLinearGradient(20, 0, w - 20, 0);
				grad.addColorStop(0, '#ff0000');
				grad.addColorStop(0.2, '#ffff00');
				grad.addColorStop(0.4, '#00ff00');
				grad.addColorStop(0.6, '#00ffff');
				grad.addColorStop(0.8, '#0000ff');
				grad.addColorStop(1, '#ff00ff');
				ctx.fillStyle = grad;
				ctx.fillRect(20, webY + 110, w - 40, 4);

				ctx.fillStyle = '#000000';
				ctx.fillRect(w / 2 - 75, webY + 135, 150, 32);
				ctx.strokeStyle = '#00ff00';
				ctx.strokeRect(w / 2 - 75, webY + 135, 150, 32);
				ctx.fillStyle = '#00ff00';
				ctx.font = 'bold 15px monospace';
				ctx.fillText('VISITORS: 004281', w / 2 - 66, webY + 157);
			} else if (currentEra === 5) {
				// 6. WINAMP 2.80 (1999)
				const waX = w * 0.18;
				const waY = h * 0.12;
				const waW = w * 0.64;
				const waH = h * 0.76;

				ctx.fillStyle = '#1c2230';
				ctx.fillRect(waX, waY, waW, waH);
				ctx.strokeStyle = '#3d485e';
				ctx.lineWidth = 2;
				ctx.strokeRect(waX, waY, waW, waH);

				ctx.fillStyle = '#0e121a';
				ctx.fillRect(waX + 4, waY + 4, waW - 8, 22);
				ctx.fillStyle = '#00ff66';
				ctx.font = 'bold 11px monospace';
				ctx.fillText('WINAMP - 01. ANYRVAAN AUDIO ARCHAEOLOGY (1999)', waX + 12, waY + 19);

				ctx.fillStyle = '#000000';
				ctx.fillRect(waX + 16, waY + 34, waW - 32, 50);
				ctx.strokeStyle = '#00ff66';
				ctx.strokeRect(waX + 16, waY + 34, waW - 32, 50);

				ctx.fillStyle = '#00ff66';
				ctx.font = 'bold 20px monospace';
				ctx.fillText('02:14', waX + 26, waY + 68);
				ctx.font = '10px monospace';
				ctx.fillText('128 kbps  44 kHz  STEREO  EQ PL', waX + 110, waY + 56);

				const bars = 24;
				const barW = (waW - 48) / bars;
				const eqY = waY + 96;
				const eqH = waH - 116;

				for (let i = 0; i < bars; i++) {
					const bh = (Math.sin(t * 0.007 + i * 0.35) * 0.45 + 0.55) * eqH;
					const bx = waX + 24 + i * barW;

					const colorGrad = ctx.createLinearGradient(0, eqY + eqH, 0, eqY);
					colorGrad.addColorStop(0, '#1d4ed8');
					colorGrad.addColorStop(0.5, '#60a5fa');
					colorGrad.addColorStop(1, '#00ff66');

					ctx.fillStyle = colorGrad;
					ctx.fillRect(bx, eqY + eqH - bh, barW - 2, bh);
				}
			} else if (currentEra === 6) {
				// 7. iPod CLICK WHEEL (2004) - Full Screen Focused iPod OS
				ctx.fillStyle = '#0c1017';
				ctx.fillRect(0, 0, w, h);

				// Full-bleed Screen Frame
				const podX = w * 0.12;
				const podY = h * 0.08;
				const podW = w * 0.76;
				const podH = h * 0.84;

				// Blue Backlit LCD
				ctx.fillStyle = '#bae6fd';
				ctx.fillRect(podX, podY, podW, podH);
				ctx.strokeStyle = '#0284c7';
				ctx.lineWidth = 2;
				ctx.strokeRect(podX, podY, podW, podH);

				// iPod Header Bar
				ctx.fillStyle = '#0284c7';
				ctx.fillRect(podX, podY, podW, 32);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 14px sans-serif';
				ctx.fillText('▶  Now Playing', podX + 20, podY + 22);
				ctx.fillText('🔋 98%', podX + podW - 70, podY + 22);

				// Album Art Box (Vinyl Vector)
				const artW = podH * 0.48;
				const artX = podX + 30;
				const artY = podY + 52;
				ctx.fillStyle = '#0f172a';
				ctx.fillRect(artX, artY, artW, artW);

				ctx.fillStyle = '#334155';
				ctx.beginPath();
				ctx.arc(artX + artW / 2, artY + artW / 2, artW * 0.4, 0, Math.PI * 2);
				ctx.fill();

				ctx.fillStyle = '#0284c7';
				ctx.beginPath();
				ctx.arc(artX + artW / 2, artY + artW / 2, artW * 0.15, 0, Math.PI * 2);
				ctx.fill();

				// Track Metadata
				const metaX = artX + artW + 35;
				ctx.fillStyle = '#0f172a';
				ctx.font = 'bold 18px sans-serif';
				ctx.fillText('Innerbloom (Retro Cut)', metaX, artY + 30);
				ctx.font = '14px sans-serif';
				ctx.fillStyle = '#334155';
				ctx.fillText('Artist: Anyrvaan', metaX, artY + 60);
				ctx.fillText('Album: UI Archaeology (2004)', metaX, artY + 85);

				// Timeline Scrubber
				ctx.fillStyle = '#94a3b8';
				ctx.fillRect(metaX, artY + 115, podW - artW - 100, 8);
				ctx.fillStyle = '#0284c7';
				ctx.fillRect(metaX, artY + 115, (podW - artW - 100) * 0.58, 8);

				ctx.fillStyle = '#0f172a';
				ctx.font = 'bold 12px monospace';
				ctx.fillText('02:14 / 04:08', metaX, artY + 145);
			} else if (currentEra === 7) {
				// =================================================================
				// ERA 8: BLACKBERRY CURVE (2006) - Full-Bleed BBM Messenger & Key HUD
				// =================================================================
				const screenX = w * 0.05;
				const screenY = h * 0.05;
				const screenW = w * 0.9;
				const screenH = h * 0.9;

				// Dark BlackBerry Theme Frame
				ctx.fillStyle = '#0b0f19';
				ctx.fillRect(screenX, screenY, screenW, screenH);
				ctx.strokeStyle = '#1e293b';
				ctx.lineWidth = 2;
				ctx.strokeRect(screenX, screenY, screenW, screenH);

				// Top BBM OS Status Bar
				ctx.fillStyle = '#0084ff';
				ctx.fillRect(screenX, screenY, screenW, 36);

				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 14px sans-serif';
				ctx.fillText('🍇 BlackBerry Messenger (BBM)', screenX + 16, screenY + 23);
				ctx.font = '12px sans-serif';
				ctx.fillText('3G 📶  14:28 PM  🔋 98%', screenX + screenW - 170, screenY + 23);

				// Active Chat Profile Bar
				ctx.fillStyle = '#1e293b';
				ctx.fillRect(screenX, screenY + 36, screenW, 44);

				// Profile Avatar
				ctx.fillStyle = '#60a5fa';
				ctx.beginPath();
				ctx.arc(screenX + 30, screenY + 58, 14, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('A', screenX + 26, screenY + 62);

				// Contact Info
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 13px sans-serif';
				ctx.fillText('Anirudh [Design Lead]  ● Online', screenX + 54, screenY + 52);
				ctx.fillStyle = '#94a3b8';
				ctx.font = '11px sans-serif';
				ctx.fillText('PIN: 28A9F04B • Status: Building retro UI archaeology 🚀', screenX + 54, screenY + 68);

				// BBM Chat Conversation Area
				const chatY = screenY + 90;

				// Incoming Message Bubble 1 (Left)
				ctx.fillStyle = '#1e293b';
				ctx.fillRect(screenX + 24, chatY + 10, screenW * 0.52, 45);
				ctx.fillStyle = '#f8fafc';
				ctx.font = '13px sans-serif';
				ctx.fillText('Hey! Is the new BlackBerry BBM interface live?', screenX + 36, chatY + 32);
				ctx.fillStyle = '#94a3b8';
				ctx.font = '10px sans-serif';
				ctx.fillText('14:26 PM', screenX + screenW * 0.52 - 35, chatY + 48);

				// Outgoing Message Bubble 2 (Right - Blue with Read Receipt)
				const b2X = screenX + screenW * 0.42;
				ctx.fillStyle = '#0084ff';
				ctx.fillRect(b2X, chatY + 70, screenW * 0.54, 45);
				ctx.fillStyle = '#ffffff';
				ctx.font = '13px sans-serif';
				ctx.fillText('Yeah! Full-screen BBM with real D & R ticks! 🚀', b2X + 16, chatY + 92);
				ctx.fillStyle = '#e0f2fe';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('14:27 PM  R ✓', b2X + screenW * 0.54 - 85, chatY + 108);

				// Typing Indicator Bar
				if (Math.sin(t * 0.005) > 0) {
					ctx.fillStyle = '#94a3b8';
					ctx.font = 'italic 12px sans-serif';
					ctx.fillText('Anirudh is typing...', screenX + 30, chatY + 140);
				}

				// Interactive Pearl Trackball HUD (Right Side)
				const tbCx = screenX + screenW - 50;
				const tbCy = screenY + screenH - 50;

				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(tbCx, tbCy, 14, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#60a5fa';
				ctx.lineWidth = 2;
				ctx.stroke();

				// Light Up Active Key when Typing
				if (activeKey) {
					ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
					ctx.fillRect(screenX + 20, screenY + screenH - 40, 160, 26);
					ctx.fillStyle = '#60a5fa';
					ctx.font = 'bold 12px monospace';
					ctx.fillText(`KEY: ${activeKey}`, screenX + 30, screenY + screenH - 23);
				}
			} else {
				// 9. FIRST iPHONE (2007) - Full-Screen iOS 1 Home Screen
				ctx.fillStyle = '#000000';
				ctx.fillRect(0, 0, w, h);

				// iOS 1 Wallpaper (Water Droplets / Dark Gradient)
				const wallGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
				wallGrad.addColorStop(0, '#1e293b');
				wallGrad.addColorStop(1, '#020617');
				ctx.fillStyle = wallGrad;
				ctx.fillRect(0, 0, w, h);

				// iOS Status Bar
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('AT&T 📶  14:28 PM  🔋 98%', 30, 24);

				// 4x4 iOS 1 App Grid
				const appIcons = [
					{ name: 'Messages', icon: '💬', bg: '#22c55e' },
					{ name: 'Calendar', icon: '📅', bg: '#ffffff' },
					{ name: 'Photos', icon: '🌻', bg: '#eab308' },
					{ name: 'Camera', icon: '📷', bg: '#64748b' },
					{ name: 'YouTube', icon: '📺', bg: '#ef4444' },
					{ name: 'Stocks', icon: '📈', bg: '#000000' },
					{ name: 'Maps', icon: '🗺️', bg: '#3b82f6' },
					{ name: 'Weather', icon: '☀️', bg: '#38bdf8' },
				];

				appIcons.forEach((ic, i) => {
					const r = Math.floor(i / 4);
					const c = i % 4;
					const ix = w * 0.15 + c * (w * 0.2);
					const iy = 50 + r * 85;

					ctx.fillStyle = ic.bg;
					ctx.fillRect(ix, iy, 48, 48);
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
					ctx.lineWidth = 1;
					ctx.strokeRect(ix, iy, 48, 48);

					ctx.font = '22px sans-serif';
					ctx.fillText(ic.icon, ix + 12, iy + 33);

					ctx.fillStyle = '#ffffff';
					ctx.font = '12px sans-serif';
					ctx.fillText(ic.name, ix + 2, iy + 65);
				});

				// Bottom Glossy Dock
				const dockY = h - 75;
				ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
				ctx.fillRect(w * 0.1, dockY, w * 0.8, 60);

				const dockIcons = [
					{ name: 'Phone', icon: '📞' },
					{ name: 'Mail', icon: '✉️' },
					{ name: 'Safari', icon: '🧭' },
					{ name: 'iPod', icon: '🎵' },
				];
				dockIcons.forEach((ic, i) => {
					const dx = w * 0.18 + i * (w * 0.18);
					ctx.font = '24px sans-serif';
					ctx.fillText(ic.icon, dx, dockY + 40);
				});
			}

			if (degaussFlash > 0) {
				ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
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
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}, [preset, isPaused, degaussFlash, minesGrid, activeKey]);

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
									? 'border border-blue-400 bg-blue-500/20 text-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.4)]'
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
					{/* 60FPS FULL-BLEED REALISTIC REACT CANVAS HERO */}
					<canvas ref={canvasRef} className="h-full w-full block cursor-pointer" />

					{/* Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
							{activeLabel || title || 'LIVE RETRO ENGINE'}
						</span>
					</div>

					{/* Viewfinder Timecode */}
					<div className="pointer-events-none absolute top-4 right-4 flex items-center gap-4 text-xs font-mono text-neutral-400">
						<span className="hidden sm:inline opacity-70">60 FPS • REACT CANVAS</span>
						<span className="text-blue-400 tabular-nums font-bold tracking-widest">{timecode}</span>
					</div>

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
