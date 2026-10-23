import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { SUPPLIES } from '@/data/supplies'

// Dụng cụ mod stab (đơn vị: u của bàn mod). Gốc toạ độ = đầu làm việc của dụng cụ

/** Cọ lube: cán gỗ, đai kim loại, chùm lông dẹt (đầu lông dính màu mỡ đang dùng). Gốc = mũi cọ */
export const LubeBrush = forwardRef<THREE.Group, { lube?: string }>(function LubeBrush(
  { lube },
  ref,
) {
  const sp = lube ? SUPPLIES[lube] : null
  return (
    <group ref={ref}>
      {/* chùm lông: dẹt, thuôn về mũi */}
      <mesh position-y={0.2} scale={[1, 1, 0.45]}>
        <cylinderGeometry args={[0.1, 0.035, 0.4, 14]} />
        <meshStandardMaterial color="#4a3320" roughness={0.95} />
      </mesh>
      {/* mũi lông dính mỡ */}
      <mesh position-y={0.05} scale={[1, 1, 0.5]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        {sp ? (
          <meshPhysicalMaterial
            color={sp.color}
            roughness={0.05}
            clearcoat={1}
            transparent
            opacity={0.45 + (sp.opacity ?? 0.5) * 0.55}
          />
        ) : (
          <meshStandardMaterial color="#2e2014" roughness={0.95} />
        )}
      </mesh>
      {/* đai kim loại */}
      <mesh position-y={0.48}>
        <cylinderGeometry args={[0.085, 0.1, 0.2, 14]} />
        <meshStandardMaterial color="#c7ced9" metalness={1} roughness={0.25} />
      </mesh>
      {/* cán gỗ */}
      <mesh position-y={1.15} castShadow>
        <cylinderGeometry args={[0.06, 0.085, 1.15, 14]} />
        <meshStandardMaterial color="#d9a35b" roughness={0.6} />
      </mesh>
      <mesh position-y={1.74}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color="#c9302c" roughness={0.5} />
      </mesh>
    </group>
  )
})

/** Kìm cắt: 2 cán cao su + 2 lưỡi (con 0, 1 xoay theo trục y để mở / khép) */
export const Clipper = forwardRef<THREE.Group>(function Clipper(_, ref) {
  return (
    <group ref={ref}>
      {[-1, 1].map((side) => (
        <group key={side} rotation-y={side * 0.33}>
          <mesh position-x={0.18}>
            <boxGeometry args={[0.36, 0.06, 0.07]} />
            <meshStandardMaterial color="#c7ced9" metalness={1} roughness={0.25} />
          </mesh>
          <mesh position-x={-0.55} rotation-y={side * 0.12}>
            <boxGeometry args={[0.85, 0.08, 0.12]} />
            <meshStandardMaterial color={side < 0 ? '#c9302c' : '#2f6fd8'} roughness={0.7} />
          </mesh>
        </group>
      ))}
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
        <meshStandardMaterial color="#5b6273" metalness={0.8} />
      </mesh>
    </group>
  )
})

/** Kéo: 2 lưỡi thép + 2 quai cầm (con 0, 1 xoay theo trục y để mở / khép) */
export const Scissors = forwardRef<THREE.Group>(function Scissors(_, ref) {
  return (
    <group ref={ref}>
      {[-1, 1].map((side) => (
        <group key={side} rotation-y={side * 0.3}>
          {/* lưỡi: thuôn nhọn về mũi */}
          <mesh position={[0.34, side * 0.012, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.35]}>
            <cylinderGeometry args={[0.012, 0.06, 0.68, 4]} />
            <meshStandardMaterial color="#d6dae0" metalness={1} roughness={0.2} />
          </mesh>
          {/* cán nối từ đinh tán ra quai */}
          <mesh position={[-0.2, side * 0.012, side * 0.05]} rotation-y={side * 0.35}>
            <boxGeometry args={[0.3, 0.035, 0.07]} />
            <meshStandardMaterial color="#d6dae0" metalness={1} roughness={0.2} />
          </mesh>
          {/* quai cầm */}
          <mesh position={[-0.45, 0, side * 0.16]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.13, 0.035, 8, 20]} />
            <meshStandardMaterial color="#26262b" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* đinh tán */}
      <mesh position-y={0.01}>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 12]} />
        <meshStandardMaterial color="#8a8f99" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  )
})

