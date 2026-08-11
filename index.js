import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

import { loadDatabase } from './lib/database.js';
import loggerUtil from './lib/logger.js';
import { startDashboard, setBotConnected, setBotUsername, setBotSocket, setWebCommandHandler } from './lib/dashboard.js';
import ArtoriaMessage from './lib/artoria-message/index.js';

const httpServer = http.createServer();
const dashboardPort = 3456;
const require = createRequire(import.meta.url);

const handlerPath = path.resolve('./lib/handler.js');
let handlerModule = null;

const loadHandlerModule = async () => {
    try {
        try { delete require.cache[require.resolve(handlerPath)]; } catch {}
        const fileUrl = pathToFileURL(handlerPath).href + '?t=' + Date.now();
        handlerModule = await import(fileUrl);
        return handlerModule;
    } catch (err) {
        loggerUtil.logError('Gagal memuat lib/handler.js:', err);
        return handlerModule;
    }
};

await loadHandlerModule();

let reloadTimeout;
const IGNORED_WATCH_ITEMS = ['database.json', 'auth_info_baileys', '.git', 'node_modules'];

const watchPluginsDir = path.resolve('./plugins');
if (fs.existsSync(watchPluginsDir)) {
    fs.watch(watchPluginsDir, { recursive: true }, (eventType, filename) => {
        if (!filename || (!filename.endsWith('.js') && !filename.endsWith('.json'))) return;
        if (IGNORED_WATCH_ITEMS.some(item => filename.includes(item))) return;

        clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(async () => {
            loggerUtil.logWarn(`[HOT RELOAD] Deteksi perubahan di plugins/${filename}! Reloading...`);
            if (handlerModule?.reloadPlugins) {
                await handlerModule.reloadPlugins();
            }
        }, 500);
    });
}

const watchLibDir = path.resolve('./lib');
if (fs.existsSync(watchLibDir)) {
    fs.watch(watchLibDir, { recursive: true }, (eventType, filename) => {
        if (!filename || (!filename.endsWith('.js') && !filename.endsWith('.json'))) return;
        if (IGNORED_WATCH_ITEMS.some(item => filename.includes(item))) return;

        clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(async () => {
            loggerUtil.logWarn(`[HOT RELOAD] Deteksi perubahan di lib/${filename}! Reloading core...`);
            await loadHandlerModule();

            if (filename.includes('artoria-message') && sock) {
                try {
                    const artoriaPath = path.resolve('./lib/artoria-message/index.js');
                    const artoriaUrl = pathToFileURL(artoriaPath).href + '?t=' + Date.now();
                    const ArtoriaMessageMod = (await import(artoriaUrl)).default;
                    if (ArtoriaMessageMod?.bind) {
                        ArtoriaMessageMod.bind(sock);
                        loggerUtil.logSuccess('ArtoriaMessage successfully re-bound to socket!');
                    }
                } catch (e) {
                    loggerUtil.logError('Gagal merebind ArtoriaMessage:', e);
                }
            }

            if (handlerModule?.reloadPlugins) {
                await handlerModule.reloadPlugins();
            }
            loggerUtil.logSuccess(`[HOT RELOAD] Super Hot Reload lib/${filename} BERHASIL!`);
        }, 500);
    });
}

startDashboard(httpServer, dashboardPort);
loadDatabase();

setWebCommandHandler(async (mockSock, mockMsg) => {
    if (handlerModule?.handleMessages) {
        return await handlerModule.handleMessages(mockSock, mockMsg);
    }
});

let sock = null;
let reconnectTimer = null;
let reconnecting = false;
let hasConnectedOnce = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const question = (text) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

