import { useGLTF } from '@react-three/drei'
import type * as THREE from 'three'
import { STABS } from '@/data/parts'
import stabModel from '@/data/stabModel.json'
import { MM } from './Switch'
import { WireCoating } from './ModTools'

// Model stab lấy từ file CAD (scripts/convert-stab.mjs). Đơn vị mm, gốc = mặt trên PCB
export const STAB_GLB = '/models/stab.glb'
useGLTF.preload(STAB_GLB)
/** housing riêng theo kiểu lắp (scripts/convert-stab-variants.mjs, cùng hệ mm với stab.glb); screw-in dùng CAD gốc */
export const HOUSING_GLB = {
  clip: '/models/stab-clip.glb',
  plate: '/models/stab-plate.glb',
} as const
Object.values(HOUSING_GLB).forEach((url) => useGLTF.preload(url))

/**
 * Dời dây (mm, [y, z]) cho khớp rãnh giữ dây của housing riêng: plate-mount (model Sketchfab) có rãnh thấp hơn
 * ~1.9mm và gần slider hơn ~2.3mm so với dây CAD screw-in (đo bằng ảnh nhìn ngang housing + dây)
 */
export const WIRE_SEAT: Partial<Record<'clip' | 'screw' | 'plate', [number, number]>> = {
  plate: [-1.86, -2.28],
}

/** Kích thước đọc từ model CAD (mm) */
export const CAD = {
  housingTop: 7.15,
  /** nửa bề rộng hốc slider trong housing (thành trong ở x = ±2.37) */
  cavityHalfW: 2.37,
  /** thân slider (phần trượt trong housing) cao tới 7.2mm, phía trên là chữ thập cắm keycap */
  stem: { halfW: 2.2, halfD: 2.84, top: 10.76, bodyTop: 7.2 },
  /** tâm lỗ cắm dây trên slider (lỗ xuyên theo trục z) */
  wireHoleY: 1.62,
  wireR: 0.8,
}

/** Khoảng cách tâm stab → tâm slider (mm) của 2 dây có sẵn trong CAD */
const SPANS = { 225: stabModel.spans['2.25u'], 625: stabModel.spans['6.25u'] }

function useStabParts() {
  const { nodes } = useGLTF(STAB_GLB) as unknown as { nodes: Record<string, THREE.Mesh> }
  return {
    housing: nodes.housing.geometry,
    stem: nodes.stem.geometry,
    wire225: nodes.wire225.geometry,
    wire625: nodes.wire625.geometry,
  }
}

const lubedMat = (on: boolean) =>
  on
    ? { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }
    : { roughness: 0.5, clearcoat: 0 }

/** Housing (hệ mm, gốc = tâm slider) */
export function StabHousingCad({ model, lubed = false }: { model: string; lubed?: boolean }) {
  const { housing } = useStabParts()
  // clip-in: chân gài xuyên PCB, không vít; plate-mount: kẹp vào plate, không xuyên PCB
  const clip = useGLTF(HOUSING_GLB.clip) as unknown as { nodes: Record<string, THREE.Mesh> }
  const plate = useGLTF(HOUSING_GLB.plate) as unknown as { nodes: Record<string, THREE.Mesh> }
  const mount = STABS[model]?.mount
  const geometry =
    mount === 'clip'
      ? clip.nodes.housing.geometry
      : mount === 'plate'
        ? plate.nodes.housing.geometry
        : housing
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial color={STABS[model].housing} {...lubedMat(lubed)} />
    </mesh>
  )
}

/** Băng Holee: mảnh Urgo mỏng lót trần lỗ cắm dây, 2 mép gập ra 2 mặt slider */
function HoleePiece() {
  const y = CAD.wireHoleY + CAD.wireR + 0.15
  const mat = <meshStandardMaterial color="#e3b58e" roughness={0.95} />
  return (
    <group position-y={y}>
      <mesh>
        <boxGeometry args={[3.2, 0.3, CAD.stem.halfD * 2]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.45, s * (CAD.stem.halfD + 0.12)]}>
          <boxGeometry args={[3.2, 1.2, 0.25]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

interface StemProps {
  model: string
  lubed?: boolean
  /** còn 2 mấu chân stem (Cherry) chưa cắt */
  feet?: boolean
  /** đã Holee mod */
  holee?: boolean
}

/** Slider (hệ mm, gốc = tâm slider trên mặt PCB) */
export function StabStemCad({ model, lubed = false, feet = false, holee = false }: StemProps) {
  const { stem } = useStabParts()
  const color = STABS[model].stem
  return (
    <group>
      <mesh geometry={stem} castShadow>
        <meshPhysicalMaterial color={color} {...lubedMat(lubed)} />
      </mesh>
      {feet &&
        [-1.3, 1.3].map((x) => (
          <mesh key={x} position={[x, -0.75, 0]}>
            <boxGeometry args={[0.9, 1.8, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      {holee && <HoleePiece />}
    </group>
  )
}

/** Dây stab (hệ mm, gốc = tâm stab). 2u–2.75u dùng dây 2.25u; dây dài dùng 6.25u kéo giãn theo span */
export function StabWireCad({ spanMm }: { spanMm: number }) {
  const { wire225, wire625 } = useStabParts()
  const long = spanMm > 30
  const scaleX = spanMm / (long ? SPANS[625] : SPANS[225])
  return (
    <mesh geometry={long ? wire625 : wire225} scale={[scaleX, 1, 1]} castShadow>
      <meshStandardMaterial color="#cfd3d8" metalness={1} roughness={0.22} />
    </mesh>
  )
}

interface StabProps {
  model: string
  /** khoảng cách từ tâm phím tới mỗi slider (u) */
  span: number
  lubed?: boolean
  holee?: boolean
  /** mỡ trên dây (hiện lớp phủ ở 2 đầu móc) */
  wireLube?: string | null
}

/** Cả bộ stab lắp trên PCB: 2 housing + 2 slider + dây */
export function Stabilizer({ model, span, lubed, holee, wireLube }: StabProps) {
  const spanMm = span / MM
  return (
    <group scale={MM}>
      {[-spanMm, spanMm].map((x) => (
        <group key={x} position-x={x}>
          <StabHousingCad model={model} lubed={lubed} />
          <StabStemCad model={model} lubed={lubed} holee={holee} />
        </group>
      ))}
      <group position={[0, ...(WIRE_SEAT[STABS[model]?.mount] ?? [0, 0])]}>
        <StabWireCad spanMm={spanMm} />
        {wireLube && <WireCoating lube={wireLube} spanMm={spanMm} />}
      </group>
    </group>
  )
}
