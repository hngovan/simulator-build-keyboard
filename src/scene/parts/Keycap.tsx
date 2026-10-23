import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import type * as THREE from 'three'
import { useGame } from '@/store'
import { KEYCAP_COLORS } from '@/data/parts'
import type { Key } from '@/types'
import { lerpTo } from '../common/anim'

/** Keycap: lún xuống khi nhấn, có chấm xanh khi đã test */
export function Keycap({ k, color }: { k: Key; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const pressed = useGame((s) => !!s.pressed[k.id])
  const tested = useGame((s) => !!s.build?.tested[k.id])
  const col = KEYCAP_COLORS[color]
  useFrame((_, dt) => lerpTo(ref, 'y', pressed ? -0.15 : 0, dt, 30))
  return (
    <group ref={ref}>
      <RoundedBox
        args={[k.w - 0.08, 0.42, k.h - 0.08]}
        radius={0.08}
        smoothness={3}
        castShadow
        position-y={0.21}
      >
        <meshStandardMaterial color={col.hex} roughness={0.55} />
      </RoundedBox>
      {k.label && (
        <Text
          position={[0, 0.43, -0.1]}
          rotation-x={-Math.PI / 2}
          fontSize={k.label.length > 1 ? 0.2 : 0.3}
          color={col.legend}
        >
          {k.label}
        </Text>
      )}
      {tested && (
        <mesh position={[k.w / 2 - 0.2, 0.43, k.h / 2 - 0.2]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.06, 12]} />
          <meshBasicMaterial color="#3ddc84" />
        </mesh>
      )}
    </group>
  )
}
