import * as THREE from 'three'

/** Flush cutter: pivot at origin, cutting tip along +X, jaws open in the XZ plane. */
export function createClipper() {
  const root = new THREE.Group()
  const steel = new THREE.MeshStandardMaterial({
    color: '#b9c2ca',
    metalness: 0.9,
    roughness: 0.28,
  })
  const grip = new THREE.MeshStandardMaterial({ color: '#245b9c', roughness: 0.72 })
  const shape = new THREE.Shape()
  shape.moveTo(0.02, 0)
  shape.lineTo(0.65, 0)
  shape.lineTo(0.38, 0.14)
  shape.lineTo(0.06, 0.16)
  shape.closePath()
  const jaw = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  })
  jaw.rotateX(Math.PI / 2).translate(0, 0.0275, 0)
  for (const side of [-1, 1]) {
    const branch = new THREE.Group()
    branch.scale.z = side
    branch.rotation.y = -side * 0.2
    root.add(branch)
    branch.add(new THREE.Mesh(jaw, steel))
    const tang = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.065, 0.12), steel)
    tang.position.set(-0.16, 0, -0.055)
    tang.rotation.y = -0.2
    branch.add(tang)
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.8, 6, 12), grip)
    handle.rotation.z = Math.PI / 2
    handle.rotation.y = -0.18
    handle.position.set(-0.79, 0, -0.16)
    branch.add(handle)
  }
  root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 24), steel))
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true
  })
  return root
}
