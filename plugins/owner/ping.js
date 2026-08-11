import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const handler = async (ctx) => {
    const { args, reply, isOwner, react } = ctx;
    if (!isOwner) return reply('❌ Khusus Owner.');

    const host = args[0]?.replace(/[^a-zA-Z0-9.\-:]/g, '');
    if (!host) return reply(`Format: .ping <host>\nContoh: .ping google.com`);

    await react('⏳');

    try {
        const isWindows = process.platform === 'win32';
        const cmd = isWindows ? `ping -n 4 ${host}` : `ping -c 4 -W 3 ${host}`;
        const start = Date.now();
        const { stdout } = await execAsync(cmd, { timeout: 15000 });
        const elapsed = Date.now() - start;

        const avgMatch = stdout.match(/Average\s*=\s*(\d+)ms/i)
            || stdout.match(/min\/avg\/max[^=]*=\s*[\d.]+\/([\d.]+)\//);
        const avg = avgMatch ? avgMatch[1] + 'ms' : elapsed + 'ms';

        const lossMatch = stdout.match(/(\d+)%\s*(packet\s*loss|hilang)/i);
        const loss = lossMatch ? lossMatch[1] + '%' : '0%';

        await react('✅');
        await reply(`📡 *Ping — ${host}*\n\n⚡ Latency : ${avg}\n📦 Loss   : ${loss}\n🕐 Elapsed : ${elapsed}ms`);
    } catch (err) {
        await react('❌');
        await reply(err.killed ? `⏰ Timeout! ${host} tidak merespons.` : `❌ Error: ${err.message?.slice(0, 200)}`);
    }
};

handler.command = ['ping', /^\/ping$/i, /^!ping$/i];
handler.tags = ['owner'];
handler.help = ['ping <host>'];
handler.description = 'Cek latensi jaringan ke host dari server (Owner)';

export default handler;
