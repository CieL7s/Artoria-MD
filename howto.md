# 📚 Panduan Pesan Interaktif — Artoria - MD

> **Artoria - MD** oleh Nagisa Artoria  
> Dokumentasi lengkap cara menggunakan **ArtoriaMessage Engine** untuk mengirim berbagai jenis pesan interaktif & rich message di WhatsApp melalui Baileys.

Semua payload di bawah ini dipanggil melalui `sock.sendMessage(jid, payload, options)` yang sudah di-intercept oleh ArtoriaMessage Engine. Engine ini otomatis aktif saat bot berjalan — tidak perlu import manual di plugin.

---

## 📋 Daftar Isi

1. [Cara Pakai di Plugin](#-cara-pakai-di-plugin)
2. [Carousel — Slide Cards Bergambar](#1--carousel--slide-cards-bergambar)
3. [Single-Select List Menu](#2--single-select-list-menu)
4. [Quick Reply Buttons](#3--quick-reply-buttons)
5. [CTA URL Buttons](#4--cta-url-buttons)
6. [CTA Copy Code](#5--cta-copy-code)
7. [Combined Buttons](#6--combined-buttons)
8. [Interactive Buttons — Bebas Konfigurasi](#7--interactive-buttons--bebas-konfigurasi)
9. [Data Table V1](#8--data-table-v1)
10. [Data Table V2 (GenAI Style)](#9--data-table-v2-genai-style)
11. [Code Block V1](#10--code-block-v1)
12. [Code Block V2 (GenAI Style)](#11--code-block-v2-genai-style)
13. [LaTeX Math Formula](#12--latex-math-formula)
14. [Citation Links](#13--citation-links)
15. [Rich Message — Blok Terstruktur](#14--rich-message--blok-terstruktur)
16. [Album — Multi Foto/Video](#15--album--multi-fotovideo)
17. [Payment Request](#16--payment-request)
18. [Product Message](#17--product-message)
19. [Order Message](#18--order-message)
20. [Poll Result Snapshot](#19--poll-result-snapshot)
21. [Convenience Helpers (sock.sendXxx)](#20--convenience-helpers-socksendxxx)
22. [Catatan Kompatibilitas Perangkat](#-catatan-kompatibilitas-perangkat)

---

## 📌 Cara Pakai di Plugin

Dari dalam plugin, kamu punya akses ke `sock` melalui `ctx.sock` atau `ctx.conn`. Gunakan itu untuk kirim pesan interaktif:

```javascript
const handler = async (ctx) => {
    const { sock, m, reply } = ctx;

    // Cara 1: reply (otomatis quote ke pesan pengirim)
    await reply({
        listMessage: { ... }
    });

    // Cara 2: sock.sendMessage (lebih bebas, bisa ke JID mana saja)
    await sock.sendMessage(m.chat, {
        carousel: { ... }
    }, { quoted: m });
};
```

Untuk semua contoh di bawah ini, `m.chat` adalah JID tujuan pesan, dan `{ quoted: m }` adalah opsi untuk mengutip pesan pengirim. Keduanya bisa disesuaikan.

---

## 1. 🎠 Carousel — Slide Cards Bergambar

Pesan berbentuk kartu yang bisa digeser ke samping (*swipeable*). Setiap kartu bisa memiliki gambar/video, judul, body, footer, dan tombol aksi.

### Kapan Digunakan
Cocok untuk katalog produk, pilihan paket, atau navigasi fitur dengan visual yang menarik.

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    carousel: {
        // Teks pengantar di atas slide (opsional)
        title: '🖼️ Katalog Produk Kami',
        text: 'Geser kartu ke kanan untuk melihat semua produk:',
        footer: 'Artoria Store',

        cards: [
            {
                // Header kartu — bisa image atau video
                title: 'Produk A — Paket Starter',     // judul di header kartu
                image: 'https://example.com/produk-a.jpg',
                // video: 'https://example.com/video.mp4',  // alternatif image

                // Body & footer kartu
                body: 'Cocok untuk pengguna baru. Semua fitur dasar tersedia.',
                footer: 'Rp 50.000 / bulan',

                // Tombol di kartu ini
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🛒 Pilih Paket Ini',
                            id: 'select_starter'
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔗 Lihat Detail',
                            url: 'https://artoria.md/produk-a'
                        })
                    }
                ]
            },
            {
                title: 'Produk B — Paket Pro',
                image: 'https://example.com/produk-b.jpg',
                body: 'Untuk pengguna aktif. Termasuk AI assistant & premium tools.',
                footer: 'Rp 100.000 / bulan',
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🛒 Pilih Paket Ini',
                            id: 'select_pro'
                        })
                    }
                ]
            }
        ]
    }
}, { quoted: m });
```

### Field Reference

| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `title` | string | ✗ | Judul pesan pengantar |
| `text` | string | ✗ | Body pesan pengantar |
| `footer` | string | ✗ | Footer pesan pengantar |
| `cards` | array | ✅ | Array kartu (minimal 1) |
| `cards[].title` | string | ✗ | Judul header kartu |
| `cards[].image` | string/buffer | ✗ | Gambar kartu (URL atau Buffer) |
| `cards[].video` | string/buffer | ✗ | Video kartu (alternatif image) |
| `cards[].body` | string | ✗ | Teks body kartu |
| `cards[].footer` | string | ✗ | Teks footer kartu |
| `cards[].buttons` | array | ✗ | Tombol aksi di kartu |

---

## 2. 📋 Single-Select List Menu

Menu pilihan pop-up berbasis NativeFlow `single_select`. Saat tombol diklik, muncul bottom sheet berisi daftar pilihan yang bisa di-scroll.

### Kapan Digunakan
Cocok untuk menu utama, kategori layanan, atau pilihan yang lebih dari 3 opsi (agar tidak terlalu banyak tombol).

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    listMessage: {
        title: '📋 Menu Utama Bot',
        description: 'Pilih salah satu layanan dari daftar di bawah ini:',
        buttonText: '📂 Buka Daftar Pilihan',  // teks tombol untuk buka list
        footer: 'Artoria - MD | Nagisa Artoria',

        sections: [
            {
                title: '🤖 Layanan AI',
                rows: [
                    {
                        rowId: 'ai_chat',           // ID yang dikirim saat dipilih
                        title: 'Chat AI Assistant',
                        description: 'Ngobrol dengan AI berbasis GPT'
                    },
                    {
                        rowId: 'ai_image',
                        title: 'Generate Gambar AI',
                        description: 'Buat gambar dari deskripsi teks'
                    }
                ]
            },
            {
                title: '⚙️ Pengaturan',
                rows: [
                    {
                        rowId: 'settings_mode',
                        title: 'Ganti Mode Bot',
                        description: 'Public / Self / Whitelist'
                    },
                    {
                        rowId: 'settings_prefix',
                        title: 'Ganti Prefix',
                        description: 'Ubah simbol prefix perintah'
                    }
                ]
            },
            {
                title: '📞 Kontak & Bantuan',
                rows: [
                    {
                        rowId: 'contact_owner',
                        title: 'Hubungi Owner',
                        description: 'Chat langsung dengan Nagisa Artoria'
                    }
                ]
            }
        ]
    }
}, { quoted: m });
```

### Menangkap Respons List

Saat pengguna memilih salah satu opsi, bot akan menerima pesan dengan `text` berisi `rowId` yang dipilih:

```javascript
// Di plugin lain atau handler utama:
if (ctx.text === 'ai_chat') {
    await ctx.reply('Kamu memilih Chat AI!');
}
```

---

## 3. 🏓 Quick Reply Buttons

Tombol balasan cepat di bawah pesan. Maksimal 3 tombol per pesan.

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    quickReplyButtons: {
        title: 'Konfirmasi Tindakan',    // judul header (opsional)
        text: 'Apakah kamu yakin ingin menghapus semua data?',
        footer: '⚠️ Tindakan ini tidak dapat dibatalkan',

        buttons: [
            { id: 'confirm_yes', displayText: '✅ Ya, Hapus' },
            { id: 'confirm_no',  displayText: '❌ Batal' },
            { id: 'confirm_later', displayText: '⏰ Nanti Saja' }
        ]
    }
}, { quoted: m });
```

### Shorthand dengan Image Header

```javascript
await sock.sendMessage(m.chat, {
    interactiveButtons: {
        text: 'Pilih ukuran stiker:',
        image: 'https://example.com/sticker-preview.jpg',
        buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '256x256', id: 'size_256' }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '512x512', id: 'size_512' }) },
        ]
    }
}, { quoted: m });
```

---

## 4. 🔗 CTA URL Buttons

Tombol yang membuka URL di browser atau dalam aplikasi WhatsApp saat diklik.

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    urlButtons: {
        title: 'Kunjungi Website Kami',
        text: 'Temukan informasi lebih lengkap di website resmi Artoria MD:',
        footer: 'Klik tombol di bawah untuk membuka halaman',

        buttons: [
            {
                displayText: '🌐 Buka Website',
                url: 'https://artoria.md'
            },
            {
                displayText: '📖 Baca Dokumentasi',
                url: 'https://docs.artoria.md'
            }
        ]
    }
}, { quoted: m });
```

---

## 5. 📋 CTA Copy Code

Tombol one-tap untuk menyalin teks ke clipboard pengguna. Ideal untuk kode voucher, kode OTP, nomor resi, atau kode promo.

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    copyCode: {
        body: '🎁 Kode promo spesial untukmu! Gunakan saat checkout:',
        code: 'ARTORIA50',             // kode yang akan disalin ke clipboard
        displayText: '📋 Salin Kode Promo',  // teks pada tombol
        footer: '⏰ Berlaku hingga 31 Desember 2026'
    }
}, { quoted: m });
```

---

## 6. 🔀 Combined Buttons

Satu pesan dengan kombinasi berbagai jenis tombol sekaligus (Quick Reply, URL, Copy Code, dan Call/Telepon).

### Payload Lengkap

```javascript
await sock.sendMessage(m.chat, {
    combinedButtons: {
        title: '🛒 Konfirmasi Pesanan #ORD-2026-001',
        text: 'Pesanan kamu sudah kami terima! Pilih tindakan berikut:',
        footer: 'Artoria Store — CS tersedia 24/7',

        buttons: [
            {
                type: 'reply',                     // Quick Reply
                displayText: '✅ Konfirmasi Pesanan',
                id: 'order_confirm'
            },
            {
                type: 'url',                       // CTA URL
                displayText: '📦 Lacak Pengiriman',
                url: 'https://tracking.artoria.md/ORD-2026-001'
            },
            {
                type: 'copy',                      // Copy Code
                displayText: '📋 Salin Nomor Resi',
                copyCode: 'JNE-123456789'
            },
            {
                type: 'call',                      // CTA Call
                displayText: '📞 Hubungi CS',
                phoneNumber: '+6281234567890'
            }
        ]
    }
}, { quoted: m });
```

### Type Reference

| Type | Aksi Tombol | Field Tambahan |
|------|------------|----------------|
| `reply` | Kirim ID sebagai balasan | `id` (string) |
| `url` | Buka URL di browser | `url` (string) |
| `copy` | Salin teks ke clipboard | `copyCode` (string) |
| `call` | Buka dialer telepon | `phoneNumber` (string) |

---

## 7. 🎛️ Interactive Buttons — Bebas Konfigurasi

Format `interactiveButtons` yang paling fleksibel — kamu bisa mencampur semua jenis tombol secara bebas, dengan atau tanpa header gambar/video.

### Contoh dengan Gambar Header

```javascript
await sock.sendMessage(m.chat, {
    interactiveButtons: {
        title: 'Premium Bot Features',
        subtitle: 'Artoria - MD v1.0',      // subtitle di bawah title
        text: 'Pilih fitur yang ingin dicoba:',
        footer: 'by Nagisa Artoria',
        image: 'https://example.com/banner.jpg',  // atau Buffer

        interactiveButtons: [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '🤖 Demo AI', id: 'demo_ai' })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '🌐 Website',
                    url: 'https://artoria.md'
                })
            },
            {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Salin Kode',
                    copy_code: 'ARTORIA-FREE-TRIAL'
                })
            }
        ]
    }
}, { quoted: m });
```

### Name Reference untuk `buttonParamsJson`

| `name` | Deskripsi | Key di params |
|--------|-----------|---------------|
| `quick_reply` | Tombol balas | `display_text`, `id` |
| `cta_url` | Buka URL | `display_text`, `url` |
| `cta_copy` | Salin teks | `display_text`, `copy_code` |
| `cta_call` | Buka dialer | `display_text`, `phone_number` |
| `single_select` | List menu | `title`, `sections` |

---

## 8. 📊 Data Table V1

Tabel data dalam format native WhatsApp. Cocok untuk menampilkan statistik, harga, atau perbandingan.

### Payload via `sendMessage`

```javascript
await sock.sendMessage(m.chat, {
    tableMessage: {
        title: '📊 Daftar Harga Paket',
        headers: ['Paket', 'Durasi', 'Harga', 'Status'],
        rows: [
            ['Starter', '1 Bulan', 'Rp 50.000', '✅ Tersedia'],
            ['Pro',     '1 Bulan', 'Rp 100.000', '✅ Tersedia'],
            ['VIP',     '1 Bulan', 'Rp 200.000', '🔒 Terbatas'],
        ],
        footer: 'Harga dapat berubah sewaktu-waktu',
        headerText: '💡 Pilih paket yang sesuai kebutuhanmu'
    }
}, { quoted: m });
```

### Shorthand via Convenience Method

```javascript
await sock.sendTable(
    m.chat,
    'Daftar Harga Paket',                                    // judul
    ['Paket', 'Durasi', 'Harga'],                            // headers
    [                                                         // rows
        ['Starter', '1 Bulan', 'Rp 50.000'],
        ['Pro', '1 Bulan', 'Rp 100.000'],
    ],
    m,                                                        // quoted
    { footer: 'Data per Agustus 2026' }                      // options
);
```

---

## 9. 📊 Data Table V2 (GenAI Style)

Versi tabel yang terinspirasi dari format GenAI WhatsApp. Mendukung format string singkat dengan delimiter `|` dan `;;`.

### Format String V2

```
"[Judul Tabel]"       ← baris pertama = judul
"Kolom1|Kolom2"       ← baris kedua = header kolom
"Data1|Data2;;Data3|Data4"   ← baris berikutnya = baris data (dipisah ;;)
```

### Payload

```javascript
await sock.sendMessage(m.chat, {
    tableV2Message: [
        'Status Server',
        'Layanan|Status|Uptime',
        'WhatsApp Bot|🟢 Online|99.9%;;Web Dashboard|🟢 Online|99.5%;;Database|🟢 Online|100%'
    ]
}, { quoted: m });
```

### Shorthand via Convenience Method

```javascript
await sock.sendTableV2(
    m.chat,
    [
        'Status Server Artoria MD',
        'Layanan|Status|Uptime',
        'WhatsApp Bot|🟢 Online|99.9%;;Web Dashboard|🟢 Online|99.5%'
    ],
    m
);
```

---

## 10. 💻 Code Block V1

Blok kode dengan syntax highlighting bawaan WhatsApp.

### Bahasa yang Didukung

`javascript`, `typescript`, `python`, `java`, `kotlin`, `swift`, `go`, `rust`, `cpp`, `c`, `csharp`, `php`, `ruby`, `bash`, `shell`, `sql`, `html`, `css`, `json`, `yaml`, `markdown`

### Payload

```javascript
await sock.sendMessage(m.chat, {
    codeBlockMessage: {
        code: `const handler = async (ctx) => {
    const { reply, pushName } = ctx;
    await reply(\`Halo, \${pushName}!\`);
};

handler.command = ['halo'];
export default handler;`,
        language: 'javascript',
        title: 'Contoh Plugin Artoria MD',
        footer: 'Salin dan simpan sebagai plugins/info/halo.js'
    }
}, { quoted: m });
```

### Shorthand

```javascript
await sock.sendCodeBlock(
    m.chat,
    `console.log("Hello, Artoria!");`,
    m,
    { language: 'javascript', title: 'Hello World' }
);
```

---

## 11. 💻 Code Block V2 (GenAI Style)

Versi code block bergaya GenAI dengan header teks opsional di atas blok kode.

```javascript
await sock.sendMessage(m.chat, {
    codeBlockV2Message: {
        code: `SELECT * FROM users WHERE premium = true ORDER BY level DESC LIMIT 10;`,
        language: 'sql',
        text: 'Berikut query untuk mengambil 10 user premium tertinggi:',
        title: 'Database Query',
        footer: 'Jalankan di MySQL / PostgreSQL'
    }
}, { quoted: m });
```

---

## 12. 🧮 LaTeX Math Formula

Kirim notasi matematika / formula ilmiah dalam format LaTeX yang dirender oleh WhatsApp.

### Payload

```javascript
await sock.sendMessage(m.chat, {
    latexMessage: {
        expressions: [
            { latexExpression: 'E = mc^2' },
            { latexExpression: '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}' },
            { latexExpression: 'e^{i\\pi} + 1 = 0' },
        ]
    }
}, { quoted: m });
```

### Shorthand

```javascript
await sock.sendLatex(
    m.chat,
    m,
    { expressions: ['E = mc^2', '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}'] }
);
```

---

## 13. 🔗 Citation Links

Kartu referensi tautan mirip Google Generative AI citation — menampilkan judul, URL, dan deskripsi singkat dari sumber.

### Payload

```javascript
await sock.sendMessage(m.chat, {
    linkMessage: {
        text: 'Berikut sumber referensi yang kamu cari:',
        links: [
            'https://github.com/WhiskeySockets/Baileys',
            'https://docs.artoria.md',
            'https://bun.sh'
        ],
        footer: '3 hasil ditemukan'
    }
}, { quoted: m });
```

### Shorthand

```javascript
await sock.sendLink(
    m.chat,
    'Referensi terkait pencarian kamu:',
    ['https://github.com/WhiskeySockets/Baileys'],
    m
);
```

---

## 14. 🌟 Rich Message — Blok Terstruktur

Format pesan kaya bergaya GenAI WhatsApp yang bisa menggabungkan beberapa blok konten (teks, kode, tabel) dalam satu pesan. Bisa juga digunakan dengan header gambar & tombol.

### Payload — Pengumuman dengan Header Gambar & Tombol

```javascript
await sock.sendMessage(m.chat, {
    richMessage: {
        title: '📢 Update Artoria MD v2.0',
        subtitle: 'Changelog & Release Notes',
        text: 'Versi terbaru sudah tersedia! Berikut fitur-fitur baru yang ditambahkan:',
        footer: '🚀 Artoria - MD by Nagisa Artoria',
        image: 'https://example.com/banner-update.jpg',

        // Opsional: tombol aksi
        buttons: [
            { type: 'reply', displayText: '✅ Update Sekarang', id: 'do_update' },
            { type: 'url',   displayText: '📖 Lihat Changelog', url: 'https://docs.artoria.md/changelog' }
        ]
    }
}, { quoted: m });
```

### Payload — Rich Blok Terstruktur (Teks + Kode + Tabel)

```javascript
await sock.sendMessage(m.chat, {
    richMessage: [
        { type: 'text', text: '## Cara Membuat Plugin\n\nIkuti langkah berikut:' },
        {
            type: 'code',
            language: 'javascript',
            code: `const handler = async (ctx) => {\n    await ctx.reply("Halo!");\n};\nhandler.command = ["halo"];\nexport default handler;`
        },
        {
            type: 'table',
            title: 'Field Plugin yang Tersedia',
            headers: ['Field', 'Wajib', 'Deskripsi'],
            rows: [
                ['command', '✅', 'Nama perintah yang dipanggil'],
                ['tags', '✗', 'Kategori plugin'],
                ['help', '✗', 'Hint penggunaan'],
                ['execute', '✅', 'Fungsi handler (object style)'],
            ]
        }
    ]
}, { quoted: m });
```

---

## 15. 📷 Album — Multi Foto/Video

Kirim banyak foto atau video sekaligus dalam satu bundle album (seperti fitur album WhatsApp).

```javascript
await sock.sendMessage(m.chat, {
    albumMessage: [
        { image: Buffer.from(/* buffer foto 1 */), caption: 'Foto 1' },
        { image: Buffer.from(/* buffer foto 2 */), caption: 'Foto 2' },
        { video: Buffer.from(/* buffer video */), caption: 'Video 1' },
    ]
}, { quoted: m });
```

> ⚠️ Semua item di array `albumMessage` harus berupa `{ image: Buffer }` atau `{ video: Buffer }`. URL string juga didukung tapi tergantung koneksi server.

---

## 16. 💳 Payment Request

Pesan permintaan pembayaran resmi WhatsApp Pay.

```javascript
await sock.sendMessage(m.chat, {
    requestPaymentMessage: {
        amount: 50000,                                           // nominal (Rp 50.000)
        currency: 'IDR',                                         // kode mata uang ISO 4217
        expiry: Math.floor(Date.now() / 1000) + 86400,          // expired 24 jam dari sekarang
        note: 'Pembayaran perpanjangan sewa bot Artoria MD bulan Agustus 2026'
    }
}, { quoted: m });
```

---

## 17. 🛍️ Product Message

Bubble pesan katalog produk gaya WhatsApp Business.

```javascript
import fs from 'fs';

