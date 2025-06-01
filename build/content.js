// node_modules/turndown/lib/turndown.browser.es.js
function extend(destination) {
  for (var i = 1;i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (source.hasOwnProperty(key))
        destination[key] = source[key];
    }
  }
  return destination;
}
function repeat(character, count) {
  return Array(count + 1).join(character);
}
function trimLeadingNewlines(string) {
  return string.replace(/^\n*/, "");
}
function trimTrailingNewlines(string) {
  var indexEnd = string.length;
  while (indexEnd > 0 && string[indexEnd - 1] === `
`)
    indexEnd--;
  return string.substring(0, indexEnd);
}
var blockElements = [
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "AUDIO",
  "BLOCKQUOTE",
  "BODY",
  "CANVAS",
  "CENTER",
  "DD",
  "DIR",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "FRAMESET",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HGROUP",
  "HR",
  "HTML",
  "ISINDEX",
  "LI",
  "MAIN",
  "MENU",
  "NAV",
  "NOFRAMES",
  "NOSCRIPT",
  "OL",
  "OUTPUT",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL"
];
function isBlock(node) {
  return is(node, blockElements);
}
var voidElements = [
  "AREA",
  "BASE",
  "BR",
  "COL",
  "COMMAND",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "KEYGEN",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR"
];
function isVoid(node) {
  return is(node, voidElements);
}
function hasVoid(node) {
  return has(node, voidElements);
}
var meaningfulWhenBlankElements = [
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TH",
  "TD",
  "IFRAME",
  "SCRIPT",
  "AUDIO",
  "VIDEO"
];
function isMeaningfulWhenBlank(node) {
  return is(node, meaningfulWhenBlankElements);
}
function hasMeaningfulWhenBlank(node) {
  return has(node, meaningfulWhenBlankElements);
}
function is(node, tagNames) {
  return tagNames.indexOf(node.nodeName) >= 0;
}
function has(node, tagNames) {
  return node.getElementsByTagName && tagNames.some(function(tagName) {
    return node.getElementsByTagName(tagName).length;
  });
}
var rules = {};
rules.paragraph = {
  filter: "p",
  replacement: function(content) {
    return `

` + content + `

`;
  }
};
rules.lineBreak = {
  filter: "br",
  replacement: function(content, node, options) {
    return options.br + `
`;
  }
};
rules.heading = {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: function(content, node, options) {
    var hLevel = Number(node.nodeName.charAt(1));
    if (options.headingStyle === "setext" && hLevel < 3) {
      var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
      return `

` + content + `
` + underline + `

`;
    } else {
      return `

` + repeat("#", hLevel) + " " + content + `

`;
    }
  }
};
rules.blockquote = {
  filter: "blockquote",
  replacement: function(content) {
    content = content.replace(/^\n+|\n+$/g, "");
    content = content.replace(/^/gm, "> ");
    return `

` + content + `

`;
  }
};
rules.list = {
  filter: ["ul", "ol"],
  replacement: function(content, node) {
    var parent = node.parentNode;
    if (parent.nodeName === "LI" && parent.lastElementChild === node) {
      return `
` + content;
    } else {
      return `

` + content + `

`;
    }
  }
};
rules.listItem = {
  filter: "li",
  replacement: function(content, node, options) {
    content = content.replace(/^\n+/, "").replace(/\n+$/, `
`).replace(/\n/gm, `
    `);
    var prefix = options.bulletListMarker + "   ";
    var parent = node.parentNode;
    if (parent.nodeName === "OL") {
      var start = parent.getAttribute("start");
      var index = Array.prototype.indexOf.call(parent.children, node);
      prefix = (start ? Number(start) + index : index + 1) + ".  ";
    }
    return prefix + content + (node.nextSibling && !/\n$/.test(content) ? `
` : "");
  }
};
rules.indentedCodeBlock = {
  filter: function(node, options) {
    return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
  },
  replacement: function(content, node, options) {
    return `

    ` + node.firstChild.textContent.replace(/\n/g, `
    `) + `

`;
  }
};
rules.fencedCodeBlock = {
  filter: function(node, options) {
    return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
  },
  replacement: function(content, node, options) {
    var className = node.firstChild.getAttribute("class") || "";
    var language = (className.match(/language-(\S+)/) || [null, ""])[1];
    var code = node.firstChild.textContent;
    var fenceChar = options.fence.charAt(0);
    var fenceSize = 3;
    var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
    var match;
    while (match = fenceInCodeRegex.exec(code)) {
      if (match[0].length >= fenceSize) {
        fenceSize = match[0].length + 1;
      }
    }
    var fence = repeat(fenceChar, fenceSize);
    return `

` + fence + language + `
` + code.replace(/\n$/, "") + `
` + fence + `

`;
  }
};
rules.horizontalRule = {
  filter: "hr",
  replacement: function(content, node, options) {
    return `

` + options.hr + `

`;
  }
};
rules.inlineLink = {
  filter: function(node, options) {
    return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function(content, node) {
    var href = node.getAttribute("href");
    if (href)
      href = href.replace(/([()])/g, "\\$1");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title)
      title = ' "' + title.replace(/"/g, "\\\"") + '"';
    return "[" + content + "](" + href + title + ")";
  }
};
rules.referenceLink = {
  filter: function(node, options) {
    return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function(content, node, options) {
    var href = node.getAttribute("href");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title)
      title = ' "' + title + '"';
    var replacement;
    var reference;
    switch (options.linkReferenceStyle) {
      case "collapsed":
        replacement = "[" + content + "][]";
        reference = "[" + content + "]: " + href + title;
        break;
      case "shortcut":
        replacement = "[" + content + "]";
        reference = "[" + content + "]: " + href + title;
        break;
      default:
        var id = this.references.length + 1;
        replacement = "[" + content + "][" + id + "]";
        reference = "[" + id + "]: " + href + title;
    }
    this.references.push(reference);
    return replacement;
  },
  references: [],
  append: function(options) {
    var references = "";
    if (this.references.length) {
      references = `

` + this.references.join(`
`) + `

`;
      this.references = [];
    }
    return references;
  }
};
rules.emphasis = {
  filter: ["em", "i"],
  replacement: function(content, node, options) {
    if (!content.trim())
      return "";
    return options.emDelimiter + content + options.emDelimiter;
  }
};
rules.strong = {
  filter: ["strong", "b"],
  replacement: function(content, node, options) {
    if (!content.trim())
      return "";
    return options.strongDelimiter + content + options.strongDelimiter;
  }
};
rules.code = {
  filter: function(node) {
    var hasSiblings = node.previousSibling || node.nextSibling;
    var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
    return node.nodeName === "CODE" && !isCodeBlock;
  },
  replacement: function(content) {
    if (!content)
      return "";
    content = content.replace(/\r?\n|\r/g, " ");
    var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
    var delimiter = "`";
    var matches = content.match(/`+/gm) || [];
    while (matches.indexOf(delimiter) !== -1)
      delimiter = delimiter + "`";
    return delimiter + extraSpace + content + extraSpace + delimiter;
  }
};
rules.image = {
  filter: "img",
  replacement: function(content, node) {
    var alt = cleanAttribute(node.getAttribute("alt"));
    var src = node.getAttribute("src") || "";
    var title = cleanAttribute(node.getAttribute("title"));
    var titlePart = title ? ' "' + title + '"' : "";
    return src ? "![" + alt + "]" + "(" + src + titlePart + ")" : "";
  }
};
function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, `
`) : "";
}
function Rules(options) {
  this.options = options;
  this._keep = [];
  this._remove = [];
  this.blankRule = {
    replacement: options.blankReplacement
  };
  this.keepReplacement = options.keepReplacement;
  this.defaultRule = {
    replacement: options.defaultReplacement
  };
  this.array = [];
  for (var key in options.rules)
    this.array.push(options.rules[key]);
}
Rules.prototype = {
  add: function(key, rule) {
    this.array.unshift(rule);
  },
  keep: function(filter) {
    this._keep.unshift({
      filter,
      replacement: this.keepReplacement
    });
  },
  remove: function(filter) {
    this._remove.unshift({
      filter,
      replacement: function() {
        return "";
      }
    });
  },
  forNode: function(node) {
    if (node.isBlank)
      return this.blankRule;
    var rule;
    if (rule = findRule(this.array, node, this.options))
      return rule;
    if (rule = findRule(this._keep, node, this.options))
      return rule;
    if (rule = findRule(this._remove, node, this.options))
      return rule;
    return this.defaultRule;
  },
  forEach: function(fn) {
    for (var i = 0;i < this.array.length; i++)
      fn(this.array[i], i);
  }
};
function findRule(rules2, node, options) {
  for (var i = 0;i < rules2.length; i++) {
    var rule = rules2[i];
    if (filterValue(rule, node, options))
      return rule;
  }
  return;
}
function filterValue(rule, node, options) {
  var filter = rule.filter;
  if (typeof filter === "string") {
    if (filter === node.nodeName.toLowerCase())
      return true;
  } else if (Array.isArray(filter)) {
    if (filter.indexOf(node.nodeName.toLowerCase()) > -1)
      return true;
  } else if (typeof filter === "function") {
    if (filter.call(rule, node, options))
      return true;
  } else {
    throw new TypeError("`filter` needs to be a string, array, or function");
  }
}
function collapseWhitespace(options) {
  var element = options.element;
  var isBlock2 = options.isBlock;
  var isVoid2 = options.isVoid;
  var isPre = options.isPre || function(node2) {
    return node2.nodeName === "PRE";
  };
  if (!element.firstChild || isPre(element))
    return;
  var prevText = null;
  var keepLeadingWs = false;
  var prev = null;
  var node = next(prev, element, isPre);
  while (node !== element) {
    if (node.nodeType === 3 || node.nodeType === 4) {
      var text = node.data.replace(/[ \r\n\t]+/g, " ");
      if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") {
        text = text.substr(1);
      }
      if (!text) {
        node = remove(node);
        continue;
      }
      node.data = text;
      prevText = node;
    } else if (node.nodeType === 1) {
      if (isBlock2(node) || node.nodeName === "BR") {
        if (prevText) {
          prevText.data = prevText.data.replace(/ $/, "");
        }
        prevText = null;
        keepLeadingWs = false;
      } else if (isVoid2(node) || isPre(node)) {
        prevText = null;
        keepLeadingWs = true;
      } else if (prevText) {
        keepLeadingWs = false;
      }
    } else {
      node = remove(node);
      continue;
    }
    var nextNode = next(prev, node, isPre);
    prev = node;
    node = nextNode;
  }
  if (prevText) {
    prevText.data = prevText.data.replace(/ $/, "");
    if (!prevText.data) {
      remove(prevText);
    }
  }
}
function remove(node) {
  var next = node.nextSibling || node.parentNode;
  node.parentNode.removeChild(node);
  return next;
}
function next(prev, current, isPre) {
  if (prev && prev.parentNode === current || isPre(current)) {
    return current.nextSibling || current.parentNode;
  }
  return current.firstChild || current.nextSibling || current.parentNode;
}
var root = typeof window !== "undefined" ? window : {};
function canParseHTMLNatively() {
  var Parser = root.DOMParser;
  var canParse = false;
  try {
    if (new Parser().parseFromString("", "text/html")) {
      canParse = true;
    }
  } catch (e) {}
  return canParse;
}
function createHTMLParser() {
  var Parser = function() {};
  {
    if (shouldUseActiveX()) {
      Parser.prototype.parseFromString = function(string) {
        var doc = new window.ActiveXObject("htmlfile");
        doc.designMode = "on";
        doc.open();
        doc.write(string);
        doc.close();
        return doc;
      };
    } else {
      Parser.prototype.parseFromString = function(string) {
        var doc = document.implementation.createHTMLDocument("");
        doc.open();
        doc.write(string);
        doc.close();
        return doc;
      };
    }
  }
  return Parser;
}
function shouldUseActiveX() {
  var useActiveX = false;
  try {
    document.implementation.createHTMLDocument("").open();
  } catch (e) {
    if (root.ActiveXObject)
      useActiveX = true;
  }
  return useActiveX;
}
var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
function RootNode(input, options) {
  var root2;
  if (typeof input === "string") {
    var doc = htmlParser().parseFromString('<x-turndown id="turndown-root">' + input + "</x-turndown>", "text/html");
    root2 = doc.getElementById("turndown-root");
  } else {
    root2 = input.cloneNode(true);
  }
  collapseWhitespace({
    element: root2,
    isBlock,
    isVoid,
    isPre: options.preformattedCode ? isPreOrCode : null
  });
  return root2;
}
var _htmlParser;
function htmlParser() {
  _htmlParser = _htmlParser || new HTMLParser;
  return _htmlParser;
}
function isPreOrCode(node) {
  return node.nodeName === "PRE" || node.nodeName === "CODE";
}
function Node2(node, options) {
  node.isBlock = isBlock(node);
  node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
  node.isBlank = isBlank(node);
  node.flankingWhitespace = flankingWhitespace(node, options);
  return node;
}
function isBlank(node) {
  return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
}
function flankingWhitespace(node, options) {
  if (node.isBlock || options.preformattedCode && node.isCode) {
    return { leading: "", trailing: "" };
  }
  var edges = edgeWhitespace(node.textContent);
  if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) {
    edges.leading = edges.leadingNonAscii;
  }
  if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) {
    edges.trailing = edges.trailingNonAscii;
  }
  return { leading: edges.leading, trailing: edges.trailing };
}
function edgeWhitespace(string) {
  var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
  return {
    leading: m[1],
    leadingAscii: m[2],
    leadingNonAscii: m[3],
    trailing: m[4],
    trailingNonAscii: m[5],
    trailingAscii: m[6]
  };
}
function isFlankedByWhitespace(side, node, options) {
  var sibling;
  var regExp;
  var isFlanked;
  if (side === "left") {
    sibling = node.previousSibling;
    regExp = / $/;
  } else {
    sibling = node.nextSibling;
    regExp = /^ /;
  }
  if (sibling) {
    if (sibling.nodeType === 3) {
      isFlanked = regExp.test(sibling.nodeValue);
    } else if (options.preformattedCode && sibling.nodeName === "CODE") {
      isFlanked = false;
    } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
      isFlanked = regExp.test(sibling.textContent);
    }
  }
  return isFlanked;
}
var reduce = Array.prototype.reduce;
var escapes = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/^>/g, "\\>"],
  [/_/g, "\\_"],
  [/^(\d+)\. /g, "$1\\. "]
];
function TurndownService(options) {
  if (!(this instanceof TurndownService))
    return new TurndownService(options);
  var defaults = {
    rules,
    headingStyle: "setext",
    hr: "* * *",
    bulletListMarker: "*",
    codeBlockStyle: "indented",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    br: "  ",
    preformattedCode: false,
    blankReplacement: function(content, node) {
      return node.isBlock ? `

` : "";
    },
    keepReplacement: function(content, node) {
      return node.isBlock ? `

` + node.outerHTML + `

` : node.outerHTML;
    },
    defaultReplacement: function(content, node) {
      return node.isBlock ? `

` + content + `

` : content;
    }
  };
  this.options = extend({}, defaults, options);
  this.rules = new Rules(this.options);
}
TurndownService.prototype = {
  turndown: function(input) {
    if (!canConvert(input)) {
      throw new TypeError(input + " is not a string, or an element/document/fragment node.");
    }
    if (input === "")
      return "";
    var output = process.call(this, new RootNode(input, this.options));
    return postProcess.call(this, output);
  },
  use: function(plugin) {
    if (Array.isArray(plugin)) {
      for (var i = 0;i < plugin.length; i++)
        this.use(plugin[i]);
    } else if (typeof plugin === "function") {
      plugin(this);
    } else {
      throw new TypeError("plugin must be a Function or an Array of Functions");
    }
    return this;
  },
  addRule: function(key, rule) {
    this.rules.add(key, rule);
    return this;
  },
  keep: function(filter) {
    this.rules.keep(filter);
    return this;
  },
  remove: function(filter) {
    this.rules.remove(filter);
    return this;
  },
  escape: function(string) {
    return escapes.reduce(function(accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }
};
function process(parentNode) {
  var self = this;
  return reduce.call(parentNode.childNodes, function(output, node) {
    node = new Node2(node, self.options);
    var replacement = "";
    if (node.nodeType === 3) {
      replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
    } else if (node.nodeType === 1) {
      replacement = replacementForNode.call(self, node);
    }
    return join(output, replacement);
  }, "");
}
function postProcess(output) {
  var self = this;
  this.rules.forEach(function(rule) {
    if (typeof rule.append === "function") {
      output = join(output, rule.append(self.options));
    }
  });
  return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
}
function replacementForNode(node) {
  var rule = this.rules.forNode(node);
  var content = process.call(this, node);
  var whitespace = node.flankingWhitespace;
  if (whitespace.leading || whitespace.trailing)
    content = content.trim();
  return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
}
function join(output, replacement) {
  var s1 = trimTrailingNewlines(output);
  var s2 = trimLeadingNewlines(replacement);
  var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
  var separator = `

`.substring(0, nls);
  return s1 + separator + s2;
}
function canConvert(input) {
  return input != null && (typeof input === "string" || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
}
var turndown_browser_es_default = TurndownService;

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
    const turndownService = new turndown_browser_es_default;
    try {
      const markdown = convertToMarkdown(element, turndownService);
      const filename = generateFilename();
      downloadFile(markdown, filename);
      chrome.runtime.sendMessage({ type: "success" });
    } catch (error) {
      console.error("Error saving element:", error);
      chrome.runtime.sendMessage({ type: "error" });
    }
  }
  function convertToMarkdown(element, turndownService) {
    let markdown = "";
    markdown += `# Element from: ${document.title}
`;
    markdown += `**URL:** ${window.location.href}
`;
    markdown += `**Date:** ${new Date().toLocaleString()}

`;
    markdown += `---

`;
    markdown += turndownService.turndown(element.outerHTML);
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
          if (element.parentElement && (element.parentElement.tagName.toLowerCase() === "ul" || element.parentElement.tagName.toLowerCase() === "ol")) {} else {
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
