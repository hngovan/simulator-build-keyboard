import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** độ dày 1 lớp mica (u, ~3mm) và khe giữa 2 lớp */
export const MICA_LAYER = 0.15
export const MICA_GAP = 0.012
/** bo góc ngoài tấm mica (u) */
const OUTER_R = 0.12
const INNER_R = 0.03

function roundedRect(path: THREE.Path, w: number, d: number, r: number) {
  const x = -w / 2
  const y = -d / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y)
  path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + d - r)
  path.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  path.lineTo(x + r, y + d)
  path.quadraticCurveTo(x, y + d, x, y + d - r)
  path.lineTo(x, y + r)
  path.quadraticCurveTo(x, y, x + r, y)
  return path
}

/**
 * 1 tấm mica cắt phẳng (đùn thẳng, không vát mép): viền ngoài bo góc, khoét ruột theo bề dày thành `wall`;
 * `solid` = tấm đáy liền. Nằm ngang, đáy ở y = 0
 */
function ringShape(W: number, D: number, wall: number, solid: boolean, inset = 0) {
  const shape = roundedRect(new THREE.Shape(), W - 2 * inset, D - 2 * inset, OUTER_R) as THREE.Shape
  if (!solid)
    shape.holes.push(
      roundedRect(new THREE.Path(), W - 2 * wall + 2 * inset, D - 2 * wall + 2 * inset, INNER_R),
    )
  return shape
}

/** bo mép trên / dưới vỏ case liền khối (u) */
const SHELL_BEVEL = 0.035

/**
 * Vỏ case liền 1 khối (nhựa / nhôm / PC / acrylic / gỗ dựng bằng code): vành ngoài bo góc đùn 1 lần từ y0 tới y1,
 * khoét ruột theo bề dày thành `wall`, mép trên / dưới bo nhẹ. `floorTop`: thêm sàn liền (đáy case) tới cao độ này
 */
export function caseShellGeometry(
  W: number,
  D: number,
  y0: number,
  y1: number,
  wall: number,
  floorTop?: number,
) {
  const b = SHELL_BEVEL
  const extrude = (shape: THREE.Shape, h: number, bottom: number) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, h - 2 * b),
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: 6,
    })
    // đùn theo +z (bevel lấn ra −b … h−b) → nằm ngang, đáy ở `bottom`
    g.rotateX(-Math.PI / 2)
    g.translate(0, bottom + b, 0)
    return g
  }
  const ring = extrude(ringShape(W, D, wall, false, b), y1 - y0, y0)
  if (floorTop === undefined) return ring
  // sàn nằm lọt trong ruột vành, cùng mặt đáy → nhìn ngoài là 1 khối
  // góc sàn bo theo góc ruột (INNER_R) cho khít, không hở 4 góc
  const fw = W - 2 * wall + 0.02 - 2 * b
  const fd = D - 2 * wall + 0.02 - 2 * b
  const floor = extrude(
    roundedRect(new THREE.Shape(), fw, fd, INNER_R) as THREE.Shape,
    floorTop - y0,
    y0,
  )
  const merged = mergeGeometries([ring, floor])
  ring.dispose()
  floor.dispose()
  return merged
}

export function micaLayerGeometry(W: number, D: number, h: number, wall: number, solid = false) {
  const shape = roundedRect(new THREE.Shape(), W, D, OUTER_R) as THREE.Shape
  if (!solid) shape.holes.push(roundedRect(new THREE.Path(), W - 2 * wall, D - 2 * wall, INNER_R))
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 4 })
  // đùn theo +z → xoay cho nằm ngang, bề dày theo +y
  g.rotateX(-Math.PI / 2)
  return g
}

/** viền mép cắt của 1 lớp (mép mica cắt laser trắng mờ) */
export const micaEdgeMaterial = new THREE.LineBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.35,
})

/** số lớp + bề dày mỗi lớp (đã trừ khe) cho đoạn cao y0 → y1 */
export function micaStackPlan(y0: number, y1: number) {
  const n = Math.max(1, Math.round((y1 - y0) / MICA_LAYER))
  const step = (y1 - y0) / n
  return { n, step, h: step - MICA_GAP }
}

/**
 * Chồng lớp mica (three thuần, dùng cho ảnh / khung xem 3D): `floor` lớp dưới cùng là tấm liền (đáy),
 * còn lại là khung viền
 */
export function micaStack(
  W: number,
  D: number,
  y0: number,
  y1: number,
  wall: number,
  mat: THREE.Material,
  floor = 0,
) {
  const group = new THREE.Group()
  const { n, step, h } = micaStackPlan(y0, y1)
  const ring = micaLayerGeometry(W, D, h, wall)
  const solid = micaLayerGeometry(W, D, h, wall, true)
  const edges = {
    ring: new THREE.EdgesGeometry(ring, 30),
    solid: new THREE.EdgesGeometry(solid, 30),
  }
  for (let i = 0; i < n; i++) {
    const kind = i < floor ? 'solid' : 'ring'
    const layer = new THREE.Group()
    layer.position.y = y0 + i * step
    layer.add(new THREE.Mesh(kind === 'solid' ? solid : ring, mat))
    layer.add(new THREE.LineSegments(edges[kind], micaEdgeMaterial))
    group.add(layer)
  }
  return group
}
