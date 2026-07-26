// One click on the toolbar icon toggles the strip-down on the active tab.
// The content script holds all the logic and toggles itself on re-injection,
// so this only has to decide *when* to run it.
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js'],
		});
	} catch (err) {
		// Restricted pages (chrome://, the Web Store, PDF viewer) refuse injection.
		console.warn('Negative Space cannot run on this page:', err.message);
	}
});
