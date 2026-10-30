import { useMemo } from 'react'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Dây điện (dựng bằng code) + ổ cắm tường + công tắc đèn (model), dùng chung cho đèn bàn build, máy tính. Đơn vị mét

const CABLE = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 })
const SWITCH_GLB = '/models/room/light-switch.glb'
/** mặt sau mặt nạ công tắc lùi sau tâm model 2,5mm: dời ra cho mặt nạ áp sát tường (+0,5mm khỏi chớp hình) */
const SWITCH_BACK = 0.003
useGLTF.preload(SWITCH_GLB)

/** Dây cáp mềm qua các điểm (m, hệ cha) */
export function Cable({ points, r = 0.004 }: { points: [number, number, number][]; r?: number }) {
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
  return <mesh geometry={geo} material={CABLE} castShadow />
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
 *   dây ra ngang (−x) → xoay π quanh y rồi −π/2 quanh trục chân cho dây thòng xuống
 * `exit` = chỗ dây ra khỏi phích (hệ `Outlet`, so với mặt lỗ cắm): nối `Cable` vào đây
 */
const PLUGS = {
  eu: { url: '/models/room/power-plug-eu.glb', exit: [0, -0.0312, 0.0354] },
  cee: { url: '/models/room/power-cord-cee.glb', exit: [-0.0125, -0.0462, 0.0263] },
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
    if ((o as THREE.Mesh).isMesh) o.castShadow = true
  })
  return c
}

/**
 * phích đen cho khớp màu dây (model gốc nhựa trắng, 1 vật liệu texture chung cả chân): nhân màu tối lên texture,
 * chân cắm khuất trong ổ nên tối theo cũng không lộ
 */
function blackPlug(scene: THREE.Object3D) {
  const c = scene.clone(true)
  c.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = true
    const mat = (m.material as THREE.MeshStandardMaterial).clone()
    mat.color.set('#262626')
    m.material = mat
  })
  return c
}

function Plug({ kind }: { kind: PlugKind }) {
  const { scene } = useGLTF(PLUGS[kind].url)
  const cee = useMemo(() => (kind === 'cee' ? pick(scene, /^CEE/) : null), [scene, kind])
  const eu = useMemo(() => (kind === 'eu' ? blackPlug(scene) : null), [scene, kind])
  return (
    <group position={SOCKET}>
      {cee ? (
        <group rotation-z={-Math.PI / 2}>
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
