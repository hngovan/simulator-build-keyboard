import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type GameState } from '@/store'
import { parcelStacks } from '@/data/shipping'
import {
  DOOR_RACK_SLOTS,
  SHELF_SLOTS,
  NEAT_PER_ROW,
  SHIP_SLOTS,
  SLOTS_PER_ROW,
  slotTaken,
  type BoxAt,
  type BoxSpot,
} from '@/data/boxes'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { Text } from '../common/Text3D'
import { RoomSpot } from './RoomSpot'
import { MetalRack, RACK_TIERS } from './HallProps'
import { M, RACK, inReach } from './roomLayout'
import {
  NO_OUTLINE,
  OUTLINE_GHOST_MAT,
  OUTLINE_ON_TOP,
  outlineGeometry,
} from '../common/hoverOutline'

// Thùng hàng trong phòng (dựng bằng code), đơn vị mét, gốc = chân kệ, mặt trước kệ +z:
// - `DoorParcels` (kệ sắt cuối hành lang, 4 tầng): nhận hàng = thùng đơn khách gửi tới (bấm để cầm) + kiện Shopii / chợ
//   (bấm để nhận vào kho, cùng sản phẩm gộp 1 chồng), hết kệ thì đổ đống dưới sàn trước kệ (nghiêng, chồng lộn xộn)
// - `ShipRack` (kệ 2 tầng cạnh chậu cây): ô giao hàng (đặt thùng đã đóng gói vào = gửi khách)
// - `StorageShelf` (kệ cất đơn trong phòng): cất thùng đơn đang làm dở / chưa làm
// - `HeldBox`: thùng đang cầm, bay theo camera trước mặt
// Đang cầm thùng thì các ô đặt được hiện khối mờ vàng (bấm để đặt)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const LABEL = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.8 })
/** thùng mở được: 6 mặt carton, riêng mặt trên (+y, thứ tự mặt BoxGeometry: +x −x +y −y +z −z) là lòng thùng tối */
const OPEN_MATS = [
  CARD,
  CARD,
  new THREE.MeshStandardMaterial({ color: '#7a5631', roughness: 1 }),
  CARD,
  CARD,
  CARD,
]
const BRAND = new THREE.MeshStandardMaterial({ color: '#ee4d2d', roughness: 0.7 })
const TAPES = {
  // kiện Shopii băng keo vàng nhạt, thùng đơn khách băng keo xanh, thùng đã đóng gói băng keo đỏ
  shopii: new THREE.MeshStandardMaterial({ color: '#d9c49a', roughness: 0.5 }),
  // kiện người bán ở chợ gửi: băng keo nâu, không logo Shopii
  market: new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.5 }),
  order: new THREE.MeshStandardMaterial({ color: '#3d8bff', roughness: 0.5 }),
  packed: new THREE.MeshStandardMaterial({ color: '#ff5d5d', roughness: 0.5 }),
}
/** khối mờ chỗ đặt thùng: xanh da trời nhạt (rê trong tầm với thì viền xanh lá bao mặt nhìn thấy) */
const GHOST = new THREE.MeshBasicMaterial({
  color: '#8fd0ff',
  transparent: true,
  opacity: 0.22,
  // ghi chiều sâu: viền vẽ sau khối bị che phần nằm sau mặt trước, chỉ lộ đường bao
  depthWrite: true,
})

const NO_RAY = () => {}

/** cỡ thùng (m): thùng của khách (đơn mới nhận / đã đóng gói) chữ nhật dẹt dài cỡ hộp bàn phím, vừa sâu kệ 0,38m */
/** cỡ thùng đơn (rộng × cao × sâu, m) */
export const ORDER_BOX: [number, number, number] = [0.28, 0.14, 0.36]
const PACKED_BOX = ORDER_BOX

/** số giả ngẫu nhiên [0, 1) cố định theo id kiện (cỡ thùng, góc xoay không nhảy khi vẽ lại) */
function hash01(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}

