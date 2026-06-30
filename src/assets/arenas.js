// Per-match arena backgrounds. Key = `${leftId}-${rightId}` (orientation matters,
// because the banners are baked to a side). Add a matchup = drop an image here +
// map it. Unmapped matchups fall back to the default arena.
// `?url` forces Vite to treat these as asset URLs (the uppercase .PNG extension
// isn't in Vite's default assetsInclude, so a bare import would fail to parse).
import arenaDefault from './Arena2.PNG?url'         // TJR (left) vs ANSEM (right)
import arenaTjrLuke from './ArenaTJRvsLuke.jpg?url'  // TJR (left) vs LUKE (right)

const ARENAS = {
  'tjr-luke': arenaTjrLuke,
  'tjr-ansem': arenaDefault,
}

export const arenaFor = (leftId, rightId) =>
  ARENAS[`${leftId}-${rightId}`] || arenaDefault
