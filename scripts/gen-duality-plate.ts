// Plate riêng của Duality Horns (TKL F13, multi-layout, người dùng đưa) → public/models/keyboards/duality-horns/plate.glb.
// Căn: DWG (assets/keyboards/duality-horns/plate/duality-tkl.dwg, đọc bằng LibreDWG WASM: LINE + ARC + LWPOLYLINE, mm, y lên) →
// nối nét thành vòng kín, lỗ switch 14 × 14mm → độ dời khớp tâm phím layout `tklf13` (bỏ phiếu cặp phím – lỗ, rồi trung bình).
// Hình: viền DWG vẽ chồng nét (đường thẳng qua khuyết, nét ngăn trong) nên không dựng shape từ DWG mà lấy lưới 3D PLATE_STANDARD
// trong STEP lắp ráp (cùng hệ toạ độ, khung bao trùng DWG) rồi dời theo độ căn.
// ⚠️ File người dùng sưu tầm, chưa rõ giấy phép: chỉ dùng cá nhân.
// Dùng: bun run gen:plate-duality
import fs from 'node:fs'
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'
import { getLayout } from '../src/data/layouts'

type P = [number, number]
const U = 19.05
const SRC = 'assets/keyboards/duality-horns/plate/duality-tkl.dwg'
const STEP = 'assets/keyboards/duality-horns/duality_horns_v1_asm v11.step'
const OUT = 'public/models/keyboards/duality-horns/plate.glb'

const lib = await LibreDwg.create('./node_modules/@mlightcad/libredwg-web/wasm/')
const dwg = lib.dwg_read_data(new Uint8Array(fs.readFileSync(SRC)), Dwg_File_Type.DWG)
if (!dwg) throw new Error(`Không đọc được ${SRC}`)
type Ent = {
  type: string
  startPoint?: { x: number; y: number }
  endPoint?: { x: number; y: number }
  center?: { x: number; y: number }
  radius?: number
  startAngle?: number
  endAngle?: number
  vertices?: { x: number; y: number; bulge?: number }[]
  flag?: number
}
const ents = lib.convert(dwg).entities as unknown as Ent[]
lib.dwg_free(dwg)

// DWG y lên = phía sau → z game = −y
const pt = (x: number, y: number): P => [x, -y]
/** cung → điểm (chia mỗi ~0.5mm, ít nhất 3 đoạn) */
function arcPts(cx: number, cy: number, r: number, a0: number, a1: number): P[] {
  while (a1 < a0) a1 += Math.PI * 2
  const n = Math.max(3, Math.ceil(((a1 - a0) * r) / 0.5))
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return pt(cx + r * Math.cos(a), cy + r * Math.sin(a))
  })
}
/** đoạn có hướng (chuỗi điểm) */
const chains: P[][] = []
for (const e of ents) {
  if (e.type === 'LINE')
    chains.push([pt(e.startPoint!.x, e.startPoint!.y), pt(e.endPoint!.x, e.endPoint!.y)])
  else if (e.type === 'ARC')
    chains.push(arcPts(e.center!.x, e.center!.y, e.radius!, e.startAngle!, e.endAngle!))
  else if (e.type === 'LWPOLYLINE') {
    const v = e.vertices!
    const closed = !!((e.flag ?? 0) & 1)
    const pts: P[] = [pt(v[0].x, v[0].y)]
    const n = closed ? v.length : v.length - 1
    for (let i = 0; i < n; i++) {
      const a = v[i]
      const b = v[(i + 1) % v.length]
      const bulge = a.bulge ?? 0
      if (Math.abs(bulge) < 1e-9) pts.push(pt(b.x, b.y))
      else {
        // cung theo bulge: góc ôm = 4·atan(bulge), tâm trên trung trực dây cung
        const th = 4 * Math.atan(bulge)
        const dx = b.x - a.x
        const dy = b.y - a.y
        const c = Math.hypot(dx, dy)
        const r = c / (2 * Math.sin(th / 2))
        const h = r * Math.cos(th / 2)
        const mx = (a.x + b.x) / 2 - (dy / c) * h
        const my = (a.y + b.y) / 2 + (dx / c) * h
        const s = Math.atan2(a.y - my, a.x - mx)
        const steps = Math.max(3, Math.ceil(Math.abs(th * r) / 0.5))
        for (let k = 1; k < steps; k++) {
          const ang = s + (th * k) / steps
          pts.push(pt(mx + Math.abs(r) * Math.cos(ang), my + Math.abs(r) * Math.sin(ang)))
        }
        // điểm cuối cung = đúng đỉnh kế (không để sai số / chiều bulge làm hở vòng)
        pts.push(pt(b.x, b.y))
      }
    }
    chains.push(pts)
  }
}

