import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { useGame, useCtx, useStep } from '@/store'
import { GASKET, Y, ringFrame } from '@/data/steps'
import { GASKET_ID, SUPPLIES } from '@/data/supplies'
import { playClick } from '@/sound'
import { useHover } from '../common/useHover'
import { HintArrow } from '../stations/StationKit'

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
  rot,
  placed,
  active,
  onPlace,
}: {
  x: number
  z: number
  /** dài dọc mép / tai (u) */
  w: number
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
          <boxGeometry args={[w, GASKET.t, GASKET.d]} />
          {placed ? (
            <meshStandardMaterial color={SUPPLIES[GASKET_ID].color} roughness={0.95} />
          ) : (
            <meshBasicMaterial color="#ffd84a" transparent opacity={hover ? 0.9 : 0.45} />
          )}
        </mesh>
      ))}
    </group>
  )
}

/** Các điểm dán gasket Poron quanh viền / tai plate */
export function Gaskets() {
  const ctx = useCtx()
  const step = useStep()
  const placed = useGame((s) => s.build?.gaskets ?? {})
  const placeGasket = useGame((s) => s.placeGasket)
  // mũi tên vàng chỉ miếng gasket chưa dán đầu tiên (như bàn mod stab)
  const next = step === 'gasket' ? ctx.gaskets.find((_, i) => !placed[i]) : undefined
  return (
    <>
      {ctx.gaskets.map((g, i) => (
        <Gasket
          key={i}
          x={g.x}
          z={g.z}
          w={g.w ?? GASKET.w}
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

/** Vòng silicon quanh board. O-ring mount: cuốn quanh viền, kẹp trong khe giữa PCB và plate, lòi ra tì vách + gờ case.
 * OG mount: ôm cả mép PCB + plate. ghost = bản xem trước chưa lắp */
export function SiliconeRing({
  ghost,
  between,
  color = '#3d3f46',
}: {
  ghost: boolean
  between: boolean
  /** màu dây O-ring đã cuốn (trắng 30A / đen 50A / đỏ 70A) */
  color?: string
}) {
  const ctx = useCtx()
  const { t, h, y, off } = ringFrame(between)
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
            <meshBasicMaterial color="#ffd84a" transparent opacity={0.35} />
          ) : (
            <meshStandardMaterial color={color} roughness={0.6} />
          )}
        </RoundedBox>
      ))}
    </group>
  )
}
