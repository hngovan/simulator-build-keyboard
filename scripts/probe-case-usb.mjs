// Dò lỗ cổng USB ở vách sau case CAD + sàn trong ngay trước lỗ → src/data/caseUsb.json (chỗ đặt daughterboard)
// Bắn lưới tia ngang từ sau ra trước (+z) vào vách sau: ô "sâu" = tia lọt qua vách (đi sâu hơn mặt vách cùng độ cao
// > 6mm hoặc không trúng gì). Lỗ USB = cụm ô sâu kín (có vách bên trên + 2 bên), cỡ 7–25 × 3–15mm, không phải mép trên vách.
// Không có lỗ xuyên (model chỉ có hốc lõm, vd Exodus60 nắp HHKB / WKL) thì dò lại với ngưỡng nông `SHALLOW`.
// Rồi bắn tia ngang trong lòng case tìm mặt trong vách sau, tia xuống tìm sàn (2 điểm trước / sau → độ dốc sàn).
// Model thiết kế sẵn cho DTB (bệ phẳng có 2 lỗ ốc M2, hoặc 2 trụ nhô): dò bản đồ cao độ sàn quanh 2 lỗ vít dự kiến, cụm lõm
// (lỗ ốc) / nhô (trụ) lệch sàn quanh đó > 0,8mm → DTB nằm đúng chỗ đó trên bệ / trụ (game không vẽ thêm trụ đỡ).
// Ghi { hole: [x, y tâm lỗ, rộng, cao], inner: z mặt trong vách, floor: y sàn chỗ DTB, slope: dốc sàn (rad, quanh x),
//       mount?: [x, z tâm DTB, y mặt trụ], groove?: [[x, y, z], ...] } (mm, hệ model).
// Rãnh đi dây JST (vd Repent75, TA65): lan từ tâm DTB qua ô sàn thấp liền nhau (≤ 3mm trên mặt sàn DTB, theo dốc), phần lòi ra
// ngoài hốc DTB = rãnh; đường ngắn nhất từ miệng JST tới đầu rãnh xa nhất (lấy mẫu ~4mm) → dây nằm dọc rãnh, cổng JST PCB trên đầu rãnh.
// Dùng: node scripts/probe-case-usb.mjs [model...] (không tham số: mọi GLB trong public/models/keyboards)
import fs from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'

