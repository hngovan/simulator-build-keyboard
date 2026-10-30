import { useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type GameState } from '@/store'
import { arrivedParcels } from '@/data/shipping'
import {
  DOOR_RACK_SLOTS,
  SHELF_SLOTS,
  SHIP_SLOTS,
  SLOTS_PER_ROW,
  slotTaken,
  type BoxAt,
} from '@/data/boxes'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { RoomSpot } from './RoomSpot'
import { RACK_TIERS } from './HallProps'
import { M, inReach } from './roomLayout'
import {
  NO_OUTLINE,
  OUTLINE_GHOST_MAT,
  OUTLINE_ON_TOP,
  outlineGeometry,
} from '../common/hoverOutline'

// Thùng hàng trong phòng (dựng bằng code), đơn vị mét, gốc = chân kệ, mặt trước kệ +z:
// - `DoorParcels` (kệ sắt cuối hành lang): 2 tầng dưới = thùng đơn khách mới nhận (bấm để cầm) + kiện Shopii (bấm để nhận vào kho),
//   hết ô thì xếp dưới sàn trước kệ; 2 tầng trên = ô giao hàng (đặt thùng đã đóng gói vào = gửi khách)
// - `StorageShelf` (kệ cất đơn trong phòng): cất thùng đơn đang làm dở / chưa làm
// - `HeldBox`: thùng đang cầm, bay theo camera trước mặt
// Đang cầm thùng thì các ô đặt được hiện khối mờ vàng (bấm để đặt)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const LABEL = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.8 })
const BRAND = new THREE.MeshStandardMaterial({ color: '#ee4d2d', roughness: 0.7 })
const TAPES = {
  // kiện Shopii băng keo vàng nhạt, thùng đơn khách băng keo xanh, thùng đã đóng gói băng keo đỏ
  shopii: new THREE.MeshStandardMaterial({ color: '#d9c49a', roughness: 0.5 }),
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

/** cỡ thùng (m) */
const ORDER_BOX: [number, number, number] = [0.26, 0.18, 0.24]
const PACKED_BOX: [number, number, number] = [0.27, 0.13, 0.3]
/** khoảng cách 2 ô cạnh nhau trên kệ (kệ rộng 0.9m, 3 ô / hàng) */
const SLOT_W = 0.29

/** số giả ngẫu nhiên [0, 1) cố định theo id kiện (cỡ thùng, góc xoay không nhảy khi vẽ lại) */
function hash01(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}

/** Thùng carton: băng keo dọc nắp + nhãn giao hàng mặt trước (kiện Shopii thêm logo cam) */
export function CardBox({
  size,
  kind,
  big,
}: {
  size: [number, number, number]
  kind: keyof typeof TAPES
  big?: boolean
}) {
  const [w, h, d] = size
  return (
    <group>
      {/* rê chuột: viền bao kín cả cạnh đáy sát mặt kệ / bàn (`OUTLINE_ON_TOP`); băng keo, nhãn mỏng không viền riêng */}
      <mesh position-y={h / 2} material={CARD} castShadow receiveShadow name={OUTLINE_ON_TOP}>
        <boxGeometry args={size} />
      </mesh>
      <mesh position-y={h + 0.0008} material={TAPES[kind]} name={NO_OUTLINE}>
        <boxGeometry args={[0.05, 0.0016, d + 0.002]} />
      </mesh>
      <mesh position={[0, h * 0.55, d / 2 + 0.001]} material={LABEL} name={NO_OUTLINE}>
        <planeGeometry args={[w * 0.5, h * 0.4]} />
      </mesh>
      {kind === 'shopii' && (
        <mesh position={[-w * 0.17, h * 0.62, d / 2 + 0.0015]} material={BRAND} name={NO_OUTLINE}>
          <planeGeometry args={[w * 0.1, h * 0.12]} />
        </mesh>
      )}
      {big && (
        <mesh position={[w * 0.06, h * 0.45, d / 2 + 0.0015]} material={BRAND} name={NO_OUTLINE}>
          <planeGeometry args={[w * 0.28, h * 0.04]} />
        </mesh>
      )}
    </group>
  )
}

/** thùng đơn khách / thùng đã đóng gói theo id */
export function JobBox({ id }: { id: string }) {
  const packed = useGame((s) => isPackedBox(s, id))
  return packed ? (
    <CardBox size={PACKED_BOX} kind="packed" big />
  ) : (
    <CardBox size={ORDER_BOX} kind="order" />
  )
}

/** chỗ ô kệ: tầng `tier` (RACK_TIERS), cột theo `slot` */
const rackSlot = (tier: number, slot: number, tiers = RACK_TIERS): [number, number, number] => [
  ((slot % SLOTS_PER_ROW) - 1) * SLOT_W,
  tiers[tier + Math.floor(slot / SLOTS_PER_ROW)],
  0,
]
/** ô nhận đơn ở kệ cửa: 2 tầng dưới, quá thì dưới sàn trước kệ */
const doorSlot = (slot: number): [number, number, number] =>
  slot < DOOR_RACK_SLOTS
    ? rackSlot(0, slot)
    : [
        (((slot - DOOR_RACK_SLOTS) % 3) - 1) * 0.36,
        0,
        0.45 + Math.floor((slot - DOOR_RACK_SLOTS) / 3) * 0.4,
      ]

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
  const boxes = useGame((s) => s.boxes)
  const kind = useGame(heldKind)
  const orders = useBoxesAt('door')
  const ships = useBoxesAt('ship')
  // kiện Shopii lấp các ô nhận đơn còn trống (thùng đơn khách xếp trước), hết ô thì xếp dưới sàn
  const placed = useMemo(() => {
    const used = new Set(orders.map((o) => o.slot))
    let slot = 0
    return arrivedParcels(parcels, day).map((p) => {
      while (used.has(slot)) slot++
      const r = hash01(p.id)
      const n = Math.min(p.items.length, 4)
      // trên kệ thì vừa 1 ô (rộng tối đa 0.27m)
      const w = Math.min(0.24 + n * 0.03, slot < DOOR_RACK_SLOTS ? 0.27 : 0.4)
      const size: [number, number, number] = [w, 0.16 + r * 0.12, 0.22 + n * 0.02]
      return { p, size, at: doorSlot(slot++), rot: (r - 0.5) * 0.3 }
    })
  }, [parcels, day, orders])
  const g = useGame.getState
  return (
    <group {...props}>
      {placed.map(({ p, size, at, rot }) => (
        <RoomSpot
          key={p.id}
          label={`Nhận hàng: ${p.label}`}
          onAct={() => g().pickupParcel(p.id)}
          position={at}
          // nhãn Shopii quay ra mặt trước kệ
          rotation-y={rot}
        >
          <CardBox kind="shopii" big={p.items.length > 2} size={size} />
        </RoomSpot>
      ))}
      {orders.map(({ id, slot }) => (
        <RoomSpot
          key={id}
          label={`Cầm thùng đơn của ${boxCustomer(g(), id)}`}
          onAct={() => g().pickBox(id)}
          position={doorSlot(slot)}
          rotation-y={(hash01(id) - 0.5) * 0.2}
        >
          <JobBox id={id} />
        </RoomSpot>
      ))}
      {/* ô giao hàng (2 tầng trên): thùng đã gửi nằm chờ shipper tới lấy (sang ngày thì đi) */}
      {ships.map(({ id, slot }) => (
        <group key={id} position={rackSlot(2, slot)}>
          <CardBox size={PACKED_BOX} kind="packed" big />
        </group>
      ))}
      {kind === 'packed' &&
        Array.from({ length: SHIP_SLOTS }, (_, i) => i)
          .filter((i) => !slotTaken(boxes, 'ship', i))
          .map((i) => (
            <GhostSlot
              key={i}
              label="Đặt vào ô giao hàng: gửi cho khách"
              onAct={() => g().placeShip(i)}
              position={rackSlot(2, i)}
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
  const here = useBoxesAt('shelf')
  const g = useGame.getState
  return (
    <group {...props}>
      {here.map(({ id, slot }) => (
        <RoomSpot
          key={id}
          label={`Cầm thùng ${isPackedBox(g(), id) ? 'đã đóng gói' : 'đơn'} của ${boxCustomer(g(), id)}`}
          onAct={() => g().pickBox(id)}
          position={rackSlot(0, slot, SHELF_TIERS)}
        >
          <JobBox id={id} />
        </RoomSpot>
      ))}
      {kind &&
        Array.from({ length: SHELF_SLOTS }, (_, i) => i)
          .filter((i) => !slotTaken(boxes, 'shelf', i))
          .map((i) => (
            <GhostSlot
              key={i}
              label="Cất thùng lên kệ"
              onAct={() => g().placeShelf(i)}
              position={rackSlot(0, i, SHELF_TIERS)}
              size={kind === 'packed' ? PACKED_BOX : ORDER_BOX}
            />
          ))}
    </group>
  )
}

/** Thùng đang cầm: trước mặt, hơi thấp bên phải tầm nhìn (đi lại); không chặn bấm vật phía sau */
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
    g.translateX(0.16 * M)
    g.translateY(-0.3 * M)
    g.translateZ(-0.5 * M)
  })
  if (!held) return null
  return (
    <group ref={ref}>
      <group scale={M} rotation={[0.25, -0.35, 0]} position-y={-0.05 * M}>
        <JobBox id={held} />
      </group>
    </group>
  )
}
