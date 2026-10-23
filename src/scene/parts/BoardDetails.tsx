import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { playClick } from '@/sound'
import { useHover } from '../common/useHover'

const socketGeo = new THREE.BoxGeometry(0.5, 0.09, 0.28)
const socketMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 })
const padGeo = new THREE.BoxGeometry(0.12, 0.02, 0.14)
const padMat = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 0.9, roughness: 0.3 })

/** Socket hotswap (Kailh) ở mặt dưới PCB */
export function HotswapSockets() {
  const keys = useCtx().keys
  return keys.map((k) => (
    <group key={k.id} position={[k.cx + 0.05, Y.pcbBot - 0.045, k.cz + 0.1]}>
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
  return ctx.gaskets.map((g, i) => (
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
  ))
}

/** Vòng silicon ôm quanh board (O-ring / OG mount). ghost = bản xem trước chưa lắp */
export function SiliconeRing({ ghost }: { ghost: boolean }) {
  const ctx = useCtx()
  const W = ctx.width + 0.2
  const D = ctx.depth + 0.2
  const sides: [number, number, number, number][] = [
    [0, -D / 2, W, 0.12],
    [0, D / 2, W, 0.12],
    [-W / 2, 0, 0.12, D],
    [W / 2, 0, 0.12, D],
  ]
  return (
    <group position-y={-0.17}>
      {sides.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <boxGeometry args={[w, 0.3, d]} />
          {ghost ? (
            <meshBasicMaterial color="#ffd84a" transparent opacity={0.35} />
          ) : (
            <meshStandardMaterial color="#55575f" roughness={0.9} transparent opacity={0.9} />
          )}
        </mesh>
      ))}
    </group>
  )
}
