import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '@/store'
import { TOOLS } from '@/data/parts'
import { Y } from '@/data/steps'
import type { Key } from '@/types'
import { playSolder } from '@/sound'
import { useHover } from '../common/useHover'
import { SolderingIron } from '../models/HandTools'

// Vị trí 2 chân switch MX (mm, so với tâm)
const PINS: [number, number][] = [
  [-3.81, -2.54],
  [2.54, -5.08],
]

/** Chân hàn ở mặt dưới PCB: giữ chuột đủ lâu để hàn */
export function SolderPad({ k }: { k: Key }) {
  const done = useGame((s) => !!s.build?.solder[k.id])
  const toolLv = useGame((s) => s.tools.solder)
  const solderKey = useGame((s) => s.solderKey)
  const hold = TOOLS.solder[toolLv].hold!
  const [holding, setHolding] = useState(false)
  const [heat, setHeat] = useState(0)
  const t = useRef(0)
  const { hover, bind } = useHover(!done)

  useFrame((_, dt) => {
    if (!holding || done) return
    t.current += dt
    setHeat(Math.min(1, t.current / hold))
    if (t.current >= hold) {
      solderKey(k.id)
      playSolder()
      setHolding(false)
    }
  })
  const stop = () => {
    setHolding(false)
    t.current = 0
    setHeat(0)
  }

  // group xoay 180° để "phía trên" của pad hướng ra ngoài mặt đáy PCB
  return (
    <group position={[k.cx, Y.pcbBot, k.cz]} rotation-x={Math.PI}>
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.002}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!done) setHolding(true)
        }}
        onPointerUp={stop}
        onPointerOver={bind.onPointerOver}
        onPointerOut={() => {
          bind.onPointerOut()
          stop()
        }}
      >
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial
          color="#ffd84a"
          transparent
          opacity={hover ? 0.2 : 0}
          depthWrite={false}
        />
      </mesh>
      {PINS.map(([px, pz]) => (
        <group key={px} position={[px / 19.05, 0, -pz / 19.05]}>
          <mesh position-y={0.004} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.08, 16]} />
            <meshStandardMaterial
              color={done ? '#e8e8ea' : '#d4a64a'}
              metalness={0.9}
              roughness={0.25}
            />
          </mesh>
          {done && (
            <mesh position-y={0.025} scale={[1, 0.55, 1]}>
              <sphereGeometry args={[0.08, 12, 8]} />
              <meshStandardMaterial color="#eef0f2" metalness={1} roughness={0.12} />
            </mesh>
          )}
        </group>
      ))}
      {(hover || holding) && !done && (
        <group position={[-0.2, 0.01, 0.13]} scale={1.5}>
          <SolderingIron heat={heat} station={toolLv > 0} />
        </group>
      )}
    </group>
  )
}
