const DEFAULTS = { count: 6, confidence: true, dim: true, showKnown: false, motes: true };
const el = (id) => document.getElementById(id);
let flash = 0;
const flashSaved = () => {
	el('saved').dataset.on = '1';
	clearTimeout(flash);
	flash = setTimeout(() => (el('saved').dataset.on = '0'), 1100);
};

chrome.storage.sync.get(DEFAULTS, (cfg) => {
	const state = { ...DEFAULTS, ...cfg };

	el('count').value = String(state.count);
	el('countOut').value = String(state.count);
	el('count').addEventListener('input', () => {
		state.count = Number(el('count').value);
		el('countOut').value = String(state.count);
		save();
	});

	['confidence', 'dim', 'showKnown', 'motes'].forEach((k) => {
		el(k).checked = state[k];
		el(k).addEventListener('change', () => {
			state[k] = el(k).checked;
			save();
		});
	});

	function save() {
		chrome.storage.sync.set(state, flashSaved);
	}
});
