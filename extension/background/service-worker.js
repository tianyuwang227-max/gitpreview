chrome.runtime.onInstalled.addListener(() => {
  console.log('GitPreview extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getServerUrl') {
    chrome.storage.local.get(['serverUrl'], (result) => {
      sendResponse({ serverUrl: result.serverUrl || 'http://localhost:3000' });
    });
    return true;
  }
});
