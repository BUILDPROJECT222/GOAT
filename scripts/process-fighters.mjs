import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const ROOT = 'D:/PROJECT/ANSEMvsPUMPFUN'
const OUT = path.join(ROOT, 'src/assets')
const TARGET_IDLE_H = 285 // on-canvas height of the IDLE pose (both chars matched to this)
const ALPHA_MIN = 24

const SIDES = {
  // GOAT Gauntlet: a fighter can appear on EITHER slot, so every sheet is baked
  // facing the SAME way (right). The Fighter component mirrors the right-slot
  // fighter via CSS so both always face center. `flip` only corrects a source
  // image that happens to face left.
  ansem: { idle: 'src/assets/Ansem-idle.PNG', punch: 'src/assets/ansem-punch.PNG', flip: false },
  tjr:   { idle: 'src/assets/Tjr-idle.PNG',   punch: 'src/assets/tjr-punnch.PNG',  flip: false },
  luke:  { idle: 'src/assets/Luke-idle.PNG',  punch: 'src/assets/luke-punch.PNG',  flip: false },
}

async function loadFrames(file) {
  const { data, info } = await sharp(path.join(ROOT, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const idx = (x, y) => (y * W + x) * C

  if (data[idx(2, 2) + 3] > 20) { // remove non-transparent background (flood-fill from edges)
    const br = data[idx(2, 2)], bg = data[idx(2, 2) + 1], bb = data[idx(2, 2) + 2]
    const TOL = 42
    const isBg = (i) => { const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb; return dr * dr + dg * dg + db * db <= TOL * TOL }
    const mask = new Uint8Array(W * H); const st = []
    const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const p = y * W + x; if (mask[p]) return; if (isBg(idx(x, y))) { mask[p] = 1; st.push(p) } }
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1) }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y) }
    while (st.length) { const p = st.pop(); const x = p % W, y = (p - x) / W; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1) }
    for (let p = 0; p < W * H; p++) if (mask[p]) data[p * C + 3] = 0
  }

  // Separator between the two poses (emptiest column in the middle band).
  const colCount = new Int32Array(W)
  for (let x = 0; x < W; x++) { let c = 0; for (let y = 0; y < H; y++) if (data[idx(x, y) + 3] > ALPHA_MIN) c++; colCount[x] = c }
  let sep = Math.floor(W / 2), best = Infinity
  for (let x = Math.floor(W * 0.34); x <= Math.floor(W * 0.66); x++) if (colCount[x] < best) { best = colCount[x]; sep = x }

  const frames = []
  for (const [x0, x1] of [[0, sep], [sep, W]]) {
    let minX = x1, maxX = x0, minY = H, maxY = 0
    for (let x = x0; x < x1; x++) for (let y = 0; y < H; y++) {
      if (data[idx(x, y) + 3] > ALPHA_MIN) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
    }
    const fw = maxX - minX + 1, fh = maxY - minY + 1
    const botStart = maxY - Math.floor(fh * 0.22)
    let sumX = 0, cnt = 0
    for (let x = minX; x <= maxX; x++) for (let y = botStart; y <= maxY; y++) if (data[idx(x, y) + 3] > ALPHA_MIN) { sumX += x; cnt++ }
    const anchorX = (cnt ? sumX / cnt : (minX + maxX) / 2) - minX
    frames.push({ left: minX, top: minY, w: fw, h: fh, anchorX })
  }
  const processed = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer()
  return { processed, frames }
}

const sideData = {}
for (const side in SIDES) sideData[side] = { idle: await loadFrames(SIDES[side].idle), punch: await loadFrames(SIDES[side].punch) }

// Scale each side so its IDLE pose == TARGET_IDLE_H (matches both characters).
for (const side in SIDES) {
  const idleH = Math.max(...sideData[side].idle.frames.map((f) => f.h))
  sideData[side].scale = TARGET_IDLE_H / idleH
}
// Shared cell height = tallest scaled frame across both sides (kicks are taller).
let cellH = 0
for (const side in SIDES) for (const kind of ['idle', 'punch']) for (const f of sideData[side][kind].frames) cellH = Math.max(cellH, f.h * sideData[side].scale)
cellH = Math.round(cellH) + 10

const meta = {}
for (const side in SIDES) {
  const scale = sideData[side].scale
  const flip = SIDES[side].flip
  let half = 0
  for (const kind of ['idle', 'punch']) for (const f of sideData[side][kind].frames) half = Math.max(half, f.anchorX, f.w - f.anchorX)
  const cellW = Math.round(half * 2 * scale) + 12

  for (const kind of ['idle', 'punch']) {
    const { processed, frames } = sideData[side][kind]
    const comps = []
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]
      const sw = Math.max(1, Math.round(f.w * scale)), sh = Math.max(1, Math.round(f.h * scale))
      let pipe = sharp(processed).extract({ left: f.left, top: f.top, width: f.w, height: f.h }).resize({ width: sw, height: sh })
      if (flip) pipe = pipe.flop()
      const buf = await pipe.png().toBuffer()
      const ax = f.anchorX * scale
      const anchorInScaled = flip ? sw - ax : ax
      comps.push({ input: buf, left: Math.round(i * cellW + cellW / 2 - anchorInScaled), top: cellH - sh - 4 })
    }
    await sharp({ create: { width: cellW * 2, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(path.join(OUT, `${side}-${kind}-sheet.png`))
    if (!meta[side]) meta[side] = {}
    meta[side][kind] = { w: cellW, h: cellH }
    console.log(`${side} ${kind} -> ${side}-${kind}-sheet.png cell=${cellW}x${cellH} (scale ${scale.toFixed(3)})`)
  }
}

const sides = Object.keys(SIDES)
const imports = sides.map((s) => `import ${s}Idle from './${s}-idle-sheet.png'\nimport ${s}Punch from './${s}-punch-sheet.png'`).join('\n')
const entries = sides.map((s) =>
  `  ${s}: { idle: { src: ${s}Idle, w: ${meta[s].idle.w}, h: ${meta[s].idle.h}, frames: 2 }, punch: { src: ${s}Punch, w: ${meta[s].punch.w}, h: ${meta[s].punch.h}, frames: 2 } },`).join('\n')
const js = `// Auto-generated by scripts/process-fighters.mjs — idle + punch sheets (2 frames each, transparent).
${imports}

export const SPRITES = {
${entries}
}
`
fs.writeFileSync(path.join(OUT, 'sprites.js'), js)
console.log('wrote src/assets/sprites.js  (cellH=' + cellH + ')')
