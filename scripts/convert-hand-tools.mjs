// Chuyển model dụng cụ cầm tay sang GLB cho game.
// Dùng: bun run convert:hand-tools
//
// - assets/tools/hand/electric_screwdriver__tool.glb ("Electric Screwdriver_ Tool",
//   MugoflighterfluidArt, Sketchfab, CC BY 4.0): tua vít điện dạng súng, các node xoay lệch.
//   Gộp transform vào đỉnh, xoay cho trục mũi vít thành +y, mũi ở gốc, tay cầm chĩa +x.
//   Tách 2 node: "bit" (mũi + đầu kẹp, quay khi vặn) và "body" (thân, cò, tay cầm). Dài ~1.45 đơn vị.
// - assets/tools/hand/MX_opener_V1.5.stl (STL nhị phân, mm, Z lên; chưa rõ giấy phép, dùng cá nhân):
//   dụng cụ mở switch MX. Căn tâm, đáy ở y = 0, giữ đơn vị mm
import fs from 'node:fs'
import { Document, NodeIO } from '@gltf-transform/core'

const SRC = 'assets/tools/hand'
const OUT = 'public/models/tools'
fs.mkdirSync(OUT, { recursive: true })

const io = new NodeIO()

// ---------- vector / ma trận nhỏ ----------
const sub = (a, b) => a.map((x, i) => x - b[i])
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a) => {
  const l = Math.hypot(...a) || 1
  return a.map((x) => x / l)
}
/** điểm qua ma trận cột (glTF mat4) */
const mulPoint = (m, p) =>
  [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r])
/** pháp tuyến: nghịch đảo chuyển vị của 3x3 */
function normalMatrix(m) {
  const a = [m[0], m[1], m[2]]
  const b = [m[4], m[5], m[6]]
  const c = [m[8], m[9], m[10]]
  // cột của (M^-1)^T = các tích chéo / định thức
  const det = dot(a, cross(b, c))
  return [cross(b, c), cross(c, a), cross(a, b)].map((v) => v.map((x) => x / det))
}
const mulNormal = (n, v) =>
  norm([0, 1, 2].map((r) => n[0][r] * v[0] + n[1][r] * v[1] + n[2][r] * v[2]))

