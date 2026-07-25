/**
 * BodyFigure — the shared figure every Vitals module draws on. Deliberately
 * simple: a stylized, rounded silhouette built from ellipses, not an
 * anatomical illustration. It exists to give ten different inputs one
 * consistent place to show up, the way a real chart gives ten readings one
 * consistent patient.
 *
 * Anchor points below are approximate positions within the 240×460 viewBox,
 * exported so each Vitals module can target the right spot without
 * duplicating the figure's geometry.
 */

export const ANCHORS = {
	heart: { x: 132, y: 150 },
	head: { x: 120, y: 50 },
	rightHand: { x: 188, y: 232 },
	rightShoulder: { x: 176, y: 140 },
	neck: { x: 120, y: 92 },
	stomach: { x: 148, y: 148 },
	smallIntestine: { x: 112, y: 188 },
	largeIntestine: { x: 96, y: 226 },
	feet: { x: 120, y: 432 },
	torsoTop: 96,
	torsoBottom: 246,
	figureTop: 18,
	figureBottom: 432,
};

export type Glow = { x: number; y: number; r: number; color: string; opacity: number };

export type BodyFigureProps = {
	glows?: Glow[];
	breathScale?: number; // 1 = neutral; >1 inhale, <1 exhale
	fillLevel?: number; // 0..1, hydration overlay height from the feet up
	tint?: 'none' | 'cold' | 'hot';
	ringHours?: number[]; // 24 values, 0..1 — the circadian ring, hour by hour
	nowHour?: number; // 0..24, where the ring's "now" marker sits
	pathDot?: { x: number; y: number; opacity: number; color: string } | null;
	heightScale?: number; // 1 = reference 170cm — stretches the whole figure vertically
	widthScale?: number; // 1 = reference build — widens torso + limbs
	reveal?: number; // 0..1 — the figure draws itself in on first entry
};

const skinBase = 'rgba(226, 210, 196, 0.9)';

export default function BodyFigure({
	glows = [],
	breathScale = 1,
	fillLevel,
	tint = 'none',
	ringHours,
	nowHour,
	pathDot,
	heightScale = 1,
	widthScale = 1,
	reveal = 1,
}: BodyFigureProps) {
	const torsoRy = 76 * breathScale;
	const skinFill =
		tint === 'cold' ? 'rgba(186, 208, 226, 0.85)' : tint === 'hot' ? 'rgba(232, 190, 178, 0.9)' : skinBase;

	const cx = 120,
		cy = 230,
		ringR = 214;

	// the figure draws itself in from the feet up on first entry — a real
	// reveal, not a fade: the ground giving you a body, not a dialog popping.
	const revealClip = `inset(${(1 - reveal) * 100}% 0 0 0)`;

	return (
		<svg viewBox="0 0 240 460" className="h-full w-full" aria-hidden="true">
			<defs>
				<clipPath id="body-clip">
					<ellipse cx={120} cy={50} rx={30} ry={32} />
					<ellipse cx={120} cy={170} rx={52} ry={torsoRy} />
					<ellipse cx={52} cy={170} rx={18} ry={70} />
					<ellipse cx={188} cy={170} rx={18} ry={70} />
					<ellipse cx={98} cy={340} rx={22} ry={90} />
					<ellipse cx={142} cy={340} rx={22} ry={90} />
				</clipPath>
			</defs>

			{/* circadian ring — 24 radial ticks, one per hour */}
			{ringHours && (
				<g>
					{ringHours.map((v, h) => {
						const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
						const r1 = ringR - 10;
						const r2 = ringR - 10 - 8 - v * 16;
						return (
							<line
								key={h}
								x1={cx + Math.cos(a) * r1}
								y1={cy + Math.sin(a) * r1}
								x2={cx + Math.cos(a) * r2}
								y2={cy + Math.sin(a) * r2}
								stroke="rgba(45, 212, 191, 0.65)"
								strokeWidth={3}
								strokeLinecap="round"
								opacity={0.3 + v * 0.6}
							/>
						);
					})}
					{typeof nowHour === 'number' && (
						<circle
							cx={cx + Math.cos((nowHour / 24) * Math.PI * 2 - Math.PI / 2) * (ringR - 10)}
							cy={cy + Math.sin((nowHour / 24) * Math.PI * 2 - Math.PI / 2) * (ringR - 10)}
							r={5}
							fill="#f5f5f5"
						/>
					)}
				</g>
			)}

			{/* the figure — grows from the feet up (height) and widens from the
			    spine out (build); reveal clips it in from the ground on first entry */}
			<g
				transform={`translate(120,432) scale(${widthScale},${heightScale}) translate(-120,-432)`}
				style={{ clipPath: revealClip, transition: 'clip-path 0.05s linear' }}
			>
				<ellipse cx={120} cy={50} rx={30} ry={32} fill={skinFill} />
				<ellipse cx={52} cy={170} rx={18} ry={70} fill={skinFill} opacity={0.92} />
				<ellipse cx={188} cy={170} rx={18} ry={70} fill={skinFill} opacity={0.92} />
				<ellipse cx={98} cy={340} rx={22} ry={90} fill={skinFill} opacity={0.92} />
				<ellipse cx={142} cy={340} rx={22} ry={90} fill={skinFill} opacity={0.92} />
				<ellipse cx={120} cy={170} rx={52} ry={torsoRy} fill={skinFill} />

				{/* cold/hot surface texture */}
				{tint === 'cold' &&
					Array.from({ length: 18 }).map((_, i) => {
						const a = (i / 18) * Math.PI * 2;
						const r = 46;
						return (
							<circle
								key={i}
								cx={120 + Math.cos(a) * r}
								cy={170 + Math.sin(a) * r * (torsoRy / 76)}
								r={1.4}
								fill="rgba(148, 197, 226, 0.6)"
							/>
						);
					})}
				{tint === 'hot' && (
					<ellipse cx={120} cy={150} rx={40} ry={torsoRy * 0.5} fill="rgba(255,255,255,0.14)" />
				)}
			</g>

			{/* hydration fill, clipped to the body's own silhouette */}
			{typeof fillLevel === 'number' && (
				<g clipPath="url(#body-clip)">
					<rect
						x={0}
						y={460 - fillLevel * 460}
						width={240}
						height={fillLevel * 460}
						fill="rgba(56, 189, 248, 0.32)"
					/>
				</g>
			)}

			{/* glows: heart pulse rings, caffeine haze, digestion marker, reflex dot */}
			{glows.map((g, i) => (
				<circle
					key={i}
					cx={g.x}
					cy={g.y}
					r={g.r}
					fill={g.color}
					opacity={g.opacity}
					style={{ mixBlendMode: 'screen' }}
				/>
			))}

			{pathDot && <circle cx={pathDot.x} cy={pathDot.y} r={5} fill={pathDot.color} opacity={pathDot.opacity} />}
		</svg>
	);
}
