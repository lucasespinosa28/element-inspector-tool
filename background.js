// background.js

// Initialize selectionModeActive to false when the extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ selectionModeActive: false });
  console.log('Element Inspector Tool: Initialized. Selection mode is OFF.');
});

// Handle the browser action (toolbar icon) click
chrome.action.onClicked.addListener(async (tab) => {
  // Retrieve the current state from storage
  const { selectionModeActive: currentMode } = await chrome.storage.local.get('selectionModeActive');
  const nextMode = !currentMode;

  // Update the state in storage
  await chrome.storage.local.set({ selectionModeActive: nextMode });

  // Update the action button's title
  const title = nextMode ? "Disable Element Selection" : "Enable Element Selection";
  chrome.action.setTitle({ tabId: tab.id, title: title });

  // Send a message to the content script in the active tab to toggle the mode
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: "TOGGLE_SELECTION_MODE",
        selectionModeActive: nextMode
      });
      console.log(`Element Inspector Tool: Sent TOGGLE_SELECTION_MODE (${nextMode}) to tab ${tab.id}`);
    } catch (error) {
      console.error("Element Inspector Tool: Failed to send message to content script.", error);
      if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
        console.warn("Element Inspector Tool: Content script might not be active on this page or not listening. This can happen on special pages like chrome:// or the web store.");
      }
    }
  } else {
    console.error("Element Inspector Tool: Active tab ID is undefined.");
  }
});

// Listen for messages from content scripts (e.g., to sync icon state if needed)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SYNC_ICON_TITLE") {
    if (sender.tab && sender.tab.id) {
      const title = request.selectionModeActive ? "Disable Element Selection" : "Enable Element Selection";
      chrome.action.setTitle({
        tabId: sender.tab.id,
        title: title
      });
      sendResponse({ status: "Icon title synced from content script request." });
    }
    return true; // Indicates asynchronous response
  }
});
