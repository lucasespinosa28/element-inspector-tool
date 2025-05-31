// src/background.ts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Background received message:", request);
  if (request.action === "downloadFile") {
    try {
      const blob = new Blob([request.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      console.log("Starting download for:", request.filename);
      chrome.downloads.download({
        url,
        filename: request.filename,
        saveAs: false
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
        } else {
          console.log("Download started with ID:", downloadId);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      });
    } catch (error) {
      console.error("Error in download:", error);
    }
  }
});
