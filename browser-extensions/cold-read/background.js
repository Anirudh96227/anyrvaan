// One click quizzes the active tab. The spine and the question builder go in
// first, then the content script that uses them; re-injection toggles it off.
chrome.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;
	try {
		await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['spine.js', 'quiz.js', 'content.js'],
		});
	} catch (err) {
		// Browser-internal pages refuse injection — every extension, not just this one.
		console.warn('Cold Read cannot run here:', err.message);
	}
});
