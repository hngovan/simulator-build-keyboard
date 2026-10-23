// Dò lỗ / rãnh trong model stab bằng cách bắn tia xuyên qua chi tiết
// Dùng: node scripts/probe-stab.mjs
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'

const doc = await new NodeIO().read('public/models/stab.glb')
const meshes = {}
for (const node of doc.getRoot().listNodes()) {
  const prim = node.getMesh().listPrimitives()[0]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(prim.getAttribute('POSITION').getArray(), 3))
  if (prim.getIndices()) g.setIndex(new THREE.BufferAttribute(prim.getIndices().getArray(), 1))
  g.computeBoundingBox()
  meshes[node.getName()] = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  )
}

const ray = new THREE.Raycaster()
// Bắn tia dọc trục `axis` qua điểm (a, b) của 2 trục còn lại; trả về các đoạn đặc (vào → ra)
function solidSpans(mesh, axis, a, b) {
  const o = new THREE.Vector3()
  const d = new THREE.Vector3()
  const others = ['x', 'y', 'z'].filter((k) => k !== axis)
  o[axis] = -100
  o[others[0]] = a
  o[others[1]] = b
  d[axis] = 1
  ray.set(o, d)
  const hits = ray.intersectObject(mesh).map((h) => +h.point[axis].toFixed(2))
  const uniq = [...new Set(hits)]
  return uniq
}

for (const name of ['stem', 'housing']) {
  const bb = meshes[name].geometry.boundingBox
  console.log(
    `\n== ${name} bbox`,
    bb.min.toArray().map((v) => +v.toFixed(2)),
    bb.max.toArray().map((v) => +v.toFixed(2)),
  )
  // tia dọc trục z (xuyên từ trước ra sau) ở nhiều độ cao, x = 0
  for (const y of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5])
    console.log(`  tia z  @x=0 y=${y}:`, solidSpans(meshes[name], 'z', 0, y).join(' '))
  // tia dọc trục x (xuyên ngang) ở nhiều độ cao, z = 0
  for (const y of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5])
    console.log(`  tia x  @z=0 y=${y}:`, solidSpans(meshes[name], 'x', 0, y).join(' '))
}

// đầu móc dây 2.25u: tìm các đỉnh gần slider phải (x ≈ 11.9)
const wp = meshes.wire225.geometry.attributes.position
const near = []
for (let i = 0; i < wp.count; i++) {
  const x = wp.getX(i),
    y = wp.getY(i),
    z = wp.getZ(i)
  if (x > 8) near.push([x, y, z])
}
const by = (k) => near.map((p) => p[k])
console.log(
  '\n== đầu móc dây bên phải (x > 8): x',
  Math.min(...by(0)).toFixed(2),
  '→',
  Math.max(...by(0)).toFixed(2),
  '| y',
  Math.min(...by(1)).toFixed(2),
  '→',
  Math.max(...by(1)).toFixed(2),
  '| z',
  Math.min(...by(2)).toFixed(2),
  '→',
  Math.max(...by(2)).toFixed(2),
)
// lát cắt theo z để thấy hình dạng móc
for (const z of [-3, -2, -1, 0, 1, 2, 4, 6, 8, 9]) {
  const pts = near.filter((p) => Math.abs(p[2] - z) < 0.5)
  if (pts.length)
    console.log(
      `  z≈${z}: x ${Math.min(...pts.map((p) => p[0])).toFixed(2)}..${Math.max(...pts.map((p) => p[0])).toFixed(2)}`,
    )
}
