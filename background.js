async function injectContentScripts() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["overlay.css"],
      });
    } catch (e) {
      // Skip restricted tabs (chrome://, about:, etc.)
    }
  }
}

chrome.runtime.onInstalled.addListener(injectContentScripts);
chrome.runtime.onStartup.addListener(injectContentScripts);
injectContentScripts();
