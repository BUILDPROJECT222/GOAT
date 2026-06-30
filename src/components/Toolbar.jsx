import { useState } from 'react'
import { APP } from '../config'
import { XIcon } from './icons'

const STATUS_LABEL = { demo: 'DEMO', connecting: 'CONNECTING', live: 'LIVE', error: 'OFFLINE' }
const short = (m) => (m && m.length > 10 ? `${m.slice(0, 4)}…${m.slice(-4)}` : m)

// Floating toolbar at the top of the arena: status + sound + info + socials.
export default function Toolbar({ status, sound, onToggleSound, onInfo }) {
  const [copied, setCopied] = useState(false)
  const copyCa = () => {
    if (!APP.tokenCa) { onInfo(); return }
    navigator.clipboard?.writeText(APP.tokenCa)
    setCopied(true); setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="toolbar">
      <span className={`live-pill status-${status}`}>
        <i className="live-dot" />{STATUS_LABEL[status] || 'DEMO'}
      </span>

      <div className="tb-actions">
        <button className="tb-btn tb-icon" onClick={onToggleSound} title={sound ? 'Mute' : 'Unmute'}>
          {sound ? '🔊' : '🔇'}
        </button>
        <button className="tb-btn" onClick={onInfo}><span className="tb-glyph">ⓘ</span>Info</button>
        {APP.x
          ? <a className="tb-btn tb-x" href={APP.x} target="_blank" rel="noreferrer" title="Follow on X"><XIcon size={14} /></a>
          : <button className="tb-btn tb-x" onClick={onInfo} title="X — set in .env"><XIcon size={14} /></button>}
        <button className="tb-btn tb-ca" onClick={copyCa} title="Copy contract address">
          {APP.tokenCa ? (copied ? '✓ Copied' : `CA ${short(APP.tokenCa)}`) : 'CA: TBA'}
        </button>
      </div>
    </div>
  )
}
