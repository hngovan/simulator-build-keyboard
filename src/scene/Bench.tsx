import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { ENV_HDR } from '@/scene/common/envMap'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { Assembly } from './parts/Assembly'
import { ShippingBox } from './parts/ShippingBox'
import { StabModStation } from './stations/StabModStation'
import { LubeStation } from './stations/LubeStation'
import { SolderKit } from './stations/SolderKit'
import { useSceneLoading } from './common/loadingStore'
import { ROOM_BOUNDS, Room } from './Room'
import { CuttingMat } from './common/CuttingMat'
import { EmptyBench } from './EmptyBench'
import { screenCenter, screenEye } from './models/computerLayout'

/** Báo cảnh đã sẵn sàng khi Suspense ngoài cùng tải xong */
function SceneReady() {
  useEffect(() => {
    useSceneLoading.setState({ ready: true })
    return () => useSceneLoading.setState({ ready: false })
  }, [])
  return null
}

/** Fallback khi bước mới cần tải model: đếm để HUD hiện lớp chờ */
function StepLoading() {
  useEffect(() => {
    useSceneLoading.setState((s) => ({ pending: s.pending + 1 }))
    return () => useSceneLoading.setState((s) => ({ pending: s.pending - 1 }))
  }, [])
  return null
}

/** Chọn thứ hiển thị trên bàn theo bước hiện tại */
function Workbench() {
  const step = useStep()
  if (!step) return null
  if (step === 'unbox') return <ShippingBox />
  if (step === 'stabMod') return <StabModStation />
  if (step === 'switchLube') return <LubeStation />
  // bước hàn: thêm đồ hàn (mỏ hàn, cuộn thiếc, bùi nhùi) cạnh board
  if (step === 'solder')
    return (
      <>
        <Assembly />
        <SolderKit />
      </>
    )
  return <Assembly />
}

declare global {
  interface Window {
    __r3f?: { camera: THREE.Camera; controls: OrbitControlsImpl | null; scene: THREE.Scene }
  }
}

/** Đặt camera theo độ rộng bàn phím; bấm "Góc nhìn" để đưa về mặc định */
function CameraRig() {
  const ctx = useCtx()
  const camKey = useGame((s) => s.camKey)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  useEffect(() => {
    const w = ctx.width
    camera.position.set(0, w * 0.62 + 1.5, w * 0.42 + 2.5)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [ctx, camKey, controls, camera])

  // dev: mở camera + controls trong console (cùng kiểu window.__game) để đặt góc nhìn khi debug
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3f = { camera, controls, scene }
  }, [camera, controls, scene])

  // Vuốt ngang trên touchpad (2 ngón) để kéo bàn sang 2 bên
  const dom = useThree((s) => s.gl.domElement)
  useEffect(() => {
    if (!controls) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).setY(0).normalize()
      const d = right.multiplyScalar(
        e.deltaX * camera.position.distanceTo(controls.target) * 0.0012,
      )
      controls.target.add(d)
      camera.position.add(d)
    }
    dom.addEventListener('wheel', onWheel, { passive: true })
    return () => dom.removeEventListener('wheel', onWheel)
  }, [dom, controls, camera])

  // Kéo tự do khắp phòng; chỉ giữ tâm nhìn trong 4 bức tường (và ngang mặt bàn) cho khỏi lạc ra ngoài
  useFrame(() => {
    // đang bay vào màn hình máy tính: tâm nhìn lên cao ngang màn hình, không kẹp
    if (!controls || useGame.getState().pcZoom) return
    const t = controls.target
    const { minX, maxX, minZ, maxZ } = ROOM_BOUNDS
    const d = new THREE.Vector3(
      THREE.MathUtils.clamp(t.x, minX, maxX) - t.x,
      -t.y,
      THREE.MathUtils.clamp(t.z, minZ, maxZ) - t.z,
    )
    if (!d.lengthSq()) return
    t.add(d)
    camera.position.add(d)
  })
  return null
}

