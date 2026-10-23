import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { Assembly } from './parts/Assembly'
import { ShippingBox } from './parts/ShippingBox'
import { StabModStation } from './stations/StabModStation'
import { LubeStation } from './stations/LubeStation'

/** Chọn thứ hiển thị trên bàn theo bước hiện tại */
function Workbench() {
  const step = useStep()
  if (!step) return null
  if (step === 'unbox') return <ShippingBox />
  if (step === 'stabMod') return <StabModStation />
  if (step === 'switchLube') return <LubeStation />
  return <Assembly />
}

/** Đặt camera theo độ rộng bàn phím; bấm "Góc nhìn" để đưa về mặc định */
function CameraRig() {
  const ctx = useCtx()
  const camKey = useGame((s) => s.camKey)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  useEffect(() => {
    const w = ctx.width
    camera.position.set(0, w * 0.62 + 1.5, w * 0.42 + 2.5)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [ctx, camKey, controls, camera])
  return null
}

function Desk() {
  const ctx = useCtx()
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={Y.table} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#6b4a32" roughness={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={Y.table + 0.01} receiveShadow>
        <planeGeometry args={[ctx.width + 6, ctx.depth + 5]} />
        <meshStandardMaterial color="#2b3a4f" roughness={1} />
      </mesh>
    </>
  )
}

/**
 * Nội dung cảnh chỉ render khi đang có build. Canvas dùng renderer riêng nên có thể
 * nhận cập nhật store (vd vừa giao hàng, build = null) trước khi bị gỡ khỏi màn hình
 */
function Scene() {
  const active = useGame((s) => !!s.ctx && !!s.build)
  if (!active) return null
  return (
    <>
      <Desk />
      {/* chờ tải model stab (GLB) */}
      <Suspense fallback={null}>
        <Workbench />
      </Suspense>
      <CameraRig />
    </>
  )
}

// Cảnh 3D bàn build
export function Bench() {
  return (
    <Canvas shadows camera={{ position: [0, 14, 11], fov: 42 }} className="!fixed inset-0">
      <color attach="background" args={['#20232c']} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[6, 14, 8]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Environment preset="apartment" />
      <Scene />
      <ContactShadows position-y={Y.table + 0.02} opacity={0.5} scale={40} blur={2} />
      <OrbitControls makeDefault minDistance={4} maxDistance={40} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  )
}