/** tem "hàng dễ vỡ": ly vỡ đỏ + chữ DỄ VỠ trên nền trắng (vẽ canvas 1 lần) */
let fragileMat: THREE.MeshStandardMaterial | null = null
function fragileSticker() {
  if (fragileMat) return fragileMat
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#f6f3ec'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#d32f2f'
  g.lineWidth = 6
  g.strokeRect(5, 5, 118, 118)
  g.fillStyle = '#d32f2f'
  // ly rượu: miệng ly + chân + đế
  g.beginPath()
  g.moveTo(40, 16)
  g.lineTo(88, 16)
  g.quadraticCurveTo(88, 62, 64, 66)
  g.quadraticCurveTo(40, 62, 40, 16)
  g.fill()
  g.fillRect(61, 64, 6, 22)
  g.fillRect(48, 84, 32, 6)
  // vết nứt
  g.strokeStyle = '#f6f3ec'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(56, 16)
  g.lineTo(64, 30)
  g.lineTo(58, 40)
  g.lineTo(66, 52)
  g.stroke()
  g.fillStyle = '#d32f2f'
  g.font = '900 26px system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText('DỄ VỠ', 64, 116)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  fragileMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })
  return fragileMat
}

/**
 * Thùng carton: băng keo dọc nắp + nhãn giao hàng mặt trước (kiện Shopii thêm logo cam);
 * thùng của khách (order / packed) dán tem dễ vỡ mặt trước + nắp, `name` = chữ ghi trên nhãn (tên khách / số kiện gộp)
 */
export function CardBox({
  size,
  kind,
  big,
  name,
  flaps,
}: {
  size: [number, number, number]
  kind: keyof typeof TAPES
  big?: boolean
  name?: string
  /** thùng mở được (bước mở hộp): mặt trên là 2 nắp gập bản lề mép sau / mép trước, xoay quanh x qua 2 ref; lòng thùng tối */
  flaps?: { back: RefObject<THREE.Group>; front: RefObject<THREE.Group> }
}) {
  const [w, h, d] = size
  const fragile = kind === 'order' || kind === 'packed'
  // tem vuông: mặt trước bên phải nhãn, trên nắp cạnh băng keo
  const tag = Math.min(h * 0.7, w * 0.22)
  const labelX = fragile ? -w * 0.1 : 0
  const topTag = fragile && (
    <mesh
      position={[w * 0.28, h + 0.0012, d * 0.25]}
      rotation-x={-Math.PI / 2}
      material={fragileSticker()}
      name={NO_OUTLINE}
    >
      <planeGeometry args={[tag * 1.2, tag * 1.2]} />
    </mesh>
  )
  /** 1 nắp gập (nửa sau `side` −1 / nửa trước +1): tấm carton + nửa băng keo, bản lề ở mép ngoài */
  const flap = (side: -1 | 1, ref: RefObject<THREE.Group>, extra?: ReactNode) => (
    <group ref={ref} position={[0, h, (side * d) / 2]}>
      <group position={[0, -h, (-side * d) / 2]}>
        <mesh position={[0, h + 0.0015, (side * d) / 4]} material={CARD} castShadow>
          <boxGeometry args={[w, 0.003, d / 2]} />
        </mesh>
        <mesh position={[0, h + 0.0035, (side * d) / 4]} material={TAPES[kind]} name={NO_OUTLINE}>
          <boxGeometry args={[0.05, 0.0016, d / 2]} />
        </mesh>
        {extra}
      </group>
    </group>
  )
  return (
    <group>
      {flaps ? (
        <>
          {/* thân thùng: mặt trên (+y) là lòng thùng tối, 2 nắp gập phủ lên */}
          <mesh position-y={h / 2} material={OPEN_MATS} castShadow receiveShadow>
            <boxGeometry args={size} />
          </mesh>
          {flap(-1, flaps.back)}
          {flap(1, flaps.front, topTag)}
        </>
      ) : (
        <>
          {/* rê chuột: viền bao kín cả cạnh đáy sát mặt kệ / bàn (`OUTLINE_ON_TOP`); băng keo, nhãn mỏng không viền riêng */}
          <mesh position-y={h / 2} material={CARD} castShadow receiveShadow name={OUTLINE_ON_TOP}>
            <boxGeometry args={size} />
          </mesh>
          <mesh position-y={h + 0.0008} material={TAPES[kind]} name={NO_OUTLINE}>
            <boxGeometry args={[0.05, 0.0016, d + 0.002]} />
          </mesh>
          {topTag}
        </>
      )}
      <mesh position={[labelX, h * 0.55, d / 2 + 0.001]} material={LABEL} name={NO_OUTLINE}>
        <planeGeometry args={[w * 0.5, h * 0.4]} />
      </mesh>
      {name && (
        // tên khách trên nhãn (thùng đã đóng gói: phía trên vạch đỏ)
        <Text
          position={[labelX, h * (big ? 0.63 : 0.55), d / 2 + 0.002]}
          fontSize={h * 0.13}
          maxWidth={w * 0.46}
          color="#273139"
          anchorX="center"
          anchorY="middle"
          whiteSpace="nowrap"
          clipRect={[-w * 0.23, -h * 0.2, w * 0.23, h * 0.2]}
        >
          {name}
        </Text>
      )}
      {fragile && (
        <>
          <mesh
            position={[w * 0.33, h * 0.5, d / 2 + 0.001]}
            material={fragileSticker()}
            name={NO_OUTLINE}
          >
            <planeGeometry args={[tag, tag]} />
          </mesh>
        </>
      )}
      {kind === 'shopii' && (
        <mesh position={[-w * 0.17, h * 0.62, d / 2 + 0.0015]} material={BRAND} name={NO_OUTLINE}>
          <planeGeometry args={[w * 0.1, h * 0.12]} />
        </mesh>
      )}
      {big && (
        <mesh
          position={[labelX + w * 0.06, h * 0.45, d / 2 + 0.0015]}
          material={BRAND}
          name={NO_OUTLINE}
        >
          <planeGeometry args={[w * 0.28, h * 0.04]} />
        </mesh>
      )}
    </group>
  )
}

