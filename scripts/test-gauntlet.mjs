// Drives the engine through KOs and asserts the GOAT Gauntlet progression.
// Run: node scripts/test-gauntlet.mjs
import { createEngine } from '../server/engine.js'
import { ROSTER } from '../server/roster.js'

const eng = createEngine({ intermission: 0, onKO: (k) => kos.push(k) })
const kos = []
const mint = (id) => ROSTER[id].mint

let failed = 0
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? '✓' : '✗'} ${label}: ${JSON.stringify(got)}${ok ? '' : `  (want ${JSON.stringify(want)})`}`)
  if (!ok) failed++
}
const snap = () => {
  const s = eng.publicState()
  return { stage: s.stage, cycle: s.cycle, left: s.left?.id, right: s.right?.id, goat: s.goat?.id, queue: s.queue.map((f) => f.id) }
}
// KO a fighter by sending one buy big enough to zero the opponent, then advance
// past the (zero-length) intermission.
const ko = (winnerId) => {
  eng.handleTrade({ id: Math.random().toString(36).slice(2), mint: mint(winnerId), solAmount: 1000, kind: 'buy', wallet: 'w', ts: Date.now() })
  eng.advance()
}

console.log('— initial —')
eq('start', snap(), { stage: 'round1', cycle: 1, left: 'tjr', right: 'luke', goat: 'ansem', queue: [] })

console.log('\n— cycle 1: TJR wins R1, ANSEM defends final —')
ko('tjr')
eq('after R1 (tjr wins)', snap(), { stage: 'final', cycle: 1, left: 'tjr', right: 'ansem', goat: 'ansem', queue: ['luke'] })
ko('ansem')
eq('after Final (ansem defends)', snap(), { stage: 'round1', cycle: 2, left: 'luke', right: 'tjr', goat: 'ansem', queue: [] })

console.log('\n— cycle 2: LUKE wins R1, then LUKE beats ANSEM → new GOAT —')
ko('luke')
eq('after R1 (luke wins)', snap(), { stage: 'final', cycle: 2, left: 'luke', right: 'ansem', goat: 'ansem', queue: ['tjr'] })
ko('luke')
eq('after Final (luke dethrones ansem)', snap(), { stage: 'round1', cycle: 3, left: 'tjr', right: 'ansem', goat: 'luke', queue: [] })

console.log('\n— airdrop trigger fires on every KO —')
eq('KO count', kos.length, 4)
eq('KO winners (mint→name)', kos.map((k) => k.winnerName), ['TJR', 'ANSEM', 'LUKE', 'LUKE'])
eq('KO stages', kos.map((k) => k.stage), ['round1', 'final', 'round1', 'final'])

console.log(`\n${failed === 0 ? '✅ ALL PASSED' : `❌ ${failed} FAILED`}`)
process.exit(failed === 0 ? 0 : 1)
