import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

// ---------- Dụng cụ cầm tay (đầu mũi ở gốc toạ độ, thân hướng lên +y) ----------

// Hiệu ứng vặn: tay thì xoay từng nấc, điện thì quay nhanh + rung
function useSpin(ref: RefObject<THREE.Group | null>, spinKey: number, electric: boolean) {
  const state = useRef({ key: spinKey, t: 0, target: 0 })
  useFrame((_, dt) => {
    const s = state.current
    if (s.key !== spinKey) {
      s.key = spinKey
      s.t = electric ? 0.4 : 0.25
      s.target += Math.PI / 2
    }
    if (!ref.current) return
    if (s.t > 0) {
      s.t -= dt
      if (electric) {
        ref.current.rotation.y += dt * 40
        ref.current.position.x = (Math.random() - 0.5) * 0.01
      } else {
        ref.current.rotation.y += (s.target - ref.current.rotation.y) * Math.min(1, dt * 14)
        ref.current.position.y = -0.03
      }
    } else {
      ref.current.position.set(0, 0, 0)
    }
  })
}

export function ManualScrewdriver({ spinKey }: { spinKey: number }) {
  const ref = useRef<THREE.Group>(null)
  useSpin(ref, spinKey, false)
  return (
    <group ref={ref}>
      <mesh position-y={0.025}>
        <boxGeometry args={[0.1, 0.05, 0.02]} />
        <meshStandardMaterial color="#aab" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position-y={0.4}>
        <cylinderGeometry args={[0.025, 0.025, 0.72, 10]} />
        <meshStandardMaterial color="#c7ced9" metalness={1} roughness={0.2} />
      </mesh>
      <mesh position-y={1.12} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.75, 16]} />
        <meshStandardMaterial color="#e8b23a" roughness={0.5} />
      </mesh>
      {[0.95, 1.12, 1.29].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.122, 0.018, 6, 20]} />
          <meshStandardMaterial color="#8a5f10" />
        </mesh>
      ))}
    </group>
  )
}

export function ElectricScrewdriver({ spinKey }: { spinKey: number }) {
  const ref = useRef<THREE.Group>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const busy = useRef(0)
  const last = useRef(spinKey)
  useSpin(ref, spinKey, true)
  useFrame((_, dt) => {
    if (last.current !== spinKey) ((last.current = spinKey), (busy.current = 0.4))
    busy.current = Math.max(0, busy.current - dt)
    if (led.current) led.current.emissiveIntensity = busy.current > 0 ? 3 : 0.6
  })
  return (
    <group>
      <group ref={ref}>
        <mesh position-y={0.2}>
          <cylinderGeometry args={[0.022, 0.022, 0.4, 6]} />
          <meshStandardMaterial color="#c7ced9" metalness={1} roughness={0.2} />
        </mesh>
      </group>
      <mesh position-y={0.42}>
        <cylinderGeometry args={[0.05, 0.08, 0.12, 16]} />
        <meshStandardMaterial color="#9aa3b5" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position-y={0.95} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.95, 20]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position-y={0.55}>
        <cylinderGeometry args={[0.102, 0.102, 0.04, 20]} />
        <meshStandardMaterial
          ref={led}
          color="#3ecf6e"
          emissive="#3ecf6e"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  )
}

// Mỏ hàn: đầu mũi đỏ dần khi giữ, khói bốc lên
export function SolderingIron({ heat = 0, station }: { heat?: number; station?: boolean }) {
  const tip = useRef<THREE.MeshStandardMaterial>(null)
  const smoke = useRef<(THREE.Mesh | null)[]>([])
  const puffs = useMemo(
    () => [0, 0.2, 0.4, 0.6, 0.8].map((p) => ({ phase: p, x: (Math.random() - 0.5) * 0.1 })),
    [],
  )
  useFrame(({ clock }) => {
    if (tip.current) tip.current.emissiveIntensity = heat * 4
    smoke.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.8 + puffs[i].phase) % 1
      m.position.set(puffs[i].x + Math.sin(t * 6 + i) * 0.05, 0.05 + t * 0.8, 0)
      m.scale.setScalar(0.04 + t * 0.12)
      ;(m.material as THREE.MeshBasicMaterial).opacity = heat > 0 ? (1 - t) * 0.5 * heat : 0
    })
  })
  return (
    <group>
      <group rotation-z={0.6}>
        <mesh position-y={0.08}>
          <coneGeometry args={[0.03, 0.16, 10]} />
          <meshStandardMaterial
            ref={tip}
            color="#8a8f99"
            emissive="#ff5a1a"
            emissiveIntensity={0}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh position-y={0.4}>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 10]} />
          <meshStandardMaterial color="#d0d4da" metalness={1} roughness={0.25} />
        </mesh>
        <mesh position-y={0.68}>
          <cylinderGeometry args={[0.075, 0.06, 0.08, 14]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position-y={1.05} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 14]} />
          <meshStandardMaterial color={station ? '#2b2f38' : '#c9302c'} roughness={0.5} />
        </mesh>
      </group>
      {puffs.map((p, i) => (
        <mesh
          key={p.phase}
          ref={(m) => {
            smoke.current[i] = m
          }}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#e8e8e8" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