/** tên trên nhãn thùng: bỏ danh xưng (Anh / Chị / Bạn...), chỉ ghi tên */
const shortName = (name: string) => name.replace(/^(anh|chị|bạn|em|cô|chú|bác|ông|bà)\s+/iu, '')

/** thùng đơn khách / thùng đã đóng gói theo id */
export function JobBox({
  id,
  flaps,
}: {
  id: string
  /** thùng đơn mở được (bước mở hộp) */
  flaps?: { back: RefObject<THREE.Group>; front: RefObject<THREE.Group> }
}) {
  const packed = useGame((s) => isPackedBox(s, id))
  const name = useGame((s) => shortName(boxCustomer(s, id)))
  return packed ? (
    <CardBox size={PACKED_BOX} kind="packed" big name={name} />
  ) : (
    <CardBox size={ORDER_BOX} kind="order" name={name} flaps={flaps} />
  )
}

/** cao thùng đơn (m) */
export const ORDER_BOX_H = ORDER_BOX[1]

/** tầng kệ (0 = dưới cùng) của ô `slot` khi ô đầu nằm ở tầng `tier0` */
const tierOf = (slot: number, tier0 = 0) => tier0 + Math.floor(slot / SLOTS_PER_ROW)
/** lòng kệ giữa 2 cột (cột 3,5cm sát mép kệ 0,9m): tâm thùng ± nửa bề ngang không vượt `IN_X`; chiều sâu theo mặt ván */
const IN_X = RACK.w / 2 - 0.035 - 0.012
const IN_Z = RACK.d / 2 - 0.01
/** khoảng trống tới tầng trên (trừ thanh đỡ dưới tầng trên); tầng trên cùng không có trần */
const headroom = (tiers: number[], t: number) =>
  t + 1 < tiers.length ? tiers[t + 1] - tiers[t] - 0.045 : 0.6

interface PileItem {
  key: string
  size: [number, number, number]
  /** chuỗi tính độ lệch (mặc định `key`): khối mờ dùng id thùng đang cầm cho trùng chỗ thùng sẽ nằm */
  seed?: string
}
interface Pose {
  pos: [number, number, number]
  rot: number
  /** nghiêng ngả 1 bên (rad, quanh trục z của thùng; đống dưới sàn) */
  tilt?: number
  /** nhấc lên cho cạnh thấp của thùng nghiêng chạm sàn */
  lift?: number
}

/** thùng đã nằm trên 1 tầng kệ: `under` = thùng đỡ bên dưới (không có = nằm trên ván) */
interface Placed {
  key: string
  x: number
  z: number
  /** bề ngang sau khi xoay */
  fw: number
  top: number
  area: number
  under?: string
  covered: boolean
}
/** chỗ đã xếp của 1 thùng (giữ qua các lần dựng lại kệ cửa) */
interface Spot {
  pose: Pose
  tier: number
  placed: Placed
}

/**
 * Xếp thùng trên 1 tầng kệ cho lộn xộn như thật: theo thứ tự, mỗi thùng xoay / lệch / cách nhau ngẫu nhiên (cố định theo `key`),
 * nằm vào chỗ trống đầu tiên từ trái sang; hết chỗ (`messy`: cả ngẫu nhiên ~1/4, kệ nhận hàng) thì chồng lên thùng khác còn chỗ tới tầng trên.
 * Kệ cất đơn / kệ giao hàng không chồng bừa: còn chỗ là nằm cạnh nhau
 * Bề ngang thùng (sau khi xoay) luôn kẹp trong lòng kệ `IN_X` nên không lấn vào cột.
 * `memo` (kệ cửa): thùng đã xếp lần trước cùng tầng giữ nguyên chỗ (lấy 1 thùng đi thì thùng khác đứng yên), chỉ thùng mất
 * thùng đỡ bên dưới mới rơi xuống xếp lại; thùng mới lấp chỗ trống
 */
