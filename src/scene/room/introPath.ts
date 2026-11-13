import * as THREE from 'three'
import { Y } from '@/data/steps'
import { EYE_Y, FLOOR_Y, FRONT_M, HALL, M, PC_DESK, SHELF_X } from './roomLayout'

// Đường camera đoạn mở đầu (`IntroCam`); hết đoạn người chơi đứng ngay dưới `PAN_TO` (`WalkControls`)

/** lia phòng lúc hiện chữ studio (m): từ góc phải gần tường trước trôi chậm vào giữa phòng, nhìn về 2 cái bàn */
export const PAN_FROM = new THREE.Vector3(1.55 * M, EYE_Y + 0.25 * M, 3.75 * M)
export const PAN_TO = new THREE.Vector3(0.75 * M, EYE_Y + 0.05 * M, 3.0 * M)
export const PAN_LOOK = new THREE.Vector3((PC_DESK.x / 2) * M, Y.table + 0.25 * M, 0)

/** 1 cảnh cắt: camera trôi chậm `from → to`, nhìn về `look` */
export interface IntroShot {
  from: THREE.Vector3
  to: THREE.Vector3
  look: THREE.Vector3
}
const HALL_X = ((HALL.x0 + HALL.x1) / 2) * M
/** hành lang: đứng đầu gần (cạnh cửa sổ), nhìn dọc về kệ nhận hàng cuối hành lang, tiến chậm tới */
export const HALL_SHOT: IntroShot = {
  from: new THREE.Vector3(HALL_X, EYE_Y, (HALL.z1 - 0.5) * M),
  to: new THREE.Vector3(HALL_X, EYE_Y, (HALL.z1 - 1.3) * M),
  look: new THREE.Vector3(HALL_X, FLOOR_Y + 0.9 * M, HALL.z0 * M),
}
/** góc kệ chưng bàn phím (tường trước, sau lưng khi ngồi bàn build): nhìn chéo vào kệ, trôi ngang chậm */
export const SHELF_SHOT: IntroShot = {
  from: new THREE.Vector3((SHELF_X + 1.25) * M, EYE_Y - 0.15 * M, (FRONT_M - 1.9) * M),
  to: new THREE.Vector3((SHELF_X + 0.85) * M, EYE_Y - 0.15 * M, (FRONT_M - 1.7) * M),
  look: new THREE.Vector3(SHELF_X * M, FLOOR_Y + 1.05 * M, FRONT_M * M),
}
