import { createClipper } from './clipperModel'
import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SUPPLIES } from '@/data/supplies'
import stabModel from '@/data/stabModel.json'

// Dụng cụ mod stab (đơn vị: u của bàn mod). Gốc toạ độ = đầu làm việc của dụng cụ

// Cọ vẽ tròn đầu nhỏ "Round Brush" (Zsky, Poly Pizza, CC BY 4.0), hệ mét, dài 0.33m.
// Trong GLB lông ở trên (y 0.044..0.104, mũi ở y = 0.104), cán xuống tới đuôi y = -0.224
const BRUSH_GLB = '/models/lube/brush.glb'
useGLTF.preload(BRUSH_GLB)
const BRUSH_TIP_Y = 0.104
/** thu về dài ~1.8u như dụng cụ bàn mod */
const BRUSH_SCALE = 5.5

/** Cọ lube đầu nhỏ; gốc = đầu lông, cán hướng +y */
export const LubeBrush = forwardRef<THREE.Group, { lube?: string }>(function LubeBrush(
  { lube },
  ref,
) {
  const sp = lube ? SUPPLIES[lube] : null
  const { scene } = useGLTF(BRUSH_GLB)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    return copy
  }, [scene])
  return (
    <group ref={ref}>
      {/* lật ngược cho mũi lông ở gốc, cán hướng lên */}
      <group scale={BRUSH_SCALE}>
        <primitive object={model} rotation-x={Math.PI} position-y={BRUSH_TIP_Y} />
      </group>
      {/* mũi lông dính mỡ */}
      {sp && (
        <mesh position-y={0.06} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshPhysicalMaterial
            color={sp.color}
            roughness={0.05}
            clearcoat={1}
            transparent
            opacity={0.45 + (sp.opacity ?? 0.5) * 0.55}
          />
        </mesh>
      )}
    </group>
  )
})

/** Kìm cắt chân linh kiện kiểu flush cutter: cán mảnh, mũi cắt vát phẳng. */
export const Clipper = forwardRef<THREE.Group>(function Clipper(_, ref) {
  const model = useMemo(() => createClipper(), [])
  return <primitive ref={ref} object={model} />
})

// Kéo "Loop scissors" (Innerscene Free Parts Library, CC0), hệ mét, mũi kéo chĩa +x, đinh tán ở gốc
const SCISSORS_GLB = '/models/tools/scissors.glb'
useGLTF.preload(SCISSORS_GLB)
/** góc mở sẵn của mỗi nửa kéo trong model (rad) */
const SCISSORS_OPEN = 0.435
/** dài ~0.2m → ~1.4u trên bàn mod */
const SCISSORS_SCALE = 7

/** Kéo: con 0, 1 là 2 nửa (lưỡi + cán + quai) xoay quanh đinh tán theo trục y để mở / khép */
export const Scissors = forwardRef<THREE.Group>(function Scissors(_, ref) {
  const { scene } = useGLTF(SCISSORS_GLB)
  const halves = useMemo(() => {
    const out = [new THREE.Group(), new THREE.Group(), new THREE.Group()]
    // nửa không hậu tố: lưỡi bên +z nối qua đinh tán sang quai bên -z; nửa ".001" ngược lại
    // (three bỏ dấu chấm trong tên node: "blade.001" → "blade001")
    for (const o of [...scene.clone(true).children[0].children]) {
      o.traverse((m) => ((m as THREE.Mesh).isMesh ? (m.castShadow = true) : null))
      const second = /\.?001$/.test(o.name)
      // model dùng cùng 1 hình lưỡi cho 2 bên (không đối xứng gương): lật lưỡi ".001" qua trục dọc cho 2 lưỡi
      // đối xứng, mép cắt thẳng + mũi nhọn quay vào trong (lưỡi không hậu tố giữ nguyên)
      if (/blade/i.test(o.name) && second) o.scale.z *= -1
      out[/pivot/i.test(o.name) ? 2 : second ? 1 : 0].add(o)
    }
    return out
  }, [scene])
  return (
    <group ref={ref} scale={SCISSORS_SCALE}>
      {halves.map((h, i) => (
        <primitive key={i} object={h} />
      ))}
    </group>
  )
})

