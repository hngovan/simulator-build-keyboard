import { useEffect, useMemo, useState } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '@/store'
import { Monitor, PcTower } from '../models/Computer'
import { DESK, MOUSE_PAD, PC_DESK } from './roomLayout'
import { RoomSpot } from './RoomSpot'
import { C13_LEN, Cable, Outlet, PowerInlet, plugExit } from './Wiring'
import { topreTexture } from './topreArt'

// Bàn máy tính sát bên trái bàn build (theo kiểu PC Building Simulator): bàn có hộc = model người dùng đưa (`DeskBody`),
// lót chuột 90 × 40cm in hình Topre, màn hình 27" (bấm → vào máy tính), bàn phím 60% + chuột;
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

const KEYBOARD_GLB = '/models/desk/realforce-87u.glb'
const MOUSE_GLB = '/models/desk/deathadder.glb'
useGLTF.preload(KEYBOARD_GLB)
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

export function PcDesk(props: JSX.IntrinsicElements['group']) {
  const zoomToPC = useGame((s) => s.zoomToPC)
  const deskTop = DESK.h
  return (
    <group {...props}>
      <DeskBody />
      <MousePad position={[0.1, deskTop, -0.05]} />
      {/* bàn phím Topre Realforce 87U (TKL dài 36,5cm) + chuột Razer DeathAdder (12,7cm), mặt trước quay ra phòng */}
      <DeskGear
        url={KEYBOARD_GLB}
        length={0.365}
        position={[0.11, deskTop + 0.004, 0.06]}
        rotation-y={Math.PI / 2}
      />
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
      {/* dây: CPU → lỗ luồn dây mép sau bàn → chân màn hình; CPU → bàn phím; CPU → ổ điện tường */}
      <Cable
        points={[
          [-0.22, 0.3, -0.475],
          [-0.3, 0.45, -0.3],
          [-0.33, deskTop - 0.05, -0.12],
          [-0.33, deskTop + 0.01, -0.05],
          [-0.26, deskTop + 0.02, 0],
          [-PC_DESK.d / 2 + 0.17 - 0.04, deskTop + 0.06, 0.01],
        ]}
      />
      <Cable
        r={0.0025}
        points={[
          [-0.22, 0.25, -0.435],
          [-0.31, 0.5, -0.2],
          [-0.33, deskTop - 0.02, -0.15],
          [-0.3, deskTop + 0.008, -0.12],
          [0.0, deskTop + 0.006, -0.02],
          [0.04, deskTop + 0.012, 0.06],
        ]}
      />
      {/* dây nguồn: đầu C13 cắm lưng CPU → thòng xuống sàn → lên phích CEE ở ổ tường */}
      <PowerInlet position={C13_AT} />
      <Cable
        r={0.0035}
        points={[
          [C13_AT[0] - C13_LEN + 0.01, C13_AT[1], C13_AT[2]],
          [C13_AT[0] - C13_LEN - 0.01, C13_AT[1], C13_AT[2]],
          [-0.33, 0.07, -0.48],
          [PLUG_END[0] + 0.01, PLUG_END[1] - 0.06, PLUG_END[2] + 0.005],
          [PLUG_END[0] + 0.004, PLUG_END[1] - 0.025, PLUG_END[2] + 0.002],
          PLUG_END,
        ]}
      />
      {/* ổ cắm trên tường sau (hệ bàn: −x là tường), phích máy tính cắm ổ trên */}
      <Outlet position={OUTLET_AT} rotation-y={Math.PI / 2} plug="cee" />
    </group>
  )
}
