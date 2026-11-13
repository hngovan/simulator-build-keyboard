import { useMemo } from 'react'
import { Clone, RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Dây điện (dựng bằng code) + ổ cắm tường + công tắc đèn (model), dùng chung cho đèn bàn build, máy tính. Đơn vị mét

/** chỉ dây + phích đèn bàn build là nhựa trắng; dây máy tính (màn hình, bàn phím, nguồn CPU) + đầu cắm của chúng màu đen (người dùng chọn) */
const WHITE = '#ecebe6'
const BLACK = '#16171a'
const CABLE = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.6 })
const CABLE_DARK = new THREE.MeshStandardMaterial({ color: BLACK, roughness: 0.6 })
const SWITCH_GLB = '/models/room/light-switch.glb'
/** mặt sau mặt nạ công tắc lùi sau tâm model 2,5mm: dời ra cho mặt nạ áp sát tường (+0,5mm khỏi chớp hình) */
const SWITCH_BACK = 0.003
useGLTF.preload(SWITCH_GLB)

/** Dây cáp mềm qua các điểm (m, hệ cha); `dark` = dây đen (dây máy tính), mặc định trắng (dây đèn) */
export function Cable({
  points,
  r = 0.004,
  dark = false,
}: {
  points: [number, number, number][]
  r?: number
  dark?: boolean
}) {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        48,
        r,
        6,
      ),
    [points, r],
  )
  return <mesh geometry={geo} material={dark ? CABLE_DARK : CABLE} castShadow />
}

/**
 * Model ổ cắm đôi "Electrical Wall Outlet" (sacapuntas, Sketchfab, CC BY 4.0): đơn vị file ×10 (thu 0,1 → mặt nạ 8,1 × 12,4cm),
 * tâm mặt nạ ở gốc, mặt ổ quay +z (lỗ cắm ở z +1,6mm), lưng lún sau 5,3mm; 2 ổ ở y ±2,8cm
 */
const OUTLET_GLB = '/models/room/wall-outlet.glb'
useGLTF.preload(OUTLET_GLB)
/** đẩy model ra khỏi tường: lưng mặt nạ sát mặt tường */
const OUTLET_Z = 0.0053

/** mặt lỗ cắm ổ trên (hệ `Outlet`): lỗ cắm model ở z +1,57mm (sau khi thu) */
const SOCKET: [number, number, number] = [0, 0.028, OUTLET_Z + 0.00157]

/**
 * Phích cắm (model, CC BY 4.0) cắm vào ổ trên, đuôi dây thòng xuống:
 * - `eu`: "power plug (european)" (ChoboiAssets): file ×50 (thu 0,02 → thân Ø3,7cm), chân ngang +z, tâm mặt phích (0, 0,48, 0,02),
 *   đuôi dây sau thân chếch xuống → xoay π quanh y cho chân cắm vào tường
 * - `cee`: đầu CEE 7/7 của dây nguồn "[CC0] European Power Plug" (Lara Sophie Schütt), mét, chân xếp dọc +z, tâm mặt (0, 0,018, 0),
 *   dây ra ngang (−x), node phích trong file còn xoay sẵn 15° quanh trục chân (`CEE_TILT`) → xoay π quanh y rồi −π/2 + 15° quanh trục chân:
 *   2 chân nằm ngang đúng lỗ ổ, đuôi dây thòng thẳng xuống
 * `exit` = tâm mặt đuôi phích, chỗ dây ra (hệ `Outlet`, so với mặt lỗ cắm; đo từ lưới model sau khi xoay): nối `Cable` vào đây,
 * dây tới theo phương thẳng đứng từ dưới lên
 */
const CEE_TILT = Math.PI / 12
const PLUGS = {
  eu: { url: '/models/room/power-plug-eu.glb', exit: [0, -0.0312, 0.0354] },
  cee: { url: '/models/room/power-cord-cee.glb', exit: [0, -0.0449, 0.0269] },
} as const
export type PlugKind = keyof typeof PLUGS
Object.values(PLUGS).forEach((p) => useGLTF.preload(p.url))

/** chỗ dây ra khỏi phích đang cắm ổ trên (hệ `Outlet`, m) */
export const plugExit = (kind: PlugKind): [number, number, number] =>
  SOCKET.map((v, i) => v + PLUGS[kind].exit[i]) as [number, number, number]

/** tách 1 nhánh trong model (tên khớp `re`) kèm transform thế giới của nó */
function pick(scene: THREE.Object3D, re: RegExp) {
  scene.updateMatrixWorld(true)
  let src: THREE.Object3D | undefined
  scene.traverse((o) => {
    if (!src && re.test(o.name)) src = o
  })
  const c = src!.clone(true)
  src!.matrixWorld.decompose(c.position, c.quaternion, c.scale)
  c.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = true
    // vỏ nhựa đen của model giữ nguyên (dây nguồn máy tính màu đen)
  })
  return c
}

/** phích `eu`: model gốc nhựa trắng sẵn (khớp dây trắng), chỉ bật đổ bóng */
function whitePlug(scene: THREE.Object3D) {
  const c = scene.clone(true)
  c.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })
  return c
}