/** Mở (1, như model) / khép (0) 2 nửa kéo */
export function setScissors(tool: THREE.Object3D | null, open: number) {
  tool?.children
    .slice(0, 2)
    .forEach((half, s) => (half.rotation.y = (s === 0 ? 1 : -1) * SCISSORS_OPEN * (1 - open)))
}

/** Mở (1) / khép (0) 2 nhánh của kìm hoặc kéo */
export function setJaw(tool: THREE.Object3D | null, open: number, base = 0.22, range = 0.16) {
  tool?.children
    .slice(0, 2)
    // càng 0 lật trục z (scale.z = −1, xem clipperModel) nên góc mở ngược dấu càng 1; sai dấu thì 2 lưỡi bắt chéo
    .forEach((side, s) => (side.rotation.y = (s === 0 ? 1 : -1) * (base + open * range)))
}

// ---------- băng Urgo ----------
export const URGO = { endLen: 0.6, padLen: 0.62, width: 0.6, color: '#e3b58e' }

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
          position={[
            side * (-0.29 + (i % 3) * 0.21) * URGO.endLen,
            0.017,
            (i < 3 ? -0.21 : 0.21) * URGO.width,
          ]}
          rotation-x={-Math.PI / 2}
        >
          <circleGeometry args={[0.015, 6]} />
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
        <boxGeometry args={[URGO.padLen - 0.04, 0.02, URGO.width * 0.7]} />
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
function lubeLook(lube: string): LubeLook {
  const sp = SUPPLIES[lube]
  const visc = sp.viscosity ?? 0.5
  return { color: sp.color, opacity: sp.opacity ?? 0.5, thick: 0.12 + visc * 0.55 }
}