THREE.Mesh.prototype.raycast = acceleratedRaycast
const DIR = 'public/models/keyboards'
const OUT = 'src/data/caseUsb.json'
/** bước lưới tia (mm) */
const STEP = 0.5
/** tia đi sâu hơn mặt vách cùng hàng quá mức này (mm) = lọt qua lỗ; dò lại hốc lõm (không xuyên) với ngưỡng nông */
const DEEP = 6
const SHALLOW = { deep: 3, h: 1 }
/** sàn dốc quá mức này (đo trúng bậc / trụ chứ không phải sàn nghiêng): bỏ dốc, DTB nằm trên điểm cao hơn */
const MAX_SLOPE = (12 * Math.PI) / 180
/** cỡ lỗ USB hợp lệ (mm) */
const HOLE_W = [7, 25]
const HOLE_H = [3, 15]
/** độ sâu tia → cụm sâu (`holes`) + cụm hợp cỡ lỗ USB (`ok`) theo ngưỡng sâu `deepMm`, cao tối thiểu `minH` */
function findHoles(depth, wallAt, rowOk, xs, ys, deepMm, minH) {
  const deep = depth.map((row, j) => row.map((d) => rowOk[j] && d > wallAt[j] + deepMm))
  // gom cụm ô sâu (4 hướng)
  const seen = depth.map((row) => row.map(() => false))
  const holes = []
  for (let j = 0; j < ys.length; j++)
    for (let i = 0; i < xs.length; i++) {
      if (!deep[j][i] || seen[j][i]) continue
      const cells = []
      const stack = [[j, i]]
      seen[j][i] = true
      while (stack.length) {
        const [b, a] = stack.pop()
        cells.push([b, a])
        for (const [db, da] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nb = b + db
          const na = a + da
          if (nb < 0 || na < 0 || nb >= ys.length || na >= xs.length) continue
          if (seen[nb][na] || !deep[nb][na]) continue
          seen[nb][na] = true
          stack.push([nb, na])
        }
      }
      const bj = cells.map((c) => c[0])
      const bi = cells.map((c) => c[1])
      const [j0, j1, i0, i1] = [Math.min(...bj), Math.max(...bj), Math.min(...bi), Math.max(...bi)]
      const w = (i1 - i0 + 1) * STEP
      const h = (j1 - j0 + 1) * STEP
      // kín: hàng ngay trên lỗ còn là vách (hàng hợp lệ, ô giữa nông), không chạm 2 đầu lưới
      const top = j1 + 1 < ys.length && rowOk[j1 + 1] && !deep[j1 + 1][Math.round((i0 + i1) / 2)]
      const fill = cells.length / ((i1 - i0 + 1) * (j1 - j0 + 1))
      holes.push({
        x: (xs[i0] + xs[i1]) / 2,
        y: (ys[j0] + ys[j1]) / 2,
        w,
        h,
        top,
        fill,
        edge: i0 === 0 || i1 === xs.length - 1,
        wall: median(cells.map(([b]) => wallAt[b])),
      })
    }
  const ok = holes.filter(
    (o) =>
      o.top &&
      !o.edge &&
      o.fill > 0.6 &&
      o.w >= HOLE_W[0] &&
      o.w <= HOLE_W[1] &&
      o.h >= minH &&
      o.h <= HOLE_H[1],
  )
  return { holes, ok }
}
/** DTB dài 16,5mm: đo sàn ở 2 điểm dọc thân DTB tính từ mặt trong vách */
const DTB_D = 16.5
/** 2 lỗ vít M2 của DTB so với tâm mạch (mm, như DTB_MM.holes trong steps.ts) */
const DTB_HOLES = [
  [-7, 6.25],
  [7, 6.25],
]
/** dò rãnh dây: lưới (mm), ô thấp hơn mặt sàn DTB + `low`, vùng tìm ± `x` / tới trước `z`, diện tích rãnh hợp lệ (mm²), dài tối thiểu */
const GROOVE = { step: 0.5, low: 3, x: 90, z: 50, area: [20, 4000], len: 12, wide: 20, max: 60 }
/** miệng cổng JST trên DTB so với tâm mạch (mm, DTB_MM.jst.z) */
const DTB_JST_Z = 7.8

/**
 * Rãnh dây JST trước DTB (tâm `cx`, `cz`, sàn `floor` dốc `slope`, tia xuống từ `yTop`): trả polyline [[x, y, z]] từ miệng JST
 * tới đầu rãnh, hoặc null (không có rãnh / sàn hở rộng)
 */
