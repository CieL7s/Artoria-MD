/**
 * case.js — Traditional Switch-Case Command Handler
 *
 * File ini dieksekusi SEBELUM plugin system. Cocok untuk:
 * - Command built-in yang tidak perlu file plugin terpisah
 * - Override command tertentu agar tidak ditangani plugin
 * - Logic yang butuh akses langsung ke context tanpa boilerplate plugin
 *
 * Return true  → command ditangani di sini, plugin tidak dieksekusi
 * Return false → lanjut ke plugin system seperti biasa
 */

export default async function switchCase(context) {
    const { command, reply } = context;

    switch (command) {
        // Contoh: command built-in sederhana
        // case 'info': {
        //     await reply('Artoria - MD oleh Nagisa Artoria');
        //     return true;
        // }

        default:
            return false;
    }
}
