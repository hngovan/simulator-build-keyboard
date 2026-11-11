import * as THREE from 'three'
import polygonClipping, { type Polygon } from 'polygon-clipping'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { KeycapProfile } from '@/data/parts'
import { stabSpan } from '@/data/steps'
import type { Key } from '@/types'

// Tỉ lệ trong game, lấy dáng từ các mẫu CAD lưu tại assets/keycaps.
export const PROFILE: Record<
  KeycapProfile,
  { height: number; inset: number; dish: number; tilt: number }
> = {
  cherry: { height: 0.42, inset: 0.1, dish: 0.025, tilt: 0.025 },
  oem: { height: 0.51, inset: 0.11, dish: 0.035, tilt: 0.035 },
  sa: { height: 0.7, inset: 0.18, dish: 0.085, tilt: 0.025 },
  dsa: { height: 0.43, inset: 0.13, dish: 0.055, tilt: 0 },
  xda: { height: 0.47, inset: 0.08, dish: 0.035, tilt: 0 },
  mt3: { height: 0.66, inset: 0.16, dish: 0.105, tilt: 0.02 },
  asa: { height: 0.56, inset: 0.13, dish: 0.06, tilt: 0.025 },
  opk: { height: 0.54, inset: 0.17, dish: 0.11, tilt: 0.025 },
  dcs: { height: 0.4, inset: 0.1, dish: 0.03, tilt: 0.025 },
}

const SCULPTED = new Set<KeycapProfile>(['cherry', 'oem', 'sa', 'mt3', 'asa', 'opk', 'dcs'])

export function capGeometry(w: number, d: number, shape: (typeof PROFILE)[KeycapProfile]) {
  const geo = new THREE.BufferGeometry()
  const verts: number[] = []
  const add = (a: number[], b: number[], c: number[]) => verts.push(...a, ...b, ...c)
  const bw = w / 2
  const bd = d / 2
  const tw = Math.max(0.1, bw - shape.inset)
  const td = Math.max(0.1, bd - shape.inset)
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i]
    const [bx, bz] = corners[(i + 1) % 4]
    const a = [ax * bw, 0, az * bd]
    const b = [bx * bw, 0, bz * bd]
    const c = [bx * tw, shape.height + bz * shape.tilt, bz * td]
    const e = [ax * tw, shape.height + az * shape.tilt, az * td]
    add(a, c, b)
    add(a, e, c)
  }
  const top = (x: number, z: number) => {
    const radius = Math.max(Math.abs(x), Math.abs(z))
    return [x * tw, shape.height + z * shape.tilt - shape.dish * (1 - radius * radius), z * td]
  }
  const n = 8
  for (let iz = 0; iz < n; iz++)
    for (let ix = 0; ix < n; ix++) {
      const x = (ix / n) * 2 - 1
      const z = (iz / n) * 2 - 1
      const x2 = ((ix + 1) / n) * 2 - 1
      const z2 = ((iz + 1) / n) * 2 - 1
      add(top(x, z), top(x2, z2), top(x2, z))
      add(top(x, z), top(x, z2), top(x2, z2))
    }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.computeVertexNormals()
  return geo
}

export type KeycapShape = (typeof PROFILE)[KeycapProfile]

/** Hàng R của từng profile theo hàng phím (0 = hàng số / F … 4 = hàng dưới cùng); profile 1 hàng = R1 */
const R_OF: Partial<Record<KeycapProfile, number[]>> = {
  cherry: [1, 2, 3, 4, 4],
  oem: [1, 2, 3, 4, 4],
  dcs: [1, 2, 3, 4, 4],
  // SA (mjseabright/keycaps): R1–R4 như Cherry
  sa: [1, 2, 3, 4, 4],
}
const capRow = (profile: KeycapProfile, row: number) =>
  (R_OF[profile] ?? [1, 1, 1, 1, 1])[Math.max(0, Math.min(4, Math.round(row)))]

/**
 * Số đo từ CAD 1u (u, đo mép trên 4 cạnh sau khi chuyển đổi): độ cao giữa mép trước / sau và độ nghiêng
 * (âm = mép sau cao hơn, hàng trên ngả về người gõ). Phím rộng dựng theo số này cho khớp phím 1u
 */
