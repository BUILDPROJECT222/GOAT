import { TEAM_NAMES } from '../config'
import { SolIcon } from './icons'

// Esports-style scoreboard: team panels (name + round volume + win badge)
// flanking a glowing live timer.
export default function TopBar({ wins, round, scores }) {
  return (
    <div className="topbar">
      <div className="team-panel pumpfun">
        <div className="tp-meta">
          <span className="tp-name">{TEAM_NAMES.pumpfun}</span>
          <span className="tp-vol">{scores.pumpfun.toFixed(1)} <SolIcon size={11} /></span>
        </div>
        <div className="tp-score">{wins.pumpfun}</div>
      </div>

      <div className="center-panel">
        <div className="cp-live"><i className="cp-dot" /> LIVE MATCH</div>
        <div className="cp-timer">ROUND {round.n}</div>
        <div className="cp-round">FIRST TO K.O.</div>
      </div>

      <div className="team-panel ansem">
        <div className="tp-score">{wins.ansem}</div>
        <div className="tp-meta">
          <span className="tp-name">{TEAM_NAMES.ansem}</span>
          <span className="tp-vol">{scores.ansem.toFixed(1)} <SolIcon size={11} /></span>
        </div>
      </div>
    </div>
  )
}
