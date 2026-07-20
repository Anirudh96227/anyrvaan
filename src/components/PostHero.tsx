import { useEffect, useRef } from 'react';

// PostHero — a topic-literal, touch-reactive hero for a blog post. One island,
// many bespoke "engines": each enacts its post's subject and answers to mouse
// AND touch (pointer events, so both share one path). Same visual language as
// the rest of the site — near-black ground, cobalt + ice-white light — scaled
// into a generative banner. Each engine owns its own drawing context (2D or
// WebGL), so a shader hero sits beside the physics ones behind one interface.
//
// Shared behavior lives in the component: DPR-correct sizing, pause when the
// hero is off-screen or the tab is hidden, a single still frame under reduced
// motion, and pointer routing. The engines just advance and draw.

export type PostHeroVariant =
	| 'index-swarm'
	| 'cell-flood'
	| 'stubborn-path'
	| 'two-tempos'
	| 'vanishing-ui'
	| 'three-throws'
	| 'strata-dig';

interface PostHeroProps {
	variant: PostHeroVariant;
}

// Site palette, as raw channel strings so alpha can be composed inline.
const COBALT = '96,165,250';
const ICE = '147,197,253';
const BRIGHT = '198,220,255';
const WHITE = '235,235,235';

// The small HUD caption per variant: a verb + a whispered hint, matching the
// tone of the site's other captions ("visual verb" that names the motion).
const CAPTIONS: Record<PostHeroVariant, { verb: string; hint: string }> = {
	'index-swarm': { verb: 'INDEX', hint: 'a hundred, filed as one' },
	'cell-flood': { verb: 'OVERFLOW', hint: 'a thousand cells, no insight' },
	'stubborn-path': { verb: 'DETOUR', hint: 'the shortest path, refused' },
	'two-tempos': { verb: 'TEMPO', hint: 'one system, two clocks' },
	'vanishing-ui': { verb: 'ON DEMAND', hint: 'the interface, only when touched' },
	'three-throws': { verb: 'DISCARD', hint: 'three drafts, all thrown' },
	'strata-dig': { verb: 'EXCAVATE', hint: 'dig through the layers' },
};

// Every engine implements this. x/y are CSS pixels relative to the canvas.
interface Engine {
	resize(): void;
	frame(dtMs: number): void;
	staticFrame(): void;
	pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number): void;
	dispose(): void;
}

type PointerState = {
	x: number;
	y: number;
	px: number;
	py: number;
	vx: number;
	vy: number;
	down: boolean;
};
const newPointer = (): PointerState => ({ x: -1, y: -1, px: -1, py: -1, vx: 0, vy: 0, down: false });