const CAD_ROW: Partial<Record<KeycapProfile, Record<number, { height: number; tilt: number }>>> = {
  // đo lại sau khi sửa thứ tự hàng (file r4-1u = R1) + bỏ xoay 180° (2026-10-25): R1 cao nhất, mép sau cao hơn;
  // R4 mép trước cao hơn (như bảng profile R1–R4)
  cherry: {
    1: { height: 0.53, tilt: -0.013 },
    2: { height: 0.437, tilt: 0.005 },
    3: { height: 0.421, tilt: 0.02 },
    4: { height: 0.446, tilt: 0.036 },
  },
  oem: {
    1: { height: 0.54, tilt: -0.013 },
    2: { height: 0.438, tilt: 0.008 },
    3: { height: 0.414, tilt: 0.033 },
    4: { height: 0.444, tilt: 0.049 },
  },
  // SA đổi nguồn sang mjseabright/keycaps (2026-11-10, có lòng + stem): đo lại
  sa: {
    1: { height: 0.747, tilt: -0.064 },
    2: { height: 0.636, tilt: -0.034 },
    3: { height: 0.612, tilt: -0.001 },
    4: { height: 0.637, tilt: 0.034 },
  },
  // DCS (Fooblitzky/DCS_keycaps, 2026-11-10): R1 gần phẳng, R4 mép trước cao hẳn
  dcs: {
    1: { height: 0.454, tilt: -0.005 },
    2: { height: 0.364, tilt: 0.019 },
    3: { height: 0.334, tilt: 0.042 },
    4: { height: 0.393, tilt: 0.094 },
  },
  // MT3 / OPK chỉ có CAD 1 hàng (MT3 row 0, OPK row 3) → mọi hàng dùng chung
  mt3: { 1: { height: 0.741, tilt: -0.07 } },
  opk: { 1: { height: 0.488, tilt: -0.033 } },
  dsa: { 1: { height: 0.394, tilt: 0 } },
  xda: { 1: { height: 0.43, tilt: 0 } },
}

/** Dáng keycap theo profile + hàng phím (row của Key); profile điêu khắc thì mỗi hàng nghiêng / cao khác */
export function keycapShape(profile: KeycapProfile, row: number): KeycapShape {
  const base = PROFILE[profile]
  const cad = CAD_ROW[profile]?.[capRow(profile, row)]
  if (cad) return { ...base, ...cad }
  if (!SCULPTED.has(profile)) return base
  // ASA (chưa có CAD): hàng trên ngả về người gõ, hàng dưới ngả ra sau
  const curve = [-1, -0.5, 0, 0.5, 1][Math.max(0, Math.min(4, Math.round(row)))]
  return { ...base, height: base.height + Math.abs(curve) * 0.035, tilt: base.tilt * curve }
}

/** mép keycap giữ nguyên khi kéo dãn (thành nghiêng + bo góc), u */
const EDGE = 0.16
const stretchCache = new Map<string, THREE.BufferGeometry>()

/**
 * Dời 1 toạ độ từ nửa cỡ model `base` sang nửa cỡ phím `half`: phần mép giữ nguyên, chỉ phần giữa giãn ra
 * (như keycap rộng đúc thật). Model 1u base = 0,46; model phím rộng có sẵn thì base ≈ half, gần như không giãn
 */
const stretch1 = (v: number, half: number, base: number) => {
  const core = base - EDGE
  return v > core
    ? v + half - base
    : v < -core
      ? v - half + base
      : (v * (core + half - base)) / core
}

/** nửa vùng stem (u): stem MX Ø5,5mm ≈ 0,29u */
const STEM_ZONE = 0.17

/** Hình học keycap CAD 1u kéo dãn tới w × h (u) theo kiểu 9-slice: mép không bị vót nhọn */
function stretchCapGeometry(geo: THREE.BufferGeometry, w: number, h: number) {
  const hw = (w - 0.08) / 2
  const hd = (h - 0.08) / 2
  if (!geo.boundingBox) geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const bx = (bb.max.x - bb.min.x) / 2
  const bz = (bb.max.z - bb.min.z) / 2
  if (Math.abs(hw - bx) < 1e-3 && Math.abs(hd - bz) < 1e-3) return geo
  const key = `${geo.uuid}:${w}:${h}`
  const hit = stretchCache.get(key)
  if (hit) return hit
  const out = geo.clone()
  const pos = out.getAttribute('position')
  const nor = out.getAttribute('normal')
  // stem chữ thập dưới lòng keycap giữ nguyên cỡ (không kéo dãn theo phím rộng): điểm gần tâm, thấp hơn đáy lòng chảo,
  // pháp tuyến không hướng lên (mặt trên giữa phím vẫn giãn như cũ)
  let dishLow = Infinity
  if (nor)
    for (let i = 0; i < pos.count; i++)
      if (
        nor.getY(i) > 0.7 &&
        Math.abs(pos.getX(i)) < STEM_ZONE &&
        Math.abs(pos.getZ(i)) < STEM_ZONE
      )
        dishLow = Math.min(dishLow, pos.getY(i))
  for (let i = 0; i < pos.count; i++) {
    const stem =
      !!nor &&
      Math.abs(pos.getX(i)) < STEM_ZONE &&
      Math.abs(pos.getZ(i)) < STEM_ZONE &&
      nor.getY(i) < 0.7 &&
      pos.getY(i) < dishLow - 0.03
    if (stem) continue
    pos.setX(i, stretch1(pos.getX(i), hw, bx))
    pos.setZ(i, stretch1(pos.getZ(i), hd, bz))
  }
  out.computeVertexNormals()
  out.computeBoundingBox()
  out.computeBoundingSphere()
  stretchCache.set(key, out)
  return out
}

