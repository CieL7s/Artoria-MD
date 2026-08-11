import { generateWAMessageFromContent, generateMessageID, proto, isJidGroup } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import fs from 'fs';

export function getUserJid(client) {
    if (!client?.user?.id) return undefined;
    const id = client.user.id.split(':')[0];
    return id ? `${id}@s.whatsapp.net` : undefined;
}

export function buildInteractiveNodes(jid, badge = true) {
    const nodes = [
        {
            tag: 'biz',
            attrs: {},
            content: [
                {
                    tag: 'interactive',
                    attrs: { type: 'native_flow', v: '1' },
                    content: [
                        { tag: 'native_flow', attrs: { v: '9', name: 'mixed' } },
                    ],
                },
            ],
        },
    ];
    if (badge && !isJidGroup(jid)) {
        nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
    }
    return nodes;
}

export async function relayInteractive(client, jid, interactiveContent, options = {}) {
    const { quoted, badge = true, mentions = [], nonJidMentions = 0 } = options;
    const ctxFields = {};
    if (mentions.length > 0) ctxFields.mentionedJid = mentions;
    if (nonJidMentions > 0) ctxFields.nonJidMentions = nonJidMentions;

    if (Object.keys(ctxFields).length > 0 && proto?.ContextInfo) {
        interactiveContent.contextInfo = proto.ContextInfo.create(ctxFields);
    }

    const userJid = getUserJid(client);
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                },
                interactiveMessage: interactiveContent,
            },
        },
    }, {
        userJid,
        ...(quoted ? { quoted } : {}),
    });

    await client.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: buildInteractiveNodes(jid, badge),
    });

    return msg;
}