// ---------- tua vít điện ----------
{
  const src = await io.read(`${SRC}/electric_screwdriver__tool.glb`)
  /** gom đỉnh theo nhóm (bit / body) và vật liệu */
  const parts = { bit: new Map(), body: new Map() }
  const drill = []
  for (const node of src.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    const m = node.getWorldMatrix()
    const nm = normalMatrix(m)
    const group = /bit/i.test(node.getName()) ? 'bit' : 'body'
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const nor = prim.getAttribute('NORMAL')
      const idx = prim.getIndices()
      const mat = prim.getMaterial()
      const bucket = parts[group].get(mat) ?? { P: [], N: [], I: [] }
      parts[group].set(mat, bucket)
      const base = bucket.P.length / 3
      for (let i = 0; i < pos.getCount(); i++) {
        const p = mulPoint(m, pos.getElement(i, []))
        bucket.P.push(...p)
        bucket.N.push(...mulNormal(nm, nor.getElement(i, [])))
        if (/^Drill bit/.test(node.getName())) drill.push(p)
      }
      const n = idx ? idx.getCount() : pos.getCount()
      for (let i = 0; i < n; i++) bucket.I.push(base + (idx ? idx.getScalar(i) : i))
    }
  }

  // trục mũi vít: hướng phân tán lớn nhất của các đỉnh mũi (lặp luỹ thừa trên ma trận hiệp phương sai)
  const mean = (pts) => [0, 1, 2].map((a) => pts.reduce((s, p) => s + p[a], 0) / pts.length)
  const dc = mean(drill)
  const cov = [0, 1, 2].map((r) =>
    [0, 1, 2].map((c) => drill.reduce((s, p) => s + (p[r] - dc[r]) * (p[c] - dc[c]), 0)),
  )
  let axis = [1, 0.3, 0.2]
  for (let k = 0; k < 50; k++) axis = norm([0, 1, 2].map((r) => dot(cov[r], axis)))
  const allBody = [...parts.body.values()].flatMap((b) =>
    Array.from({ length: b.P.length / 3 }, (_, i) => b.P.slice(i * 3, i * 3 + 3)),
  )
  const bc = mean(allBody)
  // trục hướng từ mũi về thân
  if (dot(sub(bc, dc), axis) < 0) axis = axis.map((x) => -x)
  const tipT = Math.min(...drill.map((p) => dot(sub(p, dc), axis)))
  const tip = dc.map((x, i) => x + axis[i] * tipT)
  // tay cầm: phần lệch khỏi trục của trọng tâm thân → +x
  const off = sub(bc, tip)
  const grip = norm(
    sub(
      off,
      axis.map((x) => x * dot(off, axis)),
    ),
  )
  const ez = cross(grip, axis)
  // toạ độ mới: x = grip, y = axis, z = ez
  const toLocal = (p) => {
    const d = sub(p, tip)
    return [dot(d, grip), dot(d, axis), dot(d, ez)]
  }
  const toLocalN = (n) => [dot(n, grip), dot(n, axis), dot(n, ez)]
  let maxY = 0
  for (const g of Object.values(parts))
    for (const b of g.values())
      for (let i = 0; i < b.P.length; i += 3) maxY = Math.max(maxY, toLocal(b.P.slice(i, i + 3))[1])
  const scale = 1.45 / maxY

  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene('screwdriver')
  const mats = new Map()
  const matOf = (m) => {
    if (!mats.has(m))
      mats.set(
        m,
        doc
          .createMaterial(m.getName())
          .setBaseColorFactor(m.getBaseColorFactor())
          .setMetallicFactor(m.getMetallicFactor())
          .setRoughnessFactor(m.getRoughnessFactor()),
      )
    return mats.get(m)
  }
  for (const [name, group] of Object.entries(parts)) {
    const mesh = doc.createMesh(name)
    for (const [m, b] of group) {
      const P = new Float32Array(b.P.length)
      const N = new Float32Array(b.N.length)
      for (let i = 0; i < b.P.length; i += 3) {
        P.set(
          toLocal(b.P.slice(i, i + 3)).map((x) => x * scale),
          i,
        )
        N.set(toLocalN(b.N.slice(i, i + 3)), i)
      }
      const prim = doc
        .createPrimitive()
        .setAttribute(
          'POSITION',
          doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer),
        )
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
        .setIndices(
          doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(b.I)).setBuffer(buffer),
        )
        .setMaterial(matOf(m))
      mesh.addPrimitive(prim)
    }
    scene.addChild(doc.createNode(name).setMesh(mesh))
  }
  await io.write(`${OUT}/electric-screwdriver.glb`, doc)
  console.log('electric-screwdriver.glb', {
    axis: axis.map((x) => +x.toFixed(3)),
    scale: +scale.toFixed(4),
  })
}

// ---------- opener MX (STL) ----------
{
  const buf = fs.readFileSync(`${SRC}/MX_opener_V1.5.stl`)
  const count = buf.readUInt32LE(80)
  const P = new Float32Array(count * 9)
  const N = new Float32Array(count * 9)
  for (let t = 0; t < count; t++) {
    const o = 84 + t * 50
    // Z lên → Y lên: (x, y, z) → (x, z, -y)
    const v = [0, 1, 2].map((k) => {
      const b = o + 12 + k * 12
      return [buf.readFloatLE(b), buf.readFloatLE(b + 8), -buf.readFloatLE(b + 4)]
    })
    const n = norm(cross(sub(v[1], v[0]), sub(v[2], v[0])))
    for (let k = 0; k < 3; k++) {
      P.set(v[k], t * 9 + k * 3)
      N.set(n, t * 9 + k * 3)
    }
  }
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < P.length; i += 3)
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], P[i + a])
      hi[a] = Math.max(hi[a], P[i + a])
    }
  const shift = [(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]
  for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) P[i + a] -= shift[a]
  const doc = new Document()
  const buffer = doc.createBuffer()
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer))
    .setMaterial(
      doc
        .createMaterial('opener')
        .setBaseColorFactor([0.55, 0.06, 0.05, 1])
        .setMetallicFactor(0)
        .setRoughnessFactor(0.55),
    )
  doc
    .createScene('opener')
    .addChild(doc.createNode('opener').setMesh(doc.createMesh('opener').addPrimitive(prim)))
  await io.write(`${OUT}/mx-opener.glb`, doc)
  console.log('mx-opener.glb', {
    tris: count,
    size_mm: hi.map((x, a) => +(x - lo[a]).toFixed(1)),
  })
}
