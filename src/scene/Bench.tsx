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
import { useCamLock } from './common/camLock'
import { ROOM_BOUNDS, Room } from './Room'
import { CuttingMat } from './common/CuttingMat'
import { EmptyBench } from './EmptyBench'
import { fitAspect } from './common/fitAspect'
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

/** tốc độ kéo khung nhìn; dưới PAN_REF (u, khoảng cách camera → tâm nhìn, ~góc nhìn mặc định) thì bù cho khỏi chậm */
const PAN_SPEED = 2.5
const PAN_REF = 22

/** mỗi nấc cuộn zoom vào: tâm nhìn tiến về điểm con trỏ chỉ bao nhiêu phần */
const ZOOM_TO_POINT = 0.12

/** Đặt camera theo độ rộng bàn phím; bấm "Góc nhìn" để đưa về mặc định */
function CameraRig() {
  const ctx = useCtx()
  const camKey = useGame((s) => s.camKey)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const fit = useThree((s) => fitAspect(s.size.width / s.size.height))
  useEffect(() => {
    const w = ctx.width
    camera.position.set(0, (w * 0.62 + 1.5) * fit, (w * 0.42 + 2.5) * fit)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [ctx, camKey, controls, camera, fit])

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

  // Cuộn zoom vào: dời tâm nhìn (cùng camera) dần về chỗ con trỏ chỉ trúng (sàn, chân bàn, kệ...).
  // OrbitControls.zoomToCursor với screenSpacePanning = false giữ tâm nhìn trên mặt phẳng ngang, không xuống sàn được
  useEffect(() => {
    if (!controls) return
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const onZoom = (e: WheelEvent) => {
      if (e.deltaY >= 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const r = dom.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.visible)
      if (!hit) return
      const d = hit.point.clone().sub(controls.target).multiplyScalar(ZOOM_TO_POINT)
      controls.target.add(d)
      camera.position.add(d)
    }
    dom.addEventListener('wheel', onZoom, { passive: true })
    return () => dom.removeEventListener('wheel', onZoom)
  }, [dom, controls, camera, scene])

  // Kéo tự do khắp phòng; giữ tâm nhìn trong 4 bức tường, cao từ sát sàn tới tầm kệ (zoom theo con trỏ xuống sàn được)
  useFrame((state) => {
    // đang bay vào màn hình máy tính: tâm nhìn lên cao ngang màn hình, không kẹp
    if (!controls || useGame.getState().pcZoom) return
    // OrbitControls kéo theo tỉ lệ khoảng cách camera → zoom sát thì kéo rất chậm.
    // Bù lại: gần hơn PAN_REF thì tăng panSpeed, rê chuột bao xa thì bàn trôi đi gần bằng lúc nhìn bình thường
    // gán qua state của useFrame (không sửa thẳng giá trị lấy từ hook)
    const live = state.controls as OrbitControlsImpl
    const dist = state.camera.position.distanceTo(live.target)
    live.panSpeed = PAN_SPEED * Math.max(1, PAN_REF / Math.max(dist, 0.5))
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
  // đang giữ chuột thao tác (hàn...) thì khoá camera
  const locked = useCamLock((s) => s.locked)
  return (
    <OrbitControls
      makeDefault
      enabled={!locked}
      screenSpacePanning={false}
      // lại gần sát keycap (1u = 19mm) nhưng vẫn dừng trên mặt bàn / bàn phím
      minDistance={1.8}
      // zoom ra xa được gấp đôi (thấy cả kệ, phòng)
      maxDistance={160}
      // kéo nhanh hơn; zoom sát thì CameraRig tăng thêm (OrbitControls kéo theo khoảng cách camera)
      panSpeed={PAN_SPEED}
      zoomSpeed={1.3}
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