async function connectToWhatsApp() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const logger = pino({ level: 'silent' });

    let useQR = true;
    if (!state.creds.registered) {
        const answer = await question("Pilih metode login:\n[1] Scan QR Code\n[2] Pairing Code (Nomor WA)\nPilihan Anda (1/2): ");
        useQR = answer.trim() === '1';
    }

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: useQR,
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    const rawSendMessage = sock.sendMessage.bind(sock);
    const rawRelayMessage = sock.relayMessage.bind(sock);

    sock.sendMessage = async (jid, content, options = {}) => {
        for (let attempt = 1; attempt <= 5; attempt++) {
            let waitAttempts = 0;
            while ((!sock.ws || !sock.ws.isOpen) && waitAttempts < 10) {
                await delay(500);
                waitAttempts++;
            }
            try {
                return await rawSendMessage(jid, content, options);
            } catch (err) {
                const isConnClosed = err?.message?.includes('Connection Closed') || err?.output?.statusCode === 428;
                if (isConnClosed && attempt < 5) {
                    await delay(1000);
                    continue;
                }
                throw err;
            }
        }
    };

    sock.relayMessage = async (jid, message, options = {}) => {
        for (let attempt = 1; attempt <= 5; attempt++) {
            let waitAttempts = 0;
            while ((!sock.ws || !sock.ws.isOpen) && waitAttempts < 10) {
                await delay(500);
                waitAttempts++;
            }
            try {
                return await rawRelayMessage(jid, message, options);
            } catch (err) {
                const isConnClosed = err?.message?.includes('Connection Closed') || err?.output?.statusCode === 428;
                if (isConnClosed && attempt < 5) {
                    await delay(1000);
                    continue;
                }
                throw err;
            }
        }
    };

    ArtoriaMessage.bind(sock);
    setBotSocket(sock);

    if (!sock.authState.creds.registered && !useQR) {
        let phoneNumber = await question("Masukkan nomor WA Anda (Awali dengan kode negara, contoh: 62812...): ");
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        console.log("⏳ Meminta pairing code dari WhatsApp...");
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                loggerUtil.logInfo(`\n=================================\nPAIRING CODE ANDA: \x1b[32m${code}\x1b[39m\n=================================\nBuka WhatsApp > Perangkat Tertaut > Tautkan dengan Nomor > Masukkan kode di atas.\n`);
            } catch (err) {
                loggerUtil.logError("Gagal mendapatkan pairing code", err);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const botMode = (global.db?.settings?.mode || 'whitelist').toLowerCase();
        if (botMode === 'self') return;
        if (botMode === 'whitelist') {
            const whitelist = global.db?.settings?.whitelist || [];
            const isGroupWhitelisted = whitelist.some(item => {
                const normItem = item.includes('@') ? item.split('@')[0] : item;
                const normId = id.split('@')[0];
                return item === id || normId === normItem;
            });
            if (!isGroupWhitelisted) return;
        }

        const groupData = global.db?.groups?.[id] || {};
        if (!groupData.welcome) return;

        try {
            const groupMetadata = await sock.groupMetadata(id);
            for (let num of participants) {
                if (num.split('@')[0] === sock.user.id.split(':')[0]) continue;
                if (action === 'add') {
                    await sock.sendMessage(id, {
                        text: `Halo @${num.split('@')[0]}, selamat datang di grup *${groupMetadata.subject}*! 🎉`,
                        mentions: [num]
                    });
                } else if (action === 'remove') {
                    await sock.sendMessage(id, {
                        text: `Sayonara @${num.split('@')[0]} 👋, semoga tenang di alam sana.`,
                        mentions: [num]
                    });
                }
            }
        } catch (err) {
            loggerUtil.logError('Error handling group event', err);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (connection === 'open') {
            hasConnectedOnce = true;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
                reconnecting = false;
            }
            loggerUtil.logSuccess('BOT BERHASIL TERKONEKSI KE WHATSAPP!');
            setBotConnected(true);
            setBotUsername(sock?.user?.id?.split(':')[0] || 'Unknown');
            return;
        }

        if (connection === 'close') {
            setBotConnected(false);
            if (statusCode === DisconnectReason.loggedOut) {
                loggerUtil.logError('Session logged out. Harap hapus folder auth_info_baileys dan login ulang.');
                return;
            }

            if (statusCode === DisconnectReason.connectionReplaced) {
                loggerUtil.logError('Koneksi digantikan oleh perangkat lain (440). Tidak otomatis reconnect. Silakan login ulang jika perlu.');
                return;
            }

            if (reconnecting) return;

            loggerUtil.logWarn(`Connection closed (code=${statusCode}). Reconnecting: true`);
            reconnecting = true;
            const backoffMs = hasConnectedOnce ? 3000 : 1000;
            reconnectTimer = setTimeout(async () => {
                reconnecting = false;
                await connectToWhatsApp();
            }, backoffMs);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message) return;

        if (handlerModule?.handleMessages) {
            await handlerModule.handleMessages(sock, msg);
        }
    });
}

connectToWhatsApp();
