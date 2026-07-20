import { useEffect, useState } from 'react';

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
	const [selectedTab, setSelectedTab] = useState<number>(0);
	const [timecode, setTimecode] = useState<string>('00:00:00:00');
	const [isCinematic, setIsCinematic] = useState<boolean>(false);
	const [isTheater, setIsTheater] = useState<boolean>(false);
	const [isMuted, setIsMuted] = useState<boolean>(true);
	const [activeGlitch, setActiveGlitch] = useState<boolean>(false);

	// -------------------------------------------------------------------------
	// TAB DEFINITIONS WITH EXACT YOUTUBE VIDEO LINKS FOR ALL 4 CASE STUDIES
	// -------------------------------------------------------------------------
	const TABS: Record<
		ConceptPreset,
		Array<{ name: string; label: string; youtubeId: string; subtitle?: string }>
	> = {
		'retro': [
			{ name: '1982 — COMMODORE 64', label: 'C64 BASIC (1982)', youtubeId: 'JfT72pZBGXE', subtitle: 'VIC-II 40-Column BASIC Terminal' },
			{ name: '1984 — MACINTOSH 128K', label: 'MAC SYSTEM 1 (1984)', youtubeId: 'srY5Hl5ysJ0', subtitle: '1-Bit Dithered Desktop & GUI' },
			{ name: '1985 — MS-DOS 3.3', label: 'MS-DOS (1985)', youtubeId: 'L-GyutcRC3E', subtitle: 'IBM PC Green Phosphor CRT' },
			{ name: '1995 — WINDOWS 95', label: 'WINDOWS 95 (1995)', youtubeId: 'koKwwvKAbYc', subtitle: 'Teal Desktop, Taskbar & Minesweeper' },
			{ name: '1996 — GEOCITIES WEB', label: 'GEOCITIES (1996)', youtubeId: '_G0CyXzIhPI', subtitle: 'Netscape 3.0 & Under Construction Banner' },
			{ name: '1999 — WINAMP 2.80', label: 'WINAMP 2.0 (1999)', youtubeId: 'O7SyoE5u4Hg', subtitle: 'Metal Skin & 24-Band Spectrum Visualizer' },
			{ name: '2004 — iPod CLICK WHEEL', label: 'iPOD (2004)', youtubeId: 'F7320h99MmE', subtitle: 'Monochromatic Blue LCD & Click Wheel' },
			{ name: '2006 — BLACKBERRY CURVE', label: 'BLACKBERRY (2006)', youtubeId: 'u4Nl4woIM5A', subtitle: 'BBM Messenger & QWERTY Keyboard' },
			{ name: '2007 — FIRST iPHONE', label: 'FIRST iPHONE (2007)', youtubeId: 'ji9fXA-R2kM', subtitle: 'iOS 1 Multi-Touch Glass Grid' },
		],
		'ui-replicas': [
			{ name: 'APP 01 — QUICKBOOKS', label: 'QUICKBOOKS', youtubeId: 'RVHNGm_MY3w', subtitle: 'Accounting Transactions & Ledger Flow' },
			{ name: 'APP 02 — EXCEL', label: 'EXCEL', youtubeId: '8dfzgqPwCNk', subtitle: 'Live Chart & Cell Range Running Sum' },
			{ name: 'APP 03 — SLACK', label: 'SLACK', youtubeId: '_iNkm_Lu1ng', subtitle: 'Channel Thread & Emoji Reaction Ticks' },
			{ name: 'APP 04 — GMAIL', label: 'GMAIL', youtubeId: 'FgNHHivbCho', subtitle: 'Compose, Thread Collapse & Toast Note' },
			{ name: 'APP 05 — STRIPE', label: 'STRIPE', youtubeId: 'pchlP7TUGf4', subtitle: 'Payments Revenue Graph & Event Ripple' },
			{ name: 'APP 06 — XERO', label: 'XERO', youtubeId: 'Jr7t--AcFNE', subtitle: 'Bank Statement Reconciliation Matching' },
			{ name: 'APP 07 — NOTION', label: 'NOTION', youtubeId: '4RzTOUyOGsM', subtitle: 'Slash Command Menu & Database Checklists' },
			{ name: 'APP 08 — GOOGLE CALENDAR', label: 'GOOGLE CALENDAR', youtubeId: 'KH8EjT2fmLo', subtitle: 'Time Slot Drag & Meeting Grid Event' },
			{ name: 'APP 09 — VS CODE', label: 'VS CODE', youtubeId: '-BDITjM5RMg', subtitle: 'Dark Theme Syntax Typing & Terminal Logs' },
			{ name: 'APP 10 — TRELLO', label: 'TRELLO', youtubeId: 'P93oIhtsrXQ', subtitle: 'Kanban Column Card Drag & Tilt Physics' },
		],
		'effects': [
			{ name: 'CH 01 — KINETIC TYPOGRAPHY ARRIVALS', label: 'ARRIVALS', youtubeId: 'zoRoKReWYY4', subtitle: 'Kinetic Quote Grid & Text Arrival' },
			{ name: 'CH 02 — COUNTERS & STEPPERS', label: 'COUNTERS', youtubeId: 'zoRoKReWYY4', subtitle: 'High-Speed Ticking Numbers & Gauges' },
			{ name: 'CH 03 — SCREEN FULL OF DATA', label: 'DATA FIELDS', youtubeId: 'zoRoKReWYY4', subtitle: 'Dense Real-Time Code Metric Grid' },
			{ name: 'CH 04 — RESONANT FIELD PHYSICS', label: 'RESONANCE', youtubeId: 'zoRoKReWYY4', subtitle: 'Dot Field Settling Physics' },
			{ name: 'CH 05 — LIQUID PILLAR GAUGES', label: 'PULSE GAUGES', youtubeId: 'zoRoKReWYY4', subtitle: 'Cobalt Liquid-Fill Column Gauges' },
			{ name: 'CH 06 — RECURSIVE PATTERNS', label: 'RECURSION', youtubeId: 'zoRoKReWYY4', subtitle: 'Mathematical Spirograph Geometry' },
			{ name: 'CH 07 — KINETIC QUOTE GRID', label: 'KINETIC TYPE', youtubeId: 'zoRoKReWYY4', subtitle: 'Typography Motion in Sync' },
			{ name: 'CH 08 — SACRED SPIROGRAPH', label: 'SPIROGRAPH', youtubeId: 'zoRoKReWYY4', subtitle: 'Vector Math Vector Sweeps' },
		],
		'spiritual': [
			{ name: 'STUDY 01 — PHUGTAL MONASTERY', label: 'PHUGTAL MONASTERY', youtubeId: '8cKdoxP5HD0', subtitle: 'Cliffside Monastery Opening Mandala' },
			{ name: 'STUDY 02 — VALLEY OF FLOWERS', label: 'VALLEY OF FLOWERS', youtubeId: '8cKdoxP5HD0', subtitle: 'High-Altitude Flora Geometry' },
			{ name: 'STUDY 03 — LANGZA BUDDHA', label: 'LANGZA BUDDHA', youtubeId: '8cKdoxP5HD0', subtitle: 'High-Pass Statue Light Lines' },
			{ name: 'STUDY 04 — TAJ MAHAL', label: 'TAJ MAHAL', youtubeId: '8cKdoxP5HD0', subtitle: 'Symmetrical Marble Reflection' },
			{ name: 'STUDY 05 — DASHASHWAMEDH GHAT', label: 'DASHASHWAMEDH GHAT', youtubeId: '8cKdoxP5HD0', subtitle: 'River Aarti Flame Cycles' },
			{ name: 'STUDY 06 — KONARK SUN TEMPLE', label: 'KONARK SUN TEMPLE', youtubeId: '8cKdoxP5HD0', subtitle: 'Chariot Sun Dial Wheels' },
			{ name: 'STUDY 07 — KUNZUM PASS', label: 'KUNZUM PASS', youtubeId: '8cKdoxP5HD0', subtitle: 'Prayer Flag Wind Motions' },
			{ name: 'STUDY 08 — MYSORE PALACE', label: 'MYSORE PALACE', youtubeId: '8cKdoxP5HD0', subtitle: 'Illuminated Palace Grid' },
			{ name: 'STUDY 09 — RED FORT', label: 'RED FORT', youtubeId: '8cKdoxP5HD0', subtitle: 'Sandstone Arch Symmetry' },
			{ name: 'STUDY 10 — GUNA CAVES', label: 'GUNA CAVES', youtubeId: '8cKdoxP5HD0', subtitle: 'Subterranean Light Rays' },
			{ name: 'STUDY 11 — GOLDEN TEMPLE', label: 'GOLDEN TEMPLE', youtubeId: '8cKdoxP5HD0', subtitle: 'Sanctum Golden Water Mirror' },
			{ name: 'STUDY 12 — CHADAR TREK', label: 'CHADAR TREK', youtubeId: '8cKdoxP5HD0', subtitle: 'Frozen River Ice Cracks' },
			{ name: 'STUDY 13 — MEENAKSHI TEMPLE', label: 'MEENAKSHI TEMPLE', youtubeId: '8cKdoxP5HD0', subtitle: 'Tower Gopuram Sculpted Rays' },
		],
		'dashboard': [
			{ name: 'DASHBOARD CINEMA', label: 'ANALYTICS CINEMA', youtubeId: 'zoRoKReWYY4', subtitle: 'Analytics Engine' },
		],
		'anti-ui': [
			{ name: 'QUIET APPS GUIDE', label: 'QUIET APPS GUIDE', youtubeId: 'zoRoKReWYY4', subtitle: 'Calm Software Architecture' },
		],
	};

	const currentTabList = TABS[preset] || TABS['retro'];
	const currentTab = currentTabList[selectedTab] || currentTabList[0];

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

	// Custom Glitch Trigger tailored for each case study
	const triggerSubtleGlitch = () => {
		setActiveGlitch(true);
		document.documentElement.classList.remove('degauss-active');
		void document.documentElement.offsetWidth;
		document.documentElement.classList.add('degauss-active');

		setTimeout(() => {
			setActiveGlitch(false);
			document.documentElement.classList.remove('degauss-active');
		}, 450);
	};

	// Running film timecode timer
	useEffect(() => {
		const interval = setInterval(() => {
			const now = performance.now();
			const secTotal = Math.floor(now / 1000);
			const framesCount = Math.floor((now % 1000) / (1000 / 24));
			const ss = String(secTotal % 60).padStart(2, '0');
			const mm = String(Math.floor(secTotal / 60) % 60).padStart(2, '0');
			const hh = String(Math.floor(secTotal / 3600)).padStart(2, '0');
			const ff = String(framesCount).padStart(2, '0');
			setTimecode(`${hh}:${mm}:${ss}:${ff}`);
		}, 40);
		return () => clearInterval(interval);
	}, []);

	// Labels & Glitch Button Text unique to each case study
	const GLITCH_BUTTON_TEXT: Record<ConceptPreset, string> = {
		'retro': '⚡ CRT Degauss',
		'ui-replicas': '🖱️ Pixel Ripple',
		'effects': '🌊 Code Wave',
		'spiritual': '✨ Sacred Bloom',
		'dashboard': '📊 Data Spike',
		'anti-ui': '🌿 Quiet Pulse',
	};

	const HUD_LABEL: Record<ConceptPreset, string> = {
		'retro': '24 FPS • CRT SCAN',
		'ui-replicas': '60 FPS • FAKE MOUSE SIMULATION',
		'effects': '60 FPS • KINETIC CODE ENGINE',
		'spiritual': '1/2 TEMPO • SACRED GEOMETRY',
		'dashboard': '60 FPS • REAL-TIME DATA',
		'anti-ui': 'QUIET MODE • CALM INTERFACE',
	};

	return (
		<div className="mx-auto max-w-4xl px-6 pb-12">
			{/* Interactive Chapter Selector Bar unique to each of the 4 case studies */}
			<div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-hidden">
				<div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 min-w-0 pr-2">
					{currentTabList.map((tab, idx) => (
						<button
							key={tab.name}
							type="button"
							onClick={() => {
								setSelectedTab(idx);
								triggerSubtleGlitch();
							}}
							className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-mono transition-all duration-300 ${
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
					onClick={triggerSubtleGlitch}
					className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-mono text-amber-300 hover:bg-amber-500/20 transition-colors"
				>
					{GLITCH_BUTTON_TEXT[preset] || '⚡ Glitch'}
				</button>
			</div>

			<div className="glow-frame reveal rounded-2xl">
				<div
					className={`glow-frame__inner relative overflow-hidden border border-white/10 bg-black transition-all duration-500 ${
						isCinematic ? 'aspect-[2.39/1]' : 'aspect-square sm:aspect-video'
					}`}
				>
					{/* Real Widescreen HD Video Recording for active chapter tab */}
					<iframe
						key={currentTab.youtubeId + selectedTab}
						className={`h-full w-full pointer-events-none scale-105 transition-opacity duration-300 ${
							activeGlitch ? 'opacity-40 blur-sm' : 'opacity-100'
						}`}
						src={`https://www.youtube-nocookie.com/embed/${currentTab.youtubeId}?autoplay=1&mute=${
							isMuted ? 1 : 0
						}&loop=1&playlist=${currentTab.youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
						title={currentTab.name}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>

					{/* Custom Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/80 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<div className="flex flex-col">
							<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
								{currentTab.name}
							</span>
							{currentTab.subtitle && (
								<span className="text-[10px] font-mono text-neutral-400">
									{currentTab.subtitle}
								</span>
							)}
						</div>
					</div>

					{/* Custom Viewfinder Timecode HUD tailored to Case Study */}
					<div className="pointer-events-none absolute top-4 right-4 flex items-center gap-4 text-xs font-mono text-neutral-300">
						<span className="hidden sm:inline opacity-80">{HUD_LABEL[preset] || '24 FPS'}</span>
						<span className="text-blue-400 tabular-nums font-bold tracking-widest">{timecode}</span>
					</div>

					{/* Interactive Controls Toolbar */}
					<div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/80 p-1.5 backdrop-blur-md">
						<button
							type="button"
							onClick={() => setIsMuted(!isMuted)}
							className={`rounded-full px-2.5 py-1 text-[11px] font-mono transition-colors ${
								!isMuted ? 'bg-blue-500/30 text-blue-300' : 'text-neutral-300 hover:bg-white/10 hover:text-white'
							}`}
						>
							{isMuted ? '🔇 Muted' : '🔊 Sound ON'}
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
