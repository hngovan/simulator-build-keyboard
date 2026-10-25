// Dò hốc dán feet (đệm cao su) dưới đáy case CAD → src/data/caseFeet.json
// Hốc = cụm mặt quay xuống (pháp tuyến −y) nằm hơi cao hơn đáy case (trần hốc), gom theo khoảng cách xz.
// Dùng: node scripts/probe-case-feet.mjs [tên-model...]  (mặc định mọi GLB trong public/models/cases)
import fs from 'node:fs'
import { NodeIO } from '@gltf-transform/core'

const DIR = 'public/models/cases'
const OUT = 'src/data/caseFeet.json'
/** trần hốc cao hơn đáy case trong khoảng này (mm) */
const DEPTH = [0.3, 4]
/** bán kính hốc feet thật (mm): feet tròn Ø 7–13mm; nhỏ hơn là chốt / lỗ, lớn hơn là chữ khắc */
const RADIUS = [3.5, 6.5]

const io = new NodeIO()
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith('.glb'))
      .map((f) => f.slice(0, -4))

/** tam giác của mọi node đáy (bottom nếu có, không thì case) trong hệ mm của model */
async function triangles(name) {
  const doc = await io.read(`${DIR}/${name}.glb`)
  const nodes = doc
    .getRoot()
    .listNodes()
    .filter((n) => n.getMesh())
  const pick = nodes.filter((n) => n.getName() === 'bottom')
  const tris = []
  for (const n of pick.length ? pick : nodes.filter((n) => n.getName() === 'case'))
    for (const p of n.getMesh().listPrimitives()) {
      const pos = p.getAttribute('POSITION').getArray()
      const idx = p.getIndices()?.getArray()
      const count = idx ? idx.length : pos.length / 3
      const at = (i) => {
        const k = (idx ? idx[i] : i) * 3
        return [pos[k], pos[k + 1], pos[k + 2]]
      }
      for (let i = 0; i < count; i += 3) tris.push([at(i), at(i + 1), at(i + 2)])
    }
  return tris
}

/** điểm p (xz) nằm trong tam giác t */
function inTri(p, [a, b, c]) {
  const side = (u, v) => (v[0] - u[0]) * (p[1] - u[1]) - (v[1] - u[1]) * (p[0] - u[0])
  const s1 = side(a, b)
  const s2 = side(b, c)
  const s3 = side(c, a)
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)
}

const out = {}
for (const name of names) {
  const tris = await triangles(name)
  const minY = tris.reduce((m, t) => Math.min(m, t[0][1], t[1][1], t[2][1]), Infinity)
  // mặt quay xuống, nằm trong khoảng sâu của hốc
  const pts = []
  /** tam giác trần (xz) để kiểm tra tâm hốc có bị che kín không: hốc feet trần là đĩa kín, lỗ vít là vành khuyên */
  const caps = []
  for (const [a, b, c] of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(...n) || 1
    const y = (a[1] + b[1] + c[1]) / 3 - minY
    if (n[1] / len > -0.95 || y < DEPTH[0] || y > DEPTH[1]) continue
    for (const v of [a, b, c]) pts.push([v[0], v[2], v[1] - minY])
    caps.push([a, b, c].map((v) => [v[0], v[2]]))
  }
  // gom cụm theo xz (đỉnh cách nhau < 3mm cùng cụm), union-find + lưới 3mm để gộp đủ các mảnh của 1 hốc
  const parent = pts.map((_, i) => i)
  const root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i])))
  const grid = new Map()
  const cell = (x, z) => `${Math.floor(x / 3)},${Math.floor(z / 3)}`
  pts.forEach((p, i) => {
    const k = cell(p[0], p[1])
    grid.set(k, [...(grid.get(k) ?? []), i])
  })
  pts.forEach((p, i) => {
    const gx = Math.floor(p[0] / 3)
    const gz = Math.floor(p[1] / 3)
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const j of grid.get(`${gx + dx},${gz + dz}`) ?? [])
          if (Math.hypot(pts[j][0] - p[0], pts[j][1] - p[1]) < 3) parent[root(i)] = root(j)
  })
  const groups = new Map()
  pts.forEach((p, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), p]))
  const clusters = [...groups.values()]
  const feet = []
  for (const c of clusters) {
    const xs = c.map((p) => p[0])
    const zs = c.map((p) => p[1])
    const w = Math.max(...xs) - Math.min(...xs)
    const d = Math.max(...zs) - Math.min(...zs)
    const r = Math.max(w, d) / 2
    // hốc feet: gần tròn / vuông, cỡ hợp lý
    if (r < RADIUS[0] || r > RADIUS[1] || Math.abs(w - d) > Math.max(w, d) * 0.35) continue
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2
    if (!caps.some((t) => inTri([cx, cz], t))) continue
    const round1 = (n) => Math.round(n * 10) / 10
    feet.push([
      round1((Math.max(...xs) + Math.min(...xs)) / 2),
      round1((Math.max(...zs) + Math.min(...zs)) / 2),
      round1(r),
      round1(Math.min(...c.map((p) => p[2]))),
    ])
  }
  // hai hốc chồng nhau (bậc khoét 2 tầng) thì giữ hốc lớn
  const big = feet.filter(
    (f) =>
      !feet.some(
        (g) => g !== f && g[2] > f[2] && Math.hypot(g[0] - f[0], g[1] - f[1]) < g[2] + f[2],
      ),
  )
  // feet luôn đối xứng trái / phải: hốc lẻ (nét chữ khắc...) bỏ
  const paired = big.filter((f) =>
    big.some((g) => Math.abs(g[0] + f[0]) < 2 && Math.abs(g[1] - f[1]) < 6),
  )
  console.log(name, paired.length, JSON.stringify(paired))
  // dưới 4 hốc thì không tin được, để game đặt feet mặc định ở 4 góc
  if (paired.length >= 4) out[name] = paired
}
if (!process.argv.slice(2).length) {
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log('→', OUT)
}
