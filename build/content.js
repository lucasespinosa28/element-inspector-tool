// src/content.ts
(() => {
  let isSelecting = false;
  let highlightedElement = null;
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "start") {
      startSelection();
    } else if (message.action === "stop") {
      stopSelection();
    }
  });
  function startSelection() {
    isSelecting = true;
    document.body.style.cursor = "crosshair";
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleClick, true);
  }
  function stopSelection() {
    isSelecting = false;
    document.body.style.cursor = "";
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleClick, true);
    removeHighlight();
  }
  function handleMouseOver(e) {
    if (!isSelecting)
      return;
    removeHighlight();
    const target = e.target;
    highlightedElement = target;
    target.classList.add("element-selector-highlight");
  }
  function handleMouseOut(e) {
    if (!isSelecting)
      return;
    const target = e.target;
    target.classList.remove("element-selector-highlight");
  }
  function handleClick(e) {
    if (!isSelecting)
      return;
    stopSelection();
    e.preventDefault();
    e.stopPropagation();
    const element = e.target;
    saveElementAsMarkdown(element);
  }
  function removeHighlight() {
    if (highlightedElement) {
      highlightedElement.classList.remove("element-selector-highlight");
      highlightedElement = null;
    }
  }
  function saveElementAsMarkdown(element) {
    try {
      const markdown = convertToMarkdown(element);
      const filename = generateFilename();
      downloadFile(markdown, filename);
      chrome.runtime.sendMessage({ type: "success" });
    } catch (error) {
      console.error("Error saving element:", error);
      chrome.runtime.sendMessage({ type: "error" });
    }
  }
  function convertToMarkdown(element) {
    let markdown = "";
    markdown += `# Element from: ${document.title}
`;
    markdown += `**URL:** ${window.location.href}
`;
    markdown += `**Date:** ${new Date().toLocaleString()}

`;
    markdown += `---

`;
    markdown += processElementIterative(element);
    return markdown;
  }
  function processElementIterative(rootElement) {
    let markdown = [];
    const queue = [{ element: rootElement }];
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }
      if ("type" in item && item.type === "suffix") {
        markdown.push(item.content);
        continue;
      }
      if (!("element" in item)) {
        continue;
      }
      const element = item.element;
      if (element.nodeType === Node.TEXT_NODE) {
        let text = element.textContent;
        if (text == null) {
          continue;
        }
        if (!element.parentElement || element.parentElement.tagName.toLowerCase() !== "pre") {
          if (text.trim() === "") {
            text = text.replace(/\s+/g, " ");
            if (text === " " && (markdown[markdown.length - 1] === " " || markdown[markdown.length - 1] === `
`)) {
              text = "";
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
      let childrenToQueue = [];
      let openingTagMarkdown = "";
      let closingTagSuffixContent = "";
      switch (tag) {
        case "h1":
          openingTagMarkdown = `# ${getTextContent(element)}

`;
          break;
        case "h2":
          openingTagMarkdown = `## ${getTextContent(element)}

`;
          break;
        case "h3":
          openingTagMarkdown = `### ${getTextContent(element)}

`;
          break;
        case "h4":
          openingTagMarkdown = `#### ${getTextContent(element)}

`;
          break;
        case "h5":
          openingTagMarkdown = `##### ${getTextContent(element)}

`;
          break;
        case "h6":
          openingTagMarkdown = `###### ${getTextContent(element)}

`;
          break;
        case "p":
          closingTagSuffixContent = `

`;
          childrenToQueue = Array.from(element.childNodes);
          break;
        case "strong":
        case "b":
          openingTagMarkdown = `**`;
          closingTagSuffixContent = `**`;
          childrenToQueue = Array.from(element.childNodes);
          break;
        case "em":
        case "i":
          openingTagMarkdown = `*`;
          closingTagSuffixContent = `*`;
          childrenToQueue = Array.from(element.childNodes);
          break;
        case "code":
          if (!element.closest("pre")) {
            openingTagMarkdown = `\`${getTextContent(element)}\``;
          } else {
            childrenToQueue = Array.from(element.childNodes);
          }
          break;
        case "pre":
          openingTagMarkdown = `\`\`\`
${getTextContent(element)}
\`\`\`

`;
          break;
        case "a": {
          const href = element.getAttribute("href");
          const linkText = getTextContent(element);
          openingTagMarkdown = href ? `[${linkText}](${href})` : linkText;
          break;
        }
        case "img": {
          const src = element.getAttribute("src");
          const alt = element.getAttribute("alt") || "Image";
          openingTagMarkdown = src ? `![${alt}](${src})

` : "";
          break;
        }
        case "ul":
          if (element instanceof HTMLUListElement) {
            openingTagMarkdown = processUL(element) + `
`;
          }
          break;
        case "ol":
          if (element instanceof HTMLOListElement) {
            openingTagMarkdown = processOL(element) + `
`;
          }
          break;
        case "li":
          if (element.parentElement && (element.parentElement.tagName.toLowerCase() === "ul" || element.parentElement.tagName.toLowerCase() === "ol")) {
          } else {
            childrenToQueue = Array.from(element.childNodes);
          }
          break;
        case "blockquote":
          if (element instanceof HTMLQuoteElement) {
            openingTagMarkdown = processBlockquote(element) + `

`;
          }
          break;
        case "table":
          if (element instanceof HTMLTableElement) {
            openingTagMarkdown = processTable(element) + `

`;
          }
          break;
        case "br":
          openingTagMarkdown = `
`;
          break;
        default:
          childrenToQueue = Array.from(element.childNodes);
          break;
      }
      markdown.push(openingTagMarkdown);
      const itemsToAddToQueue = [];
      if (closingTagSuffixContent) {
        itemsToAddToQueue.push({ type: "suffix", content: closingTagSuffixContent });
      }
      for (let i = childrenToQueue.length - 1;i >= 0; i--) {
        const child = childrenToQueue[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          itemsToAddToQueue.push({ element: child });
        } else if (child.nodeType === Node.TEXT_NODE) {
          markdown.push(child.textContent || "");
        }
      }
      if (itemsToAddToQueue.length > 0) {
        queue.unshift(...itemsToAddToQueue);
      }
    }
    return markdown.reverse().join("");
  }
  function getTextContent(element) {
    if (!element.textContent) {
      return "";
    }
    return element.textContent.trim();
  }
  function processUL(ulElement) {
    let result = "";
    Array.from(ulElement.children).forEach((item) => {
      if (item.tagName.toLowerCase() === "li") {
        let listItemContent = processElementIterative(item).trimEnd();
        result += `- ${listItemContent}
`;
      }
    });
    return result;
  }
  function processOL(olElement) {
    let result = "";
    let itemIndex = 1;
    Array.from(olElement.children).forEach((item) => {
      if (item.tagName.toLowerCase() === "li") {
        let listItemContent = processElementIterative(item).trimEnd();
        result += `${itemIndex}. ${listItemContent}
`;
        itemIndex++;
      }
    });
    return result;
  }
  function processBlockquote(blockquoteElement) {
    const content = processElementIterative(blockquoteElement);
    const lines = content.trimEnd().split(`
`);
    return lines.map((line) => `> ${line}`).join(`
`);
  }
  function processTable(tableElement) {
    let result = "";
    const rows = Array.from(tableElement.rows);
    if (rows.length === 0)
      return "";
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.cells);
      const cellData = cells.map((cell) => {
        let cellContent = processElementIterative(cell);
        return cellContent.replace(/\n/g, " ").replace(/\|/g, "\\|").trim();
      });
      result += `| ${cellData.join(" | ")} |
`;
      if (rowIndex === 0 && cells.length > 0) {
        const separator = Array(cells.length).fill("---").join(" | ");
        result += `| ${separator} |
`;
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
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
})();
