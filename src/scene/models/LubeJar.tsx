import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { createLubeJar, LUBE_JAR_URL } from './lubeJarModel'

useGLTF.preload(LUBE_JAR_URL)

export function LubeJar({ lube, ...props }: { lube: string } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(LUBE_JAR_URL)
  const model = useMemo(() => createLubeJar(scene, lube), [scene, lube])
  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}
