import { useState, useRef, useEffect, useCallback } from 'react'
import { createSimulatedFeed, createHeliusFeed, uid } from './feeds'
import { CONFIG, isLive } from '../config'
import { playHit, playWhale, playKO } from './sound'

// Tiers for popup/effects by SOL amount.
const TIERS = [
  { min: 25, name: 'whale', label: '🐋 WHALE', shake: 18 },
  { min: 10, name: 'big', label: '🔥 BIG BUY', shake: 9 },
  { min: 0, name: 'normal', label: '💰 BUY', shake: 0 },
]
const tierOf = (sol) => TIERS.find((t) => sol >= t.min)

const MAX_HP = 1000      // starting HP per fighter
const INTERMISSION = 300 // seconds between rounds (5 minutes — time to run the airdrop)

/**
 * Core game (HP model):
 *  - Each fighter has HP (MAX_HP). Every BUY on a token deals DAMAGE to the
 *    OPPONENT equal to its SOL amount (1 SOL = 1 damage).
 *  - A round ends ONLY when a fighter's HP hits 0 -> KO, attacker wins. No timer.
 *  - After a round ends, a 5-minute intermission counts down, then the next
 *    round starts.
 */
export function useGameEngine({ threshold = 5, running = true } = {}) {
  const [trades, setTrades] = useState([])
  const [popups, setPopups] = useState([])
  const [damages, setDamages] = useState([]) // floating damage numbers
  const [scores, setScores] = useState({ ansem: 0, pumpfun: 0 })
  const [hp, setHp] = useState({ ansem: MAX_HP, pumpfun: MAX_HP })
  const [round, setRound] = useState({ n: 1, winner: null })
  const [wins, setWins] = useState({ ansem: 0, pumpfun: 0 })
  const [koSide, setKoSide] = useState(null) // which fighter got KO'd this round
  const [nextIn, setNextIn] = useState(null) // seconds until next round (intermission)
  const [punch, setPunch] = useState({ ansem: 0, pumpfun: 0 }) // attack counters -> punch anim
  const [shake, setShake] = useState(0)
  const [shakeId, setShakeId] = useState(0)
  const [status, setStatus] = useState(isLive() ? 'connecting' : 'demo') // demo|connecting|live|error

  const hpRef = useRef({ ansem: MAX_HP, pumpfun: MAX_HP }) // synchronous source of truth
  const roundRef = useRef({ winner: null })
  const timers = useRef([])

  // --- End the round; start the intermission countdown -------------------
  const finishRound = useCallback((winner, ko = false) => {
    if (roundRef.current.winner) return
    roundRef.current.winner = winner
    setRound((r) => ({ ...r, winner }))
    if (winner === 'ansem' || winner === 'pumpfun') {
      setWins((w) => ({ ...w, [winner]: w[winner] + 1 }))
    }
    const loser = winner === 'ansem' ? 'pumpfun' : winner === 'pumpfun' ? 'ansem' : null
    setKoSide(ko ? loser : null)
    setNextIn(INTERMISSION)
    if (ko) playKO()
  }, [])

  // --- Start the next round (called when intermission hits 0) -------------
  const startNextRound = useCallback(() => {
    hpRef.current = { ansem: MAX_HP, pumpfun: MAX_HP }
    roundRef.current = { winner: null }
    setHp({ ansem: MAX_HP, pumpfun: MAX_HP })
    setScores({ ansem: 0, pumpfun: 0 })
    setKoSide(null)
    setNextIn(null)
    setRound((r) => ({ n: r.n + 1, winner: null }))
  }, [])

  // --- Full restart (match from round 1) ---------------------------------
  const restart = useCallback(() => {
    hpRef.current = { ansem: MAX_HP, pumpfun: MAX_HP }
    roundRef.current = { winner: null }
    setHp({ ansem: MAX_HP, pumpfun: MAX_HP })
    setScores({ ansem: 0, pumpfun: 0 })
    setWins({ ansem: 0, pumpfun: 0 })
    setPopups([]); setDamages([]); setKoSide(null); setNextIn(null)
    setRound({ n: 1, winner: null })
  }, [])

  // --- Handle one trade from the feed ------------------------------------
  const handleTrade = useCallback((trade) => {
    setTrades((prev) => [trade, ...prev].slice(0, 40))
    if (trade.kind !== 'buy' || roundRef.current.winner) return

    // Buy volume (shown as ◎ on each fighter).
    setScores((prev) => ({ ...prev, [trade.side]: +(prev[trade.side] + trade.solAmount).toFixed(2) }))

    // DAMAGE: each buy -> opponent loses HP equal to SOL (1 SOL = 1 dmg).
    const opp = trade.side === 'ansem' ? 'pumpfun' : 'ansem'
    const next = Math.max(0, +(hpRef.current[opp] - trade.solAmount).toFixed(2))
    hpRef.current = { ...hpRef.current, [opp]: next }
    setHp(hpRef.current)

    // Attacker throws a punch.
    setPunch((p) => ({ ...p, [trade.side]: p[trade.side] + 1 }))

    // Floating damage number above the fighter that got hit.
    const did = uid()
    const dx = Math.round(Math.random() * 44 - 22)
    setDamages((prev) => [...prev.slice(-12), { id: did, side: opp, amount: trade.solAmount, dx }])
    const dtm = setTimeout(() => setDamages((prev) => prev.filter((d) => d.id !== did)), 1000)
    timers.current.push(dtm)

    // SFX: whale boom for big buys, otherwise a hit (throttled).
    if (trade.solAmount >= 25) playWhale()
    else playHit()

    if (next <= 0) { finishRound(trade.side, true); return } // KO

    // Popup + screen shake only for buys >= threshold (whale alert).
    if (trade.solAmount >= threshold) {
      const tier = tierOf(trade.solAmount)
      const pid = uid()
      setPopups((prev) => [...prev.slice(-5), { ...trade, tier: tier.name, label: tier.label, pid }])
      const pt = setTimeout(() => setPopups((prev) => prev.filter((p) => p.pid !== pid)), 2600)
      timers.current.push(pt)
      if (tier.shake) {
        setShake(tier.shake)
        setShakeId((x) => x + 1)
        const st = setTimeout(() => setShake(0), 450)
        timers.current.push(st)
      }
    }
  }, [threshold, finishRound])

  // --- Feed subscription (live Helius if API key, otherwise demo) ---------
  useEffect(() => {
    if (!running) return
    if (isLive()) {
      return createHeliusFeed({
        apiKey: CONFIG.heliusApiKey,
        ansemMint: CONFIG.ansemMint,
        pumpfunMint: CONFIG.pumpfunMint,
        onTrade: handleTrade,
        onStatus: setStatus,
      })
    }
    setStatus('demo')
    return createSimulatedFeed(handleTrade)
  }, [running, handleTrade])

  // --- Intermission countdown between rounds -----------------------------
  useEffect(() => {
    if (!round.winner) return
    const id = setInterval(() => {
      setNextIn((n) => {
        const v = (n ?? INTERMISSION) - 1
        if (v <= 0) { startNextRound(); return null }
        return v
      })
    }, 1000)
    return () => clearInterval(id)
  }, [round.winner, startNextRound])

  // --- Clear all timers on unmount ---------------------------------------
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return {
    trades, popups, damages, scores, hp, maxHp: MAX_HP,
    round, wins, koSide, nextIn, punch, shake, shakeId, status, restart,
  }
}
