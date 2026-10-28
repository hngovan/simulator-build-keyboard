import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

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

/** hốc khoét vào mặt trong vách (top mount: tai plate thò vào): tâm x, cạnh trước (`side` 1) / sau (−1), rộng `w`, sâu vào vách `d` */
export interface WallNotch {
  x: number
  side: 1 | -1
  w: number
  d: number
}

/** lỗ tròn đứng khoan vào vỏ (u): tâm x, z, bán kính `r`, từ y0 tới y1 (lỗ vít xuyên / lỗ ren / hốc chìm đầu ốc) */
export interface WallBore {
  x: number
  z: number
  /** bán kính ở y0 */
  r: number
  /** bán kính ở y1 (hốc côn countersink); không có = lỗ trụ */
  r1?: number
  y0: number
  y1: number
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

/**
 * Gờ đỡ chạy quanh lòng case (đỡ vòng O-ring / gasket): vành phẳng `W` × `D` (mép ngoài lấn vào vách), rộng `wall`,
 * từ y0 tới y1, góc bo như góc ruột case
 */
export function ledgeGeometry(W: number, D: number, y0: number, y1: number, wall: number) {
  const shape = roundedRect(new THREE.Shape(), W, D, INNER_R) as THREE.Shape
  shape.holes.push(roundedRect(new THREE.Path(), W - 2 * wall, D - 2 * wall, INNER_R))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: y1 - y0,
    bevelEnabled: false,
    curveSegments: 4,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

/** trừ các khối `cuts` khỏi `base` (CSG), giải phóng hình gốc */
function carve(base: THREE.BufferGeometry, cuts: THREE.BufferGeometry[]) {
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal', 'uv']
  ev.useGroups = false
  let brush = new Brush(base.index ? base.toNonIndexed() : base)
  brush.updateMatrixWorld()
  for (const c of cuts) {
    const cut = new Brush(c.index ? c.toNonIndexed() : c)
    cut.updateMatrixWorld()
    brush = ev.evaluate(brush, cut, SUBTRACTION)
    c.dispose()
  }
  base.dispose()
  const g = brush.geometry
  g.clearGroups()
  return g
}

/** bo mép trên / dưới vỏ case liền khối (u) */
const SHELL_BEVEL = 0.035

/** hốc tròn CNC lõm dưới đáy (dán feet): tâm x, z (u, toạ độ cảnh), bán kính, độ sâu từ mặt đáy */
export interface Pocket {
  x: number
  z: number
  r: number
  depth: number
}

/** khoét lỗ tròn vào shape (shape nằm XY, sau khi xoay nằm ngang thì z = −y) */
const punch = (shape: THREE.Shape, pockets: Pocket[]) => {
  for (const p of pockets)
    shape.holes.push(new THREE.Path().absarc(p.x, -p.z, p.r, 0, Math.PI * 2, true))
  return shape
}

/**
 * Plate sandwich (case mica): tấm liền cùng viền ngoài bo góc với các lớp mica, kẹp giữa 2 lớp, khoét lỗ vít case
 * xuyên qua viền (không tai gá gasket). Shape nằm XY, chưa đùn
 */
export const sandwichPlateShape = (W: number, D: number, holes: Pocket[]) =>
  punch(roundedRect(new THREE.Shape(), W, D, OUTER_R) as THREE.Shape, holes)

/** trần hốc: đĩa lấp phần trên lỗ khoét, chừa lại đúng độ sâu hốc từ mặt đáy y0 */
const pocketCeilings = (pockets: Pocket[], y0: number, top: number) =>
  pockets.map((p) =>
    new THREE.CylinderGeometry(p.r + 0.004, p.r + 0.004, top - y0 - p.depth, 24)
      .translate(p.x, (y0 + p.depth + top) / 2, p.z)
      .toNonIndexed(),
  )

/**
 * Vỏ case liền 1 khối (nhựa / nhôm / PC / acrylic / gỗ dựng bằng code): vành ngoài bo góc đùn 1 lần từ y0 tới y1,
 * khoét ruột theo bề dày thành `wall`, mép trên / dưới bo nhẹ. `floorTop`: thêm sàn liền (đáy case) tới cao độ này,
 * `pockets`: hốc feet CNC lõm vào mặt đáy sàn
 */
export function caseShellGeometry(
  W: number,
  D: number,
  y0: number,
  y1: number,
  wall: number,
  floorTop?: number,
  pockets: Pocket[] = [],
  /** hốc lõm vào mặt trong vách từ đáy y0 lên tới `notchTop` (trần hốc liền vỏ) */
  notches: WallNotch[] = [],
  notchTop = y1,
  /** lỗ khoan đứng vào vỏ (lỗ vít xuyên, lỗ ren, hốc chìm đầu ốc) */
  bores: WallBore[] = [],
) {
  const b = SHELL_BEVEL
  const extrude = (shape: THREE.Shape, h: number, bottom: number, segs = 6) => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, h - 2 * b),
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: segs,
    })
    // đùn theo +z (bevel lấn ra −b … h−b) → nằm ngang, đáy ở `bottom`
    g.rotateX(-Math.PI / 2)
    g.translate(0, bottom + b, 0)
    return g
  }
  const shell = extrude(ringShape(W, D, wall, false, b), y1 - y0, y0)
  // khoét bằng CSG trên vỏ liền khối (như phay CNC): hốc tai plate từ đáy lên trần `notchTop`, lỗ vít / lỗ ren
  const cuts = [
    ...notches.map((n) =>
      new THREE.BoxGeometry(n.w, notchTop - y0 + 0.02, n.d + 0.02).translate(
        n.x,
        (y0 - 0.02 + notchTop) / 2,
        n.side * (D / 2 - wall + n.d / 2 - 0.01),
      ),
    ),
    ...bores.map((h) =>
      new THREE.CylinderGeometry(h.r1 ?? h.r, h.r, h.y1 - h.y0, 28).translate(
        h.x,
        (h.y0 + h.y1) / 2,
        h.z,
      ),
    ),
  ]
  const ring = cuts.length ? carve(shell, cuts) : shell
  if (floorTop === undefined) return ring
  // sàn nằm lọt trong ruột vành, cùng mặt đáy → nhìn ngoài là 1 khối
  // góc sàn bo theo góc ruột (INNER_R) cho khít, không hở 4 góc
  const fw = W - 2 * wall + 0.02 - 2 * b
  const fd = D - 2 * wall + 0.02 - 2 * b
  if (!pockets.length) {
    const floor = extrude(
      roundedRect(new THREE.Shape(), fw, fd, INNER_R) as THREE.Shape,
      floorTop - y0,
      y0,
    )
    const parts = [ring, floor]
    const merged = mergeGeometries(parts)
    for (const g of parts) g.dispose()
    return merged
  }
  // có hốc feet: sàn 2 lớp — tấm mỏng dưới cùng (dày = độ sâu hốc) khoét lỗ tròn làm thành hốc, tấm trên liền làm
  // trần hốc → mặt trong case phẳng, không lộ vết lỗ
  const depth = Math.max(...pockets.map((p) => p.depth))
  const skin = new THREE.ExtrudeGeometry(
    punch(roundedRect(new THREE.Shape(), fw + 2 * b, fd + 2 * b, INNER_R) as THREE.Shape, pockets),
    // chia cung mịn cho lỗ tròn đều (ít đoạn thì lỗ thành đa giác)
    { depth, bevelEnabled: false, curveSegments: 32 },
  )
  skin.rotateX(-Math.PI / 2)
  skin.translate(0, y0, 0)
  const floor = extrude(
    roundedRect(new THREE.Shape(), fw, fd, INNER_R) as THREE.Shape,
    floorTop - y0 - depth,
    y0 + depth,
  )
  const parts = [ring, skin, floor]
  const merged = mergeGeometries(parts)
  for (const g of parts) g.dispose()
  return merged
}

