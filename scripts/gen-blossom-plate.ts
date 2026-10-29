// Plate gasket của Blossom (doughnut923/Blossom, MIT): assets/keyboards/blossom/plate/plate.dxf → src/data/generated/plateBlossom.ts
// DXF chỉ có LINE rời (mm, y hướng lên): nối đầu mút thành vòng kín, vòng lớn nhất = viền ngoài, còn lại = lỗ.
// Căn theo layout Alice của game: lỗ switch (14 × 14mm, kể cả xoay) khớp tâm phím `getLayout('alice')` (bình phương tối thiểu).
// Tai gasket = phần viền plate lòi ra ngoài viền PCB → dải gasket dọc hết tai (tâm, dài, góc) cho `CASES.aliceAlu.gaskets`.
// Dùng: bun run gen:plate-blossom
import fs from 'node:fs'
import DxfParser from 'dxf-parser'
import { getLayout } from '../src/data/layouts'

type P = [number, number]
const U = 19.05
const SRC = 'assets/keyboards/blossom/plate/plate.dxf'
const OUT = 'src/data/generated/plateBlossom.ts'

const dxf = new DxfParser().parseSync(fs.readFileSync(SRC, 'utf8'))!
const segs = dxf.entities
  .filter((e) => e.type === 'LINE')
  .map((e) => (e as unknown as { vertices: { x: number; y: number }[] }).vertices)
  // DXF y lên = phía sau → z game = −y
  .map((v) => [
    [v[0].x, -v[0].y],
    [v[1].x, -v[1].y],
  ]) as [P, P][]

