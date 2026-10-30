import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { SCREW_STEPS, Y } from '@/data/steps'
import { KEYCAP_COLORS, TOOLS, screwLevel } from '@/data/parts'
import type { Key } from '@/types'
import { useGame } from '@/store'
import { isPackedBox } from '@/store/carrySlice'
import { DIPLOMA_URL, createDiploma } from './models/diplomaModel'
import { BIT_SWAP_MS, ElectricScrewdriver, ManualScrewdriver } from './models/HandTools'
import { Clickable } from './stations/StationKit'
import { DisplayKeyboard } from './models/ShelfDisplay'
import {
  CALENDAR,
  DESK,
  FLOOR_Y,
  FRONT_Z,
  M,
  DOORWAY,
  HALL,
  HALL_DOOR_Z,
  HALL_WINDOW,
  HALL_PLANT,
  RACK,
  BACK_M,
  FRONT_M,
  HALF_W,
  WALL_T,
  STORE_SHELF,
  inReach,
  PC_DESK,
  ROOM,
  ROOM_CZ,
  WINDOW,
  WORK_TABLE,
} from './room/roomLayout'
import { PcDesk } from './room/PcDesk'
import { Stool } from './room/Stool'
import { Cable, LightSwitch, Outlet, plugExit } from './room/Wiring'
import { Downlight } from './room/Downlight'
import { MetalRack, PanelDoor } from './room/HallProps'
import { ModelPainting } from './room/ModelPainting'
import { drawPhoenix } from './room/phoenixArt'
import { drawBanknote } from './room/banknoteArt'
import { drawQmk } from './room/qmkArt'
import { CanvasPainting, ImagePainting } from './room/CanvasPainting'
import { FrogPainting } from './room/FrogPainting'
import { LIT_SHADE, RoomWindow } from './room/RoomWindow'
import { WallCalendar } from './room/WallCalendar'
import { WallPoster } from './room/WallPoster'
import { DoorParcels, HeldBox, SHELF_SCALE_Y, StorageShelf } from './room/DoorParcels'
import { sitAtBench } from './room/sitAtBench'
import { useRoom } from './room/roomStore'
import { useHoverOutline } from './common/hoverOutline'
import { CuttingMat } from './common/CuttingMat'
import { grainBoxGeometry } from './materials'

// Phòng làm việc quanh bàn build. Model + texture từ Poly Haven (CC0), tải bằng `bun run fetch:room`;
// hộp đồ nghề từ Sketchfab (CC BY 4.0, xem Cài đặt → Ghi công)
const DIR = '/models/room'
const MODELS = {
  desk: `${DIR}/wooden_table_02.glb`,
  // chậu cây ZZ (jerovdl, Sketchfab, CC BY 4.0): đơn vị mét, gốc ở đáy chậu, cao 0,6m
  plant: `${DIR}/zz_plant.glb`,
  shelf: `${DIR}/Shelf_01.glb`,
  picture: `${DIR}/hanging_picture_frame_01.glb`,
  clock: `${DIR}/wall_clock.glb`,
  workTable: `${DIR}/WoodenTable_03.glb`,
  lamp: `${DIR}/desk_lamp_arm_01.glb`,
  ceilingLamp: `${DIR}/modern_ceiling_lamp_01.glb`,
}
Object.values(MODELS).forEach((url) => useGLTF.preload(url))

/**
 * Poster người dùng đưa (ảnh sản phẩm Redbubble, đã cắt lấy mặt tranh; tranh của tác giả khác → chỉ dùng cá nhân).
 * aspect = rộng / cao ảnh
 */
const POSTERS = {
  cherry: '/textures/posters/cherry-crazy.jpg',
  cherryAspect: 265 / 386,
  keyboards: '/textures/posters/keyboards-click.jpg',
  keyboardsAspect: 408 / 489,
  /** poster dán tường hành lang (ảnh người dùng đưa, cắt bỏ nền mockup) */
  caution: '/textures/posters/caution-keyboard.jpg',
  cautionAspect: 351 / 498,
  bassline: '/textures/posters/bassline-303.jpg',
  basslineAspect: 413 / 495,
}

const TEX = '/textures/room'
const FLOOR_TEX = {
  map: `${TEX}/laminate_floor_02_diff_1k.jpg`,
  normalMap: `${TEX}/laminate_floor_02_nor_gl_1k.jpg`,
  roughnessMap: `${TEX}/laminate_floor_02_rough_1k.jpg`,
}
/** tường sơn xám xanh (`WALL_COLOR`): chỉ lấy vân trát (normal / roughness), không dùng ảnh màu be */
const WALL_TEX = {
  normalMap: `${TEX}/beige_wall_001_nor_gl_1k.jpg`,
  roughnessMap: `${TEX}/beige_wall_001_rough_1k.jpg`,
}

/** độ dày mặt bàn (m), đo bằng tia chiếu từ dưới lên */
const DESK_TOP = 0.026
/** font chữ viết tay cho chữ khắc dưới bàn (Caveat, SIL OFL 1.1 — public/licenses/Caveat-OFL.txt) */
const CARVE_FONT = '/fonts/Caveat.ttf'
/**
 * kệ sách (model rộng 1m, sâu 0.257m): toạ độ dựng như kệ dựa tường sau bên phải bàn, rồi cả khối xoay 180°
 * sang tường trước (sau lưng khi ngồi bàn build) → tâm thật ở x = −SHELF_X (`ShelfWall`)
 */
const SHELF_X = (DESK.w / 2 + 0.65) * M
/**
 * Mặt các tầng kệ, đếm từ trên xuống (m so với mặt bàn, đo bằng tia chiếu): tầng 1 = hộp đồ nghề,
 * tầng 2 = chứng chỉ thợ, các tầng còn lại chưng bàn phím
 */