const dbg = (...a) => (process.env.DEBUG && console.log('  rãnh:', ...a), null)
function findGroove(mesh, cx, cz, floor, slope, yTop, inner) {
  const g = GROOVE.step
  const nx = Math.round((2 * GROOVE.x) / g)
  const nz = Math.round((GROOVE.z + 10) / g)
  const at = (i, j) => [cx - GROOVE.x + i * g, cz - 10 + j * g]
  const h = []
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const [x, z] = at(i, j)
      h.push(yTop - cast(mesh, [x, yTop, z], [0, -1, 0]))
    }
  const ref = (z) => floor + Math.tan(slope) * (z - cz)
  const low = (i, j) => {
    const y = h[j * (nx + 1) + i]
    // sau mặt trong vách sau (tia sượt mặt vách trúng sàn ngoài) không tính
    return Number.isFinite(y) && at(i, j)[1] > inner + 1 && y - ref(at(i, j)[1]) < GROOVE.low
  }
  const si = Math.round(GROOVE.x / g)
  const sj = Math.round((10 + DTB_JST_Z) / g)
  if (!low(si, sj)) return dbg('miệng JST không thấp', h[sj * (nx + 1) + si] - ref(at(si, sj)[1]))
  // BFS 4 hướng, giữ cha để dựng đường
  const prev = new Map([[sj * (nx + 1) + si, -1]])
  const queue = [[si, sj]]
  for (let q = 0; q < queue.length; q++) {
    const [i, j] = queue[q]
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di
      const b = j + dj
      const k = b * (nx + 1) + a
      if (a < 0 || b < 0 || a > nx || b > nz || prev.has(k) || !low(a, b)) continue
      prev.set(k, j * (nx + 1) + i)
      queue.push([a, b])
    }
  }
  // ô rãnh = ngoài hốc DTB (rộng 20mm, tới trước mép DTB + 1mm)
  const groove = queue.filter(([i, j]) => {
    const [x, z] = at(i, j)
    return Math.abs(x - cx) > 10 || z > cz + DTB_D / 2 + 1
  })
  const area = groove.length * g * g
  // rãnh = dải hẹp (diện tích / chiều dài ≤ `wide`); sàn hở rộng (case không rãnh) thì không
  const gi = groove.map((c) => c[0])
  const gj = groove.map((c) => c[1])
  const span = Math.max(Math.max(...gi) - Math.min(...gi), Math.max(...gj) - Math.min(...gj)) * g
  if (area / Math.max(span, 1) > GROOVE.wide) return dbg('rộng', area / span)
  if (area < GROOVE.area[0] || area > GROOVE.area[1]) return dbg('diện tích', area)
  const mz = cz + DTB_JST_Z
  const far = groove.reduce(
    (best, c) => {
      const [x, z] = at(...c)
      const d = Math.hypot(x - cx, z - mz)
      return d > best.d ? { c, d } : best
    },
    { c: null, d: 0 },
  )
  if (far.d < GROOVE.len) return dbg('ngắn', far.d)
  // đường từ đầu rãnh ngược về miệng JST, lấy mẫu ~4mm
  const path = []
  for (let k = far.c[1] * (nx + 1) + far.c[0]; k >= 0; k = prev.get(k)) {
    const [x, z] = at(k % (nx + 1), Math.floor(k / (nx + 1)))
    path.push([x, h[k], z])
  }
  path.reverse()
  // dây dài tối đa `max` theo rãnh (rãnh chạy tới tận vách xa thì cổng PCB không ở tít đầu kia)
  let len = 0
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2])
    if (len > GROOVE.max) {
      path.length = i
      break
    }
  }
  const step = Math.max(1, Math.round(4 / g))
  return path.filter((_, i) => i % step === 0 || i === path.length - 1)
}

/** dò lỗ ốc / trụ: cửa sổ ± quanh lỗ dự kiến (mm), bước lưới, lệch sàn quanh đó, diện tích cụm (mm²) */
const BOSS = { win: 5, step: 0.25, rise: 0.8, area: [1, 60] }

/**
 * Lỗ ốc / trụ quanh (x, z): bản đồ cao độ (tia xuống từ `yTop`), cụm lệch trung vị cửa sổ (mặt bệ) > `BOSS.rise` (lõm = lỗ ốc,
 * nhô = trụ), không chạm mép cửa sổ. Trả { x, z (tâm cụm), top (mặt tì DTB: bệ quanh lỗ / mặt trụ phân vị 90%) } hoặc null
 */
function findBoss(mesh, x, z, yTop) {
  const n = Math.round((2 * BOSS.win) / BOSS.step)
  const grid = []
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const px = x - BOSS.win + i * BOSS.step
      const pz = z - BOSS.win + j * BOSS.step
      grid.push({ i, j, x: px, z: pz, y: yTop - cast(mesh, [px, yTop, pz], [0, -1, 0]) })
    }
  const base = median(grid.map((g) => g.y).filter(Number.isFinite))
  for (const dir of [-1, 1]) {
    const found = cluster(
      grid.filter((g) =>
        dir > 0 ? g.y > base + BOSS.rise && g.y < yTop - 0.3 : !(g.y > base - BOSS.rise),
      ),
      n,
    )
    if (!found) continue
    const ys = found.cells.map((c) => c.y).sort((a, b) => a - b)
    if (dir > 0) return { x: found.x, z: found.z, top: ys[Math.floor(ys.length * 0.9)] }
    // lỗ ốc: mặt bệ = vành ngay quanh lỗ (cách mép lỗ 0,5–1,5mm), không lấy trung vị cả cửa sổ (lẫn sàn thấp ngoài bệ)
    const r = Math.sqrt((found.cells.length * BOSS.step ** 2) / Math.PI)
    const rim = grid.filter((g) => {
      const d = Math.hypot(g.x - found.x, g.z - found.z)
      return d > r + 0.5 && d < r + 1.5 && Number.isFinite(g.y)
    })
    return { x: found.x, z: found.z, top: median(rim.map((g) => g.y)) }
  }
  return null
}

