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

/** lỗ ngang khoét xuyên vách sau (cổng USB): tâm x, tâm cao y, rộng w, cao h, bo góc r (u) */
export interface WallPort {
  x: number
  y: number
  w: number
  h: number
  r: number
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

/** hốc chữ nhật phay xuống mặt sàn trong lòng case (chứa pin): tâm x, z, rộng w (x) × sâu d (z), đáy hốc y (u) */
export interface ShellTub {
  x: number
  z: number
  w: number
  d: number
  y: number
}
/** khối khoét hốc pin (bo góc 1mm như dao phay): từ đáy hốc `tub.y` lên quá mặt sàn `top` */
const tubCut = (tub: ShellTub, top: number) => {
  const g = new THREE.ExtrudeGeometry(
    roundedRect(new THREE.Shape(), tub.w, tub.d, 0.05) as THREE.Shape,
    { depth: top - tub.y + 0.05, bevelEnabled: false, curveSegments: 6 },
  )
  // shape nằm XY (y = −z sau khi xoay) → đùn theo +z rồi xoay nằm ngang, đáy ở tub.y
  g.rotateX(-Math.PI / 2)
  g.translate(tub.x, tub.y, tub.z)
  return g
}

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
  /** lỗ ngang xuyên vách sau (cổng USB daughterboard) */
  ports: WallPort[] = [],
  /** hốc pin khoét từ mặt sàn xuống tới `y` (case nhôm sàn dày) */
  tub?: ShellTub,
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
    ...ports.map((o) => {
      const g = new THREE.ExtrudeGeometry(
        roundedRect(new THREE.Shape(), o.w, o.h, o.r) as THREE.Shape,
        {
          depth: wall + 0.1,
          bevelEnabled: false,
          curveSegments: 8,
        },
      )
      // đùn theo +z từ ngoài mặt vách sau vào trong lòng case
      return g.translate(o.x, o.y, -D / 2 - 0.05)
    }),
  ]
  if (floorTop === undefined) {
    // vành không sàn (case trên): đùn vành rồi khoét
    const ring = extrude(ringShape(W, D, wall, false, b), y1 - y0, y0)
    return cuts.length ? carve(ring, cuts) : ring
  }
  // có sàn: 1 khối liền (khối đặc bo mép − lòng case từ mặt sàn lên) rồi khoét mọi thứ trên khối đó — không còn đường ghép vành / sàn
  // dưới đáy, lỗ vít sát vách (trụ nhựa 2 mảnh) khoét xuyên cả sàn, không bị sàn che nửa lỗ
  const solid = extrude(ringShape(W, D, wall, true, b), y1 - y0, y0)
  const cavity = new THREE.ExtrudeGeometry(
    roundedRect(new THREE.Shape(), W - 2 * wall, D - 2 * wall, INNER_R) as THREE.Shape,
    { depth: y1 - floorTop + 0.1, bevelEnabled: false, curveSegments: 8 },
  )
  // shape nằm XY → đùn theo +z, xoay nằm ngang, đáy ở mặt sàn
  cavity.rotateX(-Math.PI / 2)
  cavity.translate(0, floorTop, 0)
  // hốc feet CNC lõm ở mặt đáy
  const feet = pockets.map((p) =>
    new THREE.CylinderGeometry(p.r, p.r, p.depth + 0.02, 32).translate(
      p.x,
      y0 + (p.depth - 0.02) / 2,
      p.z,
    ),
  )
  return carve(solid, [cavity, ...cuts, ...feet, ...(tub ? [tubCut(tub, floorTop)] : [])])
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
  /** rãnh xuyên vách sau hết bề dày tấm (lớp nằm ngang tầm cổng USB daughterboard): tâm x + bề ngang (u) */
  slots: { x: number; w: number }[] = [],
  /** hốc tai plate top mount khoét từ mặt trong vách ra (tấm viền của case trên nằm dưới mặt plate) */
  notches: WallNotch[] = [],
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
  if (slots.length || notches.length)
    return carve(g, [
      ...slots.map((o) =>
        new THREE.BoxGeometry(o.w, h + 0.04, wall + 0.1).translate(o.x, h / 2, -D / 2 + wall / 2),
      ),
      // hốc lấn vào lòng case 0.02 cho CSG cắt sạch mặt trong vách
      ...notches.map((n) =>
        new THREE.BoxGeometry(n.w, h + 0.04, n.d + 0.02).translate(
          n.x,
          h / 2,
          n.side * (D / 2 - wall + n.d / 2 - 0.01),
        ),
      ),
    ])
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

