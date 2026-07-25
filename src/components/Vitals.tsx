import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import BodyFigure3D, { type Body3DState, type Organ } from './BodyFigure3D.tsx';

/**
 * Vitals — one figure, ten readings. You tell it your height and weight, it
 * builds a figure to match, and every tab after that puts something real
 * onto the same body instead of starting a new gauge from zero. Nothing
 * typed here is measured, stored, or sent anywhere — every curve is a known
 * physiological approximation, not a diagnosis.
 */

type TabId =
	| 'pulse'
	| 'breath'
	| 'clock'
	| 'caffeine'
	| 'hydration'
	| 'reflex'
	| 'steps'
	| 'temperature'
	| 'altitude'
	| 'digestion';

const TABS: { id: TabId; label: string; blurb: string }[] = [
	{ id: 'pulse', label: 'Pulse', blurb: 'Watch it travel from the heart outward.' },
	{ id: 'breath', label: 'Breath', blurb: 'The one thing your body does whether you watch or not.' },
	{ id: 'clock', label: 'Body Clock', blurb: 'A 24-hour ring, and where you sit on it right now.' },
	{ id: 'caffeine', label: 'Caffeine', blurb: 'How long that coffee is actually staying in charge.' },
	{ id: 'hydration', label: 'Hydration', blurb: 'A tide, rising or not, from the feet up.' },
	{ id: 'reflex', label: 'Reflex', blurb: 'Tap the dot. Watch the signal take the long way round.' },
	{ id: 'steps', label: 'Steps', blurb: 'Turn a step count into an actual distance.' },
	{ id: 'temperature', label: 'Temperature', blurb: "What the weather's quietly doing to you." },
	{ id: 'altitude', label: 'Altitude', blurb: 'Why the air feels thinner than it looks.' },
	{ id: 'digestion', label: 'Digestion', blurb: 'Where lunch actually is right now.' },
];

// ——— small shared bits ———
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function useNowMs() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);
	return now;
}

/** A cortisol-shaped day: low overnight, peaking ~30–60min after waking, easing off by evening. */
function circadianCurve(wake: number, sleep: number): number[] {
	const hours = Array.from({ length: 24 }, (_, h) => h);
	const wakeSpan = ((sleep - wake + 24) % 24) || 16;
	return hours.map((h) => {
		const sinceWake = ((h - wake + 24) % 24);
		if (sinceWake > wakeSpan) return 0.08; // asleep
		const peak = 1;
		const t = sinceWake / wakeSpan;
		// sharp rise on waking, slow decline through the day
		return sinceWake < 1.5 ? lerp(0.15, peak, sinceWake / 1.5) : lerp(peak, 0.15, (t - 0.06) / 0.94);
	});
}

