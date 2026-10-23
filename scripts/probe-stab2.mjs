// Kiểm tra điểm nằm trong / ngoài khối đặc (đếm số lần tia cắt mặt) dọc đường đi của móc dây
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'

const doc = await new NodeIO().read('public/models/stab.glb')
const meshes = {}
for (const node of doc.getRoot().listNodes()) {
  const prim = node.getMesh().listPrimitives()[0]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(prim.getAttribute('POSITION').getArray(), 3))
  if (prim.getIndices()) g.setIndex(new THREE.BufferAttribute(prim.getIndices().getArray(), 1))
  meshes[node.getName()] = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  )
}
const ray = new THREE.Raycaster()
const inside = (mesh, p) => {
  // bắn lên trên (+y) từ điểm; số mặt cắt lẻ = ở trong khối
  ray.set(p, new THREE.Vector3(0.0123, 1, 0.0071).normalize())
  return ray.intersectObject(mesh).length % 2 === 1
}
console.log(
  'stem tris',
  meshes.stem.geometry.attributes.position.count / 3,
  'housing tris',
  meshes.housing.geometry.attributes.position.count / 3,
)
for (const y of [0.6, 1.0, 1.6, 2.2, 3]) {
  let rowS = '',
    rowH = ''
  for (let z = -9; z <= 10.5; z += 0.5) {
    const p = new THREE.Vector3(0.05, y, z)
    rowS += inside(meshes.stem, p) ? '#' : '.'
    rowH += inside(meshes.housing, p) ? '#' : '.'
  }
  console.log(`y=${y}  stem    ${rowS}`)
  console.log(`y=${y}  housing ${rowH}`)
}
console.log('(trục z từ -9 → 10.5, mỗi ký tự 0.5mm; # = đặc)')
// mặt cắt ngang slider ở y = 1.6 (x: -2.2..2.2, z: -2.84..2.84)
console.log('\nmặt cắt slider ở y=1.6 (hàng = x, cột = z):')
for (let x = -2.1; x <= 2.1; x += 0.3) {
  let row = ''
  for (let z = -2.8; z <= 2.8; z += 0.3)
    row += inside(meshes.stem, new THREE.Vector3(x, 1.6, z)) ? '#' : '.'
  console.log(`x=${x.toFixed(1).padStart(4)} ${row}`)
}
console.log('\nmặt cắt slider ở x=0 (hàng = y, cột = z):')
for (let y = 10.5; y >= 0.3; y -= 0.6) {
  let row = ''
  for (let z = -2.8; z <= 2.8; z += 0.3)
    row += inside(meshes.stem, new THREE.Vector3(0.03, y, z)) ? '#' : '.'
  console.log(`y=${y.toFixed(1).padStart(4)} ${row}`)
}