function pileTier(
  items: PileItem[],
  y: number,
  room: number,
  messy: boolean,
  memo?: Map<string, Spot>,
  tier = 0,
): Pose[] {
  const out = new Map<string, Pose>()
  const placed: Placed[] = []
  // thùng đã nằm ở tầng này nhưng mất chỗ đỡ: rơi xuống ván (còn chỗ thì không chồng bừa lại)
  const fell = new Set<string>()
  if (memo) {
    let keep = items.map((it) => memo.get(it.key)).filter((m): m is Spot => !!m && m.tier === tier)
    // bỏ thùng mất chỗ đỡ (lặp: thùng chồng trên thùng vừa bỏ cũng rơi)
    for (let n = -1; n !== keep.length;) {
      n = keep.length
      const ids = new Set(keep.map((m) => m.placed.key))
      keep = keep.filter((m) => !m.placed.under || ids.has(m.placed.under))
    }
    for (const m of keep) {
      placed.push({ ...m.placed, covered: false })
      out.set(m.placed.key, m.pose)
    }
    for (const b of placed) if (placed.some((t) => t.under === b.key)) b.covered = true
    for (const it of items)
      if (memo.get(it.key)?.tier === tier && !out.has(it.key)) fell.add(it.key)
  }
  for (const {
    key,
    seed = key,
    size: [w, h, d],
  } of items) {
    if (out.has(key)) continue
    const r1 = hash01(seed)
    const r2 = hash01(seed + '#x')
    const r3 = hash01(seed + '#z')
    const rot = (r1 - 0.5) * 0.3
    const c = Math.abs(Math.cos(rot))
    const sn = Math.abs(Math.sin(rot))
    const fw = w * c + d * sn
    const fd = w * sn + d * c
    const xMax = Math.max(0, IN_X - fw / 2)
    const zMax = Math.max(0, IN_Z - fd / 2)
    const clampX = (x: number) => THREE.MathUtils.clamp(x, -xMax, xMax)
    const clampZ = (z: number) => THREE.MathUtils.clamp(z, -zMax, zMax)
    // chỗ chồng: thùng chưa bị đè, đủ cao tới tầng trên, mặt đủ rộng (không đặt thùng to lên hộp bé)
    const bases = placed.filter((b) => !b.covered && b.top + h <= room && b.area >= w * d * 0.6)
    const gap = r2 * 0.05
    // chỗ trống trên ván: quét từ trái, chen vào khe giữa các thùng đang nằm trên ván nếu vừa
    let free: number | null = null
    let from = -IN_X
    for (const b of [...placed.filter((b) => !b.under).sort((a, b) => a.x - b.x), null]) {
      const end = b ? b.x - b.fw / 2 : IN_X
      if (from + gap + fw <= end) {
        free = from + gap + fw / 2
        break
      }
      if (b) from = Math.max(from, b.x + b.fw / 2)
    }
    const stack =
      (messy && !fell.has(key) && placed.length > 0 && r2 < 0.25 && bases.length > 0) ||
      free === null
    let spot: Placed
    let pose: Pose
    if (!stack) {
      const z = clampZ((r3 - 0.5) * 2 * zMax)
      spot = { key, x: free!, z, fw, top: h, area: w * d, covered: false }
      pose = { pos: [free!, y, z], rot }
    } else {
      // hết chỗ chồng hợp lệ: đè lên thùng thấp nhất chưa bị đè (hiếm, tầng quá đầy)
      const base =
        bases[Math.floor(r1 * bases.length)] ??
        placed.filter((b) => !b.covered).sort((a, b) => a.top - b.top)[0]
      if (base) {
        base.covered = true
        const x = clampX(base.x + (r3 - 0.5) * 0.08)
        const z = clampZ(base.z + (r2 - 0.5) * 0.06)
        spot = { key, x, z, fw, top: base.top + h, area: w * d, under: base.key, covered: false }
        pose = { pos: [x, y + base.top, z], rot }
      } else {
        spot = { key, x: 0, z: 0, fw, top: h, area: w * d, covered: false }
        pose = { pos: [0, y, 0], rot }
      }
    }
    placed.push(spot)
    out.set(key, pose)
    memo?.set(key, { pose, tier, placed: { ...spot } })
  }
  return items.map((it) => out.get(it.key)!)
}

