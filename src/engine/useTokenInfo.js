import { useState, useEffect } from 'react'
import { fetchTokenInfo } from './tokenInfo'

// Ambil info token sekali + refresh berkala (default 30 dtk) agar MC/harga live.
export function useTokenInfo(mint, intervalMs = 30000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const d = await fetchTokenInfo(mint)
        if (alive) { setData(d); setError(null) }
      } catch (e) {
        if (alive) setError(String(e))
      }
    }
    load()
    const id = setInterval(load, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [mint, intervalMs])

  return { data, error }
}
