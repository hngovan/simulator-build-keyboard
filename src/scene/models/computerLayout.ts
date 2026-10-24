// Vị trí màn hình máy tính trên bàn (dùng chung cho Room và hiệu ứng camera bay vào màn hình)
import { MM } from './Switch'
import { Y } from '@/data/steps'

/** 1 mét theo đơn vị cảnh */
const M = 1000 * MM
/** khung màn hình (m): rộng, cao, dày, cao độ mép dưới so với mặt bàn */
export const SCREEN = { w: 0.42, h: 0.25, d: 0.02, y: 0.11 }
/** chân đế màn hình (đơn vị cảnh) + góc xoay quanh trục đứng */
export const MONITOR_AT: [number, number, number] = [-0.1 * M, Y.table, -0.28 * M]
export const MONITOR_ROT = 0
/** tâm mặt kính (đơn vị cảnh) */
export const screenCenter = (): [number, number, number] => [
  MONITOR_AT[0],
  MONITOR_AT[1] + (SCREEN.y + SCREEN.h / 2) * M,
  MONITOR_AT[2] + (SCREEN.d / 2) * M,
]
/** chỗ camera dừng trước màn hình (cách mặt kính ~38cm, nhìn thẳng) */
export const screenEye = (): [number, number, number] => {
  const [x, y, z] = screenCenter()
  const d = 0.38 * M
  return [x + Math.sin(MONITOR_ROT) * d, y, z + Math.cos(MONITOR_ROT) * d]
}
