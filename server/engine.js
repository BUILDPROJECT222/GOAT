// Authoritative game engine (server-side, single source of truth).
const MAX_HP = 1000
const INTERMISSION = 300 // 5 minutes between rounds

export function createEngine({ onTrade, onChange, save } = {}) {
  const state = {
    hp: { ansem: MAX_HP, pumpfun: MAX_HP },
    scores: { ansem: 0, pumpfun: 0 },
    round: { n: 1, winner: null },
    wins: { ansem: 0, pumpfun: 0 },
    koSide: null,
    nextIn: null,
    status: 'connecting',
    maxHp: MAX_HP,
  }
  let recentTrades = [] // newest first, max 40

  const publicState = () => ({
    hp: state.hp, scores: state.scores, round: state.round, wins: state.wins,
    koSide: state.koSide, nextIn: state.nextIn, status: state.status, maxHp: MAX_HP,
  })
  const snapshot = () => ({ ...publicState(), trades: recentTrades.slice(0, 40) })

  function finishRound(winner, ko) {
    if (state.round.winner) return
    state.round.winner = winner
    if (winner === 'ansem' || winner === 'pumpfun') state.wins[winner] += 1
    state.koSide = ko ? (winner === 'ansem' ? 'pumpfun' : 'ansem') : null
    state.nextIn = INTERMISSION
    save && save(snapshot())
  }

  function startNextRound() {
    state.hp = { ansem: MAX_HP, pumpfun: MAX_HP }
    state.scores = { ansem: 0, pumpfun: 0 }
    state.koSide = null
    state.nextIn = null
    state.round = { n: state.round.n + 1, winner: null }
    save && save(snapshot())
  }

  function handleTrade(trade) {
    recentTrades.unshift(trade)
    if (recentTrades.length > 40) recentTrades.length = 40
    if (trade.kind !== 'buy' || state.round.winner) { onTrade && onTrade(trade); onChange && onChange(); return }

    state.scores[trade.side] = +(state.scores[trade.side] + trade.solAmount).toFixed(2)
    const opp = trade.side === 'ansem' ? 'pumpfun' : 'ansem'
    state.hp[opp] = Math.max(0, +(state.hp[opp] - trade.solAmount).toFixed(2))

    onTrade && onTrade(trade) // clients use this for punch/float/popup/sfx
    if (state.hp[opp] <= 0) finishRound(trade.side, true)
    onChange && onChange()
  }

  function setStatus(s) { if (state.status !== s) { state.status = s; onChange && onChange() } }

  function load(snap) {
    if (!snap) return
    try {
      if (snap.hp) state.hp = snap.hp
      if (snap.scores) state.scores = snap.scores
      if (snap.round) state.round = snap.round
      if (snap.wins) state.wins = snap.wins
      state.koSide = snap.koSide ?? null
      state.nextIn = snap.nextIn ?? null
      if (Array.isArray(snap.trades)) recentTrades = snap.trades.slice(0, 40)
    } catch { /* ignore malformed snapshot */ }
  }

  // Intermission countdown (1s).
  setInterval(() => {
    if (state.round.winner && state.nextIn != null) {
      state.nextIn -= 1
      if (state.nextIn <= 0) startNextRound()
      onChange && onChange()
    }
  }, 1000)

  return { handleTrade, setStatus, load, snapshot, publicState }
}
