// Chuyển model stab từ STEP (CAD, Creo) sang 1 file GLB cho game.
// Dùng: node scripts/convert-stab.mjs
//
// Trong CAD: trục Z hướng lên, đơn vị mm, Z = 0 là mặt trên PCB.
//   D_1_25          → slider (stem)
//   WX_Z_4__1_1_25  → housing
//   PINGHENGGAN*    → dây
// Trong game: trục Y hướng lên, mm (game tự nhân MM để ra đơn vị u).
//   housing / stem: gốc = tâm slider (trên mặt PCB)
//   wire225 / wire625: gốc = tâm stab (giữa 2 slider)
import fs from 'node:fs'
import occtimportjs from 'occt-import-js'
import { Document, NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

const SOURCES = {
  '2.25u': 'assets/stab/Stabilizer-2.25u.stp',
  '6.25u': 'assets/stab/Stabilizer-6.25u.stp',
}
const OUT = 'public/models/stab/stab.glb'
const META = 'src/data/stabModel.json'

const occt = await occtimportjs()
const read = (path) => {
  const res = occt.ReadStepFile(new Uint8Array(fs.readFileSync(path)), null)
  if (!res.success) throw new Error(`Không đọc được ${path}`)
  return res.meshes
}

const center = (pos) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i])
    maxX = Math.max(maxX, pos[i])
    minY = Math.min(minY, pos[i + 1])
    maxY = Math.max(maxY, pos[i + 1])
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

// Đổi trục CAD (x, y, z-up) → game (x, y-up, z), dời gốc về (cx, cy). Trả về BufferGeometry đã hàn đỉnh
function transform(mesh, cx, cy) {
  const p = mesh.attributes.position.array
  const pos = new Float32Array(p.length)
  for (let i = 0; i < p.length; i += 3) {
    pos[i] = p[i] - cx
    pos[i + 1] = p[i + 2]
    pos[i + 2] = -(p[i + 1] - cy)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.index.array), 1))
  // hàn các đỉnh trùng giữa các mặt (file STEP tách rời từng mặt) để phép trừ khối chạy đúng
  const welded = mergeVertices(g, 1e-4)
  welded.computeVertexNormals()
  return welded
}

// Khối cắt (hệ mm của game)
const cylinderZ = (r, len, [x, y, z]) => {
  const g = new THREE.CylinderGeometry(r, r, len, 32)
  g.rotateX(Math.PI / 2)
  g.translate(x, y, z)
  return g
}
const box = ([w, h, d], [x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z)

// Trừ khối: file STEP gốc vẽ slider đặc + vách housing đặc, không có chỗ cho dây đi qua
function carve(geom, cutters) {
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  let result = new Brush(geom)
  for (const c of cutters) {
    c.computeVertexNormals()
    result = ev.evaluate(result, new Brush(c), SUBTRACTION)
  }
  return result.geometry
}

/** Pháp tuyến giữ cạnh sắc (> 30°), mặt cong vẫn mượt */
const shade = (geom) => toCreasedNormals(geom, Math.PI / 6)

// Đường đi của móc dây (đọc từ CAD): tâm ở x ≈ 0.06, y ≈ 1.62, chạy dọc trục z, dây dày 1.6mm
const WIRE_HOLE = { x: 0.06, y: 1.62, r: 0.95 }

const doc = new Document()
const buffer = doc.createBuffer()
const scene = doc.createScene('stab')
function addMesh(name, geom) {
  const g = shade(geom.index ? geom.toNonIndexed() : geom)
  const pos = new Float32Array(g.attributes.position.array)
  const nor = new Float32Array(g.attributes.normal.array)
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
}

const meta = { spans: {} }
let partsDone = false
for (const [size, path] of Object.entries(SOURCES)) {
  const meshes = read(path)
  const stems = meshes.filter((m) => m.name.startsWith('D_1'))
  const housings = meshes.filter((m) => m.name.startsWith('WX_Z'))
  const wire = meshes.find((m) => m.name.startsWith('PINGHENGGAN'))
  if (stems.length !== 2 || housings.length !== 2 || !wire)
    throw new Error(`Cấu trúc ${path} không như mong đợi`)
  // 2 slider: lấy tâm từng cái, tâm stab ở giữa
  const [a, b] = stems.map((m) => center(m.attributes.position.array)).sort((p, q) => q[0] - p[0])
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  meta.spans[size] = +((a[0] - b[0]) / 2).toFixed(3)
  // housing + slider giống nhau ở cả 2 file: chỉ lấy 1 lần, từ cái bên phải
  if (!partsDone) {
    const right = (list) => list.find((m) => center(m.attributes.position.array)[0] > mid[0])
    // housing: khoét khe ở vách giữa hốc slider và rãnh dây phía trước
    addMesh(
      'housing',
      carve(transform(right(housings), a[0], a[1]), [
        box([2.2, 2.2, 2.6], [WIRE_HOLE.x, WIRE_HOLE.y, 4.05]),
      ]),
    )
    // slider: khoét lỗ cắm dây xuyên ngang ở đáy
    addMesh(
      'stem',
      carve(transform(right(stems), a[0], a[1]), [
        cylinderZ(WIRE_HOLE.r, 10, [WIRE_HOLE.x, WIRE_HOLE.y, 0]),
      ]),
    )
    partsDone = true
  }
  addMesh(`wire${size.replace('.', '').replace('u', '')}`, transform(wire, mid[0], mid[1])) // wire225, wire625
}

await new NodeIO().write(OUT, doc)
fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n')
console.log(`Đã ghi ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB) và ${META}:`, meta)