/** Clone model keycap và thay hình học bằng bản kéo dãn cho phím w × h */
export function stretchCap(model: THREE.Object3D, w: number, h: number) {
  model.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.geometry = stretchCapGeometry(m.geometry, w, h)
  })
  return model
}

/**
 * Model keycap chuyển từ CAD 1u gốc (public/models/keycaps, `bun run convert:keycaps`) theo profile + hàng.
 * Mọi phím của 1 bộ dùng chung model (phím rộng kéo dãn bằng stretchCap) để cả bàn phím đồng bộ 1 profile;
 * null = không có CAD (ASA) → dựng bằng capGeometry
 */
export function keycapModel(profile: KeycapProfile, row: number, w = 1, h = 1): string | null {
  if (profile === 'asa') return null
  const r = capRow(profile, row)
  const base =
    profile === 'cherry' || profile === 'oem' || profile === 'sa' || profile === 'dcs'
      ? `${profile}-r${r}`
      : profile
  return wideModel(profile, r, w, h) ?? base
}

/**
 * Model CAD phím rộng / phím đứng có sẵn (mjseabright/keycaps, `bun run convert:keycaps`): cỡ ×100.
 * SA theo hàng (space 6.25u / 7u chỉ có R3 → hàng nào cũng dùng), DSA mọi hàng như nhau
 */
const WIDE: Partial<Record<string, { w?: number[]; h?: number[] }>> = {
  'sa-r1': { w: [150, 200] },
  'sa-r2': { w: [150, 175] },
  'sa-r3': { w: [125, 150, 175, 200, 225, 275, 300, 625, 700], h: [200] },
  'sa-r4': { w: [125, 150, 175, 200, 225, 275] },
  dsa: { w: [125, 150, 175, 200, 225, 250, 275], h: [200] },
}

function wideModel(profile: KeycapProfile, r: number, w: number, h: number) {
  const cw = Math.round(w * 100)
  const ch = Math.round(h * 100)
  if (cw === 100 && ch === 100) return null
  if (profile === 'dsa') {
    const t = WIDE.dsa!
    if (ch === 100 && t.w?.includes(cw)) return `dsa-w${cw}`
    if (cw === 100 && t.h?.includes(ch)) return `dsa-h${ch}`
    return null
  }
  if (profile !== 'sa') return null
  // space dài: SA chỉ đúc R3
  const row = cw >= 600 ? 3 : r
  const t = WIDE[`sa-r${row}`]
  if (ch === 100 && t?.w?.includes(cw)) return `sa-r${row}-w${cw}`
  if (cw === 100 && t?.h?.includes(ch)) return `sa-r${row}-h${ch}`
  return null
}

/**
 * Keycap chữ L (Enter ISO / Big-ass Enter) dựng bằng code theo viền phím `bottom` (điểm [x, z], tâm ô chính): thành nghiêng vào
 * `shape.inset` (mỗi đỉnh dời theo pháp tuyến 2 cạnh kề, góc lõm cũng đúng), mặt trên phẳng nghiêng theo hàng (`tilt` theo z
 * chuẩn hoá trên nửa chiều sâu `halfD`), không lòng chảo (mặt chữ L đúc thật gần phẳng). Chưa có CAD chữ L nên mọi profile dùng chung
 */
