// Background script to handle file downloads
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background received message:', request);
  
  if (request.action === 'downloadFile') {
    try {
      // Create blob URL for the markdown content
      const blob = new Blob([request.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      console.log('Starting download for:', request.filename);
      
      // Trigger download
      chrome.downloads.download({
        url: url,
        filename: request.filename,
        saveAs: false
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        } else {
          console.log('Download started with ID:', downloadId);
          // Clean up the blob URL after download starts
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      });
    } catch (error) {
      console.error('Error in download:', error);
    }
  }
});