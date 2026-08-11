const handler = async (ctx) => {
    const start = Date.now();
    await ctx.reply(`Pong! 🏓 *${Date.now() - start} ms*`);
};

handler.command = ['ping', 'speed'];
handler.tags = ['info'];
handler.help = ['ping'];
handler.description = 'Cek respons bot';

export default handler;
