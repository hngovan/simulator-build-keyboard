import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { useGame, useCtx, useStep } from '@/store'
import { GASKET, PCB_USB, Y, pcbUsbSpot, ringFrame } from '@/data/steps'
import { GASKET_ID, SUPPLIES } from '@/data/supplies'
import { playClick } from '@/sound'
import { useHover } from '../common/useHover'
import { HINT_COLOR } from '../common/hoverOutline'
import { HintArrow } from '../stations/StationKit'

/** mm → u */
const MM_U = 1 / 19.05
const socketGeo = new THREE.BoxGeometry(0.5, 0.09, 0.28)
const socketMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 })
const padGeo = new THREE.BoxGeometry(0.12, 0.02, 0.14)
const padMat = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 0.9, roughness: 0.3 })

/** Socket hotswap (Kailh) ở mặt dưới PCB */
export function HotswapSockets() {
  const keys = useCtx().keys
  return keys.map((k) => (
    <group
      key={k.id}
      position={[
        k.cx + 0.05 * Math.cos(k.rot) + 0.1 * Math.sin(k.rot),
        Y.pcbBot - 0.045,
        k.cz - 0.05 * Math.sin(k.rot) + 0.1 * Math.cos(k.rot),
      ]}
      rotation-y={k.rot}
    >
      <mesh geometry={socketGeo} material={socketMat} />
      <mesh geometry={padGeo} material={padMat} position-x={-0.3} />
      <mesh geometry={padGeo} material={padMat} position-x={0.3} />
    </group>
  ))
}

function Gasket({
  x,
  z,
  w,
  d,
  rot,
  placed,
  active,
  onPlace,
}: {
  x: number
  z: number
  /** dài dọc mép / tai (u) */
  w: number
  /** bề ngang dải (u) */
  d: number
  rot: number
  placed: boolean
  active: boolean
  onPlace: () => void
}) {
  const { hover, bind } = useHover(active && !placed)
  if (!placed && !active) return null
  // 2 dải Poron kẹp tai plate: mặt trên (y 0 → t) + mặt dưới (plateBot − t → plateBot)
  return (
    <group
      position={[x, 0, z]}
      rotation-y={rot}
      onPointerDown={(e) => {
        if (!active || placed) return
        e.stopPropagation()
        onPlace()
      }}
      {...bind}
    >
      {[GASKET.t / 2, Y.plateBot - GASKET.t / 2].map((y) => (
        <mesh key={y} position-y={y} castShadow>
          <boxGeometry args={[w, GASKET.t, d]} />
          {placed ? (
            <meshStandardMaterial color={SUPPLIES[GASKET_ID].color} roughness={0.95} />
          ) : (
            <meshBasicMaterial color={HINT_COLOR} transparent opacity={hover ? 0.9 : 0.45} />
          )}
        </mesh>
      ))}
    </group>
  )
}

/** object rỗng cố định cho selector (trả `{}` mới mỗi lần thì Zustand render lặp vô hạn) */
const NO_GASKETS: Record<number, true> = {}

/** Các điểm dán gasket Poron quanh viền / tai plate */
export function Gaskets() {
  const ctx = useCtx()
  const step = useStep()
  const placed = useGame((s) => s.build?.gaskets ?? NO_GASKETS)
  const placeGasket = useGame((s) => s.placeGasket)
  // mũi tên xanh chỉ miếng gasket chưa dán đầu tiên (như bàn mod stab)
  const next = step === 'gasket' ? ctx.gaskets.find((_, i) => !placed[i]) : undefined
  return (
    <>
      {ctx.gaskets.map((g, i) => (
        <Gasket
          key={i}
          x={g.x}
          z={g.z}
          w={g.w ?? GASKET.w}
          d={g.d ?? GASKET.d}
          rot={g.rot ?? 0}
          placed={!!placed[i]}
          active={step === 'gasket'}
          onPlace={() => {
            placeGasket(i)
            playClick(1200)
          }}
        />
      ))}
      {next && <HintArrow at={[next.x, 0.1, next.z]} size={1.6} />}
    </>
  )
}

