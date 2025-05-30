# Chrome Extension Installation Guide

## Files Required
Create a folder and save these files:

1. `manifest.json`
2. `popup.html`
3. `popup.js`
4. `content.js`
5. `styles.css`

## Installation Steps

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder containing all the extension files
   - The extension should appear in the list

4. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in the Chrome toolbar
   - Find "Element to Markdown" and click the pin icon

## How to Use

1. **Navigate to any website** (not chrome:// pages)
2. **Click the extension icon** in the toolbar
3. **Click "Start Selection"** in the popup
4. **Hover over elements** to see them highlighted
5. **Click any element** to save it as markdown
6. **File downloads automatically** as `[domain]-[uuid].md`

## Features

- ✅ Works on all regular websites (http/https)
- ✅ Visual element highlighting
- ✅ Converts HTML to proper Markdown
- ✅ Includes metadata (URL, date, element type)
- ✅ Unique filename with UUID
- ✅ Handles headers, links, lists, tables, images
- ✅ Simple one-click operation

## File Naming Format
Files are saved as: `domain-uuid.md`

Example: `github.com-a1b2c3d4-e5f6-7890-abcd-ef1234567890.md`

## Troubleshooting

**Extension not working?**
- Make sure you're on a regular website (not chrome:// pages)
- Refresh the page and try again
- Check that the extension is enabled

**No download happening?**
- Check your Chrome downloads folder
- Ensure Chrome has permission to download files
- Try on a different website

This extension is self-contained and doesn't require any external dependencies.