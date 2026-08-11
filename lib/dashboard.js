import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Server } from 'socket.io';
import os from 'os';
import https from 'https';
import { proto } from '@whiskeysockets/baileys';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

let botState = {
    connected: false,
    connectionState: 'closed',
    username: '',
    lastSeen: null,
    startTime: Date.now(),
    messageCount: 0,
    commandCount: 0,
    uptime: '0s',
    memoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0 },
    latency: 0
};

setInterval(() => {
    const start = Date.now();
    https.get('https://whatsapp.com', (res) => {
        botState.latency = Date.now() - start;
        res.resume();
    }).on('error', () => {
        botState.latency = -1;
    });
}, 10000);

const messageLog = [];
const MAX_LOG = 500;
const consoleLogs = [];
const MAX_CONSOLE_LOGS = 1000;

export function addConsoleLog(level, args) {
    const text = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.stack || arg.message;
        try { return JSON.stringify(arg); } catch { return String(arg); }
    }).join(' ');

    consoleLogs.unshift({
        time: new Date().toISOString(),
        level,
        message: text
    });
    if (consoleLogs.length > MAX_CONSOLE_LOGS) consoleLogs.length = MAX_CONSOLE_LOGS;

    if (io) {
        io.emit('console_log', { level, message: text });
    }
}

const origLog = console.log;
const origErr = console.error;
const origWarn = console.warn;
const origInfo = console.info;

console.log = (...args) => { addConsoleLog('LOG', args); origLog.apply(console, args); };
console.error = (...args) => { addConsoleLog('ERROR', args); origErr.apply(console, args); };
console.warn = (...args) => { addConsoleLog('WARN', args); origWarn.apply(console, args); };
console.info = (...args) => { addConsoleLog('INFO', args); origInfo.apply(console, args); };

let io = null;
let botSocket = null;
export let webCommandHandler = null;
let loadedPluginsInfo = [];

export function setBotSocket(sock) { botSocket = sock; }
export function setWebCommandHandler(handler) { webCommandHandler = handler; }

export function updatePluginsList(plugins) {
    if (!Array.isArray(plugins)) return;
    loadedPluginsInfo = plugins.map((p, idx) => {
        const commands = Array.isArray(p.command) ? p.command : (p.command ? [p.command] : []);
        const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : ['general']);
        const help = Array.isArray(p.help) ? p.help : (p.help ? [p.help] : commands);
        return {
            id: idx + 1,
            commands,
            tags,
            help,
            type: typeof p === 'function' ? 'function' : 'object'
        };
    });

    if (io) io.emit('plugins_list', loadedPluginsInfo);
}

