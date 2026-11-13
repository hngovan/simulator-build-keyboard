import { Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { onBench } from '@/store/carrySlice'
import { usePack } from '@/features/bench/packStore'
import { PackBox, PackCarry } from './parts/PackBox'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PerfProbe } from '@/scene/common/PerfProbe'
import { ContactShadows, Environment, OrbitControls, PerformanceMonitor } from '@react-three/drei'
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
import { warmUp } from './common/warmup'
import { Room } from './Room'
import { ROOM_BOUNDS } from './room/roomLayout'
import { WalkControls } from './room/WalkControls'
import { useIntro } from '@/features/intro/introStore'
import { IntroCam } from './room/IntroCam'
import { IntroSpots } from './room/IntroSpots'
import { benchView } from './common/benchPose'
import { CuttingMat } from './common/CuttingMat'
import { EmptyBench } from './EmptyBench'
import { fitAspect } from './common/fitAspect'
import { pcEye, screenCenter } from './models/computerLayout'
import { M } from './room/roomLayout'

/**
 * Báo cảnh đã sẵn sàng khi Suspense ngoài cùng tải xong; trước đó (màn chờ còn che) biên dịch shader + tải texture cả phòng,
 * không để tới lần đầu quay về phía đó mới làm (khựng)
 */
function SceneReady() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    let alive = true
    void warmUp(gl, scene, camera).then(() => alive && useSceneLoading.setState({ ready: true }))
    return () => {
      alive = false
      useSceneLoading.setState({ ready: false, settled: false })
    }
  }, [gl, scene, camera])
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

/** layer camera không bật: vật đang hâm nóng shader vẫn "visible" (compile chỉ duyệt vật visible) nhưng không bị vẽ / bấm trúng */
const WARM_LAYER = 31

/**
 * Bàn trạm (lube, mod stab) lần đầu dựng: nhiều vật liệu / hình mới → khung đầu biên dịch shader + đẩy hình lên GPU đồng bộ, đứng hình
 * vài giây. Giấu khỏi camera (layer riêng), biên dịch song song (`warmUp` → `compileAsync`) trong lúc hiện lớp "Đang tải", xong mới hiện
 */
function Warm({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  // ref (không state): khung kế tiếp sau khi hâm xong không giấu lại
  const warm = useRef(true)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    root.traverse((o) => o.layers.set(WARM_LAYER))
    useSceneLoading.setState((s) => ({ pending: s.pending + 1 }))
    let open = true
    const done = () => {
      if (!open) return
      open = false
      useSceneLoading.setState((s) => ({ pending: s.pending - 1 }))
    }
    void warmUp(gl, root, camera, scene).then(() => {
      if (!open) return
      warm.current = false
      root.traverse((o) => o.layers.set(0))
      done()
    })
    return done
    // chỉ lần dựng đầu của trạm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // vật mới mọc thêm lúc đang hâm (chưa xong) cũng giấu theo
  useFrame(() => {
    if (warm.current) ref.current?.traverse((o) => o.layers.set(WARM_LAYER))
  })
  return <group ref={ref}>{children}</group>
}

/** Chọn thứ hiển thị trên bàn theo bước hiện tại */
function Workbench() {
  const step = useStep()
  // đóng gói: bước cuối, hoặc bấm nút cam "Đóng gói" ở bước bất kỳ (hoạt cảnh bàn phím bay vào thùng)
  const packing = usePack((p) => p.at !== null)
  if (!step) return null
  if (step === 'pack' || packing)
    return (
      <>
        <PackCarry>
          <Assembly />
        </PackCarry>
        <PackBox />
      </>
    )
  if (step === 'unbox') return <ShippingBox />
  if (step === 'stabMod')
    return (
      <Warm key="stab">
        <StabModStation />
      </Warm>
    )
  if (step === 'switchLube')
    return (
      <Warm key="lube">
        <LubeStation />
      </Warm>
    )
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
    __r3f?: {
      camera: THREE.Camera
      controls: OrbitControlsImpl | null
      scene: THREE.Scene
      gl?: THREE.WebGLRenderer
    }
  }
}

/** camera lúc tạ nằm ngoài case: lùi xa (× `back`), tâm nhìn dời ra trước `dz` × chiều sâu bàn phím */
const WEIGHT_OUT_CAM = { back: 1.5, dz: 0.6 }
/** camera bước đóng gói: thùng carton nằm sau bàn phím (tâm z = −(depth + 1.6), cao ≥ 2.4u) → lùi xa, tâm nhìn dời về giữa bàn phím và thùng */
const PACK_CAM = { back: 1.45, gap: 1.6 }

