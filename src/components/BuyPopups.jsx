import { SolIcon } from './icons'

const short = (w) => (w && w.length > 8 ? `${w.slice(0, 4)}..${w.slice(-4)}` : w)

// Buy popups floating on each team's side.
export default function BuyPopups({ popups }) {
  return (
    <>
      {['ansem', 'pumpfun'].map((side) => (
        <div key={side} className={`popup-col ${side}`}>
          {popups.filter((p) => p.side === side).map((p) => (
            <div key={p.pid} className={`buy-popup ${p.tier}`}>
              <div className="bp-top">{p.label}</div>
              <div className="bp-amt">+{p.solAmount} <SolIcon size={15} /></div>
              <div className="bp-wallet">{short(p.wallet)}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
