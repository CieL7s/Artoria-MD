import util from 'util';

const handler = async (ctx) => {
    const { isOwner, text, reply } = ctx;
    if (!isOwner) return reply('❌ Khusus Owner.');

    let code = text.trim();
    if (code.startsWith('=>')) code = `return ${code.slice(2)}`;
    else if (code.startsWith('>')) code = code.slice(1);

    try {
        let result = await eval(`(async () => { ${code} })()`);
        if (typeof result !== 'string') result = util.inspect(result, { depth: 2 });
        await reply(result);
    } catch (err) {
        await reply(`Error: ${err.message}`);
    }
};

handler.command = ['eval', '>', '=>'];
handler.tags = ['owner'];
handler.help = ['=> <kode>'];
handler.description = 'Eval kode JavaScript (Owner)';

export default handler;
