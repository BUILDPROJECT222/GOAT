import { useState } from 'react'
import { APP, CONFIG, TEAM_NAMES } from '../config'

function CopyRow({ label, value }) {
  const [c, setC] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value)
    setC(true); setTimeout(() => setC(false), 1200)
  }
  return (
    <div className="copy-row">
      <span className="cr-label">{label}</span>
      <code className="cr-value">{value}</code>
      <button className="cr-btn" onClick={copy}>{c ? '✓' : '⧉'}</button>
    </div>
  )
}

// "Info" modal: what the app is + how the battle works + rewards + socials/CA.
export default function InfoModal({ onClose }) {
  const token = APP.tokenSymbol ? `$${APP.tokenSymbol}` : 'our token'
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">{APP.name}</h2>
        <p className="modal-lead">
          A live on-chain buy battle. Two tokens fight in real time — every BUY damages the enemy fighter.
        </p>
        <ul className="modal-list">
          <li><b>1 SOL = 1 damage</b> dealt to the opposing fighter.</li>
          <li>Drop the enemy to <b>0 HP</b> for a <b>K.O.</b></li>
          <li><b>No timer</b> — the battle runs until one side is <b>K.O.'d</b>, then a short break before the next round.</li>
        </ul>

        <div className="modal-reward">
          <div className="mr-title">🏆 Winner Rewards</div>
          <p className="mr-text">
            A treasury wallet — funded by the creator fees of {token} — rewards holders after every round.
            When a round ends, the treasury is used to <b>buy the winning token</b>, then airdrops it to the
            <b> top 100 holders</b> of {token}.
          </p>
          <p className="mr-eg">
            Example: if {TEAM_NAMES.ansem} wins and the treasury holds 2 SOL, 2 SOL of ${TEAM_NAMES.ansem} is
            bought and airdropped to the top 100 holders.
          </p>
          <p className="mr-cta">Hold {token} to earn from every battle.</p>
        </div>

        <div className="modal-links">
          {APP.x && (
            <a className="modal-link" href={APP.x} target="_blank" rel="noreferrer">𝕏 Follow on X</a>
          )}
          {APP.tokenCa && <CopyRow label="Token CA" value={APP.tokenCa} />}
          <CopyRow label={`${TEAM_NAMES.ansem} CA`} value={CONFIG.ansemMint} />
          <CopyRow label={`${TEAM_NAMES.pumpfun} CA`} value={CONFIG.pumpfunMint} />
        </div>
      </div>
    </div>
  )
}
