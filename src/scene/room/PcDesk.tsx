import { useEffect, useMemo, useState } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '@/store'
import { useThree } from '@react-three/fiber'
import { useSceneLoading } from '../common/loadingStore'
import { warmUp } from '../common/warmup'
import { getLayout } from '@/data/layouts'
import { DTB_MM, Y, dtbSpot } from '@/data/steps'
import { MM } from '../models/Switch'
import CASE_USB from '@/data/caseUsb.json'
import { buildKeyboardModel, caseSpec } from '@/features/apps/messenger/orderThumb'
import { Monitor, PcTower } from '../models/Computer'
import { DESK, MOUSE_PAD, PC_DESK } from './roomLayout'
import { RoomSpot } from './RoomSpot'
import { C13_LEN, Cable, Outlet, PowerInlet, USBC_PLUG, UsbCPlug, plugExit } from './Wiring'
import { topreTexture } from './topreArt'

/** 1u = 19,05mm */
const U_M = 0.01905

// Bàn máy tính sát bên trái bàn build (theo kiểu PC Building Simulator): bàn có hộc = model người dùng đưa (`DeskBody`),
// lót chuột 90 × 40cm in hình Topre, màn hình 27" (bấm → vào máy tính), bàn phím Planck + chuột;
// thùng CPU đặt dưới gầm bàn, dây kéo lên màn hình / bàn phím. Đơn vị mét, gốc = sàn dưới tâm bàn,
// chiều dài bàn theo z, mép trước quay ra phòng (+x)

/** chân thùng CPU trong ngăn kệ hở bên phải bàn (hệ bàn: z âm = tay phải người ngồi), đáy trên ván đáy kệ */
const CPU_AT: [number, number, number] = [0, 0.03, -0.475]
/** ổ cắm tường sau (hệ bàn), xoay π/2: hệ ổ (x, y, z) → hệ bàn (z, y, −x) */
const OUTLET_AT: [number, number, number] = [-0.403, 0.32, -0.44]
const PLUG_END = ((e) => [OUTLET_AT[0] + e[2], OUTLET_AT[1] + e[1], OUTLET_AT[2] - e[0]])(
  plugExit('cee'),
) as [number, number, number]
/** cổng nguồn lưng CPU (lưng ở x −0,17 hệ bàn, gần đáy), đầu C13 cắm theo +x */
const C13_AT: [number, number, number] = [-0.17, 0.1, -0.52]
const PAD = new THREE.MeshStandardMaterial({ color: '#1b1d23', roughness: 0.95 })
/** ảnh in lót chuột người dùng tự đặt (không bắt buộc) */
const PAD_IMAGE = '/textures/mousepad.png'

/**
 * Bàn có hộc "office desk" (người dùng đưa, Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân; low-poly 86KB, đơn vị riêng
 * rộng 0,33 × cao 0,19 × sâu 0,14): co giãn từng trục cho đúng PC_DESK (dài w theo z, sâu d theo x, cao bằng bàn build).
 * Mặt có ngăn kéo của model (+z) xoay ra phòng (+x)
 */
const DESK_GLB = '/models/desk/office-desk.glb'
useGLTF.preload(DESK_GLB)

function DeskBody() {
  const { scene } = useGLTF(DESK_GLB)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
    })
    copy.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    const k = [PC_DESK.w / size.x, DESK.h / size.y, PC_DESK.d / size.z]
    copy.scale.set(k[0], k[1], k[2])
    copy.position.set(
      (-(box.min.x + box.max.x) / 2) * k[0],
      -box.min.y * k[1],
      (-(box.min.z + box.max.z) / 2) * k[2],
    )
    const g = new THREE.Group()
    g.add(copy)
    // dài theo x của model → trục z của bàn, mặt trước (+z) → +x
    g.rotation.y = Math.PI / 2
    return g
  }, [scene])
  return <primitive object={model} />
}

/**
 * Model GLB người dùng đưa (Sketchfab, chưa rõ giấy phép → chỉ dùng cá nhân; `bun run convert:desk-gear`):
 * co cho cạnh ngang dài nhất = `length` (m), căn giữa, đáy ở y = 0; `hide` = tên mesh bỏ đi (lót chuột kèm theo model chuột)
 */