/** Bay camera tới trước màn hình máy tính trên bàn (~0.9s) rồi chuyển sang desktop */
function PcZoom() {
  const zoom = useGame((s) => s.pcZoom)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const anim = useRef<{ t: number; from: THREE.Vector3; look: THREE.Vector3 } | null>(null)
  useFrame((_, dt) => {
    if (!zoom) return (anim.current = null)
    if (!controls) return
    anim.current ??= { t: 0, from: camera.position.clone(), look: controls.target.clone() }
    const a = anim.current
    // máy chậm (khung hình dài) vẫn thấy đường bay: mỗi khung tối đa 1/30s
    a.t = Math.min(1, a.t + Math.min(dt, 1 / 30) / 0.9)
    const e = a.t * a.t * (3 - 2 * a.t)
    camera.position.lerpVectors(a.from, new THREE.Vector3(...screenEye()), e)
    controls.target.lerpVectors(a.look, new THREE.Vector3(...screenCenter()), e)
    controls.update()
    if (a.t >= 1) {
      const s = useGame.getState()
      s.goPC()
      // lần sau vào bàn build: camera về góc mặc định
      s.resetCam()
    }
  })
  return null
}

/**
 * Camera xoay 360° (cả nhìn từ dưới lên). Chế độ bàn tay: chuột trái / 1 ngón kéo khung nhìn,
 * chuột phải xoay; chế độ xoay thì ngược lại. Kéo luôn trượt theo mặt bàn
 */
function Controls() {
  const pan = useGame((s) => s.camMode === 'pan')
  return (
    <OrbitControls
      makeDefault
      screenSpacePanning={false}
      minDistance={4}
      // zoom ra xa được gấp đôi (thấy cả kệ, phòng)
      maxDistance={160}
      mouseButtons={{
        LEFT: pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: pan ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: pan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  )
}

/** Tấm lót cắt dưới bàn phím (bàn học + phòng ở Room); nới theo layout lớn */
function DeskMat() {
  const ctx = useCtx()
  const w = Math.max(ctx.width + 6, 31.5)
  const d = Math.max(ctx.depth + 5, 23.5)
  return <CuttingMat w={w} d={d} position-y={Y.table + 0.005} />
}

/**
 * Nội dung cảnh chỉ render khi đang có build. Canvas dùng renderer riêng nên có thể
 * nhận cập nhật store (vd vừa giao hàng, build = null) trước khi bị gỡ khỏi màn hình
 */
function Scene() {
  const active = useGame((s) => !!s.ctx && !!s.build)
  // chưa có build (hoặc vừa giao xong): bàn trống, bấm ô vàng để chọn đơn
  if (!active) return <EmptyBench />
  return (
    <>
      <DeskMat />
      {/* chờ tải model của bước (GLB) */}
      <Suspense fallback={<StepLoading />}>
        <Workbench />
      </Suspense>
      <CameraRig />
    </>
  )
}

// Cảnh 3D bàn build
export function Bench() {
  const pan = useGame((s) => s.camMode === 'pan')
  return (
    <Canvas
      shadows
      camera={{ position: [0, 14, 11], fov: 42 }}
      className={pan ? '!fixed inset-0 cursor-grab active:cursor-grabbing' : '!fixed inset-0'}
    >
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
      {/* lần đầu vào bàn build: chờ môi trường + model, HUD hiện màn hình chờ */}
      <Suspense fallback={null}>
        <Environment files={ENV_HDR} />
        <Room />
        <Scene />
        <SceneReady />
      </Suspense>
      <ContactShadows position-y={Y.table + 0.02} opacity={0.5} scale={40} blur={2} />
      {/* kéo (chuột phải / Shift + chuột trái) trượt theo mặt bàn thay vì theo màn hình */}
      <Controls />
      <PcZoom />
    </Canvas>
  )
}
