import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { Y } from '@/data/steps'
import { KEYCAP_COLORS, TOOLS } from '@/data/parts'
import { useGame } from '@/store'
import { MM } from './models/Switch'
import { DIPLOMA_URL, createDiploma } from './models/diplomaModel'
import { ElectricScrewdriver } from './models/HandTools'
import { Monitor, PcTower } from './models/Computer'
import { MONITOR_AT, MONITOR_ROT } from './models/computerLayout'
import { DisplayKeyboard } from './models/ShelfDisplay'
import { Clipper } from './models/ModTools'

// Phòng làm việc quanh bàn build. Model + texture từ Poly Haven (CC0), tải bằng `bun run fetch:room`;
// hộp đồ nghề từ Sketchfab (CC BY 4.0, xem Cài đặt → Ghi công)
const DIR = '/models/room'
const MODELS = {
  desk: `${DIR}/wooden_table_02.glb`,
  plant: `${DIR}/potted_plant_04.glb`,
  shelf: `${DIR}/Shelf_01.glb`,
  screwdriver: `${DIR}/screwdriver.glb`,
  chair: `${DIR}/painted_wooden_chair_01.glb`,
  picture: `${DIR}/hanging_picture_frame_01.glb`,
  clock: `${DIR}/wall_clock.glb`,
}
Object.values(MODELS).forEach((url) => useGLTF.preload(url))

const TEX = '/textures/room'
const FLOOR_TEX = {
  map: `${TEX}/laminate_floor_02_diff_1k.jpg`,
  normalMap: `${TEX}/laminate_floor_02_nor_gl_1k.jpg`,
  roughnessMap: `${TEX}/laminate_floor_02_rough_1k.jpg`,
}
const WALL_TEX = {
  map: `${TEX}/beige_wall_001_diff_1k.jpg`,
  normalMap: `${TEX}/beige_wall_001_nor_gl_1k.jpg`,
  roughnessMap: `${TEX}/beige_wall_001_rough_1k.jpg`,
}

/** 1 mét theo đơn vị cảnh (u = 19.05mm); model Poly Haven dùng mét */
const M = 1000 * MM
// Kích thước model (m), đo từ file glb
const DESK = { w: 1.134, d: 0.706, h: 0.799 }
/** độ dày mặt bàn (m), đo bằng tia chiếu từ dưới lên */
const DESK_TOP = 0.026
/** font chữ viết tay cho chữ khắc dưới bàn (Caveat, SIL OFL 1.1 — public/licenses/Caveat-OFL.txt) */
const CARVE_FONT = '/fonts/Caveat.ttf'
const FLOOR_Y = Y.table - DESK.h * M
/** kệ sách bên phải bàn (model rộng 1m, sâu 0.257m) */
const SHELF_X = (DESK.w / 2 + 0.65) * M
/**
 * Mặt các tầng kệ, đếm từ trên xuống (m so với mặt bàn, đo bằng tia chiếu): tầng 1 = hộp đồ nghề,
 * tầng 2 = chứng chỉ thợ, các tầng còn lại chưng bàn phím
 */
