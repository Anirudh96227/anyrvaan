// One click re-colours the active tab. The colour engine goes in first, then
// the content script that uses it; both toggle on re-injection.
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['colour.js', 'content.js'],
		});
	} catch (err) {
		// Browser-internal pages refuse injection — every extension, not just this one.
		console.warn('Colourway cannot run here:', err.message);
	}
});
