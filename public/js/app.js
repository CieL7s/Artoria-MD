const socket = io();

let botState = {};
let usersCache = [];
let groupsCache = [];
let pluginsCache = [];

const els = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    headerClock: document.getElementById('headerClock'),
    
    valUptime: document.getElementById('valUptime'),
    valHits: document.getElementById('valHits'),
    barHits: document.getElementById('barHits'),
    valOs: document.getElementById('valOs'),
    valCpu: document.getElementById('valCpu'),
    valMemory: document.getElementById('valMemory'),
    valLatency: document.getElementById('valLatency'),
    valLoad: document.getElementById('valLoad'),
    
    analyticsBarCmd: document.getElementById('analyticsBarCmd'),
    analyticsBarMsg: document.getElementById('analyticsBarMsg'),
    analyticsCmdPercent: document.getElementById('analyticsCmdPercent'),
    analyticsMsgPercent: document.getElementById('analyticsMsgPercent'),

    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatTarget: document.getElementById('chatTarget'),
    btnSend: document.getElementById('btnSend'),
    
    logContent: document.getElementById('logContent'),
    
    terminalOutput: document.getElementById('terminalOutput'),
    terminalInput: document.getElementById('terminalInput'),
    btnTerminalSend: document.getElementById('btnTerminalSend'),
    
    usersTable: document.getElementById('usersTable'),
    groupsTable: document.getElementById('groupsTable'),
    pluginGrid: document.getElementById('pluginGrid'),
    pluginCountBadge: document.getElementById('pluginCountBadge'),
    pluginSearch: document.getElementById('pluginSearch'),
    
    navItems: document.querySelectorAll('.nav-item'),
    viewSections: document.querySelectorAll('.view-section'),
    
    settingMode: document.getElementById('settingMode'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    
    broadcastText: document.getElementById('broadcastText'),
    broadcastTargets: document.getElementById('broadcastTargets'),
    btnBroadcast: document.getElementById('btnBroadcast'),
    broadcastResult: document.getElementById('broadcastResult'),

    btnQuickTerminal: document.getElementById('btnQuickTerminal'),
    btnClearLogs: document.getElementById('btnClearLogs')
};

function updateClock() {
    if (els.headerClock) {
        const now = new Date();
        els.headerClock.textContent = now.toLocaleTimeString([], { hour12: false });
    }
}
setInterval(updateClock, 1000);
updateClock();

els.navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        switchView(targetView);
    });
});

function switchView(targetView) {
    els.navItems.forEach(nav => {
        if (nav.getAttribute('data-view') === targetView) {
            nav.classList.add('active');
            if (typeof nav.scrollIntoView === 'function') {
                nav.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        } else {
            nav.classList.remove('active');
        }
    });

    els.viewSections.forEach(view => {
        if (view.id === `view-${targetView}`) {
            view.classList.remove('hidden');
            view.classList.add('active');
        } else {
            view.classList.add('hidden');
            view.classList.remove('active');
        }
    });

    if (targetView === 'database' && usersCache.length === 0) {
        fetchUsers();
        fetchGroups();
    }
    if (targetView === 'plugins' && pluginsCache.length === 0) {
        fetchPlugins();
    }
}

if (els.btnQuickTerminal) {
    els.btnQuickTerminal.addEventListener('click', () => {
        switchView('terminal');
        if (els.terminalInput) els.terminalInput.focus();
    });
}

if (els.btnClearLogs) {
    els.btnClearLogs.addEventListener('click', () => {
        if (els.logContent) els.logContent.innerHTML = '<div class="text-sakura-400 italic">Logs cleared. Listening for new system events...</div>';
    });
}

socket.on('connect', () => {
    if (els.statusDot) {
        els.statusDot.classList.remove('bg-red-400');
        els.statusDot.classList.add('bg-matcha-500');
    }
    if (els.statusText) els.statusText.textContent = 'WS Connected';
});

socket.on('disconnect', () => {
    if (els.statusDot) {
        els.statusDot.classList.remove('bg-matcha-500');
        els.statusDot.classList.add('bg-red-400');
    }
    if (els.statusText) els.statusText.textContent = 'WS Disconnected';
});

socket.on('state', (state) => {
    botState = state;
    updateDashboardUI();
});

socket.on('plugins_list', (plugins) => {
    pluginsCache = plugins || [];
    renderPlugins();
});

socket.on('init_messages', (msgs) => {
    if (els.logContent) {
        els.logContent.innerHTML = '';
        msgs.reverse().forEach(appendLog);
    }
});

socket.on('message', (msg) => {
    appendLog(msg);
    const currentTarget = els.chatTarget ? els.chatTarget.value.trim() : '';
    if (currentTarget && msg.sender && msg.sender.includes(currentTarget.replace('@s.whatsapp.net', ''))) {
        appendChatMsg({ text: msg.text, sender: msg.pushName || msg.sender, time: msg.time, type: 'received' });
    }
});

socket.on('web_reply', (res) => {
    appendTerminalOutput(res.text, 'output');
});

function updateDashboardUI() {
    if (!botState) return;
    if (els.valUptime) els.valUptime.textContent = botState.uptime || '0s';
    
    const cmdCount = botState.commandCount || 0;
    const msgCount = botState.messageCount || 0;
    const totalHits = cmdCount + msgCount;

    if (els.valHits) els.valHits.textContent = totalHits.toLocaleString();
    if (els.barHits) {
        const percent = Math.min((totalHits / 1000) * 100, 100);
        els.barHits.style.width = `${percent}%`;
    }

    if (totalHits > 0) {
        const cmdPct = Math.round((cmdCount / totalHits) * 100);
        const msgPct = 100 - cmdPct;
        if (els.analyticsCmdPercent) els.analyticsCmdPercent.textContent = `${cmdPct}%`;
        if (els.analyticsMsgPercent) els.analyticsMsgPercent.textContent = `${msgPct}%`;
        if (els.analyticsBarCmd) els.analyticsBarCmd.style.width = `${cmdPct}%`;
        if (els.analyticsBarMsg) els.analyticsBarMsg.style.width = `${msgPct}%`;
    }
    
    if (els.valOs) els.valOs.textContent = botState.osPlatform || 'Unknown';
    if (els.valCpu) els.valCpu.textContent = botState.cpuModel || 'Unknown';
    if (els.valMemory) els.valMemory.textContent = `${botState.memoryUsage?.rss || 0} MB / ${botState.totalMem || '0 GB'}`;
    if (els.valLatency) els.valLatency.textContent = botState.latency || '0 ms';
    if (els.valLoad) els.valLoad.textContent = botState.loadAvg || '0.00, 0.00, 0.00';
    if (els.settingMode && botState.mode) els.settingMode.value = botState.mode;
}

function appendLog(msg) {
    if (!els.logContent) return;
    const div = document.createElement('div');
    div.className = `log-entry text-xs font-mono py-1 border-b border-sakura-50/50 flex items-center justify-between ${msg.isCmd ? 'cmd text-lavender-400' : 'msg text-sumi-800'}`;
    
    const time = msg.time ? new Date(msg.time).toLocaleTimeString() : '';
    const groupStr = msg.isGroup ? `<span class="text-sakura-400 font-bold">[${msg.groupName}]</span> ` : '';
    
    div.innerHTML = `
        <div>
            <span class="text-sumi-800/40 mr-2">[${time}]</span>
            <span class="text-sakura-500 font-medium">${escapeHTML(msg.pushName || msg.sender)}</span>
            ${groupStr}:
            <span class="text-sumi-900">${escapeHTML(msg.text)}</span>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-full font-sans ${msg.isCmd ? 'bg-lavender-100 text-lavender-400 font-bold' : 'bg-cream-100 text-sumi-800/60'}">
            ${msg.isCmd ? 'CMD' : 'MSG'}
        </span>
    `;
    
    els.logContent.prepend(div);
    if (els.logContent.children.length > 200) {
        els.logContent.removeChild(els.logContent.lastChild);
    }
}

if (els.btnTerminalSend) {
    els.btnTerminalSend.addEventListener('click', () => {
        const text = els.terminalInput.value.trim();
        if (!text) return;
        appendTerminalOutput(`❯ ${text}`, 'input');
        socket.emit('web_command', { text });
        els.terminalInput.value = '';
    });
}

if (els.terminalInput) {
    els.terminalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            els.btnTerminalSend.click();
        }
    });
}