function DeskGear({
  url,
  length,
  hide,
  ...props
}: { url: string; length: number; hide?: RegExp } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    const box = new THREE.Box3()
    copy.updateMatrixWorld(true)
    copy.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (hide?.test(m.name) || hide?.test(m.parent?.name ?? '')) {
        m.visible = false
        return
      }
      m.castShadow = m.receiveShadow = true
      // khung bao chính xác theo đỉnh: khung có sẵn (min / max accessor) là của lưới trước khi simplify → bàn phím lơ lửng
      box.expandByObject(m, true)
    })
    const size = box.getSize(new THREE.Vector3())
    const k = length / Math.max(size.x, size.z)
    const c = box.getCenter(new THREE.Vector3())
    const g = new THREE.Group()
    copy.scale.setScalar(k)
    copy.position.set(-c.x * k, -box.min.y * k, -c.z * k)
    g.add(copy)
    return g
  }, [scene, length, hide])
  return (
    <group {...props}>
      <primitive object={model} />
    </group>
  )
}

const MOUSE_GLB = '/models/desk/deathadder.glb'
useGLTF.preload(MOUSE_GLB)

/** Lót chuột vải 90 × 40cm in hình biển hiệu Topre (ảnh mẫu người dùng, vẽ lại bằng canvas) */
function MousePad(props: JSX.IntrinsicElements['group']) {
  const { w, d } = MOUSE_PAD
  // ảnh gốc người dùng đặt ở public/textures/mousepad.png thì dùng ảnh đó, không có thì hình vẽ canvas
  const [print, setPrint] = useState<THREE.Texture>(() => topreTexture())
  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      PAD_IMAGE,
      (t) => {
        if (!alive) return t.dispose()
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        setPrint(t)
      },
      undefined,
      () => {},
    )
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => () => print.dispose(), [print])
  return (
    <group {...props}>
      <RoundedBox
        args={[d, 0.004, w]}
        radius={0.0019}
        position-y={0.002}
        material={PAD}
        receiveShadow
      />
      {/* mặt in: chiều ngang hình chạy dọc bàn, đầu hình quay vào tường (người ngồi ở phía +x) */}
      <group position-y={0.0041} rotation-y={Math.PI / 2}>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[w - 0.004, d - 0.004]} />
          <meshStandardMaterial map={print} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

/** keycap DCS bàn phím trên bàn máy tính: cả bộ đen, chữ trắng font Gorton kiểu Wyse (font của profile DCS, `legendFont.ts`) */
const DESK_CAP = { alpha: '#1c1d20', mod: '#1c1d20', legend: '#f4f4f2' }

/** chỗ đặt bàn phím trên bàn (hệ bàn), xoay π/2: hệ bàn phím (x, y, z) → hệ bàn (z, y, −x), mặt trước (+z) ra phòng */
const KB_AT: [number, number, number] = [0.11, DESK.h + 0.004, 0.06]
const toDesk = ([x, y, z]: [number, number, number]): [number, number, number] => [
  KB_AT[0] + z,
  KB_AT[1] + y,
  KB_AT[2] - x,
]

/**
 * Lỗ USB-C vách sau case Planck (hệ bàn phím, mét, theo `caseUsb.json` như bước DTB): `[x, y, z]` mép ngoài vách sau.
 * (báo lên PcDesk khi dựng xong để vẽ dây)
 */
type Port = [number, number, number]
/** daughterboard ai03 Unified C3 (như bàn build `Daughterboard.tsx`) + trụ đồng kê */
const DTB_GLB = '/models/dtb/unified-c3.glb'
useGLTF.preload(DTB_GLB)
const POST = new THREE.MeshStandardMaterial({ color: '#b8b2a8', metalness: 0.7, roughness: 0.35 })

/** Bàn phím Planck nhôm đen trên bàn máy tính: dựng bằng `buildKeyboardModel` (đơn vị u → mét), căn giữa, đáy ở y = 0 */
type DtbNodes = Record<string, THREE.Object3D>
/** bàn phím đã dựng (dùng lại khi vào lại phòng: không phải dựng / chờ lại) */
let built: Promise<{ model: THREE.Group; port: Port }> | null = null

