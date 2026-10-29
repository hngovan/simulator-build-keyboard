// Bản nhẹ của tua vít tay Poly Haven (assets/tools/polyhaven/screwdriver.glb, CC0): giữ nguyên khối (~3.4k tam giác),
// bỏ 3 texture 1024px (~1.45MB) — màu nền nướng vào màu đỉnh, tách 2 vật liệu thép / nhựa theo map metalness.
// Dùng: bun run convert:screwdriver-lite
import { Document, NodeIO } from '@gltf-transform/core'
import jpeg from 'jpeg-js'

const SRC = 'assets/tools/polyhaven/screwdriver.glb'
const OUT = 'public/models/room/screwdriver-lite.glb'

const io = new NodeIO()
const src = await io.read(SRC)
const node = src
  .getRoot()
  .listNodes()
  .find((n) => n.getMesh())
const prim = node.getMesh().listPrimitives()[0]
const mat = prim.getMaterial()
const decode = (tex) => jpeg.decode(tex.getImage(), { useTArray: true })
const diff = decode(mat.getBaseColorTexture())
const mr = decode(mat.getMetallicRoughnessTexture())

/** lấy trung bình 5×5 điểm quanh UV (mờ bớt vết xước / chữ) */
function sample(img, u, v) {
  const out = [0, 0, 0]
  let n = 0
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = Math.min(img.width - 1, Math.max(0, Math.round(u * img.width) + dx * 3))
      const y = Math.min(img.height - 1, Math.max(0, Math.round(v * img.height) + dy * 3))
      const i = (y * img.width + x) * 4
      for (let c = 0; c < 3; c++) out[c] += img.data[i + c] / 255
      n++
    }
  return out.map((c) => c / n)
}
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

const pos = prim.getAttribute('POSITION')
const nor = prim.getAttribute('NORMAL')
const uv = prim.getAttribute('TEXCOORD_0')
const idx = prim.getIndices()
const count = pos.getCount()
const color = []
const metal = []
for (let i = 0; i < count; i++) {
  const [u, v] = uv.getElement(i, [])
  color.push(sample(diff, u, v).map(toLinear))
  // glTF: kênh B = metalness
  metal.push(sample(mr, u, v)[2])
}

const doc = new Document()
const buffer = doc.createBuffer()
const mesh = doc.createMesh('screwdriver')
const parts = {
  metal: doc.createMaterial('thép').setMetallicFactor(1).setRoughnessFactor(0.32),
  plastic: doc.createMaterial('nhựa').setMetallicFactor(0).setRoughnessFactor(0.55),
}
for (const [kind, material] of Object.entries(parts)) {
  // tam giác thuộc phần nào theo metalness trung bình 3 đỉnh; gom lại đỉnh dùng tới
  const remap = new Map()
  const P = []
  const N = []
  const C = []
  const I = []
  for (let t = 0; t < idx.getCount(); t += 3) {
    const tri = [idx.getScalar(t), idx.getScalar(t + 1), idx.getScalar(t + 2)]
    const m = (metal[tri[0]] + metal[tri[1]] + metal[tri[2]]) / 3
    if (m > 0.5 !== (kind === 'metal')) continue
    for (const v of tri) {
      if (!remap.has(v)) {
        remap.set(v, remap.size)
        P.push(...pos.getElement(v, []))
        N.push(...nor.getElement(v, []))
        C.push(...color[v])
      }
      I.push(remap.get(v))
    }
  }
  if (!I.length) continue
  const acc = (type, arr, Ctor = Float32Array) =>
    doc.createAccessor().setType(type).setArray(new Ctor(arr)).setBuffer(buffer)
  mesh.addPrimitive(
    doc
      .createPrimitive()
      .setAttribute('POSITION', acc('VEC3', P))
      .setAttribute('NORMAL', acc('VEC3', N))
      .setAttribute('COLOR_0', acc('VEC3', C))
      .setIndices(acc('SCALAR', I, Uint16Array))
      .setMaterial(material),
  )
  console.log(`${kind}: ${I.length / 3} tam giác`)
}
const out = doc
  .createNode('screwdriver')
  .setMesh(mesh)
  .setTranslation(node.getTranslation())
  .setRotation(node.getRotation())
  .setScale(node.getScale())
doc.createScene().addChild(out)
await io.write(OUT, doc)
console.log(`✔ ${OUT}`)