const SHELF_TIERS = [0.988, 0.706, 0.4247, 0.1433, -0.138, -0.4197, -0.6594].map(
  (h) => Y.table + h * M,
)
/** bàn phím ráp sẵn chưng trên kệ (không đổi theo đơn); x = lệch tâm kệ (m), tier = tầng (0 = tầng 1) */
const SHELF_KEYBOARDS = [
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
    caseId: 'exodus80',
    color: 'black',
    caps: 'mt3',
    capColor: 'white',
    accent: 'navy',
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
    caps: 'asa',
    capColor: 'mint',
    accent: 'white',
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
// Phòng 3.6m × 3.6m, cao 2.6m; tường sau sát mép sau bàn
const ROOM = { w: 3.6 * M, d: 3.6 * M, h: 2.6 * M, back: -(DESK.d / 2 + 0.05) * M }
const ROOM_CZ = ROOM.back + ROOM.d / 2
/** tâm chiều sâu kệ (kệ dựa tường sau) */
const SHELF_Z = ROOM.back + 0.13 * M
/** mép trước kệ lùi vào 2cm: chỗ đặt mép trước chân đỡ bàn phím */
const SHELF_FRONT = ROOM.back + 0.235 * M
const FRONT_Z = ROOM.back + ROOM.d
/** Vùng tâm camera được kéo tới: trong 4 bức tường, chừa 0.2m */
const PAD = 0.2 * M
export const ROOM_BOUNDS = {
  minX: -ROOM.w / 2 + PAD,
  maxX: ROOM.w / 2 - PAD,
  minZ: ROOM.back + PAD,
  maxZ: FRONT_Z - PAD,
}

type MapSet = Record<keyof typeof FLOOR_TEX, THREE.Texture>

/** Lặp texture theo kích thước bề mặt (1 ô = tile mét); clone để mỗi bề mặt có repeat riêng */
function useTiled(maps: MapSet, w: number, h: number, tile: number) {
  return useMemo(() => {
    const out = {} as MapSet
    for (const [k, t] of Object.entries(maps) as [keyof MapSet, THREE.Texture][]) {
      const c = t.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(w / (tile * M), h / (tile * M))
      if (k === 'map') c.colorSpace = THREE.SRGBColorSpace
      c.needsUpdate = true
      out[k] = c
    }
    return out
  }, [maps, w, h, tile])
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

/** Tua vít (điện nếu đã mua, không thì tay) + kìm cắt (nếu đã mua) nằm thẳng trên mặt bàn */
function DeskTools(props: JSX.IntrinsicElements['group']) {
  const screwdriver = useGLTF(MODELS.screwdriver).scene
  // mặt tì vô hình ngang mặt bàn cho RestOn bắn tia xuống
  const floor = useRef<THREE.Group>(null)
  useMemo(
    () =>
      screwdriver.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
      }),
    [screwdriver],
  )
  const electric = useGame((s) => s.tools.screw > 0)
  const hasClipper = useGame((s) => !TOOLS.clipper[s.tools.clipper].none)
  return (
    <group {...props}>
      <group scale={M}>
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
            <primitive object={screwdriver} rotation={[0, 0, Math.PI / 2]} />
          )}
        </RestOn>
        {hasClipper && (
          <RestOn surface={floor} at={[0.08, 0]}>
            {/* kìm nhỏ lại 1 nửa (cũ 0.075) cho khỏi chiếm chỗ cạnh bàn hàn */}
            <group scale={0.0375}>
              <Clipper />
            </group>
          </RestOn>
        )}
      </group>
    </group>
  )
}

function Wall({
  maps,
  w,
  position,
  rotationY = 0,
}: {
  maps: MapSet
  w: number
  position: [number, number, number]
  rotationY?: number
}) {
  const t = useTiled(maps, w, ROOM.h, 1.5)
  // Đèn chính chiếu 1 hướng nên tường quay khác hướng bị tối / lệch màu. Giữ màu tường trước mặt
  // (sau bàn, pháp tuyến +z) làm chuẩn: các tường khác nhận đèn như thể cũng quay mặt về +z
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, ROOM.h)
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationY)
    const normals = g.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) normals.setXYZ(i, n.x, n.y, n.z)
    return g
  }, [w, rotationY])
  return (
    <mesh geometry={geo} position={position} rotation-y={rotationY} receiveShadow>
      <meshStandardMaterial {...t} />
    </mesh>
  )
}

/** Cửa ra vào trên bức tường sau lưng người chơi, nhìn từ bên trong phòng. */
function Door() {
  const w = 0.9 * M
  const h = 2.1 * M
  const z = FRONT_Z - 0.08
  const frame = '#eee7d9'
  return (
    <group position={[0, FLOOR_Y, z]}>
      <mesh position-y={h / 2} castShadow>
        <boxGeometry args={[w, h, 0.1 * M]} />
        <meshStandardMaterial color="#826248" roughness={0.76} />
      </mesh>
      {[w * -0.33, 0, w * 0.33].map((x) => (
        <mesh key={x} position={[x, h * 0.5, -0.06 * M]}>
          <boxGeometry args={[0.018 * M, h * 0.88, 0.012 * M]} />
          <meshStandardMaterial color="#6c4d36" roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 + 0.035 * M), h / 2, -0.07 * M]}>
          <boxGeometry args={[0.07 * M, h + 0.08 * M, 0.08 * M]} />
          <meshStandardMaterial color={frame} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.04 * M, -0.07 * M]}>
        <boxGeometry args={[w + 0.14 * M, 0.08 * M, 0.08 * M]} />
        <meshStandardMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[w * 0.35, h * 0.48, -0.12 * M]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035 * M, 0.035 * M, 0.025 * M, 16]} />
        <meshStandardMaterial color="#d2b06f" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.008 * M, -0.19 * M]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.1 * M, 0.52 * M]} />
        <meshStandardMaterial color="#48413a" roughness={1} />
      </mesh>
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