/** Đặt camera theo độ rộng bàn phím; bấm "Góc nhìn" để đưa về mặc định */
function CameraRig() {
  const ctx = useCtx()
  const camKey = useGame((s) => s.camKey)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const fit = useThree((s) => fitAspect(s.size.width / s.size.height))
  const step = useStep()
  // bước mở hộp: thùng cỡ thật → lùi xa như bàn có thùng
  const unbox = step === 'unbox'
  // vào bước lắp lại tạ (vd vừa cắm dây vào DTB lúc đang zoom sát): tạ vẫn nằm ngoài như bước DTB nên `weightOut` không đổi
  // → thêm vào deps để camera lùi ra lại cho thấy tạ
  const coverOn = step === 'coverOn'
  // bước đóng gói: cho thấy cả bàn phím lẫn thùng carton phía sau
  const pack = step === 'pack'
  // tạ che DTB đã nhấc ra nằm trước case (chưa lắp lại): lùi camera + dời tâm nhìn ra trước cho thấy cả case lẫn tạ
  const weightOut = useGame((s) => {
    const c = s.build?.cover
    return !!s.ctx?.dtb?.cover && !!c?.off && !c.on
  })
  useEffect(() => {
    // đang đi lại trong phòng: không kéo camera về bàn
    if (useGame.getState().walk) return
    const pos = benchView({ width: ctx.width, unbox, box: true }, fit)
    const tz = pack
      ? -(ctx.depth + PACK_CAM.gap) / 2
      : weightOut
        ? ctx.depth * WEIGHT_OUT_CAM.dz
        : 0
    const k = pack ? PACK_CAM.back : weightOut ? WEIGHT_OUT_CAM.back : 1
    camera.position.set(pos[0] * k, pos[1] * k, pos[2] * k + tz)
    controls?.target.set(0, 0, tz)
    controls?.update()
  }, [ctx, camKey, controls, camera, fit, unbox, weightOut, coverOn, pack])

  // dev: mở camera + controls trong console (cùng kiểu window.__game) để đặt góc nhìn khi debug
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3f = { camera, controls, scene, gl }
  }, [camera, controls, scene, gl])

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
  const size = useThree((s) => s.size)
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
    // dừng ở chỗ mặt kính trùng khung desktop (PcView giữ tiếp)
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 42
    camera.position.lerpVectors(
      a.from,
      new THREE.Vector3(...pcEye(fov, size.width, size.height)),
      e,
    )
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
 * Đang ngồi máy tính (screen 'pc'): cảnh làm nền sau khung desktop, camera đứng yên nhìn thẳng màn hình (mặt kính trùng khung
 * desktop, quanh đó thấy bàn / phòng). Chỉ vẽ lại khi cần (frameloop demand); useFrame ưu tiên 1 = tự render sau khi đặt camera,
 * đè mọi chỗ khác vừa dời camera (CameraRig, camKey...)
 */
function PcView() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    setFrameloop('demand')
    invalidate()
    return () => setFrameloop('always')
  }, [setFrameloop, invalidate])
  useFrame(({ gl, scene, camera, size }) => {
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 42
    camera.position.set(...pcEye(fov, size.width, size.height))
    camera.lookAt(...screenCenter())
    gl.render(scene, camera)
  }, 1)
  return null
}

/** tốc độ kéo trượt: OrbitControls dời theo khoảng cách camera → zoom sát thì kéo rất chậm, nhân thêm khi gần hơn `PAN_REF` */
const PAN_SPEED = 2.5
const PAN_REF = 22

function PanSpeed() {
  useFrame(({ camera, controls }) => {
    const c = controls as OrbitControlsImpl | null
    if (!c?.enablePan) return
    c.panSpeed = PAN_SPEED * Math.max(1, PAN_REF / camera.position.distanceTo(c.target))
  })
  return null
}

/**
 * Camera neo quanh tâm vật đang làm (CameraRig đặt tâm theo bước, Space về góc mặc định, lật xem đáy bằng Q):
 * chuột trái / 1 ngón kéo xoay quanh tâm; Shift + chuột trái / 2 ngón kéo trượt khung nhìn theo mặt bàn
 * (không theo màn hình → không chui xuống bàn, tâm kẹp trong phòng ở CameraRig); cuộn / chuột giữa / 2 ngón zoom
 */