export function micaLayerGeometry(
  W: number,
  D: number,
  h: number,
  wall: number,
  solid = false,
  /** hốc feet (tấm đáy dưới cùng: khoét lỗ + trần hốc trong tấm) */
  pockets: Pocket[] = [],
  /** lỗ vít xuyên suốt tấm (mica ghép bắt vít xuyên viền mọi lớp) */
  holes: Pocket[] = [],
  /**
   * tấm khung trên cùng: khoét theo từng vùng phím (`keyRegions`, [x, z] u) thay cho lỗ ruột chữ nhật →
   * khung chặn giữa các cụm phím liền 1 tấm với mặt case
   */
  cutouts: [number, number][][] = [],
) {
  const shape = punch(roundedRect(new THREE.Shape(), W, D, OUTER_R) as THREE.Shape, [
    ...pockets,
    ...holes,
  ])
  if (cutouts.length)
    for (const loop of cutouts)
      shape.holes.push(new THREE.Path(loop.map(([x, z]) => new THREE.Vector2(x, -z))))
  else if (!solid)
    shape.holes.push(roundedRect(new THREE.Path(), W - 2 * wall, D - 2 * wall, INNER_R))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    // có lỗ: chia cung mịn cho lỗ tròn đều
    curveSegments: pockets.length || holes.length ? 32 : 4,
  })
  // đùn theo +z → xoay cho nằm ngang, bề dày theo +y
  g.rotateX(-Math.PI / 2)
  if (!pockets.length) return g
  // trần hốc trong tấm đáy: hốc chỉ sâu p.depth như case liền khối (không lõm xuyên cả tấm, feet lồi ra được)
  const parts = [g, ...pocketCeilings(pockets, 0, h)]
  const merged = mergeGeometries(parts)
  for (const x of parts) x.dispose()
  return merged
}

