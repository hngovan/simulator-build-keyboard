import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export const DESOLDER_PUMP_GLB = '/models/solder/desolder-pump.glb'
useGLTF.preload(DESOLDER_PUMP_GLB)

/** Nozzle at origin; cocking/release moves the plunger assembly along the barrel. */
export function DesolderPump({ progress = 0 }: { progress?: number }) {
  const { scene } = useGLTF(DESOLDER_PUMP_GLB)
  const { body, plunger } = useMemo(() => {
    const body = new THREE.Group(),
      plunger = new THREE.Group()
    for (const child of [...scene.clone(true).children]) {
      child.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      if (/Plunger[ _]Cap|Main[ _]Pin/.test(child.name)) plunger.add(child)
      else body.add(child)
    }
    return { body, plunger }
  }, [scene])
  const compression =
    progress < 0.65 ? Math.min(1, progress / 0.3) : Math.max(0, 1 - (progress - 0.65) / 0.08)
  return (
    <group>
      <primitive object={body} />
      <primitive object={plunger} position-y={-0.35 * compression} />
    </group>
  )
}
