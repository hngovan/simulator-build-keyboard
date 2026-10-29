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
/** chỗ camera dừng trước màn hình (cách mặt kính ~53cm, nhìn thẳng) */
export const screenEye = (): [number, number, number] => {
  const [x, y, z] = screenCenter()
  const d = 0.53 * M
  return [x + Math.sin(MONITOR_ROT) * d, y, z + Math.cos(MONITOR_ROT) * d]
}
