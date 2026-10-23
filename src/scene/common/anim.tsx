import { useRef, type ReactNode, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'

/** Đưa dần position[axis] của object về target (gọi trong useFrame) */
export function lerpTo(
  ref: RefObject<THREE.Object3D | null>,
  axis: 'x' | 'y' | 'z',
  target: number,
  dt: number,
  speed = 12,
) {
  const o = ref.current
  if (o) o.position[axis] += (target - o.position[axis]) * Math.min(1, dt * speed)
}

/** Vật thể rơi từ trên xuống vị trí y (hiệu ứng "lắp vào") */
export function Drop({
  y = 0,
  from = 1.2,
  children,
}: {
  y?: number
  from?: number
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => lerpTo(ref, 'y', y, dt, 18))
  return (
    <group ref={ref} position-y={y + from}>
      {children}
    </group>
  )
}