function Plug({ kind }: { kind: PlugKind }) {
  const { scene } = useGLTF(PLUGS[kind].url)
  const cee = useMemo(() => (kind === 'cee' ? pick(scene, /^CEE/) : null), [scene, kind])
  const eu = useMemo(() => (kind === 'eu' ? whitePlug(scene) : null), [scene, kind])
  return (
    <group position={SOCKET}>
      {cee ? (
        <group rotation-z={-Math.PI / 2 + CEE_TILT}>
          <group rotation-y={Math.PI}>
            <group position-y={-0.018}>
              <primitive object={cee} />
            </group>
          </group>
        </group>
      ) : (
        <group rotation-y={Math.PI} scale={0.02}>
          <primitive object={eu!} position={[0, -0.48, -0.02]} />
        </group>
      )}
    </group>
  )
}

/**
 * Đầu cái IEC C13 của dây nguồn "[CC0] European Power Plug" cắm vào cổng nguồn lưng CPU: gốc = tâm mặt cắm, cắm theo +x
 * (trục +x riêng của đầu C13 trong model là hướng cắm), dây ra ở đuôi (−x, cách mặt cắm ~`C13_LEN`)
 */
export const C13_LEN = 0.07
export function PowerInlet(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(PLUGS.cee.url)
  const c13 = useMemo(() => {
    const c = pick(scene, /^IEC/)
    c.position.set(0, 0, 0)
    c.quaternion.identity()
    const box = new THREE.Box3().setFromObject(c)
    const mid = box.getCenter(new THREE.Vector3())
    c.position.set(-box.max.x, -mid.y, -mid.z)
    return c
  }, [scene])
  return (
    <group {...props}>
      <primitive object={c13} />
    </group>
  )
}

/**
 * Ổ cắm đôi gắn tường (gốc = tâm mặt ổ sát tường, mặt quay +z); `plugged` = số phích đang cắm (0–1, ổ trên),
 * `plug` = loại phích; dây nối vào `plugExit(plug)`
 */
export function Outlet({
  plugged = 1,
  plug = 'eu',
  ...props
}: { plugged?: number; plug?: PlugKind } & JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(OUTLET_GLB)
  return (
    <group {...props}>
      <Clone object={scene} position-z={OUTLET_Z} scale={0.1} castShadow receiveShadow />
      {plugged > 0 && <Plug kind={plug} />}
    </group>
  )
}

/**
 * Công tắc đèn gắn tường: model "Light Switch" (Avot, Sketchfab, CC BY 4.0; người dùng đưa, `public/models/room/light-switch.glb`,
 * texture thu 512px JPEG + meshopt). Model mét, mặt nạ 70 × 114 × 5mm, mặt trước +x → xoay cho mặt quay +z, đáy mặt nạ sát tường.
 * Gốc = tâm mặt nạ trên mặt tường
 */
export function LightSwitch(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF(SWITCH_GLB)
  return (
    <group {...props}>
      <group position-z={SWITCH_BACK} rotation-y={-Math.PI / 2}>
        <Clone object={scene} castShadow />
      </group>
    </group>
  )
}

const PLUG_SHELL = new THREE.MeshStandardMaterial({ color: BLACK, roughness: 0.55 })
const PLUG_METAL = new THREE.MeshStandardMaterial({
  color: '#c9ccd2',
  metalness: 0.9,
  roughness: 0.3,
})
/** đầu cắm USB-C (m): lưỡi kim loại 8,3 × 2,5 × 6,6mm, vỏ nhựa bọc 12 × 6,5 × 18mm, chuôi giảm gập 8mm */
export const USBC_PLUG = { tongue: 0.0066, body: 0.018, relief: 0.008 }

/**
 * Đầu cắm USB-C dựng bằng code: gốc = mép vỏ nhựa (chỗ áp vào mặt vách), lưỡi kim loại cắm theo +x vào lỗ,
 * vỏ nhựa + chuôi lùi về −x; dây nối vào đuôi chuôi ở x = −(body + relief)
 */
export function UsbCPlug(props: JSX.IntrinsicElements['group']) {
  const { tongue, body, relief } = USBC_PLUG
  return (
    <group {...props}>
      <RoundedBox
        args={[tongue + 0.001, 0.0025, 0.0083]}
        radius={0.0011}
        smoothness={3}
        position-x={(tongue - 0.001) / 2}
        material={PLUG_METAL}
      />
      <RoundedBox
        args={[body, 0.0065, 0.012]}
        radius={0.0025}
        smoothness={4}
        position-x={-body / 2}
        material={PLUG_SHELL}
        castShadow
      />
      <mesh
        position-x={-body - relief / 2}
        rotation-z={Math.PI / 2}
        material={PLUG_SHELL}
        castShadow
      >
        {/* xoay trục y → −x: đầu trên (mảnh) ở đuôi, đầu dưới (to) áp vỏ */}
        <cylinderGeometry args={[0.0026, 0.0034, relief, 16]} />
      </mesh>
    </group>
  )
}
