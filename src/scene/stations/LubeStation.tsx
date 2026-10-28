import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { useGame, useBuild, useCtx } from '@/store'
import { SPELL_LUBE, SPELL_OPEN, SUPPLIES, spellBonus, spellRun } from '@/data/supplies'
import { TOOLS } from '@/data/parts'
import { lubePicks, lubedIds } from '@/data/mods'
import { playBrush, playClick } from '@/sound'
import {
  MM,
  SWITCH_CAD,
  SwitchBottom,
  SwitchStem,
  SwitchTop,
  bodyGeo,
  switchMaterials,
  useSwitchParts,
} from '../models/Switch'
import {
  GreaseStroke,
  LubeBrush,
  greaseGeometry,
  greaseMaterial,
  type Stroke,
} from '../models/ModTools'
import { springGeometry } from '../models/spring'
import { OUTLINE_MAT } from '../common/hoverOutline'
import { createOilBottle } from '../models/lubeJarModel'
import { LubeJar } from '../models/LubeJar'
import {
  Clickable,
  HintArrow,
  MissingSlot,
  StationTable,
  alongPass,
  ease,
  passPhase,
  seg,
} from './StationKit'

// ---------- bố cục bàn lube (đơn vị u của bàn) ----------
// Switch + lò xo đúng cỡ thật (B = 1) để so được với hộp lắc: switch ≈ 1/10, lò xo trong hộp ≈ 1/20 chiều dài hộp
const B = 1
const U = B * MM
const TABLE = -0.55
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const { body, cavity } = SWITCH_CAD
// hàng sau: đồ nghề + hộp lò xo; phần còn lại của bàn bày các switch đã mở (bấm vào để lube)
// hộp lắc + khay lò xo ở hàng sau (trước nằm sát mép trước, che chi tiết switch)
// dời vào 0.3u so với mép sau: bàn full (k lớn) trước đó chạm chân màn hình PC
const BOX_AT = v(-1.2, TABLE, -4.4) // hộp lắc lò xo (hàng sau)
/** hộp nhựa đựng cả mẻ lò xo (u bàn) */
// dài 3.75u (trước 7.5u, người dùng thấy dài quá); lò xo rải trong hộp tự co theo BOX.w
const BOX = { w: 3.75, d: 2.4, h: 1.5 }
const TRAY_AT = v(-5.6, TABLE, -4.7)
const TRAY = { w: 1.9, d: 1.45, h: 0.32 }
const LUBE_MODEL = '/models/lube'
const BOX_SCALE: [number, number, number] = [BOX.w / 80, BOX.h / 15.5, BOX.d / 62.4]
const TRAY_SCALE: [number, number, number] = [TRAY.w / 190, TRAY.h / 24, TRAY.d / 130]
useGLTF.preload(`${LUBE_MODEL}/spring-box-base.glb`)
useGLTF.preload(`${LUBE_MODEL}/spring-box-lid.glb`)
useGLTF.preload(`${LUBE_MODEL}/spring-tray.glb`)
/** lò xo trong hộp thu về 0.4 lần → dài ≈ 1/10 chiều dài hộp */
const IN_BOX = 0.4
const BOTTLE_AT = v(3, TABLE, -4.3) // lọ dầu GPL 105 (hàng sau, giữa hũ mỡ và đồ mở)
const JAR_AT = v(1.9, TABLE, -4.6) // hũ mỡ switch (hàng sau, giữa hộp lắc và đồ mở)
// cọ nằm hàng sau, trước đồ mở switch
const BRUSH_IDLE = v(3.6, TABLE + 0.1, -3.3)
/** vùng bày switch đã mở (hàng trước): x, z min / max */
// đồ nghề dồn hết lên mép sau → lưới chiếm gần cả bàn, đủ chỗ cho đơn full size (~104 switch)
const OPENED_AREA = { x0: -6.2, x1: 5.6, z0: -2.1, z1: 6 }
// đồ mở switch MX (in 3D, mm, `bun run convert:hand-tools`) + switch nguyên chờ mở đặt trên
const OPENER_GLB = '/models/tools/mx-opener.glb'
useGLTF.preload(OPENER_GLB)
const OPENER_AT = v(4.4, TABLE, -4.9)
/** switch nguyên ngồi trong lòng đồ mở: mặt plate (y = 0 của switch) cao hơn bàn (mm) */
const OPENER_SEAT = 14

