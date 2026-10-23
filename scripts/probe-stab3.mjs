// Tìm thành trong hốc housing (chỗ slider trượt) và các đoạn thân slider
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'

const doc = await new NodeIO().read('public/models/stab.glb')
const meshes = {}
for (const node of doc.getRoot().listNodes()) {
  const prim = node.getMesh().listPrimitives()[0]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(prim.getAttribute('POSITION').getArray(), 3))
  meshes[node.getName()] = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  )
}
const ray = new THREE.Raycaster()
const hits = (mesh, o, d) => {
  ray.set(o, d)
  return [...new Set(ray.intersectObject(mesh).map((h) => +h.distance.toFixed(2)))].map(
    (t) =>
      +o
        .clone()
        .addScaledVector(d, t)
        .toArray()
        .map((v) => v.toFixed(2))
        .join(','),
  )
}
// housing: bắn tia ngang trục x ở nhiều z, y → toạ độ x các mặt gặp
console.log('housing: tia dọc x (in ra x của các mặt cắt)')
for (const y of [6.5, 5, 3.5])
  for (const z of [-2.5, -1.5, 0, 1.5, 2.5]) {
    ray.set(new THREE.Vector3(-20, y, z), new THREE.Vector3(1, 0, 0))
    const xs = [...new Set(ray.intersectObject(meshes.housing).map((h) => +h.point.x.toFixed(2)))]
    console.log(`  y=${y} z=${z}: ${xs.join('  ')}`)
  }
console.log('housing: tia dọc z ở x=±1.8 (thành hốc theo z)')
for (const y of [6.5, 4])
  for (const x of [-1.8, 1.8]) {
    ray.set(new THREE.Vector3(x, y, -20), new THREE.Vector3(0, 0, 1))
    console.log(
      `  y=${y} x=${x}: ${[...new Set(ray.intersectObject(meshes.housing).map((h) => +h.point.z.toFixed(2)))].join('  ')}`,
    )
  }
// slider: bề rộng theo x ở các độ cao (thân rộng, phần chữ thập hẹp)
console.log('slider: bề rộng x theo độ cao (z = 1.3)')
for (let y = 0.5; y <= 10.6; y += 0.5) {
  ray.set(new THREE.Vector3(-20, y, 1.3), new THREE.Vector3(1, 0, 0))
  const xs = ray.intersectObject(meshes.stem).map((h) => +h.point.x.toFixed(2))
  console.log(`  y=${y.toFixed(1)}: ${xs.length ? Math.min(...xs) + '..' + Math.max(...xs) : '-'}`)
}