/** Dựng 1 lần: bàn phím + DTB trong case, căn giữa, đáy ở y = 0; `port` = chỗ cắm đầu USB-C (hệ bàn phím, mét) */
function buildDeskPlanck(dtbNodes: DtbNodes) {
  built ??= buildKeyboardModel(
    {
      ...caseSpec('planckAlu', 'black'),
      keycapKit: 'dcs',
      capOf: (k) => (k.label.length > 1 || !k.label ? DESK_CAP.mod : DESK_CAP.alpha),
      legend: DESK_CAP.legend,
    },
    false,
  ).then((obj) => {
    // daughterboard trong case như lúc build: đúng chỗ `dtbSpot` (cổng USB-C sát lỗ vách sau), kê trụ nếu lỗ nằm cao
    const lay = getLayout('planck', {})
    const at = dtbSpot('planck/case', lay.width, lay.depth, lay.origin, [])
    if (at) {
      const dtb = new THREE.Group()
      dtb.position.set(at.x, at.y, at.z)
      dtb.rotation.x = at.tilt
      const pcb = new THREE.Group()
      pcb.scale.setScalar(MM)
      for (const n of ['pcb', 'usb', 'parts', 'jst']) {
        const m = dtbNodes[n] as THREE.Mesh
        pcb.add(new THREE.Mesh(m.geometry, m.material))
      }
      dtb.add(pcb)
      const post = at.y - at.floor
      if (post > 0.01)
        for (const [hx, hz] of DTB_MM.holes) {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * MM, 2.2 * MM, post, 16), POST)
          p.position.set(hx * MM, -post / 2, hz * MM)
          dtb.add(p)
        }
      obj.add(dtb)
    }
    obj.scale.setScalar(U_M)
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
    })
    const model = new THREE.Group()
    model.add(obj)
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    obj.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
    // đầu cắm ngay tâm cổng USB-C của DTB (u → mét), mặt ngoài vách sau = mép sau khung bao;
    // không có DTB thì lấy tâm lỗ vách (`caseUsb.json`)
    const hole = (CASE_USB as Record<string, { hole: number[] }>)['planck/case'].hole
    const [ux, uy] = at
      ? [at.x, at.y + DTB_MM.usb.y * MM]
      : [hole[0] * MM - lay.origin[0], Y.floorBot + hole[1] * MM]
    const port: Port = [
      ux * U_M + obj.position.x,
      uy * U_M + obj.position.y,
      -(box.max.z - box.min.z) / 2,
    ]
    return { model, port }
  })
  return built
}

/**
 * Bàn phím Planck trên bàn máy tính. Lần đầu dựng: đếm vào `useSceneLoading.pending` + biên dịch shader trước (`warmUp`) để
 * màn chờ vào game giữ tới khi bàn phím hiện đủ, không vào phòng rồi mới thấy bàn phím hiện ra
 */
function DeskPlanck({ onPort }: { onPort: (p: Port) => void }) {
  const dtbNodes = useGLTF(DTB_GLB).nodes
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const [model, setModel] = useState<THREE.Object3D | null>(null)
  useEffect(() => {
    let alive = true
    let open = true
    const done = () => {
      if (!open) return
      open = false
      useSceneLoading.setState((s) => ({ pending: s.pending - 1 }))
    }
    useSceneLoading.setState((s) => ({ pending: s.pending + 1 }))
    void buildDeskPlanck(dtbNodes)
      .then(async (b) => {
        await warmUp(gl, b.model, camera, scene)
        if (!alive) return
        onPort(b.port)
        setModel(b.model)
      })
      .finally(done)
    return () => {
      alive = false
      done()
    }
  }, [onPort, dtbNodes, gl, camera, scene])
  return (
    <group position={KB_AT} rotation-y={Math.PI / 2}>
      {model && <primitive object={model} />}
    </group>
  )
}

