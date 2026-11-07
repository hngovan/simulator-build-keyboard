// Duality Horns bản hàng dưới WK (Ctrl / Win / Alt 1.25u + space 6.25u): model gốc làm cho WKL nên khoét thêm bằng CSG
// - nắp: case.glb có sẵn 2 khối chặn chỗ phím Win trái / phải → khoét bỏ (hộp ôm đúng khối, chừa mặt trong vách trước)
//   → case-wk.glb (các node đáy / tạ / badge giữ nguyên). Khối dò từ case.glb (mm, hệ model): x −144,7 … −126,7 và 64,8 … 82,8;
//   mặt sau z ≈ 40,9; đỉnh y 25,3; chân y 18,8; liền vào mặt trong vách trước z ≈ 59,2 … 59,7
// - plate: plate.glb (multi-layout) có lỗ Win 1.25u nhưng chỉ có lỗ space 7u → khoét thêm lỗ switch 14 × 14 + 2 lỗ stab
//   (khoảng cách 6.25u = ±50mm, cỡ như lỗ stab 7u sẵn có: rộng 7, cao 15, lệch lên 1,5mm) → plate-wk.glb
// Chạy lại sau `bun run convert:user-cases duality-horns/case` / `bun run gen:plate-duality`.
// ⚠️ Model người dùng sưu tầm, chưa rõ giấy phép: chỉ dùng cá nhân.
// Dùng: bun run gen:duality-wk
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg'
import { getLayout } from '../src/data/layouts'

const DIR = 'public/models/keyboards/duality-horns'
const U = 19.05
/** hộp khoét [x0, x1, y0, y1, z0, z1] (mm) */
type Cut = [number, number, number, number, number, number]
const box = (cx: number, cz: number, w: number, d: number, y0: number, y1: number): Cut => [
  cx - w / 2,
  cx + w / 2,
  y0,
  y1,
  cz - d / 2,
  cz + d / 2,
]

/** hộp → BoxGeometry chỉ có position + normal */
const boxGeo = ([x0, x1, y0, y1, z0, z1]: Cut) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate(
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
  )
  g.deleteAttribute('uv')
  return g
}

/** bỏ tam giác nằm trọn trên 1 mặt của hộp (trong khung hộp) = mặt hộp CSG thêm vào */
function dropBoxFaces(fp: Float32Array, fn: Float32Array, boxes: Cut[]) {
  const E = 1e-3
  const onBox = (t: number) =>
    boxes.some(([x0, x1, y0, y1, z0, z1]) => {
      const v = [0, 1, 2].map((k) => fp.subarray((t + k) * 3, (t + k) * 3 + 3))
      const inBox = v.every(
        ([x, y, z]) =>
          x > x0 - E && x < x1 + E && y > y0 - E && y < y1 + E && z > z0 - E && z < z1 + E,
      )
      const onPlane = (a: number, c: number) => v.every((q) => Math.abs(q[a] - c) < E)
      return (
        inBox &&
        (onPlane(0, x0) ||
          onPlane(0, x1) ||
          onPlane(1, y0) ||
          onPlane(1, y1) ||
          onPlane(2, z0) ||
          onPlane(2, z1))
      )
    })
  const kp: number[] = []
  const kn: number[] = []
  for (let t = 0; t < fp.length / 3; t += 3)
    if (!onBox(t)) {
      kp.push(...fp.subarray(t * 3, t * 3 + 9))
      kn.push(...fn.subarray(t * 3, t * 3 + 9))
    }
  return { kp, kn }
}

const flatOf = (b: Brush) => {
  const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry
  return {
    fp: g.getAttribute('position').array as Float32Array,
    fn: g.getAttribute('normal').array as Float32Array,
  }
}

type PP = { y: number; z: number; n: [number, number, number] }
type Seg = [PP, PP]

/**
 * Mặt cắt lưới (tam giác phẳng `tp` / `tn`) bởi mặt phẳng x = c, cắt gọn trong vùng y ≥ y0, zMin ≤ z ≤ z1: mỗi tam giác cắt qua
 * cho 1 đoạn (pháp tuyến nội suy từ đỉnh của chính tam giác đó → giữ được mép gãy), nối các đoạn liền nhau thành 1 đường profile
 * (chân vách y0 → bo mép trên → mặt trên tới z1)
 */