export function getBotState() {
    const now = Date.now();
    const seconds = Math.floor((now - botState.startTime) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    botState.uptime = `${hours}h ${minutes}m ${secs}s`;

    try {
        const mem = process.memoryUsage();
        botState.memoryUsage = {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
        };
    } catch {}

    return {
        ...botState,
        users: Object.keys(global.db?.users || {}).length,
        groups: Object.keys(global.db?.groups || {}).length,
        games: Object.keys(global.db?.games || {}).length,
        pluginsCount: loadedPluginsInfo.length,
        mode: global.db?.settings?.mode || 'public',
        osPlatform: os.platform() + ' ' + os.release() + ' (' + os.arch() + ')',
        cpuModel: os.cpus()[0]?.model?.trim() || 'Unknown CPU',
        totalMem: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
        freeMem: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
        loadAvg: os.loadavg().map(x => x.toFixed(2)).join(', '),
        latency: botState.latency + ' ms'
    };
}

export function addMessageLog(entry) {
    messageLog.unshift({ time: new Date().toISOString(), ...entry });
    if (messageLog.length > MAX_LOG) messageLog.length = MAX_LOG;
    if (io) {
        io.emit('message', entry);
        io.emit('state', getBotState());
    }
}

export function setBotConnected(connected) {
    botState.connected = connected;
    botState.connectionState = connected ? 'open' : 'closed';
    if (connected) botState.lastSeen = new Date().toISOString();
    if (io) io.emit('state', getBotState());
}

export function setBotUsername(username) {
    botState.username = username;
    if (io) io.emit('state', getBotState());
}

export function incrementMessage() {
    botState.messageCount++;
    if (io) io.emit('state', getBotState());
}

export function incrementCommand() {
    botState.commandCount++;
    if (io) io.emit('state', getBotState());
}

export function startDashboard(server, port = 3456) {
    const PORT = port;
    const PUBLIC_DIR = path.join(ROOT, 'public');

    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

    io.on('connection', (socket) => {
        socket.emit('state', getBotState());
        socket.emit('init_messages', messageLog.slice(0, 100));
        socket.emit('plugins_list', loadedPluginsInfo);

        socket.on('web_command', async (data) => {
            if (webCommandHandler && data.text) {
                try {
                    const mockSock = botSocket ? Object.create(botSocket) : { user: { id: '628123456789@s.whatsapp.net' } };
                    const botId = mockSock.user?.id || '628123456789@s.whatsapp.net';
                    
                    mockSock.sendMessage = async (jid, content, options) => {
                        if (jid !== botId && botSocket) {
                            return await botSocket.sendMessage(jid, content, options);
                        }
                        let replyText = typeof content === 'string' ? content : (content.text || content.caption || '[Media/Interactive Content]');
                        socket.emit('web_reply', { text: replyText });
                        return { key: { id: 'WEB_' + Date.now(), fromMe: true, remoteJid: jid } };
                    };
                    mockSock.sendPresenceUpdate = async () => {}; 
                    
                    const mockMsg = proto.WebMessageInfo.fromObject({
                        key: { remoteJid: botId, fromMe: true, id: "WEB_" + Date.now() },
                        message: { conversation: data.text },
                        messageTimestamp: Math.floor(Date.now() / 1000),
                        pushName: "Web Admin"
                    });

                    await webCommandHandler(mockSock, mockMsg);
                } catch (e) {
                    socket.emit('web_reply', { text: `[Error executing command]: ${e.message}` });
                }
            }
        });
    });

    server.on('request', (req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname.startsWith('/socket.io')) return;

        if (url.pathname === '/api/state' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(getBotState()));
            return;
        }
        if (url.pathname === '/api/plugins' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(loadedPluginsInfo));
            return;
        }
        if ((url.pathname === '/api/logs' || url.pathname === '/api/console') && req.method === 'GET') {
            const limit = parseInt(url.searchParams.get('limit') || '200');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, count: consoleLogs.length, logs: consoleLogs.slice(0, limit) }));
            return;
        }
        if (url.pathname === '/api/command' && req.method === 'POST') {
            req.setEncoding('utf8');
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    if (webCommandHandler && data.text) {
                        const replies = [];
                        const mockSock = botSocket ? Object.create(botSocket) : { user: { id: '628123456789@s.whatsapp.net' } };
                        const botId = mockSock.user?.id || '628123456789@s.whatsapp.net';

                        mockSock.sendMessage = async (jid, content, options) => {
                            if (jid !== botId && botSocket) {
                                return await botSocket.sendMessage(jid, content, options);
                            }
                            let replyText = typeof content === 'string' ? content : (content.text || content.caption || '[Media/Interactive Content]');
                            replies.push(replyText);
                            return { key: { id: 'WEB_' + Date.now(), fromMe: true, remoteJid: jid } };
                        };
                        mockSock.sendPresenceUpdate = async () => {}; 
                        
                        const mockMsg = proto.WebMessageInfo.fromObject({
                            key: { remoteJid: botId, fromMe: true, id: "WEB_" + Date.now() },
                            message: { conversation: data.text },
                            messageTimestamp: Math.floor(Date.now() / 1000),
                            pushName: "API Admin"
                        });

                        await webCommandHandler(mockSock, mockMsg);
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: true, replies }));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: 'Handler not ready or missing text field.' }));
                    }
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        let filePath = (url.pathname === '/' || url.pathname === '/index.html')
            ? path.join(PUBLIC_DIR, 'index.html')
            : path.join(PUBLIC_DIR, url.pathname);

        const ext = path.extname(filePath);
        const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            res.end(fs.readFileSync(filePath));
        } else {
            const indexPath = path.join(PUBLIC_DIR, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fs.readFileSync(indexPath));
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        }
    });

    server.listen(PORT, () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`\x1b[36m[DASHBOARD]\x1b[0m Dashboard running at http://localhost:${PORT}`);
        console.log(`${'='.repeat(50)}\n`);
    });

    return PORT;
}
