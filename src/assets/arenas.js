// Per-match arena backgrounds. The server normalizes sides (lower roster order
// on the left: tjr < luke < ansem), so each matchup always renders in the
// orientation its art was drawn for. Key = `${leftId}-${rightId}`.
// `?url` forces Vite to accept the uppercase .PNG extension.
import arenaTjrAnsem from './Arena2.PNG?url'           // TJR (left) vs ANSEM (right)
import arenaTjrLuke from './ArenaTJRvsLuke.jpg?url'     // TJR (left) vs LUKE (right)
import arenaLukeAnsem from './ansemvsluke-arena.PNG?url' // LUKE (left) vs ANSEM (right)

const ARENAS = {
  'tjr-luke': arenaTjrLuke,
  'luke-ansem': arenaLukeAnsem,
  'tjr-ansem': arenaTjrAnsem,
}

export const arenaFor = (leftId, rightId) =>
  ARENAS[`${leftId}-${rightId}`] || arenaTjrAnsem
