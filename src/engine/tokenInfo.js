// Info token dari DexScreener (gratis, tanpa API key, CORS OK).
// Mengembalikan detail untuk kartu: gambar, nama, symbol, market cap, harga, dll.

export async function fetchTokenInfo(mint) {
  const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint)
  if (!r.ok) throw new Error('http ' + r.status)
  const d = await r.json()
  const pairs = d.pairs || []
  if (!pairs.length) return null
  // Pakai pair dengan likuiditas tertinggi sebagai sumber harga/MC.
  const p = pairs.slice().sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
  return {
    mint,
    name: p.baseToken?.name || '—',
    symbol: p.baseToken?.symbol || '',
    image: p.info?.imageUrl || null,
    priceUsd: p.priceUsd != null ? Number(p.priceUsd) : null,
    marketCap: p.marketCap ?? p.fdv ?? null,
    fdv: p.fdv ?? null,
    liquidity: p.liquidity?.usd ?? null,
    volume24: p.volume?.h24 ?? null,
    change24: p.priceChange?.h24 ?? null,
    dex: p.dexId || '',
    url: p.url || null,
  }
}

export const fmtUsd = (n) => {
  if (n == null || isNaN(n)) return '—'
  const a = Math.abs(n)
  if (a >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

export const fmtPrice = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1) return '$' + n.toFixed(3)
  if (n >= 0.001) return '$' + n.toFixed(5)
  return '$' + n.toExponential(2)
}