export function PcDesk(props: JSX.IntrinsicElements['group']) {
  const zoomToPC = useGame((s) => s.zoomToPC)
  const deskTop = DESK.h
  // lỗ USB bàn phím (hệ bàn), dây cắm vào đó
  const [port, setPort] = useState<Port | null>(null)
  const plug = port && toDesk(port)
  // đuôi chuôi đầu cắm USB-C (dây nối vào đây)
  const tail = plug ? plug[0] - USBC_PLUG.body - USBC_PLUG.relief : 0
  return (
    <group {...props}>
      <DeskBody />
      <MousePad position={[0.1, deskTop, -0.05]} />
      {/* bàn phím Planck nhôm dựng bằng code (y như đồ build trong game) + chuột Razer DeathAdder (12,7cm), mặt trước quay ra phòng */}
      <DeskPlanck onPort={setPort} />
      <DeskGear
        url={MOUSE_GLB}
        length={0.127}
        hide={/pad|light/i}
        // người ngồi ở phía +x nhìn về −x: tay phải là phía −z
        position={[0.12, deskTop + 0.004, -0.26]}
        rotation-y={Math.PI / 2}
      />
      {/* màn hình tự có viền hover + bấm để vào máy tính; RoomSpot chỉ thêm chữ gợi ý trên HUD */}
      <RoomSpot label="Dùng máy tính" onAct={zoomToPC} outline={false}>
        <group position={[-PC_DESK.d / 2 + 0.17, deskTop, 0]} rotation-y={Math.PI / 2}>
          <Monitor />
        </group>
      </RoomSpot>
      {/* thùng CPU cất trong ngăn kệ hở bên phải bàn (CPU_AT), mặt trước quay ra phòng */}
      <group position={CPU_AT} rotation-y={Math.PI / 2}>
        <PcTower />
      </group>
      {/* dây: CPU → khe sau bàn vắt qua mép sau → chân màn hình; CPU → bàn phím; CPU → ổ điện tường */}
      <Cable
        dark
        points={[
          [-0.22, 0.3, -0.475],
          [-0.3, 0.45, -0.3],
          // khe giữa bàn và tường (mép sau bàn ở x −0,35) → vắt qua mép sau → lưng cổ chân đế (đế cao 3,5cm)
          [-0.37, deskTop - 0.1, -0.14],
          [-0.37, deskTop - 0.02, -0.05],
          [-0.362, deskTop + 0.006, -0.02],
          [-0.33, deskTop + 0.004, -0.005],
          [-0.3, deskTop + 0.04, 0.005],
          [-PC_DESK.d / 2 + 0.17 - 0.04, deskTop + 0.07, 0.01],
        ]}
      />
      {/* dây bàn phím: CPU → gầm bàn sang trái → khe sau bàn vắt qua mép sau ngoài chân đế màn hình (chân đế chữ V tới z ±0,2)
          → vòng ra trước mũi chân đế → đầu cắm USB-C (`UsbCPlug`) cắm vào lỗ vách sau Planck */}
      {plug && (
        <Cable
          dark
          r={0.0025}
          points={[
            [-0.22, 0.25, -0.435],
            [-0.31, 0.5, -0.2],
            [-0.37, deskTop - 0.12, 0.12],
            [-0.37, deskTop - 0.03, 0.27],
            [-0.362, deskTop + 0.005, 0.27],
            [-0.33, deskTop + 0.003, 0.27],
            [-0.15, deskTop + 0.003, 0.24],
            [-0.06, deskTop + 0.006, plug[2] + 0.05],
            [tail - 0.035, deskTop + 0.006, plug[2] + 0.008],
            [tail - 0.008, plug[1], plug[2]],
            [tail + 0.002, plug[1], plug[2]],
          ]}
        />
      )}
      {plug && <UsbCPlug position={plug} />}
      {/* dây nguồn: đầu C13 cắm lưng CPU → thòng xuống sàn → lên phích CEE ở ổ tường */}
      <PowerInlet position={C13_AT} />
      <Cable
        dark
        r={0.0035}
        points={[
          [C13_AT[0] - C13_LEN + 0.01, C13_AT[1], C13_AT[2]],
          [C13_AT[0] - C13_LEN - 0.01, C13_AT[1], C13_AT[2]],
          [-0.33, 0.07, -0.48],
          // đuôi phích chĩa thẳng xuống: dây lên thẳng đứng đúng tâm đuôi, chui vào trong đuôi 3mm
          [PLUG_END[0] + 0.006, PLUG_END[1] - 0.08, PLUG_END[2]],
          [PLUG_END[0], PLUG_END[1] - 0.035, PLUG_END[2]],
          [PLUG_END[0], PLUG_END[1] - 0.012, PLUG_END[2]],
          [PLUG_END[0], PLUG_END[1] + 0.003, PLUG_END[2]],
        ]}
      />
      {/* ổ cắm trên tường sau (hệ bàn: −x là tường), phích máy tính cắm ổ trên */}
      <Outlet position={OUTLET_AT} rotation-y={Math.PI / 2} plug="cee" />
    </group>
  )
}