export function lCapGeometry(
  bottom: [number, number][],
  halfD: number,
  shape: KeycapShape,
  profile?: KeycapProfile,
) {
  const spherical = !!profile && SPHERICAL_DISH.has(profile)
  const n = bottom.length
  // chiều vòng (diện tích có dấu trên mặt x-z): bên trong nằm bên trái cạnh khi > 0
  const area = bottom.reduce((s, [x, z], i) => {
    const [x2, z2] = bottom[(i + 1) % n]
    return s + x * z2 - x2 * z
  }, 0)
  const side = area > 0 ? 1 : -1
  const inward = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.hypot(dx, dz) || 1
    return [(-dz / len) * side, (dx / len) * side]
  }
  /** viền lùi vào `d` (mỗi đỉnh dời theo pháp tuyến 2 cạnh kề: góc vuông lồi / lõm đều đúng) */
  const offset = (d: number) =>
    bottom.map((p, i): [number, number] => {
      const n1 = inward(bottom[(i - 1 + n) % n], p)
      const n2 = inward(p, bottom[(i + 1) % n])
      return [p[0] + (n1[0] + n2[0]) * d, p[1] + (n1[1] + n2[1]) * d]
    })
  /** bo mọi góc (lồi + lõm) bán kính `r` bằng cung Bézier bậc 2, mỗi góc `CORNER_SEGS` + 1 điểm (vòng nào cũng cùng số điểm) */
  const round = (poly: [number, number][], r: number) =>
    poly.flatMap((p, i): [number, number][] => {
      const a = poly[(i - 1 + n) % n]
      const b = poly[(i + 1) % n]
      const la = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1
      const lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1
      const rr = Math.min(r, la * 0.45, lb * 0.45)
      const s: [number, number] = [
        p[0] + ((a[0] - p[0]) / la) * rr,
        p[1] + ((a[1] - p[1]) / la) * rr,
      ]
      const e: [number, number] = [
        p[0] + ((b[0] - p[0]) / lb) * rr,
        p[1] + ((b[1] - p[1]) / lb) * rr,
      ]
      return Array.from({ length: CORNER_SEGS + 1 }, (_, k) => {
        const t = k / CORNER_SEGS
        const u = 1 - t
        return [
          u * u * s[0] + 2 * u * t * p[0] + t * t * e[0],
          u * u * s[1] + 2 * u * t * p[1] + t * t * e[1],
        ]
      })
    })
  // mặt cắt thành: hơi bầu ra (dốc đứng ở chân, ngả vào gần đỉnh) tới chân mép bo, rồi 1/4 cung bo mép trên
  // (keycap đúc thật không có cạnh sắc)
  const H = shape.height
  // mép bo = cung elip: ngang `rx` (≤ độ vát thành), đứng `ry`; XDA / DSA / SA vai tròn to như keycap CAD của profile
  const own = profile ? RIM_OF[profile] : undefined
  const r0 = Math.min(RIM, shape.inset * 0.6, H * 0.3)
  const rx = Math.min(own?.rx ?? r0, shape.inset * 0.9)
  const ry = Math.min(own?.ry ?? r0, H * 0.45)
  const rings: { o: number; f: number }[] = []
  for (let k = 0; k < WALL_SEGS; k++) {
    const t = k / WALL_SEGS
    rings.push({ o: (shape.inset - rx) * Math.pow(t, WALL_BULGE), f: (t * (H - ry)) / H })
  }
  for (let k = 0; k <= RIM_SEGS; k++) {
    const phi = (k / RIM_SEGS) * (Math.PI / 2)
    rings.push({
      o: shape.inset - rx + rx * (1 - Math.cos(phi)),
      f: (H - ry + ry * Math.sin(phi)) / H,
    })
  }
  // lòng chảo: lõm dần từ mép vào trong tới đáy phẳng cách mép `DISH_R` (cỡ nửa keycap 1u) → mọi nhánh chữ L lõm như
  // phím thường. Profile cầu (XDA / DSA / SA...) bầu lên cả 4 phía; profile trụ (DCS / Cherry / OEM) chỉ tính mép trái / phải
  const topRaw = offset(shape.inset)
  const minX = Math.min(...topRaw.map((p) => p[0]))
  const maxX = Math.max(...topRaw.map((p) => p[0]))
  const edges = topRaw
    .map((p, i) => [p, topRaw[(i + 1) % topRaw.length]] as const)
    .filter(([p, q]) => spherical || Math.abs(q[1] - p[1]) > Math.abs(q[0] - p[0]))
  // khoảng tới mép = min mềm (log-sum-exp) → không lằn gấp chéo ở góc như min thường
  const dishAt = (x: number, z: number) => {
    let sum = 0
    for (const [p, q] of edges) {
      const ex = q[0] - p[0]
      const ez = q[1] - p[1]
      const t = Math.max(
        0,
        Math.min(1, ((x - p[0]) * ex + (z - p[1]) * ez) / (ex * ex + ez * ez || 1)),
      )
      sum += Math.exp(-Math.hypot(x - p[0] - ex * t, z - p[1] - ez * t) / DISH_SOFT)
    }
    const d = Math.max(0, -DISH_SOFT * Math.log(sum || 1e-9))
    const f = Math.min(1, d / DISH_R)
    return shape.dish * (1 - (1 - f) ** 2)
  }
  const y = (x: number, z: number, f: number) =>
    f * (H + (z / halfD) * shape.tilt) - Math.pow(f, 6) * dishAt(x, z)
  // chia nhỏ cạnh dài (cùng số đoạn mọi vòng) để mép trên ôm theo lòng chảo, không hở với mặt trên
  const base = round(offset(0), CORNER_R)
  const splits = base.map((p, i) => {
    const q = base[(i + 1) % base.length]
    return Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / TOP_STEP))
  })
  const dense = (poly: [number, number][]) =>
    poly.flatMap((p, i): [number, number][] => {
      const q = poly[(i + 1) % poly.length]
      return Array.from({ length: splits[i] }, (_, k) => {
        const t = k / splits[i]
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
      })
    })
  const pts = rings.map(({ o, f }) =>
    dense(round(offset(o), CORNER_R - (CORNER_R - CORNER_R_TOP) * f)).map(([x, z]) => [
      x,
      y(x, z, f),
      z,
    ]),
  )
  const verts: number[] = []
  const tri = (a: number[], b: number[], c: number[]) => verts.push(...a, ...b, ...c)
  const m = pts[0].length
  for (let r = 0; r < pts.length - 1; r++)
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m
      const a = pts[r][i]
      const b = pts[r][j]
      const c = pts[r + 1][j]
      const e = pts[r + 1][i]
      tri(a, c, b)
      tri(a, e, c)
    }
  // mặt trên: lưới ô vuông cắt theo viền mép trên (ô nằm trọn trong viền giữ nguyên, ô chạm viền thì cắt) → đủ điểm để uốn lòng chảo
  const top = pts[pts.length - 1]
  const ring2: [number, number][] = top.map(([x, , z]) => [x, z])
  const clipPoly: Polygon = [[...ring2, ring2[0]]]
  const inside = (px: number, pz: number) => {
    let c = false
    for (let i = 0, j = ring2.length - 1; i < ring2.length; j = i++) {
      const [xi, zi] = ring2[i]
      const [xj, zj] = ring2[j]
      if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c
    }
    return c
  }
  /** điểm mặt trên nằm trên viền: lấy độ cao nội suy giữa 2 đỉnh mép bo (khớp cạnh vòng mép, không hở khe) */
  const topY = (x: number, z: number) => {
    for (let i = 0; i < top.length; i++) {
      const p = top[i]
      const q = top[(i + 1) % top.length]
      const ex = q[0] - p[0]
      const ez = q[2] - p[2]
      const len2 = ex * ex + ez * ez
      if (!len2) continue
      const t = ((x - p[0]) * ex + (z - p[2]) * ez) / len2
      if (t < -1e-6 || t > 1 + 1e-6) continue
      if (Math.abs((x - p[0]) * ez - (z - p[2]) * ex) / Math.sqrt(len2) < 1e-6)
        return p[1] + (q[1] - p[1]) * Math.max(0, Math.min(1, t))
    }
    return y(x, z, 1)
  }
  // earcut trả tam giác cùng 1 chiều bất kể chiều vòng vào → đảo thứ tự đỉnh cho mặt trên quay lên
  const face = (poly: [number, number][]) => {
    const contour = poly.map(([x, z]) => new THREE.Vector2(x, z))
    const at = (i: number) => [poly[i][0], topY(poly[i][0], poly[i][1]), poly[i][1]]
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, [])) tri(at(i), at(k), at(j))
  }
  const minZ = Math.min(...ring2.map((p) => p[1]))
  const maxZ = Math.max(...ring2.map((p) => p[1]))
  for (let x0 = minX; x0 < maxX; x0 += TOP_STEP)
    for (let z0 = minZ; z0 < maxZ; z0 += TOP_STEP) {
      const x1 = x0 + TOP_STEP
      const z1 = z0 + TOP_STEP
      const cell: [number, number][] = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ]
      if (cell.every(([x, z]) => inside(x, z))) {
        face(cell)
        continue
      }
      const cut = polygonClipping.intersection(clipPoly, [[...cell, cell[0]]])
      for (const poly of cut) face(poly[0].slice(0, -1) as [number, number][])
    }
  const raw = new THREE.BufferGeometry()
  raw.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  // gộp đỉnh trùng → pháp tuyến mượt qua góc / mép bo (không lộ từng mặt phẳng)
  const geo = mergeVertices(raw, 1e-4)
  raw.dispose()
  geo.computeVertexNormals()
  return geo
}
/**
 * Trần lòng keycap chữ L (u) cho stem + gân dưới lòng: thấp hơn điểm thấp nhất của mặt trên (lòng chảo + nghiêng theo hàng)
 * để không hằn lên mặt keycap
 */