type SlotItem = PileItem & { slot: number }

/** thùng trong đống dưới sàn: `cell` = chỗ nằm trên sàn (thùng chồng: −1, `under` = thùng dưới đất đỡ nó) */
interface FloorSpot {
  pose: Pose
  cell: number
  under?: string
  /** cao (thùng dưới đất: tới mặt trên, kể cả nghiêng) */
  h: number
  x: number
  z: number
  area: number
}

/**
 * Đống thùng dưới sàn trước kệ cửa (kệ hết chỗ): 2 cột lệch về phía tường phòng (chừa lối cửa chính), hàng nối ra hành lang;
 * thùng xoay lung tung, ~1/3 chồng lên thùng dưới (tới 3 lớp), ~1/5 nằm nghiêng ngả 1 bên.
 * `memo`: thùng đã nằm giữ chỗ; thùng dưới đất bị lấy thì thùng chồng trên nó xếp lại, lấy thùng giữa chồng thì thùng trên hạ xuống
 */
function pileFloor(items: PileItem[], memo = new Map<string, FloorSpot>()): Pose[] {
  const COLS = [-0.04, 0.34]
  const keys = new Set(items.map((it) => it.key))
  for (const k of [...memo.keys()]) if (!keys.has(k)) memo.delete(k)
  for (const [k, m] of [...memo]) if (m.under && !memo.has(m.under)) memo.delete(k)
  const ground = [...memo]
    .filter(([, m]) => !m.under)
    .map(([key, m]) => ({ key, cell: m.cell, x: m.x, z: m.z, area: m.area, top: m.h }))
  // thùng chồng còn lại hạ sát xuống (theo thứ tự cao → thấp cũ)
  for (const g of ground) {
    const upper = [...memo].filter(([, m]) => m.under === g.key)
    upper.sort(([, a], [, b]) => a.pose.pos[1] - b.pose.pos[1])
    for (const [k, m] of upper) {
      memo.set(k, { ...m, pose: { ...m.pose, pos: [m.pose.pos[0], g.top, m.pose.pos[2]] } })
      g.top += m.h
    }
  }
  return items.map(({ key, size: [w, h, d] }) => {
    const kept = memo.get(key)
    if (kept) return kept.pose
    const r1 = hash01(key)
    const r2 = hash01(key + '#x')
    const r3 = hash01(key + '#z')
    const rot = (r1 - 0.5) * 1.1
    const base = ground.filter((b) => b.top + h < 0.5 && b.area >= w * d * 0.6)
    if (ground.length && r2 < 0.35 && base.length) {
      const b = base[Math.floor(r3 * base.length)]
      const pose: Pose = {
        pos: [b.x + (r3 - 0.5) * 0.08, b.top, b.z + (r2 - 0.5) * 0.08],
        rot: rot * 0.6,
        tilt: (r3 - 0.5) * 0.12,
      }
      b.top += h
      memo.set(key, { pose, cell: -1, under: b.key, h, x: b.x, z: b.z, area: w * d })
      return pose
    }
    // chỗ trống đầu tiên trên sàn
    const used = new Set(ground.map((g) => g.cell))
    let i = 0
    while (used.has(i)) i++
    const x = COLS[i % 2] + (r2 - 0.5) * 0.1
    const z = 0.42 + Math.floor(i / 2) * 0.38 + (r3 - 0.5) * 0.08
    let pose: Pose = { pos: [x, 0, z], rot }
    let top = h
    // nằm nghiêng 1 bên (dựa đống / chênh trên cạnh): nhấc lên cho cạnh thấp chạm sàn
    if (r3 > 0.8) {
      const tilt = (r1 > 0.5 ? 1 : -1) * (0.2 + r2 * 0.2)
      top = h * Math.cos(tilt)
      pose = { pos: [x, 0, z], rot, tilt, lift: (w / 2) * Math.sin(Math.abs(tilt)) }
    }
    ground.push({ key, cell: i, x, z, area: w * d, top })
    memo.set(key, { pose, cell: i, h: top, x, z, area: w * d })
    return pose
  })
}

/**
 * Xếp mọi thùng theo ô (`slot`, 3 ô / tầng tính từ tầng `tier0`): mỗi tầng `pileTier` riêng (thứ tự theo ô).
 * Ô >= `rackSlots` (kệ cửa hết chỗ) thì nằm dưới sàn trước kệ; `messy` = chồng bừa cả khi còn chỗ (kệ nhận hàng);
 * `memo` = giữ chỗ đã xếp (kệ cửa, xem `pileTier` / `pileFloor`)
 */
