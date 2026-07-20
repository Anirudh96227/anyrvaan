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
	const [selectedTab, setSelectedTab] = useState<number>(0);
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
	const selectedTabRef = useRef<number>(selectedTab);
	selectedTabRef.current = selectedTab;

	// -------------------------------------------------------------------------
	// TAB DEFINITIONS FOR ALL 4 DISTINCT CASE STUDY PROJECTS
	// -------------------------------------------------------------------------
	const TABS: Record<ConceptPreset, Array<{ name: string; label: string; youtubeId?: string }>> = {
		'retro': [
			{ name: '1982 — COMMODORE 64', label: 'C64 BASIC (1982)', youtubeId: 'JfT72pZBGXE' },
			{ name: '1984 — MACINTOSH 128K', label: 'MAC SYSTEM 1 (1984)', youtubeId: 'srY5Hl5ysJ0' },
			{ name: '1985 — MS-DOS 3.3', label: 'MS-DOS (1985)', youtubeId: 'L-GyutcRC3E' },
			{ name: '1995 — WINDOWS 95', label: 'WINDOWS 95 (1995)', youtubeId: 'koKwwvKAbYc' },
			{ name: '1996 — GEOCITIES WEB', label: 'GEOCITIES (1996)', youtubeId: '_G0CyXzIhPI' },
			{ name: '1999 — WINAMP 2.80', label: 'WINAMP 2.0 (1999)', youtubeId: 'O7SyoE5u4Hg' },
			{ name: '2004 — iPod CLICK WHEEL', label: 'iPOD (2004)', youtubeId: 'F7320h99MmE' },
			{ name: '2006 — BLACKBERRY CURVE', label: 'BLACKBERRY (2006)', youtubeId: 'u4Nl4woIM5A' },
			{ name: '2007 — FIRST iPHONE', label: 'FIRST iPHONE (2007)', youtubeId: 'ji9fXA-R2kM' },
		],
		'ui-replicas': [
			{ name: 'APP 01 — QUICKBOOKS', label: 'QUICKBOOKS', youtubeId: 'RVHNGm_MY3w' },
			{ name: 'APP 02 — EXCEL', label: 'EXCEL', youtubeId: '8dfzgqPwCNk' },
			{ name: 'APP 03 — SLACK', label: 'SLACK', youtubeId: '_iNkm_Lu1ng' },
			{ name: 'APP 04 — GMAIL', label: 'GMAIL', youtubeId: 'FgNHHivbCho' },
			{ name: 'APP 05 — STRIPE', label: 'STRIPE', youtubeId: 'pchlP7TUGf4' },
			{ name: 'APP 06 — XERO', label: 'XERO', youtubeId: 'Jr7t--AcFNE' },
			{ name: 'APP 07 — NOTION', label: 'NOTION', youtubeId: '4RzTOUyOGsM' },
			{ name: 'APP 08 — GOOGLE CALENDAR', label: 'GOOGLE CALENDAR', youtubeId: 'KH8EjT2fmLo' },
			{ name: 'APP 09 — VS CODE', label: 'VS CODE', youtubeId: '-BDITjM5RMg' },
			{ name: 'APP 10 — TRELLO', label: 'TRELLO', youtubeId: 'P93oIhtsrXQ' },
		],
		'effects': [
			{ name: 'CH 01 — KINETIC TYPOGRAPHY ARRIVALS', label: 'ARRIVALS', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 02 — COUNTERS & STEPPERS', label: 'COUNTERS', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 03 — SCREEN FULL OF DATA', label: 'DATA FIELDS', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 04 — RESONANT FIELD PHYSICS', label: 'RESONANCE', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 05 — LIQUID PILLAR GAUGES', label: 'PULSE GAUGES', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 06 — RECURSIVE PATTERNS', label: 'RECURSION', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 07 — KINETIC QUOTE GRID', label: 'KINETIC TYPE', youtubeId: 'zoRoKReWYY4' },
			{ name: 'CH 08 — SACRED SPIROGRAPH', label: 'SPIROGRAPH', youtubeId: 'zoRoKReWYY4' },
		],
		'spiritual': [
			{ name: 'STUDY 01 — PHUGTAL MONASTERY', label: 'PHUGTAL MONASTERY', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 02 — VALLEY OF FLOWERS', label: 'VALLEY OF FLOWERS', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 03 — LANGZA BUDDHA', label: 'LANGZA BUDDHA', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 04 — TAJ MAHAL', label: 'TAJ MAHAL', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 05 — DASHASHWAMEDH GHAT', label: 'DASHASHWAMEDH GHAT', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 06 — KONARK SUN TEMPLE', label: 'KONARK SUN TEMPLE', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 07 — KUNZUM PASS', label: 'KUNZUM PASS', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 08 — MYSORE PALACE', label: 'MYSORE PALACE', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 09 — RED FORT', label: 'RED FORT', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 10 — GUNA CAVES', label: 'GUNA CAVES', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 11 — GOLDEN TEMPLE', label: 'GOLDEN TEMPLE', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 12 — CHADAR TREK', label: 'CHADAR TREK', youtubeId: '8cKdoxP5HD0' },
			{ name: 'STUDY 13 — MEENAKSHI TEMPLE', label: 'MEENAKSHI TEMPLE', youtubeId: '8cKdoxP5HD0' },
		],
		'dashboard': [
			{ name: 'DASHBOARD — ANALYTICS ENGINE', label: 'ANALYTICS CINEMA' },
		],
		'anti-ui': [
			{ name: 'ANTI-UI — QUIET APPS FIELD GUIDE', label: 'QUIET APPS GUIDE' },
		]
	};

	const currentTabList = TABS[preset] || TABS['retro'];

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

			// Check interactive Minesweeper clicks when Win95 era is active in Retro mode
			if (preset === 'retro' && selectedTabRef.current === 3) {
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
		// RENDER CANVAS FOR THE ACTIVE CASE STUDY PRESET & TAB
		// -------------------------------------------------------------------------
		const drawScene = (t: number) => {
			ctx.fillStyle = '#04060a';
			ctx.fillRect(0, 0, w, h);

			const tabIdx = selectedTabRef.current;
			const currentTab = currentTabList[tabIdx] || currentTabList[0];
			setActiveLabel(currentTab.name);

			// CRT Scanlines
			ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
			const scanOffset = (t * 0.04) % 4;
			for (let y = scanOffset; y < h; y += 4) {
				ctx.fillRect(0, y, w, 1);
			}

			if (preset === 'ui-replicas') {
				// =================================================================
				// PRESET 2: TEN APPS REBUILT BY HAND (UI REPLICAS)
				// =================================================================
				ctx.fillStyle = '#0f172a';
				ctx.fillRect(0, 0, w, h);

				if (tabIdx === 0) {
					// 1. QUICKBOOKS
					ctx.fillStyle = '#1e293b';
					ctx.fillRect(0, 0, w * 0.22, h);
					ctx.fillStyle = '#3b82f6';
					ctx.fillRect(0, 0, w * 0.22, 40);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('QuickBooks', 15, 25);

					ctx.fillStyle = '#0f172a';
					ctx.fillRect(w * 0.24, 20, w * 0.72, h - 40);
					ctx.fillStyle = '#ffffff';
					ctx.fillText('Transactions Ledger — Revenue $142,850', w * 0.26, 45);

					// Ledger table rows
					for (let i = 0; i < 6; i++) {
						ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#334155';
						ctx.fillRect(w * 0.26, 65 + i * 32, w * 0.68, 28);
						ctx.fillStyle = '#ffffff';
						ctx.font = '11px sans-serif';
						ctx.fillText(`INV-0042${i} • Payment Received`, w * 0.28, 83 + i * 32);
						ctx.fillText(`+$${(1250 * (i + 1)).toLocaleString()}`, w * 0.82, 83 + i * 32);
					}
				} else if (tabIdx === 1) {
					// 2. EXCEL
					ctx.fillStyle = '#107c41';
					ctx.fillRect(0, 0, w, 32);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('Microsoft Excel — Sales_Q3.xlsx', 15, 20);

					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 32, w, h - 60);

					// Cell Grid
					ctx.strokeStyle = '#e2e8f0';
					for (let x = 0; x < w; x += 80) {
						ctx.beginPath();
						ctx.moveTo(x, 32);
						ctx.lineTo(x, h - 28);
						ctx.stroke();
					}
					for (let y = 32; y < h - 28; y += 24) {
						ctx.beginPath();
						ctx.moveTo(0, y);
						ctx.lineTo(w, y);
						ctx.stroke();
					}

					// Selected Cell Range
					ctx.fillStyle = 'rgba(16, 124, 65, 0.15)';
					ctx.fillRect(80, 56, 240, 120);
					ctx.strokeStyle = '#107c41';
					ctx.lineWidth = 2;
					ctx.strokeRect(80, 56, 240, 120);

					// Bottom Sum Status Bar
					ctx.fillStyle = '#f1f5f9';
					ctx.fillRect(0, h - 28, w, 28);
					ctx.fillStyle = '#0f172a';
					ctx.font = '11px sans-serif';
					ctx.fillText('READY  •  AVERAGE: $1,428  |  COUNT: 15  |  SUM: $21,420', 15, h - 10);
				} else if (tabIdx === 2) {
					// 3. SLACK
					ctx.fillStyle = '#3f0e40';
					ctx.fillRect(0, 0, w * 0.25, h);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 13px sans-serif';
					ctx.fillText('Anirudh HQ', 16, 25);
					ctx.font = '11px sans-serif';
					ctx.fillText('# general', 24, 60);
					ctx.fillText('# design', 24, 85);
					ctx.fillStyle = 'rgba(255,255,255,0.2)';
					ctx.fillRect(10, 95, w * 0.22, 24);
					ctx.fillStyle = '#ffffff';
					ctx.fillText('# standup', 24, 111);

					// Main Chat Feed
					ctx.fillStyle = '#1a1d21';
					ctx.fillRect(w * 0.25, 0, w * 0.75, h);

					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('Anirudh  14:28 PM', w * 0.28, 40);
					ctx.font = '12px sans-serif';
					ctx.fillStyle = '#d1d5db';
					ctx.fillText('Pushed the new UI Replicas build. 10 apps, faked to the pixel! 🚀', w * 0.28, 60);

					// Emoji Reaction Tick (+1)
					ctx.fillStyle = '#2c323b';
					ctx.fillRect(w * 0.28, 75, 48, 22);
					ctx.strokeStyle = '#3b82f6';
					ctx.strokeRect(w * 0.28, 75, 48, 22);
					ctx.fillStyle = '#60a5fa';
					ctx.fillText('🚀 3', w * 0.28 + 8, 90);
				} else if (tabIdx === 3) {
					// 4. GMAIL
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, w, h);

					// Top Header
					ctx.fillStyle = '#ea4335';
					ctx.fillRect(0, 0, w, 40);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 14px sans-serif';
					ctx.fillText('✉️ Gmail — Inbox (3)', 20, 26);

					// Email Threads List
					for (let i = 0; i < 4; i++) {
						ctx.fillStyle = i === 0 ? '#f1f5f9' : '#ffffff';
						ctx.fillRect(20, 50 + i * 36, w - 40, 32);
						ctx.strokeStyle = '#e2e8f0';
						ctx.strokeRect(20, 50 + i * 36, w - 40, 32);

						ctx.fillStyle = '#0f172a';
						ctx.font = i === 0 ? 'bold 11px sans-serif' : '11px sans-serif';
						ctx.fillText('Stripe Support • Payment notification for $142.85', 35, 70 + i * 36);
					}

					// Message Sent Toast Note
					ctx.fillStyle = '#1e293b';
					ctx.fillRect(20, h - 45, 180, 32);
					ctx.fillStyle = '#ffffff';
					ctx.font = '11px sans-serif';
					ctx.fillText('Message sent.  Undo', 30, h - 25);
				} else if (tabIdx === 4) {
					// 5. STRIPE
					ctx.fillStyle = '#0a2540';
					ctx.fillRect(0, 0, w, h);

					ctx.fillStyle = '#635bfc';
					ctx.fillRect(0, 0, 160, h);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 14px sans-serif';
					ctx.fillText('stripe', 20, 30);

					// Metrics Card
					ctx.fillStyle = '#1a1f36';
					ctx.fillRect(180, 20, w - 200, 75);
					ctx.fillStyle = '#adbdcc';
					ctx.font = '11px sans-serif';
					ctx.fillText('Gross volume', 195, 40);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 22px sans-serif';
					ctx.fillText('$142,850.00', 195, 70);

					// Animated Revenue Curve
					ctx.strokeStyle = '#00d4b6';
					ctx.lineWidth = 3;
					ctx.beginPath();
					for (let x = 180; x < w - 20; x += 10) {
						const y = 160 - Math.sin((x + t * 0.05) * 0.02) * 35;
						if (x === 180) ctx.moveTo(x, y);
						else ctx.lineTo(x, y);
					}
					ctx.stroke();
				} else if (tabIdx === 5) {
					// 6. XERO
					ctx.fillStyle = '#00b4d8';
					ctx.fillRect(0, 0, w, 36);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 13px sans-serif';
					ctx.fillText('xero — Bank Reconciliation', 20, 23);

					ctx.fillStyle = '#f8fafc';
					ctx.fillRect(0, 36, w, h - 36);

					ctx.fillStyle = '#0f172a';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('Statement Line: Payment $1,250.00', 25, 65);
					ctx.fillStyle = '#16a34a';
					ctx.fillRect(w - 120, 50, 95, 28);
					ctx.fillStyle = '#ffffff';
					ctx.fillText('OK  Match ✓', w - 100, 68);
				} else if (tabIdx === 6) {
					// 7. NOTION
					ctx.fillStyle = '#191919';
					ctx.fillRect(0, 0, w, h);

					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 18px sans-serif';
					ctx.fillText('📝 UI Archaeology Research', 30, 45);

					ctx.fillStyle = '#94a3b8';
					ctx.font = '12px sans-serif';
					ctx.fillText('Press "/" for commands, or type code blocks...', 30, 75);

					// Slash Menu Popover
					ctx.fillStyle = '#252525';
					ctx.fillRect(30, 90, 180, 80);
					ctx.strokeStyle = '#333333';
					ctx.strokeRect(30, 90, 180, 80);
					ctx.fillStyle = '#ffffff';
					ctx.font = '11px sans-serif';
					ctx.fillText('H1  Heading 1', 42, 112);
					ctx.fillText('☑️  To-do list', 42, 134);
					ctx.fillText('📋  Board view', 42, 156);
				} else if (tabIdx === 7) {
					// 8. GOOGLE CALENDAR
					ctx.fillStyle = '#ffffff';
					ctx.fillRect(0, 0, w, h);

					ctx.fillStyle = '#1a73e8';
					ctx.fillRect(0, 0, w, 36);
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('📅 Google Calendar — Week View', 20, 23);

					// 7 Column Days Grid
					for (let i = 0; i < 7; i++) {
						ctx.strokeStyle = '#e8eaed';
						ctx.strokeRect(i * (w / 7), 36, w / 7, h - 36);
					}

					// Event Card Drag
					ctx.fillStyle = '#e8f0fe';
					ctx.fillRect(w / 7 + 4, 60, w / 7 - 8, 55);
					ctx.strokeStyle = '#1a73e8';
					ctx.strokeRect(w / 7 + 4, 60, w / 7 - 8, 55);
					ctx.fillStyle = '#1967d2';
					ctx.font = 'bold 10px sans-serif';
					ctx.fillText('Design Sync', w / 7 + 10, 78);
				} else if (tabIdx === 8) {
					// 9. VS CODE
					ctx.fillStyle = '#1e1e1e';
					ctx.fillRect(0, 0, w, h);

					// Sidebar File Tree
					ctx.fillStyle = '#252526';
					ctx.fillRect(0, 0, 140, h);
					ctx.fillStyle = '#cccccc';
					ctx.font = 'bold 11px sans-serif';
					ctx.fillText('EXPLORER', 12, 24);
					ctx.font = '11px sans-serif';
					ctx.fillText('📄 index.ts', 20, 50);
					ctx.fillText('📄 App.tsx', 20, 72);

					// Code Editor View
					ctx.fillStyle = '#569cd6';
					ctx.font = '12px monospace';
					ctx.fillText('const', 160, 45);
					ctx.fillStyle = '#4fc1ff';
					ctx.fillText(' app', 205, 45);
					ctx.fillStyle = '#d4d4d4';
					ctx.fillText(' = rebuildApp("Slack");', 240, 45);
				} else {
					// 10. TRELLO
					ctx.fillStyle = '#0079bf';
					ctx.fillRect(0, 0, w, h);

					// 3 Kanban Columns
					const colW = w * 0.28;
					['To Do', 'In Progress', 'Done'].forEach((title, idx) => {
						const cx = 20 + idx * (colW + 15);
						ctx.fillStyle = '#ebecf0';
						ctx.fillRect(cx, 25, colW, h - 50);

						ctx.fillStyle = '#172b4d';
						ctx.font = 'bold 12px sans-serif';
						ctx.fillText(title, cx + 12, 45);

						ctx.fillStyle = '#ffffff';
						ctx.fillRect(cx + 8, 58, colW - 16, 36);
						ctx.fillStyle = '#0f172a';
						ctx.font = '11px sans-serif';
						ctx.fillText('Pixel perfect UI rebuild', cx + 16, 80);
					});
				}
			} else if (preset === 'effects') {
				// =================================================================
				// PRESET 3: THE EFFECTS INDEX (KINETIC CODE ANIMATION ENGINE)
				// =================================================================
				ctx.fillStyle = '#040814';
				ctx.fillRect(0, 0, w, h);

				// Liquid Pillar Gauges
				for (let i = 0; i < 3; i++) {
					const gx = w * 0.3 + i * 85;
					const gy = h * 0.25;
					const gh = h * 0.55;

					ctx.fillStyle = '#1e293b';
					ctx.fillRect(gx, gy, 48, gh);

					const fillH = (Math.sin(t * 0.004 + i * 0.8) * 0.4 + 0.5) * gh;
					ctx.fillStyle = '#2563eb';
					ctx.fillRect(gx, gy + gh - fillH, 48, fillH);
				}

				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 16px sans-serif';
				ctx.fillText('THE EFFECTS INDEX — Kinetic Code Animation', 30, 40);
			} else if (preset === 'spiritual') {
				// =================================================================
				// PRESET 4: THE SPIRITUAL SERIES (CONTEMPLATIVE SACRED GEOMETRY)
				// =================================================================
				ctx.fillStyle = '#06050a';
				ctx.fillRect(0, 0, w, h);

				const cx = w / 2;
				const cy = h / 2;

				// Concentric Mandala Circles
				ctx.strokeStyle = '#38bdf8';
				ctx.lineWidth = 1.5;

				for (let r = 20; r < 120; r += 20) {
					ctx.beginPath();
					ctx.arc(cx, cy, r + Math.sin(t * 0.002 + r) * 5, 0, Math.PI * 2);
					ctx.stroke();
				}

				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 15px sans-serif';
				ctx.fillText('THE SPIRITUAL SERIES — Sacred Geometry', 30, 40);
			} else {
				// DEFAULT RETRO COMPUTING PRESET (PRESET 1)
				drawRetro(t);
			}

			if (degaussFlash > 0) {
				ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
				ctx.fillRect(0, 0, w, h);
			}
		};

		// Retro drawing sub-routine for preset === 'retro'
		const drawRetro = (t: number) => {
			const currentEra = selectedTabRef.current;

			if (currentEra === 0) {
				// C64
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
			} else if (currentEra === 3) {
				// Win95
				ctx.fillStyle = '#008080';
				ctx.fillRect(0, 0, w, h);

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
			} else if (currentEra === 7) {
				// BlackBerry
				const phoneH = h * 0.94;
				const phoneW = Math.min(w * 0.85, w < 600 ? 320 : 380);
				const px = (w - phoneW) / 2;
				const py = (h - phoneH) / 2;

				ctx.fillStyle = '#141a24';
				ctx.fillRect(px, py, phoneW, phoneH);
				ctx.strokeStyle = '#3b475d';
				ctx.strokeRect(px, py, phoneW, phoneH);

				ctx.fillStyle = '#0084ff';
				ctx.fillRect(px + 14, py + 32, phoneW - 28, 24);
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText('🍇 BBM Messenger', px + 22, py + 48);
			} else {
				// Full-bleed Operating System composition
				ctx.fillStyle = '#0a0f1d';
				ctx.fillRect(0, 0, w, h);
				ctx.fillStyle = '#60a5fa';
				ctx.font = 'bold 16px sans-serif';
				ctx.fillText(currentTabList[currentEra]?.name || 'RETRO ERA', 40, 50);
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

			drawScene(totalTime);

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
			{/* Interactive Selector Tabs unique to each of the 4 case studies */}
			<div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-hidden">
				<div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 min-w-0 pr-2">
					{currentTabList.map((tab, idx) => (
						<button
							key={tab.name}
							type="button"
							onClick={() => {
								setSelectedTab(idx);
								triggerDegauss();
							}}
							className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-mono transition-all duration-300 ${
								selectedTab === idx
									? 'border border-blue-400 bg-blue-500/20 text-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.4)]'
									: 'border border-white/10 bg-black/40 text-neutral-400 hover:border-white/30 hover:text-white'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={triggerDegauss}
					className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
				>
					⚡ Degauss
				</button>
			</div>

			<div className="glow-frame reveal rounded-2xl">
				<div
					className={`glow-frame__inner relative overflow-hidden border border-white/10 bg-neutral-950 transition-all duration-500 ${
						isCinematic ? 'aspect-[2.39/1]' : 'aspect-square sm:aspect-video'
					}`}
				>
					{/* 60FPS REALISTIC CANVAS HERO */}
					<canvas ref={canvasRef} className="h-full w-full block cursor-pointer" />

					{/* Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
							{activeLabel || title || 'LIVE SIMULATION ENGINE'}
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