const SHELF_TIERS = [0.988, 0.706, 0.4247, 0.1433, -0.138, -0.4197, -0.6594].map(
  (h) => Y.table + h * M,
)
// TKL đỏ chưng trên kệ: hàng dưới WKL (space 7u, 86 phím), keycap đỏ / đen như ảnh mẫu người dùng:
// chữ + số + space đỏ, phím chức năng / điều hướng đen, hàng F xen kẽ (F1–F4 đỏ, F5–F8 đen, F9–F12 đỏ)
const RED_TKL_VARIANT = { bottom: 'wkl' }
const CAP_RED = '#8a1a24'
const CAP_BLACK = '#1e1e22'
function redBlackCaps(k: Key) {
  const f = /^F(\d+)$/.exec(k.code ?? '')
  if (f) return +f[1] >= 5 && +f[1] <= 8 ? CAP_BLACK : CAP_RED
  return k.label.length === 1 || k.code === 'Space' ? CAP_RED : CAP_BLACK
}

// Bộ vàng (theo ảnh mẫu): chữ cái + space kem, phím chức năng + F5–F8 vàng, Esc / Enter than
const CAP_CREAM = '#d9d1ad'
const CAP_YELLOW = '#f2c22e'
const CAP_COAL = '#2b2b30'
function yellowCaps(k: Key) {
  if (k.code === 'Escape' || k.code === 'Enter') return CAP_COAL
  const f = /^F(\d+)$/.exec(k.code ?? '')
  if (f) return +f[1] >= 5 && +f[1] <= 8 ? CAP_YELLOW : CAP_CREAM
  return k.label.length === 1 || k.code === 'Space' ? CAP_CREAM : CAP_YELLOW
}

/**
 * bàn phím ráp sẵn chưng trên kệ (không đổi theo đơn); x = lệch tâm kệ (m), tier = tầng (0 = tầng 1);
 * capOf: phối màu riêng từng phím (không có thì capColor + accent)
 */