// nối đoạn thành vòng: tra đầu mút theo lưới 0.01mm
const key = (p: P) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`
const ends = new Map<string, number[]>()
segs.forEach((s, i) => s.forEach((p) => ends.set(key(p), [...(ends.get(key(p)) ?? []), i])))
const used = new Uint8Array(segs.length)
const loops: P[][] = []
for (let i = 0; i < segs.length; i++) {
  if (used[i]) continue
  used[i] = 1
  const loop: P[] = [segs[i][0]]
  let end = segs[i][1]
  while (key(end) !== key(loop[0])) {
    loop.push(end)
    const j = (ends.get(key(end)) ?? []).find((k) => !used[k])
    if (j === undefined) throw new Error(`Vòng hở tại ${end}`)
    used[j] = 1
    end = key(segs[j][0]) === key(end) ? segs[j][1] : segs[j][0]
  }
  loops.push(loop)
}
const area = (l: P[]) =>
  Math.abs(
    l.reduce((a, p, i) => a + p[0] * l[(i + 1) % l.length][1] - l[(i + 1) % l.length][0] * p[1], 0),
  ) / 2
// DXF có đoạn dài 0 (vòng 1 điểm) và điểm trùng liền nhau: bỏ, không thì tam giác hoá (earcut) vỡ
const clean = loops
  .map((l) => l.filter((p, i) => key(p) !== key(l[(i + 1) % l.length])))
  .filter((l) => l.length >= 3 && area(l) > 0.5)
clean.sort((a, b) => area(b) - area(a))
const [outer, ...holes] = clean

// lỗ switch: diện tích ~14 × 14mm (lỗ có khe mở switch / xoay vẫn trong khoảng này)
const centroid = (l: P[]) => [
  l.reduce((a, p) => a + p[0], 0) / l.length,
  l.reduce((a, p) => a + p[1], 0) / l.length,
]
const switchHoles = holes.filter((l) => area(l) > 180 && area(l) < 215).map(centroid)
const keys = getLayout('alice', {}).keys.map((k) => [k.cx * U, k.cz * U])
// dời DXF cho tâm lỗ switch trùng tâm phím: lặp ghép cặp gần nhất rồi lấy độ lệch trung bình
let t = [
  keys.reduce((a, k) => a + k[0], 0) / keys.length -
    switchHoles.reduce((a, h) => a + h[0], 0) / switchHoles.length,
  keys.reduce((a, k) => a + k[1], 0) / keys.length -
    switchHoles.reduce((a, h) => a + h[1], 0) / switchHoles.length,
]
let err = 0
for (let it = 0; it < 5; it++) {
  const pairs = switchHoles.map((h) => {
    const p = [h[0] + t[0], h[1] + t[1]]
    const k = keys.reduce((b, k) =>
      Math.hypot(k[0] - p[0], k[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? k : b,
    )
    return [h, k]
  })
  t = [
    pairs.reduce((a, [h, k]) => a + k[0] - h[0], 0) / pairs.length,
    pairs.reduce((a, [h, k]) => a + k[1] - h[1], 0) / pairs.length,
  ]
  err = Math.max(...pairs.map(([h, k]) => Math.hypot(h[0] + t[0] - k[0], h[1] + t[1] - k[1])))
}
console.log(
  `${loops.length} vòng, ${switchHoles.length} lỗ switch / ${keys.length} phím, lệch tối đa ${err.toFixed(2)}mm`,
)
if (err > 0.5) throw new Error('Lỗ switch không khớp layout Alice')

const move = (l: P[]): P[] => l.map(([x, z]) => [+(x + t[0]).toFixed(3), +(z + t[1]).toFixed(3)])
const plate = { outline: move(outer), holes: holes.map(move) }

// Dải gasket: đi dọc viền plate từng 1mm; chỗ nào phần plate từ 1mm tới 5mm tính từ mép vào (bề ngang dải 4mm) nằm trọn trên
// plate và ngoài viền PCB (dải mặt dưới không đè PCB) thì dán được. Mỗi đoạn liền, cùng hướng (lệch < 8°) = 1 dải bám mép tai
const inPoly = (poly: P[], x: number, z: number) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c
  }
  return c
}
const pcb = getLayout('alice', {}).outline!.map(([x, z]) => [x * U, z * U] as P)
const onPlate = (x: number, z: number) =>
  inPoly(plate.outline, x, z) && !plate.holes.some((h) => inPoly(h, x, z))
// lấy mẫu viền mỗi 1mm (viền DXF có cung chia nhiều đoạn ngắn)
const ring = plate.outline
const samples: P[] = []
for (let i = 0; i < ring.length; i++) {
  const [ax, az] = ring[i]
  const [bx, bz] = ring[(i + 1) % ring.length]
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az)))
  for (let k = 0; k < n; k++) samples.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n])
}
const N = samples.length
const at = (i: number) => samples[((i % N) + N) % N]
const runs: { pts: P[]; dir: P }[] = []
let cur: { pts: P[]; dir: P } | null = null
for (let i = 0; i < N; i++) {
  // hướng mép: trung bình ±3mm; pháp tuyến quay vào trong plate
  const [px, pz] = at(i)
  const [ax, az] = at(i - 3)
  const [bx, bz] = at(i + 3)
  const l = Math.hypot(bx - ax, bz - az) || 1
  const dir: P = [(bx - ax) / l, (bz - az) / l]
  let nrm: P = [-dir[1], dir[0]]
  if (!onPlate(px + nrm[0] * 1, pz + nrm[1] * 1)) nrm = [dir[1], -dir[0]]
  const ok = [1, 2, 3, 4, 5].every((d) => {
    const x = px + nrm[0] * d
    const z = pz + nrm[1] * d
    return onPlate(x, z) && !inPoly(pcb, x, z)
  })
  const bend =
    cur && Math.abs(dir[0] * cur.dir[1] - dir[1] * cur.dir[0]) > Math.sin((8 * Math.PI) / 180)
  if (!ok || bend) {
    if (cur) runs.push(cur)
    cur = null
  }
  if (ok) {
    cur ??= { pts: [], dir }
    cur.pts.push([px + nrm[0] * 3, pz + nrm[1] * 3])
  }
}
if (cur) runs.push(cur)
// đoạn đầu / cuối vòng có thể là 1 dải bị cắt đôi ở điểm bắt đầu: không gộp (viền Blossom bắt đầu giữa tai thì sẽ thấy 2 dải)
const gaskets = runs
  // bỏ đoạn vụn (< 12mm); 2 mép bên (plate rộng hơn PCB ~6mm) cũng dán 1 dải mỗi bên; chừa 1mm mỗi đầu
  .filter((r) => r.pts.length >= 12)
  .map((r): [number, number, number, number] => {
    const a = r.pts[0]
    const b = r.pts[r.pts.length - 1]
    return [
      +((a[0] + b[0]) / 2).toFixed(1),
      +((a[1] + b[1]) / 2).toFixed(1),
      +(Math.hypot(b[0] - a[0], b[1] - a[1]) - 2).toFixed(1),
      +Math.atan2(b[1] - a[1], b[0] - a[0]).toFixed(4),
    ]
  })
  .sort((a, b) => a[1] - b[1] || a[0] - b[0])
console.log('tai gasket [x, z, dài, góc]', JSON.stringify(gaskets))

fs.writeFileSync(
  OUT,
  `// Sinh tự động bởi scripts/gen-blossom-plate.ts từ ${SRC} (doughnut923/Blossom, MIT) — không sửa tay.\n` +
    `// mm, [x, z] theo tâm board (z dương = phía trước), đã căn lỗ switch khớp layout Alice\n` +
    `export const BLOSSOM_PLATE: { outline: [number, number][]; holes: [number, number][][] } = ${JSON.stringify(plate)}\n` +
    `/** dải gasket dọc hết tai plate: [x, z, dài (mm), góc trục dài so với trục x (rad)] */\n` +
    `export const BLOSSOM_GASKETS: [number, number, number, number][] = ${JSON.stringify(gaskets)}\n`,
)
console.log(`✔ ${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`)