/** bề rộng dải bắt chuột quanh mép lúc chờ gá vòng silicon (u) */
const RING_HIT = 0.6

/** Vòng silicon O-ring mount: cuốn quanh viền, kẹp trong khe giữa PCB và plate, lòi ra tì vách. ghost = bản xem trước chưa lắp */
export function SiliconeRing({
  ghost,
  color = '#3d3f46',
}: {
  ghost: boolean
  /** màu dây O-ring đã cuốn (trắng 30A / đen 50A / cam 70A) */
  color?: string
}) {
  const ctx = useCtx()
  const { t, h, y, off } = ringFrame()
  const W = ctx.width + 2 * off
  const D = ctx.depth + 2 * off
  const sides: [number, number, number, number][] = [
    [0, -D / 2, W + t, t],
    [0, D / 2, W + t, t],
    [-W / 2, 0, t, D],
    [W / 2, 0, t, D],
  ]
  return (
    <group position-y={y}>
      {sides.map(([x, z, w, d], i) => (
        <RoundedBox
          key={i}
          args={[w, h, d]}
          radius={Math.min(h, t) / 2 - 0.001}
          position={[x, 0, z]}
        >
          {ghost ? (
            <meshBasicMaterial color={HINT_COLOR} transparent opacity={0.35} />
          ) : (
            <meshStandardMaterial color={color} roughness={0.6} />
          )}
        </RoundedBox>
      ))}
      {/* chờ gá: dải bắt chuột vô hình rộng `RING_HIT` quanh mép (vòng thật mảnh khó bấm trúng; mặt PCB giữa không ăn) */}
      {ghost &&
        sides.map(([x, z, w, d], i) => (
          <mesh key={`hit${i}`} position={[x, 0, z]}>
            <boxGeometry
              args={[w > d ? w + RING_HIT : RING_HIT, h + RING_HIT / 2, w > d ? RING_HIT : d]}
            />
            <meshBasicMaterial visible={false} />
          </mesh>
        ))}
    </group>
  )
}

/**
 * Cổng USB-C hàn sẵn mặt dưới PCB (`CaseDef.pcbUsb`): vỏ thép đầu cái mid-mount sát mép sau bên trái, miệng nhô khỏi mép PCB
 * (lòng cổng tối + lưỡi tiếp điểm), thẳng lỗ khoét vách sau case
 */
export function PcbUsbC() {
  const ctx = useCtx()
  if (!ctx.caseDef.pcbUsb) return null
  const p = pcbUsbSpot(ctx.width, ctx.depth, ctx.caseDef.pcbUsb)
  const w = PCB_USB.w * MM_U
  const h = PCB_USB.h * MM_U
  const d = PCB_USB.d * MM_U
  // thân lùi vào trong board, miệng nhô ra khỏi mép sau `out`
  const zc = p.z - PCB_USB.out * MM_U + d / 2
  const mouthZ = p.z - PCB_USB.out * MM_U - 0.001
  return (
    <group position={[p.x, p.y, 0]}>
      <RoundedBox args={[w, h, d]} radius={h / 2 - 0.001} smoothness={4} position-z={zc}>
        <meshStandardMaterial color="#c7cbd1" metalness={0.9} roughness={0.28} />
      </RoundedBox>
      {/* lòng cổng tối + lưỡi tiếp điểm */}
      <RoundedBox
        args={[w - 0.025, h - 0.025, 0.02]}
        radius={(h - 0.025) / 2 - 0.001}
        smoothness={4}
        position-z={mouthZ}
      >
        <meshStandardMaterial color="#0b0c0e" roughness={0.8} />
      </RoundedBox>
      <mesh position-z={mouthZ - 0.006}>
        <boxGeometry args={[w * 0.62, h * 0.22, 0.012]} />
        <meshStandardMaterial color="#2a2b30" roughness={0.6} />
      </mesh>
    </group>
  )
}
