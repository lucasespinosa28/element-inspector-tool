let isActive = false;

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const status = document.getElementById('status');
    
    toggleBtn.addEventListener('click', function() {
        if (!isActive) {
            startSelection();
        } else {
            stopSelection();
        }
    });
    
    function startSelection() {
        isActive = true;
        toggleBtn.textContent = 'Stop Selection';
        toggleBtn.classList.add('active');
        showStatus('Click on any element to save it', 'info');
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'start'});
            }
        });
    }
    
    function stopSelection() {
        isActive = false;
        toggleBtn.textContent = 'Start Selection';
        toggleBtn.classList.remove('active');
        hideStatus();
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'});
            }
        });
    }
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
    }
    
    function hideStatus() {
        status.style.display = 'none';
    }
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.type === 'success') {
            showStatus('File saved successfully!', 'success');
            setTimeout(stopSelection, 1500);
        } else if (message.type === 'error') {
            showStatus('Error saving file', 'error');
            setTimeout(stopSelection, 1500);
        }
    });
});