const SHELF_KEYBOARDS: {
  x: number
  tier: number
  caseId: string
  color: string
  caps: string
  capColor: string
  accent: string
  capOf?: (k: Key) => string | undefined
}[] = [
  {
    x: -0.21,
    tier: 2,
    caseId: 'tofu60redux',
    color: 'pink',
    caps: 'oem',
    capColor: 'white',
    accent: 'mint',
  },
  {
    x: 0.2,
    tier: 2,
    caseId: 'repent75',
    color: 'silver',
    caps: 'xda',
    capColor: 'navy',
    accent: 'white',
  },
  {
    x: -0.2,
    tier: 3,
    caseId: 'exodus80Pc',
    color: 'frost',
    // TKL nắp PC mờ + keycap Cherry xanh lá đậm chữ trắng, 1 màu cả bộ
    caps: 'full',
    capColor: 'green',
    accent: 'green',
  },
  {
    x: 0.23,
    tier: 3,
    caseId: 'planckAlu',
    color: 'pink',
    caps: 'dsa',
    capColor: 'white',
    accent: 'pink',
  },
  {
    x: -0.2,
    tier: 4,
    caseId: 'aliceAlu',
    color: 'silver',
    caps: 'mt3',
    capColor: 'navy',
    accent: 'white',
  },
  {
    x: 0.22,
    tier: 4,
    caseId: 'cattoHHKB',
    color: 'white',
    caps: 'opk',
    capColor: 'black',
    accent: 'mint',
  },
  {
    x: -0.19,
    tier: 5,
    caseId: 'rfBruh',
    color: 'white',
    caps: 'full',
    capColor: 'white',
    accent: 'white',
    capOf: yellowCaps,
  },
  {
    x: 0.23,
    tier: 5,
    caseId: 'head4Acrylic',
    color: 'clear',
    caps: 'xda',
    capColor: 'white',
    accent: 'pink',
  },
  {
    x: -0.21,
    tier: 6,
    caseId: 'ta65',
    color: 'navy',
    caps: 'oem',
    capColor: 'white',
    accent: 'navy',
  },
  {
    x: 0.21,
    tier: 6,
    caseId: 'bakeneko60',
    color: 'black',
    caps: 'dsa',
    capColor: 'black',
    accent: 'mint',
  },
]
/** tâm chiều sâu kệ (kệ dựa tường sau) */
const SHELF_Z = ROOM.back + 0.13 * M
/** mép trước chân đỡ bàn phím: lùi vào 5cm so với mép kệ (2cm cũ nhìn như sắp rớt) */
const SHELF_FRONT = ROOM.back + 0.205 * M
/** đèn tay đòn trên bàn build (Poly Haven `desk_lamp_arm_01`, kẹp mép bàn): tâm x (m), góc xoay, ổ cắm tường sau (x, m) */
const LAMP = { x: 0.42, rot: Math.PI / 2, outlet: 0.62 }
/** chỗ dây đèn ra khỏi phích cắm ổ tường sau (hệ phòng / M, ổ không xoay) */
const LAMP_PLUG = ((e) => [LAMP.outlet + e[0], 0.3 + e[1], BACK_M + e[2]])(plugExit('eu')) as [
  number,
  number,
  number,
]
/** màu sơn tường: xám xanh dịu mắt (người dùng đổi từ be) */
const WALL_COLOR = '#8796a3'
/** ảnh vân gỗ lặp (UV trải theo toạ độ thật bằng `grainBoxGeometry`, vân chạy dọc thanh) */
const woodTex = (file: string) => {
  const t = new THREE.TextureLoader().load(`${TEX}/${file}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}
/**
 * gỗ cho viền quanh nhà (phào chân tường, khung cửa): vân sồi liền `oak_veneer_01` (cùng kiểu vân với sàn laminate, không có đường
 * ghép ván) nhuộm cho màu trung bình trùng sàn (sàn 155 / 128 / 99, sồi 161 / 126 / 87 → hệ số linear). Mặt đứng nhận ít đèn hơn
 * sàn nên tự sẫm hơn chút như ảnh mẫu (người dùng: "màu gỗ nẹp tường phải giống màu sàn nền")
 */
const FLOOR_WOOD = new THREE.MeshStandardMaterial({
  map: woodTex('oak_veneer_01_diff_1k.jpg'),
  color: new THREE.Color().setRGB(0.92, 1.04, 1.31),
  roughness: 0.6,
})
const SKIRT = FLOOR_WOOD
/** phào chân tường cao / dày (m): 5cm (cũ 9cm, người dùng: "nẹp chân tường cao quá") */
const SKIRT_H = 0.05
const SKIRT_T = 0.014
type MapSet = Partial<Record<keyof typeof FLOOR_TEX, THREE.Texture>>

/**
 * Lặp texture theo kích thước bề mặt (1 ô = tile mét); clone để mỗi bề mặt có repeat riêng.
 * `at` = góc [mép trái x, mép trước z] (đơn vị cảnh) của mặt sàn nằm ngang (plane xoay −π/2 quanh x): texture neo theo toạ độ
 * thật → các mảng sàn kề nhau (phòng / hành lang) ván nối liền qua ô cửa
 */
function useTiled(
  maps: MapSet,
  w: number,
  h: number,
  tile: number,
  at?: readonly [number, number],
) {
  const [ax, az] = at ?? [0, 0]
  const anchored = !!at
  return useMemo(() => {
    const out = {} as MapSet
    const t = tile * M
    for (const [k, tex] of Object.entries(maps) as [keyof MapSet, THREE.Texture][]) {
      const c = tex.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(w / t, h / t)
      // u = x / tile; v chạy ngược z (v = 0 ở mép trước) → v = −z / tile
      if (anchored) c.offset.set(ax / t, -az / t)
      if (k === 'map') c.colorSpace = THREE.SRGBColorSpace
      c.needsUpdate = true
      out[k] = c
    }
    return out
  }, [maps, w, h, tile, ax, az, anchored])
}

/** Model glb đặt trong hệ mét → scale về đơn vị cảnh, bật đổ bóng */
function Model({ url, ...props }: { url: string } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(url)
  const copy = useMemo(() => {
    const model = scene.clone(true)
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
    })
    return model
  }, [scene])
  return (
    <group {...props}>
      <primitive object={copy} scale={M} />
    </group>
  )
}

// Hộp đồ nghề "Old Tool Box" (Марк, Sketchfab, CC BY 4.0): hộp đóng nắp, gốc ở tâm khối,
// dài 87.9 × cao 31.8 × sâu 35 (đơn vị model) → thu về dài 0.34m
const TOOLBOX = { url: `${DIR}/old_tool_box.glb`, len: 87.88, half: 15.9, scale: 0.34 / 87.88 }
useGLTF.preload(TOOLBOX.url)

/**
 * Đặt đồ nằm sát lên bề mặt `surface`: đo khung bao của đồ, căn tâm về `at` (x, z trong hệ cha),
 * bắn tia thẳng xuống ở vài điểm dọc thân đồ, lấy điểm chạm cao nhất làm chỗ tì (quai xách, mép nắp...)
 */
function RestOn({
  surface,
  at: [x, z],
  children,
  ...props
}: { surface: RefObject<THREE.Object3D>; at: [number, number] } & JSX.IntrinsicElements['group']) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    const base = surface.current
    const parent = g?.parent
    if (!g || !base || !parent) return
    g.position.set(x, 0, z)
    parent.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(g)
    if (box.isEmpty()) return
    // căn tâm khung bao (hệ thế giới) về đúng toạ độ đặt
    const c = parent.worldToLocal(box.getCenter(new THREE.Vector3()))
    g.position.x += x - c.x
    g.position.z += z - c.z
    parent.updateWorldMatrix(true, true)
    box.setFromObject(g)
    const ray = new THREE.Raycaster()
    const down = new THREE.Vector3(0, -1, 0)
    // bắn từ trên đỉnh bề mặt (đồ lúc đầu còn nằm thấp, bắn từ đỉnh đồ sẽ xuất phát trong lòng hộp)
    const from = new THREE.Box3().setFromObject(base).max.y + 1
    let hitY = -Infinity
    for (let i = 0; i <= 6; i++)
      for (const t of [0.3, 0.7]) {
        const o = new THREE.Vector3(
          THREE.MathUtils.lerp(box.min.x, box.max.x, i / 6),
          from,
          THREE.MathUtils.lerp(box.min.z, box.max.z, t),
        )
        ray.set(o, down)
        const hit = ray.intersectObject(base, true)[0]
        if (hit) hitY = Math.max(hitY, hit.point.y)
      }
    if (hitY === -Infinity) return
    // đổi độ lệch thế giới sang hệ cha (cha có scale)
    const lowLocal = parent.worldToLocal(new THREE.Vector3(0, box.min.y, 0)).y
    const hitLocal = parent.worldToLocal(new THREE.Vector3(0, hitY, 0)).y
    g.position.y += hitLocal - lowLocal
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

/**
 * Hộp đồ nghề cất trên kệ: bản nhẹ của model gốc (giữ khối, bỏ texture vết xước / normal map,
 * sơn đỏ trơn) cho đỡ rối mắt và đỡ nặng
 */
function ShelfToolBox(props: JSX.IntrinsicElements['group']) {
  const box = useGLTF(TOOLBOX.url).scene
  const simple = useMemo(() => {
    const paint = new THREE.MeshStandardMaterial({
      color: '#9e2f27',
      roughness: 0.55,
      metalness: 0.25,
    })
    const c = box.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.material = paint
      m.castShadow = m.receiveShadow = true
    })
    return c
  }, [box])
  return (
    <group {...props}>
      <group scale={M}>
        <primitive
          object={simple}
          position-y={TOOLBOX.half * TOOLBOX.scale}
          scale={TOOLBOX.scale}
        />
      </group>
    </group>
  )
}

/**
 * Tua vít đang dùng nằm thẳng trên mặt bàn, chỉ ở bước vặn / tháo vít. Đã mua tua vít điện thì bày thêm cây còn lại
 * bên cạnh: rê chuột viền xanh, bấm để đổi sang dùng cây đó (`setScrewPick`)
 */
function DeskTools(props: JSX.IntrinsicElements['group']) {
  // mặt tì vô hình ngang mặt bàn cho RestOn bắn tia xuống
  const floor = useRef<THREE.Group>(null)
  // đang đổi đầu vít: tua vít được cầm lên (BitSwapPreview), xong mới đặt lại xuống bàn
  const held = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = performance.now() - useGame.getState().bitSwapAt
    if (held.current) held.current.visible = !(t >= 0 && t < BIT_SWAP_MS)
  })
  const owned = useGame((s) => s.tools.screw)
  const level = useGame((s) => screwLevel(s.tools, s.screwPick))
  const electric = level > 0
  // tua vít chỉ bày ở bước vặn / tháo vít; kìm cắt chỉ dùng ở bàn mod stab (có kìm riêng) nên không bày trên bàn
  const screwStep = useGame((s) => {
    const step = s.build && s.ctx?.steps[s.build.stepIdx]
    return !!step && step in SCREW_STEPS
  })
  if (!screwStep) return null
  return (
    <group {...props}>
      <group ref={held} scale={M}>
        <group ref={floor}>
          <mesh visible={false} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.6, 0.4]} />
          </mesh>
        </group>
        <RestOn key={electric ? 'e' : 'm'} surface={floor} at={[-0.06, 0]}>
          {electric ? (
            // nằm nghiêng một bên hông (mặt phẳng thân úp xuống), mũi chĩa sang trái
            <group rotation-y={Math.PI / 2} scale={3.6 / M}>
              <group rotation-x={-Math.PI / 2}>
                <ElectricScrewdriver spinKey={0} />
              </group>
            </group>
          ) : (
            // tua vít tay vẽ bằng code, nằm ngang trên bàn, mũi chĩa sang trái
            <group rotation-z={-Math.PI / 2} scale={3.6 / M}>
              <ManualScrewdriver />
            </group>
          )}
        </RestOn>
      </group>
      {owned > 0 && (
        // cây tua vít còn lại: bấm để đổi sang dùng
        <group scale={M}>
          <RestOn key={electric ? 'spare-m' : 'spare-e'} surface={floor} at={[0.12, 0.07]}>
            <Clickable active onAct={() => useGame.getState().setScrewPick(electric ? 0 : owned)}>
              {electric ? (
                <group rotation-z={-Math.PI / 2} scale={3.6 / M}>
                  <ManualScrewdriver />
                </group>
              ) : (
                <group rotation-y={Math.PI / 2} scale={3.6 / M}>
                  <group rotation-x={-Math.PI / 2}>
                    <ElectricScrewdriver spinKey={0} />
                  </group>
                </group>
              )}
            </Clickable>
          </RestOn>
        </group>
      )}
    </group>
  )
}

function Wall({
  maps,
  w,
  h = ROOM.h,
  position,
  rotationY = 0,
  skirt = true,
}: {
  maps: MapSet
  w: number
  /** cao (mặc định hết chiều cao phòng; mảng tường trên ô cửa thì thấp) */
  h?: number
  position: [number, number, number]
  rotationY?: number
  /** phào chân tường (mảng tường trên ô cửa không có) */
  skirt?: boolean
}) {
  const t = useTiled(maps, w, h, 1.5)
  const skirtGeo = useMemo(() => grainBoxGeometry(w, SKIRT_H * M, SKIRT_T * M), [w])
  // Đèn chính chiếu 1 hướng nên tường quay khác hướng bị tối / lệch màu. Giữ màu tường trước mặt
  // (sau bàn, pháp tuyến +z) làm chuẩn: các tường khác nhận đèn như thể cũng quay mặt về +z
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h)
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationY)
    const normals = g.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, n.x, n.y, n.z)
    return g
  }, [w, h, rotationY])
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh geometry={geo} receiveShadow>
        {/* tường sơn xám xanh: chỉ vân trát (normal / roughness) */}
        <meshStandardMaterial {...t} color={WALL_COLOR} />
      </mesh>
      {skirt && (
        <mesh
          geometry={skirtGeo}
          position={[0, -h / 2 + (SKIRT_H / 2) * M, (SKIRT_T / 2) * M]}
          material={SKIRT}
          receiveShadow
        />
      )}
    </group>
  )
}

useGLTF.preload(DIPLOMA_URL)

/** Khung chứng chỉ thợ treo tường sau bàn: chữ trên giấy đổi theo bậc thợ đang có */
/**
 * Chữ khắc tay ở mặt dưới mặt bàn, gần mép trước (lật camera nhìn từ dưới lên mới thấy):
 * font viết tay Caveat (OFL), cùng vân gỗ của bàn nhưng sẫm màu như rãnh khắc
 */
function DeskCarving() {
  const { scene } = useGLTF(MODELS.desk)
  const grain = useMemo(() => {
    let map: THREE.Texture | null = null
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (!map && m?.map) map = m.map
    })
    return map
  }, [scene])
  return (
    <Text
      font={CARVE_FONT}
      position={[0, Y.table - DESK_TOP * M - 0.01, (DESK.d / 2 - 0.07) * M]}
      rotation-x={Math.PI / 2}
      fontSize={2.4}
      anchorX="center"
      anchorY="middle"
    >
      gay
      <meshStandardMaterial
        map={grain}
        color="#a8754c"
        roughness={0.95}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </Text>
  )
}

/** Chứng chỉ thợ trong khung ảnh để bàn (chân chống sau có sẵn, đáy y = 0, cỡ thật 19 × 25cm) đứng trên tầng kệ */
function ShelfDiploma(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(DIPLOMA_URL)
  const rank = useGame((s) => TOOLS.cert[s.tools.cert ?? 0].name.replace('Chứng chỉ ', ''))
  const model = useMemo(() => createDiploma(scene, rank), [scene, rank])
  return (
    <group {...props}>
      <primitive object={model} scale={M} />
    </group>
  )
}

/** bàn build đang thế nào (khi đi lại trỏ vào bàn): quyết định viền sáng, chữ gợi ý, bấm trái / phải làm gì */
type BenchMode = 'empty' | 'place' | 'heldPacked' | 'busy' | 'sit' | 'packed'
function benchMode(s: ReturnType<typeof useGame.getState>): BenchMode {
  if (s.benchBox) return s.held ? 'busy' : isPackedBox(s, s.benchBox) ? 'packed' : 'sit'
  if (!s.held) return 'empty'
  return isPackedBox(s, s.held) ? 'heldPacked' : 'place'
}
/** chữ gợi ý theo trạng thái bàn: [chuột trái, chuột phải, dòng chữ không bấm được] */
const BENCH_HINT: Record<BenchMode, [string | null, string | null, string | null]> = {
  empty: [
    null,
    null,
    'Chưa có đơn hàng nào, lấy thùng đơn từ kệ cuối hành lang để tiến hành build',
  ],
  place: ['để đặt thùng đơn lên bàn build', null, null],
  heldPacked: [null, null, 'Thùng đã đóng gói: mang ra ô giao hàng trên kệ cuối hành lang'],
  busy: [null, null, 'Bàn build đang có thùng khác: cất thùng đang cầm lên kệ trước'],
  sit: ['để vào bàn build', null, null],
  packed: ['để vào bàn build', 'để cầm thùng đã đóng gói lên', null],
}

/** đẩy chữ gợi ý bàn build lên HUD (useRoom) + con trỏ; `on` = false thì xoá */
function pushHint(on: boolean) {
  const m = benchMode(useGame.getState())
  const [left, right, note] = BENCH_HINT[m]
  useRoom.setState(
    on
      ? { hover: left, hoverAlt: right, hoverNote: note, benchHover: m === 'place' }
      : { hover: null, hoverAlt: null, hoverNote: null, benchHover: false },
  )
  document.body.style.cursor = on && left ? 'var(--cursor-hand)' : ''
}

/**
 * Bàn build khi đang đi lại: hộp vô hình phủ mặt bàn chặn bấm nhầm đồ trên bàn. Trong tầm với mới tương tác:
 * - bàn trống, không cầm gì: chỉ hiện chữ "Chưa có đơn hàng nào…" (không viền, bấm không làm gì)
 * - cầm thùng đơn tới bàn trống: khối chỗ đặt trên bàn sáng viền (không viền cả bàn), bấm = đặt thùng rồi ngồi xuống
 * - bàn có thùng: viền cả bàn, chuột trái = ngồi vào build; thùng đã đóng gói thì chuột phải = cầm thùng lên
 */
function BenchSeat() {
  const walk = useGame((s) => s.walk)
  const mode = useGame(benchMode)
  const desk = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  useHoverOutline(desk, hover && walk && (mode === 'sit' || mode === 'packed'))
  const box = useMemo(() => {
    const g = new THREE.BoxGeometry(DESK.w * M, 0.4 * M, DESK.d * M)
    // không có pháp tuyến: viền hover bỏ qua hộp vô hình này
    g.deleteAttribute('normal')
    return g
  }, [])
  // trỏ vào / rời bàn: chữ gợi ý + con trỏ + khối chỗ đặt sáng viền (theo trạng thái bàn lúc đó)
  const show = (on: boolean) => {
    setHover(on)
    pushHint(on)
  }
  // trạng thái bàn đổi lúc đang trỏ (đặt thùng, cầm lên…) thì cập nhật chữ gợi ý (store ngoài React)
  useEffect(() => {
    if (hover) pushHint(true)
  }, [mode, hover])
  return (
    <>
      <group ref={desk}>
        <Model url={MODELS.desk} position-y={FLOOR_Y} />
      </group>
      {walk && (
        <mesh
          geometry={box}
          position-y={Y.table + 0.18 * M}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            if (inReach(e)) show(true)
          }}
          // đi lại gần / ra xa trong lúc đang trỏ vào bàn: bật / tắt theo tầm với
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            const ok = inReach(e)
            if (ok !== hover) show(ok)
          }}
          onPointerOut={() => show(false)}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            if (e.delta > 6 || !inReach(e)) return
            const g = useGame.getState()
            const m = benchMode(g)
            if (m === 'empty' || m === 'heldPacked' || m === 'busy') return
            // cầm thùng đơn tới bàn trống: đặt lên (chuyển sang đơn đó, đủ đồ thì vào build) rồi ngồi xuống
            if (m === 'place' && !g.placeBench()) return
            show(false)
            sitAtBench()
          }}
          // chuột phải: cầm thùng đã đóng gói lên mang đi giao
          onContextMenu={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            if (!inReach(e) || benchMode(useGame.getState()) !== 'packed') return
            useGame.getState().pickBench()
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}

/**
 * Trần sơn cùng màu + vân trát như tường. Mặt trần quay xuống nên đèn chính (chiếu từ trên) không rọi tới → tối, ngả nâu;
 * giả pháp tuyến như tường (nhận đèn như mặt quay +z) cho trần ra đúng màu sơn
 */
function Ceiling({
  maps,
  w,
  d,
  position,
}: {
  maps: MapSet
  w: number
  d: number
  position: [number, number, number]
}) {
  const t = useTiled(maps, w, d, 1.5)
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d)
    // xoay x π/2: trục y của mặt phẳng thành +z thế giới
    const normals = g.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0)
    return g
  }, [w, d])
  return (
    <mesh geometry={geo} rotation-x={Math.PI / 2} position={position}>
      <meshStandardMaterial {...t} color={WALL_COLOR} />
    </mesh>
  )
}

/** 1 mảng tường dọc trục z ở x (tường hông), từ z0 tới z1, đáy cao y0 so với sàn (m); face = hướng mặt (+1 / −1 theo x) */
function SideWall({
  maps,
  x,
  z0,
  z1,
  y0 = 0,
  y1 = ROOM.h / M,
  face,
}: {
  maps: MapSet
  x: number
  z0: number
  z1: number
  y0?: number
  y1?: number
  face: 1 | -1
}) {
  return (
    <Wall
      maps={maps}
      w={(z1 - z0) * M}
      h={(y1 - y0) * M}
      position={[x * M, FLOOR_Y + ((y0 + y1) / 2) * M, ((z0 + z1) / 2) * M]}
      rotationY={(face * Math.PI) / 2}
      skirt={y0 === 0}
    />
  )
}

/** khung ô cửa + ngưỡng cửa: cùng gỗ màu sàn với phào */
const TRIM = FLOOR_WOOD
/**
 * khung ô cửa theo ảnh mẫu người dùng (m): cột / đầu cửa bản rộng `w` ốp lên cả 2 mặt tường (lồi ra `out`), lấn vào lòng ô cửa
 * `lip` → lòng ô cửa bọc gỗ hết bề dày tường
 */
const CASING = { w: 0.09, out: 0.015, lip: 0.02 }
/** khối hộp gỗ (vân theo kích thước thật) cho nẹp cửa, mỗi cỡ dựng 1 lần */
const trimGeo = (() => {
  const cache = new Map<string, THREE.BufferGeometry>()
  return (w: number, h: number, d: number) => {
    const k = `${w},${h},${d}`
    if (!cache.has(k)) cache.set(k, grainBoxGeometry(w, h, d))
    return cache.get(k)!
  }
})()

/** Tường trái (dày 10cm) khoét ô cửa sang hành lang: mặt trong phòng + mặt phía hành lang + nẹp gỗ quanh ô cửa */
function LeftWall({ maps }: { maps: MapSet }) {
  const back = BACK_M
  const front = FRONT_M
  const { z0, z1, h } = DOORWAY
  /** tâm bề dày tường */
  const wx = -HALF_W - WALL_T / 2
  const pieces = (x: number, face: 1 | -1, from: number) => (
    <>
      <SideWall maps={maps} x={x} z0={from} z1={z0} face={face} />
      <SideWall maps={maps} x={x} z0={z1} z1={front} face={face} />
      <SideWall maps={maps} x={x} z0={z0} z1={z1} y0={h} face={face} />
    </>
  )
  // khung cửa: 2 cột + đầu cửa, xuyên hết bề dày tường + ốp lồi ra 2 mặt, lấn vào lòng ô cửa
  const { w: cw, out, lip } = CASING
  const thick = WALL_T + 2 * out
  const top = h + cw - lip
  const jamb = (z: number) => (
    <mesh
      geometry={trimGeo(thick * M, top * M, cw * M)}
      position={[wx * M, FLOOR_Y + (top / 2) * M, z * M]}
      material={TRIM}
      castShadow
      receiveShadow
    />
  )
  return (
    <>
      {pieces(-HALF_W, 1, back)}
      {pieces(HALL.x1, -1, HALL.z0)}
      {jamb(z0 + lip - cw / 2)}
      {jamb(z1 - lip + cw / 2)}
      <mesh
        geometry={trimGeo(thick * M, cw * M, (z1 - z0 - 2 * lip + 2 * cw) * M)}
        position={[wx * M, FLOOR_Y + (h - lip + cw / 2) * M, ((z0 + z1) / 2) * M]}
        material={TRIM}
        castShadow
        receiveShadow
      />
      {/* công tắc đèn mặt trong phòng, sát nẹp cửa phía tường trước, cao 1,25m */}
      <LightSwitch
        position={[-HALF_W * M, FLOOR_Y + 1.25 * M, (z1 - lip + cw + 0.08) * M]}
        rotation-y={Math.PI / 2}
        scale={M}
      />
    </>
  )
}

/** đèn âm trần hành lang (3 đèn, người dùng: "3 bóng thôi"): z (m) — gần kệ hàng cuối hành lang / trước ô cửa vào phòng / gần cửa sổ */
const HALL_LIGHTS_Z = [-1.6, (DOORWAY.z0 + DOORWAY.z1) / 2, 3.4]

/**
 * Hành lang ngoài ô cửa: sàn, trần, tường ngoài, 2 đầu (cửa chính ở đầu xa, cửa sổ rèm lá ở đầu gần);
 * hàng giao tới để cạnh cửa chính, đơn đóng gói chờ gửi + chậu cây nhỏ dựa tường ngoài cạnh cửa sổ
 */
function Hallway({ maps }: { maps: MapSet }) {
  const { x0, x1, z0, z1 } = HALL
  const w = (x1 - x0) * M
  const d = (z1 - z0) * M
  const cx = ((x0 + x1) / 2) * M
  const cz = ((z0 + z1) / 2) * M
  const floor = useTiled(useTexture(FLOOR_TEX) as MapSet, w, d, 1.2, [cx - w / 2, cz + d / 2])
  const wallY = FLOOR_Y + ROOM.h / 2
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, FLOOR_Y, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial {...floor} />
      </mesh>
      <Ceiling maps={maps} w={w} d={d} position={[cx, FLOOR_Y + ROOM.h, cz]} />
      <SideWall maps={maps} x={x0} z0={z0} z1={z1} face={1} />
      <Wall maps={maps} w={w} position={[cx, wallY, z0 * M]} />
      <Wall maps={maps} w={w} position={[cx, wallY, z1 * M]} rotationY={Math.PI} />
      {/* cuối hành lang: cửa chính ở tường bên trái, kệ sắt để hàng giao tới + ghế đôn dựa tường cuối */}
      <group position={[x0 * M, FLOOR_Y, HALL_DOOR_Z * M]} rotation-y={Math.PI / 2} scale={M}>
        <PanelDoor />
      </group>
      <group position={[RACK.x * M, FLOOR_Y, RACK.z * M]} scale={M}>
        <MetalRack />
        <DoorParcels />
      </group>
      <group position={[(RACK.x + RACK.w / 2 + 0.3) * M, FLOOR_Y, (z0 + 0.35) * M]} scale={M}>
        <Stool />
      </group>
      {/* đầu gần (cạnh chậu cây): cửa sổ rèm lá như trong phòng */}
      <group
        position={[HALL_WINDOW.x * M, FLOOR_Y + HALL_WINDOW.sill * M, z1 * M]}
        rotation-y={Math.PI}
        scale={M}
      >
        <RoomWindow size={HALL_WINDOW} />
      </group>
      <Model url={MODELS.plant} position={[HALL_PLANT.x * M, FLOOR_Y, HALL_PLANT.z * M]} />
      {/* 3 đèn âm trần dọc giữa hành lang (model MozillaHubs), 1 cái ngay trước ô cửa vào phòng */}
      {HALL_LIGHTS_Z.map((z) => (
        <Downlight key={z} height={ROOM.h / M} position={[cx, FLOOR_Y + ROOM.h, z * M]} scale={M} />
      ))}
    </group>
  )
}

export function Room() {
  const floorMaps = useTexture(FLOOR_TEX) as MapSet
  const wallMaps = useTexture(WALL_TEX) as MapSet
  // sàn phòng lấn sang trái hết bề dày tường trái: lấp khe dưới ô cửa sang hành lang (không cần thanh ngưỡng cửa), phần
  // nằm dưới tường bị 2 mặt tường che
  const floorW = ROOM.w + WALL_T * M
  const floorX = -(WALL_T * M) / 2
  const floor = useTiled(floorMaps, floorW, ROOM.d, 1.2, [floorX - floorW / 2, FRONT_Z])
  const wallY = FLOOR_Y + ROOM.h / 2
  return (
    <group>
      {/* bàn học: mặt bàn trùng mặt bàn build (BenchSeat bên dưới) */}
      <DeskCarving />
      {/* ghế đôn thấp trước bàn build + bàn máy tính */}
      <group position={[0, FLOOR_Y, 0.62 * M]} scale={M}>
        <Stool />
      </group>
      <group position={[PC_DESK.x * M, FLOOR_Y, 0.6 * M]} scale={M}>
        <Stool />
      </group>
      {/* đèn tay đòn kẹp mép sau góc phải bàn build (thay chậu cây), dây điện xuống ổ cắm tường sau */}
      <Model
        url={MODELS.lamp}
        position={[LAMP.x * M, Y.table, (-DESK.d / 2 + 0.05) * M]}
        rotation-y={LAMP.rot}
      />
      <group scale={M} position={[0, FLOOR_Y, 0]}>
        <Cable
          points={[
            [LAMP.x, DESK.h - 0.06, -DESK.d / 2 + 0.02],
            [LAMP.x + 0.03, DESK.h - 0.25, BACK_M + 0.02],
            [LAMP.x + 0.12, 0.45, BACK_M + 0.012],
            [LAMP.outlet - 0.03, 0.2, BACK_M + 0.03],
            [LAMP.outlet, LAMP_PLUG[1] - 0.04, LAMP_PLUG[2] + 0.004],
            LAMP_PLUG,
          ]}
        />
        {/* phích EU (model) cắm ổ trên, đuôi dây thòng xuống rồi vòng lên đèn */}
        <Outlet position={[LAMP.outlet, 0.3, BACK_M]} plug="eu" />
      </group>
      {/* kệ chưng bàn phím: dựng như dựa tường sau rồi xoay 180° ra tường trước (sau lưng khi ngồi bàn build) */}
      <group position-z={FRONT_Z + ROOM.back} rotation-y={Math.PI}>
        <Model url={MODELS.shelf} position={[SHELF_X, FLOOR_Y, ROOM.back]} />
        {/* tầng 1: hộp đồ nghề (tua vít + kìm nằm trên bàn, góc phải phía sau); tầng 2: chứng chỉ thợ;
          các tầng dưới: bàn phím ráp sẵn trên chân đỡ chữ A */}
        <ShelfToolBox position={[SHELF_X, SHELF_TIERS[0], SHELF_Z]} />
        {/* tầng 2: chứng chỉ dời sang trái, nhường chỗ bàn phím TKL đỏ */}
        <ShelfDiploma position={[SHELF_X - 0.24 * M, SHELF_TIERS[1], SHELF_Z]} />
        <group position={[SHELF_X + 0.12 * M, SHELF_TIERS[1], SHELF_FRONT]} scale={M}>
          <DisplayKeyboard
            caseId="exodus80"
            color="red"
            keycapKit="full"
            keycapColor="black"
            accent={KEYCAP_COLORS.black.hex}
            variant={RED_TKL_VARIANT}
            capOf={redBlackCaps}
          />
        </group>
        {SHELF_KEYBOARDS.map((k) => (
          <group
            key={k.caseId}
            position={[SHELF_X + k.x * M, SHELF_TIERS[k.tier], SHELF_FRONT]}
            scale={M}
          >
            <DisplayKeyboard
              caseId={k.caseId}
              color={k.color}
              keycapKit={k.caps}
              keycapColor={k.capColor}
              accent={KEYCAP_COLORS[k.accent].hex}
              capOf={k.capOf}
            />
          </group>
        ))}
      </group>
      <DeskTools position={[0.18 * M, Y.table, -0.17 * M]} />
      {/* màn hình (bấm để về desktop) ở sau bên trái, thùng CPU đứng mép trái bàn; cả 2 thẳng theo cạnh bàn */}
      {/* đi lại: bấm bàn build để ngồi vào làm */}
      <BenchSeat />
      {/* bàn máy tính sát bên trái bàn build (màn hình bấm → vào máy tính) */}
      <group position={[PC_DESK.x * M, FLOOR_Y, PC_DESK.z * M]} rotation-y={PC_DESK.rot} scale={M}>
        <PcDesk />
      </group>
      {/* kệ cất đơn dựa tường phải (mặt trước quay vào phòng): thùng đơn chờ làm / làm dở */}
      <group
        position={[STORE_SHELF.x * M, FLOOR_Y, STORE_SHELF.z * M]}
        rotation-y={-Math.PI / 2}
        scale={M}
      >
        <MetalRack scale-y={SHELF_SCALE_Y} />
        <StorageShelf />
      </group>
      {/* thùng đang cầm trên tay (đi lại) */}
      <HeldBox />
      {/* bàn gỗ làm việc dựa tường phải, có tấm lót cắt */}
      <Model
        url={MODELS.workTable}
        position={[WORK_TABLE.x * M, FLOOR_Y, WORK_TABLE.z * M]}
        rotation-y={-Math.PI / 2}
      />
      <CuttingMat
        w={0.36 * M}
        d={0.6 * M}
        fit="stretch"
        position={[WORK_TABLE.x * M, FLOOR_Y + WORK_TABLE.h * M + 0.02, WORK_TABLE.z * M]}
      />
      {/* cửa sổ lớn rèm lá phía trên bàn máy tính: lá gần khép, ít nắng lọt qua khe */}
      <group position={[WINDOW.x * M, FLOOR_Y + WINDOW.sill * M, ROOM.back]} scale={M}>
        {/* quay mặt về phía đèn chính nên bị rọi sáng: tối bớt cho cùng màu cửa sổ hành lang */}
        <RoomWindow shade={LIT_SHADE} />
      </group>
      {/* tranh "Ếch ngồi đáy giếng" ký tên keeb, tường sau bên phải lịch */}
      <group position={[1.15 * M, FLOOR_Y + 1.55 * M, ROOM.back]} scale={M}>
        <FrogPainting />
      </group>
      {/* tờ "300k" đóng khung (tiền meme, vẽ canvas), tường sau góc phải */}
      <CanvasPainting
        draw={drawBanknote}
        px={840}
        py={400}
        w={0.46}
        h={0.22}
        mat={0.05}
        frame="#b08a3e"
        metal
        position={[1.95 * M, FLOOR_Y + 1.6 * M, ROOM.back]}
        scale={M}
      />
      {/* tranh graffiti "QMK" kiểu bàn phím (vẽ canvas, ký keeb), tường trái góc cạnh bàn máy tính */}
      <CanvasPainting
        draw={drawQmk}
        px={900}
        py={560}
        w={0.8}
        h={0.5}
        mat={0}
        frame="#18181c"
        position={[-HALF_W * M, FLOOR_Y + 1.6 * M, ((BACK_M + DOORWAY.z0) / 2) * M]}
        rotation-y={Math.PI / 2}
        scale={M}
      />
      {/* lịch lớn trên tường sau, phía trên bàn build */}
      <group position={[0, FLOOR_Y + CALENDAR.y * M, ROOM.back + 0.01 * M]} scale={M}>
        <WallCalendar />
      </group>
      <Model url={MODELS.ceilingLamp} position={[0.1 * M, FLOOR_Y + (2.05 - 0.22) * M, ROOM_CZ]} />

      <mesh rotation-x={-Math.PI / 2} position={[floorX, FLOOR_Y, ROOM_CZ]} receiveShadow>
        <planeGeometry args={[floorW, ROOM.d]} />
        <meshStandardMaterial {...floor} />
      </mesh>
      <Wall maps={wallMaps} w={ROOM.w} position={[0, wallY, ROOM.back]} />
      {/* chứng chỉ thợ treo tường sau bàn, phía trên khoảng giữa đèn và hộp đồ nghề (rộng 40cm) */}
      <Wall maps={wallMaps} w={ROOM.w} position={[0, wallY, FRONT_Z]} rotationY={Math.PI} />
      {/* cặp poster bàn phím (ảnh người dùng đưa) giữa tường trước, sau lưng khi ngồi bàn build */}
      <ImagePainting
        url={POSTERS.cherry}
        w={0.4}
        h={0.4 / POSTERS.cherryAspect}
        mat={0.05}
        frame="#18181c"
        position={[-0.36 * M, FLOOR_Y + 1.5 * M, FRONT_Z]}
        rotation-y={Math.PI}
        scale={M}
      />
      <ImagePainting
        url={POSTERS.keyboards}
        w={0.45}
        h={0.45 / POSTERS.keyboardsAspect}
        mat={0}
        frame="#c9a77c"
        position={[0.36 * M, FLOOR_Y + 1.5 * M, FRONT_Z]}
        rotation-y={Math.PI}
        scale={M}
      />
      {/* tranh và đồng hồ treo ở tường sau lưng người chơi */}
      <Model
        url={MODELS.picture}
        position={[1.95 * M, FLOOR_Y + 1.5 * M, FRONT_Z - 0.03 * M]}
        rotation-y={Math.PI}
      />
      <Model
        url={MODELS.clock}
        position={[1.15 * M, FLOOR_Y + 1.75 * M, FRONT_Z - 0.03 * M]}
        rotation-y={Math.PI}
      />
      {/* tường trái có ô cửa ra hành lang ngay cạnh bàn máy tính */}
      <LeftWall maps={wallMaps} />
      <Hallway maps={wallMaps} />
      <Wall
        maps={wallMaps}
        w={ROOM.d}
        position={[ROOM.w / 2, wallY, ROOM_CZ]}
        rotationY={-Math.PI / 2}
      />
      {/* tranh treo tường hông + hành lang (khung Poly Haven CC0, `ModelPainting`) */}
      <ModelPainting
        frame="hanging02"
        // tường ngoài hành lang, đối diện ô cửa
        position={[HALL.x0 * M, FLOOR_Y + 1.5 * M, ((DOORWAY.z0 + DOORWAY.z1) / 2) * M]}
        rotation-y={Math.PI / 2}
        scale={M}
      />
      {/* hành lang: 2 poster giấy dán thẳng lên tường (không khung) thay tranh khung oval */}
      <WallPoster
        url={POSTERS.caution}
        w={0.42}
        h={0.42 / POSTERS.cautionAspect}
        // tường hành lang phía phòng, giữa đường ra cửa chính
        position={[HALL.x1 * M, FLOOR_Y + 1.5 * M, -1.6 * M]}
        rotation-y={-Math.PI / 2}
        scale={M}
      />
      <WallPoster
        url={POSTERS.bassline}
        w={0.45}
        h={0.45 / POSTERS.basslineAspect}
        // tường ngoài hành lang, giữa cửa chính và tranh đối diện ô cửa
        position={[HALL.x0 * M, FLOOR_Y + 1.5 * M, -0.7 * M]}
        rotation-y={Math.PI / 2}
        scale={M}
      />
      {/* tường phải: "Phượng hoàng tái sinh" (tự vẽ, ký keeb) khung mạ vàng trên bàn gỗ */}
      <ModelPainting
        frame="fancy02"
        draw={drawPhoenix}
        position={[HALF_W * M, FLOOR_Y + 1.62 * M, WORK_TABLE.z * M]}
        rotation-y={-Math.PI / 2}
        scale={M}
      />
      {/* trần */}
      <Ceiling maps={wallMaps} w={ROOM.w} d={ROOM.d} position={[0, FLOOR_Y + ROOM.h, ROOM_CZ]} />
    </group>
  )
}