export function Room() {
  const floorMaps = useTexture(FLOOR_TEX) as MapSet
  const wallMaps = useTexture(WALL_TEX) as MapSet
  const floor = useTiled(floorMaps, ROOM.w, ROOM.d, 1.2)
  const wallY = FLOOR_Y + ROOM.h / 2
  return (
    <group>
      {/* bàn học: mặt bàn trùng mặt bàn build */}
      <Model url={MODELS.desk} position-y={FLOOR_Y} />
      <DeskCarving />
      <Model url={MODELS.chair} position={[0, FLOOR_Y, 0.85 * M]} rotation-y={Math.PI} />
      {/* cây nhỏ góc phải (đã bỏ đèn bàn) */}
      <Model url={MODELS.plant} position={[0.45 * M, Y.table, -0.22 * M]} />
      {/* kệ sách đứng sát tường, bên phải bàn */}
      <Model url={MODELS.shelf} position={[SHELF_X, FLOOR_Y, ROOM.back]} />
      {/* tầng 1: hộp đồ nghề (tua vít + kìm nằm trên bàn, góc phải phía sau); tầng 2: chứng chỉ thợ;
          các tầng dưới: bàn phím ráp sẵn trên chân đỡ chữ A */}
      <ShelfToolBox position={[SHELF_X, SHELF_TIERS[0], SHELF_Z]} />
      <ShelfDiploma position={[SHELF_X, SHELF_TIERS[1], SHELF_Z]} />
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
          />
        </group>
      ))}
      <DeskTools position={[0.18 * M, Y.table, -0.17 * M]} />
      {/* màn hình (bấm để về desktop) ở sau bên trái, thùng CPU đứng mép trái bàn; cả 2 thẳng theo cạnh bàn */}
      <group position={MONITOR_AT} rotation-y={MONITOR_ROT} scale={M}>
        <Monitor />
      </group>
      <group position={[-0.45 * M, Y.table, -0.08 * M]} scale={M}>
        <PcTower />
      </group>

      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, ROOM_CZ]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial {...floor} />
      </mesh>
      <Wall maps={wallMaps} w={ROOM.w} position={[0, wallY, ROOM.back]} />
      {/* chứng chỉ thợ treo tường sau bàn, phía trên khoảng giữa đèn và hộp đồ nghề (rộng 40cm) */}
      <Wall maps={wallMaps} w={ROOM.w} position={[0, wallY, FRONT_Z]} rotationY={Math.PI} />
      <Door />
      {/* tranh và đồng hồ treo ở tường sau lưng người chơi */}
      <Model
        url={MODELS.picture}
        position={[1.2 * M, FLOOR_Y + 1.5 * M, FRONT_Z - 0.03 * M]}
        rotation-y={Math.PI}
      />
      <Model
        url={MODELS.clock}
        position={[-1.2 * M, FLOOR_Y + 1.75 * M, FRONT_Z - 0.03 * M]}
        rotation-y={Math.PI}
      />
      <Wall
        maps={wallMaps}
        w={ROOM.d}
        position={[-ROOM.w / 2, wallY, ROOM_CZ]}
        rotationY={Math.PI / 2}
      />
      <Wall
        maps={wallMaps}
        w={ROOM.d}
        position={[ROOM.w / 2, wallY, ROOM_CZ]}
        rotationY={-Math.PI / 2}
      />
      {/* tranh treo ở hai tường hông */}
      <Model
        url={MODELS.picture}
        position={[-ROOM.w / 2 + 0.03 * M, FLOOR_Y + 1.5 * M, ROOM_CZ - 0.5 * M]}
        rotation-y={Math.PI / 2}
      />
      <Model
        url={MODELS.picture}
        position={[ROOM.w / 2 - 0.03 * M, FLOOR_Y + 1.5 * M, ROOM_CZ + 0.5 * M]}
        rotation-y={-Math.PI / 2}
      />
      {/* trần */}
      <mesh rotation-x={Math.PI / 2} position={[0, FLOOR_Y + ROOM.h, ROOM_CZ]}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial color="#efeae2" roughness={1} />
      </mesh>
    </group>
  )
}
