// Vị trí màn hình máy tính trên bàn máy tính (dùng chung cho Room và hiệu ứng camera bay vào màn hình)
import { Y } from '@/data/steps'
import { M, PC_DESK } from '../room/roomLayout'

/** khung màn hình (m): rộng, cao, dày, cao độ mép dưới so với mặt bàn */
// đo từ model ASUS (asus-monitor.glb) co cho mặt kính rộng 0,6m: cao 0,345, mép dưới cách mặt bàn 0,081
export const SCREEN = { w: 0.6, h: 0.345, d: 0.02, y: 0.081 }
/** chân đế màn hình (đơn vị cảnh) + góc xoay quanh trục đứng: sát mép sau bàn máy tính, quay mặt vào phòng (+z) */
export const MONITOR_AT: [number, number, number] = [
  PC_DESK.x * M,
  Y.table,
  (PC_DESK.z - PC_DESK.d / 2 + 0.17) * M,
]
export const MONITOR_ROT = 0
/** tâm mặt kính (đơn vị cảnh) */
export const screenCenter = (): [number, number, number] => [
  MONITOR_AT[0] + Math.sin(MONITOR_ROT) * (SCREEN.d / 2) * M,
  MONITOR_AT[1] + (SCREEN.y + SCREEN.h / 2) * M,
  MONITOR_AT[2] + Math.cos(MONITOR_ROT) * (SCREEN.d / 2) * M,
]
/** tỉ lệ ngang / dọc mặt kính */
const SCREEN_RATIO = SCREEN.w / SCREEN.h

/**
 * Khung desktop trên màn hình thật (px) khi ngồi máy tính: đúng tỉ lệ mặt kính, cao ~90% (rộng tối đa 94%) để vẫn thấy
 * chút bàn / phòng xung quanh; màn hẹp (điện thoại, < 768px) phủ kín
 */
export function pcFrame(vw: number, vh: number) {
  if (vw < 768) return { w: vw, h: vh, full: true }
  const h = Math.min(vh * 0.9, (vw * 0.94) / SCREEN_RATIO)
  return { w: Math.round(h * SCREEN_RATIO), h: Math.round(h), full: false }
}

/** chỗ camera nhìn thẳng mặt kính sao cho kính trùng đúng khung desktop `pcFrame` (fov dọc theo độ) */
export const pcEye = (fov: number, vw: number, vh: number): [number, number, number] => {
  const [x, y, z] = screenCenter()
  const { h, full } = pcFrame(vw, vh)
  // điện thoại: sát mặt kính (cách ~53cm)
  const d = full ? 0.53 * M : (SCREEN.h * M * vh) / (2 * Math.tan((fov * Math.PI) / 360) * h)
  return [x + Math.sin(MONITOR_ROT) * d, y, z + Math.cos(MONITOR_ROT) * d]
}

/**
 * Viền vỏ màn hình quanh mặt kính, tính theo phần bề ngang / chiều cao mặt kính (đo từ asus-monitor.glb: kính 1,190 × 0,685,
 * vỏ dư 0,021 mỗi bên, 0,018 trên, 0,042 dưới). Desktop dùng để bấm viền không tính là bấm ra ngoài
 */
export const BEZEL = { side: 0.0175, top: 0.027, bottom: 0.062 }