/**
 * cụm ô liền nhau (8 hướng) trong `high` hợp cỡ, không chạm mép cửa sổ (sàn thấp ngoài mép bệ chạm mép → bỏ), gần tâm cửa sổ nhất
 * → tâm cụm
 */
function cluster(high, n) {
  if (!high.length) return null
  const key = (g) => g.j * (n + 1) + g.i
  const set = new Map(high.map((g) => [key(g), g]))
  let best = null
  const mid = n / 2
  const seen = new Set()
  for (const g of high) {
    if (seen.has(key(g))) continue
    const cells = []
    const stack = [g]
    seen.add(key(g))
    while (stack.length) {
      const c = stack.pop()
      cells.push(c)
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const k = (c.j + dj) * (n + 1) + c.i + di
          if (c.i + di < 0 || c.i + di > n || seen.has(k) || !set.has(k)) continue
          seen.add(k)
          stack.push(set.get(k))
        }
    }
    const area = cells.length * BOSS.step ** 2
    const edge = cells.some((c) => c.i === 0 || c.j === 0 || c.i === n || c.j === n)
    if (edge || area < BOSS.area[0] || area > BOSS.area[1]) continue
    const ci = cells.reduce((a, c) => a + c.i, 0) / cells.length
    const cj = cells.reduce((a, c) => a + c.j, 0) / cells.length
    const dist = Math.hypot(ci - mid, cj - mid)
    if (!best || dist < best.dist)
      best = {
        dist,
        cells,
        x: cells.reduce((a, c) => a + c.x, 0) / cells.length,
        z: cells.reduce((a, c) => a + c.z, 0) / cells.length,
      }
  }
  return best
}

const io = new NodeIO()
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(DIR, { recursive: true })
      .filter((f) => f.endsWith('.glb') && !f.includes('plate'))
      .map((f) => f.replaceAll('\\', '/').slice(0, -4))