function sliceAt(
  tp: Float32Array,
  tn: Float32Array,
  c: number,
  y0: number,
  zMin: number,
  z1: number,
) {
  const at = (i: number) => tp.subarray(i * 3, i * 3 + 3)
  const nAt = (i: number) => tn.subarray(i * 3, i * 3 + 3)
  const lerp = (a: PP, b: PP, k: number): PP => ({
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k,
    n: a.n.map((v, i) => v + (b.n[i] - v) * k) as PP['n'],
  })
  const segs: Seg[] = []
  for (let t = 0; t < tp.length / 3; t += 3) {
    const hit: PP[] = []
    for (const [a, b] of [
      [t, t + 1],
      [t + 1, t + 2],
      [t + 2, t],
    ]) {
      const da = at(a)[0] - c
      const db = at(b)[0] - c
      if (da < 0 === db < 0) continue
      const k = da / (da - db)
      const pa = at(a)
      const pb = at(b)
      const na = nAt(a)
      const nb = nAt(b)
      hit.push({
        y: pa[1] + (pb[1] - pa[1]) * k,
        z: pa[2] + (pb[2] - pa[2]) * k,
        n: [0, 1, 2].map((i) => na[i] + (nb[i] - na[i]) * k) as PP['n'],
      })
    }
    if (hit.length !== 2) continue
    // cắt đoạn vào vùng (3 nửa mặt phẳng: y ≥ y0, z ≥ zMin, z ≤ z1)
    let [a, b] = hit
    const clip = (f: (p: PP) => number) => {
      const fa = f(a)
      const fb = f(b)
      if (fa < 0 && fb < 0) return false
      if (fa < 0) a = lerp(a, b, fa / (fa - fb))
      else if (fb < 0) b = lerp(a, b, fa / (fa - fb))
      return true
    }
    if (!clip((p) => p.y - y0) || !clip((p) => p.z - zMin) || !clip((p) => z1 - p.z)) continue
    if (Math.hypot(a.y - b.y, a.z - b.z) < 1e-6) continue
    segs.push([a, b])
  }
  // nối đoạn: bắt đầu từ đầu thấp nhất (chân vách), mỗi bước lấy đoạn có 1 đầu trùng đầu đang đứng
  const key = (p: PP) => `${p.y.toFixed(3)},${p.z.toFixed(3)}`
  const start = segs
    .flatMap((s) => s)
    .reduce((m, p) => (p.y < m.y - 1e-6 || (Math.abs(p.y - m.y) < 1e-6 && p.z < m.z) ? p : m))
  const chain: Seg[] = []
  const used = new Set<number>()
  let cur = key(start)
  for (;;) {
    const i = segs.findIndex((s, j) => !used.has(j) && (key(s[0]) === cur || key(s[1]) === cur))
    if (i < 0) break
    used.add(i)
    const s = segs[i]
    const seg: Seg = key(s[0]) === cur ? s : [s[1], s[0]]
    chain.push(seg)
    cur = key(seg[1])
  }
  if (used.size !== segs.length)
    throw new Error(`Mặt cắt x = ${c}: còn ${segs.length - used.size} đoạn không nối được`)
  return chain
}

/**
 * Lấp chỗ khoét bằng mặt nội suy giữa 2 mặt cắt 2 bên (x0 → x1) như dao CNC chạy liền: 2 mép trùng đúng đường cắt của lưới còn lại
 * nên không nứt / không bậc. Profile chia thành các khúc trơn ở chỗ mép gãy (pháp tuyến 2 đoạn kề nhau lệch hẳn); 2 bên phải cùng số
 * khúc, mỗi khúc nội suy theo hợp tham số độ dài cung của cả 2 bên
 */
