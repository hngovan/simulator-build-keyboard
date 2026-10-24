import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  createSwitchLubeStation,
  SWITCH_STATION_MODELS,
  switchStationUrl,
} from './switchLubeStationModel'

SWITCH_STATION_MODELS.forEach((name) => useGLTF.preload(switchStationUrl(name)))

export function SwitchLubeStation() {
  const base = useGLTF(switchStationUrl('switch-module')).scene
  const left = useGLTF(switchStationUrl('accent-left-side')).scene
  const right = useGLTF(switchStationUrl('accent-right-side')).scene
  const model = useMemo(() => createSwitchLubeStation([base, left, right]), [base, left, right])
  return (
    <group position={[-1.5, -0.55, -1.7]}>
      <primitive object={model} />
    </group>
  )
}
