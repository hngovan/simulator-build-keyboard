import { useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as THREE from 'three'
import { SWITCHES } from '@/data/parts'
import { springGeometry } from './spring'

export const MM = 1 / 19.05 // 1u = 19.05mm

// Model switch Cherry MX lấy từ file CAD (scripts/convert-switch.mjs). mm, Y = 0 ≈ mặt trên plate, gốc = tâm switch
export const SWITCH_GLB = '/models/switch/switch.glb'
useGLTF.preload(SWITCH_GLB)

/** Kích thước switch (mm): hốc trượt đã khoét trong housing + thân stem game tự dựng */
export const SWITCH_CAD = {
  /** thành trong hốc trượt ở housing dưới */
  cavity: { halfX: 3.65, halfZ: 2.85, bottom: -3.85, top: 0.74 },
  /** thân stem: phần trượt trong hốc (file CAD chỉ có đầu stem từ 5.98 trở lên) */
  body: { halfX: 3.5, halfZ: 2.65, bottom: 0.2, top: 6.1 },
  stemTop: 9.93,
  /** 2 chân stem (leg) ở mặt trước, chạm lá đồng */
  legs: { x: 2.4, z: 2.0, bottom: -3.3 },
}

// Màu housing [trên, dưới, độ trong housing trên, kim tuyến]
// kim tuyến: true = chỉ housing trên; 'full' = cả housing dưới cũng trong suốt (cùng độ trong) + kim tuyến;
// 'clear' = cả housing dưới cũng trong suốt, không kim tuyến
const HOUSING: Record<string, [string, string, number, (true | 'full' | 'clear')?]> = {
  // Kailh Box: trên PC trong, dưới trắng đục (stem box theo màu switch)
  kailhBoxNavy: ['#eef3f6', '#f4f4f2', 0.35],
  kailhBoxRed: ['#eef3f6', '#f4f4f2', 0.35],
  kailhBoxBrown: ['#eef3f6', '#f4f4f2', 0.35],
  kailhBoxWhite: ['#eef3f6', '#f4f4f2', 0.35],
  kailhBoxJade: ['#eef3f6', '#f4f4f2', 0.35],
  // trên đen khói trong, dưới đen
  gateronBlackInk: ['#1a1a1e', '#1a1a1e', 0.6],
  // toàn thân kem đục (cả stem)
  nkCream: ['#ecdfc0', '#ecdfc0', 1],
  // housing full xanh Tiffany trong, stem Tiffany đục
  zealTealios: ['#3fd0c0', '#3fd0c0', 0.45, 'clear'],
  // housing kem đục, stem cam nhạt
  holyPanda: ['#efe3c8', '#efe3c8', 1],
  cherryBlack: ['#2a2a2e', '#2a2a2e', 1],
  cherryBrown: ['#2a2a2e', '#2a2a2e', 1],
  cherryBlue: ['#2a2a2e', '#2a2a2e', 1],
  gateronYellow: ['#e8eef3', '#2b2b30', 0.55],
  // housing full trắng sữa hơi trong
  gateronMilky: ['#f4f2ec', '#f4f2ec', 0.85],
  // housing full xám tro
  rubenBumblebee: ['#8a8d91', '#8a8d91', 1],
  hmxWhite: ['#f2f2ee', '#f2f2ee', 1],
  // trên trong suốt đính kim tuyến, dưới trắng đục
  hmxSnowfall: ['#f4f8fb', '#f3f1ec', 0.3, true],
  // Camellia: housing full trắng đục (id giữ wingtreeSmoke cho bản lưu cũ)
  // full tím
  hmxV2u: ['#8a4fd0', '#8a4fd0', 1],
  // trên xanh trong đính kim tuyến, dưới xanh navy
  hmxWaverider: ['#4aa8e8', '#1f2a5a', 0.4, true],
  // full trong suốt hồng + kim tuyến
  hmxSuColor: ['#ff9ec8', '#ff9ec8', 0.35, 'full'],
  // trên trắng, dưới xanh navy
  hmxXinhai: ['#f2f2ee', '#1f2a5a', 1],
  // trên vàng đậm, dưới đen
  hmxKd200: ['#d4a017', '#1e1e22', 1],
  wingtreeSmoke: ['#f3f1ec', '#f3f1ec', 1],
  // housing full đen
  cherryOrange: ['#2a2a2e', '#2a2a2e', 1],
  cherryPurple: ['#2a2a2e', '#2a2a2e', 1],
  // housing full nâu coffee
  wingtreeTorrero: ['#6f4e37', '#6f4e37', 1],
  // housing full đỏ đục
  gateronTypeR: ['#c62a2a', '#c62a2a', 1],
  // housing trắng đục
  wingtreeTactile: ['#f3f1ec', '#f3f1ec', 1],
  keygeekTactile: ['#f4f4f4', '#d9cdf2', 1],
  pandaTactile: ['#f4f4f4', '#f4f4f4', 1],
  gateronSilent: ['#f7d6e2', '#f7d6e2', 0.75],
  // housing full hồng đục
  otemuSilent: ['#f49ab9', '#f49ab9', 1],
  // V2: housing full xanh lá chuối đục
  otemuSilentV2: ['#8cc63f', '#8cc63f', 1],
  // housing trên trong suốt, dưới trắng đục
  gateronSilentTactile: ['#eef4f8', '#f3f1ec', 0.35],
  // trên nâu đậm, dưới coffee sữa
  hmxVolume0T: ['#4a2e1f', '#b08a6a', 1],
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

/**
 * Kim tuyến trong housing trong suốt: model không có UV nên rắc hạt theo toạ độ (mm) trong shader,
 * ô nào trúng hash thì phát sáng màu ánh kim + đục hẳn
 */
function addGlitter(m: THREE.MeshPhysicalMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlitter;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlitter = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlitter;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 gCell = floor(vGlitter * 2.2);
        float gHash = fract(sin(dot(gCell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        if (gHash > 0.92) {
          vec3 gTint = 0.75 + 0.25 * cos(6.2831 * (gHash * 9.0 + vec3(0.0, 0.33, 0.67)));
          totalEmissiveRadiance += gTint * 1.1;
          diffuseColor.a = 1.0;
        }`,
      )
  }
  m.customProgramCacheKey = () => 'switch-glitter'
}

/** Vật liệu dùng chung theo loại switch */
export function switchMaterials(type: string): SwitchMats {
  if (!matCache.has(type)) {
    const [top, bottom, op, glitter] = HOUSING[type] ?? HOUSING.gateronYellow
    const stemColor = SWITCHES[type]?.color ?? '#e8c33a'
    // housing trong (có thể đính kim tuyến)
    const clearMat = (color: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.3,
        transparent: op < 1,
        opacity: op,
        clearcoat: 0.4,
      })
      if (glitter && glitter !== 'clear') addGlitter(m)
      return m
    }
    const topMat = clearMat(top)
    // 'full': housing dưới cũng trong suốt + kim tuyến như housing trên
    const bottomMat =
      glitter === 'full' || glitter === 'clear'
        ? clearMat(bottom)
        : new THREE.MeshStandardMaterial({ color: bottom, roughness: 0.5 })
    matCache.set(type, {
      top: topMat,
      bottom: bottomMat,
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
/**
 * Thân stem MX (mm) theo stem thật: khối chữ nhật đặc đỡ chữ thập; dưới đáy có cột giữa (center pole, lò xo lồng quanh,
 * đầu vuốt nhọn), mặt sau (phía lá đồng, -z) có khung chân (leg): 2 càng chạy xuống quá đáy + tấm nối; 2 mặt bên có
 * thanh dẫn hướng (rail). Dùng chung cho bàn build, Shopii, bàn lube (instanced); gờ tactile thêm riêng `tactileGeo`
 */
const STEM_BODY = {
  /** cột giữa: bán kính, đáy, dài phần vuốt nhọn, bán kính đầu */
  pole: { r: 1.0, bottom: -3.7, tip: 0.9, tipR: 0.55 },
  /** khung chân mặt sau: tâm 2 càng theo x, bề ngang càng (x), dày (z), đáy tấm nối */
  leg: { x: 2.85, w: 0.75, t: 0.6, plate: -1.1 },
  /** thanh dẫn hướng 2 mặt bên: nhô ra (x), rộng (z), đáy, đỉnh */
  rail: { t: 0.35, w: 1.3, bottom: 0.7, top: 5.2 },
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z)
const legZ = -body.halfZ + STEM_BODY.leg.t / 2
export const bodyGeo = (() => {
  const { pole, leg, rail } = STEM_BODY
  const { halfX, halfZ, top, bottom } = body
  const parts: THREE.BufferGeometry[] = [
    box(halfX * 2, top - bottom, halfZ * 2, 0, (top + bottom) / 2, 0),
  ]
  // cột giữa + đầu vuốt nhọn
  const shaft = bottom - (pole.bottom + pole.tip)
  parts.push(
    new THREE.CylinderGeometry(pole.r, pole.r, shaft, 16).translate(0, bottom - shaft / 2, 0),
    new THREE.CylinderGeometry(pole.r, pole.tipR, pole.tip, 16).translate(
      0,
      pole.bottom + pole.tip / 2,
      0,
    ),
  )
  // khung chân: 2 càng xuống tới `legs.bottom` + tấm nối dưới đáy thân
  for (const s of [-1, 1])
    parts.push(box(leg.w, bottom - legs.bottom, leg.t, s * leg.x, (bottom + legs.bottom) / 2, legZ))
  parts.push(box(leg.x * 2, bottom - leg.plate, leg.t, 0, (bottom + leg.plate) / 2, legZ))
  // thanh dẫn hướng 2 mặt bên
  for (const s of [-1, 1])
    parts.push(
      box(
        rail.t,
        rail.top - rail.bottom,
        rail.w,
        s * (halfX + rail.t / 2),
        (rail.top + rail.bottom) / 2,
        0,
      ),
    )
  const g = mergeGeometries(parts)!
  for (const p of parts) p.dispose()
  return g
})()
/** gờ tactile / clicky ở đầu 2 càng chân, nhô về phía lá đồng (-z) */
const tactileGeo = (() => {
  const { leg } = STEM_BODY
  const parts = [-1, 1].map((s) =>
    box(leg.w, 0.9, 0.55, s * leg.x, legs.bottom + 0.9, legZ - leg.t / 2 - 0.27),
  )
  const g = mergeGeometries(parts)!
  for (const p of parts) p.dispose()
  return g
})()
/**
 * stem box Kailh (mm): cột vuông bo góc to bao trọn chữ thập (như stem Box thật), chữ thập thụt trong lòng hộp,
 * mép hộp cao hơn đỉnh chữ thập; lòng hộp vừa trụ stem keycap Ø5,5. Đứng trên mặt housing trên (6,31) cho khỏi xuyên
 * housing trong suốt. `floor` = đáy hốc
 */
const BOX_STEM = { outer: 7.0, wall: 0.65, r: 1.3, rIn: 0.5, bottom: 6.35, top: 10.15, floor: 7.0 }
function roundRect<T extends THREE.Path>(s: T, half: number, r: number): T {
  s.moveTo(-half + r, -half)
  s.lineTo(half - r, -half)
  s.quadraticCurveTo(half, -half, half, -half + r)
  s.lineTo(half, half - r)
  s.quadraticCurveTo(half, half, half - r, half)
  s.lineTo(-half + r, half)
  s.quadraticCurveTo(-half, half, -half, half - r)
  s.lineTo(-half, -half + r)
  s.quadraticCurveTo(-half, -half, -half + r, -half)
  return s
}
const boxStemGeos = (() => {
  const { outer, wall, r, rIn, bottom, top, floor } = BOX_STEM
  const half = outer / 2
  const ring = roundRect(new THREE.Shape(), half, r)
  ring.holes.push(roundRect(new THREE.Path(), half - wall, rIn))
  // Extrude theo +z rồi xoay cho trục đùn thành +y
  const walls = new THREE.ExtrudeGeometry(ring, { depth: top - bottom, bevelEnabled: false })
    .rotateX(-Math.PI / 2)
    .translate(0, bottom, 0)
  const base = new THREE.ExtrudeGeometry(roundRect(new THREE.Shape(), half - wall + 0.01, rIn), {
    depth: floor - bottom,
    bevelEnabled: false,
  })
    .rotateX(-Math.PI / 2)
    .translate(0, bottom, 0)
  return [walls, base]
})()

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

/**
 * Phần stem game tự dựng (file CAD chỉ có đầu chữ thập): thân + cột giữa + chân + rail (+ gờ tactile, khung box Kailh), mm.
 * Dùng chung cho bàn build và ảnh / khung xem 3D Shopii (housing trong suốt thì thấy thân stem bên trong)
 */
export function stemBodyGeos(type: string) {
  const sw = SWITCHES[type]
  return [
    bodyGeo,
    ...(sw && sw.feel !== 'linear' ? [tactileGeo] : []),
    ...(sw?.box ? boxStemGeos : []),
  ]
}

/** Stem đầy đủ: đầu chữ thập từ CAD + thân trượt + 2 chân + chốt lò xo (mm) */
export function SwitchStem({ type, lubed = false }: { type: string; lubed?: boolean }) {
  const { stemTop } = useSwitchParts()
  const m = switchMaterials(type)
  const mat = lubed ? m.stemLubed : m.stem
  return (
    <group>
      <mesh geometry={stemTop} material={mat} castShadow />
      {stemBodyGeos(type).map((g, i) => (
        <mesh key={i} geometry={g} material={mat} castShadow />
      ))}
    </group>
  )
}

/** lò xo trong switch đã đóng (mm): lồng quanh cột giữa stem, đáy trên sàn hốc housing dưới, đỉnh chạm đáy thân stem */
export const SPRING_IN = { r: 2.3, bottom: -3.6, top: 0.2, turns: 5, wire: 0.25 }
export const switchSpringGeo = springGeometry(
  SPRING_IN.r,
  SPRING_IN.top - SPRING_IN.bottom,
  SPRING_IN.turns,
  SPRING_IN.wire,
).translate(0, SPRING_IN.bottom, 0)
export const switchSpringMat = new THREE.MeshStandardMaterial({
  color: '#d6dae0',
  metalness: 1,
  roughness: 0.3,
})
/** housing trên trong suốt → nhìn thấy lò xo bên trong (housing đục thì khỏi vẽ cho nhẹ bàn phím) */
export const switchSeeThrough = (type: string) => (HOUSING[type] ?? HOUSING.gateronYellow)[2] < 1

/** Switch hoàn chỉnh lắp trên plate (đơn vị u, gốc = mặt trên plate) */
export function SwitchMesh({ type }: { type: string }) {
  return (
    <group scale={MM}>
      <SwitchBottom type={type} />
      <SwitchTop type={type} />
      <SwitchStem type={type} />
      {switchSeeThrough(type) && <mesh geometry={switchSpringGeo} material={switchSpringMat} />}
    </group>
  )
}
