// Settings live in chrome.storage.sync, so they follow you between machines.
const DEFAULTS = {
	light: 'golden',
	follow: true,
	angle: 135,
	lengthScale: 1,
	castOnOthers: true,
	sunset: true,
	motes: true,
};

const LIGHTS = [
	{ id: 'noon', label: 'Noon', swatch: 'linear-gradient(160deg,#fdfbf4,#cfc9b8)' },
	{ id: 'golden', label: 'Golden', swatch: 'linear-gradient(160deg,#ffc474,#a9541f)' },
	{ id: 'blue', label: 'Blue hour', swatch: 'linear-gradient(160deg,#96b2ff,#25305a)' },
	{ id: 'moon', label: 'Moon', swatch: 'linear-gradient(160deg,#bed0f0,#1b2233)' },
	{ id: 'studio', label: 'Studio', swatch: 'linear-gradient(160deg,#f5f5f5,#6f6f72)' },
];

const el = (id) => document.getElementById(id);
const savedTag = el('saved');
let flash = 0;
const flashSaved = () => {
	savedTag.dataset.on = '1';
	clearTimeout(flash);
	flash = setTimeout(() => (savedTag.dataset.on = '0'), 1100);
};

chrome.storage.sync.get(DEFAULTS, (cfg) => {
	const state = { ...DEFAULTS, ...cfg };

	const lights = el('lights');
	LIGHTS.forEach((l) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'light';
		b.setAttribute('aria-pressed', String(state.light === l.id));
		b.innerHTML = `<span class="swatch" style="background:${l.swatch}"></span>${l.label}`;
		b.addEventListener('click', () => {
			state.light = l.id;
			[...lights.children].forEach((c, i) =>
				c.setAttribute('aria-pressed', String(LIGHTS[i].id === l.id))
			);
			save();
		});
		lights.appendChild(b);
	});

	['follow', 'castOnOthers', 'sunset', 'motes'].forEach((k) => {
		el(k).checked = state[k];
		el(k).addEventListener('change', () => {
			state[k] = el(k).checked;
			save();
		});
	});
	['angle', 'lengthScale'].forEach((k) => {
		el(k).value = state[k];
		el(k).addEventListener('input', () => {
			state[k] = parseFloat(el(k).value);
			save();
		});
	});

	function save() {
		chrome.storage.sync.set(state, flashSaved);
	}
});
