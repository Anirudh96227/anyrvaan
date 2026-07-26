// One click lights the active tab. The content script toggles itself on
// re-injection, so this only decides when to run it.
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
	} catch (err) {
		// Browser-internal pages refuse injection — every extension, not just this one.
		console.warn('Typeset cannot run here:', err.message);
	}
});
