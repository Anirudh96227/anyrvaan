// One click on the toolbar icon blooms the active tab. The content script
// toggles itself on re-injection, so this only decides *when* to run it.
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js'],
		});
	} catch (err) {
		// Restricted pages (chrome://, the Web Store, PDF viewer) refuse injection.
		console.warn('Bloom cannot run on this page:', err.message);
	}
});
