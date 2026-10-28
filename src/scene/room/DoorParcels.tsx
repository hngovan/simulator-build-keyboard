import { useMemo } from 'react'
import * as THREE from 'three'
import { useGame } from '@/store'
import { arrivedParcels } from '@/data/shipping'
import { RoomSpot } from './RoomSpot'
import { RACK_TIERS } from './HallProps'

// Thùng hàng ngoài hành lang (dựng bằng code), đơn vị mét, gốc = sàn ở chỗ để hàng:
// - `DoorParcels`: hàng Shopii giao tới trên kệ sắt cuối hành lang (gốc = chân kệ), bấm từng thùng để nhận vào kho
// - `ShipBoxes`: đơn đã đóng gói chờ gửi, bấm để gửi cho khách (`shipOrder`, như nút Gửi ở Mezzenger)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const TAPE = new THREE.MeshStandardMaterial({ color: '#d9c49a', roughness: 0.5 })
const LABEL = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.8 })
const BRAND = new THREE.MeshStandardMaterial({ color: '#ee4d2d', roughness: 0.7 })

/** số giả ngẫu nhiên [0, 1) cố định theo id kiện (cỡ thùng, góc xoay không nhảy khi vẽ lại) */
function hash01(key: string) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 2 ** 32
}

function Box({ big, size }: { big?: boolean; size: [number, number, number] }) {
  const [w, h, d] = size
  return (
    <group>
      <mesh position-y={h / 2} material={CARD} castShadow receiveShadow>
        <boxGeometry args={size} />
      </mesh>
      {/* băng keo dán dọc nắp */}
      <mesh position-y={h + 0.0008} material={TAPE}>
        <boxGeometry args={[0.05, 0.0016, d + 0.002]} />
      </mesh>
      {/* nhãn giao hàng + logo cam Shopii ở mặt trước */}
      <mesh position={[0, h * 0.55, d / 2 + 0.001]} material={LABEL}>
        <planeGeometry args={[w * 0.5, h * 0.4]} />
      </mesh>
      <mesh position={[-w * 0.17, h * 0.62, d / 2 + 0.0015]} material={BRAND}>
        <planeGeometry args={[w * 0.1, h * 0.12]} />
      </mesh>
      {big && (
        <mesh position={[w * 0.06, h * 0.45, d / 2 + 0.0015]} material={BRAND}>
          <planeGeometry args={[w * 0.28, h * 0.04]} />
        </mesh>
      )}
    </group>
  )
}

export function DoorParcels(props: JSX.IntrinsicElements['group']) {
  const parcels = useGame((s) => s.parcels)
  const day = useGame((s) => s.day)
  const here = useMemo(() => arrivedParcels(parcels, day), [parcels, day])
  // xếp lên kệ sắt: mỗi tầng 2 thùng từ dưới lên, kệ đầy thì để dưới sàn trước kệ
  const placed = useMemo(
    () =>
      here.map((p, i) => {
        const r = hash01(p.id)
        const n = Math.min(p.items.length, 4)
        const size: [number, number, number] = [0.24 + n * 0.03, 0.16 + r * 0.12, 0.22 + n * 0.02]
        const onRack = i < 6
        const at: [number, number, number] = onRack
          ? [i % 2 ? 0.21 : -0.21, RACK_TIERS[Math.floor(i / 2)], 0]
          : [((i - 6) % 3) * 0.36 - 0.36, 0, 0.45 + Math.floor((i - 6) / 3) * 0.4]
        return { p, size, at, rot: (r - 0.5) * 0.3 }
      }),
    [here],
  )
  return (
    <group {...props}>
      {placed.map(({ p, size, at, rot }) => (
        <RoomSpot
          key={p.id}
          label={`Nhận hàng: ${p.label}`}
          onAct={() => useGame.getState().pickupParcel(p.id)}
          position={at}
          // nhãn Shopii quay ra mặt trước kệ
          rotation-y={rot}
        >
          <Box big={p.items.length > 2} size={size} />
        </RoomSpot>
      ))}
    </group>
  )
}

/** Đơn đã đóng gói chưa gửi: thùng quấn băng keo đỏ cạnh chậu cây, bấm để gửi khách */
export function ShipBoxes(props: JSX.IntrinsicElements['group']) {
  const packed = useGame((s) => s.packed)
  const waiting = useMemo(() => packed.filter((p) => !p.shipped), [packed])
  return (
    <group {...props}>
      {waiting.map((p, i) => {
        const r = hash01(p.order.id)
        return (
          <RoomSpot
            key={p.order.id}
            label={`Gửi đơn cho ${p.order.customer}`}
            onAct={() => useGame.getState().shipOrder(p.order.id)}
            position={[0, Math.floor(i / 3) * 0.2, -(i % 3) * 0.45]}
            // nhãn quay vào lối đi hành lang (+x)
            rotation-y={Math.PI / 2 + (r - 0.5) * 0.3}
          >
            <Box big size={[0.42, 0.2, 0.3]} />
          </RoomSpot>
        )
      })}
    </group>
  )
}