await sock.sendMessage(m.chat, {
    productMessage: {
        title: 'Paket Membership VIP — Artoria MD',
        description: 'Akses penuh semua fitur bot premium selama 30 hari.\nTermasuk: AI Chat, Downloader, Sticker, dan lebih banyak lagi.',
        productId: 'ARTORIA-VIP-30D',
        priceAmount1000: 100000,        // dalam satuan 1/1000 → Rp 100.000
        currencyCode: 'IDR',
        retailerId: 'artoria-store',
        url: 'https://artoria.md/vip',

        // Gambar thumbnail produk
        thumbnail: fs.readFileSync('./public/product-vip.jpg')
        // atau: thumbnail: { url: 'https://artoria.md/product-vip.jpg' }
    }
}, { quoted: m });
```

---

## 18. 📦 Order Message

Nota ringkasan pesanan.

```javascript
await sock.sendMessage(m.chat, {
    orderMessage: {
        orderId: 'ORD-2026-00123',
        itemCount: 2,
        message: 'Pesanan kamu sudah dikonfirmasi dan sedang diproses.',
        orderTitle: 'Artoria MD Store',
        totalAmount1000: 150000,        // Rp 150.000
        totalCurrencyCode: 'IDR',
        thumbnail: { url: 'https://artoria.md/order-thumb.jpg' }
    }
}, { quoted: m });
```

---

## 19. 📊 Poll Result Snapshot

Menampilkan snapshot hasil polling/voting.

```javascript
await sock.sendMessage(m.chat, {
    pollResultMessage: {
        name: 'Bahasa Pemrograman Favoritmu?',
        pollVotes: [
            { optionName: 'JavaScript / Node.js', optionVoteCount: 42 },
            { optionName: 'Python',                optionVoteCount: 28 },
            { optionName: 'Go / Golang',           optionVoteCount: 15 },
            { optionName: 'Rust',                  optionVoteCount: 10 },
            { optionName: 'Lainnya',               optionVoteCount: 5  },
        ]
    }
}, { quoted: m });
```

---

## 20. 🛠️ Convenience Helpers (`sock.sendXxx`)

Metode shorthand yang disediakan langsung di instance socket untuk operasi umum.

| Method | Signature | Deskripsi |
|--------|-----------|-----------|
| `sock.sendTable` | `(jid, title, headers, rows, quoted, opts?)` | Data Table V1 |
| `sock.sendTableV2` | `(jid, lines[], quoted, opts?)` | Data Table V2 GenAI |
| `sock.sendCodeBlock` | `(jid, code, quoted, opts?)` | Code Block V1 |
| `sock.sendCodeBlockV2` | `(jid, code, quoted, opts?)` | Code Block V2 GenAI |
| `sock.sendLatex` | `(jid, quoted, opts)` | LaTeX Math |
| `sock.sendLink` | `(jid, text, links[], quoted, opts?)` | Citation Links |
| `sock.sendList` | `(jid, title, items[], quoted, opts?)` | Rich List (tabel 1 kolom) |
| `sock.sendRichMessage` | `(jid, blocks[], quoted)` | Rich Message terstruktur |

### Contoh Penggunaan

```javascript
const handler = async (ctx) => {
    const { sock, m, args } = ctx;

    // Kirim tabel
    await sock.sendTable(
        m.chat,
        'Statistik Server',
        ['Metrik', 'Nilai'],
        [
            ['Uptime', '99.9%'],
            ['RAM', '512 MB'],
            ['Plugin Aktif', '10'],
        ],
        m
    );

    // Kirim code block
    await sock.sendCodeBlock(
        m.chat,
        `SELECT COUNT(*) FROM users WHERE premium = true;`,
        m,
        { language: 'sql', title: 'Query Pengguna Premium' }
    );

    // Kirim formula LaTeX
    await sock.sendLatex(
        m.chat,
        m,
        { expressions: ['a^2 + b^2 = c^2'] }
    );

    // Kirim list sederhana
    await sock.sendList(
        m.chat,
        'Fitur Artoria MD',
        ['Hot Reload', 'Carousel', 'List Menu', 'Code Block', 'LaTeX'],
        m
    );
};
```

---

## 📱 Catatan Kompatibilitas Perangkat

| Fitur | Android | iOS | WhatsApp Web |
|-------|---------|-----|-------------|
| Carousel | ✅ | ✅ | ⚠️ Placeholder |
| List Menu | ✅ | ✅ | ⚠️ Placeholder |
| Quick Reply | ✅ | ✅ | ⚠️ Placeholder |
| CTA URL | ✅ | ✅ | ⚠️ Placeholder |
| CTA Copy | ✅ | ✅ | ⚠️ Placeholder |
| Data Table | ✅ | ✅ | ⚠️ Placeholder |
| Code Block | ✅ | ✅ | ⚠️ Teks biasa |
| LaTeX | ✅ | ✅ | ⚠️ Teks biasa |
| Album | ✅ | ✅ | ✅ |
| Poll Result | ✅ | ✅ | ✅ |
| Payment | ✅ | ✅ | ✅ |

> ⚠️ **WhatsApp Web (Desktop)**: Beberapa jenis pesan interaktif (Carousel, List, Quick Reply, CTA) menampilkan placeholder *"Pesan ini tidak dapat dimuat. Buka di HP untuk melihatnya."* — ini adalah kebijakan resmi WhatsApp Web dari Meta, bukan bug dari bot.

---

*Dokumentasi ini dibuat untuk **Artoria - MD** oleh **Nagisa Artoria**. Lihat [README.md](./README.md) untuk panduan instalasi dan arsitektur sistem.*