// --- shared 2D sizing helper -------------------------------------------------
function fit2d(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const w = canvas.clientWidth || 1;
	const h = canvas.clientHeight || 1;
	canvas.width = Math.round(w * dpr);
	canvas.height = Math.round(h * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return { w, h };
}

// =============================================================================
// 1. index-swarm — "a hundred animations, cross-indexed". ~100 tiles rest in a
//    neat grid (the index); a press flings the nearby ones apart with momentum,
//    then they spring back into their slots. Filing, made physical.
// =============================================================================
function indexSwarm(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	type T = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; blue: boolean };
	let tiles: T[] = [];
	const p = newPointer();

	function build() {
		const cols = Math.max(8, Math.round(w / 34));
		const rows = Math.max(4, Math.round(h / 30));
		const padX = w * 0.08,
			padY = h * 0.16;
		const gw = (w - padX * 2) / cols;
		const gh = (h - padY * 2) / rows;
		tiles = [];
		let i = 0;
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) {
				const hx = padX + gw * (c + 0.5);
				const hy = padY + gh * (r + 0.5);
				tiles.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, blue: i % 7 === 0 });
				i++;
			}
	}
	function resize() {
		({ w, h } = fit2d(canvas, ctx));
		build();
	}
	function frame(dt: number) {
		const f = Math.min(2, dt / 16);
		ctx.clearRect(0, 0, w, h);
		const R = Math.min(w, h) * 0.32;
		for (const t of tiles) {
			// spring home
			t.vx += (t.hx - t.x) * 0.012 * f;
			t.vy += (t.hy - t.y) * 0.012 * f;
			if (p.down && p.x >= 0) {
				const dx = t.x - p.x,
					dy = t.y - p.y;
				const d = Math.hypot(dx, dy) || 1;
				if (d < R) {
					const push = ((R - d) / R) * 2.6 * f;
					t.vx += (dx / d) * push;
					t.vy += (dy / d) * push;
				}
			}
			t.vx *= 0.9;
			t.vy *= 0.9;
			t.x += t.vx * f;
			t.y += t.vy * f;
			const disp = Math.min(1, Math.hypot(t.x - t.hx, t.y - t.hy) / 40);
			const s = 4 + disp * 2;
			ctx.fillStyle = t.blue
				? `rgba(${COBALT},${0.5 + disp * 0.5})`
				: `rgba(${WHITE},${0.28 + disp * 0.5})`;
			ctx.fillRect(t.x - s / 2, t.y - s / 2, s, s);
		}
	}
	function staticFrame() {
		ctx.clearRect(0, 0, w, h);
		for (const t of tiles) {
			ctx.fillStyle = t.blue ? `rgba(${COBALT},0.7)` : `rgba(${WHITE},0.32)`;
			ctx.fillRect(t.hx - 2, t.hy - 2, 4, 4);
		}
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if (kind === 'down') p.down = true;
		if (kind === 'up' || kind === 'leave') p.down = false;
		p.x = x;
		p.y = y;
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 2. cell-flood — "death by a thousand cells". A spreadsheet grid fills itself,
//    cell by relentless cell, green creeping to a drowning red. Tap to clear a
//    patch — and watch it refill anyway. You can't out-type the sheet.
// =============================================================================
function cellFlood(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0,
		cols = 0,
		rows = 0;
	let level: Float32Array = new Float32Array(0);
	let digit: Uint8Array = new Uint8Array(0);

	function resize() {
		({ w, h } = fit2d(canvas, ctx));
		cols = Math.max(10, Math.round(w / 26));
		rows = Math.max(5, Math.round(h / 20));
		level = new Float32Array(cols * rows);
		digit = new Uint8Array(cols * rows);
		for (let i = 0; i < digit.length; i++) digit[i] = (Math.random() * 10) | 0;
	}
	function frame(dt: number) {
		const f = Math.min(2, dt / 16);
		// each frame, a few cells advance toward full; occasionally reroll a digit
		const bumps = Math.max(2, Math.round(cols * rows * 0.02 * f));
		for (let k = 0; k < bumps; k++) {
			const idx = (Math.random() * level.length) | 0;
			level[idx] = Math.min(1, level[idx] + 0.12 + Math.random() * 0.2);
			if (Math.random() < 0.3) digit[idx] = (Math.random() * 10) | 0;
		}
		const cw = w / cols,
			ch = h / rows;
		ctx.clearRect(0, 0, w, h);
		ctx.font = `${Math.min(ch * 0.62, 12)}px "Space Grotesk", monospace`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) {
				const i = r * cols + c;
				const L = level[i];
				const x = c * cw,
					y = r * ch;
				if (L > 0.01) {
					// green (calm) → red (overflow) as the sheet saturates
					const rr = Math.round(60 + L * 180);
					const gg = Math.round(200 - L * 150);
					ctx.fillStyle = `rgba(${rr},${gg},90,${0.1 + L * 0.5})`;
					ctx.fillRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
					ctx.fillStyle = `rgba(255,255,255,${0.25 + L * 0.5})`;
					ctx.fillText(String(digit[i]), x + cw / 2, y + ch / 2 + 0.5);
				}
			}
		// grid lines
		ctx.strokeStyle = 'rgba(255,255,255,0.06)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let c = 1; c < cols; c++) {
			ctx.moveTo(c * cw, 0);
			ctx.lineTo(c * cw, h);
		}
		for (let r = 1; r < rows; r++) {
			ctx.moveTo(0, r * ch);
			ctx.lineTo(w, r * ch);
		}
		ctx.stroke();
	}
	function staticFrame() {
		for (let i = 0; i < level.length; i++) level[i] = Math.random();
		frame(16);
	}
	function clearAround(x: number, y: number) {
		const cw = w / cols,
			ch = h / rows;
		const cc = Math.floor(x / cw),
			cr = Math.floor(y / ch);
		const rad = 2;
		for (let r = cr - rad; r <= cr + rad; r++)
			for (let c = cc - rad; c <= cc + rad; c++) {
				if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
				if (Math.hypot(c - cc, r - cr) <= rad) level[r * cols + c] = 0;
			}
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if (kind === 'down' || kind === 'move') if (x >= 0) clearAround(x, y);
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 3. stubborn-path — "least efficient on purpose". A dot travels from start to
//    goal by the most absurd route it can find, ignoring the straight line
//    printed right beside it. Drag it toward the goal and it complies — then
//    snaps back to its meander the instant you let go.
// =============================================================================
function stubbornPath(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	let path: Array<[number, number]> = [];
	let seg: number[] = [];
	let totalLen = 0;
	let travel = 0; // 0..totalLen along the path
	const dot = { x: 0, y: 0 };
	let held = false;
	let hx = 0,
		hy = 0;
	let returnT = 0;

	function build() {
		const ax = w * 0.08,
			bx = w * 0.92,
			my = h * 0.5;
		// a deliberately looping, meandering polyline from A to B
		path = [];
		const loops = 3;
		const N = 90;
		for (let i = 0; i <= N; i++) {
			const t = i / N;
			const x = ax + (bx - ax) * t;
			const y =
				my +
				Math.sin(t * Math.PI * 2 * loops) * h * 0.3 * (1 - Math.abs(t - 0.5)) +
				Math.sin(t * Math.PI * 7) * h * 0.06;
			path.push([x, y]);
		}
		seg = [];
		totalLen = 0;
		for (let i = 1; i < path.length; i++) {
			const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
			seg.push(l);
			totalLen += l;
		}
		travel = 0;
	}
	function pointAt(dist: number): [number, number] {
		let d = ((dist % totalLen) + totalLen) % totalLen;
		for (let i = 0; i < seg.length; i++) {
			if (d <= seg[i]) {
				const r = seg[i] > 0 ? d / seg[i] : 0;
				return [
					path[i][0] + (path[i + 1][0] - path[i][0]) * r,
					path[i][1] + (path[i + 1][1] - path[i][1]) * r,
				];
			}
			d -= seg[i];
		}
		return path[path.length - 1];
	}
	function resize() {
		({ w, h } = fit2d(canvas, ctx));
		build();
		const [x, y] = pointAt(0);
		dot.x = x;
		dot.y = y;
	}
	function frame(dt: number) {
		const f = Math.min(2, dt / 16);
		ctx.clearRect(0, 0, w, h);
		// the straight line it refuses (dashed)
		ctx.strokeStyle = 'rgba(255,255,255,0.14)';
		ctx.setLineDash([4, 6]);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(path[0][0], path[0][1]);
		ctx.lineTo(path[path.length - 1][0], path[path.length - 1][1]);
		ctx.stroke();
		ctx.setLineDash([]);
		// the stubborn path
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.beginPath();
		ctx.moveTo(path[0][0], path[0][1]);
		for (const pt of path) ctx.lineTo(pt[0], pt[1]);
		ctx.stroke();
		// endpoints
		for (const e of [path[0], path[path.length - 1]]) {
			ctx.fillStyle = `rgba(${ICE},0.7)`;
			ctx.beginPath();
			ctx.arc(e[0], e[1], 3, 0, Math.PI * 2);
			ctx.fill();
		}
		// advance / return
		let tx: number, ty: number;
		if (held) {
			tx = hx;
			ty = hy;
		} else {
			travel += 1.1 * f;
			const [ax, ay] = pointAt(travel);
			if (returnT > 0) {
				returnT = Math.max(0, returnT - f * 0.06);
				tx = ax;
				ty = ay;
			} else {
				tx = ax;
				ty = ay;
			}
		}
		dot.x += (tx - dot.x) * (held ? 0.35 : 0.14);
		dot.y += (ty - dot.y) * (held ? 0.35 : 0.14);
		// glowing traveller
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const g = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 18);
		g.addColorStop(0, `rgba(${COBALT},0.75)`);
		g.addColorStop(1, `rgba(${COBALT},0)`);
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(dot.x, dot.y, 18, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = `rgba(${BRIGHT},1)`;
		ctx.beginPath();
		ctx.arc(dot.x, dot.y, 3.5, 0, Math.PI * 2);
		ctx.fill();
	}
	function staticFrame() {
		const [x, y] = pointAt(totalLen * 0.32);
		dot.x = x;
		dot.y = y;
		frame(16);
	}
	function nearestTravel(x: number, y: number) {
		// snap current travel to the closest path sample, so it resumes sensibly
		let best = 0,
			bestD = Infinity,
			acc = 0;
		for (let i = 0; i < seg.length; i++) {
			const d = Math.hypot(path[i][0] - x, path[i][1] - y);
			if (d < bestD) {
				bestD = d;
				best = acc;
			}
			acc += seg[i];
		}
		travel = best;
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if (kind === 'down') {
			held = true;
			hx = x;
			hy = y;
		} else if (kind === 'move') {
			if (held) {
				hx = x;
				hy = y;
			}
		} else {
			if (held) {
				held = false;
				nearestTravel(dot.x, dot.y);
				returnT = 1;
			}
		}
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 4. two-tempos — "one system, two tempos". Two pendulums share a baseline but
//    swing to different clocks, drifting in and out of phase. Drag a bob left/
//    right to retune its tempo; release and it keeps the new time.
// =============================================================================
function twoTempos(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	// periods in seconds; independent clocks
	const bob = [
		{ period: 1.4, t: 0, trail: [] as number[] },
		{ period: 2.1, t: 0.6, trail: [] as number[] },
	];
	let held = -1;

	function resize() {
		({ w, h } = fit2d(canvas, ctx));
	}
	function pivotX(i: number) {
		return w * (i === 0 ? 0.32 : 0.68);
	}
	function frame(dt: number) {
		const sec = Math.min(0.05, dt / 1000);
		ctx.clearRect(0, 0, w, h);
		const topY = h * 0.16;
		const len = h * 0.6;
		// baseline
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(w * 0.14, topY);
		ctx.lineTo(w * 0.86, topY);
		ctx.stroke();
		for (let i = 0; i < 2; i++) {
			const b = bob[i];
			if (held !== i) b.t += sec;
			const ang = Math.sin((b.t / b.period) * Math.PI * 2) * 0.5;
			const px = pivotX(i);
			const bx = px + Math.sin(ang) * len;
			const by = topY + Math.cos(ang) * len;
			// arm
			ctx.strokeStyle = 'rgba(255,255,255,0.18)';
			ctx.beginPath();
			ctx.moveTo(px, topY);
			ctx.lineTo(bx, by);
			ctx.stroke();
			// trail
			b.trail.push(bx, by);
			if (b.trail.length > 26) b.trail.splice(0, b.trail.length - 26);
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			for (let k = 0; k < b.trail.length; k += 2) {
				const a = k / b.trail.length;
				ctx.fillStyle = `rgba(${i === 0 ? COBALT : ICE},${a * 0.35})`;
				ctx.beginPath();
				ctx.arc(b.trail[k], b.trail[k + 1], 2 + a * 3, 0, Math.PI * 2);
				ctx.fill();
			}
			// bob
			const g = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
			g.addColorStop(0, `rgba(${i === 0 ? COBALT : ICE},0.8)`);
			g.addColorStop(1, `rgba(${i === 0 ? COBALT : ICE},0)`);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(bx, by, 16, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
			ctx.fillStyle = `rgba(${BRIGHT},1)`;
			ctx.beginPath();
			ctx.arc(bx, by, 6, 0, Math.PI * 2);
			ctx.fill();
			// bpm readout
			ctx.fillStyle = 'rgba(255,255,255,0.4)';
			ctx.font = '10px "Space Grotesk", monospace';
			ctx.textAlign = 'center';
			ctx.fillText(`${Math.round(60 / b.period)} BPM`, px, topY - 8);
		}
	}
	function staticFrame() {
		frame(16);
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, _y: number) {
		if (kind === 'down') {
			held = x < w * 0.5 ? 0 : 1;
		} else if (kind === 'move' && held >= 0) {
			// horizontal position retunes the tempo: left = slow, right = fast
			const frac = Math.min(1, Math.max(0, x / w));
			bob[held].period = 2.6 - frac * 1.8; // 0.8s..2.6s
		} else if (kind === 'up' || kind === 'leave') {
			held = -1;
		}
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 5. vanishing-ui — "the best interface is no interface". A WebGL shader: at
//    rest the screen is nearly empty. Touch it and the hidden UI ripples into
//    view — a button, a slider — distorted by the wave, then gone as it passes.
//    The interface exists only where, and only while, you need it. Falls back
//    to a 2D ripple if WebGL is unavailable.
// =============================================================================
function vanishingUi(canvas: HTMLCanvasElement): Engine {
	const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
	if (!gl) return vanishingUiFallback(canvas);

	const MAX = 8;
	const ripples = Array.from({ length: MAX }, () => ({ x: 0, y: 0, start: -10 }));
	let head = 0;
	let time = 0;

	const vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
	const fsrc = `
precision highp float;
uniform vec2 res;
uniform float time;
uniform vec3 ripples[${MAX}];
float rrect(vec2 uv,vec2 c,vec2 hs,float r){vec2 d=abs(uv-c)-hs+r;return length(max(d,0.))-r;}
float ui(vec2 uv){
  float b=0.;
  float btn=rrect(uv,vec2(0.5,0.60),vec2(0.15,0.09),0.05);
  b+=smoothstep(0.008,0.0,abs(btn))*0.9;
  b+=smoothstep(0.0,-0.03,btn)*0.18;
  float tr=abs(uv.y-0.34);float inx=step(0.24,uv.x)*step(uv.x,0.76);
  b+=smoothstep(0.006,0.0,tr)*inx*0.5;
  float kn=length(uv-vec2(0.58,0.34));
  b+=smoothstep(0.03,0.0,kn)*0.9;
  return b;
}
void main(){
  vec2 uv=gl_FragCoord.xy/res; uv.y=1.-uv.y;
  float reveal=0.; vec2 disp=vec2(0.);
  for(int i=0;i<${MAX};i++){
    vec3 rp=ripples[i];
    float age=time-rp.z;
    if(rp.z<-1.||age<0.||age>1.7) continue;
    vec2 c=vec2(rp.x/res.x, rp.y/res.y);
    float d=distance(uv,c);
    float wave=sin(d*26.-age*9.);
    float ring=smoothstep(0.55,0.0,d)*exp(-age*2.1);
    reveal+=ring*(0.6+0.4*wave);
    disp+=normalize(uv-c+1e-4)*wave*ring*0.02;
  }
  float b=ui(uv+disp)*clamp(reveal,0.,1.);
  vec3 col=mix(vec3(0.015,0.02,0.03),vec3(0.4,0.66,1.0),b);
  vec2 g=abs(fract(uv*vec2(15.,8.))-0.5);
  col+=vec3(0.04,0.055,0.09)*smoothstep(0.49,0.5,max(g.x,g.y));
  gl_FragColor=vec4(col,1.);
}`;

	function compile(type: number, src: string) {
		const s = gl!.createShader(type)!;
		gl!.shaderSource(s, src);
		gl!.compileShader(s);
		return s;
	}
	const prog = gl.createProgram()!;
	gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsrc));
	gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc));
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return vanishingUiFallback(canvas);
	gl.useProgram(prog);
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const pLoc = gl.getAttribLocation(prog, 'p');
	gl.enableVertexAttribArray(pLoc);
	gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
	const uRes = gl.getUniformLocation(prog, 'res');
	const uTime = gl.getUniformLocation(prog, 'time');
	const uRip = gl.getUniformLocation(prog, 'ripples');
	const ripBuf = new Float32Array(MAX * 3);
	let dpr = 1;

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round((canvas.clientWidth || 1) * dpr);
		canvas.height = Math.round((canvas.clientHeight || 1) * dpr);
		gl!.viewport(0, 0, canvas.width, canvas.height);
	}
	function draw() {
		for (let i = 0; i < MAX; i++) {
			ripBuf[i * 3] = ripples[i].x;
			ripBuf[i * 3 + 1] = ripples[i].y;
			ripBuf[i * 3 + 2] = ripples[i].start;
		}
		gl!.uniform2f(uRes, canvas.width, canvas.height);
		gl!.uniform1f(uTime, time);
		gl!.uniform3fv(uRip, ripBuf);
		gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	}
	function frame(dt: number) {
		time += dt / 1000;
		draw();
	}
	function staticFrame() {
		// one resting ripple so reduced-motion still shows the idea
		ripples[0] = { x: canvas.width * 0.55, y: canvas.height * 0.5, start: 0 };
		time = 0.5;
		draw();
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if (kind === 'leave' || kind === 'up') return;
		if (x < 0) return;
		ripples[head] = { x: x * dpr, y: y * dpr, start: time };
		head = (head + 1) % MAX;
	}
	function dispose() {
		gl!.getExtension('WEBGL_lose_context')?.loseContext();
	}
	return { resize, frame, staticFrame, pointer, dispose };
}

// 2D fallback for vanishing-ui: touch spawns rings that briefly reveal a faint
// wireframe button/slider, then fade. Same idea, no shader.
function vanishingUiFallback(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	type R = { x: number; y: number; age: number };
	let rings: R[] = [];
	function resize() {
		({ w, h } = fit2d(canvas, ctx));
	}
	function drawUi(alpha: number) {
		ctx.strokeStyle = `rgba(${COBALT},${alpha})`;
		ctx.lineWidth = 1.4;
		const bw = w * 0.3,
			bh = h * 0.18;
		ctx.strokeRect(w * 0.5 - bw / 2, h * 0.55 - bh / 2, bw, bh);
		ctx.beginPath();
		ctx.moveTo(w * 0.26, h * 0.34);
		ctx.lineTo(w * 0.74, h * 0.34);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(w * 0.58, h * 0.34, 6, 0, Math.PI * 2);
		ctx.stroke();
	}
	function frame(dt: number) {
		const f = dt / 16;
		ctx.clearRect(0, 0, w, h);
		let maxReveal = 0;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		rings = rings.filter((r) => r.age < 90);
		for (const r of rings) {
			r.age += f;
			const rr = r.age * 3.4;
			const a = Math.max(0, 1 - r.age / 90);
			maxReveal = Math.max(maxReveal, a);
			ctx.strokeStyle = `rgba(${ICE},${a * 0.5})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.restore();
		if (maxReveal > 0.01) drawUi(maxReveal * 0.7);
	}
	function staticFrame() {
		drawUi(0.4);
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if ((kind === 'down' || kind === 'move') && x >= 0) rings.push({ x, y, age: 0 });
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 6. three-throws — "three iterations, each thrown away". A stack of draft
//    cards. Grab the top one and flick it: it tumbles off with your momentum
//    and the next rises up. Left alone, it throws one itself every few seconds.
// =============================================================================
function threeThrows(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	type Card = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		a: number;
		va: number;
		flying: boolean;
		n: number;
	};
	let cards: Card[] = [];
	let held = -1;
	let grabDX = 0,
		grabDY = 0;
	const p = newPointer();
	let idle = 0;

	function restY(i: number) {
		return h * 0.5 + i * 6;
	}
	function build() {
		cards = [];
		for (let i = 0; i < 3; i++)
			cards.push({
				x: w * 0.5,
				y: restY(2 - i),
				vx: 0,
				vy: 0,
				a: (Math.random() - 0.5) * 0.06,
				va: 0,
				flying: false,
				n: i + 1,
			});
	}
	function resize() {
		({ w, h } = fit2d(canvas, ctx));
		build();
	}
	const cw = () => Math.min(w * 0.34, 150);
	const ch = () => Math.min(h * 0.5, 110);
	function topIdx() {
		// the last non-flying card is the one on top
		for (let i = cards.length - 1; i >= 0; i--) if (!cards[i].flying) return i;
		return -1;
	}
	function throwCard(i: number, vx: number, vy: number) {
		cards[i].flying = true;
		cards[i].vx = vx;
		cards[i].vy = vy - 4;
		cards[i].va = (Math.random() - 0.5) * 0.3 + vx * 0.01;
	}
	function frame(dt: number) {
		const f = Math.min(2, dt / 16);
		idle += dt;
		if (idle > 3200 && held < 0) {
			const t = topIdx();
			if (t >= 0) throwCard(t, 6 + Math.random() * 4, -2);
			idle = 0;
		}
		ctx.clearRect(0, 0, w, h);
		const W = cw(),
			H = ch();
		for (let i = 0; i < cards.length; i++) {
			const c = cards[i];
			if (held === i) {
				c.x += (p.x - grabDX - c.x) * 0.5;
				c.y += (p.y - grabDY - c.y) * 0.5;
				c.va += (0 - c.va) * 0.2;
			} else if (c.flying) {
				c.vy += 0.4 * f;
				c.x += c.vx * f;
				c.y += c.vy * f;
				c.a += c.va * f;
				if (c.y - H > h || c.x + W < 0 || c.x - W > w) {
					// recycle to the bottom of the stack
					c.flying = false;
					c.vx = c.vy = c.va = 0;
					c.a = (Math.random() - 0.5) * 0.06;
					const below = cards.filter((o) => o !== c && !o.flying).length;
					c.x = w * 0.5;
					c.y = restY(below);
					cards.splice(i, 1);
					cards.unshift(c);
				}
			} else {
				// settle toward rest slot
				const below = cards.slice(0, i).filter((o) => !o.flying).length;
				c.x += (w * 0.5 - c.x) * 0.12 * f;
				c.y += (restY(below) - c.y) * 0.12 * f;
			}
			// draw card
			ctx.save();
			ctx.translate(c.x, c.y);
			ctx.rotate(c.a);
			ctx.fillStyle = 'rgba(18,18,20,0.96)';
			ctx.strokeStyle = i === topIdx() ? `rgba(${COBALT},0.8)` : 'rgba(255,255,255,0.18)';
			ctx.lineWidth = 1.5;
			roundRect(ctx, -W / 2, -H / 2, W, H, 8);
			ctx.fill();
			ctx.stroke();
			// scribbled draft lines
			ctx.strokeStyle = 'rgba(255,255,255,0.16)';
			ctx.lineWidth = 1;
			for (let k = 0; k < 4; k++) {
				const yy = -H / 2 + 18 + k * 16;
				ctx.beginPath();
				ctx.moveTo(-W / 2 + 12, yy);
				ctx.lineTo(W / 2 - 12 - (k === 3 ? W * 0.3 : 0), yy);
				ctx.stroke();
			}
			ctx.fillStyle = `rgba(${ICE},0.6)`;
			ctx.font = '10px "Space Grotesk", monospace';
			ctx.fillText(`DRAFT ${c.n}`, -W / 2 + 12, -H / 2 + 12);
			ctx.restore();
		}
	}
	function staticFrame() {
		frame(16);
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		p.px = p.x;
		p.py = p.y;
		p.x = x;
		p.y = y;
		if (kind === 'down') {
			idle = 0;
			const t = topIdx();
			if (t >= 0) {
				held = t;
				grabDX = x - cards[t].x;
				grabDY = y - cards[t].y;
				p.vx = p.vy = 0;
			}
		} else if (kind === 'move') {
			if (held >= 0) {
				p.vx = p.x - p.px;
				p.vy = p.y - p.py;
			}
		} else {
			if (held >= 0) {
				const speed = Math.hypot(p.vx, p.vy);
				if (speed > 3) throwCard(held, p.vx * 1.2, p.vy * 1.2);
				held = -1;
			}
		}
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

// =============================================================================
// 7. strata-dig — "UI archaeology". Layered strata, each a UI era. Drag to
//    excavate: the shovel lowers the surface where you pass, exposing older
//    layers below and kicking up debris. Sediment slowly settles back.
// =============================================================================
function strataDig(canvas: HTMLCanvasElement): Engine {
	const ctx = canvas.getContext('2d')!;
	let w = 0,
		h = 0;
	let depth: Float32Array = new Float32Array(0); // 0 (surface) .. 1 (bottom) per column
	type Deb = { x: number; y: number; vx: number; vy: number; life: number; c: string };
	let debris: Deb[] = [];
	const layers = [
		{ name: 'GLASS', c: 'rgba(40,58,86,1)' },
		{ name: 'FLAT', c: 'rgba(52,72,58,1)' },
		{ name: 'MATERIAL', c: 'rgba(78,60,44,1)' },
		{ name: 'SKEUOMORPH', c: 'rgba(70,52,40,1)' },
		{ name: 'BEDROCK', c: 'rgba(34,32,36,1)' },
	];
	const COLS = () => Math.max(24, Math.round(w / 6));
	const p = newPointer();

	function resize() {
		({ w, h } = fit2d(canvas, ctx));
		depth = new Float32Array(COLS());
	}
	function frame(dt: number) {
		const f = Math.min(2, dt / 16);
		const cols = depth.length;
		const colW = w / cols;
		// dig where pointer is down
		if (p.down && p.x >= 0) {
			const ci = Math.floor(p.x / colW);
			const rad = Math.round(cols * 0.06);
			for (let c = ci - rad; c <= ci + rad; c++) {
				if (c < 0 || c >= cols) continue;
				const fall = (1 - Math.abs(c - ci) / (rad + 1)) * 0.05 * f;
				depth[c] = Math.min(1, depth[c] + fall);
			}
			if (Math.random() < 0.6)
				debris.push({
					x: p.x + (Math.random() - 0.5) * 20,
					y: h * (depth[Math.max(0, Math.min(cols - 1, ci))] * 0.9),
					vx: (Math.random() - 0.5) * 3,
					vy: -2 - Math.random() * 3,
					life: 1,
					c: layers[Math.min(layers.length - 1, Math.floor(depth[ci] * layers.length))].c,
				});
		}
		// sediment settles back very slowly
		for (let c = 0; c < cols; c++) depth[c] = Math.max(0, depth[c] - 0.0009 * f);
		ctx.clearRect(0, 0, w, h);
		// draw strata: each column filled top-down, surface pushed by depth
		const bandH = h / layers.length;
		for (let c = 0; c < cols; c++) {
			const x = c * colW;
			const surface = depth[c] * h * 0.7;
			for (let l = 0; l < layers.length; l++) {
				const y0 = Math.max(surface, l * bandH);
				const y1 = (l + 1) * bandH;
				if (y1 <= y0) continue;
				ctx.fillStyle = layers[l].c;
				ctx.fillRect(x, y0, colW + 1, y1 - y0);
			}
			// exposed edge highlight
			ctx.fillStyle = `rgba(${ICE},0.10)`;
			ctx.fillRect(x, surface, colW + 1, 2);
		}
		// layer labels
		ctx.font = '9px "Space Grotesk", monospace';
		ctx.textAlign = 'left';
		for (let l = 0; l < layers.length; l++) {
			ctx.fillStyle = 'rgba(255,255,255,0.28)';
			ctx.fillText(layers[l].name, 8, l * bandH + bandH / 2 + 3);
		}
		// debris
		debris = debris.filter((d) => d.life > 0);
		for (const d of debris) {
			d.vy += 0.25 * f;
			d.x += d.vx * f;
			d.y += d.vy * f;
			d.life -= 0.02 * f;
			ctx.globalAlpha = Math.max(0, d.life);
			ctx.fillStyle = d.c;
			ctx.fillRect(d.x, d.y, 3, 3);
		}
		ctx.globalAlpha = 1;
	}
	function staticFrame() {
		for (let c = 0; c < depth.length; c++)
			depth[c] = Math.max(0, 0.4 * Math.sin(c * 0.3) * 0.5 + 0.2);
		p.down = false;
		frame(16);
	}
	function pointer(kind: 'down' | 'move' | 'up' | 'leave', x: number, y: number) {
		if (kind === 'down') p.down = true;
		if (kind === 'up' || kind === 'leave') p.down = false;
		p.x = x;
		p.y = y;
	}
	return { resize, frame, staticFrame, pointer, dispose() {} };
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

const FACTORIES: Record<PostHeroVariant, (c: HTMLCanvasElement) => Engine> = {
	'index-swarm': indexSwarm,
	'cell-flood': cellFlood,
	'stubborn-path': stubbornPath,
	'two-tempos': twoTempos,
	'vanishing-ui': vanishingUi,
	'three-throws': threeThrows,
	'strata-dig': strataDig,
};

export default function PostHero({ variant }: PostHeroProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const caption = CAPTIONS[variant];

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const factory = FACTORIES[variant];
		if (!factory) return;
		let engine: Engine;
		try {
			engine = factory(canvas);
		} catch {
			return;
		}

		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		engine.resize();

		if (reduce) {
			engine.staticFrame();
			return () => engine.dispose();
		}

		let raf = 0;
		let last = performance.now();
		let onScreen = true;
		let running = false;

		const loop = (now: number) => {
			if (!running) return;
			const dt = Math.min(50, now - last || 16);
			last = now;
			engine.frame(dt);
			raf = requestAnimationFrame(loop);
		};
		const start = () => {
			if (running || !onScreen || document.hidden) return;
			running = true;
			last = performance.now();
			raf = requestAnimationFrame(loop);
		};
		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		// pointer routing — one path covers mouse, pen, and touch
		const rel = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			return { x: e.clientX - r.left, y: e.clientY - r.top };
		};
		const onDown = (e: PointerEvent) => {
			const { x, y } = rel(e);
			canvas.setPointerCapture?.(e.pointerId);
			engine.pointer('down', x, y);
		};
		const onMove = (e: PointerEvent) => {
			const { x, y } = rel(e);
			engine.pointer('move', x, y);
		};
		const onUp = (e: PointerEvent) => {
			const { x, y } = rel(e);
			engine.pointer('up', x, y);
		};
		const onLeave = () => engine.pointer('leave', -1, -1);
		canvas.addEventListener('pointerdown', onDown);
		canvas.addEventListener('pointermove', onMove, { passive: true });
		canvas.addEventListener('pointerup', onUp);
		canvas.addEventListener('pointercancel', onUp);
		canvas.addEventListener('pointerleave', onLeave);

		const io =
			'IntersectionObserver' in window
				? new IntersectionObserver(
						(es) => {
							onScreen = es[0].isIntersecting;
							onScreen ? start() : stop();
						},
						{ threshold: 0 }
					)
				: null;
		if (io) io.observe(canvas);
		else start();
		const onVis = () => (document.hidden ? stop() : start());
		document.addEventListener('visibilitychange', onVis);
		let rt = 0;
		const onResize = () => {
			clearTimeout(rt);
			rt = window.setTimeout(() => engine.resize(), 180);
		};
		window.addEventListener('resize', onResize);
		start();

		return () => {
			stop();
			io?.disconnect();
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('resize', onResize);
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerup', onUp);
			canvas.removeEventListener('pointercancel', onUp);
			canvas.removeEventListener('pointerleave', onLeave);
			engine.dispose();
		};
	}, [variant]);

	return (
		<div className="post-hero" data-variant={variant}>
			<canvas
				ref={canvasRef}
				className="post-hero__canvas"
				aria-hidden="true"
				// The canvas is sized imperatively (DPR-correct) in the effect, so its
				// width/height legitimately differ from the SSR markup — expected for a
				// client-driven surface, not a real mismatch.
				suppressHydrationWarning
				style={{ touchAction: 'none', cursor: 'pointer' }}
			/>
			<div className="post-hero__caption">
				<span className="post-hero__verb">{caption.verb}</span>
				<span className="post-hero__hint">{caption.hint}</span>
			</div>
		</div>
	);
}
