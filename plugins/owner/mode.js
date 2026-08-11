const handler = async (ctx) => {
    const { isOwner, args, reply } = ctx;
    if (!isOwner) return reply('❌ Khusus Owner.');

    const newMode = args[0]?.toLowerCase();
    const validModes = ['public', 'self', 'whitelist'];

    if (!validModes.includes(newMode)) {
        const current = global.db?.settings?.mode || 'public';
        return reply(`Mode bot saat ini: *${current}*\n\nFormat: .mode public | self | whitelist`);
    }

    if (!global.db.settings) global.db.settings = {};
    global.db.settings.mode = newMode;
    await reply(`✅ Mode bot diubah ke: *${newMode}*`);
};

handler.command = ['mode'];
handler.tags = ['owner'];
handler.help = ['mode <public|self|whitelist>'];
handler.description = 'Ganti mode operasi bot (Owner)';

export default handler;