function appendTerminalOutput(text, type) {
    if (!els.terminalOutput) return;
    const div = document.createElement('div');
    div.className = 'py-0.5 whitespace-pre-wrap break-words font-mono text-xs';
    if (type === 'input') div.className += ' text-sakura-300 font-bold';
    else if (type === 'error') div.className += ' text-red-400';
    else div.className += ' text-matcha-200';
    div.textContent = text;
    els.terminalOutput.appendChild(div);
    els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight;
}

async function fetchPlugins() {
    try {
        const res = await fetch('/api/plugins');
        pluginsCache = await res.json();
        renderPlugins();
    } catch(e) { console.error("Failed to fetch plugins", e); }
}

function renderPlugins(query = '') {
    if (!els.pluginGrid) return;
    const filter = (query || (els.pluginSearch ? els.pluginSearch.value : '')).toLowerCase().trim();

    const filtered = (pluginsCache || []).filter(p => {
        if (!filter) return true;
        const cmdsMatch = (p.commands || []).some(c => c.toLowerCase().includes(filter));
        const tagsMatch = (p.tags || []).some(t => t.toLowerCase().includes(filter));
        const helpMatch = (p.help || []).some(h => String(h).toLowerCase().includes(filter));
        return cmdsMatch || tagsMatch || helpMatch;
    });

    if (els.pluginCountBadge) {
        els.pluginCountBadge.textContent = `${(pluginsCache || []).length} Plugins Active`;
    }

    if (filtered.length === 0) {
        els.pluginGrid.innerHTML = `<div class="p-4 rounded-2xl bg-sakura-50/50 border border-sakura-100 text-center text-xs text-sumi-800/60 col-span-full">No matching plugins found for "${escapeHTML(filter)}"</div>`;
        return;
    }

    els.pluginGrid.innerHTML = filtered.map(p => {
        const tag = (p.tags && p.tags[0]) ? p.tags[0] : 'general';
        const cmdList = (p.commands || []).map(c => `.${c}`).join(', ') || 'No prefix trigger';
        const helpList = (p.help || []).map(h => escapeHTML(String(h))).join('<br>') || cmdList;

        return `
            <div class="p-4 rounded-2xl bg-sakura-50/40 border border-sakura-100 space-y-2 shadow-2xs">
                <div class="flex items-center justify-between text-xs font-bold text-sumi-900">
                    <span class="font-mono text-sakura-500 flex items-center gap-1.5 truncate pr-2">
                        <i class="ph-bold ph-terminal text-xs"></i> ${cmdList}
                    </span>
                    <span class="px-2 py-0.5 rounded-full bg-sakura-100 text-sakura-500 text-[10px] uppercase font-semibold shrink-0">${escapeHTML(tag)}</span>
                </div>
                <div class="text-[11px] text-sumi-800/80 font-mono">Usage: ${helpList}</div>
            </div>
        `;
    }).join('');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
