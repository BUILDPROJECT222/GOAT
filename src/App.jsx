import { useRef, useEffect, useState } from 'react'
import { useGameClient } from './engine/useGameClient'
import { CONFIG, TEAM_NAMES } from './config'
import { setSoundEnabled, unlockSound } from './engine/sound'
import TopBar from './components/TopBar'
import Toolbar from './components/Toolbar'
import Fighter from './components/Fighter'
import TokenCard from './components/TokenCard'
import BuyPopups from './components/BuyPopups'
import SideTrades from './components/SideTrades'
import InfoModal from './components/InfoModal'

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

  return (
    <div className="app">
      <TopBar wins={g.wins} round={g.round} scores={g.scores} />

      <div className="arena" ref={arenaRef}>
        <Toolbar status={g.status} sound={sound} onToggleSound={toggleSound} onInfo={() => setInfo(true)} />

        {/* Field: fighters fixed in place, ball between them */}
        <div className="ground">
          <Fighter side="ansem" score={g.scores.ansem} hp={g.hp.ansem} maxHp={g.maxHp}
            damages={g.damages} ko={g.koSide === 'ansem'} punchSeq={g.punch.ansem} />
          <div className="ball">⚽</div>
          <Fighter side="pumpfun" score={g.scores.pumpfun} hp={g.hp.pumpfun} maxHp={g.maxHp}
            damages={g.damages} ko={g.koSide === 'pumpfun'} punchSeq={g.punch.pumpfun} />
        </div>

        {/* Token info cards per CA in the corners */}
        <TokenCard side="ansem" mint={CONFIG.ansemMint} />
        <TokenCard side="pumpfun" mint={CONFIG.pumpfunMint} />

        <BuyPopups popups={g.popups} />

        {/* Per-side live trades in the bottom corners */}
        <SideTrades side="ansem" trades={g.trades} />
        <SideTrades side="pumpfun" trades={g.trades} />

        {g.round.winner && (
          <div className={`round-banner ${g.round.winner}`}>
            {g.koSide && <div className="ko-flash">K.O!</div>}
            <div className="rb-title">
              {g.round.winner === 'draw' ? 'DRAW' : `${TEAM_NAMES[g.round.winner]} WINS`}
            </div>
            {g.nextIn != null && (
              <div className="rb-sub">Round {g.round.n + 1} in {fmtClock(g.nextIn)}</div>
            )}
          </div>
        )}
      </div>

      {info && <InfoModal onClose={() => setInfo(false)} />}
    </div>
  )
}
