import * as THREE from 'three'
import type { KeycapProfile } from '@/data/parts'

// Tỉ lệ trong game, lấy dáng từ các mẫu CAD lưu tại assets/community/keycap-profiles.
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
}

const SCULPTED = new Set<KeycapProfile>(['cherry', 'oem', 'sa', 'mt3', 'asa', 'opk'])

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
  // SA chỉ có CAD R1–R3: hàng ASDF, Shift, hàng dưới cùng đều dùng R3
  sa: [1, 2, 3, 3, 3],
}
export const capRow = (profile: KeycapProfile, row: number) =>
  (R_OF[profile] ?? [1, 1, 1, 1, 1])[Math.max(0, Math.min(4, Math.round(row)))]

/**
 * Số đo từ CAD 1u (u, đo mép trên 4 cạnh sau khi chuyển đổi): độ cao giữa mép trước / sau và độ nghiêng
 * (âm = mép sau cao hơn, hàng trên ngả về người gõ). Phím rộng dựng theo số này cho khớp phím 1u
 */
const CAD_ROW: Partial<Record<KeycapProfile, Record<number, { height: number; tilt: number }>>> = {
  cherry: {
    1: { height: 0.428, tilt: -0.056 },
    2: { height: 0.41, tilt: -0.033 },
    3: { height: 0.436, tilt: -0.008 },
    4: { height: 0.525, tilt: 0.015 },
  },
  oem: {
    1: { height: 0.443, tilt: -0.045 },
    2: { height: 0.415, tilt: -0.028 },
    3: { height: 0.437, tilt: -0.007 },
    4: { height: 0.536, tilt: 0.011 },
  },
  sa: {
    1: { height: 0.641, tilt: -0.069 },
    2: { height: 0.659, tilt: -0.037 },
    3: { height: 0.601, tilt: 0 },
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

/** nửa bề rộng CAD 1u (0.92u) và nửa vùng giữa được kéo dãn: 0.16u mỗi mép (thành nghiêng + bo góc) giữ nguyên */
const HALF = 0.46
const CORE = 0.3
const stretchCache = new Map<string, THREE.BufferGeometry>()

/** Dời 1 toạ độ: phần mép giữ nguyên, chỉ phần giữa giãn ra cho đủ cỡ phím (như keycap rộng đúc thật) */
const stretch1 = (v: number, half: number) =>
  v > CORE ? v + half - HALF : v < -CORE ? v - half + HALF : (v * (CORE + half - HALF)) / CORE

/** Hình học keycap CAD 1u kéo dãn tới w × h (u) theo kiểu 9-slice: mép không bị vót nhọn */
export function stretchCapGeometry(geo: THREE.BufferGeometry, w: number, h: number) {
  const hw = (w - 0.08) / 2
  const hd = (h - 0.08) / 2
  if (Math.abs(hw - HALF) < 1e-3 && Math.abs(hd - HALF) < 1e-3) return geo
  const key = `${geo.uuid}:${w}:${h}`
  const hit = stretchCache.get(key)
  if (hit) return hit
  const out = geo.clone()
  const pos = out.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, stretch1(pos.getX(i), hw))
    pos.setZ(i, stretch1(pos.getZ(i), hd))
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
export function keycapModel(profile: KeycapProfile, row: number): string | null {
  if (profile === 'asa') return null
  const r = capRow(profile, row)
  if (profile === 'cherry' || profile === 'oem' || profile === 'sa') return `${profile}-r${r}`
  return profile
}