/** Mở (1) / khép (0) 2 nhánh của kìm hoặc kéo */
export function setJaw(tool: THREE.Object3D | null, open: number, base = 0.06, range = 0.27) {
  tool?.children
    .slice(0, 2)
    .forEach((side, s) => (side.rotation.y = (s === 0 ? -1 : 1) * (base + open * range)))
}

// ---------- băng Urgo ----------
export const URGO = { endLen: 0.85, padLen: 0.9, width: 0.85, color: '#e3b58e' }

/** 1 đầu dính của băng Urgo (phần được cắt ra để Holee mod) */
export function UrgoEnd({ side }: { side: -1 | 1 }) {
  return (
    <group>
      <RoundedBox args={[URGO.endLen, 0.03, URGO.width]} radius={0.014} smoothness={2} castShadow>
        <meshStandardMaterial color={URGO.color} roughness={0.95} />
      </RoundedBox>
      {/* lỗ thoáng khí trên vải */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[side * (-0.25 + (i % 3) * 0.18), 0.017, i < 3 ? -0.18 : 0.18]}
          rotation-x={-Math.PI / 2}
        >
          <circleGeometry args={[0.02, 6]} />
          <meshBasicMaterial color="#b98a63" />
        </mesh>
      ))}
    </group>
  )
}

/** Phần giữa có miếng gạc (dùng cho vết thương, Holee mod bỏ đi) */
export function UrgoPad() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[URGO.padLen, 0.03, URGO.width]} />
        <meshStandardMaterial color={URGO.color} roughness={0.95} />
      </mesh>
      <mesh position-y={0.022}>
        <boxGeometry args={[URGO.padLen - 0.04, 0.02, 0.6]} />
        <meshStandardMaterial color="#f7efe6" roughness={1} />
      </mesh>
    </group>
  )
}

// ---------- mỡ ----------
interface LubeLook {
  color: string
  opacity: number
  /** độ dày lớp mỡ (mm) */
  thick: number
}
/** Hình ảnh lớp mỡ theo loại: mỡ đặc dày + đục (BDZ), mỡ dielectric / dầu trong suốt (Permatex, GPL 105) */
export function lubeLook(lube: string): LubeLook {
  const sp = SUPPLIES[lube]
  const visc = sp.viscosity ?? 0.5
  return { color: sp.color, opacity: sp.opacity ?? 0.5, thick: 0.12 + visc * 0.55 }
}

function GreaseMaterial({ lube }: { lube: string }) {
  const look = lubeLook(lube)
  return (
    <meshPhysicalMaterial
      color={look.color}
      transparent
      opacity={0.25 + look.opacity * 0.75}
      transmission={1 - look.opacity}
      thickness={0.4}
      ior={1.4}
      roughness={0.06}
      clearcoat={1}
      depthWrite={look.opacity > 0.6}
    />
  )
}

type V3 = [number, number, number]

/** 1 đường phết mỡ (toạ độ mm trong khung của chi tiết) */
export interface Stroke {
  a: V3
  b: V3
  /** pháp tuyến mặt được phết (flat) */
  n: V3
  /** bề rộng đường phết (mm) */
  w: number
  /** phết vòng quanh dây: bán kính dây (mm) */
  tube?: number
}

// capsule cao 1 (thân 0.5 + 2 đầu bo 0.25), rộng 0.5 → scale ra đúng kích thước dải mỡ
const capsule = new THREE.CapsuleGeometry(0.25, 0.5, 4, 12)
const sleeve = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true)

/**
 * Lớp mỡ phết theo 1 đường: dài dần ra theo progress (0..1, đọc mỗi khung hình).
 * Mặt phẳng: dải mỏng dẹt; quanh dây: ống bọc mỏng
 */
