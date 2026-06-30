import { useState } from 'react'
import { APP } from '../config'

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

// "Info" modal: what the app is + how the gauntlet works + rewards + socials/CA.
export default function InfoModal({ fighters = [], onClose }) {
  const token = APP.tokenSymbol ? `$${APP.tokenSymbol}` : 'our token'
  // Unique fighters currently in play (left, right, GOAT).
  const seen = new Set()
  const list = fighters.filter((f) => f && f.mint && !seen.has(f.id) && seen.add(f.id))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">{APP.name}</h2>
        <p className="modal-lead">
          A live on-chain buy battle. Tokens fight in real time — every BUY damages the enemy fighter.
        </p>
        <ul className="modal-list">
          <li><b>1 SOL = 1 damage</b> dealt to the opposing fighter.</li>
          <li>Drop the enemy to <b>0 HP</b> for a <b>K.O.</b></li>
          <li><b>Round 1:</b> two challengers fight; the winner faces the <b>🐐 GOAT</b> in the <b>Final</b>.</li>
          <li>Win the Final to <b>become the GOAT</b>. Both losers drop to the back of the queue.</li>
          <li><b>No timer</b> — each match runs until a K.O., then a short break.</li>
        </ul>

        <div className="modal-reward">
          <div className="mr-title">🏆 Winner Rewards</div>
          <p className="mr-text">
            A treasury wallet — funded by the creator fees of {token} — rewards holders after <b>every K.O.</b>
            The treasury <b>buys the winning token</b>, then airdrops it to the <b>top 100 holders</b> of {token}.
          </p>
          <p className="mr-cta">Hold {token} to earn from every battle.</p>
        </div>

        <div className="modal-links">
          {APP.x && (
            <a className="modal-link" href={APP.x} target="_blank" rel="noreferrer">𝕏 Follow on X</a>
          )}
          {APP.tokenCa && <CopyRow label="Token CA" value={APP.tokenCa} />}
          {list.map((f) => <CopyRow key={f.id} label={`${f.name} CA`} value={f.mint} />)}
        </div>
      </div>
    </div>
  )
}