export default function Vitals() {
	// ——— personalization: the figure itself ———
	const [heightCm, setHeightCm] = useState(170);
	const [weightKg, setWeightKg] = useState(68);
	const [entered, setEntered] = useState(false);
	const [revealT, setRevealT] = useState(0);
	const revealRaf = useRef(0);

	useEffect(() => {
		if (!entered) return;
		const start = performance.now();
		const DUR = 900;
		const tick = (t: number) => {
			const p = clamp((t - start) / DUR, 0, 1);
			setRevealT(1 - Math.pow(1 - p, 3)); // expo-ish settle
			if (p < 1) revealRaf.current = requestAnimationFrame(tick);
		};
		revealRaf.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(revealRaf.current);
	}, [entered]);

	// Reference build: 170cm / 68kg. Scales clamped so the figure stays a
	// figure, not a claim about anyone's actual body.
	const heightScale = clamp(heightCm / 170, 0.85, 1.15);
	const bmiRef = 68 / (1.7 * 1.7);
	const bmiNow = weightKg / ((heightCm / 100) * (heightCm / 100));
	// bmiNow === bmiRef (i.e. the untouched defaults) must land on exactly 1 —
	// the figure's own as-drawn proportions, not an offset guess.
	const widthScale = clamp(0.7 + 0.3 * (bmiNow / bmiRef), 0.82, 1.22);

	const [tab, setTab] = useState<TabId>('pulse');

	// ——— per-module state ———
	const [bpm, setBpm] = useState(72);
	const [breaths, setBreaths] = useState(14);
	const [wake, setWake] = useState(7);
	const [sleep, setSleep] = useState(23);
	const [caffMg, setCaffMg] = useState(95);
	const [caffAt, setCaffAt] = useState(9);
	const [glasses, setGlasses] = useState(4);
	const [steps, setSteps] = useState(6000);
	const [outsideTemp, setOutsideTemp] = useState(24);
	const [altitude, setAltitude] = useState(0);
	const [mealAt, setMealAt] = useState(13);
	const [reflexState, setReflexState] = useState<'idle' | 'waiting' | 'go' | 'done'>('idle');
	const [reflexMs, setReflexMs] = useState<number | null>(null);
	const reflexTimer = useRef(0);
	const reflexGoAt = useRef(0);

	const nowMs = useNowMs();
	const nowHour = useMemo(() => {
		const d = new Date(nowMs);
		return d.getHours() + d.getMinutes() / 60;
	}, [nowMs]);

	// live animation clock for pulse/breath/reflex glows
	const [t, setT] = useState(0);
	useEffect(() => {
		let raf = 0;
		const loop = (ts: number) => {
			setT(ts);
			raf = requestAnimationFrame(loop);
		};
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, []);

	// ——— derived 3D state per tab ———
	// The body is always alive: the heart beats and the lungs move on every
	// tab, because they do. A tab only decides what gets *lit*.
	const body3D = useMemo<Body3DState>(() => {
		const heartPeriod = 60000 / bpm;
		const breathRate = tab === 'altitude' ? breathingRateForAltitude(altitude) : breaths;
		const lungPeriod = 60000 / breathRate;

		const litOrgans: Partial<Record<Organ, number>> = {};
		let fillLevel: number | null = null;
		let nerve: number | null = null;
		let surface: 'none' | 'cold' | 'hot' = 'none';

		if (tab === 'pulse') litOrgans.heart = 1;
		if (tab === 'breath' || tab === 'altitude') litOrgans.lungs = 1;
		if (tab === 'clock') {
			// the brain runs the clock — bright when the curve says you're up
			const ring = circadianCurve(wake, sleep);
			litOrgans.brain = ring[Math.floor(nowHour) % 24];
		}
		if (tab === 'caffeine') {
			const hoursSince = ((nowHour - caffAt + 24) % 24) || 0.01;
			litOrgans.brain = clamp(Math.pow(0.5, hoursSince / 5), 0, 1);
		}
		if (tab === 'hydration') fillLevel = clamp(glasses / 8, 0, 1);
		if (tab === 'temperature') surface = outsideTemp <= 14 ? 'cold' : outsideTemp >= 30 ? 'hot' : 'none';
		if (tab === 'reflex' && (reflexState === 'go' || reflexState === 'done')) {
			const dur = reflexMs ? clamp(reflexMs, 150, 500) * 4 : 800;
			const p = clamp((t - reflexGoAt.current) / dur, 0, 1);
			nerve = p;
			litOrgans.brain = p >= 0.98 ? 1 : 0;
		}
		if (tab === 'digestion') {
			const hoursSince = ((nowHour - mealAt + 24) % 24) || 0.01;
			if (hoursSince < 2) litOrgans.stomach = 1;
			else if (hoursSince < 6) litOrgans.smallIntestine = 1;
			else if (hoursSince < 30) litOrgans.largeIntestine = 1;
		}

		return {
			heightScale,
			widthScale,
			reveal: revealT,
			heartPulse: (t % heartPeriod) / heartPeriod,
			lungPhase: (t % lungPeriod) / lungPeriod,
			litOrgans,
			fillLevel,
			surface,
			nerve,
			autoTurn: true,
		};
	}, [
		tab,
		t,
		bpm,
		breaths,
		wake,
		sleep,
		caffMg,
		caffAt,
		glasses,
		outsideTemp,
		altitude,
		mealAt,
		nowHour,
		reflexState,
		reflexMs,
		heightScale,
		widthScale,
		revealT,
	]);

	function startReflex() {
		setReflexState('waiting');
		setReflexMs(null);
		const delay = 900 + Math.random() * 1800;
		reflexTimer.current = window.setTimeout(() => {
			reflexGoAt.current = performance.now();
			setReflexState('go');
		}, delay);
	}
	function tapReflex() {
		if (reflexState === 'waiting') {
			clearTimeout(reflexTimer.current);
			setReflexState('idle'); // tapped too early
			return;
		}
		if (reflexState === 'go') {
			const ms = performance.now() - reflexGoAt.current;
			setReflexMs(ms);
			setReflexState('done');
		}
	}

	if (!entered) {
		return (
			<div className="not-prose rounded-2xl border border-white/10 bg-black p-8 sm:p-12">
				<p className="text-eyebrow uppercase text-neutral-400">Step one</p>
				<h2 className="mt-4 text-h3 text-neutral-50">Build a figure to hang the numbers on.</h2>
				<p className="mt-3 max-w-md text-body text-neutral-400">
					Roughly is fine — this isn't a form that goes anywhere. It just gives the ten readings
					below a body to happen to, instead of ten floating gauges.
				</p>
				<form
					className="mt-8 flex flex-wrap items-end gap-6"
					onSubmit={(e) => {
						e.preventDefault();
						setEntered(true);
					}}
				>
					<label className="flex flex-col gap-2 text-small text-neutral-400">
						Height (cm)
						<input
							type="number"
							min={120}
							max={220}
							value={heightCm}
							onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
							className="w-28 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-body text-neutral-50 tabular-nums"
						/>
					</label>
					<label className="flex flex-col gap-2 text-small text-neutral-400">
						Weight (kg)
						<input
							type="number"
							min={30}
							max={180}
							value={weightKg}
							onChange={(e) => setWeightKg(Number(e.target.value) || 68)}
							className="w-28 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-body text-neutral-50 tabular-nums"
						/>
					</label>
					<button
						type="submit"
						className="rounded-full bg-teal-400 px-6 py-2.5 text-small font-medium text-neutral-950 transition-colors hover:bg-teal-300"
					>
						Build the figure
					</button>
				</form>
			</div>
		);
	}

	const activeTab = TABS.find((tb) => tb.id === tab)!;

	return (
		<div className="not-prose">
			<div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
				{/* The 3D canvas needs a real height, and on a phone this column is
				    full-width — so cap it there and let it grow only once there's an
				    actual side column at sm:. */}
				<div className="rounded-2xl border border-white/10 bg-black p-2">
					<div className="h-[300px] w-full sm:h-[440px]">
						<BodyFigure3D state={body3D} />
					</div>
					<p className="px-2 pb-1 text-center text-small text-neutral-600">Drag to turn</p>
				</div>

				<div className="rounded-2xl border border-white/10 bg-black p-6 sm:p-8">
					<div className="flex flex-wrap gap-2">
						{TABS.map((tb) => (
							<button
								key={tb.id}
								type="button"
								onClick={() => setTab(tb.id)}
								className={[
									'rounded-full border px-3.5 py-1.5 text-small transition-colors',
									tb.id === tab
										? 'border-teal-400/50 bg-teal-400/10 text-teal-300'
										: 'border-white/10 text-neutral-400 hover:border-white/25 hover:text-neutral-200',
								].join(' ')}
							>
								{tb.label}
							</button>
						))}
					</div>

					<p className="mt-6 text-small text-neutral-500">{activeTab.blurb}</p>

					<div className="mt-6">
						{tab === 'pulse' && (
							<div className="flex flex-col gap-4">
								<Field label={`${bpm} bpm`}>
									<input
										type="range"
										min={30}
										max={200}
										value={bpm}
										onChange={(e) => setBpm(Number(e.target.value))}
										className="w-full accent-teal-400"
									/>
								</Field>
								<a href="/microtools/pulse" className="w-fit text-small text-teal-300 hover:text-teal-200">
									Want the full ECG-style trace? →
								</a>
							</div>
						)}

						{tab === 'breath' && (
							<Field label={`${breaths} breaths / min`}>
								<input
									type="range"
									min={6}
									max={40}
									value={breaths}
									onChange={(e) => setBreaths(Number(e.target.value))}
									className="w-full accent-teal-400"
								/>
							</Field>
						)}

						{tab === 'clock' && (
							<div className="flex flex-wrap gap-6">
								<Field label={`Wake ${formatHour(wake)}`}>
									<input type="range" min={0} max={23} value={wake} onChange={(e) => setWake(Number(e.target.value))} className="w-full accent-teal-400" />
								</Field>
								<Field label={`Sleep ${formatHour(sleep)}`}>
									<input type="range" min={0} max={23} value={sleep} onChange={(e) => setSleep(Number(e.target.value))} className="w-full accent-teal-400" />
								</Field>
								<p className="w-full text-small text-neutral-500">It's {formatHour(nowHour)} right now, by your device's clock.</p>
							</div>
						)}

						{tab === 'caffeine' && (
							<div className="flex flex-wrap gap-6">
								<Field label={`${caffMg} mg, around ${formatHour(caffAt)}`}>
									<input type="range" min={0} max={400} step={5} value={caffMg} onChange={(e) => setCaffMg(Number(e.target.value))} className="w-full accent-teal-400" />
								</Field>
								<Field label="When">
									<input type="range" min={0} max={23} value={caffAt} onChange={(e) => setCaffAt(Number(e.target.value))} className="w-full accent-teal-400" />
								</Field>
								<p className="w-full text-small text-neutral-500">Illustrative — real half-life varies a lot by person, roughly 5 hours here.</p>
							</div>
						)}

						{tab === 'hydration' && (
							<Field label={`${glasses} glasses today`}>
								<input type="range" min={0} max={10} value={glasses} onChange={(e) => setGlasses(Number(e.target.value))} className="w-full accent-teal-400" />
							</Field>
						)}

						{tab === 'reflex' && (
							<div className="flex flex-col gap-4">
								{reflexState === 'idle' && (
									<button type="button" onClick={startReflex} className="w-fit rounded-full border border-white/15 px-5 py-2 text-small text-neutral-300 hover:border-white/30 hover:text-neutral-50">
										Start
									</button>
								)}
								{(reflexState === 'waiting' || reflexState === 'go') && (
									<button
										type="button"
										onClick={tapReflex}
										className={[
											'w-fit rounded-full px-6 py-2.5 text-small font-medium transition-colors',
											reflexState === 'go' ? 'bg-teal-400 text-neutral-950' : 'bg-white/10 text-neutral-400',
										].join(' ')}
									>
										{reflexState === 'go' ? 'Tap now' : 'Wait for it…'}
									</button>
								)}
								{reflexState === 'done' && reflexMs && (
									<div>
										<p className="text-body text-neutral-200">
											{Math.round(reflexMs)} ms — signal ran hand → spine → head at that speed above.
										</p>
										<button type="button" onClick={startReflex} className="mt-3 text-small text-teal-300 hover:text-teal-200">
											Again →
										</button>
									</div>
								)}
							</div>
						)}

						{tab === 'steps' && <StepsField steps={steps} setSteps={setSteps} />}

						{tab === 'temperature' && (
							<Field label={`${outsideTemp}°C outside`}>
								<input type="range" min={-10} max={45} value={outsideTemp} onChange={(e) => setOutsideTemp(Number(e.target.value))} className="w-full accent-teal-400" />
							</Field>
						)}

						{tab === 'altitude' && (
							<Field label={`${altitude} m — breathing ~${Math.round(breathingRateForAltitude(altitude))}/min to compensate`}>
								<input type="range" min={0} max={6000} step={100} value={altitude} onChange={(e) => setAltitude(Number(e.target.value))} className="w-full accent-teal-400" />
							</Field>
						)}

						{tab === 'digestion' && (
							<Field label={`Ate around ${formatHour(mealAt)}`}>
								<input type="range" min={0} max={23} value={mealAt} onChange={(e) => setMealAt(Number(e.target.value))} className="w-full accent-teal-400" />
							</Field>
						)}
					</div>
				</div>
			</div>

			<p className="mt-6 text-small text-neutral-500">
				Nothing on this page is measured, saved, or sent anywhere. Every curve is a known
				physiological approximation, not a reading of you — and definitely not a diagnosis.
			</p>
		</div>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<label className="flex flex-1 flex-col gap-2 text-small text-neutral-400">
			<span className="tabular-nums text-neutral-300">{label}</span>
			{children}
		</label>
	);
}

function StepsField({ steps, setSteps }: { steps: number; setSteps: (n: number) => void }) {
	const km = (steps * 0.000762).toFixed(1);
	const comparisons = [
		{ upTo: 1500, text: 'about one Delhi Metro stop apart' },
		{ upTo: 4000, text: 'a walk across most of a park' },
		{ upTo: 8000, text: 'roughly a full football pitch, walked end to end forty times' },
		{ upTo: 14000, text: 'close to a full lap of a large city block, several times over' },
		{ upTo: Infinity, text: 'far enough that it stops feeling like a number and starts feeling like a decision' },
	];
	const line = comparisons.find((c) => steps <= c.upTo)!.text;
	return (
		<Field label={`${steps.toLocaleString()} steps ≈ ${km} km — ${line}`}>
			<input type="range" min={0} max={20000} step={250} value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="w-full accent-teal-400" />
		</Field>
	);
}

function formatHour(h: number): string {
	const hh = Math.floor(((h % 24) + 24) % 24);
	const mm = Math.round((h - Math.floor(h)) * 60);
	const period = hh < 12 ? 'am' : 'pm';
	const h12 = hh % 12 === 0 ? 12 : hh % 12;
	return `${h12}:${String(mm).padStart(2, '0')}${period}`;
}

/** Resting breathing rate rises with altitude as the body compensates for
 * lower oxygen partial pressure — a simplified, illustrative interpolation. */
function breathingRateForAltitude(m: number): number {
	if (m <= 1500) return 14;
	if (m >= 5500) return 26;
	return lerp(14, 26, (m - 1500) / 4000);
}
