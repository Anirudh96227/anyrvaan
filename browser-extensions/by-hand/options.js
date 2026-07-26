const DEFAULTS = { medium: 'pencil', paper: 'white', images: 'wash', messiness: 1, drawOn: true, handwriting: true };
const MEDIA = [
	{ id: 'pencil', label: 'Pencil', sw: 'linear-gradient(160deg,#8d8b86,#4a4845)' },
	{ id: 'ballpoint', label: 'Ballpoint', sw: 'linear-gradient(160deg,#5b6ec9,#1b2a70)' },
	{ id: 'marker', label: 'Marker', sw: 'linear-gradient(160deg,#4a4a50,#17171a)' },
	{ id: 'brush', label: 'Ink brush', sw: 'linear-gradient(160deg,#3a3a3f,#0d0d10)' },
	{ id: 'charcoal', label: 'Charcoal', sw: 'linear-gradient(160deg,#6f6b66,#2a2825)' },
	{ id: 'blueprint', label: 'Blueprint', sw: 'linear-gradient(160deg,#2c6bb5,#0d2a53)' },
];
const PAPERS = [
	{ id: 'white', label: 'White', sw: '#fbfaf7' },
	{ id: 'cream', label: 'Cream', sw: '#f6efdf' },
	{ id: 'graph', label: 'Graph', sw: 'repeating-linear-gradient(#fbfaf7 0 9px,#cfd8e4 9px 10px)' },
	{ id: 'dots', label: 'Dot grid', sw: 'radial-gradient(#9a9a9a 1px,#fbfaf7 1px) 0 0/8px 8px' },
	{ id: 'blueprint', label: 'Blueprint', sw: '#12386b' },
	{ id: 'kraft', label: 'Kraft', sw: '#c8a97e' },
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
	const build = (host, list, key) => {
		list.forEach((o) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'opt';
			b.setAttribute('aria-pressed', String(state[key] === o.id));
			b.innerHTML = `<span class="sw" style="background:${o.sw}"></span>${o.label}`;
			b.addEventListener('click', () => {
				state[key] = o.id;
				[...host.children].forEach((c, i) => c.setAttribute('aria-pressed', String(list[i].id === o.id)));
				save();
			});
			host.appendChild(b);
		});
	};
	build(el('media'), MEDIA, 'medium');
	build(el('papers'), PAPERS, 'paper');
	el('images').value = state.images;
	el('images').addEventListener('change', () => { state.images = el('images').value; save(); });
	el('messiness').value = state.messiness;
	el('messiness').addEventListener('input', () => { state.messiness = parseFloat(el('messiness').value); save(); });
	['drawOn', 'handwriting'].forEach((k) => {
		el(k).checked = state[k];
		el(k).addEventListener('change', () => { state[k] = el(k).checked; save(); });
	});
	function save() { chrome.storage.sync.set(state, flashSaved); }
});