/** stem của switch đã mở nổi lơ lửng trên housing dưới (mm) cho thấy được mỡ ở cả stem lẫn hốc housing */
const RAISE = 9
/** gốc switch (mặt plate) cao hơn bàn (mm) khi housing dưới đặt trên bàn */
const SEAT_Y = 4.81

// ---------- nét phết mỡ (mm, trong khung switch) ----------
// 2 bên thân stem (mặt trượt), stem đang nổi
const STEM_STROKES: Stroke[] = [-1, 1].map((sx) => ({
  a: [sx * (body.halfX + 0.02), body.top - 0.5 + RAISE, 0],
  b: [sx * (body.halfX + 0.02), body.bottom + 0.6 + RAISE, 0],
  n: [sx, 0, 0],
  w: 3.4,
}))
// 2 thành trong hốc trượt của housing dưới
const HOUSING_STROKES: Stroke[] = [-1, 1].map((sx) => ({
  a: [sx * (cavity.halfX - 0.02), cavity.top - 0.3, 0],
  b: [sx * (cavity.halfX - 0.02), cavity.bottom + 0.6, 0],
  n: [-sx, 0, 0],
  w: 3.6,
}))
const STROKES = [...STEM_STROKES, ...HOUSING_STROKES]

/** Lưới bày switch đã mở (tự co cho vừa vùng bày): tỉ lệ ô + gốc switch thứ i (housing dưới nằm trên bàn) */
function switchGrid(total: number) {
  const { x0, x1, z0, z1 } = OPENED_AREA
  const cols = Math.max(1, Math.ceil(Math.sqrt((total * (x1 - x0)) / (z1 - z0))))
  const rows = Math.max(1, Math.ceil(total / cols))
  const dx = (x1 - x0) / Math.max(1, cols - 1)
  const dz = rows > 1 ? (z1 - z0) / (rows - 1) : 0
  // mỗi ô: switch (~16mm) + housing trên phía sau (~15mm) → sâu ~33mm; lưới chật thì thu nhỏ cho khỏi chồng
  const size = Math.min(1, (dx * 0.92) / (16 * U), dz ? (dz * 0.95) / (33 * U) : 1)
  const at = (i: number) =>
    v(x0 + (i % cols) * dx, TABLE + SEAT_Y * U * size, z0 + Math.floor(i / cols) * dz)
  return { size, at }
}

/** 4 nét cọ quét quanh switch đang lube: 2 bên thân stem rồi 2 thành hốc housing dưới */
function passes(at: THREE.Vector3, size: number) {
  const toWorld = ([x, y, z]: [number, number, number]) =>
    at.clone().add(v(x, y, z).multiplyScalar(U * size))
  return STROKES.map((st) => [toWorld(st.a), toWorld(st.b)])
}

/**
 * Các switch đã mở xếp lưới ở hàng trước, đủ số con đã mở: housing dưới, stem đầy đủ (đầu + thân) nổi phía trên,
 * housing trên đặt ngửa ngay sau; con đã lube có lớp mỡ trên stem + hốc housing.
 * InstancedMesh (88–104 con vẫn nhẹ); rê chuột vào con nào (khi bấm lube được) thì viền xanh con đó
 */
