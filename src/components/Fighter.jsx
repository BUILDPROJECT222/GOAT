import { useRef, useEffect, useState } from 'react'
import { SPRITES } from '../assets/sprites'
import { SolIcon } from './icons'

const DISPLAY_H = 300 // displayed character height (px)
const fmtDmg = (a) => (a >= 10 ? Math.round(a) : a.toFixed(1))

// Sprite fighter for one slot (left/right). Identity (which sprite, name, color)
// comes from `fighter`; position comes from `slot`. Sheets are baked facing
// right, so the right slot is mirrored via CSS to face center.
export default function Fighter({ fighter, slot, score, hp, maxHp, damages = [], ko = false, punchSeq = 0 }) {
  const sp = SPRITES[fighter?.id] || SPRITES.ansem
  const scale = DISPLAY_H / sp.idle.h
  const dw = Math.round(sp.idle.w * scale)
  const dh = Math.round(sp.idle.h * scale)
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const low = pct <= 25

  const [punching, setPunching] = useState(false)
  const spriteRef = useRef(null)
  const prevHp = useRef(hp)
  const punchTimer = useRef(null)
  const baseShadow = 'drop-shadow(0 10px 12px rgba(0,0,0,.55))'

  // Play the punch animation when this slot attacks.
  useEffect(() => {
    if (punchSeq > 0 && !ko) {
      setPunching(true)
      clearTimeout(punchTimer.current)
      punchTimer.current = setTimeout(() => setPunching(false), 380)
    }
  }, [punchSeq]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(punchTimer.current), [])

  // Red flash + shake when HP drops.
  useEffect(() => {
    if (hp < prevHp.current && !ko && spriteRef.current) {
      spriteRef.current.animate(
        [
          { filter: `${baseShadow} brightness(1)` },
          { filter: 'drop-shadow(0 0 14px #ff3b3b) brightness(2.4) saturate(1.6)', offset: 0.3 },
          { filter: `${baseShadow} brightness(1)` },
        ],
        { duration: 320, easing: 'ease-out' },
      )
    }
    prevHp.current = hp
  }, [hp])

  const active = punching ? sp.punch : sp.idle
  const myDmg = damages.filter((d) => d.slot === slot)

  return (
    <div className={`fighter ${slot}`} style={{ width: dw, height: dh, '--fc': fighter?.color || '#888' }}>
      <div className="fighter-hud">
        <div className="hp-top">
          <span className="hp-name">{fighter?.name}</span>
          <span className="hp-sol">{score.toFixed(1)} <SolIcon size={11} /></span>
        </div>
        <div className="hp-bar">
          <div className={`hp-fill${low ? ' low' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="hp-num">{Math.ceil(hp)}<span className="hp-max">/{maxHp}</span></div>
      </div>

      {myDmg.map((d) => (
        <span key={d.id} className="dmg-float" style={{ left: `calc(50% + ${d.dx}px)` }}>
          -{fmtDmg(d.amount)}
        </span>
      ))}

      <div className="fighter-facing" style={{ transform: slot === 'right' ? 'scaleX(-1)' : 'none' }}>
        <div
          ref={spriteRef}
          className={`fighter-sprite${ko ? ' ko' : ''}`}
          style={{
            backgroundImage: `url(${active.src})`,
            backgroundSize: `${dw * 2}px ${dh}px`,
            animationDuration: punching ? '0.34s' : '0.7s',
            '--dw': `${dw}px`,
          }}
        />
      </div>
    </div>
  )
}
