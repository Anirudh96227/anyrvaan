const DEFAULTS = { pairing: 'editorial', scale: 'normal', capMeasure: true, correctLeading: true, motes: true, perSite: {} };
const PAIRS = [
	{ id: 'editorial', name: 'Editorial', faces: 'Iowan Old Style / Charter — long reading, essays' },
	{ id: 'technical', name: 'Technical', faces: 'Segoe UI / Plex Mono — docs, dashboards, code' },
	{ id: 'quiet', name: 'Quiet', faces: 'Optima / Candara — news, anything shouting' },
	{ id: 'display', name: 'Display', faces: 'Didot / system sans — portfolios, landing pages' },
	{ id: 'typewriter', name: 'Typewriter', faces: 'Cascadia Mono throughout — everything flat' },
];
const el = (id) => document.getElementById(id);
let flash = 0;
const flashSaved = () => {
	el('saved').dataset.on = '1';
	clearTimeout(flash);
	flash = setTimeout(() => (el('saved').dataset.on = '0'), 1100);
};
chrome.storage.sync.get(DEFAULTS, (cfg) => {
	const state = { ...DEFAULTS, ...cfg };
	const wrap = el('pairs');
	PAIRS.forEach((p) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'pair';
		b.setAttribute('aria-pressed', String(state.pairing === p.id));
		b.innerHTML = `<span class="name">${p.name}</span><span class="faces">${p.faces}</span>`;
		b.addEventListener('click', () => {
			state.pairing = p.id;
			[...wrap.children].forEach((c, i) => c.setAttribute('aria-pressed', String(PAIRS[i].id === p.id)));
			save();
		});
		wrap.appendChild(b);
	});
	el('scale').value = state.scale;
	el('scale').addEventListener('change', () => { state.scale = el('scale').value; save(); });
	['correctLeading', 'capMeasure', 'motes'].forEach((k) => {
		el(k).checked = state[k];
		el(k).addEventListener('change', () => { state[k] = el(k).checked; save(); });
	});
	function save() { chrome.storage.sync.set(state, flashSaved); }
});
