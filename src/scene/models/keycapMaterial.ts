import * as THREE from 'three'
import { keycapColorOf } from '@/data/parts'

/**
 * Thông số vật liệu keycap theo màu: màu thường = nhựa đục; màu trong nhuộm (keycap PC, `KEYCAP_COLORS[].clear`) = bóng hơn,
 * trong mờ nhìn xuyên thấy switch (không dùng transmission: cả bàn ~100 keycap, render thêm lượt khúc xạ quá nặng)
 */
export function keycapMatParams(color: string): THREE.MeshStandardMaterialParameters {
  const c = keycapColorOf(color)
  if (!c.clear) return { color: c.hex, roughness: 0.55, side: THREE.DoubleSide }
  return {
    color: c.hex,
    roughness: 0.18,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: color === 'clear' ? 0.38 : 0.55,
    depthWrite: false,
  }
}

/** vật liệu keycap mới theo màu */
export const keycapMaterial = (color: string) =>
  new THREE.MeshStandardMaterial(keycapMatParams(color))
