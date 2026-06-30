import { useState, useEffect, useRef, useCallback } from 'react'
import { playHit, playWhale, playKO } from './sound'

// Tiers for popup label/shake (transient client-side reactions to trades).
const TIERS = [
  { min: 25, name: 'whale', label: '🐋 WHALE', shake: 18 },
  { min: 10, name: 'big', label: '🔥 BIG BUY', shake: 9 },
  { min: 0, name: 'normal', label: '💰 BUY', shake: 0 },
]
const tierOf = (sol) => TIERS.find((t) => sol >= t.min)
const POPUP_THRESHOLD = 5
let _seq = 0
const uid = () => `${++_seq}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Connects to the authoritative server over WebSocket and exposes the same
 * shape the UI expects. Persistent state (HP, scores, round, wins, KO,
 * intermission, status) comes from the server; transient reactions (punch,
 * damage numbers, popups, shake, sfx) are derived locally from trade events.
 */
export function useGameClient() {
  const [hp, setHp] = useState({ ansem: 1000, pumpfun: 1000 })
  const [scores, setScores] = useState({ ansem: 0, pumpfun: 0 })
  const [round, setRound] = useState({ n: 1, winner: null })
  const [wins, setWins] = useState({ ansem: 0, pumpfun: 0 })
  const [koSide, setKoSide] = useState(null)
  const [nextIn, setNextIn] = useState(null)
  const [status, setStatus] = useState('connecting')
  const [maxHp, setMaxHp] = useState(1000)
  const [trades, setTrades] = useState([])
  const [popups, setPopups] = useState([])
  const [damages, setDamages] = useState([])
  const [punch, setPunch] = useState({ ansem: 0, pumpfun: 0 })
  const [shake, setShake] = useState(0)
  const [shakeId, setShakeId] = useState(0)
  const timers = useRef([])
  const prevKo = useRef(null)

  const applyState = useCallback((s) => {
    if (s.hp) setHp(s.hp)
    if (s.scores) setScores(s.scores)
    if (s.round) setRound(s.round)
    if (s.wins) setWins(s.wins)
    setKoSide(s.koSide ?? null)
    setNextIn(s.nextIn ?? null)
    if (s.status) setStatus(s.status)
    if (s.maxHp) setMaxHp(s.maxHp)
  }, [])

  const onTrade = useCallback((trade) => {
    setTrades((prev) => [trade, ...prev].slice(0, 40))
    if (trade.kind !== 'buy') return

    // Attacker punches.
    setPunch((p) => ({ ...p, [trade.side]: p[trade.side] + 1 }))

    // Floating damage number on the opponent.
    const opp = trade.side === 'ansem' ? 'pumpfun' : 'ansem'
    const did = uid()
    const dx = Math.round(Math.random() * 44 - 22)
    setDamages((prev) => [...prev.slice(-12), { id: did, side: opp, amount: trade.solAmount, dx }])
    const t1 = setTimeout(() => setDamages((prev) => prev.filter((d) => d.id !== did)), 1000)
    timers.current.push(t1)

    // SFX.
    if (trade.solAmount >= 25) playWhale()
    else playHit()

    // Popup + shake for big buys.
    if (trade.solAmount >= POPUP_THRESHOLD) {
      const tier = tierOf(trade.solAmount)
      const pid = uid()
      setPopups((prev) => [...prev.slice(-5), { ...trade, tier: tier.name, label: tier.label, pid }])
      const t2 = setTimeout(() => setPopups((prev) => prev.filter((p) => p.pid !== pid)), 2600)
      timers.current.push(t2)
      if (tier.shake) {
        setShake(tier.shake); setShakeId((x) => x + 1)
        const t3 = setTimeout(() => setShake(0), 450)
        timers.current.push(t3)
      }
    }
  }, [])

  // KO sound when a new KO occurs.
  useEffect(() => { if (koSide && koSide !== prevKo.current) playKO(); prevKo.current = koSide }, [koSide])

  // WebSocket connection (auto-reconnect).
  useEffect(() => {
    let ws, closed = false, retry
    const url = import.meta.env.VITE_WS_URL ||
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
    const connect = () => {
      ws = new WebSocket(url)
      ws.onmessage = (e) => {
        let m
        try { m = JSON.parse(e.data) } catch { return }
        if (m.type === 'init') { applyState(m.state); if (Array.isArray(m.state.trades)) setTrades(m.state.trades) }
        else if (m.type === 'state') applyState(m.state)
        else if (m.type === 'trade') onTrade(m.trade)
      }
      ws.onclose = () => { if (!closed) { setStatus('connecting'); retry = setTimeout(connect, 1500) } }
      ws.onerror = () => { try { ws.close() } catch { /* noop */ } }
    }
    connect()
    return () => { closed = true; clearTimeout(retry); if (ws) ws.close() }
  }, [applyState, onTrade])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return { trades, popups, damages, scores, hp, maxHp, round, wins, koSide, nextIn, punch, shake, shakeId, status }
}
