// Bố cục phòng làm việc (dùng chung cho Room, camera đi lại, màn hình máy tính).
// Gốc toạ độ = tâm bàn build, đơn vị cảnh (u = 19.05mm); số đo ghi theo mét rồi nhân M
import { Y } from '@/data/steps'
import { MM } from '../models/Switch'

/** 1 mét theo đơn vị cảnh; model Poly Haven dùng mét */
export const M = 1000 * MM
/** bàn build (model wooden_table_02, m), đo từ file glb */
export const DESK = { w: 1.134, d: 0.706, h: 0.799 }
export const FLOOR_Y = Y.table - DESK.h * M
/** mép phòng (m): tường trái / phải ở ±HALF_W, tường sau sát mép sau bàn build, tường trước FRONT_M */
export const HALF_W = 2.4
export const BACK_M = -(DESK.d / 2 + 0.05)
export const FRONT_M = BACK_M + 4.6
/** độ dày tường giữa phòng và hành lang (m) */
export const WALL_T = 0.1
/** Phòng 4.8m × 4.6m, cao 2.6m (người dùng: phòng 3.6m bí bách quá) */
export const ROOM = { w: HALF_W * 2 * M, d: (FRONT_M - BACK_M) * M, h: 2.6 * M, back: BACK_M * M }
export const ROOM_CZ = ROOM.back + ROOM.d / 2
export const FRONT_Z = ROOM.back + ROOM.d
/** Vùng tâm camera được kéo tới (ngồi ở bàn build): trong 4 bức tường, chừa 0.2m; cao từ sát sàn tới tầm kệ */
const PAD = 0.2 * M
export const ROOM_BOUNDS = {
  minX: -ROOM.w / 2 + PAD,
  maxX: ROOM.w / 2 - PAD,
  minZ: ROOM.back + PAD,
  maxZ: FRONT_Z - PAD,
  minY: FLOOR_Y + 0.05 * M,
  maxY: 0.8 * M,
  /** camera không được chui xuống dưới sàn */
  floorY: FLOOR_Y + 0.03 * M,
}

/**
 * Bàn máy tính đặt sát bên trái bàn build, cùng dựa tường sau (m, tâm mặt bàn): w = dài theo x, d = sâu theo z;
 * mặt bàn cao bằng bàn build (Y.table). PcDesk dựng theo hệ riêng (dài theo z, mép trước +x) rồi xoay `rot`
 */
export const PC_DESK = { x: -1.17, z: 0, w: 1.2, d: 0.7, rot: -Math.PI / 2 }
/** lót chuột 90 × 40cm (dài theo z) */
export const MOUSE_PAD = { w: 0.9, d: 0.4 }

/** kệ chưng bàn phím (model rộng 1m, sâu 0.257m) dựa tường trước (sau lưng khi ngồi bàn build), tâm x (m) */
export const SHELF_X = -(DESK.w / 2 + 0.65)

/**
 * cửa sổ rèm lá ở tường sau, phía trên bàn máy tính (m): tâm x, rộng lòng khung, cao, cao độ bậu so với sàn.
 * Cả khung rộng bằng bàn máy tính 1,2m, cùng tâm (người dùng: "bằng cái bàn máy tính là được")
 */
export const WINDOW = { x: PC_DESK.x, w: 1.14, h: 1.2, sill: 0.98 }

/** bàn gỗ làm việc (WoodenTable_03, 1.33 × 0.58m) dựa tường phải, mặt trước quay vào phòng */
export const WORK_TABLE = { x: HALF_W - 0.3, z: 1.8, w: 1.33, d: 0.58, h: 0.83 }

/** lịch treo tường sau, phía trên bàn build (m): rộng, cao, cao độ tâm so với sàn */
export const CALENDAR = { w: 0.52, h: 0.7, y: 1.55 }

/**
 * Hành lang ngoài tường trái (m), dài ~7m: ô cửa cạnh bàn máy tính dẫn ra. Đầu xa (z0, chạy ra sau phòng): kệ sắt để hàng
 * giao tới + ghế đôn, cửa chính ở tường bên trái ngay cuối hành lang. Đầu gần (z1): cửa sổ rèm lá, chậu cây, kệ giao hàng
 */
