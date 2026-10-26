import * as THREE from 'three'
import { TRAY_COLORS } from '@/data/parts'

// Khay đựng ốc nhôm CNC hình giọt nước (kiểu khay Deadline Studio): lòng chảo tròn lõm giữa, 3 rãnh xẻ trên vành,
// lỗ treo ở mũi. Hệ u, đáy khay ở y = 0, tâm lòng chảo ở gốc, mũi giọt nước chĩa về −x

/** bán kính phần tròn / vành lòng chảo / đáy phẳng lòng chảo */
const R = 1.5
const BOWL = 1.12
const FLOOR = 0.5
/** khoảng cách tâm → mũi giọt nước, bán kính bo mũi */
const TIP = 2.55
const TIP_R = 0.42
/** dày khay, cao đáy lòng chảo */
export const TRAY_H = 0.32
export const TRAY_FLOOR_Y = 0.08

/** Viền giọt nước: cung tròn lớn + 2 đường tiếp tuyến tới cung bo ở mũi */
function teardrop() {
  const shape = new THREE.Shape()
  // góc tiếp tuyến chung của 2 đường tròn (R ở gốc, TIP_R ở mũi −x)
  const a = Math.acos((R - TIP_R) / TIP)
  shape.absarc(0, 0, R, Math.PI - a, -(Math.PI - a), true)
  shape.absarc(-TIP, 0, TIP_R, -(Math.PI - a), Math.PI - a, true)
  shape.closePath()
  return shape
}

/** rãnh xẻ trên vành: dài / rộng / sâu (u) */
const SLOT_L = 0.26
const SLOT_W = 0.12
const SLOT_D = 0.12

const anod = (hex: string, roughness: number) =>
  new THREE.MeshStandardMaterial({
    color: hex,
    metalness: hex === TRAY_COLORS.silver.hex ? 0.85 : 0.6,
    roughness,
    side: THREE.DoubleSide,
  })

/** Rãnh bo 2 đầu (hình viên thuốc) dọc theo hướng `a`, tâm (x, y) trên mặt hình 2D */
function stadium<T extends THREE.Path>(path: T, x: number, y: number, a: number): T {
  const r = SLOT_W / 2
  const h = SLOT_L / 2 - r
  const dx = Math.cos(a) * h
  const dy = Math.sin(a) * h
  path.absarc(x + dx, y + dy, r, a - Math.PI / 2, a + Math.PI / 2, false)
  path.absarc(x - dx, y - dy, r, a + Math.PI / 2, a + (3 * Math.PI) / 2, false)
  return path
}

/** 3 rãnh xẻ trên vành (trên, phải, trái dưới như ảnh mẫu): góc trên mặt 2D (y 2D = −z cảnh) */
const SLOTS = [Math.PI / 2 + 0.3, -0.25, Math.PI + 1.05]
// giữa vành (lòng chảo r = BOWL → mép R): lỗ rãnh không được chạm lỗ lòng chảo / mép ngoài (vỡ tam giác hoá)
const SLOT_AT = (R + BOWL) / 2

export function createScrewTray(color = 'silver') {
  const group = new THREE.Group()
  const hex = (TRAY_COLORS[color] ?? TRAY_COLORS.silver).hex
  const body = anod(hex, 0.34)
  // lòng chảo / đáy rãnh tiện bóng hơn mặt khay
  const inner = anod(hex, 0.2)
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = m.receiveShadow = true
    group.add(m)
    return m
  }
  // thân: giọt nước khoét lòng chảo + lỗ treo ở mũi + 3 rãnh xẻ (khoét xuyên, đáy rãnh lấp ở dưới), bo cạnh trên
  const shape = teardrop()
  shape.holes.push(new THREE.Path().absarc(0, 0, BOWL, 0, Math.PI * 2, true))
  shape.holes.push(new THREE.Path().absarc(-TIP, 0, 0.2, 0, Math.PI * 2, true))
  for (const a of SLOTS)
    shape.holes.push(stadium(new THREE.Path(), Math.cos(a) * SLOT_AT, Math.sin(a) * SLOT_AT, a))
  const B = 0.035
  const slab = new THREE.ExtrudeGeometry(shape, {
    depth: TRAY_H - 2 * B,
    bevelEnabled: true,
    bevelThickness: B,
    bevelSize: B,
    bevelSegments: 3,
    curveSegments: 48,
  })
    .rotateX(-Math.PI / 2)
    .translate(0, B, 0)
  add(slab, body)
  // đáy rãnh: tấm liền ở độ sâu SLOT_D dưới mặt khay (thành rãnh = thành lỗ của thân)
  for (const a of SLOTS) {
    const floor = stadium(new THREE.Shape(), Math.cos(a) * SLOT_AT, Math.sin(a) * SLOT_AT, a)
    add(
      new THREE.ShapeGeometry(floor, 12).rotateX(-Math.PI / 2).translate(0, TRAY_H - SLOT_D, 0),
      inner,
    )
  }
  // lòng chảo: vành → cong xuống đáy phẳng
  const prof: THREE.Vector2[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    prof.push(
      new THREE.Vector2(
        BOWL - (BOWL - FLOOR) * Math.sin((t * Math.PI) / 2),
        TRAY_H - (TRAY_H - TRAY_FLOOR_Y) * (1 - Math.cos((t * Math.PI) / 2)),
      ),
    )
  }
  add(new THREE.LatheGeometry(prof.reverse(), 64), inner)
  add(
    new THREE.CircleGeometry(FLOOR, 48).rotateX(-Math.PI / 2).translate(0, TRAY_FLOOR_Y, 0),
    inner,
  )
  // đáy liền dưới lòng chảo + đáy lỗ treo nhìn nghiêng không thủng
  add(new THREE.CircleGeometry(BOWL, 48).rotateX(Math.PI / 2), body)
  return group
}

/** Cao độ mặt lòng chảo ở bán kính r (đáy phẳng → cong lên vành): ốc dài vượt đáy phẳng thì tì lên thành */
export function bowlY(r: number) {
  if (r <= FLOOR) return TRAY_FLOOR_Y
  if (r >= BOWL) return TRAY_H
  // ngược profile lòng chảo: r = BOWL − (BOWL − FLOOR)·sin u, y = TRAY_H − (TRAY_H − đáy)·(1 − cos u)
  const u = Math.asin((BOWL - r) / (BOWL - FLOOR))
  return TRAY_H - (TRAY_H - TRAY_FLOOR_Y) * (1 - Math.cos(u))
}
