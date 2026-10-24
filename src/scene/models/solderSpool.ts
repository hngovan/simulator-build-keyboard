import * as THREE from 'three'

const RIM = 1.05
const HALF_WIDTH = 0.64
const AXLE_HEIGHT = 1.35
const WIRE_RADIUS = 0.03

function mesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
) {
  const part = new THREE.Mesh(geometry, material)
  part.position.set(...position)
  part.castShadow = part.receiveShadow = true
  group.add(part)
  return part
}

/** Hollow reel parts, revolved around Y; the bore stays open through both flanges. */
function annulus(inner: number, outer: number, halfHeight: number) {
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(inner, -halfHeight),
      new THREE.Vector2(outer, -halfHeight),
      new THREE.Vector2(outer, halfHeight),
      new THREE.Vector2(inner, halfHeight),
      new THREE.Vector2(inner, -halfHeight),
    ],
    64,
  )
}

/** Stand and axle share dimensions with the mounted reel, avoiding intersecting flanges. */
export function createSpoolHolder() {
  const group = new THREE.Group()
  const frame = new THREE.MeshStandardMaterial({
    color: '#343e48',
    metalness: 0.45,
    roughness: 0.4,
  })
  const steel = new THREE.MeshStandardMaterial({
    color: '#aab1b7',
    metalness: 0.85,
    roughness: 0.26,
  })
  mesh(group, new THREE.BoxGeometry(2.25, 0.12, 1.6), frame, [0, 0.06, 0])
  for (const side of [-1, 1]) {
    mesh(group, new THREE.BoxGeometry(0.16, AXLE_HEIGHT, 0.42), frame, [
      side * 0.87,
      0.12 + AXLE_HEIGHT / 2,
      0,
    ])
    const cap = mesh(group, new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32), steel, [
      side * 1.02,
      AXLE_HEIGHT,
      0,
    ])
    cap.rotation.z = Math.PI / 2
  }
  const axle = mesh(group, new THREE.CylinderGeometry(0.105, 0.105, 2.12, 32), steel, [
    0,
    AXLE_HEIGHT,
    0,
  ])
  axle.rotation.z = Math.PI / 2
  return group
}

/** A continuous helical winding and connected loose end, upright or on its axle. */
export function createSolderSpool(color: string, mounted = false) {
  const group = new THREE.Group()
  const reel = new THREE.Group()
  reel.position.y = mounted ? AXLE_HEIGHT : HALF_WIDTH + 0.045
  if (mounted) reel.rotation.z = -Math.PI / 2
  group.add(reel)
  const plastic = new THREE.MeshStandardMaterial({ color: '#d6d8d7', roughness: 0.54 })
  // thiếc màu chì: bớt bóng kim loại kẻo phản chiếu môi trường thành trắng
  const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.45 })
  for (const side of [-1, 1])
    mesh(reel, annulus(0.17, RIM, 0.045), plastic, [0, side * HALF_WIDTH, 0])
  // lõi dưới các vòng thiếc cùng màu chì (kẽ giữa các vòng không lộ nhựa trắng)
  mesh(reel, annulus(0.17, 0.81, HALF_WIDTH), metal)

  const points: THREE.Vector3[] = []
  const turns = 18,
    samples = turns * 48
  for (let i = 0; i <= samples; i++) {
    const t = i / samples,
      angle = t * turns * Math.PI * 2
    const p = new THREE.Vector3(0.86 * Math.cos(angle), -0.55 + t * 1.1, 0.86 * Math.sin(angle))
    p.applyEuler(reel.rotation).add(reel.position)
    points.push(p)
  }
  // Continue tangentially from the final winding; no detached wire segment.
  if (mounted) {
    points.push(
      new THREE.Vector3(0.55, 0.49, 0.3),
      new THREE.Vector3(0.55, 0.32, 0.85),
      new THREE.Vector3(0.55, 0.07, 1.45),
      new THREE.Vector3(0.2, 0.07, 1.9),
      new THREE.Vector3(-0.15, 0.07, 2.35),
    )
    group.add(createSpoolHolder())
  } else {
    points.push(
      new THREE.Vector3(0.86, 1.2, 0.24),
      new THREE.Vector3(1.04, 1.08, 0.45),
      new THREE.Vector3(1.16, 0.75, 0.5),
    )
  }
  const winding = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  mesh(group, new THREE.TubeGeometry(winding, samples * 2, WIRE_RADIUS, 8, false), metal)
  return group
}
