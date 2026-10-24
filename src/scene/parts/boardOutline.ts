import * as THREE from 'three'
import type { Key } from '@/types'

// Đường viền PCB / plate theo layout. Layout thường: 1 hình chữ nhật width × depth (như trước).
// Layout có phím xoay (Alice): mỗi nửa (cùng góc xoay) là 1 đa giác lồi bao các phím của nửa đó,
// chừa viền pad. Toạ độ hình 2D: x = x cảnh, y = −z cảnh (đúng chiều khi xoay −90° quanh trục x)

type P = [number, number]

/** Bao lồi (monotone chain) */
function hull(points: P[]): P[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: P[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop()
    lower.push(p)
  }
  const upper: P[] = []
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export interface BoardOutline {
  shapes: THREE.Shape[]
  /** shape chứa phím (để khoét lỗ plate đúng mảnh) */
  shapeOf: (k: Key) => THREE.Shape
}

/** Đường viền board: inset = thu vào so với khung phím (plate nhỏ hơn PCB 1 chút) */
export function boardOutline(
  keys: Key[],
  width: number,
  depth: number,
  inset = 0,
  outline?: [number, number][],
): BoardOutline {
  // viền PCB thật (Alice): 1 mảnh theo Edge.Cuts, co vào inset quanh tâm
  if (outline?.length) {
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length
    const cz = outline.reduce((s, p) => s + p[1], 0) / outline.length
    const shape = new THREE.Shape(
      outline.map(([x, z]) => {
        const d = Math.hypot(x - cx, z - cz) || 1
        const k = Math.max(0, 1 - inset / d)
        return new THREE.Vector2(cx + (x - cx) * k, -(cz + (z - cz) * k))
      }),
    )
    return { shapes: [shape], shapeOf: () => shape }
  }
  const groups = new Map<number, Key[]>()
  for (const k of keys) {
    const g = groups.get(k.rot) ?? []
    g.push(k)
    groups.set(k.rot, g)
  }
  if (groups.size === 1 && keys[0]?.rot === 0) {
    const w = width / 2 - inset
    const d = depth / 2 - inset
    const shape = new THREE.Shape([
      new THREE.Vector2(-w, -d),
      new THREE.Vector2(w, -d),
      new THREE.Vector2(w, d),
      new THREE.Vector2(-w, d),
    ])
    return { shapes: [shape], shapeOf: () => shape }
  }
  // viền chừa quanh phím của mỗi nửa
  const pad = 0.12 - inset
  const byRot = new Map<number, THREE.Shape>()
  for (const [rot, ks] of groups) {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const pts: P[] = ks.flatMap((k) =>
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]): P => {
        const dx = sx * (k.w / 2 + pad)
        const dz = sz * (k.h / 2 + pad)
        return [k.cx + dx * c + dz * s, -(k.cz - dx * s + dz * c)]
      }),
    )
    byRot.set(rot, new THREE.Shape(hull(pts).map(([x, y]) => new THREE.Vector2(x, y))))
  }
  return { shapes: [...byRot.values()], shapeOf: (k) => byRot.get(k.rot)! }
}

/** Mặt phẳng theo đường viền, UV phủ đúng khung width × depth (dùng chung texture PCB) */
export function outlinePlane(shapes: THREE.Shape[], width: number, depth: number) {
  const geo = new THREE.ShapeGeometry(shapes).rotateX(-Math.PI / 2)
  const uv = geo.getAttribute('uv')
  const pos = geo.getAttribute('position')
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, pos.getX(i) / width + 0.5, -pos.getZ(i) / depth + 0.5)
  return geo
}

/** Khối đùn theo đường viền từ y0 lên y1 */
export function outlineSlab(shapes: THREE.Shape[], y0: number, y1: number) {
  return new THREE.ExtrudeGeometry(shapes, { depth: y1 - y0, bevelEnabled: false })
    .rotateX(-Math.PI / 2)
    .translate(0, y0, 0)
}
