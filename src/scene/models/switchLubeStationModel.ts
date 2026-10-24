import * as THREE from 'three'

export const SWITCH_STATION_MODELS = [
  'switch-module',
  'accent-left-side',
  'accent-right-side',
] as const
export const switchStationUrl = (name: string) => `/models/lube/${name}.glb`

/** Preserve the CAD assembly offsets and Y-up orientation in the shop and on the bench. */
export function createSwitchLubeStation(sources: THREE.Group[]) {
  const group = new THREE.Group()
  sources.forEach((source, index) => {
    const copy = source.clone(true)
    const material = new THREE.MeshStandardMaterial({
      color: index === 0 ? '#526b75' : '#d87d5d',
      roughness: index === 0 ? 0.58 : 0.48,
    })
    copy.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      o.material = material
      o.castShadow = o.receiveShadow = true
    })
    group.add(copy)
  })
  group.scale.setScalar(1 / 19.05)
  return group
}
