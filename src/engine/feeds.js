// ============================================================================
// Sumber data trade. Game cuma butuh sebuah "feed factory" yang memanggil
// onTrade({ id, side, solAmount, wallet, kind:'buy', ts }) tiap ada transaksi.
//
//   side      : 'ansem' | 'pumpfun'  (CA mana yang dibeli)
//   solAmount : jumlah SOL pembelian
//   wallet    : alamat pembeli
//   kind      : 'buy' (nanti bisa tambah 'sell')
//
// Demo memakai createSimulatedFeed. Untuk data nyata pump.fun, tinggal ganti ke
// createPumpPortalFeed dengan 2 mint address — strukturnya sudah identik.
// ============================================================================

let _seq = 0
export const uid = () => `${++_seq}-${Math.random().toString(36).slice(2, 8)}`

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const randWallet = () => {
  let s = ''
  for (let i = 0; i < 44; i++) s += B58[Math.floor(Math.random() * B58.length)]
  return s
}

// Pool wallet tetap supaya leaderboard bisa mengakumulasi pembeli yang sama.
const WALLET_POOL = Array.from({ length: 30 }, randWallet)
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rand = (a, b) => a + Math.random() * (b - a)

// Distribusi nominal SOL: kebanyakan kecil, sesekali whale.
function randomSol() {
  const r = Math.random()
  if (r < 0.5) return +rand(0.1, 5).toFixed(2)    // kecil (sering di bawah threshold)
  if (r < 0.82) return +rand(5, 12).toFixed(2)    // dorongan normal
  if (r < 0.96) return +rand(12, 30).toFixed(2)   // big buy
  return +rand(30, 90).toFixed(2)                 // whale
}

/**
 * Feed simulasi. Mengeluarkan trade acak dengan jeda waktu acak.
 * @returns fungsi unsubscribe
 */
export function createSimulatedFeed(onTrade, { minDelay = 450, maxDelay = 2000 } = {}) {
  let stopped = false
  let timer = null
  const tick = () => {
    if (stopped) return
    onTrade({
      id: uid(),
      side: Math.random() < 0.5 ? 'ansem' : 'pumpfun',
      solAmount: randomSol(),
      wallet: pick(WALLET_POOL),
      kind: 'buy',
      ts: Date.now(),
    })
    timer = setTimeout(tick, rand(minDelay, maxDelay))
  }
  timer = setTimeout(tick, 400)
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}

/**
 * Feed data NYATA on-chain via Helius (API key gratis, tanpa SOL).
 *
 * HEMAT USAGE: memakai POLLING endpoint "parsed transaction history"
 * (`GET /v0/addresses/{mint}/transactions`) — 1 request per CA tiap POLL_MS,
 * mengembalikan swap yang SUDAH ter-parse. Usage jadi TERBATAS PASTI (tidak
 * peduli seramai apa tokennya), beda jauh dgn parse tiap-tx yg boros.
 *
 * Hanya BUY >= MIN_TRADE_SOL yang di-emit (sell & dust diabaikan).
 *
 *   createHeliusFeed({ apiKey, ansemMint, pumpfunMint, onTrade, onStatus })
 */
export function createHeliusFeed({ apiKey, ansemMint, pumpfunMint, onTrade, onStatus }) {
  const mints = new Set([ansemMint, pumpfunMint])
  const sideOf = (m) => (m === ansemMint ? 'ansem' : m === pumpfunMint ? 'pumpfun' : null)
  const urlFor = (mint) =>
    `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${apiKey}&limit=100`

  const MIN_TRADE_SOL = 1 // minimal SOL agar muncul (buy < ini diabaikan)
  const POLL_MS = 6000    // jeda poll per CA (makin besar = makin hemat usage)

  let stopped = false
  let timer = null
  let seeded = false      // poll pertama hanya isi cache (jangan emit histori lama)
  const seen = new Set()

  const parseBuy = (tx) => {
    if (!tx || tx.transactionError) return null
    const fee = tx.feePayer || 'unknown'
    let side = null
    let lamports = 0
    const sw = tx.events && tx.events.swap
    if (sw) {
      const out = (sw.tokenOutputs || []).find((t) => mints.has(t.mint)) // token diterima = BUY
      if (out && sw.nativeInput) { side = sideOf(out.mint); lamports = Number(sw.nativeInput.amount || 0) }
    }
    if (!side) { // fallback: tokenTransfers + nativeTransfers
      const tt = (tx.tokenTransfers || []).find((t) => mints.has(t.mint))
      if (tt && tt.toUserAccount === fee) {
        side = sideOf(tt.mint)
        for (const n of tx.nativeTransfers || []) if (n.fromUserAccount === fee) lamports += Number(n.amount || 0)
      }
    }
    const sol = lamports / 1e9
    if (!side || sol < MIN_TRADE_SOL) return null
    return { id: tx.signature || uid(), side, solAmount: +sol.toFixed(3), wallet: fee, kind: 'buy', ts: tx.timestamp ? tx.timestamp * 1000 : Date.now() }
  }

  const pollMint = async (mint) => {
    const r = await fetch(urlFor(mint))
    if (!r.ok) throw new Error('http ' + r.status)
    const txs = await r.json()
    if (!Array.isArray(txs)) return
    // proses lama -> baru agar urutan emit kronologis
    for (const tx of txs.slice().reverse()) {
      const sig = tx.signature
      if (!sig || seen.has(sig)) continue
      seen.add(sig)
      if (seeded) { const t = parseBuy(tx); if (t) onTrade(t) }
    }
  }

  const tick = async () => {
    if (stopped) return
    // Isolasi per-CA: bila satu mint gagal (alamat salah dll), mint lain tetap jalan.
    const oks = await Promise.all([...mints].map((m) => pollMint(m).then(() => true).catch(() => false)))
    const anyOk = oks.some(Boolean)
    onStatus && onStatus(anyOk ? 'live' : 'error')
    if (anyOk) seeded = true
    if (seen.size > 20000) seen.clear() // jaga memori; sesekali boleh re-emit sedikit
    if (!stopped) timer = setTimeout(tick, POLL_MS)
  }

  onStatus && onStatus('connecting')
  tick()
  return () => { stopped = true; clearTimeout(timer) }
}
