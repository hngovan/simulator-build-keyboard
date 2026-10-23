// Chuyển model switch Cherry MX từ STEP sang GLB cho game.
// Dùng: bun run convert:switch
//
// File STEP gốc không đặt tên chi tiết → nhận dạng theo khung bao (mm, trục Y hướng lên, Y = 0 ≈ mặt trên plate):
//   bottom : housing dưới (rộng 15.6, từ -4.8 → 0.74)
//   top    : housing trên (rộng 14, từ 0.74 → 6.3)
//   stemTop: đầu stem + chữ thập (file gốc chỉ có phần này, thân stem game tự dựng)
//   pegs   : chốt định vị giữa + 2 chốt nhựa (switch 5 chân)
//   pins   : 2 chân kim loại
// Gốc toạ độ dời về tâm switch (chốt giữa).
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import {
  mergeGeometries,
  mergeVertices,
  toCreasedNormals,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

const SRC = 'assets/cad/switch.step'
const OUT = 'public/models/switch.glb'

const occt = await occtimportjs()
const res = occt.ReadStepFile(new Uint8Array(fs.readFileSync(SRC)), null)
if (!res.success) throw new Error('Không đọc được file STEP')

const toGeom = (m) => {
  const g = new THREE.BufferGeometry()
  g.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(m.attributes.position.array), 3),
  )
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(m.index.array), 1))
  g.computeBoundingBox()
  return g
}
const geoms = res.meshes.map(toGeom)
const size = (g) => g.boundingBox.getSize(new THREE.Vector3())
const minY = (g) => g.boundingBox.min.y

const groups = { bottom: [], top: [], stemTop: [], pegs: [], pins: [] }
for (const g of geoms) {
  const s = size(g)
  if (s.x > 15) groups.bottom.push(g)
  else if (s.x > 13) groups.top.push(g)
  else if (minY(g) > 5) groups.stemTop.push(g)
  else if (s.x < 1.2) groups.pins.push(g)
  else groups.pegs.push(g)
}
for (const [k, list] of Object.entries(groups))
  if (!list.length) throw new Error(`Không tìm thấy chi tiết ${k}`)

// tâm switch = tâm chốt định vị giữa (chốt to nhất trong nhóm pegs)
const post = groups.pegs.reduce((a, b) => (size(a).x > size(b).x ? a : b))
const c = post.boundingBox.getCenter(new THREE.Vector3())

// File gốc vẽ housing đặc (không có hốc bên trong) → khoét hốc trượt cho stem + giếng lò xo
// Kích thước theo stem MX: thân 7.2 × 5.6mm (khớp lỗ trên housing trên)
const CAVITY = { halfX: 3.65, halfZ: 2.85 }
function carve(geom, cutters) {
  const welded = mergeVertices(geom, 1e-4)
  welded.computeVertexNormals()
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  let r = new Brush(welded)
  for (const c of cutters) {
    c.computeVertexNormals()
    r = ev.evaluate(r, new Brush(c), SUBTRACTION)
  }
  return r.geometry
}
const box = ([w, h, d], [x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)
const CUTS = {
  // housing dưới: hốc trượt từ mặt trên xuống sâu 3.9mm + giếng lò xo Ø5.6
  bottom: [
    box([CAVITY.halfX * 2, 4.8, CAVITY.halfZ * 2], [0, -1.45, 0]),
    new THREE.CylinderGeometry(2.8, 2.8, 6, 32).translate(0, -2.4, 0),
  ],
  // housing trên: thông hốc từ đáy lên tới lỗ đầu stem
  top: [box([CAVITY.halfX * 2 - 0.06, 3, CAVITY.halfZ * 2 - 0.1], [0, 1.9, 0])],
}

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene('switch')
for (const [name, list] of Object.entries(groups)) {
  let merged = mergeGeometries(list.map((g) => g.clone().translate(-c.x, 0, -c.z)))
  if (CUTS[name]) merged = carve(merged, CUTS[name])
  const g = toCreasedNormals(merged.index ? merged.toNonIndexed() : merged, Math.PI / 6)
  const prim = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(g.attributes.position.array))
        .setBuffer(buffer),
    )
    .setAttribute(
      'NORMAL',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(g.attributes.normal.array))
        .setBuffer(buffer),
    )
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
  g.computeBoundingBox()
  const b = g.boundingBox
  console.log(
    name.padEnd(8),
    'x',
    b.min.x.toFixed(2),
    '..',
    b.max.x.toFixed(2),
    '| y',
    b.min.y.toFixed(2),
    '..',
    b.max.y.toFixed(2),
    '| z',
    b.min.z.toFixed(2),
    '..',
    b.max.z.toFixed(2),
  )
}
await new NodeIO().write(OUT, doc)
console.log(
  `Đã ghi ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB), tâm switch dời từ x=${c.x.toFixed(2)} z=${c.z.toFixed(2)}`,
)
