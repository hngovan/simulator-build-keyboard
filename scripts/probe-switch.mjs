// Dò hốc trong housing switch (chỗ stem trượt) bằng tia xuyên ngang
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
const doc = await new NodeIO().read('public/models/switch/switch.glb')
const m = {}
for (const n of doc.getRoot().listNodes()) {
  const g = new THREE.BufferGeometry()
  g.setAttribute(
    'position',
    new THREE.BufferAttribute(
      n.getMesh().listPrimitives()[0].getAttribute('POSITION').getArray(),
      3,
    ),
  )
  m[n.getName()] = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
}
const ray = new THREE.Raycaster()
const cut = (name, o, d, axis) => {
  ray.set(o, d)
  return [...new Set(ray.intersectObject(m[name]).map((h) => +h.point[axis].toFixed(2)))].join(' ')
}
for (const name of ['bottom', 'top']) {
  console.log(`== ${name}`)
  for (const y of name === 'bottom' ? [-0.5, -2, -3.5] : [1.5, 3, 4.5, 6])
    for (const z of [-2, 0, 2])
      console.log(
        `  tia x y=${y} z=${z}:`,
        cut(name, new THREE.Vector3(-20, y, z), new THREE.Vector3(1, 0, 0), 'x'),
      )
  for (const y of name === 'bottom' ? [-0.5, -2] : [3, 5])
    for (const x of [0, 2.5])
      console.log(
        `  tia z y=${y} x=${x}:`,
        cut(name, new THREE.Vector3(x, y, -20), new THREE.Vector3(0, 0, 1), 'z'),
      )
}
