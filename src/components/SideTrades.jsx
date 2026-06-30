import { memo } from 'react'
import { SolIcon } from './icons'

const short = (w) => (w && w.length > 8 ? `${w.slice(0, 4)}..${w.slice(-4)}` : w)

// Panel live trades untuk satu sisi (CA-nya sendiri), di sudut bawah arena.
export default memo(function SideTrades({ side, trades }) {
  // Buy-only (feed memang hanya emit buy) & minimal 1 SOL.
  const list = trades.filter((t) => t.side === side && t.solAmount >= 1).slice(0, 8)
  return (
    <div className={`side-trades ${side}`}>
      <div className="st-title">LIVE TRADES</div>
      {list.length === 0 && <div className="st-empty">waiting for buys…</div>}
      {list.map((t) => (
        <div key={t.id} className="st-row">
          <span className="st-amt">+{t.solAmount} <SolIcon size={11} /></span>
          <span className="st-wallet">{short(t.wallet)}</span>
        </div>
      ))}
    </div>
  )
})
