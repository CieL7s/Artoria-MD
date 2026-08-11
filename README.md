# 🌸 Artoria - MD

<div align="center">

![Bun](https://img.shields.io/badge/Bun-v1.0+-black?logo=bun&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-v7.0+-2196F3?logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-9C27B0)
![Creator](https://img.shields.io/badge/Creator-Nagisa%20Artoria-FF758F)
![Status](https://img.shields.io/badge/Status-Active-66BB6A)

**Artoria - MD** adalah bot WhatsApp Multi-Device open-source berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) yang dibangun dengan arsitektur **hot-reload in-memory**, **ArtoriaMessage rich message engine**, dan **Web Dashboard + REST API** bawaan.

Dirancang agar ringan, modular, dan mudah dikembangkan — baik oleh pemula maupun developer berpengalaman.

> 🧑‍💻 **Created by Nagisa Artoria** — Starter kit untuk membangun bot WhatsApp personalmu sendiri.

</div>

---

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Prasyarat Sistem](#-prasyarat-sistem)
3. [Instalasi](#-instalasi)
4. [Autentikasi & Login](#-autentikasi--login)
5. [Arsitektur Direktori](#-arsitektur-direktori)
6. [Sistem Hot Reload](#-sistem-hot-reload)
7. [Sistem Plugin](#-sistem-plugin)
8. [Signature Plugin yang Valid](#-signature-plugin-yang-valid)
9. [Format Plugin: Object Style](#format-1--object-style-export-default)
10. [Format Plugin: Handler Style](#format-2--handler-style-handlercommand--)
11. [Regex Command Support](#-regex-command-support)
12. [Context Object (ctx)](#-context-object-ctx)
13. [Sistem Database](#-sistem-database)
14. [ArtoriaMessage Engine](#-artoriamessage-engine)
15. [Web Dashboard & REST API](#-web-dashboard--rest-api)
16. [Konfigurasi Bot](#-konfigurasi-bot)
17. [Daftar Plugin Bawaan](#-daftar-plugin-bawaan)
18. [Menambah Plugin Baru](#-menambah-plugin-baru)
19. [Menjalankan di VPS / Server](#-menjalankan-di-vps--server)
20. [Troubleshooting](#-troubleshooting)
21. [Lisensi](#-lisensi)

---

## ✨ Fitur Utama

### ⚡ Universal Hot Reload Engine (Bun & Node.js)
Bot ini menggunakan sistem hot reload 100% in-memory. Saat kamu mengedit atau menambah file plugin di `./plugins/` atau modul di `./lib/`, bot akan otomatis me-reload perubahan tersebut **tanpa memutuskan koneksi WhatsApp WebSocket** dan **tanpa perlu me-restart proses `index.js`**.

Cara kerjanya:
- `index.js` memantau perubahan file via `fs.watch` pada direktori `./plugins` dan `./lib`.
- Saat ada perubahan, handler dipanggil ulang dengan **URL cache-busting** (`import('file://.../handler.js?t=' + Date.now())`).
- Cache ESM di Bun (JavaScriptCore) maupun Node.js (V8) di-bypass dengan penambahan timestamp query string.
- Koneksi WhatsApp **tetap hidup** karena `sock` (instance Baileys) dibuat hanya sekali di `index.js` dan tidak pernah di-reload.

### 🎨 ArtoriaMessage Rich Message Engine
Modul serializer pesan native yang mendukung **24 jenis payload pesan interaktif** melalui interceptor `sock.sendMessage`. Kamu cukup memanggil satu API yang sama, engine ini yang mengonversi ke format Baileys/protobuf yang benar.

Jenis pesan yang didukung:
- **Carousel** — Slide card bergambar dengan tombol aksi per kartu
- **Single-Select List** — Menu pilihan pop-up (NativeFlow `single_select`)
- **Quick Reply Buttons** — Tombol balasan cepat
- **CTA URL Buttons** — Tombol buka link website
- **CTA Copy Code** — Tombol salin kode/OTP/voucher
- **Combined Buttons** — Kombinasi semua jenis tombol
- **Data Table V1 & V2** — Tabel data terformat
- **Code Block V1 & V2** — Blok kode dengan syntax highlighting
- **LaTeX Math** — Notasi matematika/formula
- **Citation Links** — Kartu tautan referensi
- **Album** — Kirim banyak foto/video dalam satu bundle
- **Payment Request** — Tagihan WhatsApp Pay
- **Product Message** — Pesan katalog produk bisnis
- **Order Message** — Nota pesanan
- **Poll Result Snapshot** — Hasil polling

### 🛡️ Boom 428 Connection Guard
Wrapper otomatis di level socket yang melakukan **readiness polling** sebelum mengirim data. Mencegah error crash `Connection Closed` (Boom statusCode 428) yang muncul saat bot mencoba mengirim pesan saat koneksi belum siap setelah reconnect.

### 💻 Web Dashboard & REST API
Server HTTP bawaan di port `3456` yang berjalan bersamaan dengan bot:
- **Dashboard UI** — Monitor uptime, RAM, total pesan, latency secara real-time.
- **Web Terminal** — Eksekusi perintah bot / eval JS langsung dari browser.
- **Sys Console** — Stream log konsol real-time.
- **Plugin Explorer** — Lihat semua plugin yang sedang aktif beserta perintahnya.
- **REST API** — Endpoint untuk integrasi eksternal (remote eval, kirim pesan, ambil data).

---

## 💻 Prasyarat Sistem

| Kebutuhan | Versi Minimum | Keterangan |
|-----------|--------------|------------|
| [Bun](https://bun.sh) | v1.0+ | **Direkomendasikan** — lebih cepat & hemat RAM |
| [Node.js](https://nodejs.org) | v18+ | Alternatif jika tidak menggunakan Bun |
| npm / yarn | v8+ | Package manager (jika menggunakan Node.js) |
| WhatsApp | Versi terbaru | Akun WhatsApp aktif (bukan WhatsApp Business) |

> ⚠️ **Catatan**: Bun dan Node.js tidak perlu diinstal bersamaan. Pilih salah satu.

---

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/NagisaArtoria/artoria-md.git
cd artoria-md
```

### 2. Install Dependensi

```bash
# Menggunakan Bun (Sangat Direkomendasikan)
bun install

# Menggunakan npm
npm install

# Menggunakan yarn
yarn install
```

### 3. Jalankan Bot

```bash
# Menggunakan Bun
bun index.js

# Menggunakan Node.js
node index.js
```

---

## 🔑 Autentikasi & Login

Saat pertama kali dijalankan, bot akan meminta metode autentikasi:

```
[1] QR Code
[2] Pairing Code
Pilih metode login (1/2):
```

### Metode 1 — QR Code
- Pilih `1`, lalu pindai QR Code yang muncul di terminal menggunakan aplikasi WhatsApp:
  - **Android**: Setelan → Perangkat Tertaut → Tautkan Perangkat
  - **iOS**: Setelan → Perangkat Tertaut → Tautkan Perangkat

### Metode 2 — Pairing Code
- Pilih `2`, masukkan nomor WhatsApp kamu (format internasional tanpa `+`, contoh: `6281234567890`).
- WhatsApp akan menampilkan 8 karakter kode pairing di aplikasinya, masukkan ke terminal.

### Data Sesi
Setelah login berhasil, sesi tersimpan di folder `auth_info_baileys/`. Folder ini **wajib ada di `.gitignore`** agar tidak ter-upload ke GitHub.

---

## 📁 Arsitektur Direktori

```text
artoria-md/
│
├── 📄 index.js                        # Master entrypoint — socket Baileys, hot reload watcher, BCG guard
├── 📄 package.json                    # Metadata proyek & daftar dependensi npm/bun
├── 📄 .gitignore                      # File/folder yang dikecualikan dari Git
├── 📄 README.md                       # Dokumentasi ini
├── 📄 howto.md                        # Panduan lengkap ArtoriaMessage & REST API
│
├── 📁 lib/                            # Core library (hot-reloadable)
│   ├── 📄 handler.js                  # Message router, plugin loader, context builder
│   ├── 📄 database.js                 # JSON database adapter — Users, Groups, Settings
│   ├── 📄 dashboard.js                # Web Dashboard HTTP server + Socket.IO + REST API
│   ├── 📄 logger.js                   # Colored ANSI console logger [INFO/WARN/ERROR]
│   │
│   └── 📁 artoria-message/            # Rich & Interactive Message Serializer Engine
│       ├── 📄 index.js                # Main class: ArtoriaMessage.bind(sock), sendMessage interceptor
│       ├── 📁 utils/
│       │   └── 📄 index.js            # fetchMediaBuffer, relayInteractive, getUserJid, JID helpers
│       └── 📁 handlers/
│           ├── 📄 group.js            # Group story, member label handlers
│           ├── 📄 interactive.js      # Carousel, List, QuickReply, CTA URL/Copy, Combined buttons
│           ├── 📄 media.js            # Album message handler
│           ├── 📄 rich.js             # Rich message, Code block, LaTeX, Data table handlers
│           └── 📄 transaction.js      # Payment, Product, Order, Poll result handlers
│
├── 📁 plugins/                        # Plugin modules (hot-reloadable)
│   ├── 📁 info/                       # Informasi & utilitas umum
│   │   ├── 📄 menu.js                 # .menu — Daftar semua perintah aktif
│   │   └── 📄 ping.js                 # .ping — Cek respons bot
│   └── 📁 owner/                      # Perintah khusus Owner
│       ├── 📄 eval.js                 # => / > — Eval kode JavaScript
│       ├── 📄 mode.js                 # .mode — Ganti mode operasi bot
│       └── 📄 ping.js                 # .ping — Network ping ke host dari server
│
└── 📁 public/                         # Web Dashboard static assets
    ├── 📄 index.html                  # Dashboard UI (TailwindCSS + Socket.IO client)
    ├── 📁 css/
    │   └── 📄 style.css               # Custom styles
    └── 📁 js/
        └── 📄 app.js                  # Dashboard frontend logic (Socket.IO, fetch API)
```

---

## 🔄 Sistem Hot Reload

### Cara Kerja

`index.js` memantau dua direktori secara bersamaan:

```js
// Di index.js — centralized watcher
fs.watch('./plugins', { recursive: true }, debounce(reloadHandler, 500));
fs.watch('./lib',     { recursive: true }, debounce(reloadHandler, 500));
```

Saat file berubah, fungsi `reloadHandler` memanggil ulang `handler.js` melalui dynamic import dengan timestamp:

```js
const mod = await import(`file:///path/to/lib/handler.js?t=${Date.now()}`);
```

### File yang Tidak Memicu Reload

File berikut sengaja diabaikan agar tidak terjadi reload berulang saat bot menyimpan data:
- `database.json`
- `auth_info_baileys/`
- `*.log`, `*.tmp`

### Apa yang Bisa di-Reload

| Lokasi | Di-reload saat berubah? | Memutus Koneksi WA? |
|--------|------------------------|---------------------|
| `plugins/**/*.js` | ✅ Ya | ❌ Tidak |
| `lib/handler.js` | ✅ Ya | ❌ Tidak |
| `lib/database.js` | ✅ Ya | ❌ Tidak |
| `lib/artoria-message/**` | ✅ Ya (re-bind otomatis) | ❌ Tidak |
| `index.js` | ❌ Perlu restart manual | — |

---

## 🧩 Sistem Plugin

### Struktur Folder

Semua plugin disimpan di dalam folder `plugins/`, dengan subfolder sebagai kategorisasi:

```
plugins/
├── info/       # Informasi, statistik, utilitas
├── owner/      # Perintah khusus owner bot
├── group/      # Manajemen grup WhatsApp
├── tools/      # Downloader, converter, utility tools
└── ai/         # Integrasi AI / chatbot
```

### Cara Pemuatan Plugin

Handler secara otomatis memindai seluruh subdirektori `plugins/` secara rekursif, lalu memuat setiap file `.js` yang ditemukan. Tidak perlu mendaftarkan plugin secara manual — cukup buat file `.js` di mana saja dalam folder `plugins/`.

### Aturan Dasar Plugin

1. Setiap plugin wajib melakukan `export default` dari **function** atau **object**.
2. Plugin function/object wajib memiliki properti `command` (string atau array).
3. Plugin dengan `execute` (object style) atau yang merupakan function langsung, keduanya didukung.
4. `handler.tags`, `handler.help`, dan `handler.description` bersifat opsional, tapi direkomendasikan untuk plugin explorer di dashboard.

---

## ✍️ Signature Plugin yang Valid

Ini adalah bagian yang sering bikin bingung. **Semua cara di bawah ini valid** dan menghasilkan plugin yang sama persis — hanya beda selera penulisan.

Handler memanggil plugin dengan dua argument: `plugin(m, context)`. Karena itu, semua signature ini bekerja:

### Cara 1 — `ctx` (Satu Object, All-in-One)
Digunakan di plugin **object style** (`execute`). `ctx` adalah alias `context` yang sudah berisi semua — termasuk `m`, `sock`, `args`, `reply`, dll.
```javascript
execute: async (ctx) => {
    const { reply, args, isOwner, sock, m, db } = ctx;
}
```

### Cara 2 — `(m, context)` (Dua Argument Terpisah)
Digunakan di plugin **handler/function style**. Persis seperti plugin botwa asli.
```javascript
const handler = async (m, context) => {
    const { args, isOwner, reply } = context;
    // m.chat, m.sender, m.text, dll. tersedia di m
    // args, isOwner, reply, sock, db tersedia di context
};
```

### Cara 3 — `(m, { ... })` (Destructure Langsung)
Shorthand dari cara 2 — langsung destructure argument kedua.
```javascript
const handler = async (m, { args, isOwner, reply, sock, db }) => {
    // Lebih ringkas, tidak perlu nulis context.args, dll.
};
```

### Cara 4 — `(ctx)` di Handler Style
Kalau kamu pakai handler style tapi tetap mau satu argument, itu juga bisa — `ctx` di sini akan berisi **`context`** (argument ke-2), bukan `m`. Akses `m` via `ctx.m`.
```javascript
const handler = async (ctx) => {
    const { reply, args, m, sock } = ctx;
    // ctx.m → objek pesan lengkap
};
```

> **Kesimpulan**: Nama `ctx`, `context`, `m`, apapun itu hanya nama variabel. Yang penting adalah posisi argument: **argument ke-1 = `m`** (objek pesan), **argument ke-2 = `context`** (semua helper + data).

---

## Format 1 — Object Style (`export default {}`)

Format sederhana, cocok untuk plugin yang hanya butuh satu fungsi execute.

### Struktur Dasar

```javascript
export default {
    command: ['namacommand'],   // string atau array string
    tags:    ['kategori'],      // label kategori plugin
    help:    ['.namacommand <arg>'],  // hint penggunaan untuk .menu
    description: 'Deskripsi singkat fungsi plugin ini',

    execute: async (ctx) => {
        // Logic plugin kamu di sini
        await ctx.reply('Halo dunia!');
    }
};
```

### Contoh Lengkap — Plugin Halo

```javascript
// plugins/info/halo.js
export default {
    command: ['halo', 'hai', 'hello'],
    tags: ['info'],
    help: ['.halo'],
    description: 'Sapa balik pengguna',

    execute: async (ctx) => {
        const { reply, pushName } = ctx;
        await reply(`👋 Halo, *${pushName}*! Apa kabar?`);
    }
};
```

### Contoh Lengkap — Plugin Quote Reply

```javascript
// plugins/tools/quote.js
export default {
    command: ['quote', 'q'],
    tags: ['tools'],
    help: ['.quote (reply pesan)'],
    description: 'Quote pesan yang di-reply',

    execute: async (ctx) => {
        const { reply, quoted, quotedText } = ctx;

        if (!quoted) return reply('❌ Reply dulu ke pesan yang ingin di-quote!');
        await reply(`💬 *Quote:*\n\n_"${quotedText}"_`);
    }
};
```

---

## Format 2 — Handler Style (`handler.command = [...]`)

Format yang lebih fleksibel, cocok untuk plugin dengan logic kompleks, penggunaan `async/await` bercabang, atau yang membutuhkan **dukungan RegExp command**.

Plugin ditulis sebagai **named async function**, dengan metadata didefinisikan sebagai properti dari function itu sendiri, lalu di-`export default`.

### Struktur Dasar

```javascript
// plugins/kategori/namafile.js

const handler = async (ctx) => {
    // Logic plugin di sini
    await ctx.reply('Halo!');
};

handler.command     = ['namacommand'];   // string, RegExp, atau array
handler.tags        = ['kategori'];
handler.help        = ['.namacommand <arg>'];
handler.description = 'Deskripsi singkat';

export default handler;
```

### Contoh Lengkap — Plugin Info User

```javascript
// plugins/info/whoami.js

const handler = async (ctx) => {
    const { reply, sender, pushName, isOwner, isAdmin, isGroup, userDb } = ctx;

    const level  = userDb?.level  || 1;
    const premium = userDb?.premium || false;

    let text = `👤 *Profil Kamu*\n\n`;
    text += `📛 Nama    : ${pushName}\n`;
    text += `📱 Nomor   : ${sender.split('@')[0]}\n`;
    text += `🎖️ Level   : ${level}\n`;
    text += `💎 Premium : ${premium ? 'Ya' : 'Tidak'}\n`;
    text += `👑 Owner   : ${isOwner ? 'Ya' : 'Tidak'}\n`;
    if (isGroup) {
        text += `🛡️ Admin   : ${isAdmin ? 'Ya' : 'Tidak'}\n`;
    }

    await reply(text);
};

handler.command     = ['whoami', 'profil', 'profile'];
handler.tags        = ['info'];
handler.help        = ['.whoami'];
handler.description = 'Tampilkan info profil pengguna';

export default handler;
```

### Contoh Lengkap — Plugin dengan Guard (isOwner / isGroup)

```javascript
// plugins/owner/broadcast.js

const handler = async (ctx) => {
    const { isOwner, text, reply, sock, db } = ctx;

    // Guard: Hanya owner yang boleh pakai
    if (!isOwner) return reply('❌ Perintah ini khusus Owner bot.');

    const msg = text.trim();
    if (!msg) return reply('Format: .broadcast <pesan>');

    // Ambil semua JID grup dari database
    const groupJids = Object.keys(db?.groups || {});
    if (groupJids.length === 0) return reply('❌ Tidak ada grup yang terdaftar.');

    let success = 0, fail = 0;
    for (const jid of groupJids) {
        try {
            await sock.sendMessage(jid, { text: msg });
            success++;
            await new Promise(r => setTimeout(r, 1500)); // delay anti-spam
        } catch {
            fail++;
        }
    }

    await reply(`✅ Broadcast selesai!\nBerhasil: ${success}\nGagal: ${fail}`);
};

handler.command     = ['broadcast', 'bc'];
handler.tags        = ['owner'];
handler.help        = ['.broadcast <pesan>'];
handler.description = 'Kirim pesan ke semua grup (Owner)';

export default handler;
```

---

## 🔀 Regex Command Support

Plugin Handler Style mendukung RegExp sebagai nilai `command`. Ini berguna untuk:
- Menangkap berbagai variasi prefix (`/ping`, `!ping`, `.ping`)
- Mencocokkan pattern teks tanpa harus sama persis

### Cara Deklarasi

```javascript
// String biasa — hanya cocok dengan "ping" setelah prefix
handler.command = 'ping';

// Array string — cocok dengan "ping" atau "speed"
handler.command = ['ping', 'speed'];

// RegExp — cocok dengan /ping atau !ping secara langsung (tanpa prefix bot)
handler.command = /^(\/|!)ping$/i;

// Array campuran string + RegExp (yang paling fleksibel)
handler.command = [
    'ping',           // cocok dengan .ping (prefix dari konfigurasi bot)
    /^\/ping$/i,      // cocok dengan /ping (slash langsung dari user)
    /^!ping$/i,       // cocok dengan !ping (bang langsung dari user)
];
```

### Cara Kerja Internal

Handler mencocokkan command dengan tiga nilai: string command tanpa prefix, dan rawCommand asli dari pesan:

```javascript
const matchesCommand = (pluginCommand, cmd, rawCommand) => {
    const cmds = Array.isArray(pluginCommand) ? pluginCommand : [pluginCommand];
    return cmds.some(c => {
        if (c instanceof RegExp) return c.test(rawCommand) || c.test(cmd);
        return c === cmd;  // string cocok dengan command setelah prefix di-strip
    });
};
```

---

## 📦 Context Object (`ctx`)

Setiap plugin menerima satu argument `ctx` yang berisi semua informasi pesan dan helper function.

### Properti Pesan

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `ctx.text` | `string` | Teks lengkap pesan (tanpa command) |
| `ctx.args` | `string[]` | Teks dipisah spasi, [0] = arg pertama |
| `ctx.command` | `string` | Command yang dipanggil (tanpa prefix) |
| `ctx.prefix` | `string` | Prefix yang digunakan (`.`, `/`, `!`, dll.) |
| `ctx.sender` | `string` | JID pengirim (`6281234@s.whatsapp.net`) |
| `ctx.pushName` | `string` | Nama WhatsApp pengirim |
| `ctx.from` | `string` | JID chat aktif (grup atau DM) |
| `ctx.chat` | `string` | Alias dari `ctx.from` |
| `ctx.isGroup` | `boolean` | Apakah pesan dikirim dari grup? |
| `ctx.isOwner` | `boolean` | Apakah pengirim adalah owner bot? |
| `ctx.isAdmin` | `boolean` | Apakah pengirim admin grup? |
| `ctx.isBotAdmin` | `boolean` | Apakah bot sendiri admin di grup ini? |
| `ctx.isMe` | `boolean` | Apakah pengirim adalah bot itu sendiri? |
| `ctx.isMedia` | `boolean` | Apakah pesan mengandung media? |
| `ctx.quoted` | `object\|null` | Objek pesan yang di-reply (jika ada) |
| `ctx.quotedText` | `string` | Teks dari pesan yang di-reply |
| `ctx.mentionedJid` | `string[]` | Daftar JID yang di-mention |

### Properti Grup

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `ctx.groupMetadata` | `object\|null` | Metadata grup (nama, deskripsi, dll.) |
| `ctx.participants` | `object[]` | Daftar anggota grup |
| `ctx.groupAdmins` | `string[]` | Daftar JID admin grup |

### Helper Functions

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `ctx.reply(text)` | Balas pesan (otomatis quote) | `await ctx.reply('Halo!')` |
| `ctx.reply({ image: buffer })` | Balas dengan media | `await ctx.reply({ image: buf, caption: 'foto' })` |
| `ctx.react(emoji)` | Beri reaksi emoji pada pesan | `await ctx.react('✅')` |
| `ctx.send(content)` | Alias dari `ctx.reply` | `await ctx.send('Teks')` |
| `ctx.download()` | Download media dari pesan yang di-reply | `const buf = await ctx.download()` |

### Properti Database

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `ctx.db` | `object` | Referensi ke `global.db` (seluruh database) |
| `ctx.userDb` | `object` | Data user pengirim dari database |
| `ctx.groupDb` | `object\|null` | Data grup saat ini dari database |

### Properti Socket & Lainnya

| Properti | Tipe | Deskripsi |
|----------|------|-----------|
| `ctx.sock` | `object` | Instance socket Baileys |
| `ctx.conn` | `object` | Alias dari `ctx.sock` |
| `ctx.client` | `object` | Alias dari `ctx.sock` |
| `ctx.plugins` | `object[]` | Semua plugin yang sedang aktif |
| `ctx.logger` | `object` | Logger bawaan bot |
| `ctx.m` | `object` | Objek pesan lengkap (versi dalam) |

---

## 🗄️ Sistem Database

Bot menggunakan adapter database JSON universal yang kompatibel dengan Bun dan Node.js tanpa perlu kompilasi binary.

### Struktur `database.json`

```json
{
  "users": {
    "6281234567890@s.whatsapp.net": {
      "name": "Nagisa",
      "level": 1,
      "premium": false,
      "lastSeen": "2026-08-11T00:00:00Z"
    }
  },
  "groups": {
    "1234567890@g.us": {
      "name": "Grup Artoria",
      "antilink": false,
      "welcome": false
    }
  },
  "settings": {
    "mode": "public",
    "prefix": "multi",
    "whitelist": []
  }
}
```

### Cara Mengakses Data

```javascript
const handler = async (ctx) => {
    const { db, userDb, groupDb, sender, reply } = ctx;

    // Data user pengirim (sudah di-init otomatis)
    console.log(userDb.name);      // "Nagisa"
    console.log(userDb.level);     // 1
    console.log(userDb.premium);   // false

    // Data grup (null jika bukan grup)
    if (groupDb) {
        console.log(groupDb.antilink);   // false
        console.log(groupDb.welcome);    // false
    }

    // Akses settings global
    console.log(db.settings.mode);   // "public"

    // Tulis ke database (otomatis disimpan ke database.json)
    userDb.level = 2;
    userDb.premium = true;

    await reply('Data tersimpan!');
};
```

### Mode Operasi Bot

Diatur via `db.settings.mode` atau perintah `.mode`:

| Mode | Deskripsi |
|------|-----------|
| `public` | Semua orang bisa pakai bot |
| `self` | Hanya owner bot yang bisa pakai |
| `whitelist` | Hanya JID yang terdaftar di `db.settings.whitelist` |

---

## 🎨 ArtoriaMessage Engine

ArtoriaMessage adalah layer serializer pesan yang **diaktifkan otomatis** saat bot berjalan. Kamu tidak perlu mengimpornya secara manual di plugin — cukup panggil `sock.sendMessage()` dengan payload yang diperluas.

> 📖 Lihat **[howto.md](./howto.md)** untuk daftar lengkap semua jenis pesan beserta contoh kode.

### Cara Kerja

```javascript
// Engine ini membuat sock.sendMessage() 'mengerti' payload custom
// Tanpa engine → error karena Baileys tidak kenal payload ini
// Dengan engine → dikirim sebagai pesan interaktif WhatsApp asli

await sock.sendMessage(m.chat, {
    carousel: { ... }       // ← Payload custom Artoria
}, { quoted: m });
```

### Contoh Cepat — Carousel

```javascript
await sock.sendMessage(m.chat, {
    carousel: {
        title: 'Pilih Layanan',
        text: 'Geser untuk melihat pilihan:',
        cards: [
            {
                title: 'Paket A',
                body: 'Deskripsi paket A',
                footer: 'Rp 50.000/bulan',
                image: 'https://example.com/img.jpg',
                buttons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Pilih A', id: 'pkg_a' }) }
                ]
            }
        ]
    }
}, { quoted: m });
```

### Contoh Cepat — List Menu

```javascript
await sock.sendMessage(m.chat, {
    listMessage: {
        title: 'Menu Bot',
        description: 'Pilih fitur yang ingin digunakan:',
        buttonText: '📋 Buka Menu',
        sections: [
            {
                title: 'Layanan AI',
                rows: [
                    { rowId: 'chat', title: 'Chat AI', description: 'Ngobrol dengan AI' },
                    { rowId: 'img', title: 'Buat Gambar', description: 'AI image generator' }
                ]
            }
        ]
    }
}, { quoted: m });
```

---

## 💻 Web Dashboard & REST API

Bot otomatis menjalankan web server di `http://localhost:3456`. Jika dijalankan di server dengan IP lokal, akses via `http://<IP-SERVER>:3456`.

### Endpoint REST API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/command` | Eksekusi perintah / eval JS secara remote |
| `GET` | `/api/state` | Ambil status bot (memory, uptime, mode, dll.) |
| `GET` | `/api/logs` | Ambil riwayat log console |
| `GET` | `/api/plugins` | Daftar semua plugin aktif |
| `POST` | `/api/settings` | Update pengaturan bot (mode, prefix) |

### Format Request `/api/command`

```json
POST /api/command
Content-Type: application/json

{
    "text": "=> conn.user"
}
```

### Mode Eval

| Prefix | Mode | Contoh |
|--------|------|--------|
| `=>` | Expression — return nilai langsung | `=> conn.user.id` |
| `>` | Block — eksekusi kode multi-baris | `> return process.memoryUsage()` |
| `.perintah` | Plugin command — jalankan plugin | `.ping` |

### Contoh Remote Eval via curl

```bash
curl -X POST http://localhost:3456/api/command \
  -H "Content-Type: application/json" \
  -d '{"text":"=> process.uptime()"}'
```

### Contoh Remote Eval via PowerShell

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = @{ text = "=> conn.user" } | ConvertTo-Json -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
Invoke-RestMethod `
    -Uri "http://192.168.1.8:3456/api/command" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $bytes | ConvertTo-Json -Depth 10
```

---

## ⚙️ Konfigurasi Bot

### Prefix Command

Prefix dikonfigurasi via `db.settings.prefix` atau perintah `.setprefix`. Nilai yang tersedia:

| Nilai | Perilaku |
|-------|---------|
| `multi` (default) | Menerima semua simbol non-alfanumerik sebagai prefix (`.`, `!`, `/`, dll.) |
| `noprefix` | Tidak perlu prefix — semua teks langsung dicocokkan sebagai command |
| `"."` atau `"/"` | Hanya menerima prefix spesifik yang ditentukan |

### Menambah Owner

Owner pertama bot secara otomatis adalah nomor WhatsApp yang digunakan login. Untuk menambah owner tambahan, edit variabel `baseOwners` di `lib/handler.js`:

```javascript
const baseOwners = [
    '6281234567890',   // nomor owner tanpa + dan @s.whatsapp.net
    '6289876543210',
];
```

---

## 📋 Daftar Plugin Bawaan

### 📁 `plugins/info/`

| File | Command | Deskripsi |
|------|---------|-----------|
| `menu.js` | `.menu`, `.help`, `.start` | Tampilkan daftar semua perintah aktif |
| `ping.js` | `.ping`, `.speed` | Cek kecepatan respons bot |

### 📁 `plugins/owner/`

| File | Command | Deskripsi |
|------|---------|-----------|
| `eval.js` | `=>`, `>`, `.eval` | Eval kode JavaScript (Owner) |
| `mode.js` | `.mode` | Ganti mode operasi bot (Owner) |
| `ping.js` | `.ping`, `/ping`, `!ping` | Cek latensi jaringan ke host (Owner) |

> ℹ️ Plugin `owner/ping.js` berbeda dengan `info/ping.js`:
> - `info/ping.js` → mengukur respons time bot itu sendiri
> - `owner/ping.js` → melakukan ICMP network ping ke domain/IP dari sisi server

---

## ➕ Menambah Plugin Baru

### Langkah 1 — Buat File Plugin

Buat file `.js` baru di subfolder mana pun dalam `plugins/`. Penamaan folder adalah bebas — itu hanya untuk organisasi kamu sendiri.

```
plugins/
└── tools/
    └── myPlugin.js     ← file plugin baru kamu
```

### Langkah 2 — Tulis Plugin

```javascript
// plugins/tools/myPlugin.js

const handler = async (ctx) => {
    const { args, reply, react } = ctx;

    const input = args.join(' ');
    if (!input) return reply('Format: .myplugin <teks>');

    await react('⏳');
    // ... lakukan sesuatu dengan input
    await react('✅');
    await reply(`Hasilnya: ${input.toUpperCase()}`);
};

handler.command = ['myplugin', 'mp'];
handler.tags = ['tools'];
handler.help = ['.myplugin <teks>'];
handler.description = 'Ubah teks menjadi huruf kapital semua';

export default handler;
```

### Langkah 3 — Simpan File

Bot akan **otomatis mendeteksi** file baru dan me-reload semua plugin dalam waktu kurang dari 1 detik. Tidak perlu restart apapun.

---

## 🖥️ Menjalankan di VPS / Server

### Menggunakan PM2 (Node.js)

```bash
npm install -g pm2

# Jalankan bot
pm2 start index.js --name "artoria-md"

# Simpan konfigurasi agar auto-start saat reboot
pm2 save
pm2 startup
```

### Menggunakan Screen (Terminal persistent)

```bash
screen -S artoria-md
bun index.js
# Tekan Ctrl+A lalu D untuk detach

# Attach kembali
screen -r artoria-md
```

### Menggunakan Tmux

```bash
tmux new -s artoria-md
bun index.js
# Tekan Ctrl+B lalu D untuk detach

# Attach kembali
tmux attach -t artoria-md
```

---

## 🔧 Troubleshooting

### ❌ Error: `Connection Closed` / Boom 428
**Penyebab**: Bot mencoba mengirim pesan saat koneksi WA belum siap setelah reconnect.  
**Solusi**: Sudah ditangani secara otomatis oleh Boom 428 Guard bawaan di `index.js`. Jika masih terjadi, tunggu beberapa detik lalu coba lagi — bot akan auto-reconnect.

### ❌ Plugin Tidak Terbaca Setelah Disimpan
**Penyebab**: Bisa jadi ada error syntax di file plugin.  
**Solusi**: Cek terminal untuk pesan error. Perbaiki syntax, simpan ulang, dan hot reload akan berjalan kembali.

### ❌ `Cannot find module` saat Hot Reload
**Penyebab**: Dependensi yang digunakan plugin belum diinstall.  
**Solusi**: Jalankan `bun install` atau `npm install` dan pastikan package sudah ada di `package.json`.

### ❌ QR Code Tidak Muncul
**Penyebab**: Terminal tidak mendukung rendering QR Code, atau sesi lama korup.  
**Solusi**: Hapus folder `auth_info_baileys/` lalu jalankan ulang bot. Gunakan Pairing Code sebagai alternatif.

### ❌ Dashboard Tidak Bisa Diakses
**Penyebab**: Port `3456` mungkin diblokir firewall atau sudah dipakai proses lain.  
**Solusi**: 
```bash
# Cek apakah port sudah digunakan
netstat -tulpn | grep 3456

# Di VPS, buka port via ufw
ufw allow 3456/tcp
```

---

## 📄 Lisensi

MIT License — Copyright © 2026 **Nagisa Artoria**

Bebas digunakan, dimodifikasi, dan didistribusikan ulang dengan menyertakan atribusi kepada pembuat asli.