function OpenedSwitches({
  type,
  total,
  opened,
  lubed,
  lube,
  active,
  batch,
}: {
  type: string
  total: number
  opened: number
  /** các con đã lube (thứ tự trong lưới) */
  lubed: number[]
  /** số con 1 mẻ lube (bậc thợ + sách phép): rê vào 1 con thì viền cả mẻ sẽ bôi */
  batch: number
  /** loại mỡ đã dùng (null: chưa lube con nào) */
  lube: string | null
  active: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const parts = useSwitchParts()
  const m = switchMaterials(type)
  const bottomRef = useRef<THREE.InstancedMesh>(null)
  const dryRef = useRef<THREE.InstancedMesh>(null)
  const wetRef = useRef<THREE.InstancedMesh>(null)
  const dryBodyRef = useRef<THREE.InstancedMesh>(null)
  const wetBodyRef = useRef<THREE.InstancedMesh>(null)
  const topRef = useRef<THREE.InstancedMesh>(null)
  const greaseRef = useRef<THREE.InstancedMesh>(null)
  const grease = useMemo(() => lube && greaseGeometry(lube, STROKES), [lube])
  const grid = useMemo(() => switchGrid(total), [total])
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const { size, at } = grid
    const place = (mesh: THREE.InstancedMesh | null, ids: number[], y: number, back = 0) => {
      if (!mesh) return
      // instance thứ k của mesh này = switch ids[k] (để biết đang rê / bấm con nào)
      mesh.userData.ids = ids
      mesh.count = ids.length
      ids.forEach((i, k) => {
        o.position.copy(at(i))
        o.position.y = TABLE + y * U * size
        o.position.z -= back * U * size
        o.scale.setScalar(U * size)
        o.updateMatrix()
        mesh.setMatrixAt(k, o.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    const all = Array.from({ length: opened }, (_, i) => i)
    const done = new Set(lubed)
    const wet = all.filter((i) => done.has(i))
    const dry = all.filter((i) => !done.has(i))
    place(bottomRef.current, all, SEAT_Y)
    place(greaseRef.current, wet, SEAT_Y)
    // stem nổi phía trên housing dưới
    place(wetRef.current, wet, SEAT_Y + RAISE)
    place(dryRef.current, dry, SEAT_Y + RAISE)
    place(wetBodyRef.current, wet, SEAT_Y + RAISE)
    place(dryBodyRef.current, dry, SEAT_Y + RAISE)
    // housing trên đặt cạnh sau (đáy housing trên ở y 0.743 → hạ sát bàn), lùi 17mm
    place(topRef.current, all, -0.743, 17)
  }, [opened, lubed, grid, grease])
  // viền cả mẻ sẽ bôi nếu bấm con đang rê (con đã lube bấm vào không làm gì)
  const lit =
    active && hover !== null && hover < opened && !lubed.includes(hover)
      ? lubePicks(lubed, opened, hover, batch)
      : []
  return (
    <group
      onPointerMove={(e: ThreeEvent<PointerEvent>) => setHover(switchHit(e) ?? null)}
      onPointerOut={() => setHover(null)}
    >
      {lit.map((i) => (
        <group key={i} position={grid.at(i)} scale={U * grid.size}>
          <mesh geometry={parts.bottom} material={OUTLINE_MAT} raycast={() => null} />
          <group position-y={RAISE}>
            <mesh geometry={parts.stemTop} material={OUTLINE_MAT} raycast={() => null} />
            <mesh geometry={bodyGeo} material={OUTLINE_MAT} raycast={() => null} />
          </group>
          <mesh
            geometry={parts.top}
            material={OUTLINE_MAT}
            position={[0, -0.743 - SEAT_Y, -17]}
            raycast={() => null}
          />
        </group>
      ))}
      <instancedMesh ref={bottomRef} args={[parts.bottom, m.bottom, total]} castShadow />
      <instancedMesh ref={wetRef} args={[parts.stemTop, m.stemLubed, total]} castShadow />
      <instancedMesh ref={dryRef} args={[parts.stemTop, m.stem, total]} castShadow />
      <instancedMesh ref={wetBodyRef} args={[bodyGeo, m.stemLubed, total]} castShadow />
      <instancedMesh ref={dryBodyRef} args={[bodyGeo, m.stem, total]} castShadow />
      <instancedMesh ref={topRef} args={[parts.top, m.top, total]} castShadow />
      {grease && (
        <instancedMesh
          key={lube ?? undefined}
          ref={greaseRef}
          args={[grease, greaseMaterial(lube!), total]}
          raycast={() => null}
        />
      )}
    </group>
  )
}

/** switch trong lưới bị trỏ / bấm trúng (instance → thứ tự trong lưới) */
const switchHit = (e: ThreeEvent<PointerEvent>): number | undefined =>
  e.instanceId === undefined ? undefined : e.object.userData.ids?.[e.instanceId]

/** Mỡ đang phết trên switch đang lube: mỗi nét dài dần theo mũi cọ (lớp mỡ tĩnh có sau khi xong mẻ) */
function LiveGrease({ lube, at, size }: { lube: string; at: THREE.Vector3; size: number }) {
  const progress = useMemo(() => STROKES.map(() => ({ current: 0 })), [])
  useFrame(() => {
    const p = animProgress('switch') ?? 1
    // cọ chạy hết nét ở 55% đầu mỗi lượt (rồi quét ngược) → mỡ phủ kín lúc đó
    progress.forEach((r, i) => (r.current = seg(passPhase(p, i, STROKES.length), 0, 0.55)))
  })
  return (
    <group position={at} scale={U * size}>
      {STROKES.map((st, i) => (
        <GreaseStroke key={i} lube={lube} stroke={st} progress={progress[i]} />
      ))}
    </group>
  )
}

/** Switch nguyên (chưa mở) đúng dáng lắp ráp */
function WholeSwitch({ type, topRef }: { type: string; topRef: RefObject<THREE.Group> }) {
  return (
    <>
      <SwitchBottom type={type} />
      <SwitchStem type={type} />
      <group ref={topRef}>
        <SwitchTop type={type} />
      </group>
    </>
  )
}

/**
 * Chỗ đặt đồ mở: 1 cái ở OPENER_AT; mở nhiều con mỗi lần (bậc thợ / phép mở switch) thì bày tối đa 10 cái,
 * lưới 5 cột ở góc phải sau, thu nhỏ cho vừa giữa lọ dầu và mép bàn
 */
function openerSlots(n: number) {
  if (n <= 1) return { scale: 1, at: [OPENER_AT] }
  const at = Array.from({ length: Math.min(n, OPENER_MAX) }, (_, i) =>
    v(3.7 + (i % 5) * 0.75, TABLE, -5.3 + Math.floor(i / 5) * 0.75),
  )
  return { scale: 0.7, at }
}
const OPENER_MAX = 10

/** Các đồ mở switch, mỗi cái 1 switch nguyên chờ mở (n = số con mỗi lần mở); click là mở cả lượt */
function SwitchOpener({ type, left, n }: { type: string; left: number; n: number }) {
  const { scale, at } = openerSlots(n)
  // nhãn nằm trên giữa cụm đồ mở
  const mid = at.reduce((a, p) => a.add(p), v(0, 0, 0)).divideScalar(at.length)
  return (
    <group>
      {at.map((p, i) => (
        <OpenerSlot key={i} at={p} scale={scale} type={type} full={i < left} />
      ))}
      {/* số switch còn phải mở */}
      <Text
        position={[mid.x, TABLE + 40 * U, mid.z]}
        fontSize={5 * U}
        color="#ffd84a"
        outlineWidth={0.4 * U}
        outlineColor="#000"
        anchorX="center"
      >
        {left > 0 ? `Còn ${left} switch chưa mở` : 'Đã mở hết'}
      </Text>
    </group>
  )
}

/** 1 đồ mở + switch nguyên: click thì ấn xuống, housing trên bật lên rồi bay sang chỗ để vỏ */
function OpenerSlot({
  at,
  scale,
  type,
  full,
}: {
  at: THREE.Vector3
  scale: number
  type: string
  /** còn switch chờ mở trên đồ mở này */
  full: boolean
}) {
  const src = useGLTF(OPENER_GLB).scene
  const opener = useMemo(() => src.clone(), [src])
  const top = useRef<THREE.Group>(null)
  const whole = useRef<THREE.Group>(null)
  useFrame(() => {
    const p = animProgress('open')
    const t = p ?? 0
    // ấn xuống (0 → 0.25), vỏ trên bật lên (0.25 → 0.6), bay đi + mờ dần (0.6 → 1)
    if (whole.current)
      whole.current.position.y = OPENER_SEAT - Math.sin(seg(t, 0, 0.3) * Math.PI) * 1.2
    if (top.current) {
      const up = ease(seg(t, 0.25, 0.6))
      const away = ease(seg(t, 0.6, 1))
      top.current.position.set(-away * 25, up * 9 + Math.sin(away * Math.PI) * 6, away * 20)
      top.current.rotation.z = up * 0.6
      top.current.visible = p === null || away < 0.95
    }
  })
  return (
    <group position={at} scale={U * scale}>
      <primitive object={opener} />
      {full && (
        <group ref={whole} position-y={OPENER_SEAT}>
          <WholeSwitch type={type} topRef={top} />
        </group>
      )}
    </group>
  )
}

/** Tiến độ hoạt cảnh bàn lube (null nếu không chạy). Đọc thẳng store để dùng trong useFrame */
function animProgress(kind: 'switch' | 'spring' | 'open') {
  const a = useGame.getState().lubeAnim
  if (!a || a.kind !== kind) return null
  return Math.min(1, (performance.now() - a.at) / (a.dur * 1000))
}

/** Cọ: quét lần lượt 2 bên thân stem rồi 2 thành hốc housing; nghỉ thì nằm trên bàn */
function SwitchBrush({
  lube,
  at,
  size,
}: {
  lube?: string
  /** gốc switch đang lube + tỉ lệ ô lưới */
  at: THREE.Vector3
  size: number
}) {
  const ref = useRef<THREE.Group>(null)
  const visc = lube ? (SUPPLIES[lube].viscosity ?? 0.5) : 0
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const p = animProgress('switch')
    if (p === null) {
      g.position.copy(BRUSH_IDLE)
      g.rotation.set(0, 0, Math.PI / 2)
      return
    }
    const list = passes(at, size)
    const i = Math.min(list.length - 1, Math.floor(p * list.length))
    const tip = alongPass(list[i], passPhase(p, i, list.length))
    g.position
      .copy(tip)
      .setY(tip.y + Math.abs(Math.sin(clock.elapsedTime * (12 - visc * 5))) * 0.02)
    // nghiêng cọ về phía mặt đang phết
    g.rotation.set(0, 0, i % 2 === 0 ? 0.5 : -0.5)
  })
  return (
    <group ref={ref}>
      <LubeBrush lube={lube} />
    </group>
  )
}

/** lò xo trong hộp: nằm ngang (trục x), gốc dời về giữa */
const SPRING_GEO = springGeometry(2.6, 18, 9, 0.25)
  .translate(0, -9, 0)
  .rotateZ(Math.PI / 2)
const springMat = (lubed: boolean) =>
  new THREE.MeshPhysicalMaterial({
    color: '#d6dae0',
    metalness: 1,
    roughness: lubed ? 0.05 : 0.3,
    clearcoat: lubed ? 1 : 0,
  })
const SPRING_DRY = springMat(false)
const SPRING_WET = springMat(true)
const SPRING_COLS = 8
const TMP = new THREE.Object3D()
/** số lò xo bay cùng lúc tối đa (mở cả mẻ switch 1 lần) */
const FLY_MAX = 24
/** chỗ lò xo thứ i trong hộp (toạ độ hộp): xếp hàng 8 con, đủ cả bộ (~104) vẫn vừa đáy hộp */
function springSpot(i: number, total: number) {
  const rows = Math.max(1, Math.ceil(total / SPRING_COLS))
  const r = Math.floor(i / SPRING_COLS)
  return v(
    ((i % SPRING_COLS) / (SPRING_COLS - 1) - 0.5) * (BOX.w - 0.8) + ((i * 37) % 7) * 0.012,
    0.12,
    rows > 1 ? (r / (rows - 1) - 0.5) * (BOX.d - 0.6) : 0,
  )
}

/**
 * Hộp lò xo kiểu "bag lube": mở mỗi switch thì lò xo của nó bay vào hộp (mở nắp sẵn).
 * Lube: nhỏ dầu GPL 105 → đóng nắp → lắc đều → mở nắp, lò xo bóng dầu
 */
function SpringShaker({
  lubed,
  oil,
  noOil,
  count,
  total,
}: {
  lubed: boolean
  oil: string
  noOil: boolean
  /** số lò xo đã nằm trong hộp (= số switch đã mở) */
  count: number
  total: number
}) {
  const bottleModel = useMemo(() => createOilBottle(oil), [oil])
  const boxBase = useGLTF(`${LUBE_MODEL}/spring-box-base.glb`).scene
  const boxLid = useGLTF(`${LUBE_MODEL}/spring-box-lid.glb`).scene
  const trayModel = useGLTF(`${LUBE_MODEL}/spring-tray.glb`).scene
  const box = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const springs = useRef<THREE.InstancedMesh>(null)
  const flying = useRef<THREE.InstancedMesh>(null)
  const bottle = useRef<THREE.Group>(null)
  const drops = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const p = animProgress('spring')
    const t = p ?? 0
    const active = p !== null
    const e = clock.elapsedTime
    // nắp mở sẵn; lube: đóng (0.22 → 0.32), lắc (0.34 → 0.84), mở lại (0.86 → 0.96)
    if (lid.current)
      lid.current.rotation.x = -1.9 * (1 - ease(seg(t, 0.22, 0.32)) + ease(seg(t, 0.86, 0.96)))
    const shaking = active && t > 0.34 && t < 0.84
    // cả bộ lò xo trong hộp, nảy theo nhịp lắc
    const sp = springs.current
    if (sp) {
      const o = TMP
      sp.count = count
      sp.material = lubed || (active && t > 0.3) ? SPRING_WET : SPRING_DRY
      for (let i = 0; i < count; i++) {
        o.position.copy(springSpot(i, total))
        if (shaking)
          o.position.add(
            v(Math.sin(e * 40 + i) * 0.08, Math.abs(Math.sin(e * 30 + i * 2)) * 0.12, 0),
          )
        o.rotation.set(
          0,
          (((i * 53) % 9) - 4) * 0.08 + (shaking ? Math.sin(e * 20 + i) * 0.6 : 0),
          0,
        )
        o.scale.setScalar(U * IN_BOX)
        o.updateMatrix()
        sp.setMatrixAt(i, o.matrix)
      }
      sp.instanceMatrix.needsUpdate = true
    }
    // mở switch: housing trên bật ra xong thì lò xo cả mẻ bay nối đuôi từ đồ mở vào chỗ trống kế tiếp trong hộp
    const f = flying.current
    if (f) {
      const q = animProgress('open')
      const n = Math.min(FLY_MAX, useGame.getState().lubeAnim?.batch ?? 1)
      f.visible = q !== null && q > 0.5
      if (f.visible) {
        const from = OPENER_AT.clone().add(v(0, (OPENER_SEAT - 2) * U, 0))
        f.count = n
        for (let j = 0; j < n; j++) {
          const go = ease(seg(q!, 0.5 + (j / n) * 0.2, 0.8 + (j / n) * 0.2))
          TMP.position
            .lerpVectors(from, BOX_AT.clone().add(springSpot(count + j, total)), go)
            .add(v(0, Math.sin(go * Math.PI) * 1.2, 0))
          TMP.rotation.set(0, 0, 0)
          TMP.scale.setScalar(U * (1 - (1 - IN_BOX) * go))
          TMP.updateMatrix()
          f.setMatrixAt(j, TMP.matrix)
        }
        f.instanceMatrix.needsUpdate = true
      }
    }
    // lọ dầu nghiêng nhỏ giọt vào hộp (0.02 → 0.2)
    const pour = seg(t, 0.02, 0.2)
    if (bottle.current) {
      bottle.current.position.lerpVectors(
        BOTTLE_AT,
        BOX_AT.clone().add(v(0.8, BOX.h + 0.6, 0)),
        Math.sin(pour * Math.PI) > 0 ? Math.min(1, pour * 3) * (1 - seg(t, 0.18, 0.22)) : 0,
      )
      bottle.current.rotation.z = Math.sin(pour * Math.PI) * 1.9
    }
    if (drops.current) {
      drops.current.visible = pour > 0.25 && pour < 1
      drops.current.children.forEach((d, i) => {
        const k = (pour * 3 + i * 0.33) % 1
        d.position.set(0.55, BOX.h + 0.35 - k * (BOX.h + 0.2), 0)
      })
    }
    const b = box.current
    if (b) {
      if (shaking) {
        b.position.set(
          BOX_AT.x + Math.sin(e * 55) * 0.14,
          BOX_AT.y + Math.abs(Math.sin(e * 27)) * 0.18,
          BOX_AT.z + Math.cos(e * 41) * 0.06,
        )
        b.rotation.set(Math.cos(e * 48) * 0.18, 0, Math.sin(e * 44) * 0.35)
      } else {
        b.position.copy(BOX_AT)
        b.rotation.set(0, 0, 0)
      }
    }
  })
  return (
    <>
      <group ref={box} position={BOX_AT}>
        {/* Model hộp nhựa hai nửa từ Innerscene; nắp quay quanh bản lề phía sau */}
        <primitive object={boxBase} scale={BOX_SCALE} />
        <group ref={lid} position={[0, BOX.h + 0.02, -BOX.d / 2]}>
          <primitive
            object={boxLid}
            position-z={BOX.d / 2}
            rotation-x={Math.PI}
            scale={BOX_SCALE}
          />
          <Text
            position={[0, 0.1, BOX.d / 2]}
            rotation-x={-Math.PI / 2}
            fontSize={0.25}
            color="#294d64"
            anchorX="center"
          >
            LẮC LÒ XO
          </Text>
        </group>
        <instancedMesh ref={springs} args={[SPRING_GEO, SPRING_DRY, total]} />
        <group ref={drops} visible={false}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshPhysicalMaterial
                color={SUPPLIES[oil].color}
                transmission={0.8}
                roughness={0.05}
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      </group>
      <primitive object={trayModel} position={TRAY_AT} scale={TRAY_SCALE} />
      {/* lọ dầu nhỏ giọt (hết dầu thì để ô trống ở bàn chính) */}
      {!noOil && (
        // cùng mẫu lọ với ảnh Shopii (có nhãn tên dầu)
        <group ref={bottle} position={BOTTLE_AT}>
          <primitive object={bottleModel} />
        </group>
      )}
      <instancedMesh
        ref={flying}
        args={[SPRING_GEO, SPRING_DRY, FLY_MAX]}
        visible={false}
        frustumCulled={false}
      />
    </>
  )
}

