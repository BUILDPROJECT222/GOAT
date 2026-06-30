import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createEngine } from './engine.js'
import { createHeliusFeed, createSimulatedFeed } from './feed.js'
import { loadState, saveState, storeEnabled, initStore } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3001

const HELIUS = process.env.HELIUS_API_KEY || process.env.VITE_HELIUS_API_KEY || ''

const app = express()
app.use(express.static(DIST))
app.get('/healthz', (_req, res) => res.send('ok'))
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const broadcast = (msg) => {
  const s = JSON.stringify(msg)
  wss.clients.forEach((c) => { if (c.readyState === 1) c.send(s) })
}

// Throttle state broadcasts a touch (HP can change several times per poll batch).
let stateDirty = false
const engine = createEngine({
  onTrade: (trade) => broadcast({ type: 'trade', trade }),
  onChange: () => { stateDirty = true },
  save: (snap) => saveState(snap),
  intermission: Number(process.env.INTERMISSION) || 300,
  onKO: (ko) => {
    // Every KO is a reward event. Airdrop wiring lands in a later phase; log for now.
    console.log(`[KO] ${ko.stage} cycle ${ko.cycle}: ${ko.winnerName} wins (${ko.winnerMint})`)
  },
})
setInterval(() => { if (stateDirty) { stateDirty = false; broadcast({ type: 'state', state: engine.publicState() }) } }, 200)

// Admin: reset the whole match to a fresh start (HP 1000, scores/round/wins/KO/trades cleared).
// Guard with ADMIN_KEY; call: POST /admin/reset?key=...  (or header x-admin-key). No-op if key unset.
app.post('/admin/reset', (req, res) => {
  const key = req.query.key || req.headers['x-admin-key']
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' })
  engine.reset()
  broadcast({ type: 'init', state: engine.snapshot() }) // full resync so trades clear on all viewers
  console.log('[admin] state reset to fresh')
  res.json({ ok: true, state: engine.publicState() })
})

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', state: engine.snapshot() }))
})

async function boot() {
  // 1) Serve immediately — the app must be reachable even if the DB is slow/down.
  server.listen(PORT, () => console.log(`[server] listening on ${PORT} (ws /ws)`))

  // 2) Persistence (best-effort, before the feed so we restore prior state first).
  if (storeEnabled()) {
    try {
      await initStore()
      const snap = await loadState()
      if (snap) { engine.load(snap); console.log('[boot] restored state from Postgres') }
      setInterval(() => saveState(engine.snapshot()), 10000)
      console.log('[boot] Postgres persistence enabled')
    } catch (e) {
      console.warn('[boot] Postgres init failed — in-memory only:', e.message)
    }
  } else {
    console.log('[boot] no DATABASE_URL — in-memory state only')
  }

  // 3) Trade feed — watches only the two mints in the current match.
  if (HELIUS) {
    console.log('[boot] live feed (Helius)')
    createHeliusFeed({ apiKey: HELIUS, getMints: engine.activeMints, onTrade: engine.handleTrade, onStatus: engine.setStatus })
  } else {
    console.log('[boot] no Helius key — simulated feed')
    engine.setStatus('demo')
    createSimulatedFeed(engine.handleTrade, engine.activeMints)
  }
}

boot()
