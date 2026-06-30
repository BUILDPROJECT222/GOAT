import { SolIcon } from './icons'

const STAGE_LABEL = { round1: 'ROUND 1', final: '🏆 FINAL' }

function TeamPanel({ slot, fighter, score }) {
  return (
    <div className={`team-panel ${slot}`} style={{ '--fc': fighter?.color || '#888' }}>
      <div className="tp-meta">
        <span className="tp-name">{fighter?.name || '—'}</span>
        <span className="tp-vol">{(score ?? 0).toFixed(1)} <SolIcon size={11} /></span>
      </div>
    </div>
  )
}

// Esports-style scoreboard: the two fighters flanking the stage + GOAT info.
export default function TopBar({ left, right, scores, stage, cycle, goat, queue }) {
  const upNext = (queue || []).map((f) => f.name).filter(Boolean).slice(0, 4)
  return (
    <div className="topbar">
      <TeamPanel slot="left" fighter={left} score={scores.left} />

      <div className="center-panel">
        <div className="cp-live"><i className="cp-dot" /> LIVE MATCH</div>
        <div className="cp-timer">{STAGE_LABEL[stage] || 'ROUND 1'}</div>
        <div className="cp-goat" style={{ '--fc': goat?.color || '#ffd84d' }}>
          🐐 GOAT: <b>{goat?.name || '—'}</b>
          {upNext.length > 0 && <span className="cp-next"> · up next: {upNext.join(', ')}</span>}
        </div>
      </div>

      <TeamPanel slot="right" fighter={right} score={scores.right} />
    </div>
  )
}
