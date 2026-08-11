const handler = async (ctx) => {
    const { reply, plugins } = ctx;

    const grouped = {};
    for (const p of plugins) {
        const tag = (p.tags && p.tags[0]) || 'general';
        if (!grouped[tag]) grouped[tag] = [];
        const cmds = Array.isArray(p.command)
            ? p.command.filter(c => typeof c === 'string')
            : (typeof p.command === 'string' ? [p.command] : []);
        if (cmds.length) grouped[tag].push(...cmds.map(c => `.${c}`));
    }

    let text = `🌸 *Artoria - MD*\n_by Nagisa Artoria_\n\n`;
    for (const [tag, cmds] of Object.entries(grouped)) {
        text += `*[${tag.toUpperCase()}]*\n`;
        text += cmds.map(c => `  • ${c}`).join('\n') + '\n\n';
    }

    text += `_Total: ${plugins.length} plugin aktif_`;
    await reply(text);
};

handler.command = ['menu', 'help', 'start'];
handler.tags = ['info'];
handler.help = ['menu'];
handler.description = 'Menampilkan daftar semua perintah bot';

export default handler;