export const lCapCeiling = (shape: KeycapShape) =>
  shape.height - Math.abs(shape.tilt) - shape.dish - 0.05
/** keycap chữ L (u): bo góc đứng ở đáy / mặt trên (~1,5 / 1mm), bo mép trên (~0,8mm), số đoạn mỗi cung */
const CORNER_R = 0.08
const CORNER_R_TOP = 0.05
const RIM = 0.055
/** thành bầu: số vòng + số mũ (> 1 = dốc đứng ở chân, ngả vào gần đỉnh); bước lưới mặt trên (u) */
const WALL_SEGS = 5
const WALL_BULGE = 1.35
const TOP_STEP = 0.05
/** lòng chảo chữ L: khoảng từ mép vào tới đáy phẳng (u) */
const DISH_R = 0.36
const DISH_SOFT = 0.07
/** profile lòng chảo cầu (bầu lên cả 4 phía); còn lại lòng chảo trụ */
export const SPHERICAL_DISH = new Set<KeycapProfile>(['sa', 'dsa', 'xda', 'mt3', 'asa'])
const CORNER_SEGS = 5
const RIM_SEGS = 7
/** mép bo riêng theo profile (u): XDA vai tròn cao, DSA / SA tròn rộng */
const RIM_OF: Partial<Record<KeycapProfile, { rx: number; ry: number }>> = {
  xda: { rx: 0.072, ry: 0.17 },
  dsa: { rx: 0.1, ry: 0.13 },
  sa: { rx: 0.14, ry: 0.17 },
  mt3: { rx: 0.12, ry: 0.15 },
}