function Controls() {
  const walk = useGame((s) => s.walk)
  const pc = useGame((s) => s.screen === 'pc')
  // đang giữ chuột thao tác (hàn...) thì khoá camera
  const locked = useCamLock((s) => s.locked)
  // đang ngồi bàn build: chỉ nút quay lại mới đứng dậy (Esc mở Cài đặt) (WASD không đứng dậy, dễ bấm nhầm lúc thao tác)
  // ngồi máy tính: camera đứng yên (PcView), không điều khiển
  if (pc) return null
  // đi lại trong phòng: góc nhìn người (WASD + kéo chuột nhìn)
  if (walk) return <WalkControls />
  return (
    <>
      <PanSpeed />
      <OrbitControls
        makeDefault
        enabled={!locked}
        enablePan
        // trượt theo mặt phẳng ngang (mặt bàn) bằng Shift + chuột trái (có sẵn trong OrbitControls)
        screenSpacePanning={false}
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
          // chuột phải không làm gì
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
    </>
  )
}

/**
 * Bóng tiếp xúc dưới đồ trên bàn: drei vẽ lại cả cảnh từ dưới lên + 4 lượt blur mỗi khung (đo ~640k tam giác / khung,
 * ngang cảnh chính). Chỉ vẽ liên tục khi ngồi bàn build (đồ đang được lắp / di chuyển); đi lại / ngồi máy tính
 * thì vẽ 1 lần, dựng lại (đổi `key`) khi đồ trên bàn đổi: tải xong cảnh, đặt / cầm thùng, có / hết build
 */
function BenchShadows() {
  const live = useGame((s) => s.screen === 'bench' && !s.walk)
  const settled = useSceneLoading((s) => s.settled)
  const bench = useGame((s) => `${s.benchBox}|${!!s.build}|${s.packed.length}`)
  return (
    <ContactShadows
      key={live ? 'live' : `${settled}|${bench}`}
      frames={live ? Infinity : 1}
      position-y={Y.table + 0.02}
      opacity={0.5}
      scale={40}
      blur={2}
    />
  )
}

/** trần độ phân giải (màn HiDPI / Windows scale 150%: dpr 2 = vẽ gấp 4 lần số điểm ảnh) */
const MAX_DPR = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 1.5)
// không xuống dưới 1: vẽ thấp hơn màn hình rồi phóng lên thì nét mảnh (rèm lá, vân gỗ, tranh) nhấp nháy sọc khi camera di chuyển
const MIN_DPR = Math.min(1, MAX_DPR)

/**
 * Tự hạ / nâng độ phân giải theo FPS thật (drei PerformanceMonitor): tụt dưới ngưỡng thì giảm dần tới MIN_DPR, dư thì nâng
 * lại tới MAX_DPR; lật qua lật lại 3 lần thì chốt mức hiện tại. Tắt khi ngồi máy tính (frameloop demand → FPS thấp giả) / đang đoạn mở đầu
 */
function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr)
  const pc = useGame((s) => s.screen === 'pc')
  // đoạn mở đầu: vừa tải xong cảnh FPS còn thấp giả (biên dịch shader), đổi độ phân giải giữa lúc camera lia thì hình giật
  const intro = useIntro((s) => !!s.phase)
  useEffect(() => () => setDpr(MAX_DPR), [setDpr])
  if (pc || intro) return null
  return (
    <PerformanceMonitor
      factor={1}
      flipflops={3}
      onChange={({ factor }) =>
        setDpr(Math.round((MIN_DPR + (MAX_DPR - MIN_DPR) * factor) * 20) / 20)
      }
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

// Cảnh 3D bàn build (ngồi máy tính thì làm nền đứng yên quanh khung desktop)
export function Bench() {
  const pc = useGame((s) => s.screen === 'pc')
  return (
    // con trỏ mũi tên mặc định (theo body), rê vào vật bấm được thì `useHover` đổi sang bàn tay
    <Canvas
      shadows
      dpr={[1, MAX_DPR]}
      camera={{ position: [0, 14, 11], fov: 42 }}
      className="!fixed inset-0"
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
      <BenchShadows />
      {/* kéo Shift + chuột trái trượt theo mặt bàn thay vì theo màn hình */}
      <Controls />
      <PcZoom />
      {/* đoạn mở đầu người chơi lần đầu (đặt sau Controls: chạy sau WalkControls mỗi khung) */}
      <IntroCam />
      {/* tập đi lại sau đoạn mở đầu: dấu ? + bong bóng "Tương tác" ở màn hình máy tính */}
      <IntroSpots />
      <PerfProbe />
      <AdaptiveDpr />
      {pc && <PcView />}
    </Canvas>
  )
}
