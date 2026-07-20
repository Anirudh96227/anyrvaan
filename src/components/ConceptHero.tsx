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

			// Minesweeper clicks when Win95 (index 3) is active
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
		// 60FPS CANVAS ENGINE — AUTHENTIC REALISTIC HANDSET AND OS SIMULATION
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
				// 7. iPod CLICK WHEEL (2004)
				const podW = w * 0.38;
				const podH = h * 0.88;
				const px = (w - podW) / 2;
				const py = (h - podH) / 2;

				const bodyGrad = ctx.createLinearGradient(px, py, px + podW, py + podH);
				bodyGrad.addColorStop(0, '#ffffff');
				bodyGrad.addColorStop(1, '#e0e4ec');
				ctx.fillStyle = bodyGrad;
				ctx.fillRect(px, py, podW, podH);
				ctx.strokeStyle = '#cbd5e1';
				ctx.strokeRect(px, py, podW, podH);

				ctx.fillStyle = '#bae6fd';
				ctx.fillRect(px + 18, py + 18, podW - 36, podH * 0.38);
				ctx.strokeStyle = '#0284c7';
				ctx.strokeRect(px + 18, py + 18, podW - 36, podH * 0.38);

				ctx.fillStyle = '#0284c7';
				ctx.fillRect(px + 18, py + 18, podW - 36, 22);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('Now Playing', px + 26, py + 33);
				ctx.fillText('🔋', px + podW - 38, py + 33);

				ctx.fillStyle = '#0f172a';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('Innerbloom (Retro Cut)', px + 26, py + 62);
				ctx.font = '11px sans-serif';
				ctx.fillText('Anyrvaan — UI Archaeology', px + 26, py + 80);

				ctx.fillStyle = '#94a3b8';
				ctx.fillRect(px + 26, py + 96, podW - 52, 6);
				ctx.fillStyle = '#0284c7';
				ctx.fillRect(px + 26, py + 96, (podW - 52) * 0.58, 6);

				ctx.fillStyle = '#0f172a';
				ctx.font = '10px monospace';
				ctx.fillText('02:14 / 04:08', px + 26, py + 116);

				const wheelCx = px + podW / 2;
				const wheelCy = py + podH * 0.72;
				const wheelRadius = podW * 0.28;

				ctx.fillStyle = '#f8fafc';
				ctx.beginPath();
				ctx.arc(wheelCx, wheelCy, wheelRadius, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#cbd5e1';
				ctx.stroke();

				ctx.fillStyle = '#64748b';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('MENU', wheelCx - 15, wheelCy - wheelRadius + 16);
				ctx.fillText('⏯', wheelCx - 6, wheelCy + wheelRadius - 8);
				ctx.fillText('⏮', wheelCx - wheelRadius + 8, wheelCy + 4);
				ctx.fillText('⏭', wheelCx + wheelRadius - 20, wheelCy + 4);

				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(wheelCx, wheelCy, podW * 0.09, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#cbd5e1';
				ctx.stroke();
			} else if (currentEra === 7) {
				// =================================================================
				// ERA 8: BLACKBERRY CURVE (2006) - REALISTIC MOBILE HANDSET + BBM UI
				// =================================================================
				const phoneH = h * 0.94;
				const phoneW = w * 0.44;
				const px = (w - phoneW) / 2;
				const py = (h - phoneH) / 2;

				// 1. Dark Metallic Titanium Handset Body
				const phoneGrad = ctx.createLinearGradient(px, py, px + phoneW, py + phoneH);
				phoneGrad.addColorStop(0, '#222a38');
				phoneGrad.addColorStop(0.5, '#141a24');
				phoneGrad.addColorStop(1, '#090d14');
				ctx.fillStyle = phoneGrad;

				// Handset Rounded Bezel Silhouette
				ctx.beginPath();
				ctx.roundRect(px, py, phoneW, phoneH, 24);
				ctx.fill();
				ctx.strokeStyle = '#3b475d';
				ctx.lineWidth = 3;
				ctx.stroke();

				// Silver Metallic Side Rail Accents
				ctx.strokeStyle = '#94a3b8';
				ctx.lineWidth = 1;
				ctx.strokeRect(px + 3, py + 10, phoneW - 6, phoneH - 20);

				// Top Earpiece Speaker Mesh
				ctx.fillStyle = '#0f172a';
				ctx.fillRect(px + phoneW / 2 - 24, py + 12, 48, 6);
				ctx.fillStyle = '#64748b';
				ctx.fillRect(px + phoneW / 2 - 20, py + 14, 40, 2);

				// Chrome BlackBerry Text Logo below speaker
				ctx.fillStyle = '#cbd5e1';
				ctx.font = 'bold 11px sans-serif';
				ctx.fillText('BlackBerry', px + phoneW / 2 - 28, py + 30);

				// 2. Illuminated Screen Display Box
				const screenX = px + 16;
				const screenY = py + 38;
				const screenW = phoneW - 32;
				const screenH = phoneH * 0.44;

				ctx.fillStyle = '#070a10';
				ctx.fillRect(screenX, screenY, screenW, screenH);
				ctx.strokeStyle = '#334155';
				ctx.lineWidth = 2;
				ctx.strokeRect(screenX, screenY, screenW, screenH);

				// BBM Top Bar inside Screen
				ctx.fillStyle = '#0084ff';
				ctx.fillRect(screenX, screenY, screenW, 24);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('🍇 BBM', screenX + 8, screenY + 16);
				ctx.fillText('3G 📶 14:28 PM', screenX + screenW - 75, screenY + 16);

				// BBM Chat Conversation inside Screen
				const chatY = screenY + 30;

				// Message 1 (Incoming)
				ctx.fillStyle = '#1e293b';
				ctx.fillRect(screenX + 8, chatY + 8, screenW * 0.72, 28);
				ctx.fillStyle = '#ffffff';
				ctx.font = '10px sans-serif';
				ctx.fillText('Hey! Is the new UI live?', screenX + 14, chatY + 25);

				// Message 2 (Outgoing Blue Bubble with Read Receipt)
				const b2X = screenX + screenW * 0.25;
				ctx.fillStyle = '#0084ff';
				ctx.fillRect(b2X, chatY + 42, screenW * 0.7, 28);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Yeah, pixel perfect 🚀 R ✓', b2X + 8, chatY + 59);

				// 3. Physical Convenience Keys (Send, Menu, Trackball, Back, End)
				const keyRowY = screenY + screenH + 10;

				// Green Send Button
				ctx.fillStyle = '#166534';
				ctx.fillRect(px + 16, keyRowY, 26, 18);
				ctx.fillStyle = '#22c55e';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('📞', px + 22, keyRowY + 13);

				// Menu Button
				ctx.fillStyle = '#334155';
				ctx.fillRect(px + 46, keyRowY, 26, 18);

				// Translucent Pearl Trackball (Center)
				const ballCx = px + phoneW / 2;
				const ballCy = keyRowY + 9;
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(ballCx, ballCy, 9, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#60a5fa';
				ctx.lineWidth = 2;
				ctx.stroke();

				// Escape Back Button
				ctx.fillStyle = '#334155';
				ctx.fillRect(px + phoneW - 72, keyRowY, 26, 18);

				// Red End Button
				ctx.fillStyle = '#991b1b';
				ctx.fillRect(px + phoneW - 42, keyRowY, 26, 18);
				ctx.fillStyle = '#ef4444';
				ctx.fillText('🔴', px + phoneW - 36, keyRowY + 13);

				// 4. Textured 3D QWERTY Keypad Grid
				const kpY = keyRowY + 26;
				const rows = [
					['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
					['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
					['ALT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '↵'],
				];

				rows.forEach((rowKeys, rIdx) => {
					const rY = kpY + rIdx * 16;

					// Metallic horizontal fret line between rows
					ctx.fillStyle = '#64748b';
					ctx.fillRect(px + 16, rY - 2, phoneW - 32, 1);

					const kw = (phoneW - 40) / rowKeys.length;
					rowKeys.forEach((kLabel, cIdx) => {
						const kx = px + 20 + cIdx * kw;
						const isLit = activeKey && activeKey === kLabel;

						ctx.fillStyle = isLit ? '#38bdf8' : '#1e293b';
						ctx.fillRect(kx, rY, kw - 2, 12);
						ctx.strokeStyle = '#475569';
						ctx.strokeRect(kx, rY, kw - 2, 12);

						ctx.fillStyle = isLit ? '#000000' : '#ffffff';
						ctx.font = 'bold 8px sans-serif';
						ctx.fillText(kLabel, kx + kw / 2 - 4, rY + 9);
					});
				});
			} else {
				// 9. FIRST iPHONE (2007)
				const phoneW = w * 0.38;
				const phoneH = h * 0.88;
				const px = (w - phoneW) / 2;
				const py = (h - phoneH) / 2;

				ctx.fillStyle = '#1b1b1e';
				ctx.fillRect(px, py, phoneW, phoneH);
				ctx.strokeStyle = '#404044';
				ctx.strokeRect(px, py, phoneW, phoneH);

				ctx.fillStyle = '#000000';
				ctx.fillRect(px + 12, py + 20, phoneW - 24, phoneH - 40);

				ctx.fillStyle = '#ffffff';
				ctx.font = '10px sans-serif';
				ctx.fillText('AT&T 📶  14:28  🔋', px + 20, py + 34);

				const appIcons = ['📱 Phone', '✉️ Mail', '🌐 Safari', '🎵 iPod', '📷 Photos', '⚙️ Settings'];
				appIcons.forEach((ic, i) => {
					const r = Math.floor(i / 3);
					const c = i % 3;
					const ix = px + 24 + c * (phoneW * 0.28);
					const iy = py + 52 + r * 54;

					ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
					ctx.fillRect(ix, iy, 34, 34);
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
					ctx.strokeRect(ix, iy, 34, 34);

					ctx.fillStyle = '#ffffff';
					ctx.font = '10px sans-serif';
					ctx.fillText(ic.split(' ')[0], ix + 8, iy + 22);
				});

				const slideX = px + 20 + (Math.sin(t * 0.003) * 0.5 + 0.5) * (phoneW - 100);
				ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
				ctx.fillRect(px + 20, py + phoneH - 55, phoneW - 40, 26);
				ctx.fillStyle = '#ffffff';
				ctx.font = '11px sans-serif';
				ctx.fillText('slide to unlock >', slideX, py + phoneH - 38);
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
					{/* 60FPS REALISTIC CANVAS HERO */}
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
