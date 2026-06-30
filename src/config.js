// ============================================================================
// Konfigurasi game & sumber data — dibaca dari env Vite (lihat `.env`).
//
// MODE DEMO (default): VITE_HELIUS_API_KEY kosong -> feed simulasi acak.
// MODE LIVE: isi VITE_HELIUS_API_KEY (API key GRATIS https://helius.dev) di `.env`,
//            lalu restart `npm run dev`. Game otomatis pakai data on-chain nyata.
// ============================================================================

const env = import.meta.env

export const CONFIG = {
  // API key Helius — JANGAN hardcode di sini; taruh di file `.env`.
  heliusApiKey: (env.VITE_HELIUS_API_KEY || '').trim(),

  // Contract address (mint) tiap tim — bisa di-override lewat `.env`.
  // CATATAN: alamat Solana case-sensitive; salin persis dari Solscan/DexScreener.
  ansemMint: env.VITE_ANSEM_MINT || '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
  // Sisi kanan = TJR. Default: TJR "The Top Floor Boss". Ganti via VITE_PUMPFUN_MINT.
  pumpfunMint: env.VITE_PUMPFUN_MINT || '4U4U8oXwDyVXGeTffMXds4NAgBgLFwq3wNvTCRTSpump',
}

// Nama tim yang ditampilkan (key internal tetap 'ansem'/'pumpfun').
export const TEAM_NAMES = { ansem: 'ANSEM', pumpfun: 'TJR' }

// Info proyek (ditampilkan di tombol Info / X / CA). Isi lewat `.env`:
//   VITE_APP_NAME, VITE_APP_X (URL X/Twitter), VITE_APP_TOKEN_CA (CA token kamu).
export const APP = {
  name: env.VITE_APP_NAME || 'ANSEM vs TJR',
  x: env.VITE_APP_X || '',          // contoh: https://x.com/yourproject
  tokenCa: env.VITE_APP_TOKEN_CA || '', // contract address token kamu
  tokenSymbol: env.VITE_APP_TOKEN_SYMBOL || '', // ticker token kamu, mis. PUMPFUN
}

// Aktif live bila ada API key.
export const isLive = () => CONFIG.heliusApiKey.length > 0
