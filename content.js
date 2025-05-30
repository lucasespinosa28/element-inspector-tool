(() => {
    let isSelecting = false;
    let highlightedElement = null;
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'start') {
            startSelection();
        } else if (message.action === 'stop') {
            stopSelection();
        }
    });
    
    function startSelection() {
        isSelecting = true;
        document.body.style.cursor = 'crosshair';
        document.addEventListener('mouseover', handleMouseOver, true);
        document.addEventListener('mouseout', handleMouseOut, true);
        document.addEventListener('click', handleClick, true);
    }
    
    function stopSelection() {
        isSelecting = false;
        document.body.style.cursor = '';
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('mouseout', handleMouseOut, true);
        document.removeEventListener('click', handleClick, true);
        removeHighlight();
    }
    
    function handleMouseOver(e) {
        if (!isSelecting) return;
        removeHighlight();
        highlightedElement = e.target;
        e.target.classList.add('element-selector-highlight');
    }
    
    function handleMouseOut(e) {
        if (!isSelecting) return;
        e.target.classList.remove('element-selector-highlight');
    }
    
    function handleClick(e) {
        if (!isSelecting) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const element = e.target;
        saveElementAsMarkdown(element);
        stopSelection();
    }
    
    function removeHighlight() {
        if (highlightedElement) {
            highlightedElement.classList.remove('element-selector-highlight');
            highlightedElement = null;
        }
    }
    
    function saveElementAsMarkdown(element) {
        try {
            const markdown = convertToMarkdown(element);
            const filename = generateFilename();
            downloadFile(markdown, filename);
            chrome.runtime.sendMessage({type: 'success'});
        } catch (error) {
            console.error('Error saving element:', error);
            chrome.runtime.sendMessage({type: 'error'});
        }
    }
    
    function convertToMarkdown(element) {
        let markdown = '';
        
        // Add header with metadata
        markdown += `# Element from: ${document.title}\n`;
        markdown += `**URL:** ${window.location.href}\n`;
        markdown += `**Element:** ${element.tagName.toLowerCase()}\n`;
        markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
        markdown += '---\n\n';
        
        // Convert element content
        markdown += processElementIterative(element); // Updated function call
        
        return markdown;
    }

    // Iterative function to process elements and avoid call stack limits
    function processElementIterative(rootElement) {
        let markdown = '';
        // Queue items can be: { element: DOMElement } or { type: 'suffix', content: String }
        const queue = [{ element: rootElement }]; 

        while (queue.length > 0) {
            const item = queue.shift(); // Process items from the front

            if (item.type === 'suffix') {
                markdown += item.content;
                continue;
            }

            const element = item.element;

            if (element.nodeType === Node.TEXT_NODE) {
                let text = element.textContent;
                // Avoid adding empty text nodes or text nodes that are just whitespace if they don't affect formatting
                if (!element.parentElement || element.parentElement.tagName.toLowerCase() !== 'pre') {
                    if (text.trim() === '') {
                        // If the text node is surrounded by block elements or is at the start/end of one,
                        // it might be ignorable. For inline context, even a space can be significant.
                        // A simple heuristic: if it's purely whitespace and the markdown doesn't end with a space,
                        // it might be a formatting artifact.
                        // Example: <p> text <span> space </span> more text </p>
                        // The space inside span should be preserved.
                        // Example: <p> text \n <span></span> \n more text </p> -> text space more text
                        // Let's be conservative: replace multiple newlines/spaces with a single space.
                        // Then, if it's just a single space, ensure it doesn't create double spacing with previous output.
                        text = text.replace(/\s+/g, ' ');
                        if (text === ' ' && (markdown.endsWith(' ') || markdown.endsWith('\n'))) {
                           text = ''; // Avoid double space or space after newline
                        }
                    }
                }
                markdown += text;
                continue;
            }

            if (element.nodeType !== Node.ELEMENT_NODE) {
                continue; // Skip comments, other node types
            }

            const tag = element.tagName.toLowerCase();
            let childrenToQueue = []; // Children will be added to the front of the queue (for DFS)
            let openingTagMarkdown = '';
            let closingTagSuffixContent = ''; // Content for the suffix item

            // Default order: suffix marker, then children (reversed, so they are processed in correct order)
            // Example: For <strong><em>text</em></strong>
            // Process <strong>: md="**", add {type:suffix, c:"**"}, add <em> to queue
            // Process <em>: md="**<em>", add {type:suffix, c:"*"}, add "text" to queue
            // Process "text": md="**<em>text"
            // Process </em> suffix: md="**<em>text*";
            // Process </strong> suffix: md="**<em>text*</strong>";

            switch (tag) {
                case 'h1': openingTagMarkdown = `# ${getTextContent(element)}\n\n`; break;
                case 'h2': openingTagMarkdown = `## ${getTextContent(element)}\n\n`; break;
                case 'h3': openingTagMarkdown = `### ${getTextContent(element)}\n\n`; break;
                case 'h4': openingTagMarkdown = `#### ${getTextContent(element)}\n\n`; break;
                case 'h5': openingTagMarkdown = `##### ${getTextContent(element)}\n\n`; break;
                case 'h6': openingTagMarkdown = `###### ${getTextContent(element)}\n\n`; break;
                case 'p': closingTagSuffixContent = '\n\n'; childrenToQueue = Array.from(element.childNodes); break;
                case 'strong':
                case 'b': openingTagMarkdown = `**`; closingTagSuffixContent = `**`; childrenToQueue = Array.from(element.childNodes); break;
                case 'em':
                case 'i': openingTagMarkdown = `*`; closingTagSuffixContent = `*`; childrenToQueue = Array.from(element.childNodes); break;
                case 'code':
                    if (!element.closest('pre')) { // Inline code
                        openingTagMarkdown = `\`${getTextContent(element)}\``; // getTextContent for inline code
                        // No children to process for inline code as getTextContent handles it.
                    } else { // Code within pre
                        // Content of <code> within <pre> is typically handled by <pre>'s own text processing
                        // or by allowing its text node children to be processed.
                        // If <code> has its own children (e.g. <code><span>text</span></code> inside pre), process them.
                        childrenToQueue = Array.from(element.childNodes);
                    }
                    break;
                case 'pre':
                    openingTagMarkdown = `\`\`\`\n${getTextContent(element)}\n\`\`\`\n\n`;
                    // Children content already included via getTextContent for <pre>
                    break;
                case 'a':
                    const href = element.getAttribute('href');
                    // getTextContent for 'a' is generally fine. If 'a' contains complex block children, this simplification might lose formatting.
                    const linkText = getTextContent(element); 
                    openingTagMarkdown = href ? `[${linkText}](${href})` : linkText;
                    // Children content grabbed by getTextContent
                    break;
                case 'img':
                    const src = element.getAttribute('src');
                    const alt = element.getAttribute('alt') || 'Image';
                    openingTagMarkdown = src ? `![${alt}](${src})\n\n` : '';
                    break;
                case 'ul':
                    openingTagMarkdown = processUL(element) + '\n'; // processUL adds its own \n after each item. Add one more for spacing after list.
                    // processUL uses querySelectorAll and getTextContent, so children are not processed by this loop.
                    break;
                case 'ol':
                    openingTagMarkdown = processOL(element) + '\n'; // Similar to UL.
                    break;
                case 'li': // Special handling for li if we were to make lists iterative
                    // For now, li content is handled by processUL/processOL using getTextContent.
                    // If li were processed iteratively:
                    // openingTagMarkdown = (element.parentElement.tagName.toLowerCase() === 'ul' ? '- ' : '1. '); // Simplified index for OL
                    // childrenToQueue = Array.from(element.childNodes);
                    // closingTagSuffixContent = '\n';
                    // Fallthrough to default to let processUL/OL handle it via getTextContent for now
                    // This means children of LI won't be processed by the main loop if parent is UL/OL.
                    // If LI is encountered outside UL/OL (invalid HTML), process as default.
                    if (element.parentElement && (element.parentElement.tagName.toLowerCase() === 'ul' || element.parentElement.tagName.toLowerCase() === 'ol')) {
                        // This case should ideally not be hit if processUL/OL are used, as they consume LIs.
                        // If it is hit, it means an LI is being processed directly.
                        // We will rely on processUL/OL to handle LIs for now.
                    } else {
                         childrenToQueue = Array.from(element.childNodes); // Process as a generic element
                    }
                    break;
                case 'blockquote':
                    openingTagMarkdown = processBlockquote(element) + '\n\n';
                    // processBlockquote uses getTextContent.
                    break;
                case 'table':
                    openingTagMarkdown = processTable(element) + '\n\n';
                    // processTable uses querySelectorAll and getTextContent.
                    break;
                case 'br':
                    openingTagMarkdown = '\n';
                    break;
                default: // Handles div, span, and other passthrough elements
                    childrenToQueue = Array.from(element.childNodes);
                    break;
            }

            markdown += openingTagMarkdown;

            const itemsToAddToQueue = [];
            if (closingTagSuffixContent) {
                itemsToAddToQueue.push({ type: 'suffix', content: closingTagSuffixContent });
            }

            // Add children elements (not text nodes directly, they are handled when element is processed)
            // Add in reverse order so they are processed from first to last (due to unshift)
            for (let i = childrenToQueue.length - 1; i >= 0; i--) {
                itemsToAddToQueue.push({ element: childrenToQueue[i] });
            }
            
            if (itemsToAddToQueue.length > 0) {
                queue.unshift(...itemsToAddToQueue);
            }
        }
        return markdown;
    }
    
    function getTextContent(element) {
        return element.textContent.trim();
    }
    
    function processUL(ul) {
        const items = ul.querySelectorAll('li');
        let result = '';
        items.forEach(item => {
            result += `- ${getTextContent(item)}\n`;
        });
        return result;
    }
    
    function processOL(ol) {
        const items = ol.querySelectorAll('li');
        let result = '';
        items.forEach((item, index) => {
            result += `${index + 1}. ${getTextContent(item)}\n`;
        });
        return result;
    }
    
    function processBlockquote(blockquote) {
        const text = getTextContent(blockquote);
        return text.split('\n').map(line => `> ${line}`).join('\n');
    }
    
    function processTable(table) {
        const rows = table.querySelectorAll('tr');
        if (rows.length === 0) return '';
        
        let result = '';
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            const cellData = Array.from(cells).map(cell => getTextContent(cell).replace(/\|/g, '\\|'));
            result += `| ${cellData.join(' | ')} |\n`;
            
            if (rowIndex === 0) {
                const separator = Array(cells.length).fill('---').join(' | ');
                result += `| ${separator} |\n`;
            }
        });
        
        return result;
    }
    
    function generateFilename() {
        const url = window.location.hostname;
        const uuid = generateUUID();
        return `${url}-${uuid}.md`;
    }
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
})();