export function GreaseStroke({
  lube,
  stroke,
  progress,
}: {
  lube: string
  stroke: Stroke
  progress?: MutableRefObject<number>
}) {
  const ref = useRef<THREE.Mesh>(null)
  const { thick } = lubeLook(lube)
  const frame = useMemo(() => {
    const a = new THREE.Vector3(...stroke.a)
    const b = new THREE.Vector3(...stroke.b)
    const len = a.distanceTo(b)
    const y = b.clone().sub(a).normalize()
    const z = new THREE.Vector3(...stroke.n)
    z.sub(y.clone().multiplyScalar(z.dot(y))).normalize()
    const x = new THREE.Vector3().crossVectors(y, z)
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
    return { a, y, len, q }
  }, [stroke])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const p = Math.min(1, progress?.current ?? 1)
    m.visible = p > 0.01
    const l = Math.max(0.001, frame.len * p)
    m.position.copy(frame.a).addScaledVector(frame.y, l / 2)
    if (stroke.tube) {
      const r = stroke.tube + 0.05 + thick * 0.4
      m.scale.set(r, l, r)
    } else m.scale.set(stroke.w * 2, l, thick * 2)
  })
  return (
    <mesh ref={ref} geometry={stroke.tube ? sleeve : capsule} quaternion={frame.q}>
      <GreaseMaterial lube={lube} />
    </mesh>
  )
}

// ---------- mỡ bọc dây ----------
/** Đường tâm dây đo từ CAD (mm, hệ của dây: gốc = tâm stab) */
export const WIRE_PATH = {
  y: 1.62,
  r: 0.8,
  /** tâm thanh ngang */
  barZ: 8.21,
  /** bán kính uốn ở 2 góc */
  bendR: 0.9,
  /** tâm stab lệch nhẹ so với tâm dây trong CAD */
  offsetX: 0.06,
  /** mỡ bắt đầu từ đoạn móc nằm trong lỗ slider */
  greaseFromZ: -1.2,
  /** mỡ lan sang thanh ngang bao nhiêu mm kể từ góc uốn */
  barLen: 4.5,
}

/** x tâm đoạn móc ở mỗi bên */
export const hookCenterX = (side: -1 | 1, spanMm: number) =>
  WIRE_PATH.offsetX + side * (spanMm + 0.1)

/** Đường phết mỡ 1 bên: đoạn móc → góc uốn → 1 đoạn thanh ngang */
export function wireGreaseCurve(side: -1 | 1, spanMm: number) {
  const { y, barZ, bendR, greaseFromZ, barLen } = WIRE_PATH
  const hx = hookCenterX(side, spanMm)
  const v = (x: number, z: number) => new THREE.Vector3(x, y, z)
  const path = new THREE.CurvePath<THREE.Vector3>()
  path.add(new THREE.LineCurve3(v(hx, greaseFromZ), v(hx, barZ - bendR)))
  path.add(
    new THREE.QuadraticBezierCurve3(v(hx, barZ - bendR), v(hx, barZ), v(hx - side * bendR, barZ)),
  )
  path.add(new THREE.LineCurve3(v(hx - side * bendR, barZ), v(hx - side * (bendR + barLen), barZ)))
  return path
}

const TUBE_SEG = 64
const TUBE_RAD = 16

/**
 * Lớp mỡ bọc tròn đều quanh dây, chạy theo đường tâm dây (hệ mm của dây).
 * progress: dài dần theo cọ
 */
export function WireGrease({
  lube,
  spanMm,
  side,
  progress,
}: {
  lube: string
  spanMm: number
  side: -1 | 1
  progress?: MutableRefObject<number>
}) {
  const ref = useRef<THREE.Mesh>(null)
  const { thick } = lubeLook(lube)
  const geom = useMemo(
    () =>
      new THREE.TubeGeometry(
        wireGreaseCurve(side, spanMm),
        TUBE_SEG,
        WIRE_PATH.r + 0.05 + thick * 0.4,
        TUBE_RAD,
        false,
      ),
    [side, spanMm, thick],
  )
  useFrame(() => {
    const p = Math.min(1, progress?.current ?? 1)
    if (ref.current) ref.current.visible = p > 0.01
    geom.setDrawRange(0, Math.ceil(TUBE_SEG * p) * TUBE_RAD * 6)
  })
  return (
    <mesh ref={ref} geometry={geom}>
      <GreaseMaterial lube={lube} />
    </mesh>
  )
}

/** Mỡ tĩnh trên dây cả 2 bên (bàn phím đã lắp) */
export function WireCoating({ lube, spanMm }: { lube: string; spanMm: number }) {
  return ([-1, 1] as const).map((side) => (
    <WireGrease key={side} lube={lube} spanMm={spanMm} side={side} />
  ))
}