export const HALL = { x0: -HALF_W - WALL_T - 1.2, x1: -HALF_W - WALL_T, z0: -3.0, z1: FRONT_M }
export const DOORWAY = { z0: 0.7, z1: 1.6, h: 2.1 }
/** cửa chính: tường ngoài hành lang (x0), tâm z gần cuối hành lang */
export const HALL_DOOR_Z = HALL.z0 + 0.8
/** cửa sổ rèm lá ở đầu gần hành lang (cạnh chậu cây) */
export const HALL_WINDOW = { x: (HALL.x0 + HALL.x1) / 2, w: 0.8, h: 1.2, sill: 0.95 }
/** kệ sắt để hàng giao tới: dựa tường cuối hành lang, lệch về phía tường phòng (m, tâm chân kệ) */
export const RACK = { x: HALL.x1 - 0.55, z: HALL.z0 + 0.21, w: 0.9, d: 0.38, h: 1.25 }
/** kệ cất đơn (kệ sắt như kệ cửa, hạ thấp 80%): dựa tường phải gần tường trước, dưới tranh treo, mặt trước quay vào phòng (m) */
export const STORE_SHELF = { x: HALF_W - RACK.d / 2 - 0.01, z: FRONT_M - 0.9 }
export const HALL_PLANT = { x: HALL.x0 + 0.22, z: HALL.z1 - 0.25 }
/** kệ giao hàng 2 tầng: dựa tường ngoài hành lang (x0) ngay sau chậu cây, mặt trước quay vào hành lang (+x) (m, tâm chân kệ) */
export const SHIP_RACK = { x: HALL.x0 + RACK.d / 2 + 0.01, z: HALL_PLANT.z - 0.3 - RACK.w / 2 }

/** tầm với khi đi lại (m, theo mặt sàn từ chỗ đứng tới chỗ trỏ): xa hơn thì không rê sáng / bấm được đồ vật */
export const REACH_M = 1.8

/** chỗ trỏ trong tầm với chưa (đi lại); đang ngồi (không đi lại) thì luôn được */
export const inReach = (e: {
  point: { x: number; z: number }
  camera: { position: { x: number; z: number } }
}) => Math.hypot(e.point.x - e.camera.position.x, e.point.z - e.camera.position.z) <= REACH_M * M

/** Đi lại: mắt cao 1.6m, bán kính người 0.22m */
export const EYE_Y = FLOOR_Y + 1.6 * M
const R_M = 0.22
export const BODY_R = R_M * M

/** Vùng đi được (đơn vị cảnh, đã chừa bán kính người): phòng, hành lang, ô cửa nối 2 bên */
export const WALK_AREAS: [number, number, number, number][] = (
  [
    [-HALF_W + R_M, HALF_W - R_M, BACK_M + R_M, FRONT_M - R_M],
    [HALL.x0 + R_M, HALL.x1 - R_M, HALL.z0 + R_M, HALL.z1 - R_M],
    [HALL.x1 - R_M, -HALF_W + R_M, DOORWAY.z0 + R_M, DOORWAY.z1 - R_M],
  ] as [number, number, number, number][]
).map((b) => b.map((v) => v * M) as [number, number, number, number])

/** Khối cản khi đi (m): [x0, x1, z0, z1] — bàn, kệ (ghế không cản cho khỏi kẹt lối đi hẹp) */
const BLOCKS_M: [number, number, number, number][] = [
  // bàn máy tính + bàn build sát nhau
  [PC_DESK.x - PC_DESK.w / 2, DESK.w / 2, BACK_M, DESK.d / 2],
  // kệ bàn phím dựa tường trước
  [SHELF_X - 0.5, SHELF_X + 0.5, FRONT_M - 0.257, FRONT_M],
  // kệ sắt cuối hành lang
  [RACK.x - RACK.w / 2, RACK.x + RACK.w / 2, HALL.z0, HALL.z0 + RACK.d],
  // kệ giao hàng cạnh chậu cây
  [HALL.x0, HALL.x0 + RACK.d, SHIP_RACK.z - RACK.w / 2, SHIP_RACK.z + RACK.w / 2],
  // kệ cất đơn dựa tường phải
  [HALF_W - RACK.d, HALF_W, STORE_SHELF.z - RACK.w / 2, STORE_SHELF.z + RACK.w / 2],
  // bàn làm việc
  [
    WORK_TABLE.x - WORK_TABLE.d / 2,
    HALF_W,
    WORK_TABLE.z - WORK_TABLE.w / 2,
    WORK_TABLE.z + WORK_TABLE.w / 2,
  ],
]
export const BLOCKS = BLOCKS_M.map((b) => b.map((v) => v * M) as [number, number, number, number])

/** chỗ đứng (m: x, z) khi vừa đứng dậy khỏi bàn build / máy tính */
export const SPOTS = {
  bench: [0, 1.2],
  pc: [PC_DESK.x, 1.0],
} as const
