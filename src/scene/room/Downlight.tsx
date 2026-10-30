import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Đèn downlight âm trần: model "Light Fixture - Ceiling Recessed" (MozillaHubs, Sketchfab, CC BY 4.0; Ø20cm dày 2cm,
// tâm giữa bề dày, mặt đèn quay −y, có texture phát sáng) + vầng sáng ấm mờ trên sàn ngay dưới
// (vẽ cộng sáng, không dùng đèn thật cho nhẹ máy). Đơn vị mét; gốc = điểm trên mặt trần, sàn ở y = −height

const FIXTURE_GLB = '/models/room/ceiling-recessed.glb'
useGLTF.preload(FIXTURE_GLB)

/** vệt sáng tròn mờ dần ra mép (canvas, dùng chung) */
const glowTex = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
})()
const GLOW = new THREE.MeshBasicMaterial({
  map: glowTex,
  color: '#ffd9a0',
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
})
/** quầng sáng nhỏ trên trần quanh đèn */
const HALO = GLOW.clone()
HALO.opacity = 0.35

/** height = khoảng cách trần → sàn (m), pool = đường kính vầng sáng trên sàn */
export function Downlight({
  height,
  pool = 1.1,
  ...props
}: { height: number; pool?: number } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(FIXTURE_GLB)
  const model = useMemo(() => scene.clone(true), [scene])
  return (
    <group {...props}>
      {/* tâm đèn sát mặt trần: lún nửa bề dày vào trần như đèn âm trần */}
      <primitive object={model} position-y={-0.004} />
      <mesh position-y={-0.001} rotation-x={Math.PI / 2} material={HALO} renderOrder={2}>
        <planeGeometry args={[0.5, 0.5]} />
      </mesh>
      <mesh position-y={-height + 0.003} rotation-x={-Math.PI / 2} material={GLOW} renderOrder={2}>
        <planeGeometry args={[pool, pool]} />
      </mesh>
    </group>
  )
}
