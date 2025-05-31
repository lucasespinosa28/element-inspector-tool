(() => {
    let isSelecting: boolean = false;
    let highlightedElement: HTMLElement | null = null;

    // Define message interface for better type safety
    interface Message {
        action: 'start' | 'stop';
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message: Message) => {
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

    function handleMouseOver(e: MouseEvent) {
        if (!isSelecting) return;
        removeHighlight();
        const target = e.target as HTMLElement;
        highlightedElement = target;
        target.classList.add('element-selector-highlight');
    }

    function handleMouseOut(e: MouseEvent) {
        if (!isSelecting) return;
        const target = e.target as HTMLElement;
        target.classList.remove('element-selector-highlight');
    }

    function handleClick(e: MouseEvent) {
        if (!isSelecting) return;

        stopSelection();

        e.preventDefault();
        e.stopPropagation();

        const element = e.target as HTMLElement;
        saveElementAsMarkdown(element);
    }

    // Interface for the queue item
    type QueueItem = 
        | { element: Element }
        | { type: 'suffix', content: string };

    function removeHighlight() {
        if (highlightedElement) {
            highlightedElement.classList.remove('element-selector-highlight');
            highlightedElement = null;
        }
    }

    function saveElementAsMarkdown(element: HTMLElement) {
        try {
            const markdown: string = convertToMarkdown(element);
            const filename: string = generateFilename();
            downloadFile(markdown, filename);
            chrome.runtime.sendMessage({ type: 'success' });
        } catch (error) {
            console.error('Error saving element:', error);
            chrome.runtime.sendMessage({ type: 'error' });
        }
    }

    function convertToMarkdown(element: HTMLElement) {
        let markdown: string = '';

        // Add header with metadata
        markdown += `# Element from: ${document.title}\n`;
        markdown += `**URL:** ${window.location.href}\n`;
        // markdown += `**Element:** ${element.tagName.toLowerCase()}\n`;
        markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
        markdown += '---\n\n';

        // Convert element content
        markdown += processElementIterative(element);

        return markdown;
    }

    // Iterative function to process elements and avoid call stack limits
    function processElementIterative(rootElement: HTMLElement | Element) {
        let markdown: string[] = [];
        const queue: QueueItem[] = [{ element: rootElement }];
        while (queue.length > 0) {
            const item = queue.shift();
            if(!item) {
                continue;
            }
            if ('type' in item && item.type === 'suffix') {
                markdown.push(item.content!);
                continue;
            }
            if (!('element' in item)) {
                continue;
            }
            const element: Element = item.element!;

            if (element.nodeType === Node.TEXT_NODE) {
                let text = element.textContent;
                if (text == null) {
                    continue;
                }
                if (!element.parentElement || element.parentElement.tagName.toLowerCase() !== 'pre') {
                    if (text.trim() === '') {
                        text = text.replace(/\s+/g, ' ');
                        if (text === ' ' && (markdown[markdown.length - 1] === ' ' || markdown[markdown.length - 1] === '\n')) {
                            text = '';
                        }
                    }
                }
                markdown.push(text);
                continue;
            }

            if (element.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }

            const tag = element.tagName.toLowerCase();
            let childrenToQueue: ChildNode[] = [];
            let openingTagMarkdown = '';
            let closingTagSuffixContent = '';

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
                    if (!element.closest('pre')) {
                        openingTagMarkdown = `\`${getTextContent(element)}\``;
                    } else {
                        childrenToQueue = Array.from(element.childNodes);
                    }
                    break;
                case 'pre':
                    openingTagMarkdown = `\`\`\`\n${getTextContent(element)}\n\`\`\`\n\n`;
                    break;
                case 'a': {
                    const href = element.getAttribute('href');
                    const linkText = getTextContent(element);
                    openingTagMarkdown = href ? `[${linkText}](${href})` : linkText;
                    break;
                }
                case 'img': {
                    const src = element.getAttribute('src');
                    const alt = element.getAttribute('alt') || 'Image';
                    openingTagMarkdown = src ? `![${alt}](${src})\n\n` : '';
                    break;
                }
                case 'ul':
                    if (element instanceof HTMLUListElement) {
                        openingTagMarkdown = processUL(element) + '\n';
                    }
                    break;
                case 'ol':
                    if (element instanceof HTMLOListElement) {
                        openingTagMarkdown = processOL(element) + '\n';
                    }
                    break;
                case 'li':
                    if (element.parentElement && (element.parentElement.tagName.toLowerCase() === 'ul' || element.parentElement.tagName.toLowerCase() === 'ol')) {
                        // handled by processUL/OL
                    } else {
                        childrenToQueue = Array.from(element.childNodes);
                    }
                    break;
                case 'blockquote':
                    if (element instanceof HTMLQuoteElement) {
                        openingTagMarkdown = processBlockquote(element) + '\n\n';
                    }
                    break;
                case 'table':
                    if (element instanceof HTMLTableElement) {
                        openingTagMarkdown = processTable(element) + '\n\n';
                    }
                    break;
                case 'br':
                    openingTagMarkdown = '\n';
                    break;
                default:
                    childrenToQueue = Array.from(element.childNodes);
                    break;
            }

            markdown.push(openingTagMarkdown);

            const itemsToAddToQueue: QueueItem[] = [];
            if (closingTagSuffixContent) {
                itemsToAddToQueue.push({ type: 'suffix', content: closingTagSuffixContent });
            }
            for (let i = childrenToQueue.length - 1; i >= 0; i--) {
                const child = childrenToQueue[i];
                if (child.nodeType === Node.ELEMENT_NODE) {
                    itemsToAddToQueue.push({ element: child as Element });
                } else if (child.nodeType === Node.TEXT_NODE) {
                    // Handle text nodes directly as markdown
                    markdown.push(child.textContent || '');
                }
            }
            if (itemsToAddToQueue.length > 0) {
                queue.unshift(...itemsToAddToQueue);
            }
        }
        return markdown.reverse().join('');
    }

    function getTextContent(element: Element) {
        if(!element.textContent){
            return '';
        }
        return element.textContent.trim();
    }

    function processUL(ulElement: HTMLUListElement) {
        let result: string = '';
        Array.from(ulElement.children).forEach(item => {
            if (item.tagName.toLowerCase() === 'li') {
                let listItemContent = processElementIterative(item as HTMLElement).trimEnd();
                result += `- ${listItemContent}\n`;
            }
        });
        return result;
    }

    function processOL(olElement: HTMLOListElement) {
        let result: string = '';
        let itemIndex: number = 1;
        Array.from(olElement.children).forEach(item => {
            if (item.tagName.toLowerCase() === 'li') {
                let listItemContent = processElementIterative(item as HTMLElement).trimEnd();
                result += `${itemIndex}. ${listItemContent}\n`;
                itemIndex++;
            }
        });
        return result;
    }

    function processBlockquote(blockquoteElement: HTMLQuoteElement) {
        const content = processElementIterative(blockquoteElement);
        const lines = content.trimEnd().split('\n');
        return lines.map(line => `> ${line}`).join('\n');
    }

    function processTable(tableElement: HTMLTableElement) {
        let result: string = '';
        const rows = Array.from(tableElement.rows);

        if (rows.length === 0) return '';

        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.cells);
            const cellData = cells.map(cell => {
                let cellContent = processElementIterative(cell as HTMLElement);
                return cellContent.replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
            });
            result += `| ${cellData.join(' | ')} |\n`;

            if (rowIndex === 0 && cells.length > 0) {
                const separator = Array(cells.length).fill('---').join(' | ');
                result += `| ${separator} |\n`;
            }
        });

        return result;
    }

    function generateFilename():string {
        const url = window.location.hostname;
        const uuid = generateUUID();
        return `${url}-${uuid}.md`;
    }

    function generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function downloadFile(content: string, filename: string) {
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