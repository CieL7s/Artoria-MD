import * as utils from '../utils/index.js';

export async function handleTable(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.tableMessage || content.table || content;
    const title = data.title || content.title || 'Table';
    const headers = data.headers || content.headers || [];
    const rows = data.rows || content.rows || [];
    const options = { footer: data.footer || content.footer, headerText: data.headerText || content.headerText };
    const msgData = utils.generateTableContent(title, headers, rows, quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleTableV2(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const table = content.tableV2Message || content.tableV2 || content.table;
    const options = { title: content.title, footer: content.footer, headerText: content.headerText, text: content.text };
    const msgData = utils.generateTableContentV2(table, quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleCodeBlock(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.codeBlockMessage || content.codeBlock || content;
    const code = typeof data === 'string' ? data : (data.code || content.code || '');
    const options = {
        title: data?.title || content.title,
        footer: data?.footer || content.footer,
        language: data?.language || content.language || 'javascript'
    };
    const msgData = utils.generateCodeBlockContent(code, quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleCodeBlockV2(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.codeBlockV2Message || content.codeBlockV2 || content;
    const code = typeof data === 'string' ? data : (data.code || content.code || '');
    const options = {
        title: data?.title || content.title,
        footer: data?.footer || content.footer,
        language: data?.language || content.language || 'javascript',
        text: data?.text || content.text
    };
    const msgData = utils.generateCodeBlockContentV2(code, quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleLink(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.linkMessage || content.link || content;
    const text = data.text || content.text || '';
    const links = data.links || content.links || [];
    const options = { footer: data.footer || content.footer };
    const msgData = utils.generateLinkContent(text, links, quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleLatex(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const data = content.latexMessage || content.latex || content;
    const options = typeof data === 'object' ? data : { expressions: [{ latexExpression: data }] };
    const msgData = utils.generateLatexContent(quoted, options);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleRichMessage(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const blocks = content.richMessage || content.rich || content.blocks || (Array.isArray(content) ? content : []);
    const submessages = [];
    for (const block of blocks) {
        if (block.type === 'text') {
            submessages.push({ messageType: 2, messageText: block.text || block.content });
        } else if (block.type === 'code') {
            submessages.push({
                messageType: 5,
                codeMetadata: {
                    codeLanguage: block.language || 'javascript',
                    codeBlocks: utils.tokenizeCode(block.code || block.content || '', block.language || 'javascript')
                }
            });
        } else if (block.type === 'table') {
            const tableRows = [
                { items: block.headers || [], isHeading: true },
                ...(block.rows || []).map(row => ({ items: row.map(String) }))
            ];
            submessages.push({
                messageType: 4,
                tableMetadata: { title: block.title || '', rows: tableRows }
            });
        } else if (block.type === 'list') {
            const items = (block.items || []).map(item => ({ items: [String(item)] }));
            submessages.push({
                messageType: 4,
                tableMetadata: { title: block.title || '', rows: items }
            });
        }
    }
    const msgData = utils.generateRichMessageContent(submessages, quoted);
    await this.client.relayMessage(targetJid, msgData.message, { messageId: msgData.messageId });
    return msgData;
}

export async function handleList(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const listData = content.listMessage || content;
    const sections = (listData.sections || []).map((sec) => ({
        title: sec.title || '',
        rows: (sec.rows || []).map((r) => ({
            header: r.header || '',
            title: r.title || '',
            description: r.description || '',
            id: r.rowId || r.id || '',
        })),
    }));

    const buttonParamsJson = JSON.stringify({
        title: listData.buttonText || listData.button_text || 'Pilih',
        sections: sections,
    });

    const interactiveContent = {
        header: {
            title: listData.title || '',
            hasMediaAttachment: false,
        },
        body: {
            text: listData.description || listData.text || listData.body || '',
        },
        footer: {
            text: listData.footer || listData.footerText || '',
        },
        nativeFlowMessage: {
            buttons: [{
                name: 'single_select',
                buttonParamsJson: buttonParamsJson,
            }],
        },
    };

    return await utils.relayInteractive(this.client, targetJid, interactiveContent, {
        quoted,
        badge: content.badge !== false,
    });
}

export async function handleLegacyButtons(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const btnData = content.buttonsMessage || content;
    const { proto, generateWAMessageFromContent } = await import('@whiskeysockets/baileys');
    const msg = generateWAMessageFromContent(targetJid, {
        buttonsMessage: proto.Message.ButtonsMessage.fromObject({
            contentText: btnData.contentText || btnData.text || '',
            footerText: btnData.footerText || btnData.footer || '',
            headerType: 1,
            buttons: (btnData.buttons || []).map((btn) => ({
                buttonId: btn.id || btn.buttonId,
                buttonText: { displayText: btn.displayText || btn.text },
                type: 1,
            })),
        })
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}

export async function handleTemplate(content, jid, quoted) {
    const targetJid = this._resolveJid(jid, quoted);
    const tmplData = content.templateMessage || content;
    const { proto, generateWAMessageFromContent } = await import('@whiskeysockets/baileys');
    const msg = generateWAMessageFromContent(targetJid, {
        templateMessage: proto.Message.TemplateMessage.fromObject({
            hydratedTemplate: {
                hydratedContentText: tmplData.hydratedContentText || tmplData.text || '',
                hydratedFooterText: tmplData.hydratedFooterText || tmplData.footer || '',
                hydratedTitleText: tmplData.hydratedTitleText || tmplData.title || '',
                hydratedButtons: (tmplData.buttons || tmplData.hydratedButtons || []).map((btn) => {
                    if (btn.quickReplyButton) {
                        return {
                            index: btn.index,
                            quickReplyButton: {
                                displayText: btn.quickReplyButton.displayText || btn.quickReplyButton.text,
                                id: btn.quickReplyButton.id,
                            },
                        };
                    }
                    if (btn.urlButton) {
                        return {
                            index: btn.index,
                            urlButton: {
                                displayText: btn.urlButton.displayText || btn.urlButton.text,
                                url: btn.urlButton.url,
                            },
                        };
                    }
                    if (btn.callButton) {
                        return {
                            index: btn.index,
                            callButton: {
                                displayText: btn.callButton.displayText || btn.callButton.text,
                                phoneNumber: btn.callButton.phoneNumber || btn.callButton.phone,
                            },
                        };
                    }
                    return btn;
                }),
            },
        })
    }, {
        userJid: utils.getUserJid(this.client),
        quoted
    });

    await this.client.relayMessage(targetJid, msg.message, { messageId: msg.key.id });
    return msg;
}
