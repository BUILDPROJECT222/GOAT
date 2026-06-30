import { useTokenInfo } from '../engine/useTokenInfo'
import { fmtUsd, fmtPrice } from '../engine/tokenInfo'

const short = (m) => (m && m.length > 8 ? `${m.slice(0, 4)}..${m.slice(-4)}` : m)

// Kartu detail token di sudut arena (gambar, nama, market cap, harga, dll).
export default function TokenCard({ side, mint }) {
  const { data, error } = useTokenInfo(mint)
  const chg = data?.change24

  return (
    <div className={`token-card ${side}`}>
      <div className="tc-head">
        {data?.image
          ? <img className="tc-img" src={data.image} alt="" />
          : <div className="tc-img tc-img-ph" />}
        <div className="tc-id">
          <div className="tc-name">{data?.name || (error ? 'failed to load' : 'loading…')}</div>
          <div className="tc-sym">${data?.symbol || '—'}</div>
        </div>
        {data?.dex && <span className="tc-dex">{data.dex}</span>}
      </div>

      <div className="tc-mc">
        <span className="tc-mc-label">MARKET CAP</span>
        <span className="tc-mc-val">{fmtUsd(data?.marketCap)}</span>
      </div>

      <div className="tc-grid">
        <div><span>Price</span><b>{fmtPrice(data?.priceUsd)}</b></div>
        <div><span>24h</span><b className={chg >= 0 ? 'up' : 'down'}>
          {chg == null ? '—' : (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%'}
        </b></div>
        <div><span>Vol 24h</span><b>{fmtUsd(data?.volume24)}</b></div>
        <div><span>Liq</span><b>{fmtUsd(data?.liquidity)}</b></div>
      </div>

      <a className="tc-ca" href={data?.url || '#'} target="_blank" rel="noreferrer">
        {short(mint)} ↗
      </a>
    </div>
  )
}