/** tấm mica (đáy ở `y`, dày `h`) có chạm khoảng cao của lỗ cổng USB `o` không: chạm thì khoét rãnh vách sau */
export const micaHitsPort = (y: number, h: number, o: WallPort) =>
  y < o.y + o.h / 2 - 0.005 && y + h > o.y - o.h / 2 + 0.005

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

/** đùn shape phẳng (không bo) nằm ngang từ y0 lên y1 (shape XY → sau khi xoay z = −y) */
const slab = (shape: THREE.Shape, y0: number, y1: number, segs = 8) =>
  new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: segs })
    .rotateX(-Math.PI / 2)
    .translate(0, y0, 0)

/** vành chữ nhật bo góc: ngoài w × d (bo r), trong wi × di (bo ri) */
const ringRect = (w: number, d: number, r: number, wi: number, di: number, ri: number) => {
  const shape = roundedRect(new THREE.Shape(), w, d, r) as THREE.Shape
  shape.holes.push(roundedRect(new THREE.Path(), wi, di, ri))
  return shape
}

/** ống tròn đứng (trụ vít): bán kính ngoài `r`, lỗ `hole`, tâm (x, z), y0 → y1 */
export const tubeGeometry = (
  x: number,
  z: number,
  r: number,
  hole: number,
  y0: number,
  y1: number,
) => {
  const shape = new THREE.Shape().absarc(0, 0, r, 0, Math.PI * 2, false)
  shape.holes.push(new THREE.Path().absarc(0, 0, hole, 0, Math.PI * 2, true))
  return slab(shape, y0, y1, 20).translate(x, 0, z)
}

/** thông số thành rỗng case nhựa 2 mảnh (khớp `ABS_SHELL` trong steps.ts) */
export interface AbsShellDims {
  skin: number
  deck: number
  rib: number
  ribGap: number
  bossR: number
  gap: number
}

/** cao độ case nhựa 2 mảnh: mặt đáy, mặt sàn trong, mép ghép, mặt trên */
export interface AbsShellYs {
  bot: number
  floor: number
  split: number
  top: number
}

/**
 * Gân ngang trong rãnh thành rỗng (nối da ngoài – da trong), rải đều ~`ribGap` dọc 4 cạnh, né trụ vít / cổng USB / hốc vách
 * (`avoid`: tâm x + nửa bề rộng cần chừa, theo cạnh trước `side` 1 / sau −1)
 */
function channelRibs(
  W: number,
  D: number,
  wall: number,
  s: AbsShellDims,
  y0: number,
  y1: number,
  avoid: { x: number; side: 1 | -1; half: number }[],
  /** đầu ngoài gân cách mặt ngoài case (lấn vào da ngoài) */
  outer: number,
  /** đầu trong gân vượt mặt ngoài da trong (u): dương = lấn vào da trong, âm = dừng cách da trong */
  inner = 0.01,
) {
  // gân từ da trong ra tới `outer`
  const zIn = wall - s.skin + inner
  const span = zIn - outer
  const mid = (zIn + outer) / 2
  const out: THREE.BufferGeometry[] = []
  const line = (len: number) => {
    // bỏ 2 đầu (góc bo của rãnh): gân đầu tiên cách góc ~0,3u
    const L = len - 2 * wall - 0.6
    const n = Math.max(1, Math.round(L / s.ribGap))
    return Array.from({ length: n + 1 }, (_, i) => (n ? (i / n - 0.5) * L : 0))
  }
  for (const side of [1, -1] as const) {
    for (const x of line(W)) {
      if (avoid.some((a) => a.side === side && Math.abs(a.x - x) < a.half + s.rib)) continue
      out.push(
        new THREE.BoxGeometry(s.rib, y1 - y0, span).translate(
          x,
          (y0 + y1) / 2,
          side * (D / 2 - mid),
        ),
      )
    }
    for (const z of line(D))
      out.push(
        new THREE.BoxGeometry(span, y1 - y0, s.rib).translate(
          side * (W / 2 - mid),
          (y0 + y1) / 2,
          z,
        ),
      )
  }
  return out
}

/** bề dày vách bọc hốc trong rãnh thành rỗng (u, ~1mm) */
const POCKET_T = 0.05
/** mặt lót hốc lấn vào trong hốc (u, ~0,08mm): che khe nứt CSG dọc mép hốc */
const POCKET_LAP = 0.004

