// ============================================================================
// Client config (UI). The Helius key now lives ONLY on the server — the
// browser connects to the backend over WebSocket and never polls on-chain.
// Contract addresses are still used client-side for token cards / info modal.
// ============================================================================

const env = import.meta.env

export const CONFIG = {
  // Contract address (mint) per team — overridable via `.env` (VITE_*_MINT).
  // NOTE: Solana addresses are case-sensitive; copy exactly from Solscan/DexScreener.
  ansemMint: env.VITE_ANSEM_MINT || '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
  pumpfunMint: env.VITE_PUMPFUN_MINT || '4U4U8oXwDyVXGeTffMXds4NAgBgLFwq3wNvTCRTSpump',
}

// Nama tim yang ditampilkan (key internal tetap 'ansem'/'pumpfun').
export const TEAM_NAMES = { ansem: 'ANSEM', pumpfun: 'TJR' }

// Info proyek (ditampilkan di tombol Info / X / CA). Isi lewat `.env`:
//   VITE_APP_NAME, VITE_APP_X (URL X/Twitter), VITE_APP_TOKEN_CA (CA token kamu).
export const APP = {
  name: env.VITE_APP_NAME || 'ANSEM vs TJR',
  x: env.VITE_APP_X || '',          // e.g. https://x.com/yourproject
  tokenCa: env.VITE_APP_TOKEN_CA || '', // your token contract address
  tokenSymbol: env.VITE_APP_TOKEN_SYMBOL || '', // your token ticker, e.g. PUMPFUN
}
