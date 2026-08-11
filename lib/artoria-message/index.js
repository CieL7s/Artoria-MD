import * as utils from './utils/index.js';
import * as transactionHandlers from './handlers/transaction.js';
import * as interactiveHandlers from './handlers/interactive.js';
import * as mediaHandlers from './handlers/media.js';
import * as groupHandlers from './handlers/group.js';
import * as richHandlers from './handlers/rich.js';

class ArtoriaMessage {
    constructor(client) {
        this.client = client;
    }

    detectType(content) {
        if (!content || typeof content !== 'object') return null;
        if (content.requestPaymentMessage) return 'PAYMENT';
        if (content.productMessage) return 'PRODUCT';
        if (content.albumMessage) return 'ALBUM';
        if (content.eventMessage) return 'EVENT';
        if (content.pollResultMessage) return 'POLL_RESULT';
        if (content.orderMessage) return 'ORDER';
        if (content.groupStatus) return 'GROUP_STATUS';
        if (content.groupLabel) return 'GROUP_LABEL';
        if (content.carouselMessage || content.carousel || content.cards) return 'CAROUSEL';
        if (content.quickReplyButtons) return 'QUICK_REPLY';
        if (content.urlButtons) return 'CTA_URL';
        if (content.copyCode || content.copyCodeButtons) return 'CTA_COPY';
        if (content.combinedButtons) return 'COMBINED_BUTTONS';
        if (content.tableMessage || content.table) return 'TABLE';
        if (content.tableV2Message || content.tableV2) return 'TABLE_V2';
        if (content.codeBlockMessage || content.codeBlock) return 'CODE_BLOCK';
        if (content.codeBlockV2Message || content.codeBlockV2) return 'CODE_BLOCK_V2';
        if (content.latexMessage || content.latex) return 'LATEX';
        if (content.linkMessage || content.link) return 'LINK';
        if (content.richMessage || content.rich) return 'RICH_MESSAGE';
        if (content.listMessage || (content.sections && content.buttonText)) return 'LIST';
        if (content.buttonsMessage) return 'LEGACY_BUTTONS';
        if (content.templateMessage) return 'TEMPLATE';
        if (content.interactiveButtons || content.nativeFlowMessage) return 'INTERACTIVE_BUTTONS';
        return null;
    }

    static quizFallbackText(question, choices = []) {
        const lines = choices.map((c, i) => `${i + 1}. ${c.text || c.displayText || c}`);
        const body = (question || '').trim();
        return [body, lines.join('\n')].filter(Boolean).join('\n\n') + '\n\n_Balas dengan pilihan Anda._';
    }

    static buttonsFallbackText(text, buttons = []) {
        const lines = buttons.map(btn => {
            let params = {};
            try { params = typeof btn.buttonParamsJson === 'string' ? JSON.parse(btn.buttonParamsJson) : (btn.buttonParamsJson || {}); } catch { }
            const label = params.display_text || btn.displayText || btn.text || '';
            const url = params.url || btn.url;
            const copy = params.copy_code || btn.copyCode || btn.code;
            const phone = params.phone_number || btn.phoneNumber || btn.phone;
            if (url) return `• ${label || url}: ${url}`;
            if (copy) return `• ${label ? label + ': ' : ''}${copy}`;
            if (phone) return `• ${label || 'Call'}: ${phone}`;
            return label ? `• ${label}` : null;
        }).filter(Boolean);
        const body = (text || '').trim();
        return lines.length ? [body, lines.join('\n')].filter(Boolean).join('\n\n') : body;
    }

    static copyCodeFallbackText(code, displayText, quotedPreviewText) {
        const head = quotedPreviewText ? `${quotedPreviewText.trim()}\n\n` : '';
        const label = displayText && displayText !== 'Copy Code' ? `${displayText}:\n` : '';
        return `${head}${label}\`\`\`\n${code}\n\`\`\``;
    }

    static carouselFallbackText(text, cards = []) {
        const blocks = cards.map((card, i) => {
            const parts = [`*${i + 1}.* ${card.title || ''}`.trim()];
            if (card.body) parts.push(typeof card.body === 'string' ? card.body : (card.body.text || ''));
            if (card.footer) parts.push(typeof card.footer === 'string' ? card.footer : (card.footer.text || ''));
            const btns = ArtoriaMessage.buttonsFallbackText('', card.buttons || []).trim();
            if (btns) parts.push(btns);
            return parts.join('\n');
        });
        return [(text || '').trim(), ...blocks].filter(Boolean).join('\n\n');
    }

    _resolveJid(jid, quoted) {
        if (typeof jid === 'string' && jid.trim().length > 0 && jid.includes('@')) return jid.trim();
        if (quoted?.chat && typeof quoted.chat === 'string') return quoted.chat;
        if (quoted?.key?.remoteJid && typeof quoted.key.remoteJid === 'string') return quoted.key.remoteJid;
        if (typeof jid === 'object' && jid) {
            if (typeof jid.chat === 'string') return jid.chat;
            if (typeof jid.key?.remoteJid === 'string') return jid.key.remoteJid;
            if (typeof jid.remoteJid === 'string') return jid.remoteJid;
        }
        return utils.getUserJid(this.client) || '';
    }

