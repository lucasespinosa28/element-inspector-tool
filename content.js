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
        markdown += processElement(element);
        
        return markdown;
    }
    
    function processElement(element) {
        const tag = element.tagName.toLowerCase();
        
        switch (tag) {
            case 'h1': return `# ${getTextContent(element)}\n\n`;
            case 'h2': return `## ${getTextContent(element)}\n\n`;
            case 'h3': return `### ${getTextContent(element)}\n\n`;
            case 'h4': return `#### ${getTextContent(element)}\n\n`;
            case 'h5': return `##### ${getTextContent(element)}\n\n`;
            case 'h6': return `###### ${getTextContent(element)}\n\n`;
            case 'p': return `${processChildren(element)}\n\n`;
            case 'strong':
            case 'b': return `**${getTextContent(element)}**`;
            case 'em':
            case 'i': return `*${getTextContent(element)}*`;
            case 'code': return `\`${getTextContent(element)}\``;
            case 'pre': return `\`\`\`\n${getTextContent(element)}\n\`\`\`\n\n`;
            case 'a':
                const href = element.getAttribute('href');
                const text = getTextContent(element);
                return href ? `[${text}](${href})` : text;
            case 'img':
                const src = element.getAttribute('src');
                const alt = element.getAttribute('alt') || 'Image';
                return src ? `![${alt}](${src})\n\n` : '';
            case 'ul':
                return processUL(element) + '\n\n';
            case 'ol':
                return processOL(element) + '\n\n';
            case 'blockquote':
                return processBlockquote(element) + '\n\n';
            case 'table':
                return processTable(element) + '\n\n';
            case 'br':
                return '\n';
            default:
                return processChildren(element);
        }
    }
    
    function processChildren(element) {
        let result = '';
        for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                result += processElement(child);
            }
        }
        return result;
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