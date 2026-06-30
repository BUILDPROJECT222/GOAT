import { useRef, useEffect, useState } from 'react'
import { useGameClient } from './engine/useGameClient'
import { setSoundEnabled, unlockSound } from './engine/sound'
import TopBar from './components/TopBar'
import Toolbar from './components/Toolbar'
import Fighter from './components/Fighter'
import TokenCard from './components/TokenCard'
import BuyPopups from './components/BuyPopups'
import SideTrades from './components/SideTrades'
import InfoModal from './components/InfoModal'
import { arenaFor } from './assets/arenas'

const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export default function App() {
  const [sound, setSound] = useState(true)
  const [info, setInfo] = useState(false)

  const g = useGameClient()

  // Unlock audio on the first user interaction (browser autoplay policy).
  useEffect(() => {
    const unlock = () => { unlockSound(); window.removeEventListener('pointerdown', unlock) }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const toggleSound = () => setSound((s) => { const v = !s; setSoundEnabled(v); return v })

  // Screen shake via Web Animations API (no remount).
  const arenaRef = useRef(null)
  useEffect(() => {
    if (g.shake > 0 && arenaRef.current) {
      arenaRef.current.animate(
        [
          { transform: 'translate(0,0)' },
          { transform: `translate(${g.shake}px, ${-g.shake * 0.5}px)` },
          { transform: `translate(${-g.shake}px, ${g.shake * 0.4}px)` },
          { transform: 'translate(0,0)' },
        ],
        { duration: 420, easing: 'ease-in-out' },
      )
    }
  }, [g.shakeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const winner = g.matchWinner ? g[g.matchWinner] : null
  const isFinal = g.stage === 'final'
  const dethrone = isFinal && winner && g.goat && winner.id !== g.goat.id
  const arenaBg = g.left && g.right ? `url(${arenaFor(g.left.id, g.right.id)})` : undefined

  return (
    <div className="app">
      <TopBar left={g.left} right={g.right} scores={g.scores} stage={g.stage} cycle={g.cycle} goat={g.goat} queue={g.queue} />

      <div className="arena" ref={arenaRef} style={{ backgroundImage: arenaBg }}>
        <Toolbar status={g.status} sound={sound} onToggleSound={toggleSound} onInfo={() => setInfo(true)} />

        {/* Field: the two fighters in the current match */}
        <div className="ground">
          {g.left && (
            <Fighter slot="left" fighter={g.left} score={g.scores.left} hp={g.hp.left} maxHp={g.maxHp}
              damages={g.damages} ko={g.matchWinner === 'right'} punchSeq={g.punch.left} />
          )}
          {g.right && (
            <Fighter slot="right" fighter={g.right} score={g.scores.right} hp={g.hp.right} maxHp={g.maxHp}
              damages={g.damages} ko={g.matchWinner === 'left'} punchSeq={g.punch.right} />
          )}
        </div>

        {/* Token cards per slot */}
        {g.left && <TokenCard slot="left" mint={g.left.mint} color={g.left.color} />}
        {g.right && <TokenCard slot="right" mint={g.right.mint} color={g.right.color} />}

        <BuyPopups popups={g.popups} />

        {g.left && <SideTrades slot="left" color={g.left.color} trades={g.trades} />}
        {g.right && <SideTrades slot="right" color={g.right.color} trades={g.trades} />}

        {winner && (
          <div className="round-banner" style={{ '--fc': winner.color }}>
            <div className="ko-flash">K.O!</div>
            <div className="rb-title">{winner.name} WINS</div>
            <div className="rb-sub">
              {isFinal
                ? (dethrone ? `👑 ${winner.name} is the NEW GOAT!` : `🐐 ${winner.name} DEFENDS the GOAT`)
                : 'advances to the 🏆 FINAL'}
            </div>
            {g.nextIn != null && (
              <div className="rb-sub">Next in {fmtClock(g.nextIn)}</div>
            )}
          </div>
        )}
      </div>

      {info && <InfoModal fighters={[g.left, g.right, g.goat]} onClose={() => setInfo(false)} />}
    </div>
  )
}
