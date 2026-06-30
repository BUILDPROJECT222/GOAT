// Trade feed for the authoritative server. A single source watches only the
// TWO mints in the current match (via getMints()), so usage stays flat no
// matter how big the roster grows. Trades carry `mint`; the engine maps it to a
// slot. Falls back to a simulated feed when there's no Helius key.

let _seq = 0
export const uid = () => `${++_seq}-${Math.random().toString(36).slice(2, 8)}`

// --- Simulated feed (no API key) ----------------------------------------
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const randWallet = () => { let s = ''; for (let i = 0; i < 44; i++) s += B58[Math.floor(Math.random() * B58.length)]; return s }
const WALLET_POOL = Array.from({ length: 30 }, randWallet)
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rand = (a, b) => a + Math.random() * (b - a)
const randomSol = () => {
  const r = Math.random()
  if (r < 0.5) return +rand(0.1, 5).toFixed(2)
  if (r < 0.82) return +rand(5, 12).toFixed(2)
  if (r < 0.96) return +rand(12, 30).toFixed(2)
  return +rand(30, 90).toFixed(2)
}
export function createSimulatedFeed(onTrade, getMints, { minDelay = 600, maxDelay = 2600 } = {}) {
  let stopped = false, timer = null
  const tick = () => {
    if (stopped) return
    const mints = getMints()
    if (mints.length === 2) {
      onTrade({ id: uid(), mint: Math.random() < 0.5 ? mints[0] : mints[1], solAmount: randomSol(), wallet: pick(WALLET_POOL), kind: 'buy', ts: Date.now() })
    }
    timer = setTimeout(tick, rand(minDelay, maxDelay))
  }
  timer = setTimeout(tick, 500)
  return () => { stopped = true; clearTimeout(timer) }
}

// --- Live feed: Helius parsed transaction history polling ----------------
export function createHeliusFeed({ apiKey, getMints, onTrade, onStatus }) {
  const MIN_TRADE_SOL = 1
  const POLL_MS = 6000
  let stopped = false, timer = null, lastKey = ''
  const seen = new Set()
  const seededMints = new Set() // mints whose backlog we've already silently absorbed

  const urlFor = (mint) => `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${apiKey}&limit=100`

  const parseBuy = (tx, mintsSet) => {
    if (!tx || tx.transactionError) return null
    const fee = tx.feePayer || 'unknown'
    let mint = null, lamports = 0
    const sw = tx.events && tx.events.swap
    if (sw) {
      const out = (sw.tokenOutputs || []).find((t) => mintsSet.has(t.mint))
      if (out && sw.nativeInput) { mint = out.mint; lamports = Number(sw.nativeInput.amount || 0) }
    }
    if (!mint) {
      const tt = (tx.tokenTransfers || []).find((t) => mintsSet.has(t.mint))
      if (tt && tt.toUserAccount === fee) {
        mint = tt.mint
        for (const n of tx.nativeTransfers || []) if (n.fromUserAccount === fee) lamports += Number(n.amount || 0)
      }
    }
    const sol = lamports / 1e9
    if (!mint || sol < MIN_TRADE_SOL) return null
    return { id: tx.signature || uid(), mint, solAmount: +sol.toFixed(3), wallet: fee, kind: 'buy', ts: tx.timestamp ? tx.timestamp * 1000 : Date.now() }
  }

  const pollMint = async (mint, mintsSet) => {
    const r = await fetch(urlFor(mint))
    if (!r.ok) throw new Error('http ' + r.status)
    const txs = await r.json()
    if (!Array.isArray(txs)) return
    const fresh = !seededMints.has(mint) // first poll for this mint -> absorb backlog silently
    for (const tx of txs.slice().reverse()) {
      const sig = tx.signature
      if (!sig || seen.has(sig)) continue
      seen.add(sig)
      if (!fresh) { const t = parseBuy(tx, mintsSet); if (t) onTrade(t) }
    }
    seededMints.add(mint)
  }

  const tick = async () => {
    if (stopped) return
    const mints = getMints()
    const key = mints.join('|')
    if (key !== lastKey) { seededMints.clear(); lastKey = key } // match changed -> re-seed silently
    const mintsSet = new Set(mints)
    const oks = await Promise.all(mints.map((m) => pollMint(m, mintsSet).then(() => true).catch(() => false)))
    const anyOk = oks.some(Boolean)
    onStatus && onStatus(anyOk ? 'live' : 'error')
    if (seen.size > 20000) seen.clear()
    if (!stopped) timer = setTimeout(tick, POLL_MS)
  }

  onStatus && onStatus('connecting')
  tick()
  return () => { stopped = true; clearTimeout(timer) }
}
