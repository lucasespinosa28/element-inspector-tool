// content.js
let selectionModeActive = false;
let currentHoveredElement = null;
const HIGHLIGHT_CLASS = '_elementInspectorHighlightByExtension'; // Unique class name

// Function to apply highlight
function highlightElement(element) {
  if (element && !element.classList.contains(HIGHLIGHT_CLASS)) {
    element.classList.add(HIGHLIGHT_CLASS);
  }
}

// Function to remove highlight
function removeHighlight(element) {
  if (element && element.classList.contains(HIGHLIGHT_CLASS)) {
    element.classList.remove(HIGHLIGHT_CLASS);
  }
}

// Mouseover event listener
function handleMouseOver(event) {
  if (!selectionModeActive || !event.target) return;
  
  // If we are hovering over an already highlighted element that is not the current one,
  // or if the target is the highlighter itself, do nothing.
  if (event.target.classList.contains(HIGHLIGHT_CLASS) && event.target !== currentHoveredElement) return;

  if (currentHoveredElement && currentHoveredElement !== event.target) {
    removeHighlight(currentHoveredElement);
  }
  currentHoveredElement = event.target;
  highlightElement(currentHoveredElement);
}

// Mouseout event listener
function handleMouseOut(event) {
  if (!selectionModeActive || !event.target) return;
  // Only remove highlight if the mouse truly left the element
  // and isn't moving to a child element that would also be highlighted.
  if (currentHoveredElement === event.target) {
     removeHighlight(currentHoveredElement);
     currentHoveredElement = null;
  }
}

// Click event listener
function handleClick(event) {
  if (!selectionModeActive || !event.target) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation(); // Crucial to prevent other click handlers

  const targetElement = event.target;

  // Log element details
  console.groupCollapsed(
    `%cElement Inspector: %c${targetElement.tagName.toLowerCase()}${targetElement.id ? '#' + targetElement.id : ''}${targetElement.className && typeof targetElement.className === 'string' ? '.' + targetElement.className.trim().replace(/\s+/g, '.') : ''}`,
    'color: #007bff; font-weight: bold;', 'color: black; font-weight: normal;'
  );
  console.log("Selected DOM Element:", targetElement);
  console.log("Tag Name:", targetElement.tagName);
  console.log("ID:", targetElement.id || "N/A");
  console.log("Classes:", targetElement.classList.length > 0 ? Array.from(targetElement.classList).filter(c => c !== HIGHLIGHT_CLASS).join(', ') : "N/A");
  
  const attributes = {};
  if (targetElement.hasAttributes()) {
    for (let i = 0; i < targetElement.attributes.length; i++) {
      const attr = targetElement.attributes[i];
      if (attr.name !== 'class' && attr.name !== 'id' && attr.name !== 'style') { // Avoid redundancy for already logged common attributes
         attributes[attr.name] = attr.value;
      }
    }
  }
  console.log("Other Attributes:", Object.keys(attributes).length > 0 ? attributes : "N/A");
  console.log("Outer HTML Snippet:", targetElement.outerHTML.substring(0, 200) + (targetElement.outerHTML.length > 200 ? "..." : ""));
  // For full outerHTML if needed: console.log("Full Outer HTML:", targetElement.outerHTML);
  
  try {
    const computedStyles = window.getComputedStyle(targetElement);
    console.log("Computed Display:", computedStyles.getPropertyValue('display'));
    console.log("Computed Visibility:", computedStyles.getPropertyValue('visibility'));
    console.log("Computed Position:", computedStyles.getPropertyValue('position'));
    console.log("Computed Dimensions (W x H):", `${computedStyles.getPropertyValue('width')} x ${computedStyles.getPropertyValue('height')}`);
    // console.log("All Computed Styles:", computedStyles); // Uncomment for all styles
  } catch (e) {
    console.warn("Could not retrieve computed styles.", e);
  }
  console.groupEnd();

  // Important: Remove highlight from the clicked element as it's now "selected"
  // and we don't want the highlight class in its logged outerHTML.
  removeHighlight(targetElement); 
  currentHoveredElement = null; // Reset hovered element

  // Optionally, deactivate selection mode after one click:
  // This would require messaging the background script to update storage and icon.
  // For this version, selection mode remains active until toggled off via the icon.

  return false; // Further prevent default and stop propagation
}

// Function to enable or disable the selection mode
function setSelectionMode(isActive) {
  selectionModeActive = isActive;
  console.log(`Element Inspector Tool: Selection mode ${selectionModeActive ? 'ACTIVATED' : 'DEACTIVATED'}.`);

  if (selectionModeActive) {
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true); // Use capture phase
    document.body.style.cursor = 'crosshair';
  } else {
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    if (currentHoveredElement) {
      removeHighlight(currentHoveredElement);
      currentHoveredElement = null;
    }
    document.body.style.cursor = 'default';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TOGGLE_SELECTION_MODE") {
    setSelectionMode(request.selectionModeActive);
    sendResponse({ status: "Selection mode toggled in content script", active: selectionModeActive });
  }
  return true; // Indicates that the response might be sent asynchronously
});

// Initialize mode based on storage when the script loads
(async () => {
  try {
    const { selectionModeActive: initialMode } = await chrome.storage.local.get('selectionModeActive');
    // Set the mode. This ensures that if the page was reloaded while mode was active,
    // or if the content script loads after the user has already activated the mode,
    // it starts in the correct state.
    setSelectionMode(!!initialMode);

    // Inform background to sync icon title for this tab, as it might have just loaded.
    await chrome.runtime.sendMessage({
      action: "SYNC_ICON_TITLE",
      selectionModeActive: !!initialMode
    });
  } catch (error) {
    console.error("Element Inspector Tool: Error initializing content script state from storage.", error);
    // Default to off if storage is inaccessible
    setSelectionMode(false);
  }
  console.log("Element Inspector Tool: Content script loaded and initialized.");
})();