function pileRack(
  items: SlotItem[],
  tiers: number[],
  {
    tier0 = 0,
    rackSlots = Infinity,
    messy = false,
    memo,
  }: {
    tier0?: number
    rackSlots?: number
    messy?: boolean
    memo?: { tiers: Map<string, Spot>; floor: Map<string, FloorSpot> }
  } = {},
) {
  const out = new Map<string, Pose>()
  const byTier = new Map<number, SlotItem[]>()
  const floor: SlotItem[] = []
  for (const it of items) {
    if (it.slot >= rackSlots) {
      floor.push(it)
      continue
    }
    const t = tierOf(it.slot, tier0)
    byTier.set(t, [...(byTier.get(t) ?? []), it])
  }
  if (memo) {
    const keys = new Set(items.map((it) => it.key))
    for (const k of [...memo.tiers.keys()]) if (!keys.has(k)) memo.tiers.delete(k)
  }
  floor.sort((a, b) => a.slot - b.slot)
  pileFloor(floor, memo?.floor).forEach((p, i) => out.set(floor[i].key, p))
  for (const [t, list] of byTier) {
    list.sort((a, b) => a.slot - b.slot)
    pileTier(list, tiers[t], headroom(tiers, t), messy, memo?.tiers, t).forEach((p, i) =>
      out.set(list[i].key, p),
    )
  }
  return out
}

/** chỗ đã xếp ở kệ cửa (giữ qua các lần dựng lại; chỉ 1 kệ cửa) + ô của kiện hàng (không dồn ô khi lấy kiện khác) */
const DOOR_MEMO = { tiers: new Map<string, Spot>(), floor: new Map<string, FloorSpot>() }
const PARCEL_SLOTS = new Map<string, number>()

/** đặt con theo tư thế: xoay quanh trục đứng, nghiêng ngả 1 bên (nhấc cho cạnh thấp chạm mặt đỡ) */
function Posed({ pose, children }: { pose: Pose; children: ReactNode }) {
  return (
    <group position-y={pose.lift ?? 0} rotation-z={pose.tilt ?? 0}>
      {children}
    </group>
  )
}

/**
 * Kệ cất đơn / kệ giao hàng: chỗ cố định theo ô (2 ô / tầng, trái / phải, không chồng) để mỗi ô trống có khối mờ riêng.
 * Xoay / lệch nhẹ theo id thùng cho đỡ thẳng tắp
 */
const NEAT_X = 0.2
function neatPose(slot: number, tiers: number[], seed: string): Pose {
  const side = slot % NEAT_PER_ROW ? 1 : -1
  const y = tiers[Math.floor(slot / NEAT_PER_ROW)]
  const rot = (hash01(seed) - 0.5) * 0.08
  const dx = (hash01(seed + '#x') - 0.5) * 0.03
  return { pos: [side * NEAT_X + dx, y, 0], rot }
}

/** ô trống của kệ */
const neatFree = (boxes: Record<string, BoxSpot>, at: BoxAt, total: number) =>
  Array.from({ length: total }, (_, i) => i).filter((i) => !slotTaken(boxes, at, i))

/** khối mờ chỗ đặt thùng (xanh nhạt, ghi chiều sâu) + viền bao mặt nhìn thấy khi `hot` */
function Ghost({ size, hot }: { size: [number, number, number]; hot: boolean }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...size), [size])
  const hull = useMemo(() => outlineGeometry(geo), [geo])
  return (
    <group position-y={size[1] / 2}>
      <mesh geometry={geo} material={GHOST} renderOrder={1} />
      <mesh
        geometry={hull}
        material={OUTLINE_GHOST_MAT}
        renderOrder={2}
        visible={hot}
        raycast={NO_RAY}
      />
    </group>
  )
}

/** Khối mờ xanh nhạt chỉ chỗ đặt thùng: rê trong tầm với thì viền bao mặt nhìn thấy (như viền bàn), bấm để đặt */
function GhostSlot({
  label,
  onAct,
  size,
  ...props
}: {
  label: string
  onAct: () => void
  size: [number, number, number]
} & Omit<JSX.IntrinsicElements['group'], 'children'>) {
  const [hot, setHot] = useState(false)
  const near = (e: ThreeEvent<PointerEvent>) => !useGame.getState().walk || inReach(e)
  return (
    <RoomSpot label={label} onAct={onAct} outline={false} {...props}>
      <group
        onPointerOver={(e) => setHot(near(e))}
        onPointerMove={(e) => near(e) !== hot && setHot(!hot)}
        onPointerOut={() => setHot(false)}
      >
        <Ghost size={size} hot={hot} />
      </group>
    </RoomSpot>
  )
}