// ---------------- Bàn lube switch ----------------
export function LubeStation() {
  const ctx = useCtx()
  const build = useBuild()
  const type = useGame((s) => s.inventory.switch?.type)
  const pick = useGame((s) => s.lubePick)
  const anim = useGame((s) => s.lubeAnim)
  const { lubeBatch, lubeSprings, openSwitch } = useGame.getState()
  const opened = build.opened ?? build.lubed
  const opener = useGame((s) => TOOLS.opener[s.tools.opener])
  // số con mỗi mẻ lube / mỗi lần mở = bậc thợ + phép lube / phép mở switch (nếu còn lượt)
  const certN = useGame((s) =>
    spellRun(TOOLS.cert[s.tools.cert ?? 0].n ?? 1, spellBonus(s.supplies, SPELL_LUBE)),
  )
  const openN = useGame((s) =>
    spellRun(TOOLS.cert[s.tools.cert ?? 0].n ?? 1, spellBonus(s.supplies, SPELL_OPEN)),
  )
  const openerAt = openerSlots(openN).at
  const noOpener = !!opener.none
  const total = ctx.keys.length
  const grid = useMemo(() => switchGrid(total), [total])
  const lubed = lubedIds(build)
  // con chưa lube đầu tiên (mũi tên chỉ); đang lube thì cọ + mỡ ở con được bấm
  const firstDry = Array.from({ length: opened }, (_, i) => i).find((i) => !lubed.includes(i))
  const nextAt = grid.at(
    anim?.kind === 'switch' && anim.idx !== undefined ? anim.idx : (firstDry ?? 0),
  )
  const k = ctx.width / 12
  const busy = !!anim

  // đồ còn thiếu: ô nét đứt xanh như bàn mod stab, bấm để mở Shopii đúng mục
  const supplies = useGame((s) => s.supplies)
  const noBrush = useGame((s) => TOOLS.brush[s.tools.brush].none)
  const openShop = useGame((s) => s.openShop)
  const noGrease =
    build.lubed < total && anim?.kind !== 'switch' && (supplies[pick.switch] ?? 0) <= 0
  const noOil = !build.springLube && anim?.kind !== 'spring' && (supplies[pick.spring] ?? 0) < total

  // mũi tên xanh chỉ việc tiếp theo: mở hết switch trước (chưa có đồ mở thì lube luôn con đã mở), rồi lube từng mẻ, cuối cùng lắc lò xo
  const canLube = !busy && opened > build.lubed && build.lubed < total
  // số con 1 mẻ lube thật (giống lubeBatch): còn giới hạn bởi số con chờ lube + mỡ còn lại
  const lubeN = Math.min(opener.n ?? 1, certN, opened - build.lubed, supplies[pick.switch] ?? 0)
  const left = opened - build.lubed
  const hint: [number, number, number] | null = busy
    ? null
    : opened < total && !noOpener
      ? [openerAt[0].x, TABLE + 30 * U, openerAt[0].z]
      : build.lubed < total && left > 0 && !noGrease && !noBrush
        ? [nextAt.x, nextAt.y + (SWITCH_CAD.stemTop + RAISE + 1) * U * grid.size, nextAt.z]
        : opened >= total && !build.springLube && !noOil
          ? [BOX_AT.x, TABLE + BOX.h + 0.2, BOX_AT.z]
          : null

  // âm thanh: cọ quét / lắc hộp lạch cạch
  useEffect(() => {
    if (!anim) return
    if (anim.kind === 'switch') playBrush()
    if (anim.kind === 'open') setTimeout(() => playClick(2400), anim.dur * 300)
    if (anim.kind === 'spring') {
      const ts = Array.from({ length: 10 }, (_, i) =>
        setTimeout(() => playClick(1800 + (i % 3) * 400), anim.dur * 1000 * (0.58 + i * 0.033)),
      )
      return () => ts.forEach(clearTimeout)
    }
  }, [anim])

  // save cũ: switch của đơn bị bán mất cả loại → không bày bàn lube (bảng bên báo hết switch)
  if (!type) return null
  return (
    <StationTable k={k} w={14} d={12.5}>
      {/* switch nguyên trên đồ mở: click để tách housing, stem và lò xo */}
      {noOpener ? (
        <MissingSlot
          at={OPENER_AT}
          size={[1.2, 1.2]}
          label="Thiếu đồ mở switch"
          onAct={() => openShop('tool')}
        />
      ) : (
        <Clickable active={!busy && opened < total} onAct={() => openSwitch()}>
          <SwitchOpener type={type} left={total - opened} n={openN} />
        </Clickable>
      )}
      {/* switch đã mở bày ở hàng trước, đủ số con đã mở: bấm vào để lube 1 mẻ */}
      <Clickable active={canLube} outline={false} onAct={(e) => lubeBatch(switchHit(e))}>
        <OpenedSwitches
          active={canLube}
          type={type}
          total={total}
          opened={opened}
          lubed={lubed}
          batch={lubeN}
          lube={build.lubeType ?? null}
        />
      </Clickable>
      {anim?.kind === 'switch' && (
        <LiveGrease key={anim.at} lube={anim.lube} at={nextAt} size={grid.size} />
      )}

      {/* hộp lò xo: mở switch nào lò xo vào hộp con đó, mở hết thì click để lắc lube */}
      <Clickable active={!busy && !build.springLube && opened >= total} onAct={() => lubeSprings()}>
        <SpringShaker
          lubed={!!build.springLube}
          oil={pick.spring}
          noOil={noOil}
          count={opened}
          total={total}
        />
      </Clickable>
      {noOil && (
        <MissingSlot
          at={BOTTLE_AT}
          size={[0.8, 0.8]}
          label={`Thiếu ${SUPPLIES[pick.spring].name}`}
          onAct={() => openShop('supply')}
        />
      )}

      {noGrease ? (
        <MissingSlot
          at={JAR_AT}
          size={[1.2, 1.2]}
          label={`Thiếu ${SUPPLIES[pick.switch].name}`}
          onAct={() => openShop('supply')}
        />
      ) : (
        <LubeJar lube={pick.switch} position={JAR_AT} scale={0.65} />
      )}
      {noBrush ? (
        <MissingSlot
          at={BRUSH_IDLE.clone()
            .setY(TABLE)
            .add(v(-0.9, 0, 0))}
          size={[2, 0.45]}
          label="Thiếu cọ lube"
          onAct={() => openShop('tool')}
        />
      ) : (
        <SwitchBrush
          lube={anim?.kind === 'switch' ? anim.lube : undefined}
          at={nextAt}
          size={grid.size}
        />
      )}
      {hint && <HintArrow at={hint} />}
    </StationTable>
  )
}
