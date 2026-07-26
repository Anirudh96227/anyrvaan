const DEFAULTS = { theme: 'indigo', target: 'comfortable', keepColour: true, recolourImages: false, motes: true, perSite: {} };
const CW = window.__colourway;
const el = (id) => document.getElementById(id);
let flash = 0;
const flashSaved = () => {
	el('saved').dataset.on = '1';
	clearTimeout(flash);
	flash = setTimeout(() => (el('saved').dataset.on = '0'), 1100);
};

chrome.storage.sync.get(DEFAULTS, (cfg) => {
	const state = { ...DEFAULTS, ...cfg };
	const wrap = el('themes');
	const ids = Object.keys(CW.THEMES);

	ids.forEach((id) => {
		const t = CW.THEMES[id];
		// swatches straight from the scheme, so the button shows the real thing
		const ground = CW.fmt(CW.oklchToRgb(t.ground.L, t.ground.C, t.ground.H));
		const ink = CW.fmt(CW.oklchToRgb(t.ink.L, t.ink.C, t.ink.H));
		const accent = CW.fmt(CW.oklchToRgb(0.68, 0.16, t.accentHue ?? t.ground.H));
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'theme';
		b.setAttribute('aria-pressed', String(state.theme === id));
		b.innerHTML =
			`<span class="chips"><i style="background:${ground}"></i><i style="background:${ink}"></i><i style="background:${accent}"></i></span>` +
			`<span class="txt"><span class="name">${t.label}</span><span class="note">${t.note}</span></span>`;
		b.addEventListener('click', () => {
			state.theme = id;
			[...wrap.children].forEach((c, i) => c.setAttribute('aria-pressed', String(ids[i] === id)));
			save();
		});
		wrap.appendChild(b);
	});

	el('target').value = state.target;
	el('target').addEventListener('change', () => { state.target = el('target').value; save(); });
	['keepColour', 'recolourImages', 'motes'].forEach((k) => {
		el(k).checked = state[k];
		el(k).addEventListener('change', () => { state[k] = el(k).checked; save(); });
	});
	function save() { chrome.storage.sync.set(state, flashSaved); }
});
