// Vang góc case (case ping): case viền mỏng (`CaseDef.thinBezel`) lắp O-ring / top mount, gõ phím ở góc thì vỏ nhôm
// rung kêu "bong"; foam PCB lót bớt vang
import { CASES } from './parts'
import type { Key } from '@/types'

/** kiểu lắp board treo lơ lửng trong case (không bắt chặt xuống đáy) → góc viền mỏng dễ vang */
const PING_MOUNTS = ['oring', 'top']
/** phím có tâm cách mép khung phím trong khoảng này (u) tính là phím góc */
const CORNER_X = 1.6
const CORNER_Z = 1.1

/**
 * độ vang góc 0..1 (0 = không vang, cũng là tỉ lệ số lần gõ phím góc bị "bong"): case viền mỏng + O-ring / top mount;
 * foam PCB còn 0,5, foam đáy case còn 0,4, lót cả 2 còn 0,2
 */
export function cornerPing(
  caseId: string | undefined,
  mount: string | null,
  foam: boolean,
  caseFoam = false,
) {
  if (!caseId || !mount || !CASES[caseId]?.thinBezel || !PING_MOUNTS.includes(mount)) return 0
  return (foam ? 0.5 : 1) * (caseFoam ? 0.4 : 1)
}

/** khung bao các phím (u, hệ board) */
export function keyBounds(keys: Key[]) {
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  for (const k of keys) {
    x0 = Math.min(x0, k.cx - k.w / 2)
    x1 = Math.max(x1, k.cx + k.w / 2)
    z0 = Math.min(z0, k.cz - k.h / 2)
    z1 = Math.max(z1, k.cz + k.h / 2)
  }
  return { x0, x1, z0, z1 }
}

/** góc case gần phím này: 0 sau trái, 1 sau phải, 2 trước trái, 3 trước phải; −1 = không phải phím góc */
export function pingCorner(keys: Key[], id: string) {
  const k = keys.find((x) => x.id === id)
  if (!k) return -1
  const b = keyBounds(keys)
  const left = k.cx - b.x0 < CORNER_X
  const right = b.x1 - k.cx < CORNER_X
  const back = k.cz - b.z0 < CORNER_Z
  const front = b.z1 - k.cz < CORNER_Z
  if (!(left || right) || !(back || front)) return -1
  return (front ? 2 : 0) + (right ? 1 : 0)
}
