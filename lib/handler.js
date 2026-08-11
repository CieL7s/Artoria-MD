import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { downloadMediaMessage, extractMessageContent, getContentType, proto } from '@whiskeysockets/baileys';
import { initUser, initGroup } from './database.js';
import logger from './logger.js';
import { createRequire } from 'module';
import { addMessageLog, incrementMessage, incrementCommand, updatePluginsList } from './dashboard.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGINS_DIR = path.join(__dirname, '../plugins');

const normalizeJid = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    if (raw.includes('@')) {
        const atIndex = raw.indexOf('@');
        return `${raw.split(':')[0].slice(0, atIndex)}${raw.slice(atIndex)}`;
    }
    return raw.split(':')[0];
};

const normalizeNumber = (value) => {
    const jid = normalizeJid(value);
    return jid.includes('@') ? jid.split('@')[0] : jid;
};

// Ensure db settings default if missing
if (global.db && global.db.settings) {
    if (!global.db.settings.mode) global.db.settings.mode = 'public';
    if (!Array.isArray(global.db.settings.whitelist)) global.db.settings.whitelist = [];
    if (!global.db.settings.prefix) global.db.settings.prefix = 'multi';
}

// Load plugins with Bun & Node.js ESM cache-busting
export const loadPlugins = async () => {
    const plugins = [];
    if (!fs.existsSync(PLUGINS_DIR)) {
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }

    const loadDir = async (dir) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const itemPath = path.join(dir, item);
            if (fs.statSync(itemPath).isDirectory()) {
                await loadDir(itemPath);
            } else if (item.endsWith('.js')) {
                try {
                    const fileUrl = pathToFileURL(itemPath).href + '?t=' + Date.now();
                    const module = await import(fileUrl);
                    const pluginExport = module.default || module;
                    if (pluginExport) {
                        if (typeof pluginExport === 'function' || pluginExport.command || pluginExport.execute) {
                            plugins.push(pluginExport);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to load plugin ${item}:`, err);
                }
            }
        }
    };
    await loadDir(PLUGINS_DIR);
    return plugins;
};

let activePlugins = [];
export const reloadPlugins = async () => {
    try {
        const plugins = await loadPlugins();
        activePlugins = plugins;
        updatePluginsList(plugins);
        logger.logSuccess(`Hot Reload complete! ${plugins.length} plugins active.`);
        return plugins;
    } catch (err) {
        logger.logError('Failed to hot-reload plugins:', err);
        return activePlugins;
    }
};

reloadPlugins();

export const handleMessages = async (sock, msg) => {
    const content = extractMessageContent(msg.message);
    if (!content) return;

    const messageType = getContentType(content);
    let text = '';

    if (messageType === 'conversation') {
        text = content.conversation;
    } else if (messageType === 'extendedTextMessage') {
        text = content.extendedTextMessage?.text;
    } else if (messageType === 'interactiveResponseMessage') {
        const nativeResponse = content.interactiveResponseMessage?.nativeFlowResponseMessage;
        if (nativeResponse?.paramsJson) {
            try {
                const params = JSON.parse(nativeResponse.paramsJson);
                text = params.id || params.rowId || params.text || '';
            } catch {
                text = nativeResponse.paramsJson;
            }
        }
        if (!text) text = content.interactiveResponseMessage?.body?.text || '';
    } else if (messageType === 'buttonsResponseMessage') {
        text = content.buttonsResponseMessage?.selectedButtonId || content.buttonsResponseMessage?.selectedDisplayText || '';
    } else if (messageType === 'listResponseMessage') {
        text = content.listResponseMessage?.singleSelectReply?.selectedRowId || content.listResponseMessage?.title || '';
    } else if (messageType === 'templateButtonReplyMessage') {
        text = content.templateButtonReplyMessage?.selectedId || content.templateButtonReplyMessage?.selectedDisplayText || '';
    } else if (messageType === 'imageMessage') {
        text = content.imageMessage?.caption;
    } else if (messageType === 'videoMessage') {
        text = content.videoMessage?.caption;
    } else if (messageType === 'documentMessage') {
        text = content.documentMessage?.caption;
    } else if (messageType === 'documentWithCaptionMessage') {
        text = content.documentWithCaptionMessage?.message?.documentMessage?.caption;
    } else if (content[messageType]?.caption) {
        text = content[messageType].caption;
    } else if (content[messageType]?.text) {
        text = content[messageType].text;
    }

    if (!text) return;

    const args = text.trim().split(/\s+/);
    const rawCommand = (args.shift() || "");

    let command = "";
    let prefix = "";

    const setPrefix = global.db?.settings?.prefix || 'multi';

    if (rawCommand === ">" || rawCommand === "=>" || rawCommand === ">>>" || rawCommand === "eval" || rawCommand === "$") {
        command = rawCommand;
        prefix = "";
    } else if (setPrefix === 'multi' || setPrefix === 'all' || setPrefix === 'auto') {
        const prefixMatch = rawCommand.match(/^[^\w\s]+/);
        prefix = prefixMatch ? prefixMatch[0] : "";
        command = prefix
            ? rawCommand.slice(prefix.length).toLowerCase()
            : rawCommand.toLowerCase();
    } else if (setPrefix === 'noprefix') {
        prefix = "";
        command = rawCommand.toLowerCase();
    } else {
        const allowedPrefixes = Array.isArray(setPrefix) ? setPrefix : [setPrefix];
        const matchPfx = allowedPrefixes.find(p => rawCommand.startsWith(p));
        if (matchPfx) {
            prefix = matchPfx;
            command = rawCommand.slice(matchPfx.length).toLowerCase();
        } else {
            prefix = "";
            command = "";
        }
    }

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const isChannel = from.endsWith('@newsletter');
    const sender = isGroup ? msg.key.participant : from;
    const pushName = msg.pushName || "User";

    const baseOwners = [];
    const botNumber = normalizeNumber(sock?.user?.id);
    const owners = [...new Set([...baseOwners, botNumber].filter(Boolean))];
    const senderNumber = normalizeNumber(sender);
    const botJid = normalizeJid(sock?.user?.id);
    const botJids = new Set([botJid, `${botNumber}@s.whatsapp.net`].filter(Boolean));
    const isOwner = owners.includes(senderNumber) || msg.key.fromMe || botJids.has(normalizeJid(sender));
    const isMe = msg.key.fromMe || senderNumber === botNumber || botJids.has(normalizeJid(sender));

    const isMedia = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage'].includes(messageType)
        || !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    let quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    let quotedText = '';
    if (quotedMsg) {
        if (quotedMsg.conversation) quotedText = quotedMsg.conversation;
        else if (quotedMsg.extendedTextMessage?.text) quotedText = quotedMsg.extendedTextMessage.text;
    }

    let groupMetadata = null;
    let participants = [];
    let groupAdmins = [];
    let isBotAdmin = false;
    let isAdmin = false;

    if (isGroup) {
        try {
            groupMetadata = await sock.groupMetadata(from);
            participants = groupMetadata.participants;
            groupAdmins = participants.filter(v => v.admin !== null).map(v => v.id);
            const normalizedGroupAdmins = groupAdmins.map(normalizeJid);
            isBotAdmin = normalizedGroupAdmins.includes(botJid) || normalizedGroupAdmins.includes(`${botNumber}@s.whatsapp.net`);
            isAdmin = normalizedGroupAdmins.includes(normalizeJid(sender)) || isMe || isBotAdmin;
        } catch (e) {
            console.error('Error fetching group metadata:', e);
        }
    }

    const userDb = initUser(sender, pushName);
    const groupDb = isGroup ? initGroup(from) : null;

    const botMode = (global.db?.settings?.mode || 'public').toLowerCase();
    const whitelist = global.db?.settings?.whitelist || [];

    if (!isOwner && !isMe) {
        if (botMode === 'self') {
            return;
        } else if (botMode === 'whitelist') {
            const senderJid = normalizeJid(sender);
            const fromJid = normalizeJid(from);
            const senderNum = normalizeNumber(sender);

            let isWhitelisted = false;
            if (isGroup) {
                isWhitelisted = whitelist.some(item => {
                    const normItem = normalizeJid(item);
                    return normItem === fromJid || item === from;
                });
            } else {
                isWhitelisted = whitelist.some(item => {
                    const normItem = normalizeJid(item);
                    const normNum = normalizeNumber(item);
                    return normItem === senderJid || normNum === senderNum || item === sender;
                });
            }

            if (!isWhitelisted) return;
        }
    }

    logger.logMessage({
        isGroup,
        isChannel,
        pushName,
        groupName: groupMetadata?.subject || 'Group',
        sender,
        text,
        isCmd: !!prefix
    });

    incrementMessage();
    if (prefix) incrementCommand();
    addMessageLog({
        isGroup,
        isChannel,
        pushName,
        groupName: groupMetadata?.subject || 'Group',
        sender: sender?.split('@')[0] || sender,
        text: text?.slice(0, 500) || '',
        isCmd: !!prefix
    });

    if (isGroup && groupDb?.antilink && !isAdmin && !isOwner) {
        if (text.match(/(chat.whatsapp.com\/)/gi)) {
            await sock.sendMessage(from, { text: 'Terdeteksi link grup WA! Maaf kamu akan di-kick.' });
            if (isBotAdmin) {
                await sock.groupParticipantsUpdate(from, [sender], 'remove');
            }
            return;
        }
    }

    const raw = (msg && (msg instanceof proto.WebMessageInfo || msg.constructor?.name === 'WebMessageInfo'))
        ? msg
        : proto.WebMessageInfo.fromObject(msg || {});

    const m = {
        raw,
        key: raw.key,
        message: raw.message,
        messageTimestamp: raw.messageTimestamp,
        copy: () => JSON.parse(JSON.stringify(raw)),
        delete: async () => {
            return sock.sendMessage(from, {
                delete: raw.key
            });
        },
        chat: from,
        from: from,
        sender: sender,
        pushName: pushName,
        text: text,
        body: text,
        args: args,
        command: command,
        prefix: prefix,
        id: raw.key?.id || '',
        fromMe: !!raw.key?.fromMe,
        remoteJid: from,
        messageType: messageType,
        timestamp: raw.messageTimestamp,
        name: pushName,
        isGroup: isGroup,
        isChannel: isChannel,
        isOwner: isOwner,
        isMe: isMe,
        isAdmin: isAdmin,
        isBotAdmin: isBotAdmin,
        isMedia: isMedia,
        isBaileys: raw.key?.id?.startsWith("BAE5") || false,
        botNumber: sock.user?.id,
        user: sender,
        jid: from,
        groupMetadata: groupMetadata,
        participants: participants,
        groupAdmins: groupAdmins,
        mentionedJid: raw.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
        quoted: quotedMsg
            ? {
                message: quotedMsg,
                text: quotedText,
                id: raw.message?.extendedTextMessage?.contextInfo?.stanzaId,
                sender: raw.message?.extendedTextMessage?.contextInfo?.participant,
                chat: from
            }
            : null,
        quotedText: quotedText,
        reply: async (content, options = {}) => {
            const sendContent = typeof content === "string" ? { text: content } : content;
            sock.sendPresenceUpdate("composing", from).catch(() => { });
            return sock.sendMessage(from, sendContent, {
                quoted: m,
                ...options
            });
        },
        send: null,
        react: async emoji => {
            return sock.sendMessage(from, {
                react: {
                    text: emoji,
                    key: raw.key
                }
            });
        },
        download: async () => {
            return await downloadMediaMessage(
                raw,
                "buffer",
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );
        }
    };
    m.send = m.reply;

    const context = {
        sock,
        conn: sock,
        client: sock,
        bot: sock,
        isCmd: !!prefix,
        owners,
        m,
        msg: m,
        raw,
        args,
        command,
        prefix,
        text,
        body: text,
        chat: from,
        from,
        sender,
        pushName,
        isGroup,
        isChannel,
        isOwner,
        isMe,
        isMedia,
        isAdmin,
        isBotAdmin,
        groupMetadata,
        participants,
        groupAdmins,
        quoted: quotedMsg,
        quotedText,
        userDb,
        groupDb,
        plugins: activePlugins,
        fs,
        path,
        require,
        downloadMediaMessage,
        reply: m.reply,
        send: m.send,
        react: m.react,
        download: m.download,
        store: global.store,
        db: global.db,
        logger,
        util: require("util"),
        sendMessage: (...args) => sock.sendMessage(...args),
        getGroupMetadata: async (jid = from) => sock.groupMetadata(jid),
        groupFetchAllParticipating: () => sock.groupFetchAllParticipating(),
        groupParticipantsUpdate: (...args) => sock.groupParticipantsUpdate(...args),
        profilePictureUrl: (...args) => sock.profilePictureUrl(...args),
        onWhatsApp: (...args) => sock.onWhatsApp(...args),
        decodeJid: (...args) => sock.decodeJid?.(...args),
        relayMessage: (...args) => sock.relayMessage(...args),
        readMessages: (...args) => sock.readMessages(...args),
        presenceUpdate: (...args) => sock.sendPresenceUpdate(...args)
    };

    try {
        const casePath = `file://${path.join(__dirname, '../case.js')}?t=${Date.now()}`;
        const caseModule = await import(casePath);
        if (caseModule.default) {
            const handledByCase = await caseModule.default(context);
            if (handledByCase) return;
        }
    } catch (err) {
        if (err.code !== 'ERR_MODULE_NOT_FOUND') {
            console.error('Error in case.js:', err);
        }
    }

    const matchesCommand = (pluginCommand, cmd, raw) => {
        const cmds = Array.isArray(pluginCommand) ? pluginCommand : [pluginCommand];
        return cmds.some(c => {
            if (c instanceof RegExp) return c.test(raw) || c.test(cmd);
            return c === cmd;
        });
    };

    let handled = false;
    for (const plugin of activePlugins) {
        const pluginCmd = plugin.command;
        if (!pluginCmd) continue;

        if (typeof plugin === 'function' && matchesCommand(pluginCmd, command, rawCommand)) {
            try {
                await plugin(m, context);
            } catch (err) {
                console.error(`Error executing plugin for command ${command}:`, err);
                await context.reply('Terjadi kesalahan saat memproses perintah ini.');
            }
            handled = true;
            break;
        } else if (typeof plugin === 'object' && plugin.execute && matchesCommand(pluginCmd, command, rawCommand)) {
            try {
                await plugin.execute(context);
            } catch (err) {
                console.error(`Error executing plugin for command ${command}:`, err);
            }
            handled = true;
            break;
        }
    }

    if (!handled) {
        for (const plugin of activePlugins) {
            if (typeof plugin === 'function' && typeof plugin.canHandleMessage === 'function') {
                try {
                    if (plugin.canHandleMessage(m, context)) {
                        await plugin(m, context);
                        handled = true;
                        break;
                    }
                } catch (err) {
                    console.error('Error executing plugin message handler:', err);
                    await context.reply('Terjadi kesalahan saat memproses pesan ini.');
                }
            }
        }
    }
};
