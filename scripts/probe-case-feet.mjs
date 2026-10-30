// Dò hốc dán feet (đệm cao su) dưới đáy case CAD → src/data/caseFeet.json
// Hốc = cụm mặt quay xuống (pháp tuyến −y) nằm hơi cao hơn mặt đáy quanh nó (trần hốc), gom theo khoảng cách xz.
// Độ sâu hốc đo so với mặt đáy ngay quanh hốc (đáy nghiêng sẵn góc gõ như Duality Horns: hốc phía trước cao hơn đáy thấp nhất
// vài mm); ghi ra [x, z, r, trần hốc, mặt đáy quanh hốc] (mm so với đáy thấp nhất; bản cũ chỉ 4 số = đáy quanh hốc 0).
// Dùng: node scripts/probe-case-feet.mjs [model...] (vd exodus60/case: chỉ dò model đó, gộp vào JSON có sẵn)
//       (không tham số: dò mọi GLB trong public/models/keyboards, ghi lại cả file)
import fs from 'node:fs'
import { NodeIO } from '@gltf-transform/core'

const DIR = 'public/models/keyboards'
const OUT = 'src/data/caseFeet.json'
/** trần hốc cao hơn mặt đáy quanh hốc trong khoảng này (mm) */
const DEPTH = [0.3, 4]
/** gom mặt quay xuống cao hơn đáy thấp nhất tới mức này (mm) rồi mới lọc theo độ sâu quanh hốc */
const SCAN_H = 15
/** bán kính hốc feet thật (mm): feet tròn Ø 7–13mm; nhỏ hơn là chốt / lỗ, lớn hơn là chữ khắc */
const RADIUS = [3.5, 6.5]
/** model không có hốc: feet dán phẳng, bán kính (mm, như FOOT_R của case dựng bằng code) + chừa tới mép / lỗ vít */
const FLAT_R = 4
const FLAT_MARGIN = 3

/**
 * Đáy phẳng không có hốc: dò mặt đáy thật (tam giác quay xuống sát đáy), mỗi góc chọn 1 chỗ sát góc nhất mà cả
 * đĩa feet + lề nằm trọn trong mặt đáy (không lòi ra mép vát / lỗ vít như case Alice). Trả [x, z, r, 0]
 */
function flatFeet(tris, minY) {
  const base = []
  for (const [a, b, c] of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(...n) || 1
    if (n[1] / len > -0.95 || Math.max(a[1], b[1], c[1]) - minY > 0.3) continue
    base.push([a, b, c].map((v) => [v[0], v[2]]))
  }
  if (!base.length) return []
  const solid = (x, z) => base.some((t) => inTri([x, z], t))
  const xs = base.flat().map((p) => p[0])
  const zs = base.flat().map((p) => p[1])
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  const R = FLAT_R + FLAT_MARGIN
  // lấy mẫu cả đĩa (3 vòng), không chỉ viền: lỗ vít nhỏ lọt giữa đĩa cũng bị bắt
  const ring = [R / 3, (2 * R) / 3, R].flatMap((r) =>
    Array.from({ length: 16 }, (_, i) => [
      r * Math.cos((i / 16) * Math.PI * 2),
      r * Math.sin((i / 16) * Math.PI * 2),
    ]),
  )
  const fits = (x, z) => solid(x, z) && ring.every(([dx, dz]) => solid(x + dx, z + dz))
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const out = []
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    // dò 1/4 phía góc đó, bước 2mm, điểm theo tỉ lệ nửa bề ngang / bề sâu (càng sát góc càng cao)
    let best = null
    for (let x = cx; sx * (x - cx) <= (x1 - x0) / 2; x += 2 * sx)
      for (let z = cz; sz * (z - cz) <= (z1 - z0) / 2; z += 2 * sz) {
        const score = (sx * (x - cx)) / (x1 - x0) + (sz * (z - cz)) / (z1 - z0)
        if ((!best || score > best.score) && fits(x, z)) best = { x, z, score }
      }
    if (best) out.push([Math.round(best.x * 10) / 10, Math.round(best.z * 10) / 10, FLAT_R, 0])
  }
  return out.length === 4 ? out : []
}