/**
 * Lót hốc khoét mặt trong vách case trên (tai plate top mount, vấu bottom mount): hốc sâu hơn lớp da trong thì thủng sang rãnh rỗng,
 * và CSG hay để khe nứt mảnh dọc mép hốc (nhìn qua khe vào trong khối → mặt trong không vẽ → thấy xuyên ra ngoài). Dựng vách sau +
 * 2 vách bên + trần bọc hốc (như hốc kín của case đúc), mặt lót lấn vào trong hốc `POCKET_LAP` và phủ từ ngay mặt trong vách → mọi
 * khe dọc mép đều có mặt đặc phía sau. Miệng hốc vẫn mở xuống từ mép ghép
 */
function notchPockets(notches: WallNotch[], D: number, wall: number, y0: number, top: number) {
  const t = POCKET_T
  const e = POCKET_LAP
  const out: THREE.BufferGeometry[] = []
  for (const n of notches) {
    // độ sâu tính từ mặt trong vách: từ sát mặt trong (chừa 0,002 cho khỏi lòi vào lòng case) tới hết vách sau
    const z0 = 0.002
    const z1 = n.d + t - e
    const zc = (d: number) => n.side * (D / 2 - wall + d)
    const h = top - y0
    out.push(
      // vách sau
      new THREE.BoxGeometry(n.w + 2 * t, h + t, t).translate(
        n.x,
        y0 + (h + t) / 2,
        zc(n.d + t / 2 - e),
      ),
      // 2 vách bên
      ...[-1, 1].map((sx) =>
        new THREE.BoxGeometry(t, h + t, z1 - z0).translate(
          n.x + sx * (n.w / 2 + t / 2 - e),
          y0 + (h + t) / 2,
          zc((z0 + z1) / 2),
        ),
      ),
      // trần
      new THREE.BoxGeometry(n.w + 2 * t, t, z1 - z0).translate(
        n.x,
        top + t / 2 - e,
        zc((z0 + z1) / 2),
      ),
    )
  }
  return out
}

/** gộp hình (CSG + gân + trụ) thành 1 geometry không index */
const mergeAll = (parts: THREE.BufferGeometry[]) => {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g))
  const merged = mergeGeometries(flat)
  for (const g of [...parts, ...flat]) g.dispose()
  return merged
}

/**
 * Case nhựa 2 mảnh kiểu đúc (case trên trùm case dưới, Transition Lite PC): `top` = da ngoài từ mặt trên phủ xuống tận mặt đáy +
 * mặt trên + da trong từ mép ghép lên, giữa 2 lớp da là rãnh rỗng có gân ngang + trụ vít nhỏ (ren ở miệng dưới);
 * `bottom` = khay đáy lọt trong da ngoài (hốc feet, lỗ vít côn) + da trong từ sàn lên mép ghép, rãnh ngoài da trong có gân + trụ vít
 * (lỗ xuyên). `screws` = tâm trụ (giữa rãnh); `bosses` = có dựng trụ trong hình không (bàn build vẽ trụ riêng kèm ren đồng)
 */
