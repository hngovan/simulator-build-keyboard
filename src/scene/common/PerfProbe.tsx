import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { attachGpuProbe, usePerfHud } from '@/lib/perfStats'

/** Trong <Canvas>: bật HUD hiệu năng thì gắn bộ đo thời gian GPU / draw call vào renderer */
export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  const on = usePerfHud((s) => s.on)
  useEffect(() => (on ? attachGpuProbe(gl) : undefined), [gl, on])
  return null
}
