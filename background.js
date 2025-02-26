chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Injection error:", chrome.runtime.lastError);
        } else {
            console.log("Content script injected manually");
        }
    });
});