export function absTwoShellGeometry(
  part: 'top' | 'bottom',
  W: number,
  D: number,
  wall: number,
  ys: AbsShellYs,
  s: AbsShellDims,
  o: {
    screws: { x: number; z: number }[]
    bosses?: boolean
    /** bán kính lỗ trụ (case trên: lỗ ren, case dưới: lỗ xuyên) */
    hole: number
    ports?: WallPort[]
    /** hốc mặt trong da trong case trên (tai plate top mount / vấu bottom mount), từ mép ghép lên `notchTop` */
    notches?: WallNotch[]
    notchTop?: number
    pockets?: Pocket[]
    bores?: WallBore[]
  },
) {
  const { skin, deck } = s
  const ports = o.ports ?? []
  const notches = o.notches ?? []
  // da trong: mặt trong = mặt trong vách (lòng case), dày `skin`
  const innerW = W - 2 * wall
  const innerD = D - 2 * wall
  const avoid = [
    ...o.screws.map((p) => ({ x: p.x, side: (p.z > 0 ? 1 : -1) as 1 | -1, half: s.bossR + 0.04 })),
    ...ports.map((p) => ({ x: p.x, side: -1 as const, half: p.w / 2 + 0.06 })),
    ...notches.map((n) => ({ x: n.x, side: n.side, half: n.w / 2 + POCKET_T + 0.04 })),
  ]
  const portCuts = ports.map((p) =>
    new THREE.ExtrudeGeometry(roundedRect(new THREE.Shape(), p.w, p.h, p.r) as THREE.Shape, {
      depth: wall + 0.1,
      bevelEnabled: false,
      curveSegments: 8,
    }).translate(p.x, p.y, -D / 2 - 0.05),
  )
  const outerR = Math.max(0.02, OUTER_R - skin)
  if (part === 'top') {
    const b = SHELL_BEVEL
    // khối vành liền (bo mép như vỏ 1 mảnh) từ mặt đáy lên mặt trên
    const ring = new THREE.ExtrudeGeometry(ringShape(W, D, wall, false, b), {
      depth: Math.max(0.001, ys.top - ys.bot - 2 * b),
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: 6,
    })
      .rotateX(-Math.PI / 2)
      .translate(0, ys.bot + b, 0)
    const cuts = [
      // dưới mép ghép: chỉ còn da ngoài (khay case dưới lọt vào trong)
      slab(
        roundedRect(new THREE.Shape(), W - 2 * skin, D - 2 * skin, outerR) as THREE.Shape,
        ys.bot - 0.05,
        ys.split,
      ),
      // rãnh rỗng giữa 2 lớp da, từ mép ghép lên tới dưới mặt trên
      slab(
        // da trong case trên dày thêm `gap` (+ lấn 0,004): mặt ngoài thẳng hàng mặt ngoài da trong case dưới, gân 1 bề ngang nối vào
        ringRect(
          W - 2 * skin,
          D - 2 * skin,
          outerR,
          innerW + 2 * (skin + s.gap + 0.004),
          innerD + 2 * (skin + s.gap + 0.004),
          INNER_R + skin + s.gap,
        ),
        ys.split - 0.01,
        ys.top - deck,
      ),
      ...notches.map((n) =>
        new THREE.BoxGeometry(n.w, (o.notchTop ?? ys.top) - ys.split + 0.02, n.d + 0.02).translate(
          n.x,
          (ys.split - 0.02 + (o.notchTop ?? ys.top)) / 2,
          n.side * (D / 2 - wall + n.d / 2 - 0.01),
        ),
      ),
      ...portCuts,
    ]
    const shell = carve(ring, cuts)
    const y1 = ys.top - deck + 0.005
    return mergeAll([
      shell,
      ...notchPockets(notches, D, wall, ys.split, o.notchTop ?? ys.top),
      // gân chạy suốt từ mặt sàn khay case dưới lên dưới mặt trên, 1 bề ngang: từ da ngoài vào tới sát mặt ngoài da trong case dưới
      // (hở `gap`, case trên úp trùm vành da trong case dưới); trên mép ghép gân cũng dừng đó, da trong case trên dày thêm `gap`
      ...channelRibs(W, D, wall, s, ys.floor + 0.002, y1, avoid, skin - 0.01, -s.gap - 0.002),
      // trụ vít ghép từ mặt sàn khay lên dưới mặt trên (vít từ đáy xuyên sàn khay ăn lên)
      ...(o.bosses
        ? o.screws.map((p) => tubeGeometry(p.x, p.z, s.bossR, o.hole, ys.floor + 0.002, y1))
        : []),
    ])
  }
  // khay đáy: lọt trong da ngoài case trên (hở `gap`), mép thẳng ra sát da ngoài, khối đặc tới mép ghép rồi khoét lòng case + rãnh
  // ngoài da trong (vành da trong chạy quanh tới mép ghép); rãnh để trống: gân + trụ vít thuộc case trên, chạy xuống tới mặt khay
  const tw = W - 2 * (skin + s.gap)
  const td = D - 2 * (skin + s.gap)
  const tr = Math.max(0.02, outerR - s.gap)
  const solid = slab(
    roundedRect(new THREE.Shape(), tw, td, tr) as THREE.Shape,
    ys.bot,
    ys.split,
    10,
  )
  const cuts = [
    slab(
      roundedRect(new THREE.Shape(), innerW, innerD, INNER_R) as THREE.Shape,
      ys.floor,
      ys.split + 0.1,
    ),
    slab(
      ringRect(tw + 0.1, td + 0.1, tr, innerW + 2 * skin, innerD + 2 * skin, INNER_R + skin),
      ys.floor,
      ys.split + 0.1,
    ),
    ...(o.pockets ?? []).map((p) =>
      new THREE.CylinderGeometry(p.r, p.r, p.depth + 0.02, 32).translate(
        p.x,
        ys.bot + (p.depth - 0.02) / 2,
        p.z,
      ),
    ),
    ...(o.bores ?? []).map((h) =>
      new THREE.CylinderGeometry(h.r1 ?? h.r, h.r, h.y1 - h.y0, 28).translate(
        h.x,
        (h.y0 + h.y1) / 2,
        h.z,
      ),
    ),
    ...portCuts,
  ]
  return carve(solid, cuts)
}