export async function fetchMediaBuffer(input) {
    if (!input) return input;
    if (Buffer.isBuffer(input)) return input;
    
    const url = typeof input === 'string' ? input : (input?.url || null);
    if (!url) return input;

    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*,*/*;q=0.8'
                }
            });
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
        } catch (e) {
            console.error("[CustomMessages] Error fetching media URL:", e.message);
        }
    } else if (typeof url === 'string' && fs.existsSync(url)) {
        try {
            return fs.readFileSync(url);
        } catch (e) {
            console.error("[CustomMessages] Error reading local media file:", e.message);
        }
    }
    return typeof input === 'string' ? { url: input } : input;
}

const JS_KEYWORDS = new Set([
  "import", "export", "from", "default", "as", "const", "let", "var", "function", "class",
  "extends", "new", "return", "if", "else", "for", "while", "do", "switch", "case", "break",
  "continue", "try", "catch", "finally", "throw", "async", "await", "yield", "typeof",
  "instanceof", "in", "of", "delete", "void", "true", "false", "null", "undefined", "NaN",
  "Infinity", "this", "super", "static", "get", "set", "debugger", "with"
]);
const PYTHON_KEYWORDS = new Set([
  "import", "from", "as", "def", "class", "return", "if", "elif", "else", "for", "while",
  "break", "continue", "try", "except", "finally", "raise", "with", "yield", "lambda",
  "pass", "del", "global", "nonlocal", "assert", "True", "False", "None", "and", "or",
  "not", "in", "is", "async", "await", "self", "print"
]);
const GO_KEYWORDS = new Set([
  "func", "package", "import", "return", "if", "else", "for", "switch", "case", "break",
  "continue", "type", "struct", "interface", "map", "chan", "go", "defer", "const",
  "var", "range", "true", "false", "nil", "select", "default", "fallthrough"
]);
const LUA_KEYWORDS = new Set([
  "function", "end", "if", "then", "else", "elseif", "for", "while", "do", "local",
  "return", "true", "false", "nil", "repeat", "until", "in", "not", "and", "or"
]);
const BASH_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac",
  "echo", "export", "return", "in", "function", "local", "read", "set", "unset",
  "true", "false", "exit", "source", "alias", "declare", "typeset"
]);

const LANGUAGE_KEYWORDS = {
  javascript: JS_KEYWORDS, typescript: JS_KEYWORDS, js: JS_KEYWORDS, ts: JS_KEYWORDS,
  python: PYTHON_KEYWORDS, py: PYTHON_KEYWORDS,
  go: GO_KEYWORDS, golang: GO_KEYWORDS,
  lua: LUA_KEYWORDS,
  bash: BASH_KEYWORDS, sh: BASH_KEYWORDS, shell: BASH_KEYWORDS,
};

const CodeHighlightType = { DEFAULT: 0, KEYWORD: 1, METHOD: 2, STRING: 3, NUMBER: 4, COMMENT: 5 };
const HIGHLIGHT_TYPE_MAP = { 0: "DEFAULT", 1: "KEYWORD", 2: "METHOD", 3: "STR", 4: "NUMBER", 5: "COMMENT" };

export function tokenizeCode(codeStr, language = "javascript") {
  const keywords = LANGUAGE_KEYWORDS[language] || JS_KEYWORDS;
  const blocks = [];
  const lines = codeStr.split("\n");
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const isLast = li === lines.length - 1;
    const nl = isLast ? "" : "\n";
    if (!line.trim()) {
      blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: line + nl });
      continue;
    }
    if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
      blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: line + nl });
      continue;
    }
    const regex = /(\/\/.*$|#.*$)|(["'`](?:[^"'`\\]|\\.)*["'`])|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|([^\s\w$"'`]+)|(\s+)/g;
    let match;
    const tokens = [];
    while ((match = regex.exec(line)) !== null) {
      const val = match[0];
      if (match[1]) tokens.push({ highlightType: CodeHighlightType.COMMENT, codeContent: val });
      else if (match[2]) tokens.push({ highlightType: CodeHighlightType.STRING, codeContent: val });
      else if (match[3]) tokens.push({ highlightType: CodeHighlightType.NUMBER, codeContent: val });
      else if (match[4]) {
        if (keywords.has(val)) tokens.push({ highlightType: CodeHighlightType.KEYWORD, codeContent: val });
        else {
          const after = line.slice(regex.lastIndex).trimStart();
          if (after.startsWith("(")) tokens.push({ highlightType: CodeHighlightType.METHOD, codeContent: val });
          else tokens.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: val });
        }
      } else tokens.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: val });
    }
    if (tokens.length === 0) {
      blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: line + nl });
      continue;
    }
    const merged = [];
    for (const t of tokens) {
      const prev = merged.length > 0 ? merged[merged.length - 1] : undefined;
      if (prev && prev.highlightType === t.highlightType) prev.codeContent += t.codeContent;
      else merged.push({ ...t });
    }
    if (merged.length > 0) merged[merged.length - 1].codeContent += nl;
    blocks.push(...merged);
  }
  return blocks;
}

export function tokenizeCodeV2(code, language = "javascript") {
  const keywords = LANGUAGE_KEYWORDS[language] || JS_KEYWORDS;
  const tokens = [];
  let i = 0;
  const n = code.length;
  const push = (codeContent, highlightType) => {
    if (!codeContent) return;
    const last = tokens[tokens.length - 1];
    if (last && last.highlightType === highlightType) last.codeContent += codeContent;
    else tokens.push({ codeContent, highlightType });
  };
  const isWord = (c) => /[a-zA-Z0-9_$]/.test(c);
  while (i < n) {
    const c = code[i];
    if (c === "\n" || c === "\t" || c === " " || /\s/.test(c)) {
      let s = i;
      while (i < n && /\s/.test(code[i])) i++;
      push(code.slice(s, i), 0);
      continue;
    }
    if (c === "/" && code[i + 1] === "/") {
      let s = i;
      i += 2;
      while (i < n && code[i] !== "\n") i++;
      push(code.slice(s, i), 5);
      continue;
    }
    if (c === "#") {
      let s = i;
      i++;
      while (i < n && code[i] !== "\n") i++;
      push(code.slice(s, i), 5);
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let quote = c;
      let s = i;
      i++;
      while (i < n) {
        if (code[i] === "\\" && i + 1 < n) i += 2;
        else if (code[i] === quote) { i++; break; }
        else i++;
      }
      push(code.slice(s, i), 3);
      continue;
    }
    if (/[0-9]/.test(c)) {
      let s = i;
      while (i < n && /[0-9.]/.test(code[i])) i++;
      push(code.slice(s, i), 4);
      continue;
    }
    if (/[a-zA-Z_$]/.test(c)) {
      let s = i;
      while (i < n && isWord(code[i])) i++;
      const word = code.slice(s, i);
      let type = 0;
      if (keywords.has(word)) type = 1;
      else {
        let j = i;
        while (j < n && /\s/.test(code[j])) j++;
        if (code[j] === "(") type = 2;
      }
      push(word, type);
      continue;
    }
    push(c, 0);
    i++;
  }
  return {
    codeBlock: tokens,
    unified_codeBlock: tokens.map((t) => ({
      content: t.codeContent,
      type: HIGHLIGHT_TYPE_MAP[t.highlightType] || "DEFAULT",
    })),
  };
}

export function buildRichContextInfo(quoted) {
  const ctxInfo = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
    forwardOrigin: 4,
  };
  if (quoted?.key) {
    ctxInfo.stanzaId = quoted.key.id;
    ctxInfo.participant = quoted.key.participant || quoted.sender || quoted.key.remoteJid;
    ctxInfo.quotedMessage = quoted.message;
  }
  return ctxInfo;
}

export function buildBotForwardedMessage(submessages, contextInfo, unifiedResponse) {
  const richResponse = {
    messageType: 1,
    submessages,
    contextInfo,
  };
  if (unifiedResponse) richResponse.unifiedResponse = unifiedResponse;
  return {
    botForwardedMessage: {
      message: {
        richResponseMessage: richResponse,
      },
    },
  };
}

export function generateTableContent(title, headers, rows, quoted, options = {}) {
  const { footer, headerText } = options;
  const tableRows = [
    { items: headers, isHeading: true },
    ...rows.map((row) => ({ items: row.map(String) })),
  ];
  const submessages = [];
  if (headerText) submessages.push({ messageType: 2, messageText: headerText });
  submessages.push({ messageType: 4, tableMetadata: { title, rows: tableRows } });
  if (footer) submessages.push({ messageType: 2, messageText: footer });
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: buildBotForwardedMessage(submessages, ctxInfo),
    messageId: generateMessageID(),
  };
}

export function toTableMetadataV2(arr) {
  if (!Array.isArray(arr) || arr.length === 0) throw new Error("Input must be a non-empty array");
  const [title, headerStr, ...rest] = arr;
  const splitCols = (str) => {
    if (typeof str !== "string") return [];
    return str.includes("|")
      ? str.split("|").map((s) => s.trim())
      : str.split(",").map((s) => s.trim());
  };
  const splitRows = (str) => {
    if (typeof str !== "string") return [];
    return str.split(";;").map((row) => splitCols(row));
  };
  const header = splitCols(headerStr);
  const parsedRows = rest.flatMap(splitRows);
  const maxLen = Math.max(header.length, ...parsedRows.map((r) => r.length));
  const unified_rows = [
    { is_header: true, cells: [...header, ...Array(maxLen - header.length).fill("")] },
    ...parsedRows.map((cells) => ({ is_header: false, cells: [...cells, ...Array(maxLen - cells.length).fill("")] })),
  ];
  const rows = unified_rows.map((r) => ({
    items: r.cells,
    ...(r.is_header ? { isHeading: true } : {}),
  }));
  return { title, rows, unified_rows };
}

export function generateTableContentV2(table, quoted, options = {}) {
  const { title, footer, headerText, text } = options;
  const { unified_rows } = toTableMetadataV2(table);
  const sections = [];
  if (headerText || title) {
    sections.push({
      view_model: {
        primitive: { text: headerText || title, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
  if (text) {
    sections.push({
      view_model: {
        primitive: { text, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
  sections.push({
    view_model: {
      primitive: { rows: unified_rows, __typename: "GenATableUXPrimitive" },
      __typename: "GenAISingleLayoutViewModel",
    },
  });
  if (footer) {
    sections.push({
      view_model: {
        primitive: { text: footer, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
  const responseId = crypto.randomUUID ? crypto.randomUUID() : generateMessageID();
  const unifiedData = { response_id: responseId, sections };
  const base64Data = Buffer.from(JSON.stringify(unifiedData)).toString("base64");
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            submessages: [],
            messageType: 1,
            unifiedResponse: { data: base64Data },
            contextInfo: ctxInfo,
          },
        },
      },
    },
    messageId: generateMessageID(),
  };
}

export function generateListContent(title, items, quoted, options = {}) {
  const { footer, headerText } = options;
  const tableRows = items.map((item) => ({
    items: Array.isArray(item) ? item.map(String) : [String(item)],
  }));
  const submessages = [];
  if (headerText) submessages.push({ messageType: 2, messageText: headerText });
  submessages.push({ messageType: 4, tableMetadata: { title, rows: tableRows } });
  if (footer) submessages.push({ messageType: 2, messageText: footer });
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: buildBotForwardedMessage(submessages, ctxInfo),
    messageId: generateMessageID(),
  };
}

export function generateCodeBlockContent(code, quoted, options = {}) {
  const { title, footer, language = "javascript" } = options;
  const submessages = [];
  if (title) submessages.push({ messageType: 2, messageText: title });
  const codeStr = typeof code === 'string' ? code : (code?.code || '');
  submessages.push({
    messageType: 5,
    codeMetadata: {
      codeLanguage: language,
      codeBlocks: tokenizeCode(codeStr, language),
    },
  });
  if (footer) submessages.push({ messageType: 2, messageText: footer });
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: buildBotForwardedMessage(submessages, ctxInfo),
    messageId: generateMessageID(),
  };
}

export function generateCodeBlockContentV2(code, quoted, options = {}) {
  const { title, footer, language = "javascript", text } = options;
  const codeStr = typeof code === 'string' ? code : (code?.code || '');
  const { unified_codeBlock } = tokenizeCodeV2(codeStr, language);
  const sections = [];
  if (text) {
    sections.push({
      view_model: {
        primitive: { text, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
  sections.push({
    view_model: {
      primitive: { language, code_blocks: unified_codeBlock, __typename: "GenAICodeUXPrimitive" },
      __typename: "GenAISingleLayoutViewModel",
    },
  });
  if (footer) {
    sections.push({
      view_model: {
        primitive: { text: footer, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }
  const responseId = crypto.randomUUID ? crypto.randomUUID() : generateMessageID();
  const unifiedData = { response_id: responseId, sections };
  const base64Data = Buffer.from(JSON.stringify(unifiedData)).toString("base64");
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            submessages: [],
            messageType: 1,
            unifiedResponse: { data: base64Data },
            contextInfo: ctxInfo,
          },
        },
      },
    },
    messageId: generateMessageID(),
  };
}

export function generateLinkContent(text, links, quoted, options = {}) {
  const { footer, searchEngine = "MAME" } = options;
  const linkList = links || [];
  
  let bodyText = text || '';
  const formattedLinkLines = linkList.map((link, i) => {
    const url = typeof link === "string" ? link : link.url;
    const displayName = typeof link === "object" && link.displayName ? link.displayName : `Link ${i + 1}`;
    return `\n🔗 *${displayName}*: ${url}`;
  });
  if (formattedLinkLines.length > 0 && !bodyText.includes('http')) {
    bodyText += formattedLinkLines.join('');
  }
  
  const submessages = [];
  const fullText = footer ? `${bodyText}\n\n${footer}` : bodyText;
  submessages.push({ messageType: 2, messageText: fullText });

  const sections = [];
  const inlineEntities = linkList.map((link, i) => {
    const url = typeof link === "string" ? link : link.url;
    const displayName = typeof link === "object" && link.displayName ? link.displayName : `Link ${i + 1}`;
    const sourceDisplayName = typeof link === "object" && link.sourceDisplayName ? link.sourceDisplayName : displayName;
    const sourceSubtitle = typeof link === "object" && link.sourceSubtitle ? link.sourceSubtitle : url;
    return {
      key: `IE_${i}`,
      metadata: {
        reference_id: i + 1,
        reference_url: url,
        reference_title: displayName,
        reference_display_name: displayName,
        sources: [
          {
            source_type: "THIRD_PARTY",
            source_display_name: sourceDisplayName,
            source_subtitle: sourceSubtitle,
            source_url: url,
          },
        ],
        __typename: "GenAISearchCitationItem",
      },
    };
  });

  sections.push({
    view_model: {
      primitive: {
        text: bodyText,
        inline_entities: inlineEntities,
        __typename: "GenAIMarkdownTextUXPrimitive",
      },
      __typename: "GenAISingleLayoutViewModel",
    },
  });

  const searchSources = linkList.map((link, i) => {
    const url = typeof link === "string" ? link : link.url;
    const sourceDisplayName = typeof link === "object" && link.sourceDisplayName ? link.sourceDisplayName : (typeof link === "object" && link.displayName ? link.displayName : `Source ${i + 1}`);
    const sourceSubtitle = typeof link === "object" && link.sourceSubtitle ? link.sourceSubtitle : url;
    return {
      source_type: "THIRD_PARTY",
      source_display_name: sourceDisplayName,
      source_subtitle: sourceSubtitle,
      source_url: url,
    };
  });

  if (searchSources.length > 0) {
    sections.push({
      view_model: {
        primitive: {
          sources: searchSources,
          search_engine: searchEngine,
          __typename: "GenAISearchResultPrimitive",
        },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }

  if (footer) {
    sections.push({
      view_model: {
        primitive: { text: footer, __typename: "GenAIMarkdownTextUXPrimitive" },
        __typename: "GenAISingleLayoutViewModel",
      },
    });
  }

  const responseId = crypto.randomUUID ? crypto.randomUUID() : generateMessageID();
  const unifiedData = { response_id: responseId, sections };
  const base64Data = Buffer.from(JSON.stringify(unifiedData)).toString("base64");
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages,
            unifiedResponse: { data: base64Data },
            contextInfo: ctxInfo,
          },
        },
      },
    },
    messageId: generateMessageID(),
  };
}

export function generateLatexContent(quoted, options = {}) {
  const { text, expressions = [], headerText, footer } = options;
  const submessages = [];
  
  if (headerText) submessages.push({ messageType: 2, messageText: headerText });
  if (text) submessages.push({ messageType: 2, messageText: text });

  const latexExpressions = expressions.map((expr) => {
    const entry = {
      latexExpression: typeof expr === 'string' ? expr : expr.latexExpression,
      url: (typeof expr === 'object' && expr.url) ? expr.url : '',
      width: (typeof expr === 'object' && expr.width) ? expr.width : 400,
      height: (typeof expr === 'object' && expr.height) ? expr.height : 100,
    };
    if (typeof expr === 'object') {
      if (expr.fontHeight !== undefined) entry.fontHeight = expr.fontHeight;
      if (expr.imageTopPadding !== undefined) entry.imageTopPadding = expr.imageTopPadding;
      if (expr.imageLeadingPadding !== undefined) entry.imageLeadingPadding = expr.imageLeadingPadding;
      if (expr.imageBottomPadding !== undefined) entry.imageBottomPadding = expr.imageBottomPadding;
      if (expr.imageTrailingPadding !== undefined) entry.imageTrailingPadding = expr.imageTrailingPadding;
    }
    return entry;
  });

  submessages.push({
    messageType: 8,
    latexMetadata: {
      text: text || "",
      expressions: latexExpressions,
    },
  });

  if (footer) submessages.push({ messageType: 2, messageText: footer });
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: buildBotForwardedMessage(submessages, ctxInfo),
    messageId: generateMessageID(),
  };
}

export function generateRichMessageContent(submessages, quoted) {
  const ctxInfo = buildRichContextInfo(quoted);
  return {
    message: buildBotForwardedMessage(submessages, ctxInfo),
    messageId: generateMessageID(),
  };
}
