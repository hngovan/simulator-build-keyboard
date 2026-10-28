import { useEffect, useMemo, useState } from 'react'
import { RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '@/store'
import { Monitor, PcTower } from '../models/Computer'
import { DESK, MOUSE_PAD, PC_DESK } from './roomLayout'
import { RoomSpot } from './RoomSpot'
import { Cable, Outlet } from './Wiring'
import { topreTexture } from './topreArt'

// Bàn máy tính sát bên trái bàn build (dựng bằng code, theo kiểu PC Building Simulator): mặt gỗ óc chó + khung chân thép đen,
// hộc tủ 3 ngăn bên phải, lót chuột 90 × 40cm in hình Topre, màn hình 27" (bấm → vào máy tính), bàn phím 60% + chuột;
// thùng CPU đặt dưới gầm bàn, dây kéo lên màn hình / bàn phím. Đơn vị mét, gốc = sàn dưới tâm bàn,
// chiều dài bàn theo z, mép trước quay ra phòng (+x)

const TOP_T = 0.03
const TEX = '/textures/room'
const WALNUT = {
  map: `${TEX}/walnut_veneer_diff_1k.jpg`,
  normalMap: `${TEX}/walnut_veneer_nor_gl_1k.jpg`,
  roughnessMap: `${TEX}/walnut_veneer_rough_1k.jpg`,
}
const STEEL = new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.45, metalness: 0.7 })
const PAD = new THREE.MeshStandardMaterial({ color: '#1b1d23', roughness: 0.95 })
/** ảnh in lót chuột người dùng tự đặt (không bắt buộc) */
const PAD_IMAGE = '/textures/mousepad.png'
const CABINET = new THREE.MeshStandardMaterial({ color: '#3b3632', roughness: 0.6 })
const HANDLE = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.3, metalness: 0.8 })
/** hộc tủ dưới bàn, phía tường trái */
const CAB = { w: 0.4, z: PC_DESK.w / 2 - 0.25 }

/** Hộc tủ 3 ngăn kéo tay nắm kim loại, đứng dưới mặt bàn */
function Cabinet() {
  const h = DESK.h - TOP_T
  const d = PC_DESK.d - 0.08
  return (
    <group position={[0.02, 0, CAB.z]}>
      <mesh position-y={h / 2} material={CABINET} castShadow receiveShadow>
        <boxGeometry args={[d, h, CAB.w]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const y = 0.06 + ((h - 0.08) / 3) * (i + 0.5)
        return (
          <group key={i} position={[d / 2, y, 0]}>
            <mesh position-x={0.004} material={CABINET}>
              <boxGeometry args={[0.012, (h - 0.08) / 3 - 0.012, CAB.w - 0.02]} />
            </mesh>
            <mesh position-x={0.022} material={HANDLE}>
              <boxGeometry args={[0.012, 0.014, 0.16]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** khung chân chữ T ngược mỗi đầu bàn + xà ngang sau */
function Legs() {
  const h = DESK.h - TOP_T
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position-z={s * (PC_DESK.w / 2 - 0.08)}>
          <mesh position-y={h / 2} material={STEEL} castShadow>
            <boxGeometry args={[0.06, h, 0.05]} />
          </mesh>
          <mesh position-y={0.015} material={STEEL} castShadow>
            <boxGeometry args={[PC_DESK.d - 0.06, 0.03, 0.06]} />
          </mesh>
          <mesh position-y={h - 0.02} material={STEEL}>
            <boxGeometry args={[PC_DESK.d - 0.1, 0.04, 0.05]} />
          </mesh>
        </group>
      ))}
      <mesh position={[-PC_DESK.d / 2 + 0.08, h - 0.06, 0]} material={STEEL}>
        <boxGeometry args={[0.03, 0.08, PC_DESK.w - 0.16]} />
      </mesh>
    </group>
  )
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
      box.expandByObject(m)
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
  const walnut = useTexture(WALNUT)
  const top = useMemo(() => {
    const maps = Object.fromEntries(
      Object.entries(walnut).map(([k, t]) => {
        const c = t.clone()
        c.wrapS = c.wrapT = THREE.RepeatWrapping
        // vân gỗ chạy dọc chiều dài bàn
        c.rotation = Math.PI / 2
        if (k === 'map') c.colorSpace = THREE.SRGBColorSpace
        c.needsUpdate = true
        return [k, c]
      }),
    )
    return new THREE.MeshStandardMaterial({ ...maps, roughness: 0.6 })
  }, [walnut])
  const zoomToPC = useGame((s) => s.zoomToPC)
  const deskTop = DESK.h
  return (
    <group {...props}>
      <RoundedBox
        args={[PC_DESK.d, TOP_T, PC_DESK.w]}
        radius={0.006}
        position-y={deskTop - TOP_T / 2}
        material={top}
        castShadow
        receiveShadow
      />
      <Legs />
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
      <Cabinet />
      {/* thùng CPU dưới gầm bàn, cách chân bàn trái (z −0.52) cho khỏi đè lên chân, mặt trước quay ra phòng */}
      <group position={[-0.05, 0, -0.29]} rotation-y={Math.PI / 2}>
        <PcTower />
      </group>
      {/* dây: CPU → lỗ luồn dây mép sau bàn → chân màn hình; CPU → bàn phím; CPU → ổ điện tường */}
      <Cable
        points={[
          [-0.22, 0.3, -0.29],
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
          [-0.22, 0.25, -0.25],
          [-0.31, 0.5, -0.2],
          [-0.33, deskTop - 0.02, -0.15],
          [-0.3, deskTop + 0.008, -0.12],
          [0.0, deskTop + 0.006, -0.02],
          [0.04, deskTop + 0.012, 0.06],
        ]}
      />
      <Cable
        points={[
          [-0.22, 0.2, -0.33],
          [-0.36, 0.12, -0.4],
          [-0.383, 0.3, -0.44],
        ]}
      />
      {/* ổ cắm trên tường sau (hệ bàn: −x là tường), phích máy tính cắm ổ trên */}
      <Outlet position={[-0.403, 0.32, -0.44]} rotation-y={Math.PI / 2} />
    </group>
  )
}
