import * as THREE from 'three'
import polygonClipping, { type Polygon } from 'polygon-clipping'
import type { Key } from '@/types'

/**
 * Viền mặt phím trong hệ toạ độ của phím (tâm ô chính = 0, chưa xoay), mỗi cạnh lùi vào `inset` (u): phím thường = chữ nhật,
 * phím chữ L (Enter ISO / Big-ass, `Key.ext`) = hợp ô chính + cánh. Trả các điểm [x, z] theo vòng (không lặp điểm đầu)
 */
export function keyOutline(k: Pick<Key, 'w' | 'h' | 'ext'>, inset = 0): [number, number][] {
  const rect = (x: number, z: number, w: number, h: number): Polygon => {
    const hw = w / 2 - inset
    const hh = h / 2 - inset
    return [
      [
        [x - hw, z - hh],
        [x + hw, z - hh],
        [x + hw, z + hh],
        [x - hw, z + hh],
        [x - hw, z - hh],
      ],
    ]
  }
  const main = rect(0, 0, k.w, k.h)
  if (!k.ext) return main[0].slice(0, -1) as [number, number][]
  // 2 ô lùi vào inset thì cánh tách khỏi ô chính ở chỗ giáp → nới cánh về phía ô chính rồi hợp
  const { x, z, w, h } = k.ext
  const union = polygonClipping.union(main, rect(x, z, w + inset * 2, h + inset * 2))
  const outer = union[0][0]
  // cánh nới ra ngoài viền ô chính ở mép ngoài: cắt lại theo khung bao đã lùi
  const minX = Math.min(-k.w / 2, x - w / 2) + inset
  const maxX = Math.max(k.w / 2, x + w / 2) - inset
  const minZ = Math.min(-k.h / 2, z - h / 2) + inset
  const maxZ = Math.max(k.h / 2, z + h / 2) - inset
  const box: Polygon = [
    [
      [minX, minZ],
      [maxX, minZ],
      [maxX, maxZ],
      [minX, maxZ],
      [minX, minZ],
    ],
  ]
  const clipped = polygonClipping.intersection([[outer]], box)
  return (clipped[0]?.[0] ?? outer).slice(0, -1) as [number, number][]
}

/** Hình 2D của viền phím cho Shape / Extrude (trục y của hình = −z của cảnh, xoay −90° quanh x khi đặt nằm) */
export function keyShape2D(k: Pick<Key, 'w' | 'h' | 'ext'>, inset = 0) {
  return new THREE.Shape(keyOutline(k, inset).map(([x, z]) => new THREE.Vector2(x, -z)))
}

/** Caps Lock stepped: phím có cánh `ext` cùng hàng (không phải Enter chữ L 2 hàng) */
export const isStepped = (k: Key) => !!k.ext && Math.abs(k.ext.z) < 1e-6 && k.ext.h === k.h
/** cao bậc thấp keycap stepped so với cả keycap */
export const STEP_LOW = 0.4
