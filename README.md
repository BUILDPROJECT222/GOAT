# ANSEM vs PUMPFUN — Buy Battle ⚔️

Game interaktif tug-of-war (tarik tambang) real-time untuk crypto. Dua contract
address (CA) bertarung: tiap **pembelian di atas threshold (default 5 SOL)**
memunculkan **popup** dan **mendorong garis tengah (frontline)** ke arah lawan.
Sisi yang berhasil mendorong frontline melewati ujung = **KO menang ronde**;
kalau waktu habis, sisi yang lebih unggul yang menang.

- **ANSEM** (kiri, pink) mendorong frontline ke kanan.
- **PUMPFUN** (kanan, biru) mendorong ke kiri.
- Tier dorongan: `≥5◎` normal · `≥10◎` 🔥 BIG (screen shake) · `≥25◎` 🐋 WHALE.
- Fitur: skor ronde, timer, leaderboard whale, live ticker semua trade, sistem ronde berulang.

## Jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Mode demo vs data nyata (Helius)

Default = **mode demo** (feed simulasi acak). Untuk **data on-chain nyata**:

1. Ambil **API key gratis** di https://helius.dev (Dashboard → API Keys; tanpa SOL).
2. Tempel ke `src/config.js`:

   ```js
   export const CONFIG = {
     heliusApiKey: 'PASTE_KEY_DISINI',
     ansemMint: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
     pumpfunMint: 'PumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
   }
   ```
3. Reload. Badge di kontrol berubah **DEMO → CONNECTING → ● LIVE**.

Cara kerja (`createHeliusFeed` di `feeds.js`): **polling** endpoint Helius
`GET /v0/addresses/{mint}/transactions` tiap 6 dtk per CA → swap sudah ter-parse
→ ambil **BUY ≥ 2 SOL** saja (sell & dust diabaikan). Pendekatan polling dipilih
agar **hemat usage** — jumlah request terbatas pasti, tidak peduli seramai apa
tokennya. Tuning di `feeds.js`: `POLL_MS` (jeda poll) & `MIN_TRADE_SOL`.

**Catatan:**
- Live trades panel = buy-only & min 2 SOL. Yang mendorong frontline tetap buy ≥
  *Threshold* (slider, default 5◎) — turunkan bila ingin lebih ramai.
- Token hiper-aktif (mis. PUMP) bisa kehilangan sebagian buy: tiap poll hanya
  ambil 100 tx terbaru. Naikkan frekuensi poll bila perlu (lebih boros usage).
- API key tampil di sisi browser (client-side). Key gratis risiko rendah; untuk
  produksi, proxy lewat backend agar key tak terekspos.

## Struktur

```
src/
  engine/
    feeds.js          # sumber data: simulasi + Helius (on-chain nyata)
    useGameEngine.js  # fisika frontline, popup, skor, ronde, leaderboard
  config.js           # API key Helius + 2 contract address
  components/          # TopBar, Fighter, BuyPopups, Leaderboard, Ticker, Controls
  App.jsx             # tata letak arena
  arena.png           # background stadion (TEAM ANSEM vs TEAM PUMPFUN)
```

Background arena dipakai via CSS `url('./arena.png')` di `styles.css` (`.arena`).
Ganti file itu untuk mengganti latar; sesuaikan `background-position` bila perlu
agar lapangan pas dengan posisi karakter.

## Ganti karakter (sprite)

Karakter dibuat dari sprite sheet 4-frame di `src/ansem.png` & `src/Pumpfu.png`
(figur menghadap arah dorongan, background gelap polos). Untuk regenerasi setelah
mengganti art:

```bash
npm i -D sharp
node scripts/process-sprites.mjs
```

Script otomatis: hapus background (flood-fill dari tepi, aman untuk outline/rambut
gelap), potong 4 frame via titik equal-ink, normalisasi, lalu tulis
`src/assets/{ansem,pumpfun}-sheet.png` + `src/assets/sprites.js`.

## Ide lanjutan

- Sound effect + confetti saat menang
- Multiplier combo (beberapa buy beruntun di satu sisi)
- OBS overlay mode untuk live streaming
- Ganti emoji karakter dengan gambar asli (tinggal swap di `SidePanel.jsx`)
- Simpan riwayat kemenangan / leaderboard all-time ke backend