/** viền mép cắt của 1 lớp (mép mica cắt laser trắng mờ) */
export const micaEdgeMaterial = new THREE.LineBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.35,
})

/**
 * Loại tấm thứ i (đáy ở cao độ y): tấm đáy có hốc feet / tấm đáy liền / tấm khung khoét theo vùng phím (nằm trên mặt
 * plate, y ≥ 0) / tấm viền thường (bao quanh board)
 */
export const micaLayerKind = (i: number, y: number, floor: number) =>
  i === 0 && floor ? 'base' : i < floor ? 'solid' : y >= -0.01 ? 'frame' : 'ring'

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
  pockets: Pocket[] = [],
  /** lỗ vít xuyên mọi lớp */
  holes: Pocket[] = [],
  /** vùng phím khoét ở các tấm nằm trên mặt plate (khung chặn liền tấm), rỗng = tấm viền thường */
  cutouts: [number, number][][] = [],
) {
  const group = new THREE.Group()
  const { n, step, h } = micaStackPlan(y0, y1)
  const ring = micaLayerGeometry(W, D, h, wall, false, [], holes)
  const solid = micaLayerGeometry(W, D, h, wall, true, [], holes)
  // tấm đáy dưới cùng cắt lỗ feet (tấm thứ 2 liền làm trần hốc)
  const base = micaLayerGeometry(W, D, h, wall, true, pockets, holes)
  const frame = cutouts.length ? micaLayerGeometry(W, D, h, wall, false, [], holes, cutouts) : ring
  const edges = {
    ring: new THREE.EdgesGeometry(ring, 30),
    solid: new THREE.EdgesGeometry(solid, 30),
    // không vẽ vòng tròn lỗ feet (mica trong, nhìn từ trong case vẫn thấy)
    base: new THREE.EdgesGeometry(solid, 30),
    frame: new THREE.EdgesGeometry(frame, 30),
  }
  const geo = { ring, solid, base, frame }
  for (let i = 0; i < n; i++) {
    const kind = micaLayerKind(i, y0 + i * step, floor)
    const layer = new THREE.Group()
    layer.position.y = y0 + i * step
    layer.add(new THREE.Mesh(geo[kind], mat))
    layer.add(new THREE.LineSegments(edges[kind], micaEdgeMaterial))
    group.add(layer)
  }
  return group
}
