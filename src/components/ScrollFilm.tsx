import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-as-playhead (#2): the film pins to the viewport while the visitor
 * scrolls through a tall section, and scroll progress drives video.currentTime
 * — you scrub the film by travelling, which is native to touch and costs
 * nothing at rest (frames only advance when scroll events arrive).
 *
 * No scroll-jacking: the page scrolls normally; the video is simply driven.
 * Reduced motion (or metadata failure): a plain <video controls> instead.
 */
interface Props {
	src: string;
	poster?: string;
	title: string;
	/** Total scrub distance, in viewport-heights (default 2.6). */
	lengthVh?: number;
}

export default function ScrollFilm({ src, poster, title, lengthVh = 2.6 }: Props) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	const tcRef = useRef<HTMLSpanElement>(null);
	const [plain, setPlain] = useState(false);

	useEffect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setPlain(true);
			return;
		}
		const wrap = wrapRef.current;
		const video = videoRef.current;
		if (!wrap || !video) return;

		let duration = 0;
		const onMeta = () => {
			duration = video.duration || 0;
		};
		video.addEventListener('loadedmetadata', onMeta);
		if (video.readyState >= 1) onMeta();

		let raf = 0;
		let pending = false;
		const apply = () => {
			raf = 0;
			pending = false;
			if (!duration) return;
			const r = wrap.getBoundingClientRect();
			const scrollable = r.height - window.innerHeight;
			if (scrollable <= 0) return;
			const p = Math.min(1, Math.max(0, -r.top / scrollable));
			const t = p * Math.max(0, duration - 0.05);
			// only seek when it moves the playhead perceptibly
			if (Math.abs(video.currentTime - t) > 0.033) video.currentTime = t;
			if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(2)}%`;
			if (tcRef.current) {
				const s = Math.floor(t);
				tcRef.current.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
			}
		};
		const onScroll = () => {
			if (pending) return;
			pending = true;
			raf = requestAnimationFrame(apply);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		onScroll();

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			video.removeEventListener('loadedmetadata', onMeta);
			if (raf) cancelAnimationFrame(raf);
		};
	}, []);

	if (plain) {
		return (
			<div style={{ maxWidth: 896, margin: '0 auto', padding: '0 24px 64px' }}>
				<video
					src={src}
					poster={poster}
					controls
					playsInline
					preload="metadata"
					style={{ width: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
				/>
			</div>
		);
	}

	return (
		<div ref={wrapRef} style={{ height: `${lengthVh * 100}vh`, position: 'relative' }}>
			<div
				style={{
					position: 'sticky',
					top: 0,
					height: '100vh',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '0 24px',
				}}
			>
				<div style={{ width: 'min(896px, 100%)' }}>
					<div
						className="glow-frame rounded-2xl"
						style={{ borderRadius: 16 }}
					>
						<div
							className="glow-frame__inner"
							style={{
								aspectRatio: '16 / 9',
								overflow: 'hidden',
								border: '1px solid rgba(255,255,255,0.1)',
								background: '#000',
							}}
						>
							<video
								ref={videoRef}
								src={src}
								poster={poster}
								muted
								playsInline
								preload="auto"
								aria-label={title}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</div>
					</div>
					{/* the playhead the visitor is holding */}
					<div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
						<div
							style={{
								position: 'relative',
								flex: 1,
								height: 2,
								background: 'rgba(255,255,255,0.12)',
								borderRadius: 1,
							}}
						>
							<div
								ref={barRef}
								style={{
									position: 'absolute',
									left: 0,
									top: -1,
									height: 4,
									width: '0%',
									borderRadius: 2,
									background: 'linear-gradient(90deg, rgba(96,165,250,0.4), #60a5fa)',
								}}
							/>
						</div>
						<span
							ref={tcRef}
							style={{
								fontVariantNumeric: 'tabular-nums',
								fontSize: 13,
								letterSpacing: '0.08em',
								color: 'rgba(245,248,255,0.55)',
							}}
						>
							00:00
						</span>
					</div>
					<p
						style={{
							marginTop: 10,
							fontSize: 13,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: 'rgba(245,248,255,0.4)',
						}}
					>
						Scroll — you are the playhead
					</p>
				</div>
			</div>
		</div>
	);
}