/** lưới tam giác của nắp + đáy + tạ (bỏ badge) gộp 1 mesh có BVH */
async function load(name) {
  const doc = await io.read(`${DIR}/${name}.glb`)
  const pos = []
  for (const n of doc.getRoot().listNodes()) {
    if (!n.getMesh() || n.getName() === 'badge') continue
    for (const p of n.getMesh().listPrimitives()) {
      const a = p.getAttribute('POSITION').getArray()
      const idx = p.getIndices()?.getArray()
      const count = idx ? idx.length : a.length / 3
      for (let i = 0; i < count; i++) {
        const k = (idx ? idx[i] : i) * 3
        pos.push(a[k], a[k + 1], a[k + 2])
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.boundsTree = new MeshBVH(g)
  g.computeBoundingBox()
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  return { mesh, box: g.boundingBox }
}

const ray = new THREE.Raycaster()
ray.firstHitOnly = true
/** khoảng cách tới mặt đầu tiên trúng (mm), không trúng = Infinity */
function cast(mesh, o, d) {
  ray.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize())
  const hit = ray.intersectObject(mesh)[0]
  return hit ? hit.distance : Infinity
}
/** mọi mặt trúng dọc tia (mm, tăng dần) */
function castAll(mesh, o, d) {
  ray.firstHitOnly = false
  ray.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize())
  const hits = ray.intersectObject(mesh).map((h) => h.distance)
  ray.firstHitOnly = true
  return hits
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

const out =
  fs.existsSync(OUT) && process.argv.length > 2 ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
for (const name of names) {
  const { mesh, box } = await load(name)
  const { min, max } = box
  const xs = []
  for (let x = min.x + 3; x <= max.x - 3; x += STEP) xs.push(x)
  const ys = []
  for (let y = min.y + STEP; y <= max.y - STEP; y += STEP) ys.push(y)
  const z0 = min.z - 5
  // độ sâu tia tính từ mặt sau ngoài cùng (min.z)
  const depth = ys.map((y) => xs.map((x) => cast(mesh, [x, y, z0], [0, 0, 1]) - 5))
  // mặt vách mỗi hàng = trung vị độ sâu (hàng trên mép vách thì trung vị cũng sâu → bỏ)
  const wallAt = depth.map((row) => median(row))
  const rowOk = wallAt.map((w) => w < 15)
  let { holes, ok } = findHoles(depth, wallAt, rowOk, xs, ys, DEEP, HOLE_H[0])
  if (!ok.length) ({ holes, ok } = findHoles(depth, wallAt, rowOk, xs, ys, SHALLOW.deep, SHALLOW.h))
  const cx = (min.x + max.x) / 2
  ok.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))
  const pick = ok[0]
  if (!pick) {
    console.log(
      `${name}: KHÔNG THẤY LỖ USB (${holes.length} cụm sâu: ${holes
        .filter((o) => o.w > 3 && o.h > 2)
        .slice(0, 6)
        .map((o) => `${o.x.toFixed(1)},${o.y.toFixed(1)} ${o.w}×${o.h}${o.top ? '' : ' hở trên'}`)
        .join(' | ')})`,
    )
    continue
  }
  // mặt trong vách sau: tia từ ngoài vào ngay trên / dưới lỗ (chỗ còn vách), mặt thứ 2 trúng = mặt trong vách
  // (tia từ trong lòng case ra hay vướng trụ / gờ bên trong). Lấy chỗ vách mỏng hơn (dưới lỗ hay có gờ sàn)
  const inner = Math.min(
    ...[pick.y + pick.h / 2 + 1, pick.y - pick.h / 2 - 1].map((y) => {
      const h = castAll(mesh, [pick.x, y, z0], [0, 0, 1])
      return h.length >= 2 ? z0 + h[1] : Infinity
    }),
  )
  // sàn: tia xuống từ ngang tâm lỗ, ở 1/4 và 3/4 thân DTB tính từ mặt trong vách
  const floorAt = (dz) => pick.y - cast(mesh, [pick.x, pick.y, inner + dz], [0, -1, 0])
  const fa = floorAt(DTB_D * 0.25)
  const fb = floorAt(DTB_D * 0.75)
  let slope = Math.atan2(fb - fa, DTB_D * 0.5)
  let floor = (fa + fb) / 2
  if (Math.abs(slope) > MAX_SLOPE) {
    slope = 0
    floor = Math.max(fa, fb)
  }
  const r = (v) => Math.round(v * 100) / 100
  // trụ bắt ốc có sẵn ở 2 lỗ vít DTB (đặt theo lỗ USB, mép sau sát vách): đủ 2 trụ, cách nhau đúng ~14mm, cùng độ cao
  const zc = inner + DTB_D / 2
  const bosses = DTB_HOLES.map(([dx, dz]) => findBoss(mesh, pick.x + dx, zc + dz, pick.y))
  const [ba, bb] = bosses
  const mount =
    ba &&
    bb &&
    Math.abs(Math.hypot(bb.x - ba.x, bb.z - ba.z) - 14) < 2 &&
    Math.abs(ba.top - bb.top) < 1
      ? [
          r((ba.x + bb.x) / 2),
          r((ba.z + bb.z) / 2 - DTB_HOLES[0][1]),
          r((ba.top + bb.top) / 2 - min.y),
        ]
      : undefined
  const dc = mount ? [mount[0], mount[1]] : [pick.x, zc]
  const groove = findGroove(mesh, dc[0], dc[1], floor, slope, pick.y + 6, inner)
  out[name] = {
    hole: [r(pick.x), r(pick.y - min.y), r(pick.w), r(pick.h)],
    inner: r(inner),
    floor: r(floor - min.y),
    slope: r(slope),
    ...(mount ? { mount } : {}),
    ...(groove ? { groove: groove.map(([x, y, z]) => [r(x), r(y - min.y), r(z)]) } : {}),
  }
  console.log(
    `${name}: lỗ x ${r(pick.x)} (giữa case ${r(cx)}), y ${r(pick.y - min.y)}, ${pick.w}×${pick.h}mm, vách trong z ${r(inner)} (sau ${r(min.z)}), sàn ${r(floor - min.y)} dốc ${r((slope * 180) / Math.PI)}° · ${ok.length} ứng viên · trụ DTB: ${groove ? `rãnh ${groove.length} điểm tới ${r(groove.at(-1)[0])},${r(groove.at(-1)[2])} · ` : ''}${mount ? mount.join(', ') : bosses.map((b) => (b ? `${r(b.x)},${r(b.z)} cao ${r(b.top)}` : '-')).join(' | ')}`,
  )
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