// nối chuỗi thành vòng: tra đầu mút theo lưới 0.01mm (thử cả 8 ô lân cận cho sai số làm tròn)
const key = (p: P) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`
const near = (p: P) => {
  const [gx, gz] = [Math.round(p[0] * 100), Math.round(p[1] * 100)]
  const out: string[] = []
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(`${gx + a},${gz + b}`)
  return out
}
const ends = new Map<string, number[]>()
chains.forEach((c, i) =>
  [c[0], c[c.length - 1]].forEach((p) => ends.set(key(p), [...(ends.get(key(p)) ?? []), i])),
)
const same = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02
const used = new Uint8Array(chains.length)
const loops: P[][] = []
let open = 0
for (let i = 0; i < chains.length; i++) {
  if (used[i]) continue
  used[i] = 1
  const loop: P[] = [...chains[i]]
  for (let guard = 0; guard < 10000 && !same(loop[loop.length - 1], loop[0]); guard++) {
    const end = loop[loop.length - 1]
    const j = near(end)
      .flatMap((k) => ends.get(k) ?? [])
      .find(
        (k) => !used[k] && (same(chains[k][0], end) || same(chains[k][chains[k].length - 1], end)),
      )
    if (j === undefined) break
    used[j] = 1
    const c = same(chains[j][0], end) ? chains[j] : [...chains[j]].reverse()
    loop.push(...c.slice(1))
  }
  if (!same(loop[loop.length - 1], loop[0])) {
    open++
    continue
  }
  loops.push(loop.slice(0, -1))
}
const area = (l: P[]) =>
  Math.abs(
    l.reduce((a, p, i) => a + p[0] * l[(i + 1) % l.length][1] - l[(i + 1) % l.length][0] * p[1], 0),
  ) / 2
const clean = loops
  .map((l) => l.filter((p, i) => !same(p, l[(i + 1) % l.length])))
  .filter((l) => l.length >= 3 && area(l) > 0.5)
clean.sort((a, b) => area(b) - area(a))
const holes = clean
console.log(
  `${chains.length} nét → ${clean.length} vòng kín (${open} chuỗi hở: viền vẽ chồng nét, không dùng)`,
)

// căn lỗ switch (≈14 × 14mm) vào tâm phím layout tklf13 (mọi variant: lỗ nào cũng phải có phím gần)
const bbox = (l: P[]) => {
  const xs = l.map((p) => p[0])
  const zs = l.map((p) => p[1])
  return {
    w: Math.max(...xs) - Math.min(...xs),
    d: Math.max(...zs) - Math.min(...zs),
    c: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...zs) + Math.min(...zs)) / 2] as P,
  }
}
const switchHoles = holes
  .map(bbox)
  .filter((b) => Math.abs(b.w - 14) < 0.3 && Math.abs(b.d - 14) < 0.3)
  .map((b) => b.c)
const keys = getLayout('tklf13', {}).keys.map((k) => [k.cx * U, k.cz * U] as P)
// độ dời: bỏ phiếu mọi cặp (phím, lỗ) theo lưới 0.25mm, lấy ô nhiều phiếu nhất (plate multi-layout thừa lỗ, phím 2u+ lỗ gộp stab)
const votes = new Map<string, number>()
for (const k of keys)
  for (const h of switchHoles) {
    const v = `${Math.round((k[0] - h[0]) * 4)},${Math.round((k[1] - h[1]) * 4)}`
    votes.set(v, (votes.get(v) ?? 0) + 1)
  }
const [best] = [...votes.entries()].sort((a, b) => b[1] - a[1])
let t: P = best[0].split(',').map((v) => Number(v) / 4) as P
// tinh chỉnh: trung bình độ lệch các phím khớp lỗ trong 1mm
const matched = () =>
  keys.flatMap((k) => {
    const h = switchHoles.find((h) => Math.hypot(h[0] + t[0] - k[0], h[1] + t[1] - k[1]) < 1)
    return h ? [[h, k] as const] : []
  })
for (let it = 0; it < 3; it++) {
  const m = matched()
  t = [
    m.reduce((a, [h, k]) => a + k[0] - h[0], 0) / m.length,
    m.reduce((a, [h, k]) => a + k[1] - h[1], 0) / m.length,
  ]
}
const m = matched()
if (process.env.DEBUG)
  console.log(
    '  phím chưa khớp:',
    getLayout('tklf13', {})
      .keys.filter((_, i) => !m.some(([, k]) => k === keys[i]))
      .map((k) => `${k.label}(${k.w}u)`)
      .join(' '),
  )
const err = Math.max(...m.map(([h, k]) => Math.hypot(h[0] + t[0] - k[0], h[1] + t[1] - k[1])))
console.log(
  `${switchHoles.length} lỗ switch, ${m.length} / ${keys.length} phím khớp lỗ 14mm (lệch tối đa ${err.toFixed(2)}mm)`,
)
if (m.length < keys.length * 0.5) throw new Error('Lỗ switch không khớp layout TKL F13')

if (process.env.DUMP)
  fs.writeFileSync(
    process.env.DUMP,
    JSON.stringify(holes.map((l) => l.map(([x, z]) => [x + t[0], z + t[1]]))),
  )
// lưới plate 3D lấy từ STEP lắp ráp (PLATE_STANDARD: cùng hệ toạ độ với DWG, có tai top mount + rãnh flex, dày 1.5mm, mặt trên z = 0)
// → hệ board: x + t.x, y = z (mặt trên ở 0), z game = −y + t.z (phép xoay thật, pháp tuyến xoay theo)
const occt = await occtimportjs()
const step = occt.ReadStepFile(new Uint8Array(fs.readFileSync(STEP)), null)
const mesh = step.meshes.find((m: { name: string }) => m.name === 'PLATE_STANDARD')
if (!mesh) throw new Error('STEP không có PLATE_STANDARD')
const src = mesh.attributes.position.array as number[]
const nsrc = mesh.attributes.normal.array as number[]
const pos = new Float32Array(src.length)
const nor = new Float32Array(src.length)
for (let i = 0; i < src.length; i += 3) {
  pos.set([src[i] + t[0], src[i + 2], -src[i + 1] + t[1]], i)
  nor.set([nsrc[i], nsrc[i + 2], -nsrc[i + 1]], i)
}
// tên scene khác tên node: trùng tên thì GLTFLoader đổi node thành "plate_1" (nodes.plate thành Group rỗng)
const doc = new Document()
const buf = doc.createBuffer()
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf))
  .setIndices(
    doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint32Array(mesh.index.array))
      .setBuffer(buf),
  )
doc
  .createScene('duality-plate')
  .addChild(doc.createNode('plate').setMesh(doc.createMesh('plate').addPrimitive(prim)))
await new NodeIO().write(OUT, doc)
const xs = [...pos].filter((_, i) => i % 3 === 0)
const zs = [...pos].filter((_, i) => i % 3 === 2)
console.log(
  `plate ${(Math.max(...xs) - Math.min(...xs)).toFixed(1)} × ${(Math.max(...zs) - Math.min(...zs)).toFixed(1)}mm, dời ${t.map((v) => v.toFixed(2))}`,
)
console.log(`✔ ${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`)
process.exit(0)