    async sendTable(jid, title, headers, rows, quoted, options = {}) {
        return this.handleTable({ table: { title, headers, rows, ...options } }, jid, quoted);
    }
    async sendTableV2(jid, table, quoted, options = {}) {
        return this.handleTableV2({ tableV2: table, ...options }, jid, quoted);
    }
    async sendList(jid, title, items, quoted, options = {}) {
        const targetJid = this._resolveJid(jid, quoted);
        const msgData = utils.generateListContent(title, items, quoted, options);
        await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
        return msgData;
    }
    async sendCodeBlock(jid, code, quoted, options = {}) {
        return this.handleCodeBlock({ codeBlock: code, ...options }, jid, quoted);
    }
    async sendCodeBlockV2(jid, code, quoted, options = {}) {
        return this.handleCodeBlockV2({ codeBlockV2: code, ...options }, jid, quoted);
    }
    async sendLink(jid, text, links, quoted, options = {}) {
        return this.handleLink({ link: { text, links, ...options } }, jid, quoted);
    }
    async sendLatex(jid, quoted, options = {}) {
        return this.handleLatex({ latex: options }, jid, quoted);
    }
    async sendRichMessage(jid, blocks, quoted, options = {}) {
        return this.handleRichMessage({ rich: blocks, ...options }, jid, quoted);
    }

    static bind(sock) {
        if (!sock) throw new Error('Baileys WASocket instance required for ArtoriaMessage.bind(sock)');
        const customMessages = new ArtoriaMessage(sock);
        const originalSendMessage = sock.sendMessage;
        sock.sendMessage = async (jid, content, options = {}) => {
            const messageType = customMessages.detectType(content);
            if (messageType) {
                switch (messageType) {
                    case 'EVENT': return await customMessages.handleEvent(content, jid, options.quoted);
                    case 'ORDER': return await customMessages.handleOrderMessage(content, jid, options.quoted);
                    case 'POLL_RESULT': return await customMessages.handlePollResult(content, jid, options.quoted);
                    case 'PRODUCT': return await customMessages.handleProduct(content, jid, options.quoted);
                    case 'INTERACTIVE_BUTTONS': return await customMessages.handleInteractiveButtons(content, jid, options.quoted);
                    case 'CAROUSEL': return await customMessages.handleCarousel(content, jid, options.quoted);
                    case 'QUICK_REPLY': return await customMessages.handleQuickReply(content, jid, options.quoted);
                    case 'CTA_URL': return await customMessages.handleUrlButtons(content, jid, options.quoted);
                    case 'CTA_COPY': return await customMessages.handleCopyCode(content, jid, options.quoted);
                    case 'COMBINED_BUTTONS': return await customMessages.handleCombinedButtons(content, jid, options.quoted);
                    case 'TABLE': return await customMessages.handleTable(content, jid, options.quoted);
                    case 'TABLE_V2': return await customMessages.handleTableV2(content, jid, options.quoted);
                    case 'CODE_BLOCK': return await customMessages.handleCodeBlock(content, jid, options.quoted);
                    case 'CODE_BLOCK_V2': return await customMessages.handleCodeBlockV2(content, jid, options.quoted);
                    case 'LATEX': return await customMessages.handleLatex(content, jid, options.quoted);
                    case 'LINK': return await customMessages.handleLink(content, jid, options.quoted);
                    case 'RICH_MESSAGE': return await customMessages.handleRichMessage(content, jid, options.quoted);
                    case 'LIST': return await customMessages.handleList(content, jid, options.quoted);
                    case 'LEGACY_BUTTONS': return await customMessages.handleLegacyButtons(content, jid, options.quoted);
                    case 'TEMPLATE': return await customMessages.handleTemplate(content, jid, options.quoted);
                    case 'PAYMENT': return await customMessages.handlePayment(content, jid, options.quoted);
                    case 'ALBUM': return await customMessages.handleAlbum(content, jid, options.quoted);
                    case 'GROUP_STATUS': return await customMessages.handleGroupStory(content, jid, options.quoted);
                    case 'GROUP_LABEL': return await customMessages.handleGbLabel(content, jid, options.quoted);
                }
            }
            return await originalSendMessage.call(sock, jid, content, options);
        };

        sock.sendTable = (jid, title, headers, rows, quoted, options) => customMessages.sendTable(jid, title, headers, rows, quoted, options);
        sock.sendTableV2 = (jid, table, quoted, options) => customMessages.sendTableV2(jid, table, quoted, options);
        sock.sendList = (jid, title, items, quoted, options) => customMessages.sendList(jid, title, items, quoted, options);
        sock.sendCodeBlock = (jid, code, quoted, options) => customMessages.sendCodeBlock(jid, code, quoted, options);
        sock.sendCodeBlockV2 = (jid, code, quoted, options) => customMessages.sendCodeBlockV2(jid, code, quoted, options);
        sock.sendLink = (jid, text, links, quoted, options) => customMessages.sendLink(jid, text, links, quoted, options);
        sock.sendLatex = (jid, quoted, options) => customMessages.sendLatex(jid, quoted, options);
        sock.sendRichMessage = (jid, blocks, quoted, options) => customMessages.sendRichMessage(jid, blocks, quoted, options);
        sock.artoriaMessage = customMessages;
    }
}

Object.assign(ArtoriaMessage.prototype,
    transactionHandlers,
    interactiveHandlers,
    mediaHandlers,
    groupHandlers,
    richHandlers
);

export default ArtoriaMessage;