function loft(L: Seg[], R: Seg[], x0: number, x1: number) {
  const runs = (S: Seg[]) => {
    const out: PP[][] = []
    for (const [a, b] of S) {
      const last = out[out.length - 1]
      const prev = last?.[last.length - 1]
      const smooth = prev && a.n[0] * prev.n[0] + a.n[1] * prev.n[1] + a.n[2] * prev.n[2] > 0.9
      if (smooth) last.push(b)
      else out.push([a, b])
    }
    return out
  }
  const rl = runs(L)
  const rr = runs(R)
  if (rl.length !== rr.length)
    throw new Error(`2 mặt cắt khác số khúc: ${rl.length} / ${rr.length}`)
  const params = (P: PP[]) => {
    const d = [0]
    for (let i = 1; i < P.length; i++)
      d.push(d[i - 1] + Math.hypot(P[i].y - P[i - 1].y, P[i].z - P[i - 1].z))
    return d.map((v) => v / (d[d.length - 1] || 1))
  }
  const evalAt = (P: PP[], tt: number[], t: number): PP => {
    let i = 0
    while (i < tt.length - 2 && tt[i + 1] < t) i++
    const k = tt[i + 1] === tt[i] ? 0 : Math.min(1, Math.max(0, (t - tt[i]) / (tt[i + 1] - tt[i])))
    const a = P[i]
    const b = P[i + 1]
    return {
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
      n: a.n.map((v, j) => v + (b.n[j] - v) * k) as PP['n'],
    }
  }
  const kp: number[] = []
  const kn: number[] = []
  rl.forEach((LP, r) => {
    const RP = rr[r]
    const tl = params(LP)
    const tr = params(RP)
    const ts = [...new Set([...tl, ...tr].map((t) => +t.toFixed(6)))].sort((a, b) => a - b)
    const rows = ts.map((t) => [evalAt(LP, tl, t), evalAt(RP, tr, t)] as const)
    for (let i = 0; i + 1 < rows.length; i++) {
      const [a, b] = rows[i]
      const [c, d] = rows[i + 1]
      const quad = [
        { p: [x0, a.y, a.z], n: a.n },
        { p: [x1, b.y, b.z], n: b.n },
        { p: [x1, d.y, d.z], n: d.n },
        { p: [x0, c.y, c.z], n: c.n },
      ]
      // chiều quấn theo pháp tuyến (vật liệu 2 mặt lật pháp tuyến nếu quấn ngược)
      const u = quad[1].p.map((v, j) => v - quad[0].p[j])
      const w = quad[3].p.map((v, j) => v - quad[0].p[j])
      const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
      const nn = a.n.map((v, j) => v + b.n[j] + c.n[j] + d.n[j])
      const order =
        cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
      for (const j of order) {
        kp.push(...quad[j].p)
        // vách đùn thẳng theo x: bỏ thành phần x của pháp tuyến (lưới gốc sát khối có pháp tuyến nghiêng ±0,3 theo x, nội suy
        // chéo qua tấm lấp thành vệt sọc)
        const [, ny, nz] = quad[j].n
        const l = Math.hypot(ny, nz) || 1
        kn.push(0, ny / l, nz / l)
      }
    }
  })
  return { kp, kn }
}

/**
 * khoét các hộp khỏi 1 node của file GLB (node dùng chung bộ đỉnh với node khác thì tách riêng ra).
 * `bare`: bỏ mọi mặt hộp CSG thêm vào (lưới CAD không kín nên CSG đoán sai trong / ngoài, sót mặt hộp lơ lửng như tấm kệ),
 * chỉ giữ phần lưới gốc bị cắt. `fills`: lấp lại chỗ khoét bằng 1 đoạn lưới gốc cùng cỡ ở chỗ khác (đoạn vách trơn `cut` dời `dx`
 * mm sang chỗ khoét): vách đùn thẳng theo x nên đoạn chép khớp mép với vách 2 bên như phay CNC từ đầu, không phải vá tấm phẳng
 */
