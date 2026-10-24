import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { useGame } from '@/store'
import { KEYCAP_COLORS, KEYCAP_KITS, type KeycapProfile } from '@/data/parts'
import type { Key } from '@/types'
import { lerpTo } from '../common/anim'
import { capGeometry, keycapShape, keycapModel, stretchCap } from '../models/keycapShape'

/** sau bao lâu không bấm phím nào thì viền đỏ các phím chưa test (ms) */
const IDLE_MS = 5000

// dùng chung cho mọi phím: nhấp nháy cùng nhịp
const alertMat = new THREE.MeshBasicMaterial({
  color: '#ff4d4d',
  transparent: true,
  depthWrite: false,
})

/** Viền đỏ quanh mặt keycap chưa test, hiện khi người chơi ngừng bấm quá IDLE_MS */
function UntestedOutline({ w, h, y }: { w: number; h: number; y: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const idle = performance.now() - useGame.getState().testIdleFrom > IDLE_MS
    if (ref.current) ref.current.visible = idle
    if (idle) alertMat.opacity = 0.55 + Math.sin(clock.elapsedTime * 6) * 0.35
  })
  const t = 0.05 // bề rộng viền
  const bars: [number, number, number, number][] = [
    [0, -h / 2, w, t],
    [0, h / 2, w, t],
    [-w / 2, 0, t, h],
    [w / 2, 0, t, h],
  ]
  return (
    <group ref={ref} position-y={y} visible={false}>
      {bars.map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0, z]} material={alertMat}>
          <boxGeometry args={[bw, 0.02, bd]} />
        </mesh>
      ))}
    </group>
  )
}

function CapOverlay({
  k,
  color,
  height,
  dish,
  inset,
  testing,
  tested,
}: {
  k: Key
  color: string
  height: number
  dish: number
  inset: number
  testing: boolean
  tested: boolean
}) {
  const col = KEYCAP_COLORS[color]
  return (
    <>
      {k.label && (
        <Text
          position={[0, height - dish + 0.015, -0.1]}
          rotation-x={-Math.PI / 2}
          fontSize={k.label.length > 1 ? 0.2 : 0.3}
          color={col.legend}
        >
          {k.label}
        </Text>
      )}
      {testing && !tested && (
        <UntestedOutline w={k.w - inset * 2 - 0.08} h={k.h - inset * 2 - 0.08} y={height + 0.02} />
      )}
      {tested && (
        <mesh position={[k.w / 2 - 0.2, height + 0.015, k.h / 2 - 0.2]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.06, 12]} />
          <meshBasicMaterial color="#3ddc84" />
        </mesh>
      )}
    </>
  )
}

function NativeCap({
  k,
  color,
  profile,
  testing,
  tested,
}: {
  k: Key
  color: string
  profile: KeycapProfile
  testing: boolean
  tested: boolean
}) {
  const model = keycapModel(profile, k.row)
  const source = useGLTF(`/models/keycaps/${model}.glb`).scene
  const scene = useMemo(() => {
    // phím rộng: kéo dãn phần giữa, giữ mép như keycap đúc thật
    const copy = stretchCap(source.clone(true), k.w, k.h)
    const material = new THREE.MeshStandardMaterial({
      color: KEYCAP_COLORS[color].hex,
      roughness: 0.55,
      side: THREE.DoubleSide,
    })
    copy.traverse((part) => {
      if ((part as THREE.Mesh).isMesh) {
        const mesh = part as THREE.Mesh
        mesh.material = material
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return copy
  }, [source, color, k.w, k.h])
  const shape = keycapShape(profile, k.row)
  const { height, dish } = useMemo(() => {
    const height = new THREE.Box3().setFromObject(source).max.y
    let center = -Infinity
    source.traverse((part) => {
      if (!(part as THREE.Mesh).isMesh) return
      const points = (part as THREE.Mesh).geometry.getAttribute('position')
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i)
        const z = points.getZ(i)
        if (Math.abs(x) < 0.08 && Math.abs(z) < 0.12) center = Math.max(center, points.getY(i))
      }
    })
    return { height, dish: Number.isFinite(center) ? height - center : shape.dish }
  }, [source, shape.dish])
  return (
    <>
      <primitive object={scene} />
      <CapOverlay
        k={k}
        color={color}
        height={height}
        dish={dish}
        inset={shape.inset}
        testing={testing}
        tested={tested}
      />
    </>
  )
}

/** Keycap: lún xuống khi nhấn, có chấm xanh khi đã test; chưa test mà để lâu thì viền đỏ */
export function Keycap({ k, color, kit }: { k: Key; color: string; kit?: string }) {
  const ref = useRef<THREE.Group>(null)
  const pressed = useGame((s) => !!s.pressed[k.id])
  const tested = useGame((s) => !!s.build?.tested[k.id])
  const testing = useGame((s) => !!s.build && s.ctx?.steps[s.build.stepIdx] === 'test')
  const profile = KEYCAP_KITS[kit ?? 'base']?.profile ?? 'cherry'
  const shape = useMemo(() => keycapShape(profile, k.row), [profile, k.row])
  const geometry = useMemo(() => capGeometry(k.w - 0.08, k.h - 0.08, shape), [k.w, k.h, shape])
  useFrame((_, dt) => lerpTo(ref, 'y', pressed ? -0.15 : 0, dt, 30))
  return (
    <group ref={ref}>
      {keycapModel(profile, k.row) ? (
        <NativeCap k={k} color={color} profile={profile} testing={testing} tested={tested} />
      ) : (
        <>
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
              color={KEYCAP_COLORS[color].hex}
              roughness={0.55}
              side={THREE.DoubleSide}
            />
          </mesh>
          <CapOverlay
            k={k}
            color={color}
            height={shape.height}
            dish={shape.dish}
            inset={shape.inset}
            testing={testing}
            tested={tested}
          />
        </>
      )}
    </group>
  )
}