const greaseMats = new Map<string, THREE.MeshPhysicalMaterial>()
/** Vật liệu lớp mỡ dùng chung theo loại */
export function greaseMaterial(lube: string) {
  if (!greaseMats.has(lube)) {
    const look = lubeLook(lube)
    greaseMats.set(
      lube,
      new THREE.MeshPhysicalMaterial({
        color: look.color,
        transparent: true,
        opacity: 0.25 + look.opacity * 0.75,
        transmission: 1 - look.opacity,
        thickness: 0.4,
        ior: 1.4,
        roughness: 0.06,
        clearcoat: 1,
        depthWrite: look.opacity > 0.6,
      }),
    )
  }
  return greaseMats.get(lube)!
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

/** Grid mesh with indices ordered by length so drawRange reveals it from the brush tip. */
function greaseGrid(vertices: number[], longitudinal: number, radial: number) {
  const indices: number[] = []
  for (let i = 0; i < longitudinal; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j
      const b = (i + 1) * radial + j
      const c = (i + 1) * radial + ((j + 1) % radial)
      const d = i * radial + ((j + 1) % radial)
      indices.push(a, b, d, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const smoothBlob = (t: number, center: number, spread: number) =>
  Math.exp(-Math.pow((t - center) / spread, 2) * 2.2)

function strokeSeed(stroke: Stroke) {
  return Math.abs(
    Math.round(stroke.a[0] * 31 + stroke.a[1] * 17 + stroke.a[2] * 13 + stroke.b[2] * 7),
  )
}

/** Raised smear with a drifting swirl ridge and rounded, connected grease deposits. */
function greaseFilmGeometry(stroke: Stroke, thick: number) {
  const longitudinal = 56
  const radial = 16
  const seed = strokeSeed(stroke) * 0.071
  const vertices: number[] = []
  for (let i = 0; i <= longitudinal; i++) {
    const t = i / longitudinal
    const ends = Math.min(1, t / 0.045, (1 - t) / 0.045)
    const taper = Math.max(0.04, ends * ends * (3 - 2 * ends))
    const deposits =
      0.52 * smoothBlob(t, 0.2 + (seed % 7) * 0.004, 0.065) +
      0.65 * smoothBlob(t, 0.53 + (seed % 5) * 0.006, 0.075) +
      0.45 * smoothBlob(t, 0.82 - (seed % 6) * 0.005, 0.06)
    const wave =
      Math.sin(t * Math.PI * 4 + seed) * 0.14 + Math.sin(t * Math.PI * 9 + seed * 0.7) * 0.08
    const width = (stroke.w / 2) * taper * Math.max(0.58, 0.78 + wave * 0.7 + deposits * 0.3)
    const height = thick * taper * Math.max(0.3, 0.48 + wave * 0.55 + deposits * 0.65)
    // Slow sideways drift makes the smear curl instead of forming a ruler-straight bead.
    const swirl = Math.sin(t * Math.PI * 2.4 + seed) * stroke.w * 0.08 * taper
    for (let j = 0; j < radial; j++) {
      const angle = (j / radial) * Math.PI * 2
      vertices.push(
        swirl + Math.cos(angle) * width,
        t,
        height * 0.5 + Math.sin(angle) * height * 0.5,
      )
    }
  }
  return greaseGrid(vertices, longitudinal, radial)
}

/**
 * Lớp mỡ phết theo 1 đường: dài dần ra theo progress (0..1), có vệt miết và điểm mỡ đọng.
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
  const geometry = useMemo(() => greaseFilmGeometry(stroke, thick), [stroke, thick])
  const frame = useMemo(() => strokeFrame(stroke), [stroke])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const p = Math.min(1, progress?.current ?? 1)
    m.visible = p > 0.01
    m.position.copy(frame.a)
    m.quaternion.copy(frame.q)
    m.scale.set(1, frame.len, 1)
    geometry.setDrawRange(0, Math.ceil(56 * p) * 16 * 6)
  })
  return <mesh ref={ref} geometry={geometry} material={greaseMaterial(lube)} />
}

/** Khung đặt 1 đường phết: gốc a, trục y dọc đường, z theo pháp tuyến mặt */
function strokeFrame(stroke: Stroke) {
  const a = new THREE.Vector3(...stroke.a)
  const b = new THREE.Vector3(...stroke.b)
  const len = a.distanceTo(b)
  const y = b.clone().sub(a).normalize()
  const z = new THREE.Vector3(...stroke.n)
  z.sub(y.clone().multiplyScalar(z.dot(y))).normalize()
  const x = new THREE.Vector3().crossVectors(y, z)
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
  return { a, len, q }
}

/** Nhiều đường mỡ đã phết xong gộp 1 khối (toạ độ chi tiết), để vẽ InstancedMesh cho cả lưới switch */
export function greaseGeometry(lube: string, strokes: Stroke[]) {
  const { thick } = lubeLook(lube)
  return mergeGeometries(
    strokes.map((s) => {
      const { a, len, q } = strokeFrame(s)
      return greaseFilmGeometry(s, thick).applyMatrix4(
        new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, len, 1)),
      )
    }),
  )
}

// ---------- mỡ bọc dây ----------
/** Đường tâm dây đo từ CAD (mm, hệ của dây: gốc = tâm stab) */
const WIRE_PATH = {
  y: 1.62,
  r: 0.8,
  /** tâm thanh ngang */
  barZ: 8.21,
  /** bán kính uốn ở 2 góc */
  bendR: 0.9,
  /** tâm stab lệch nhẹ so với tâm dây trong CAD */
  offsetX: 0.06,
  /** mỡ phủ kín đoạn móc, trùm qua mặt cắt đầu dây (z = -2.99); đầu ống mỡ bịt bằng nắp tròn */
  greaseFromZ: -3.05,
  /** mỡ qua khỏi góc uốn 1 đoạn ngắn (phần cọ vào ngàm), không phết dọc cả thanh ngang */
  barLen: 2,
}

/** x tâm đoạn móc ở mỗi bên */
const hookCenterX = (side: -1 | 1, spanMm: number) => WIRE_PATH.offsetX + side * (spanMm + 0.1)

/** dây dài (6.25u / 7u) dùng dây CAD 6.25u kéo giãn theo trục x (StabWireCad) → dây dày lên theo hệ số này */
const wireScaleX = (spanMm: number) =>
  spanMm / (spanMm > 30 ? stabModel.spans['6.25u'] : stabModel.spans['2.25u'])

/**
 * Đường phết mỡ 1 bên: đoạn móc → góc uốn → 1 đoạn ngắn thanh ngang (chỗ cọ vào ngàm stab).
 * Mọi dây (2u … 7u) như nhau: dây dài cũng không phết dọc cả thanh ngang
 */
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

/** Uneven coating follows the wire curve; localized blobs sweep around its circumference. */
function irregularWireGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  layer: number,
  seed: number,
  /** bán kính lõi dây (dây kéo giãn thì dày hơn, mỡ phải bọc ngoài cả vòng) */
  core = WIRE_PATH.r,
) {
  const vertices: number[] = []
  const frames = curve.computeFrenetFrames(TUBE_SEG, false)
  const phase = seed * 0.113
  for (let i = 0; i <= TUBE_SEG; i++) {
    const t = i / TUBE_SEG
    const center = curve.getPointAt(t)
    const wave =
      Math.sin(t * Math.PI * 6 + phase) * 0.19 + Math.sin(t * Math.PI * 17 + phase * 0.6) * 0.11
    const deposits = [0.2, 0.48, 0.73, 0.91].reduce((sum, at, k) => {
      const around = t * Math.PI * 5 + phase + k * 1.7
      return (
        sum +
        1.35 *
          smoothBlob(t, at + Math.sin(phase + k) * 0.018, 0.043) *
          smoothBlob(Math.atan2(Math.sin(around), Math.cos(around)), 0, 0.72)
      )
    }, 0)
    for (let j = 0; j < TUBE_RAD; j++) {
      const angle = (j / TUBE_RAD) * Math.PI * 2
      const irregularity = Math.sin(t * Math.PI * 9 + angle * 2 + phase) * 0.1
      const coat = Math.max(0.08, 0.48 + wave + irregularity + deposits)
      const radius = core + layer * coat
      const normal = frames.normals[i]
      const binormal = frames.binormals[i]
      const point = center
        .clone()
        .addScaledVector(normal, Math.cos(angle) * radius)
        .addScaledVector(binormal, -Math.sin(angle) * radius)
      vertices.push(point.x, point.y, point.z)
    }
  }
  return greaseGrid(vertices, TUBE_SEG, TUBE_RAD)
}

/**
 * Lớp mỡ bọc dây có chỗ dày mỏng và mỡ đọng quanh móc/góc uốn.
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
  const ref = useRef<THREE.Group>(null)
  const { thick } = lubeLook(lube)
  const layer = 0.03 + thick * 0.22
  // lõi dây + 0.05mm cho mỡ bọc kín cả vòng (trước mỡ mỏng hơn dây kéo giãn → lộ nửa dây)
  const core = WIRE_PATH.r * Math.max(1, wireScaleX(spanMm)) + 0.05
  const rad = core + layer * 0.48
  const curve = useMemo(() => wireGreaseCurve(side, spanMm), [side, spanMm])
  const geom = useMemo(
    () => irregularWireGeometry(curve, layer, Math.round(spanMm * 17 + side * 29), core),
    [curve, layer, side, spanMm, core],
  )
  useFrame(() => {
    const p = Math.min(1, progress?.current ?? 1)
    if (ref.current) ref.current.visible = p > 0.01
    geom.setDrawRange(0, Math.ceil(TUBE_SEG * p) * TUBE_RAD * 6)
  })
  return (
    <group ref={ref}>
      <mesh geometry={geom} material={greaseMaterial(lube)} />
      {/* nắp mỡ bịt kín đầu móc (ống hở đầu sẽ lộ lõi dây) */}
      <mesh
        position={[hookCenterX(side, spanMm), WIRE_PATH.y, WIRE_PATH.greaseFromZ]}
        scale={[1, 1, 0.55]}
        material={greaseMaterial(lube)}
      >
        <sphereGeometry args={[rad, TUBE_RAD, 10]} />
      </mesh>
    </group>
  )
}

/** Mỡ tĩnh trên dây cả 2 bên (bàn phím đã lắp) */
export function WireCoating({ lube, spanMm }: { lube: string; spanMm: number }) {
  return ([-1, 1] as const).map((side) => (
    <WireGrease key={side} lube={lube} spanMm={spanMm} side={side} />
  ))
}