const stemCache = new Map<number, THREE.BufferGeometry>()
/**
 * Stem MX (trụ Ø5,5mm có lỗ chữ thập 4,1 × 1,3mm) dưới lòng keycap dựng bằng code (ASA, Enter chữ L): từ cao hơn mép váy 1mm
 * lên tới `top` (u). Model CAD đều có stem sẵn (XDA khoét + gắn stem lúc convert)
 */
export function stemGeometry(top: number) {
  const key = Math.round(top * 1000)
  const hit = stemCache.get(key)
  if (hit) return hit
  const mm = 1 / 19.05
  const bot = mm
  const shape = new THREE.Shape().absarc(0, 0, 2.75 * mm, 0, Math.PI * 2, false)
  const l = 2.05 * mm
  const w = 0.65 * mm
  const cross: [number, number][] = [
    [-w, -l],
    [w, -l],
    [w, -w],
    [l, -w],
    [l, w],
    [w, w],
    [w, l],
    [-w, l],
    [-w, w],
    [-l, w],
    [-l, -w],
    [-w, -w],
  ]
  shape.holes.push(new THREE.Path(cross.map(([x, y]) => new THREE.Vector2(x, y))))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.05, top - bot),
    bevelEnabled: false,
    curveSegments: 16,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, bot, 0)
  stemCache.set(key, g)
  return g
}

const underCache = new WeakMap<THREE.Object3D, Map<string, THREE.BufferGeometry | null>>()
/** gân dày ~1mm; khoảng lấy mẫu trần dọc gân (u), dày hơn ở sát vách để mặt gân ôm theo vách nghiêng */
const RIB_T = 1 / 19.05
const RIB_STEP = 0.03
/** gân chỉ cao 1 nửa khoảng trần → đáy stem (tính từ trần xuống), chân stab vẫn dài tới đáy */
const RIB_DEPTH = 0.5
/** vỏ dày tối đa (u) để coi 2 mặt liền nhau là trong / ngoài của cùng thành vỏ; vỏ 1 lớp: lùi dưới mặt trên */
const SHELL_MAX = 0.15
const THIN_GAP = 0.05
const THIN_PULL = 0.05
/** bán kính stem MX (u): tia đo trần / vách bỏ qua vùng trong stem */
const STEM_RU = 2.75 / 19.05

/**
 * Mặt dưới keycap có stab (≥ 2u, Enter chữ L): 2 stem MX ở ±span (vị trí stab, `stabSpan`) + gân gia cố: gân dọc nối 3 stem
 * chạy tới 2 vách đầu, gân ngang ở mỗi stem chạy tới vách trước / sau. Đo lòng keycap thật `cap` bằng tia (hệ toạ độ của `cap`):
 * mặt trên gân ôm theo trần (lòng chảo, nghiêng theo hàng) rồi dốc xuống theo vách nghiêng → gân liền vào trần + vách như
 * keycap đúc, không treo lơ lửng. Stem stab cao tới trần đúng chỗ. Stem giữa đã có sẵn (model / `stemGeometry`).
 * null = phím không stab, hoặc model CAD đúng cỡ đã có sẵn (SA / DSA phím rộng)
 */
