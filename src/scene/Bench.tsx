import { Suspense, useEffect, useRef } from 'react'
import { onBench } from '@/store/carrySlice'
import { usePack } from '@/features/bench/packStore'
import { PackBox } from './parts/PackBox'
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
import { ScrewTray } from './parts/ScrewTray'
import { useSceneLoading } from './common/loadingStore'
import { useCamLock } from './common/camLock'
import { Room } from './Room'
import { ROOM_BOUNDS } from './room/roomLayout'
import { WalkControls } from './room/WalkControls'
import { benchView } from './common/benchPose'
import { CuttingMat } from './common/CuttingMat'
import { EmptyBench } from './EmptyBench'
import { fitAspect } from './common/fitAspect'
import { screenCenter, screenEye } from './models/computerLayout'
import { M } from './room/roomLayout'

/** Báo cảnh đã sẵn sàng khi Suspense ngoài cùng tải xong */
function SceneReady() {
  useEffect(() => {
    useSceneLoading.setState({ ready: true })
    return () => useSceneLoading.setState({ ready: false, settled: false })
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
  // đóng gói: bước cuối, hoặc bấm nút cam "Đóng gói" ở bước bất kỳ (hoạt cảnh thùng úp lên bàn phím)
  const packing = usePack((p) => p.at !== null)
  if (!step) return null
  if (step === 'pack' || packing)
    return (
      <>
        <Assembly />
        <PackBox />
      </>
    )
  if (step === 'unbox') return <ShippingBox />
  if (step === 'stabMod') return <StabModStation />
  if (step === 'switchLube') return <LubeStation />
  // bước hàn: thêm đồ hàn (mỏ hàn, cuộn thiếc, bùi nhùi) cạnh board
  if (step === 'solder')
    return (
      <>
        <Assembly />
        <SolderKit />
        <ScrewTray />
      </>
    )
  // ốc case đã tháo: nằm trong khay đựng ốc (nếu có) / vương trên bàn
  return (
    <>
      <Assembly />
      <ScrewTray />
    </>
  )
}

declare global {
  interface Window {
    __r3f?: { camera: THREE.Camera; controls: OrbitControlsImpl | null; scene: THREE.Scene }
  }
}

/** phím đi lại: đang ngồi bàn build bấm thì đứng dậy */
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD']

/** Đặt camera theo độ rộng bàn phím; bấm "Góc nhìn" để đưa về mặc định */
function CameraRig() {
  const ctx = useCtx()
  const camKey = useGame((s) => s.camKey)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const fit = useThree((s) => fitAspect(s.size.width / s.size.height))
  // bước mở hộp: thùng cỡ thật → lùi xa như bàn có thùng
  const unbox = useStep() === 'unbox'
  useEffect(() => {
    // đang đi lại trong phòng: không kéo camera về bàn
    if (useGame.getState().walk) return
    camera.position.set(...benchView({ width: ctx.width, unbox, box: true }, fit))
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [ctx, camKey, controls, camera, fit, unbox])

  // dev: mở camera + controls trong console (cùng kiểu window.__game) để đặt góc nhìn khi debug
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3f = { camera, controls, scene }
  }, [camera, controls, scene])

  // giữ tâm nhìn trong 4 bức tường, camera không xuống dưới sàn
  useFrame((state) => {
    // đang bay vào màn hình máy tính: tâm nhìn lên cao ngang màn hình, không kẹp
    if (!controls || useGame.getState().pcZoom) return
    const t = controls.target
    const { minX, maxX, minY, maxY, minZ, maxZ, floorY } = ROOM_BOUNDS
    const d = new THREE.Vector3(
      THREE.MathUtils.clamp(t.x, minX, maxX) - t.x,
      THREE.MathUtils.clamp(t.y, minY, maxY) - t.y,
      THREE.MathUtils.clamp(t.z, minZ, maxZ) - t.z,
    )
    if (d.lengthSq()) {
      t.add(d)
      camera.position.add(d)
    }
    if (state.camera.position.y < floorY) state.camera.position.y = floorY
  })
  return null
}

/** Bay camera tới trước màn hình máy tính (~0.9s) rồi chuyển sang desktop; đang đi lại (không có OrbitControls) thì xoay hướng nhìn theo */
function PcZoom() {
  const zoom = useGame((s) => s.pcZoom)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const anim = useRef<{ t: number; from: THREE.Vector3; look: THREE.Vector3 } | null>(null)
  useFrame((_, dt) => {
    if (!zoom) return (anim.current = null)
    anim.current ??= {
      t: 0,
      from: camera.position.clone(),
      // đi lại: điểm nhìn = 1m trước mặt
      look:
        controls?.target.clone() ??
        camera.position
          .clone()
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(M)),
    }
    const a = anim.current
    // máy chậm (khung hình dài) vẫn thấy đường bay: mỗi khung tối đa 1/30s
    a.t = Math.min(1, a.t + Math.min(dt, 1 / 30) / 0.9)
    const e = a.t * a.t * (3 - 2 * a.t)
    camera.position.lerpVectors(a.from, new THREE.Vector3(...screenEye()), e)
    const look = new THREE.Vector3().lerpVectors(a.look, new THREE.Vector3(...screenCenter()), e)
    if (controls) {
      controls.target.copy(look)
      controls.update()
    } else camera.lookAt(look)
    if (a.t >= 1) {
      const s = useGame.getState()
      s.goPC()
      // lần sau vào bàn build: camera về góc mặc định, ngồi ở bàn (không đi lại)
      useGame.setState({ walk: false })
      s.resetCam()
    }
  })
  return null
}

