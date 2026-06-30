// Authoritative GOAT Gauntlet engine (server-side, single source of truth).
//
// Format (result-driven state machine):
//   - 🐐 GOAT defends at the FINAL. Starts as INITIAL_GOAT.
//   - ROUND 1 (semifinal): two challengers popped from the front of the queue.
//   - FINAL: Round-1 winner vs the GOAT.
//   - The FINAL winner becomes/stays the GOAT (title is winnable).
//   - Both losers (round-1 loser + final loser) go to the back of the queue.
//   - Round 1 always pulls the next two from the queue → naturally recycles
//     with 3 fighters and scales to N via the queue.
import { fighter, mintToId, INITIAL_GOAT, INITIAL_QUEUE } from './roster.js'

const MAX_HP = Number(process.env.MAX_HP) || 1000 // override for quick local testing

export function createEngine({ onTrade, onChange, onKO, save, intermission = 300 } = {}) {
  const INTERMISSION = intermission
  const state = {
    stage: 'round1',          // 'round1' | 'final'
    cycle: 1,
    left: null, right: null,  // fighter ids in the current match (slots)
    hp: { left: MAX_HP, right: MAX_HP },
    scores: { left: 0, right: 0 },
    goat: INITIAL_GOAT,
    queue: [...INITIAL_QUEUE],
    matchWinner: null,        // 'left' | 'right' once the match is decided (KO)
    nextIn: null,             // intermission countdown (s)
    status: 'connecting',
    maxHp: MAX_HP,
  }
  let recentTrades = []       // newest first, max 40

  const fInfo = (id) => {
    const f = fighter(id)
    return f ? { id: f.id, name: f.name, mint: f.mint, color: f.color } : null
  }
  const otherSlot = (s) => (s === 'left' ? 'right' : 'left')

  function setMatch(stage, aId, bId) {
    // Normalize sides so the lower-order fighter is always on the left (matches
    // the baked arena art). Slot is display-only; win/routing use fighter ids.
    const oa = fighter(aId)?.order ?? 0
    const ob = fighter(bId)?.order ?? 0
    const [leftId, rightId] = oa <= ob ? [aId, bId] : [bId, aId]
    state.stage = stage
    state.left = leftId
    state.right = rightId
    state.hp = { left: MAX_HP, right: MAX_HP }
    state.scores = { left: 0, right: 0 }
    state.matchWinner = null
    state.nextIn = null
  }
  function startRound1() {
    const a = state.queue.shift()
    const b = state.queue.shift()
    setMatch('round1', a, b)
  }
  function startFinal(contenderId) {
    setMatch('final', contenderId, state.goat)
  }
  function seed() {
    state.goat = INITIAL_GOAT
    state.queue = [...INITIAL_QUEUE]
    state.cycle = 1
    startRound1()
  }
  seed()

  // Mints of the two fighters in the current match (for the feed to poll).
  const activeMints = () => [fighter(state.left)?.mint, fighter(state.right)?.mint].filter(Boolean)

  const publicState = () => ({
    stage: state.stage, cycle: state.cycle,
    left: fInfo(state.left), right: fInfo(state.right),
    hp: state.hp, scores: state.scores,
    goat: fInfo(state.goat), queue: state.queue.map(fInfo),
    matchWinner: state.matchWinner, nextIn: state.nextIn,
    status: state.status, maxHp: MAX_HP,
  })
  const snapshot = () => ({
    ...publicState(),
    _ids: { left: state.left, right: state.right, goat: state.goat, queue: [...state.queue] },
    trades: recentTrades.slice(0, 40),
  })

  function finishMatch(winnerSlot) {
    if (state.matchWinner) return
    state.matchWinner = winnerSlot
    const winnerId = state[winnerSlot]
    const loserId = state[otherSlot(winnerSlot)]
    state.nextIn = INTERMISSION
    // Every KO triggers a reward event (airdrop wiring happens later).
    onKO && onKO({
      stage: state.stage, cycle: state.cycle,
      winnerId, loserId,
      winnerMint: fighter(winnerId)?.mint, winnerName: fighter(winnerId)?.name,
    })
    save && save(snapshot())
  }

  // Apply the bracket routing and start the next match (called after intermission).
  function advance() {
    if (!state.matchWinner) return
    const winnerId = state[state.matchWinner]
    const loserId = state[otherSlot(state.matchWinner)]
    if (state.stage === 'round1') {
      state.queue.push(loserId)     // round-1 loser drops to the back
      startFinal(winnerId)          // winner advances to face the GOAT
    } else {                        // final
      state.goat = winnerId         // final winner becomes/stays GOAT
      state.queue.push(loserId)     // final loser drops to the back
      state.cycle += 1
      startRound1()                 // next round 1 = next two in the queue
    }
    save && save(snapshot())
  }

  function handleTrade(trade) {
    recentTrades.unshift(trade)
    if (recentTrades.length > 40) recentTrades.length = 40

    // Map the trade's mint to a slot in the current match.
    const id = trade.mint ? mintToId(trade.mint) : null
    const slot = id === state.left ? 'left' : id === state.right ? 'right' : null
    const t2 = { ...trade, slot }

    if (trade.kind !== 'buy' || !slot || state.matchWinner) {
      onTrade && onTrade(t2); onChange && onChange(); return
    }
    state.scores[slot] = +(state.scores[slot] + trade.solAmount).toFixed(2)
    const opp = otherSlot(slot)
    state.hp[opp] = Math.max(0, +(state.hp[opp] - trade.solAmount).toFixed(2))

    onTrade && onTrade(t2)
    if (state.hp[opp] <= 0) finishMatch(slot)
    onChange && onChange()
  }

  function setStatus(s) { if (state.status !== s) { state.status = s; onChange && onChange() } }

  function reset() {
    seed()
    recentTrades = []
    save && save(snapshot())
    onChange && onChange()
  }

  function load(snap) {
    if (!snap || !snap._ids) return // ignore old/incompatible snapshots
    try {
      const ids = snap._ids
      if (!fighter(ids.left) || !fighter(ids.right) || !fighter(ids.goat)) return
      state.left = ids.left; state.right = ids.right; state.goat = ids.goat
      state.queue = (Array.isArray(ids.queue) ? ids.queue : []).filter(fighter)
      state.stage = snap.stage === 'final' ? 'final' : 'round1'
      state.cycle = snap.cycle || 1
      if (snap.hp) state.hp = snap.hp
      if (snap.scores) state.scores = snap.scores
      state.matchWinner = snap.matchWinner ?? null
      state.nextIn = snap.nextIn ?? null
      if (Array.isArray(snap.trades)) recentTrades = snap.trades.slice(0, 40)
    } catch { /* ignore malformed snapshot */ }
  }

  // Intermission countdown (1s).
  setInterval(() => {
    if (state.matchWinner && state.nextIn != null) {
      state.nextIn -= 1
      if (state.nextIn <= 0) advance()
      onChange && onChange()
    }
  }, 1000)

  return { handleTrade, setStatus, load, snapshot, publicState, reset, activeMints, advance }
}
