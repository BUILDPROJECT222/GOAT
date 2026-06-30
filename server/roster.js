// Data-driven fighter roster. Adding a fighter later = add ONE entry here
// (+ its art + put its id in the queue). The engine never hardcodes fighters.
const env = (k, d) => process.env[k] || d

// `order` = fixed display side (lower = left slot). A matchup can occur in either
// orientation across cycles, but the arena art bakes banners to a side, so we
// always render the lower-order fighter on the left. Derived from the art:
// TJR(left) vs LUKE, LUKE(left) vs ANSEM, TJR(left) vs ANSEM  ->  tjr < luke < ansem.
export const ROSTER = {
  tjr:   { id: 'tjr',   name: 'TJR',   mint: env('TJR_MINT',   '4U4U8oXwDyVXGeTffMXds4NAgBgLFwq3wNvTCRTSpump'), color: '#7c3aed', order: 0 },
  luke:  { id: 'luke',  name: 'LUKE',  mint: env('LUKE_MINT',  '86CFcbZBJAqGVnfgnLNcw3tPmfaTigAR2UxbUPYTpump'), color: '#f59e0b', order: 1 },
  ansem: { id: 'ansem', name: 'ANSEM', mint: env('ANSEM_MINT', '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump'), color: '#22c55e', order: 2 },
}

// Initial gauntlet seeding (overridable via env).
//  - INITIAL_GOAT defends at the Final.
//  - INITIAL_QUEUE = challengers, front of the line fights Round 1 first.
export const INITIAL_GOAT = env('GOAT_INITIAL', 'ansem')
export const INITIAL_QUEUE = env('GAUNTLET_QUEUE', 'tjr,luke')
  .split(',').map((s) => s.trim()).filter(Boolean)

export const fighter = (id) => ROSTER[id] || null
export const mintToId = (mint) => {
  for (const f of Object.values(ROSTER)) if (f.mint === mint) return f.id
  return null
}