export function capUnder(k: Pick<Key, 'w' | 'h'>, cap: THREE.Object3D, cadWide = false) {
  if (cadWide || Math.max(k.w, k.h) < 2) return null
  const key = `${k.w}:${k.h}`
  let byCap = underCache.get(cap)
  if (!byCap) underCache.set(cap, (byCap = new Map()))
  if (byCap.has(key)) return byCap.get(key)!
  const vertical = k.h > k.w
  const span = stabSpan(k as Key)
  // đo trên bản sao 2 mặt (vật liệu thật có thể chỉ vẽ mặt trước → tia từ trong lòng xuyên qua)
  cap.updateMatrixWorld(true)
  const inv = cap.matrixWorld.clone().invert()
  const probe = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const meshes: THREE.Mesh[] = []
  cap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const c = new THREE.Mesh(m.geometry, probe)
    c.matrixAutoUpdate = false
    c.matrix.multiplyMatrices(inv, m.matrixWorld)
    c.matrixWorld.copy(c.matrix)
    meshes.push(c)
  })
  const ray = new THREE.Raycaster()
  // (a dọc gân chính, b ngang) → (x, z) của keycap: phím đứng xoay 90° như bản cũ
  const at = (a: number, b: number, y: number) =>
    vertical ? new THREE.Vector3(b, y, -a) : new THREE.Vector3(a, y, b)
  const dir = (da: number, db: number) => at(da, db, 0).normalize()
  const cast = (o: THREE.Vector3, d: THREE.Vector3, skip: number) => {
    ray.set(o, d)
    return ray.intersectObjects(meshes, false).find((h) => h.distance > skip)
  }
  const bot = 1 / 19.05
  const yProbe = bot + 0.02
  const nearStem = (a: number, b: number) =>
    [-span, 0, span].some((s) => Math.hypot(a - s, b) < STEM_RU + 0.01)
  /** độ cao trần tại (a, b) (tia hướng lên từ đáy gân), null = không trúng */
  /**
   * Độ cao chân gân / đỉnh stem stab dưới trần tại (a, b). Vỏ có độ dày (model CAD) thì cắm nhẹ vào trong thành vỏ cho liền;
   * vỏ 1 lớp không dày (Enter chữ L, keycap dựng bằng code: trần = chính mặt trên) thì lùi xuống dưới mặt, không trồi lên
   */
  const ceil = (a: number, b: number) => {
    ray.set(at(a, b, bot), new THREE.Vector3(0, 1, 0))
    const hits = ray.intersectObjects(meshes, false).filter((h) => h.distance > 0.005)
    const [inner, outer] = hits
    if (!inner) return null
    if (outer && outer.point.y - inner.point.y < SHELL_MAX)
      return Math.min(inner.point.y + 0.004, (inner.point.y + outer.point.y) / 2)
    return inner.point.y - THIN_GAP
  }
  /** khoảng tới vách từ (a0, b0) theo hướng (da, db) ở sát đáy gân */
  const wall = (a0: number, b0: number, da: number, db: number, fallback: number) => {
    const h = cast(at(a0, b0, yProbe), dir(da, db), STEM_RU)
    return h ? h.distance : fallback
  }
  const parts: THREE.BufferGeometry[] = []
  /** gân từ p0 tới p1 trên mặt (a, b): mặt trên theo trần lấy mẫu, chỗ trong stem nội suy từ 2 bên */
  const rib = (p0: [number, number], p1: [number, number]) => {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    const ua = (p1[0] - p0[0]) / len
    const ub = (p1[1] - p0[1]) / len
    // lấy mẫu đều + dày ở 2 đầu (sát vách)
    const ts = new Set<number>()
    for (let t = 0; t <= len; t += RIB_STEP) ts.add(t)
    for (let t = 0; t <= Math.min(0.15, len); t += 0.01) {
      ts.add(t)
      ts.add(len - t)
    }
    ts.add(len)
    const xs = [...ts].filter((t) => t >= 0 && t <= len).sort((x, y) => x - y)
    const samp = xs.map((t) => {
      const a = p0[0] + ua * Math.min(t, len - 0.004)
      const b = p0[1] + ub * Math.min(t, len - 0.004)
      return { a: p0[0] + ua * t, b: p0[1] + ub * t, y: nearStem(a, b) ? null : ceil(a, b) }
    })
    // vùng trong stem / không trúng: nội suy tuyến tính từ mẫu 2 bên
    const known = samp.filter((s) => s.y !== null)
    if (!known.length) return
    for (const s of samp)
      if (s.y === null) {
        const L = [...known].reverse().find((q) => q.a * ua + q.b * ub <= s.a * ua + s.b * ub)
        const R = known.find((q) => q.a * ua + q.b * ub >= s.a * ua + s.b * ub)
        s.y = L && R ? (L.y! + R.y!) / 2 : (L ?? R)!.y
      }
    const na = -ub * (RIB_T / 2)
    const nb = ua * (RIB_T / 2)
    const verts: number[] = []
    const quad = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3, w: THREE.Vector3) =>
      verts.push(
        p.x,
        p.y,
        p.z,
        q.x,
        q.y,
        q.z,
        r.x,
        r.y,
        r.z,
        p.x,
        p.y,
        p.z,
        r.x,
        r.y,
        r.z,
        w.x,
        w.y,
        w.z,
      )
    const corner = (s: (typeof samp)[number], side: number, top: boolean) =>
      at(
        s.a + na * side,
        s.b + nb * side,
        top ? Math.max(bot, s.y!) : bot + (Math.max(bot, s.y!) - bot) * (1 - RIB_DEPTH),
      )
    for (let i = 0; i < samp.length - 1; i++) {
      const s0 = samp[i]
      const s1 = samp[i + 1]
      for (const side of [1, -1]) {
        const a = corner(s0, side, false)
        const b = corner(s1, side, false)
        const c = corner(s1, side, true)
        const d = corner(s0, side, true)
        if (side > 0) quad(a, b, c, d)
        else quad(a, d, c, b)
      }
      quad(corner(s0, 1, true), corner(s1, 1, true), corner(s1, -1, true), corner(s0, -1, true))
      quad(corner(s0, -1, false), corner(s1, -1, false), corner(s1, 1, false), corner(s0, 1, false))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.computeVertexNormals()
    parts.push(g)
  }
  // gân dọc: từ vách đầu này tới vách đầu kia qua 3 stem
  // vỏ 1 lớp (không dày): đầu gân lùi khỏi vách cho khỏi xuyên ra ngoài
  ray.set(at(span / 2, 0, bot), new THREE.Vector3(0, 1, 0))
  const up = ray.intersectObjects(meshes, false).filter((h) => h.distance > 0.005)
  const pull = up[1] && up[1].point.y - up[0].point.y < SHELL_MAX ? 0 : THIN_PULL
  const endL = wall(-span, 0, -1, 0, 0.4) - pull
  const endR = wall(span, 0, 1, 0, 0.4) - pull
  rib([-span - endL, 0], [span + endR, 0])
  // gân ngang ở mỗi stem: vách sau → vách trước
  for (const a of [-span, 0, span]) {
    const back = wall(a, 0, 0, -1, 0.3) - pull
    const front = wall(a, 0, 0, 1, 0.3) - pull
    rib([a, -back], [a, front])
  }
  // 2 stem stab: cao tới trần ngay trên đầu stem
  for (const a of [-span, span]) {
    const top = Math.max(bot + 0.05, ...[-1, 1].map((s) => ceil(a + s * (STEM_RU + 0.02), 0) ?? 0))
    const p = at(a, 0, 0)
    parts.push(stemGeometry(top).clone().translate(p.x, 0, p.z))
  }
  // vỏ 1 lớp: ép mọi đỉnh gân / stem xuống dưới mặt keycap (tia từ trên xuống, chỗ sát vách nghiêng / mép bo) cho chắc không lộ
  if (pull) {
    const down = new THREE.Vector3(0, -1, 0)
    const skin = new Map<string, number>()
    for (const g of parts) {
      const pos = g.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const yv = pos.getY(i)
        const z = pos.getZ(i)
        if (yv <= bot + 1e-4) continue
        const key = `${x.toFixed(4)}:${z.toFixed(4)}`
        let sy = skin.get(key)
        if (sy === undefined) {
          ray.set(new THREE.Vector3(x, 5, z), down)
          sy = ray.intersectObjects(meshes, false)[0]?.point.y ?? Infinity
          skin.set(key, sy)
        }
        if (yv > sy - THIN_GAP) pos.setY(i, Math.max(bot, sy - THIN_GAP))
      }
      pos.needsUpdate = true
      g.computeVertexNormals()
    }
  }
  probe.dispose()
  const out = parts.length
    ? mergeGeometries(
        parts
          .map((g) => (g.index ? g.toNonIndexed() : g))
          .map((g) => {
            if (g.getAttribute('uv')) g.deleteAttribute('uv')
            return g
          }),
      )
    : null
  byCap.set(key, out)
  return out
}

