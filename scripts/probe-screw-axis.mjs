// Dò trục lỗ vít nghiêng của case CAD (Duality Horns): từ 1 điểm trong trụ đáy + hướng trục ước lượng, dịch gốc trong mặt cắt ngang
// tìm đường có khoảng hở tới nắp (SOLID) lớn nhất = tâm lỗ, rồi in khoảng hở dọc trục (nắp / đáy): lỗ ren đáy r ~1,1 · lỗ xuyên nắp
// r ~1,5 · hốc đầu vít r ~2,7–3 · ô hở. Đầu vít = đầu hốc (chỗ hở nhảy từ ~1,5 lên ~2,7) → chép vào `screwHeads` convert-user-cases.mjs.
// Dùng: node scripts/probe-screw-axis.mjs "[x, y, z, dy, dz]" (mm hệ CAD STEP; hướng trục đi lên trong mặt yz)
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
const occt = await occtimportjs()
const r = occt.ReadStepFile(
  new Uint8Array(fs.readFileSync('assets/keyboards/duality-horns/duality_horns_v1_asm v11.step')),
  null,
)
const load = (name) => {
  const m = r.meshes.find((m) => m.name === name)
  const P = m.attributes.position.array,
    I = m.index.array
  const T = []
  for (let i = 0; i < I.length; i += 3)
    T.push([0, 1, 2].map((k) => [P[I[i + k] * 3], P[I[i + k] * 3 + 1], P[I[i + k] * 3 + 2]]))
  return T
}
const SOLID = load('SOLID'),
  BOTTOM = load('BOTTOM')
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
// khoảng cách điểm – tam giác (Ericson)
function ptTri(p, [a, b, c]) {
  const ab = sub(b, a),
    ac = sub(c, a),
    ap = sub(p, a)
  const d1 = dot(ab, ap),
    d2 = dot(ac, ap)
  let q
  if (d1 <= 0 && d2 <= 0) q = a
  else {
    const bp = sub(p, b)
    const d3 = dot(ab, bp),
      d4 = dot(ac, bp)
    if (d3 >= 0 && d4 <= d3) q = b
    else {
      const vc = d1 * d4 - d3 * d2
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3)
        q = [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]
      } else {
        const cp = sub(p, c)
        const d5 = dot(ab, cp),
          d6 = dot(ac, cp)
        if (d6 >= 0 && d5 <= d6) q = c
        else {
          const vb = d5 * d2 - d1 * d6
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6)
            q = [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]
          } else {
            const va = d3 * d6 - d5 * d4
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6))
              q = [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]
            } else {
              const den = 1 / (va + vb + vc)
              const v = vb * den,
                w = vc * den
              q = [
                a[0] + ab[0] * v + ac[0] * w,
                a[1] + ab[1] * v + ac[1] * w,
                a[2] + ab[2] * v + ac[2] * w,
              ]
            }
          }
        }
      }
    }
  }
  return Math.hypot(...sub(p, q))
}
const clear = (p, tris) => {
  let m = Infinity
  for (const t of tris) {
    const d = ptTri(p, t)
    if (d < m) m = d
  }
  return m
}
const [x0, y0, z0, dy, dz] = JSON.parse(process.argv[2])
const d = [0, dy, dz].map((v, _, a) => v / Math.hypot(...a))
const near = (T) => T.filter((t) => t.some((q) => Math.hypot(q[0] - x0, q[1] - y0) < 25))
const S = near(SOLID),
  B = near(BOTTOM)
// mặt cắt ngang lỗ: e1 = x, e2 = d × x
const e2 = [0, d[2], -d[1]]
let best = null
for (let a = -3; a <= 3; a += 0.25)
  for (let b = -4; b <= 4; b += 0.25) {
    const o = [x0 + a, y0 + e2[1] * b, z0 + e2[2] * b]
    // khoảng hở nhỏ nhất dọc đoạn 4mm phía trên gốc (trong lỗ nắp)
    let m = Infinity
    for (let t = 0; t <= 6; t += 1) {
      const p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]
      m = Math.min(m, clear(p, S))
    }
    if (!best || m > best.m) best = { m, o, a, b }
  }
console.log('tâm lỗ', best.o.map((v) => v.toFixed(2)).join(','), 'hở', best.m.toFixed(2))
// dọc trục: khoảng hở theo t
const prof = []
for (let t = -8; t <= 22; t += 0.5) {
  const p = best.o.map((v, k) => v + d[k] * t)
  prof.push(`${t}:${clear(p, S).toFixed(1)}/${clear(p, B).toFixed(1)}`)
}
console.log(prof.join(' '))