/**
 * Camera neo quanh tâm vật đang làm (CameraRig đặt tâm theo bước, Space về góc mặc định, lật xem đáy bằng Q):
 * chuột trái / phải / 1 ngón kéo xoay quanh tâm, cuộn / 2 ngón zoom vào tâm; không kéo trượt khung nhìn, không xuống dưới mặt bàn
 */
function Controls() {
  const walk = useGame((s) => s.walk)
  // đang giữ chuột thao tác (hàn...) thì khoá camera
  const locked = useCamLock((s) => s.locked)
  // đang ngồi bàn build mà bấm WASD: đứng dậy đi luôn (như PC Building Simulator)
  useEffect(() => {
    if (walk) return
    const onKey = (e: KeyboardEvent) => {
      if (!MOVE_KEYS.includes(e.code) || e.ctrlKey || e.metaKey || e.altKey) return
      if (
        (e.target as HTMLElement | null)?.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return
      const s = useGame.getState()
      // bước test (phím là phím test), đang bay vào máy tính, có bảng / popup đang mở thì thôi
      if (s.screen !== 'bench' || s.pcZoom || s.step() === 'test') return
      if (document.querySelector('[role="dialog"], [class*="z-[3000]"], [class*="z-[3500]"]'))
        return
      s.standUp('bench')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [walk])
  // đi lại trong phòng: góc nhìn người (WASD + kéo chuột nhìn)
  if (walk) return <WalkControls />
  return (
    <OrbitControls
      makeDefault
      enabled={!locked}
      enablePan={false}
      // không xoay xuống dưới mặt bàn
      maxPolarAngle={1.45}
      // lại gần sát keycap (1u = 19mm) nhưng vẫn dừng trên mặt bàn / bàn phím
      minDistance={1.8}
      // zoom ra xa được gấp đôi (thấy cả kệ, phòng)
      maxDistance={160}
      rotateSpeed={0.8}
      zoomSpeed={1.3}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
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
  // đơn đang làm có build và thùng đơn đang nằm trên bàn (cầm lên cất kệ thì bàn trống)
  const active = useGame((s) => !!s.ctx && !!s.build && onBench(s))
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
  return (
    // con trỏ mũi tên mặc định (theo body), rê vào vật bấm được thì `useHover` đổi sang bàn tay
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
