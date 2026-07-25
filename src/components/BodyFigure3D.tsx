import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * BodyFigure3D — the anatomical figure the Vitals tool hangs its readings on.
 *
 * Built procedurally from lathe and capsule geometry rather than loaded from a
 * medical GLTF: a real anatomical model is 10–100 MB with licensing attached,
 * which is the wrong trade for a page that has to load fast. This is a real
 * volumetric body in true 3D — you can turn it, the organs sit where they
 * actually sit, and depth is real depth — just built from maths instead of a
 * scanned mesh.
 *
 * Every reading drives it live: the heart beats on its own timing, the lungs
 * inflate on theirs, the digestive tract lights where the meal actually is,
 * and a nerve signal can run hand → shoulder → neck → brain along the arm.
 */

export type Organ = 'heart' | 'lungs' | 'brain' | 'stomach' | 'smallIntestine' | 'largeIntestine';

export type Body3DState = {
	heightScale: number; // 1 = reference 170cm
	widthScale: number; // 1 = reference build
	reveal: number; // 0..1 — the figure assembles on first entry
	heartPulse: number; // 0..1 per beat, drives the heart's scale + glow
	lungPhase: number; // 0..1 through one breath
	litOrgans: Partial<Record<Organ, number>>; // 0..1 glow per organ
	fillLevel: number | null; // 0..1 hydration plane, feet upward
	surface: 'none' | 'cold' | 'hot';
	nerve: number | null; // 0..1 along the arm→brain path
	autoTurn: boolean;
};

const SKIN = 0xd8c3b0;
const SKIN_COLD = 0xb6c9dc;
const SKIN_HOT = 0xe0a898;
const TEAL = 0x2dd4bf;
const AMBER = 0xf0be78;

/** Half-widths (in body units) sampled head→foot; revolved into a torso. */
const TORSO_PROFILE: [number, number][] = [
	// [y, radius]
	[1.52, 0.0],
	[1.5, 0.2],
	[1.44, 0.29],
	[1.36, 0.31],
	[1.3, 0.22], // neck
	[1.26, 0.2],
	[1.2, 0.36], // shoulders
	[1.1, 0.4],
	[0.98, 0.39], // chest
	[0.86, 0.35],
	[0.76, 0.32], // waist
	[0.68, 0.34],
	[0.58, 0.38], // hips
	[0.5, 0.36],
	[0.44, 0.3],
];

function buildTorso(): THREE.BufferGeometry {
	const pts = TORSO_PROFILE.map(([y, r]) => new THREE.Vector2(Math.max(r, 0.001), y));
	// Lathe revolves around Y — an ellipse-ish body is closer to real than a
	// perfect cylinder, so scale Z down after the fact.
	const g = new THREE.LatheGeometry(pts, 48);
	g.scale(1, 1, 0.72);
	return g;
}

function limb(len: number, rTop: number, rBot: number): THREE.BufferGeometry {
	return new THREE.CylinderGeometry(rTop, rBot, len, 20, 1, false);
}