async function carve(
  src: string,
  out: string,
  nodeName: string,
  cuts: Cut[],
  opts: {
    bare?: boolean
    fills?: { cut: Cut; dx: number }[]
    lofts?: { cut: Cut; zMin: number }[]
  } = {},
) {
  const io = new NodeIO()
  const doc = await io.read(src)
  const node = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === nodeName)
  if (!node) throw new Error(`Không thấy node "${nodeName}" trong ${src}`)
  const prim = node.getMesh()!.listPrimitives()[0]
  const pos = prim.getAttribute('POSITION')!.getArray()! as Float32Array
  const nor = prim.getAttribute('NORMAL')!.getArray()! as Float32Array
  const idx = prim.getIndices()?.getArray() ?? new Uint32Array(pos.length / 3).map((_, i) => i)

  const tp = new Float32Array(idx.length * 3)
  const tn = new Float32Array(idx.length * 3)
  for (let i = 0; i < idx.length; i++) {
    tp.set(pos.subarray(idx[i] * 3, idx[i] * 3 + 3), i * 3)
    tn.set(nor.subarray(idx[i] * 3, idx[i] * 3 + 3), i * 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(tp, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(tn, 3))

  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  ev.useGroups = false
  let res = new Brush(geo)
  res.updateMatrixWorld()
  const src0 = res
  // đoạn lưới gốc để lấp (cắt từ lưới chưa khoét), bỏ mặt hộp, dời sang chỗ khoét
  const fillP: number[] = []
  const fillN: number[] = []
  for (const { cut, dx } of opts.fills ?? []) {
    const b = new Brush(boxGeo(cut))
    b.updateMatrixWorld()
    const part = flatOf(ev.evaluate(src0, b, INTERSECTION))
    const { kp, kn } = dropBoxFaces(part.fp, part.fn, [cut])
    for (let i = 0; i < kp.length; i += 3) fillP.push(kp[i] + dx, kp[i + 1], kp[i + 2])
    fillN.push(...kn)
    console.log(`  lấp: ${kp.length / 9} tam giác (dời ${dx.toFixed(1)}mm)`)
  }
  // mặt nội suy giữa 2 mặt cắt hộp (trên lưới gốc)
  for (const { cut, zMin } of opts.lofts ?? []) {
    const [x0, x1, y0, , , z1] = cut
    const L = sliceAt(tp, tn, x0, y0, zMin, z1)
    const R = sliceAt(tp, tn, x1, y0, zMin, z1)
    const { kp, kn } = loft(L, R, x0, x1)
    fillP.push(...kp)
    fillN.push(...kn)
    console.log(`  nội suy: mặt cắt ${L.length} / ${R.length} điểm → ${kp.length / 9} tam giác`)
    if (process.env.DEBUG)
      for (const S of [L, R])
        console.log(
          S.map(
            ([a, b]) =>
              `${a.y.toFixed(2)},${a.z.toFixed(2)}→${b.y.toFixed(2)},${b.z.toFixed(2)} n${b.n.map((v) => v.toFixed(2))}`,
          ).join(' | '),
        )
  }
  for (const c of cuts) {
    const b = new Brush(boxGeo(c))
    b.updateMatrixWorld()
    res = ev.evaluate(res, b, SUBTRACTION)
    res.updateMatrixWorld()
  }
  let { fp, fn } = flatOf(res)
  // lưới gốc quanh chỗ lấp: mặt vách / bo mép trên sát khối cũ và mặt vách dưới chân chỗ lấp có pháp tuyến nghiêng theo x (nội suy
  // quanh hốc / gờ bo) → vệt dọc / ngang ở đường nối dưới ánh phản chiếu nhôm. Vách đùn thẳng theo x nên bớt thành phần x: trong chỗ lấp
  // bỏ hẳn, ra ngoài giảm dần trong BLEND mm (không tạo vệt mới ở mép vùng sửa). Dưới chân chỗ lấp chỉ sửa đỉnh mặt vách (ny ≈ 0,08,
  // nz < −0,7); thành lỗ / trụ / mặt vát (|nx| ≥ 0,6 hoặc hướng khác) giữ nguyên
  const BLEND = 4
  for (const { cut } of opts.lofts ?? []) {
    const [x0, x1, y0, , , z1] = cut
    for (let i = 0; i < fp.length; i += 3) {
      const [x, y, z] = [fp[i], fp[i + 1], fp[i + 2]]
      if (x < x0 - BLEND || x > x1 + BLEND || y < 10 || z < 59 || z > z1 + 0.01) continue
      if (Math.abs(fn[i]) >= 0.6) continue
      if (y < y0 && !(fn[i + 1] > -0.05 && fn[i + 1] < 0.2 && fn[i + 2] < -0.7)) continue
      const d = x < x0 ? x0 - x : x > x1 ? x - x1 : 0
      const k = Math.min(1, d / BLEND)
      const nx = fn[i] * k
      const l = Math.hypot(nx, fn[i + 1], fn[i + 2]) || 1
      fn[i] = nx / l
      fn[i + 1] /= l
      fn[i + 2] /= l
    }
  }
  if (opts.bare) {
    const { kp, kn } = dropBoxFaces(fp, fn, cuts)
    fp = new Float32Array([...kp, ...fillP])
    fn = new Float32Array([...kn, ...fillN])
  }
  // gộp đỉnh trùng (vị trí + pháp tuyến) cho file nhẹ lại
  const seen = new Map<string, number>()
  const vp: number[] = []
  const vn: number[] = []
  const ii = new Uint32Array(fp.length / 3)
  for (let i = 0; i < ii.length; i++) {
    const p = fp.subarray(i * 3, i * 3 + 3)
    const q = fn.subarray(i * 3, i * 3 + 3)
    const k = [...p].map((v) => v.toFixed(4)).join() + '|' + [...q].map((v) => v.toFixed(3)).join()
    let j = seen.get(k)
    if (j === undefined) {
      j = vp.length / 3
      seen.set(k, j)
      vp.push(...p)
      vn.push(...q)
    }
    ii[i] = j
  }
  const buf = doc.getRoot().listBuffers()[0]
  const acc = (type: 'VEC3' | 'SCALAR', a: Float32Array | Uint32Array) =>
    doc.createAccessor().setType(type).setArray(a).setBuffer(buf)
  prim
    .setAttribute('POSITION', acc('VEC3', new Float32Array(vp)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(vn)))
    .setIndices(acc('SCALAR', ii))
  // accessor cũ không còn ai dùng (node không chung đỉnh) thì bỏ
  for (const a of doc.getRoot().listAccessors()) if (a.listParents().length <= 1) a.dispose()
  await io.write(out, doc)
  console.log(`${out}: ${nodeName} ${idx.length / 3} → ${ii.length / 3} tam giác`)
}

// nắp: 2 khối chặn chỗ Win (cả gờ bo chân khối y 17,4 và gờ bo nối vách lan ra ~0,9mm 2 bên khối: x −145,6 … −125,8 / 63,9 … 83,7):
// khoét hộp rộng hơn khối 1,2mm mỗi bên, từ y 17 (dưới đó vách có hốc / rãnh riêng sát 2 bên khối, lấp bằng vách trơn là lồi ra; từ y 17 mặt vách mọi chỗ như nhau) lên quá mép trên, ăn hết bề dày
// mặt trong vách trước (z tới 61,5). Khối liền vách nên sau khối không có mặt vách → lấp bằng đoạn vách trơn cùng cỡ chép từ chỗ
// vách không có chi tiết (dò: mặt trong vách trước không có đỉnh nào ở x −112,4 … −83,2 / −61,3 … 19,6)
const WIN: { x: [number, number] }[] = [{ x: [-145.9, -125.5] }, { x: [63.6, 84] }]
const winCut = ([x0, x1]: [number, number]): Cut => [x0, x1, 17, 26, 40.5, 61.5]
await carve(
  `${DIR}/case.glb`,
  `${DIR}/case-wk.glb`,
  'case',
  WIN.map((w) => winCut(w.x)),
  // lấp bằng mặt nội suy giữa 2 mép cắt (chép đoạn vách mẫu thì lệch ~0,1mm ở bo mép trên: vách sát khối không y hệt vách mẫu → lộ vết)
  { bare: true, lofts: WIN.map((w) => ({ cut: winCut(w.x), zMin: 55 })) },
)

// plate: lỗ switch + 2 lỗ stab space 6.25u (toạ độ plate = toạ độ layout × 19,05, mặt trên y = 0, dày 1,5)
const space = getLayout('tklf13', { bottom: 'wk' }).keys.find((k) => k.stab && k.w === 6.25)
if (!space) throw new Error('Không thấy space 6.25u của TKL F13 WK')
const sx = space.cx * U
const sz = space.cz * U
await carve(`${DIR}/plate.glb`, `${DIR}/plate-wk.glb`, 'plate', [
  box(sx, sz, 14, 14, -2, 0.5),
  box(sx - 50, sz - 1.5, 7, 15, -2, 0.5),
  box(sx + 50, sz - 1.5, 7, 15, -2, 0.5),
])
