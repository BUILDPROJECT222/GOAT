import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const ROOT = 'D:/PROJECT/ANSEMvsPUMPFUN'
const OUT = path.join(ROOT, 'src/assets')
fs.mkdirSync(OUT, { recursive: true })

const TARGET_H = 560      // tinggi cell hasil (px)
const TOL = 16            // toleransi warna background (euclidean) — rendah agar rambut/outline gelap aman
const ALPHA_MIN = 24      // ambang dianggap "ada konten"

async function process(file, name, outName) {
  const img = sharp(path.join(ROOT, file)).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const idx = (x, y) => (y * W + x) * C

  // --- warna background dari rata-rata sudut ---
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]
  let br = 0, bg = 0, bb = 0
  for (const [x, y] of corners) { const i = idx(x, y); br += data[i]; bg += data[i + 1]; bb += data[i + 2] }
  br /= 4; bg /= 4; bb /= 4
  const isBg = (i) => {
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb
    return dr * dr + dg * dg + db * db <= TOL * TOL
  }

  // --- flood fill dari semua tepi: hanya hapus background yang menyambung ke pinggir ---
  const bgMask = new Uint8Array(W * H)
  const stack = []
  const pushIf = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = y * W + x
    if (bgMask[p]) return
    if (isBg(idx(x, y))) { bgMask[p] = 1; stack.push(p) }
  }
  for (let x = 0; x < W; x++) { pushIf(x, 0); pushIf(x, H - 1) }
  for (let y = 0; y < H; y++) { pushIf(0, y); pushIf(W - 1, y) }
  while (stack.length) {
    const p = stack.pop(); const x = p % W, y = (p - x) / W
    pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1)
  }
  // set alpha 0 utk background
  for (let p = 0; p < W * H; p++) if (bgMask[p]) data[p * C + 3] = 0

  // --- jumlah piksel konten per kolom (toleran thd speckle sisa) ---
  const colCount = new Int32Array(W)
  for (let x = 0; x < W; x++) {
    let c = 0
    for (let y = 0; y < H; y++) if (data[idx(x, y) + 3] > ALPHA_MIN) c++
    colCount[x] = c
  }
  const EMPTY = H * 0.012   // kolom dianggap "kosong" jika konten < 1.2% tinggi
  const colHas = (x) => colCount[x] >= EMPTY
  let first = 0, last = W - 1
  while (first < W && !colHas(first)) first++
  while (last > 0 && !colHas(last)) last--

  // --- potong di titik "equal-ink": cumulative konten = 25/50/75% total ---
  // (jatuh di lembah antar figur), lalu snap ke kolom kepadatan minimum sekitarnya.
  let total = 0
  for (let x = first; x <= last; x++) total += colCount[x]
  const frameW = (last - first + 1) / 4
  const win = Math.round(frameW * 0.18)
  const seps = []
  let acc = 0, k = 1
  for (let x = first; x <= last && k <= 3; x++) {
    acc += colCount[x]
    if (acc >= (k / 4) * total) {
      // snap ke kolom dgn konten paling sedikit dalam jendela +/- win
      let bx = x, bv = Infinity
      for (let j = Math.max(first, x - win); j <= Math.min(last, x + win); j++) {
        if (colCount[j] < bv) { bv = colCount[j]; bx = j }
      }
      seps.push(bx); k++
    }
  }
  console.log(`  rentang=[${first},${last}] frameW≈${frameW | 0} seps=${seps.join(',')}`)
  const bounds = [first, ...seps, last + 1]

  // --- bbox tiap frame ---
  const frames = []
  for (let f = 0; f < 4; f++) {
    const x0 = bounds[f], x1 = bounds[f + 1]
    let minX = x1, maxX = x0, minY = H, maxY = 0
    for (let x = x0; x < x1; x++) {
      for (let y = 0; y < H; y++) {
        if (data[idx(x, y) + 3] > ALPHA_MIN) {
          if (x < minX) minX = x; if (x > maxX) maxX = x
          if (y < minY) minY = y; if (y > maxY) maxY = y
        }
      }
    }
    frames.push({ left: minX, top: minY, w: maxX - minX + 1, h: maxY - minY + 1 })
  }

  const processed = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer()

  // --- skala seragam berdasar frame tertinggi, lalu komposisi cell bottom-aligned ---
  const maxH = Math.max(...frames.map((f) => f.h))
  const scale = TARGET_H / maxH
  const scaled = []
  for (const f of frames) {
    const buf = await sharp(processed)
      .extract({ left: f.left, top: f.top, width: f.w, height: f.h })
      .resize({ width: Math.max(1, Math.round(f.w * scale)), height: Math.max(1, Math.round(f.h * scale)) })
      .png().toBuffer()
    const m = await sharp(buf).metadata()
    scaled.push({ buf, w: m.width, h: m.height })
  }
  const cellW = Math.max(...scaled.map((s) => s.w)) + 8
  const cellH = TARGET_H + 8
  const composites = scaled.map((s, i) => ({
    input: s.buf,
    left: i * cellW + Math.round((cellW - s.w) / 2),
    top: cellH - s.h,                       // feet di dasar cell
  }))
  await sharp({ create: { width: cellW * 4, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png().toFile(path.join(OUT, outName))

  console.log(`${name}: ${file} ${W}x${H} bg=rgb(${br | 0},${bg | 0},${bb | 0}) -> ${outName} cell=${cellW}x${cellH}`)
  return { name, src: `./assets/${outName}`, w: cellW, h: cellH, frames: 4 }
}

const a = await process('src/ansem.png', 'ansem', 'ansem-sheet.png')
const p = await process('src/Pumpfu.png', 'pumpfun', 'pumpfun-sheet.png')

const js = `// Auto-generated oleh scripts/process-sprites.mjs — sprite sheet 4-frame, transparan.
import ansemSheet from './ansem-sheet.png'
import pumpfunSheet from './pumpfun-sheet.png'

export const SPRITES = {
  ansem:   { src: ansemSheet,   w: ${a.w}, h: ${a.h}, frames: 4 },
  pumpfun: { src: pumpfunSheet, w: ${p.w}, h: ${p.h}, frames: 4 },
}
`
fs.writeFileSync(path.join(OUT, 'sprites.js'), js)
console.log('wrote src/assets/sprites.js')