const io = new NodeIO()
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(DIR, { recursive: true })
      .filter((f) => f.endsWith('.glb'))
      .map((f) => f.replaceAll('\\', '/').slice(0, -4))

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
  /** tâm mọi tam giác quay xuống [x, y so với đáy thấp nhất, z] (tìm mặt đáy quanh hốc) */
  const down = []
  /** tam giác trần (xz) để kiểm tra tâm hốc có bị che kín không: hốc feet trần là đĩa kín, lỗ vít là vành khuyên */
  const caps = []
  for (const [a, b, c] of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const len = Math.hypot(...n) || 1
    if (n[1] / len > -0.95) continue
    const y = (a[1] + b[1] + c[1]) / 3 - minY
    down.push([(a[0] + b[0] + c[0]) / 3, y, (a[2] + b[2] + c[2]) / 3])
    if (y < 0.05 || y > SCAN_H) continue
    for (const v of [a, b, c]) pts.push([v[0], v[2], v[1] - minY])
    caps.push([a, b, c].map((v) => [v[0], v[2]]))
  }
  /**
   * mặt đáy quanh hốc: trung vị độ cao mặt quay xuống trong vành r+0.5 → r+8mm quanh tâm, chỉ lấy mặt thấp hơn trần hốc
   * (bỏ mặt trong lòng case cao hơn); đáy nghiêng thì lấy thấp nhất sẽ rơi về phía dốc nên dùng trung vị
   */
  const floorAt = (x, z, r, ceil) => {
    const ys = down
      .filter(([px, py, pz]) => {
        const d = Math.hypot(px - x, pz - z)
        return d > r + 0.5 && d < r + 8 && py < ceil - 0.05 && py > ceil - DEPTH[1] - 1
      })
      .map((p) => p[1])
      .sort((u, v) => u - v)
    return ys.length ? ys[Math.floor(ys.length / 2)] : Infinity
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
    const ceil = Math.min(...c.map((p) => p[2]))
    // độ sâu = đỉnh trần hốc − mặt đáy quanh hốc (trần nghiêng theo đáy: đỉnh cao hơn mép thấp)
    const top = Math.max(...c.map((p) => p[2]))
    const deep = top - floorAt(cx, cz, r, top)
    if (process.env.DEBUG) {
      const roof = c.filter((p) => p[2] > top - 0.3)
      const rx = roof.map((p) => p[0])
      const rz = roof.map((p) => p[1])
      console.log(
        '  cụm',
        cx.toFixed(1),
        cz.toFixed(1),
        'r',
        r.toFixed(1),
        'sâu',
        deep.toFixed(2),
        'đáy quanh',
        floorAt(cx, cz, r, top).toFixed(2),
        '| tâm trần',
        ((Math.max(...rx) + Math.min(...rx)) / 2).toFixed(1),
        ((Math.max(...rz) + Math.min(...rz)) / 2).toFixed(1),
        'cỡ trần',
        (Math.max(...rx) - Math.min(...rx)).toFixed(1),
        (Math.max(...rz) - Math.min(...rz)).toFixed(1),
        '| cao',
        Math.min(...c.map((p) => p[2])).toFixed(2),
        top.toFixed(2),
      )
    }
    if (!(deep >= DEPTH[0] && deep <= DEPTH[1])) continue
    const round1 = (n) => Math.round(n * 10) / 10
    // [x, z, r, trần hốc, mặt đáy quanh hốc] (mm so với đáy thấp nhất): feet nhô ra dưới mặt đáy quanh hốc, không tới đáy thấp nhất
    feet.push([
      round1(cx),
      round1(cz),
      round1(r),
      round1(ceil),
      round1(Math.min(ceil, floorAt(cx, cz, r, top))),
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
  // dưới 4 hốc thì không tin được: đáy phẳng → tự chọn 4 chỗ dán sát góc trong mặt đáy (không được thì game đặt mặc định)
  if (paired.length >= 4) out[name] = paired
  else {
    const flat = flatFeet(tris, minY)
    console.log('  đáy phẳng', JSON.stringify(flat))
    if (flat.length) out[name] = flat
  }
}
// có tham số: gộp model vừa dò vào file sẵn có (giữ các case khác); không tham số: ghi lại cả file
const merged = process.argv.slice(2).length
  ? { ...JSON.parse(fs.readFileSync(OUT, 'utf8')), ...out }
  : out
fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n')
console.log('→', OUT)
