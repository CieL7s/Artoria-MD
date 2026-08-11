import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonDbPath = path.join(__dirname, '../database.json');

global.db = {
    users: {},
    groups: {},
    games: {},
    settings: {
        mode: 'public',
        whitelist: [],
        prefix: 'multi'
    }
};

export const loadDatabase = () => {
    if (fs.existsSync(jsonDbPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
            global.db = { ...global.db, ...data };
        } catch (e) {
            console.error('Failed to load database.json:', e);
        }
    }
    if (!global.db.settings) global.db.settings = { mode: 'public', whitelist: [], prefix: 'multi' };
    if (!global.db.settings.mode) global.db.settings.mode = 'public';
    if (!Array.isArray(global.db.settings.whitelist)) global.db.settings.whitelist = [];
};

export const saveDatabase = () => {
    try {
        fs.writeFileSync(jsonDbPath, JSON.stringify(global.db, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save database.json:', e);
    }
};

setInterval(saveDatabase, 10000);

export const initUser = (sender, pushName) => {
    if (!global.db.users[sender]) {
        global.db.users[sender] = {
            name: pushName,
            level: 1,
            exp: 0,
            limit: 50,
            money: 1000,
            premium: false,
            registered: true
        };
    }
    return global.db.users[sender];
};

export const initGroup = (from) => {
    if (!global.db.groups[from]) {
        global.db.groups[from] = {
            antilink: false,
            welcome: false
        };
    }
    return global.db.groups[from];
};
