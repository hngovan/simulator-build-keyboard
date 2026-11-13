import * as THREE from 'three'
import { Y } from '@/data/steps'
import { EYE_Y, M, PC_DESK } from './roomLayout'

// Đường camera đoạn mở đầu (`IntroCam`); hết đoạn người chơi đứng ngay dưới `PAN_TO` (`WalkControls`)

/** lia phòng lúc hiện chữ studio (m): từ góc phải gần tường trước trôi chậm vào giữa phòng, nhìn về 2 cái bàn */
export const PAN_FROM = new THREE.Vector3(1.55 * M, EYE_Y + 0.25 * M, 3.75 * M)
export const PAN_TO = new THREE.Vector3(0.75 * M, EYE_Y + 0.05 * M, 3.0 * M)
export const PAN_LOOK = new THREE.Vector3((PC_DESK.x / 2) * M, Y.table + 0.25 * M, 0)
