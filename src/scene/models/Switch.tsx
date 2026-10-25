import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SWITCHES } from '@/data/parts'

export const MM = 1 / 19.05 // 1u = 19.05mm

// Model switch Cherry MX lấy từ file CAD (scripts/convert-switch.mjs). mm, Y = 0 ≈ mặt trên plate, gốc = tâm switch
export const SWITCH_GLB = '/models/switch.glb'
useGLTF.preload(SWITCH_GLB)

/** Kích thước switch (mm): hốc trượt đã khoét trong housing + thân stem game tự dựng */
export const SWITCH_CAD = {
  /** thành trong hốc trượt ở housing dưới */
  cavity: { halfX: 3.65, halfZ: 2.85, bottom: -3.85, top: 0.74 },
  /** thân stem: phần trượt trong hốc (file CAD chỉ có đầu stem từ 5.98 trở lên) */
  body: { halfX: 3.5, halfZ: 2.65, bottom: 0.2, top: 6.1 },
  stemTop: 9.93,
  /** 2 chân stem (leg) ở mặt trước, chạm lá đồng */
  legs: { x: 2.4, z: 2.0, bottom: -2.6 },
}

// Màu housing [trên, dưới, độ trong housing trên]
const HOUSING: Record<string, [string, string, number]> = {
  cherryBlack: ['#2a2a2e', '#2a2a2e', 1],
  cherryBrown: ['#2a2a2e', '#2a2a2e', 1],
  cherryBlue: ['#2a2a2e', '#2a2a2e', 1],
  gateronYellow: ['#e8eef3', '#2b2b30', 0.55],
  hmxWhite: ['#f2f2ee', '#f2f2ee', 1],
  wingtreeSmoke: ['#4a4a58', '#4a4a58', 0.7],
  keygeekTactile: ['#f4f4f4', '#d9cdf2', 1],
  pandaTactile: ['#f4f4f4', '#f4f4f4', 1],
  gateronSilent: ['#f7d6e2', '#f7d6e2', 0.75],
  silentTactile: ['#e3d6f7', '#e3d6f7', 0.75],
}

export function useSwitchParts() {
  const { nodes } = useGLTF(SWITCH_GLB) as unknown as { nodes: Record<string, THREE.Mesh> }
  return {
    top: nodes.top.geometry,
    bottom: nodes.bottom.geometry,
    stemTop: nodes.stemTop.geometry,
    pegs: nodes.pegs.geometry,
    pins: nodes.pins.geometry,
  }
}

interface SwitchMats {
  top: THREE.Material
  bottom: THREE.Material
  stem: THREE.MeshPhysicalMaterial
  stemLubed: THREE.MeshPhysicalMaterial
  metal: THREE.Material
}
const matCache = new Map<string, SwitchMats>()

/** Vật liệu dùng chung theo loại switch */
export function switchMaterials(type: string): SwitchMats {
  if (!matCache.has(type)) {
    const [top, bottom, op] = HOUSING[type] ?? HOUSING.gateronYellow
    const stemColor = SWITCHES[type]?.color ?? '#e8c33a'
    matCache.set(type, {
      top: new THREE.MeshPhysicalMaterial({
        color: top,
        roughness: 0.3,
        transparent: op < 1,
        opacity: op,
        clearcoat: 0.4,
      }),
      bottom: new THREE.MeshStandardMaterial({ color: bottom, roughness: 0.5 }),
      stem: new THREE.MeshPhysicalMaterial({ color: stemColor, roughness: 0.4 }),
      stemLubed: new THREE.MeshPhysicalMaterial({
        color: stemColor,
        roughness: 0.06,
        clearcoat: 1,
      }),
      metal: new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 1, roughness: 0.3 }),
    })
  }
  return matCache.get(type)!
}

const { body, legs } = SWITCH_CAD
/** thân trượt của stem (mm), dùng chung cho switch đã mở bày ở bàn lube */
export const bodyGeo = new THREE.BoxGeometry(
  body.halfX * 2,
  body.top - body.bottom,
  body.halfZ * 2,
).translate(0, (body.top + body.bottom) / 2, 0)
const legGeo = new THREE.BoxGeometry(1.1, body.bottom - legs.bottom, 0.8).translate(
  0,
  (body.bottom + legs.bottom) / 2,
  0,
)
const postGeo = new THREE.CylinderGeometry(1.4, 1.4, 3, 16).translate(0, body.bottom - 1.5, 0)

/** Housing trên (mm) */
export function SwitchTop({ type }: { type: string }) {
  const { top } = useSwitchParts()
  return <mesh geometry={top} material={switchMaterials(type).top} castShadow />
}

/** Housing dưới + chốt + chân kim loại (mm) */
export function SwitchBottom({ type, pins = true }: { type: string; pins?: boolean }) {
  const p = useSwitchParts()
  const m = switchMaterials(type)
  return (
    <group>
      <mesh geometry={p.bottom} material={m.bottom} castShadow receiveShadow />
      {pins && <mesh geometry={p.pegs} material={m.bottom} />}
      {pins && <mesh geometry={p.pins} material={m.metal} />}
    </group>
  )
}

/** Stem đầy đủ: đầu chữ thập từ CAD + thân trượt + 2 chân + chốt lò xo (mm) */
export function SwitchStem({ type, lubed = false }: { type: string; lubed?: boolean }) {
  const { stemTop } = useSwitchParts()
  const m = switchMaterials(type)
  const mat = lubed ? m.stemLubed : m.stem
  return (
    <group>
      <mesh geometry={stemTop} material={mat} castShadow />
      <mesh geometry={bodyGeo} material={mat} castShadow />
      {[-legs.x, legs.x].map((x) => (
        <mesh key={x} geometry={legGeo} material={mat} position={[x, 0, legs.z]} />
      ))}
      <mesh geometry={postGeo} material={mat} />
    </group>
  )
}

/** Switch hoàn chỉnh lắp trên plate (đơn vị u, gốc = mặt trên plate) */
export function SwitchMesh({ type }: { type: string }) {
  return (
    <group scale={MM}>
      <SwitchBottom type={type} />
      <SwitchTop type={type} />
      <SwitchStem type={type} />
    </group>
  )
}
