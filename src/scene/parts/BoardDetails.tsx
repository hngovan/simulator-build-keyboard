import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
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
  placed,
  active,
  onPlace,
}: {
  x: number
  z: number
  placed: boolean
  active: boolean
  onPlace: () => void
}) {
  const { hover, bind } = useHover(active && !placed)
  if (!placed && !active) return null
  return (
    <mesh
      position={[x, -0.04, z]}
      onPointerDown={(e) => {
        if (!active || placed) return
        e.stopPropagation()
        onPlace()
      }}
      {...bind}
    >
      <boxGeometry args={[0.9, 0.12, 0.28]} />
      {placed ? (
        <meshStandardMaterial color="#3a3a40" roughness={0.9} />
      ) : (
        <meshBasicMaterial color="#ffd84a" transparent opacity={hover ? 0.9 : 0.45} />
      )}
    </mesh>
  )
}

/** Các miếng gasket silicon quanh viền plate */
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

/** Vòng silicon quanh board. O-ring mount: cuốn quanh viền, kẹp trong khe giữa PCB và plate (lòi ra ngoài 1 chút).
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
  // O-ring: cao bằng khe PCB–plate, tâm ngay mép board
  const t = 0.12
  const h = between ? Y.plateBot - Y.pcbTop - 0.01 : 0.3
  const W = ctx.width + (between ? 0.04 : 0.2)
  const D = ctx.depth + (between ? 0.04 : 0.2)
  const sides: [number, number, number, number][] = [
    [0, -D / 2, W + t, t],
    [0, D / 2, W + t, t],
    [-W / 2, 0, t, D],
    [W / 2, 0, t, D],
  ]
  return (
    <group position-y={between ? (Y.pcbTop + Y.plateBot) / 2 : -0.17}>
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
