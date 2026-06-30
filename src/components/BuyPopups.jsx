import { SolIcon } from './icons'

const short = (w) => (w && w.length > 8 ? `${w.slice(0, 4)}..${w.slice(-4)}` : w)

// Buy popups floating on each slot's side.
export default function BuyPopups({ popups }) {
  return (
    <>
      {['left', 'right'].map((slot) => (
        <div key={slot} className={`popup-col ${slot}`}>
          {popups.filter((p) => p.slot === slot).map((p) => (
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