export default function BodyFigure3D({ state }: { state: Body3DState }) {
	const mountRef = useRef<HTMLDivElement>(null);
	const stateRef = useRef(state);
	stateRef.current = state;

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) return;

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
		mount.appendChild(renderer.domElement);
		renderer.domElement.style.width = '100%';
		renderer.domElement.style.height = '100%';
		renderer.domElement.style.display = 'block';
		renderer.domElement.style.touchAction = 'pan-y';
		renderer.domElement.style.cursor = 'grab';

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
		camera.position.set(0, 1.0, 5.2);
		camera.lookAt(0, 0.95, 0);

		// Light: one cool key from the front-left, a warm rim behind-right, and a
		// low fill so the underside never goes pure black.
		scene.add(new THREE.AmbientLight(0xffffff, 0.55));
		const key = new THREE.DirectionalLight(0xdfe9ff, 1.5);
		key.position.set(-2.5, 3, 3.5);
		scene.add(key);
		const rim = new THREE.DirectionalLight(0xffd9a8, 1.1);
		rim.position.set(3, 1.6, -2.5);
		scene.add(rim);
		const fill = new THREE.DirectionalLight(0xffffff, 0.3);
		fill.position.set(0, -2, 2);
		scene.add(fill);

		// ——— the body ———
		const root = new THREE.Group();
		scene.add(root);

		const skinMat = new THREE.MeshStandardMaterial({
			color: SKIN,
			roughness: 0.72,
			metalness: 0.02,
			transparent: true,
			opacity: 0.34, // translucent, so the organs inside read
			depthWrite: false,
		});

		const torso = new THREE.Mesh(buildTorso(), skinMat);
		root.add(torso);

		const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 24), skinMat);
		head.position.set(0, 1.62, 0);
		head.scale.set(1, 1.12, 0.94);
		root.add(head);

		// arms — upper + fore, angled slightly out from the body
		const arms: THREE.Group[] = [];
		for (const side of [-1, 1]) {
			const arm = new THREE.Group();
			const upper = new THREE.Mesh(limb(0.46, 0.075, 0.062), skinMat);
			upper.position.y = -0.23;
			arm.add(upper);
			const fore = new THREE.Group();
			fore.position.y = -0.46;
			const foreMesh = new THREE.Mesh(limb(0.44, 0.06, 0.048), skinMat);
			foreMesh.position.y = -0.22;
			fore.add(foreMesh);
			const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), skinMat);
			hand.position.y = -0.46;
			hand.scale.set(1, 1.25, 0.6);
			fore.add(hand);
			arm.add(fore);
			arm.position.set(side * 0.42, 1.18, 0);
			arm.rotation.z = side * 0.16;
			root.add(arm);
			arms.push(arm);
		}

		// legs
		for (const side of [-1, 1]) {
			const leg = new THREE.Group();
			const thigh = new THREE.Mesh(limb(0.56, 0.12, 0.095), skinMat);
			thigh.position.y = -0.28;
			leg.add(thigh);
			const shin = new THREE.Mesh(limb(0.54, 0.09, 0.06), skinMat);
			shin.position.y = -0.83;
			leg.add(shin);
			const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.22), skinMat);
			foot.position.set(0, -1.12, 0.06);
			leg.add(foot);
			leg.position.set(side * 0.16, 0.44, 0);
			root.add(leg);
		}

		// ——— organs, at real anatomical positions ———
		const organMat = (color: number, opacity = 0.95) =>
			new THREE.MeshStandardMaterial({
				color,
				emissive: color,
				emissiveIntensity: 0.25,
				roughness: 0.45,
				transparent: true,
				opacity,
			});

		// heart — slightly left of centre, behind the sternum
		const heart = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), organMat(0xff5a6a));
		heart.position.set(-0.06, 1.08, 0.04);
		heart.scale.set(1, 1.15, 0.85);
		root.add(heart);

		// lungs — a pair flanking the heart
		const lungs: THREE.Mesh[] = [];
		for (const side of [-1, 1]) {
			const lung = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18), organMat(0x7fb8e8, 0.75));
			lung.position.set(side * 0.16, 1.12, 0);
			lung.scale.set(0.85, 1.5, 0.8);
			root.add(lung);
			lungs.push(lung);
		}

		// brain
		const brain = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 18), organMat(0xc9a7ff, 0.85));
		brain.position.set(0, 1.66, 0);
		brain.scale.set(1, 0.92, 1.05);
		root.add(brain);

		// stomach
		const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), organMat(AMBER, 0.85));
		stomach.position.set(-0.09, 0.9, 0.02);
		stomach.scale.set(1.15, 0.9, 0.8);
		root.add(stomach);

		// small intestine — a coiled torus knot reads better than a sphere here
		const smallIntestine = new THREE.Mesh(
			new THREE.TorusKnotGeometry(0.13, 0.032, 90, 10, 2, 3),
			organMat(AMBER, 0.8)
		);
		smallIntestine.position.set(0, 0.72, 0.01);
		smallIntestine.scale.set(1, 0.85, 0.6);
		root.add(smallIntestine);

		// large intestine — a frame around the small one
		const largeIntestine = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.036, 12, 40), organMat(AMBER, 0.8));
		largeIntestine.position.set(0, 0.73, 0);
		largeIntestine.scale.set(1, 1.05, 0.5);
		root.add(largeIntestine);

		const ORGANS: Record<Organ, THREE.Mesh | THREE.Mesh[]> = {
			heart,
			lungs,
			brain,
			stomach,
			smallIntestine,
			largeIntestine,
		};

		// hydration plane — a translucent surface that rises through the body
		const waterMat = new THREE.MeshStandardMaterial({
			color: 0x38bdf8,
			transparent: true,
			opacity: 0.22,
			roughness: 0.2,
		});
		const water = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 32), waterMat);
		water.visible = false;
		root.add(water);

		// nerve signal — a bright bead that runs the arm up to the brain
		const nerveMat = new THREE.MeshBasicMaterial({ color: TEAL });
		const nerve = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), nerveMat);
		nerve.visible = false;
		root.add(nerve);
		const NERVE_PATH = [
			new THREE.Vector3(0.52, 0.34, 0.05), // hand
			new THREE.Vector3(0.46, 0.86, 0.02), // elbow
			new THREE.Vector3(0.4, 1.2, 0), // shoulder
			new THREE.Vector3(0.1, 1.38, 0), // neck
			new THREE.Vector3(0, 1.64, 0), // brain
		];

		// ——— interaction: drag to turn ———
		let dragging = false;
		let lastX = 0;
		let spin = 0;
		let spinVel = 0;
		const onDown = (e: PointerEvent) => {
			dragging = true;
			lastX = e.clientX;
			renderer.domElement.style.cursor = 'grabbing';
			renderer.domElement.setPointerCapture(e.pointerId);
		};
		const onMove = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - lastX;
			lastX = e.clientX;
			spinVel = dx * 0.006;
			spin += spinVel;
		};
		const onUp = (e: PointerEvent) => {
			dragging = false;
			renderer.domElement.style.cursor = 'grab';
			try {
				renderer.domElement.releasePointerCapture(e.pointerId);
			} catch {
				/* pointer already released */
			}
		};
		renderer.domElement.addEventListener('pointerdown', onDown);
		renderer.domElement.addEventListener('pointermove', onMove);
		renderer.domElement.addEventListener('pointerup', onUp);
		renderer.domElement.addEventListener('pointercancel', onUp);

		// ——— sizing ———
		const resize = () => {
			const r = mount.getBoundingClientRect();
			const w = Math.max(1, r.width);
			const h = Math.max(1, r.height);
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(mount);

		// ——— frame ———
		let raf = 0;
		let running = false;

		function frame() {
			const s = stateRef.current;

			// proportions
			root.scale.set(s.widthScale, s.heightScale, s.widthScale);

			// assemble on entry: rise and fade in
			const rv = Math.min(1, Math.max(0, s.reveal));
			root.position.y = (1 - rv) * -0.45;
			skinMat.opacity = 0.34 * rv;
			for (const m of [heart, brain, stomach, smallIntestine, largeIntestine, ...lungs]) {
				(m.material as THREE.MeshStandardMaterial).opacity =
					(m === heart ? 0.95 : m === brain ? 0.85 : 0.8) * rv;
			}

			// surface temperature
			skinMat.color.setHex(s.surface === 'cold' ? SKIN_COLD : s.surface === 'hot' ? SKIN_HOT : SKIN);

			// heart: a real double-thump, and it glows on the beat
			const hp = s.heartPulse;
			const thump = hp < 0.18 ? 1 - hp / 0.18 : hp < 0.34 ? 0.45 * (1 - (hp - 0.18) / 0.16) : 0;
			heart.scale.set(1 + thump * 0.22, (1 + thump * 0.22) * 1.15, (1 + thump * 0.22) * 0.85);
			(heart.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + thump * 1.5;

			// lungs inflate on their own clock
			const lp = 1 + 0.16 * Math.sin(s.lungPhase * Math.PI * 2);
			for (const l of lungs) l.scale.set(0.85 * lp, 1.5 * lp, 0.8 * lp);
			// the chest follows the breath, subtly
			torso.scale.set(1 + (lp - 1) * 0.35, 1, 1 + (lp - 1) * 0.5);

			// organ highlighting
			(Object.keys(ORGANS) as Organ[]).forEach((k) => {
				const lit = s.litOrgans[k] ?? 0;
				const target = ORGANS[k];
				const meshes = Array.isArray(target) ? target : [target];
				for (const m of meshes) {
					const mat = m.material as THREE.MeshStandardMaterial;
					if (k === 'heart') continue; // heart runs its own beat above
					mat.emissiveIntensity = 0.25 + lit * 1.6;
				}
			});

			// hydration
			if (s.fillLevel == null) {
				water.visible = false;
			} else {
				water.visible = true;
				const yBottom = -0.15;
				const yTop = 1.5;
				water.position.y = yBottom + (yTop - yBottom) * s.fillLevel;
				const t = s.fillLevel;
				water.scale.setScalar(t < 0.35 ? 0.5 : t < 0.7 ? 0.95 : 1);
			}

			// nerve signal along the arm
			if (s.nerve == null) {
				nerve.visible = false;
			} else {
				nerve.visible = true;
				const p = Math.min(0.999, Math.max(0, s.nerve)) * (NERVE_PATH.length - 1);
				const i = Math.floor(p);
				nerve.position.lerpVectors(NERVE_PATH[i], NERVE_PATH[i + 1], p - i);
			}

			// turn: drag wins, otherwise a slow idle rotation
			if (!dragging) {
				spinVel *= 0.94; // inertia after a flick
				spin += spinVel;
				if (s.autoTurn && Math.abs(spinVel) < 0.0015) spin += 0.0022;
			}
			root.rotation.y = spin;

			renderer.render(scene, camera);
			raf = requestAnimationFrame(frame);
		}

		const start = () => {
			if (running) return;
			running = true;
			raf = requestAnimationFrame(frame);
		};
		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		if (reduce) {
			// one composed frame, no loop
			root.rotation.y = 0.35;
			renderer.render(scene, camera);
		} else {
			start();
		}

		const onVis = () => {
			if (reduce) return;
			if (document.hidden) stop();
			else start();
		};
		document.addEventListener('visibilitychange', onVis);

		return () => {
			stop();
			document.removeEventListener('visibilitychange', onVis);
			ro.disconnect();
			renderer.domElement.removeEventListener('pointerdown', onDown);
			renderer.domElement.removeEventListener('pointermove', onMove);
			renderer.domElement.removeEventListener('pointerup', onUp);
			renderer.domElement.removeEventListener('pointercancel', onUp);
			scene.traverse((o) => {
				const m = o as THREE.Mesh;
				if (m.geometry) m.geometry.dispose();
				const mat = m.material as THREE.Material | THREE.Material[] | undefined;
				if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
				else mat?.dispose();
			});
			renderer.dispose();
			if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
		};
	}, []);

	return <div ref={mountRef} className="h-full w-full" />;
}
