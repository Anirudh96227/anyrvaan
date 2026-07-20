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
	const [selectedEraIndex, setSelectedEraIndex] = useState<number>(0);
	const [timecode, setTimecode] = useState<string>('00:00:00:00');
	const [isCinematic, setIsCinematic] = useState<boolean>(false);
	const [isTheater, setIsTheater] = useState<boolean>(false);
	const [isMuted, setIsMuted] = useState<boolean>(true);

	const eras = [
		{ name: '1982 — COMMODORE 64', label: 'C64 BASIC (1982)', youtubeId: 'JfT72pZBGXE' },
		{ name: '1984 — MACINTOSH 128K', label: 'MAC SYSTEM 1 (1984)', youtubeId: 'srY5Hl5ysJ0' },
		{ name: '1985 — MS-DOS 3.3', label: 'MS-DOS (1985)', youtubeId: 'L-GyutcRC3E' },
		{ name: '1995 — WINDOWS 95', label: 'WINDOWS 95 (1995)', youtubeId: 'koKwwvKAbYc' },
		{ name: '1996 — GEOCITIES WEB', label: 'GEOCITIES (1996)', youtubeId: '_G0CyXzIhPI' },
		{ name: '1999 — WINAMP 2.80', label: 'WINAMP 2.0 (1999)', youtubeId: 'O7SyoE5u4Hg' },
		{ name: '2004 — iPod CLICK WHEEL', label: 'iPOD (2004)', youtubeId: 'F7320h99MmE' },
		{ name: '2006 — BLACKBERRY CURVE', label: 'BLACKBERRY (2006)', youtubeId: 'u4Nl4woIM5A' },
		{ name: '2007 — FIRST iPHONE', label: 'FIRST iPHONE (2007)', youtubeId: 'ji9fXA-R2kM' },
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
		document.documentElement.classList.remove('degauss-active');
		void document.documentElement.offsetWidth;
		document.documentElement.classList.add('degauss-active');

		setTimeout(() => {
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

	const currentEra = eras[selectedEraIndex] || eras[0];

	return (
		<div className="mx-auto max-w-4xl px-6 pb-12">
			{/* Interactive Era Selector Buttons (ALL 9 ERAS) */}
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
					className={`glow-frame__inner relative overflow-hidden border border-white/10 bg-black transition-all duration-500 ${
						isCinematic ? 'aspect-[2.39/1]' : 'aspect-video'
					}`}
				>
					{/* Real Widescreen 16:9 Video Recording for active era */}
					<iframe
						key={currentEra.youtubeId}
						class="h-full w-full pointer-events-none scale-105"
						src={`https://www.youtube-nocookie.com/embed/${currentEra.youtubeId}?autoplay=1&mute=${
							isMuted ? 1 : 0
						}&loop=1&playlist=${currentEra.youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
						title={currentEra.name}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
					/>

					{/* Overlay Info Badge */}
					<div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-full border border-white/15 bg-black/75 px-4 py-1.5 backdrop-blur-md">
						<span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
						<span className="text-xs font-mono uppercase tracking-widest text-neutral-200">
							{currentEra.name}
						</span>
					</div>

					{/* Viewfinder Timecode HUD */}
					<div className="pointer-events-none absolute top-4 right-4 flex items-center gap-4 text-xs font-mono text-neutral-300">
						<span className="hidden sm:inline opacity-80">24 FPS • REAL RECORDING</span>
						<span className="text-blue-400 tabular-nums font-bold tracking-widest">{timecode}</span>
					</div>

					{/* Interactive Controls Toolbar */}
					<div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/75 p-1.5 backdrop-blur-md">
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