/** model CAD đúng cỡ phím rộng (`-w225`, `-h200`...): có sẵn stem stab */
export const isCadWide = (model: string | null) => !!model && /-(w|h)\d+$/.test(model)

/** Trần lòng keycap model CAD 1u (u): mặt hướng xuống gần tâm, cao hơn stem; không dò được thì `fallback` */
export function capCeiling(model: THREE.Object3D, fallback: number) {
  let top = Infinity
  model.traverse((o) => {
    const g = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry : null
    const pos = g?.getAttribute('position')
    const nor = g?.getAttribute('normal')
    if (!pos || !nor) return
    for (let i = 0; i < pos.count; i++)
      if (
        nor.getY(i) < -0.5 &&
        pos.getY(i) > 0.15 &&
        Math.abs(pos.getX(i)) < 0.3 &&
        Math.abs(pos.getZ(i)) < 0.3
      )
        top = Math.min(top, pos.getY(i))
  })
  return Number.isFinite(top) ? top : fallback
}

/** chữ in lệch về phía sau mặt keycap */
export const LEGEND_Z = -0.1
/**
 * Mặt phẳng in chữ khớp mặt keycap: bắn tia xuống lưới điểm quanh vùng chữ, khớp độ cao theo z (nghiêng theo hàng)
 * rồi nâng lên trên điểm cao nhất. Keycap lòng chảo sâu / nghiêng (SA, MT3...) trước bị mặt keycap che mất nửa chữ
 */
export function legendPlane(cap: THREE.Object3D) {
  cap.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  const down = new THREE.Vector3(0, -1, 0)
  const pts: [number, number][] = []
  for (const x of [-0.16, 0, 0.16])
    for (const dz of [-0.17, -0.08, 0, 0.08, 0.15]) {
      ray.set(new THREE.Vector3(x, 5, LEGEND_Z + dz), down)
      const hit = ray.intersectObject(cap, true)[0]
      if (hit) pts.push([dz, hit.point.y])
    }
  if (pts.length < 4) return undefined
  // khớp đường thẳng y = a + b·dz (bình phương nhỏ nhất)
  const n = pts.length
  const mz = pts.reduce((s, p) => s + p[0], 0) / n
  const my = pts.reduce((s, p) => s + p[1], 0) / n
  const b =
    pts.reduce((s, p) => s + (p[0] - mz) * (p[1] - my), 0) /
    (pts.reduce((s, p) => s + (p[0] - mz) ** 2, 0) || 1)
  const a = my - b * mz
  // nâng lên trên điểm cao nhất so với đường khớp (lòng chảo cong), cách mặt 0.012
  const over = Math.max(...pts.map(([z, y]) => y - (a + b * z)))
  return { y: a + over + 0.012, tilt: Math.atan(-b) }
}