/** khối mờ chỗ đặt thùng đơn trên bàn build (không tự bấm: bấm bàn), `hot` = đang trỏ bàn thì sáng viền */
export function GhostBlock({ hot }: { hot: boolean }) {
  return (
    <group raycast={NO_RAY}>
      <Ghost size={ORDER_BOX} hot={hot} />
    </group>
  )
}

/** thùng đang cầm thuộc loại nào: thùng đơn / thùng đã đóng gói / không cầm */
const heldKind = (s: GameState) => (!s.held ? null : isPackedBox(s, s.held) ? 'packed' : 'order')

/** thùng (đơn / đã đóng gói) đang nằm ở `at` */
function useBoxesAt(at: BoxAt) {
  const boxes = useGame((s) => s.boxes)
  return useMemo(
    () =>
      Object.entries(boxes)
        .filter(([, b]) => b.at === at)
        .map(([id, b]) => ({ id, slot: b.slot })),
    [boxes, at],
  )
}

export function DoorParcels(props: JSX.IntrinsicElements['group']) {
  const parcels = useGame((s) => s.parcels)
  const day = useGame((s) => s.day)
  const orders = useBoxesAt('door')
  // kiện đã tới: cùng nguồn (Shopii / chợ) + cùng sản phẩm thì gộp 1 thùng (bấm nhận cả chồng)
  const groups = useMemo(() => parcelStacks(parcels, day), [parcels, day])
  // kiện lấp các ô nhận hàng còn trống (thùng đơn khách xếp trước), hết kệ thì đổ đống dưới sàn
  const parcelItems = useMemo(() => {
    const used = new Set(orders.map((o) => o.slot))
    // kiện đã có ô giữ nguyên ô (lấy kiện / thùng khác đi thì không dồn), kiện mới lấp ô trống
    const kept = groups.map((list) => {
      const old = PARCEL_SLOTS.get(list[0].id)
      if (old === undefined || used.has(old)) return undefined
      used.add(old)
      return old
    })
    PARCEL_SLOTS.clear()
    let next = 0
    return groups.map((list, gi) => {
      let slot = kept[gi]
      if (slot === undefined) {
        while (used.has(next)) next++
        slot = next
        used.add(slot)
      }
      PARCEL_SLOTS.set(list[0].id, slot)
      const p = list[0]
      const r = hash01(p.id)
      const n = Math.min(
        list.reduce((a, x) => a + x.items.length, 0),
        4,
      )
      // linh kiện mua lẻ: hộp nhỏ hơn thùng đơn khách, nhiều món thì to dần
      const size: [number, number, number] = [0.13 + n * 0.025, 0.07 + r * 0.06, 0.12 + n * 0.025]
      return { list, key: p.id, size, slot }
    })
  }, [groups, orders])
  const door = useMemo(
    () =>
      pileRack(
        [...orders.map(({ id, slot }) => ({ key: id, size: ORDER_BOX, slot })), ...parcelItems],
        RACK_TIERS,
        { rackSlots: DOOR_RACK_SLOTS, messy: true, memo: DOOR_MEMO },
      ),
    [orders, parcelItems],
  )
  const g = useGame.getState
  return (
    <group {...props}>
      {parcelItems.map(({ list, key, size }) => {
        const p = list[0]
        const pose = door.get(key)!
        return (
          <RoomSpot
            key={key}
            label={`Nhận hàng: ${p.label}${list.length > 1 ? ` (${list.length} kiện)` : ''}`}
            onAct={() => list.forEach((x) => g().pickupParcel(x.id))}
            position={pose.pos}
            rotation-y={pose.rot}
          >
            <Posed pose={pose}>
              <CardBox
                kind={p.from === 'market' ? 'market' : 'shopii'}
                big={list.length > 1 || p.items.length > 2}
                size={size}
                name={list.length > 1 ? `×${list.length}` : undefined}
              />
            </Posed>
          </RoomSpot>
        )
      })}
      {orders.map(({ id }) => {
        const pose = door.get(id)!
        return (
          <RoomSpot
            key={id}
            label={`Cầm thùng đơn của ${boxCustomer(g(), id)}`}
            onAct={() => g().pickBox(id)}
            position={pose.pos}
            rotation-y={pose.rot}
          >
            <Posed pose={pose}>
              <JobBox id={id} />
            </Posed>
          </RoomSpot>
        )
      })}
    </group>
  )
}

/** tầng ván kệ giao hàng (2 tầng: ván dưới + mặt trên) */
const SHIP_TIERS = [0.1, 0.55]

/** Kệ giao hàng 2 tầng (cạnh chậu cây hành lang): đặt thùng đã đóng gói vào = gửi khách, thùng nằm chờ shipper (sang ngày thì đi) */
export function ShipRack(props: JSX.IntrinsicElements['group']) {
  const boxes = useGame((s) => s.boxes)
  const kind = useGame(heldKind)
  const held = useGame((s) => s.held) ?? ''
  const ships = useBoxesAt('ship')
  // mỗi ô giao hàng còn trống 1 khối mờ (đúng chỗ, cùng độ lệch thùng đang cầm)
  const free = kind === 'packed' ? neatFree(boxes, 'ship', SHIP_SLOTS) : []
  const pose = (slot: number, seed: string) => neatPose(slot, SHIP_TIERS, seed)
  const g = useGame.getState
  return (
    <group {...props}>
      <MetalRack tiers={SHIP_TIERS} />
      {ships.map(({ id, slot }) => (
        <group key={id} position={pose(slot, id).pos} rotation-y={pose(slot, id).rot}>
          <JobBox id={id} />
        </group>
      ))}
      {free.map((i) => (
        <GhostSlot
          key={i}
          label="Đặt vào kệ giao hàng: gửi cho khách"
          onAct={() => g().placeShip(i)}
          position={pose(i, held).pos}
          rotation-y={pose(i, held).rot}
          size={PACKED_BOX}
        />
      ))}
    </group>
  )
}

/** tầng kệ cất đơn: kệ sắt hạ thấp còn 80% (không chạm tranh treo phía trên) */
export const SHELF_SCALE_Y = 0.8
const SHELF_TIERS = RACK_TIERS.map((y) => y * SHELF_SCALE_Y)

/** Kệ cất đơn (trong phòng): thùng đơn chờ làm / làm dở, đang cầm thùng đơn thì hiện ô mờ để cất */
export function StorageShelf(props: JSX.IntrinsicElements['group']) {
  const boxes = useGame((s) => s.boxes)
  const kind = useGame(heldKind)
  const held = useGame((s) => s.held) ?? ''
  const here = useBoxesAt('shelf')
  // mỗi ô trống 1 khối mờ (đúng chỗ, cùng độ lệch thùng đang cầm)
  const free = kind ? neatFree(boxes, 'shelf', SHELF_SLOTS) : []
  const pose = (slot: number, seed: string) => neatPose(slot, SHELF_TIERS, seed)
  const g = useGame.getState
  return (
    <group {...props}>
      {here.map(({ id, slot }) => (
        <RoomSpot
          key={id}
          label={`Cầm thùng ${isPackedBox(g(), id) ? 'đã đóng gói' : 'đơn'} của ${boxCustomer(g(), id)}`}
          onAct={() => g().pickBox(id)}
          position={pose(slot, id).pos}
          rotation-y={pose(slot, id).rot}
        >
          <JobBox id={id} />
        </RoomSpot>
      ))}
      {free.map((i) => (
        <GhostSlot
          key={i}
          label="Cất thùng lên kệ"
          onAct={() => g().placeShelf(i)}
          position={pose(i, held).pos}
          rotation-y={pose(i, held).rot}
          size={kind === 'packed' ? PACKED_BOX : ORDER_BOX}
        />
      ))}
    </group>
  )
}

/** Thùng đang cầm: thẳng trước mặt, hơi thấp, lệch nhẹ sang trái (đi lại); không chặn bấm vật phía sau */
export function HeldBox() {
  const held = useGame((s) => (s.walk ? s.held : null))
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    // thùng trên tay không nhận bấm (tia bấm xuyên qua tới vật phía sau); thùng đổi loại thì mesh mới cũng tắt theo
    g.traverse((o) => (o.raycast = NO_RAY))
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    g.translateX(-0.05 * M)
    g.translateY(-0.3 * M)
    g.translateZ(-0.5 * M)
  })
  if (!held) return null
  return (
    <group ref={ref}>
      <group scale={M} rotation={[0.25, 0, 0]} position-y={-0.05 * M}>
        <JobBox id={held} />
      </group>
    </group>
  )
}
