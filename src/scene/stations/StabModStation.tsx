import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, useBuild, useCtx, type StabModKind } from '@/store'
import { STABS } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { stabModRules } from '@/data/mods'
import stabModel from '@/data/stabModel.json'
import { playBrush, playClick } from '@/sound'
import { useHover } from '../common/useHover'
import { MM } from '../models/Switch'
import { CAD, StabHousingCad, StabStemCad, StabWireCad } from '../models/Stabilizer'
import {
  Clipper,
  GreaseStroke,
  LubeBrush,
  Scissors,
  URGO,
  UrgoEnd,
  UrgoPad,
  WireGrease,
  setJaw,
  wireGreaseCurve,
  type Stroke,
} from '../models/ModTools'
import { StationTable, alongPass, ease, passPhase, seg } from './StationKit'

// ---------- bố cục bàn mod (đơn vị u của bàn, gốc ở giữa bàn) ----------
const B = 2.5 // phóng to stab để dễ nhìn
const U = B * MM // 1mm của stab trên bàn
const TABLE = -0.55 // mặt bàn
const SPAN_MM = stabModel.spans['2.25u'] // dùng dây 2.25u trên bàn mod
// Bố cục 3 khu: trái = dụng cụ (băng Urgo, kéo, kìm, cọ) · giữa = 2 slider · phải = 2 housing + dây
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const CX = 2.6
const HX = [CX - SPAN_MM * U, CX + SPAN_MM * U] // tâm 2 housing
const HZ = -1.3
const STEM_LIE = [
  v(-0.5, TABLE + CAD.stem.halfW * U, -1.9),
  v(-0.5, TABLE + CAD.stem.halfW * U, -0.95),
] // slider nằm trên bàn
const STEM_SEAT = HX.map((x) => v(x, TABLE, HZ)) // slider đã lắp vào housing
const WIRE_LIE = v(CX, TABLE - (CAD.wireHoleY - CAD.wireR) * U, 1.25) // dây nằm trên bàn
const WIRE_SEAT = v(CX, TABLE, HZ) // dây đã tra vào ngàm
const BAND = v(-3.85, TABLE + 0.03, -2) // băng Urgo trên bàn
const PAD_AWAY = v(-1.3, TABLE + 0.03, 0.75) // phần gạc bỏ đi
const SCISSORS_IDLE = v(-3.85, TABLE + 0.04, -0.7)
const CLIPPER_IDLE = v(-4.6, TABLE + 0.06, 0.6)
const BRUSH_IDLE = v(-2.4, TABLE + 0.1, 1.9) // mũi cọ; cán nằm dọc về bên trái
/** slider nằm: trục dọc slider (+y) quay về -x, mặt +x ngửa lên */
const lieToWorld = (i: number, [x, y, z]: [number, number, number]) =>
  STEM_LIE[i].clone().add(v(-y * U, x * U, z * U))
const HOLEE_Y = CAD.wireHoleY + CAD.wireR + 0.15

const ORDER: StabModKind[] = ['clip', 'bandaid', 'housing', 'assembled', 'wire', 'wired']

/** Tiến độ hoạt cảnh của 1 loại mod (null nếu không chạy). Đọc thẳng store để dùng trong useFrame */
function animProgress(kind: StabModKind) {
  const a = useGame.getState().stabAnim
  if (!a || a.kind !== kind) return null
  return Math.min(1, (performance.now() - a.at) / (a.dur * 1000))
}

// ---------- các đường phết mỡ (mm, trong khung của từng chi tiết) ----------
// Housing: phết dọc 2 thành trong của hốc (chỗ slider trượt), từ miệng hốc xuống sâu ~4mm, mỡ áp vào thành
const HOUSING_STROKES: Stroke[] = [-1, 1].map((sx) => ({
  a: [sx * (CAD.cavityHalfW - 0.02), CAD.housingTop - 0.3, 0],
  b: [sx * (CAD.cavityHalfW - 0.02), CAD.housingTop - 4.2, 0],
  n: [-sx, 0, 0],
  w: 2.6,
}))
// Slider: chỉ phết thân (phần trượt trong housing), tránh chữ thập phía trên và lỗ dây / Holee phía dưới
const STEM_STROKES: Stroke[] = [-1.3, 1.3].map((z) => ({
  a: [CAD.stem.halfW + 0.02, CAD.stem.bodyTop - 0.3, z],
  b: [CAD.stem.halfW + 0.02, 3, z],
  n: [1, 0, 0],
  w: 1.5,
}))

/** Các nét quét theo thứ tự cọ đi: danh sách điểm trên bàn mà mũi cọ chạy qua */
interface Pass {
  key: string
  points: THREE.Vector3[]
}
type P3 = [number, number, number]
const housingToWorld = (hx: number, [x, y, z]: P3) => v(hx + x * U, TABLE + y * U, HZ + z * U)
const HOUSING_PASSES: Pass[] = [
  ...HX.flatMap((hx, i) =>
    HOUSING_STROKES.map((s, j) => ({
      key: `h${i}${j}`,
      points: [housingToWorld(hx, s.a), housingToWorld(hx, s.b)],
    })),
  ),
  ...[0, 1].flatMap((i) =>
    STEM_STROKES.map((s, j) => ({
      key: `s${i}${j}`,
      points: [lieToWorld(i, s.a), lieToWorld(i, s.b)],
    })),
  ),
]
// dây: cọ chạy dọc đường tâm (móc → góc uốn → thanh ngang) ở mỗi bên
const WIRE_PASSES: Pass[] = ([-1, 1] as const).map((side, j) => ({
  key: `w${j}`,
  points: wireGreaseCurve(side, SPAN_MM)
    .getSpacedPoints(24)
    .map((p) => WIRE_LIE.clone().add(p.multiplyScalar(U))),
}))
const PASSES = { housing: HOUSING_PASSES, wire: WIRE_PASSES }

/** Vùng click được: đổi con trỏ */
function Clickable({
  active,
  onAct,
  children,
}: {
  active: boolean
  onAct: () => void
  children: ReactNode
}) {
  const { bind } = useHover(active)
  return (
    <group
      {...bind}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (!active) return
        e.stopPropagation()
        onAct()
      }}
    >
      {children}
    </group>
  )
}

/** Mũi tên vàng nhấp nhô chỉ thao tác tiếp theo */
function HintArrow({ at }: { at: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = at[1] + 0.15 + Math.sin(clock.elapsedTime * 4) * 0.08
  })
  return (
    <mesh ref={ref} position={at} rotation-x={Math.PI}>
      <coneGeometry args={[0.12, 0.3, 12]} />
      <meshBasicMaterial color="#ffcc2e" />
    </mesh>
  )
}

type Progress = Record<string, MutableRefObject<number>>

interface StemProps {
  i: number
  model: string
  feet: boolean
  lubed: boolean
  holee: boolean
  assembled: boolean
  grease: string | null
  progress: Progress
}

/** Slider: nằm trên bàn → (cắt chân, Holee, phết mỡ) → dựng lên và thả vào housing */
function MovingStem({ i, model, feet, lubed, holee, assembled, grease, progress }: StemProps) {
  const ref = useRef<THREE.Group>(null)
  const feetRef = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const lie = STEM_LIE[i]
    const seat = STEM_SEAT[i]
    const p = animProgress('assembled')
    if (p !== null) {
      const up = ease(seg(p, 0, 0.55))
      g.position
        .lerpVectors(lie, seat.clone().setY(seat.y + 1.3), up)
        .lerp(seat, ease(seg(p, 0.55, 1)))
      g.rotation.z = (Math.PI / 2) * (1 - up)
    } else {
      g.position.copy(assembled ? seat : lie)
      g.rotation.z = assembled ? 0 : Math.PI / 2
    }
    const c = animProgress('clip')
    if (feetRef.current)
      feetRef.current.visible = feet && !(c !== null && c > (i === 0 ? 0.22 : 0.72))
  })
  return (
    <group ref={ref}>
      <group scale={U}>
        <StabStemCad model={model} lubed={lubed} holee={holee} />
        <group ref={feetRef}>
          {[-1.3, 1.3].map((x) => (
            <mesh key={x} position={[x, -0.75, 0]}>
              <boxGeometry args={[0.9, 1.8, 1]} />
              <meshStandardMaterial color={STABS[model].stem} />
            </mesh>
          ))}
        </group>
        {grease &&
          STEM_STROKES.map((s, j) => (
            <GreaseStroke key={j} lube={grease} stroke={s} progress={progress[`s${i}${j}`]} />
          ))}
      </group>
    </group>
  )
}

/** Dây stab: nằm trên bàn → nhấc lên → xỏ 2 đầu móc vào lỗ slider → ấn vào ngàm (bật nhẹ) */
function MovingWire({
  wired,
  lube,
  progress,
  onSnap,
}: {
  wired: boolean
  lube: string | null
  progress: Progress
  onSnap: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const snapped = useRef(false)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const p = animProgress('wired')
    if (p === null) {
      snapped.current = false
      g.position.copy(wired ? WIRE_SEAT : WIRE_LIE)
      return
    }
    const above = v(CX, WIRE_SEAT.y + 0.45, HZ + 0.9)
    const front = v(CX, WIRE_SEAT.y + 0.12, HZ)
    g.position
      .lerpVectors(WIRE_LIE, above, ease(seg(p, 0, 0.35)))
      .lerp(front, ease(seg(p, 0.35, 0.7)))
    const snap = seg(p, 0.7, 1)
    if (snap > 0)
      g.position.y =
        front.y +
        (WIRE_SEAT.y - front.y) * Math.min(1, snap * 1.6) -
        Math.sin(snap * Math.PI) * 0.03
    if (snap > 0.6 && !snapped.current) {
      snapped.current = true
      onSnap()
    }
  })
  return (
    <group ref={ref}>
      <group scale={U}>
        <StabWireCad spanMm={SPAN_MM} />
        {lube &&
          ([-1, 1] as const).map((side, j) => (
            <WireGrease
              key={side}
              lube={lube}
              spanMm={SPAN_MM}
              side={side}
              progress={progress[`w${j}`]}
            />
          ))}
      </group>
    </group>
  )
}

/** Cọ lube: đi theo từng nét phết (a → b rồi quét ngược lại), mỡ đặc quét chậm. Xong thì nằm lại trên bàn */
function AnimatedBrush() {
  const ref = useRef<THREE.Group>(null)
  const anim = useGame((s) => s.stabAnim)
  const kind = anim?.kind === 'housing' || anim?.kind === 'wire' ? anim.kind : null
  const lube = kind ? anim!.lube : undefined
  const visc = lube ? (SUPPLIES[lube].viscosity ?? 0.5) : 0
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const p = kind ? animProgress(kind) : null
    if (p === null || !kind) {
      g.position.copy(BRUSH_IDLE)
      g.rotation.set(0, 0, Math.PI / 2)
      return
    }
    const passes = PASSES[kind]
    const i = Math.min(passes.length - 1, Math.floor(p * passes.length))
    const tip = alongPass(passes[i].points, passPhase(p, i, passes.length))
    // ấn cọ xuống nhẹ theo nhịp, mỡ đặc ấn sâu hơn
    g.position
      .copy(tip)
      .setY(tip.y + 0.03 + Math.abs(Math.sin(clock.elapsedTime * (12 - visc * 5))) * 0.02)
    g.rotation.set(0, 0, -0.6)
  })
  return (
    <group ref={ref}>
      <LubeBrush lube={lube} />
    </group>
  )
}

/** Kìm cắt: kẹp chân slider 0 rồi slider 1, chân bị cắt rơi xuống bàn */
function AnimatedClipper() {
  const ref = useRef<THREE.Group>(null)
  const pieces = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.rotation.set(0, Math.PI, 0)
    const p = animProgress('clip')
    if (p === null) {
      g.position.copy(CLIPPER_IDLE)
      setJaw(g.children[0], 1, 0.08, 0.25)
      if (pieces.current) pieces.current.visible = false
      return
    }
    const half = p < 0.5 ? 0 : 1
    const q = seg(p, half * 0.5, half * 0.5 + 0.5)
    const foot = lieToWorld(half, [0, -0.75, 0]).add(v(0.25, 0, 0))
    g.position
      .lerpVectors(CLIPPER_IDLE, foot, ease(seg(q, 0, 0.4)))
      .lerp(CLIPPER_IDLE, ease(seg(q, 0.6, 1)))
    setJaw(
      g.children[0],
      q < 0.4 ? 1 : q < 0.5 ? 1 - seg(q, 0.4, 0.5) : seg(q, 0.5, 0.6),
      0.08,
      0.25,
    )
    if (pieces.current) {
      pieces.current.visible = q > 0.45
      const fall = seg(q, 0.45, 0.9)
      pieces.current.position.set(
        foot.x - 0.15 + fall * 0.25,
        foot.y - fall * (foot.y - TABLE - 0.02),
        foot.z,
      )
      pieces.current.rotation.z = fall * 2
    }
  })
  return (
    <>
      <group ref={ref}>
        <Clipper />
      </group>
      <group ref={pieces} visible={false}>
        {[-0.1, 0.1].map((z) => (
          <mesh key={z} position-z={z}>
            <boxGeometry args={[0.9 * U, 1.8 * U, 1 * U]} />
            <meshStandardMaterial color="#f2f2f2" />
          </mesh>
        ))}
      </group>
    </>
  )
}

/**
 * Holee mod: gỡ giấy lót → kéo cắt lấy 2 đầu dính (bỏ phần gạc giữa) →
 * dán từng mảnh vào cạnh trên lỗ cắm dây của 2 slider
 */
function HoleeBandage({ applied }: { applied: boolean }) {
  const ends = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const pad = useRef<THREE.Group>(null)
  const papers = useRef<THREE.Group>(null)
  const scissors = useRef<THREE.Group>(null)
  const endHome = [-1, 1].map((s) =>
    BAND.clone().add(v(s * (URGO.padLen / 2 + URGO.endLen / 2), 0, 0)),
  )
  // vị trí mảnh Holee trên slider đang nằm (cạnh trên lỗ dây)
  const holeAt = [0, 1].map((i) => lieToWorld(i, [0, HOLEE_Y, 0]))
  useFrame(() => {
    const p = animProgress('bandaid')
    const t = p ?? (applied ? 1 : 0)
    // giấy lót trượt ra 2 bên
    const peel = ease(seg(t, 0, 0.12))
    papers.current?.children.forEach((m, i) => {
      const side = i === 0 ? -1 : 1
      m.visible = peel < 1
      m.position.set(side * (0.66 + peel * 1.4), -0.02 - peel * 0.04, 0)
    })
    // kéo cắt 2 đường giữa đầu dính và gạc
    const sc = scissors.current
    if (sc) {
      const cut1 = BAND.clone().add(v(-URGO.padLen / 2, 0.05, 0.6))
      const cut2 = BAND.clone().add(v(URGO.padLen / 2, 0.05, 0.6))
      sc.position.lerpVectors(SCISSORS_IDLE, cut1, ease(seg(t, 0.12, 0.2)))
      if (t > 0.2) sc.position.lerpVectors(cut1, cut2, ease(seg(t, 0.25, 0.32)))
      if (t > 0.37) sc.position.lerpVectors(cut2, SCISSORS_IDLE, ease(seg(t, 0.37, 0.45)))
      sc.rotation.set(0, Math.PI / 2, 0)
      const snip = (a: number) => Math.sin(seg(t, a, a + 0.05) * Math.PI) // khép rồi mở
      setJaw(sc.children[0], 1 - Math.max(snip(0.2), snip(0.32)), 0.04, 0.3)
    }
    // phần gạc bị bỏ sang một bên
    pad.current?.position.lerpVectors(BAND, PAD_AWAY, ease(seg(t, 0.42, 0.5)))
    // 2 đầu dính bay tới lỗ dây của slider, thu nhỏ vừa cạnh lỗ
    ends.forEach((r, i) => {
      const g = r.current
      if (!g) return
      const f = ease(seg(t, 0.5 + i * 0.25, 0.75 + i * 0.25))
      g.visible = f < 1
      g.position
        .lerpVectors(endHome[i], holeAt[i].clone().setY(holeAt[i].y + 0.6), Math.min(1, f * 1.4))
        .lerp(holeAt[i], seg(f, 0.7, 1))
      g.rotation.z = (Math.PI / 2) * f
      g.scale.set(1 - f * 0.5, 1, 1 + f * 0.15)
    })
  })
  return (
    <>
      <group ref={papers} position={BAND}>
        {!applied &&
          [-1, 1].map((s) => (
            <mesh key={s} position-x={s * 0.66}>
              <boxGeometry args={[1.32, 0.008, 0.88]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
      </group>
      {ends.map((r, i) => (
        <group key={i} ref={r} position={endHome[i]} visible={!applied}>
          <UrgoEnd side={i === 0 ? -1 : 1} />
        </group>
      ))}
      <group ref={pad} position={applied ? PAD_AWAY : BAND}>
        <UrgoPad />
      </group>
      <group ref={scissors} position={SCISSORS_IDLE}>
        <Scissors />
      </group>
    </>
  )
}

// ---------------- Bàn mod stab ----------------
export function StabModStation() {
  const ctx = useCtx()
  const mods = useBuild().stabMods
  const model = useGame((s) => s.inventory.stab!.type)
  const anim = useGame((s) => s.stabAnim)
  const modStab = useGame((s) => s.modStab)
  const m = STABS[model]
  const rules = stabModRules(model)
  const rule = (k: StabModKind) => rules.find((r) => r.kind === k)!
  const k = ctx.width / 12
  const busy = !!anim
  // thao tác nên làm tiếp theo (mũi tên vàng)
  const next = ORDER.find((kind) => rule(kind).needed && rule(kind).allowed && !mods[kind])

  // âm thanh khi bắt đầu hoạt cảnh
  useEffect(() => {
    if (!anim) return
    if (anim.kind === 'housing' || anim.kind === 'wire' || anim.kind === 'bandaid') playBrush()
    if (anim.kind === 'clip') playClick(3200)
    if (anim.kind === 'assembled') {
      const t = setTimeout(() => playClick(900), anim.dur * 900)
      return () => clearTimeout(t)
    }
  }, [anim])

  // tiến độ hiện mỡ cho từng nét: chạy theo cọ khi đang phết, đủ 100% khi đã xong
  const progress = useMemo<Progress>(() => {
    const map: Progress = {}
    for (const pass of [...HOUSING_PASSES, ...WIRE_PASSES]) map[pass.key] = { current: 1 }
    return map
  }, [])
  useFrame(() => {
    for (const kind of ['housing', 'wire'] as const) {
      const p = animProgress(kind)
      PASSES[kind].forEach((pass, i, all) => {
        progress[pass.key].current = p === null ? 1 : seg(passPhase(p, i, all.length), 0, 0.55)
      })
    }
  })

  const act = (kind: StabModKind) => () => {
    if (!busy) modStab(kind)
  }
  const lubeOf = (kind: 'housing' | 'wire') =>
    mods[kind] ?? (anim?.kind === kind ? anim.lube! : null)
  const housingLube = lubeOf('housing')
  const hint: Record<StabModKind, [number, number, number]> = {
    clip: [STEM_LIE[0].x + 0.3, TABLE + 0.7, STEM_LIE[0].z],
    bandaid: [BAND.x, TABLE + 0.6, BAND.z],
    housing: [CX, TABLE + CAD.housingTop * U + 0.6, HZ],
    assembled: [STEM_LIE[0].x - 0.7, TABLE + 0.7, (STEM_LIE[0].z + STEM_LIE[1].z) / 2],
    wire: [CX, TABLE + 0.6, WIRE_LIE.z + 0.6],
    wired: [CX, TABLE + 1.1, HZ + 0.6],
  }

  return (
    <StationTable k={k} w={11} d={6.4} color="#3b4a3d">
      {/* băng Urgo + kéo (Holee mod) */}
      <Clickable active={!busy && !mods.bandaid && !mods.assembled} onAct={act('bandaid')}>
        <HoleeBandage applied={mods.bandaid} />
      </Clickable>

      {/* 2 housing: click để phết mỡ (hoặc lắp slider nếu đã phết) */}
      <Clickable
        active={!busy && !mods.assembled}
        onAct={act(mods.housing || m.prelubed ? 'assembled' : 'housing')}
      >
        {HX.map((x, i) => (
          <group key={x} position={[x, TABLE, HZ]} scale={U}>
            <StabHousingCad model={model} lubed={!!mods.housing || m.prelubed} />
            {housingLube &&
              HOUSING_STROKES.map((s, j) => (
                <GreaseStroke
                  key={j}
                  lube={housingLube}
                  stroke={s}
                  progress={progress[`h${i}${j}`]}
                />
              ))}
          </group>
        ))}
      </Clickable>

      {/* 2 slider: click để cắt chân (Cherry) hoặc lắp vào housing */}
      <Clickable
        active={!busy && !mods.assembled}
        onAct={act(rule('clip').needed && !mods.clip ? 'clip' : 'assembled')}
      >
        {[0, 1].map((i) => (
          <MovingStem
            key={i}
            i={i}
            model={model}
            feet={m.feet && !mods.clip}
            lubed={!!mods.housing || m.prelubed}
            holee={mods.bandaid}
            assembled={mods.assembled}
            grease={housingLube}
            progress={progress}
          />
        ))}
      </Clickable>

      {/* dây stab: click để phết mỡ, rồi tra vào slider + ngàm */}
      <Clickable active={!busy && !mods.wired} onAct={act(mods.wire ? 'wired' : 'wire')}>
        <MovingWire
          wired={mods.wired}
          lube={lubeOf('wire')}
          progress={progress}
          onSnap={() => playClick(1600)}
        />
      </Clickable>

      {/* dụng cụ */}
      <AnimatedBrush />
      {m.feet && <AnimatedClipper />}
      {mods.clip && (
        // chân stem đã cắt nằm trên bàn
        <group position={[STEM_LIE[1].x - 0.9, TABLE + 0.02, STEM_LIE[1].z + 0.75]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[i * 0.08, 0, (i % 2) * 0.1]} rotation-z={Math.PI / 2}>
              <boxGeometry args={[0.9 * U, 1.8 * U, 1 * U]} />
              <meshStandardMaterial color={m.stem} />
            </mesh>
          ))}
        </group>
      )}

      {!busy && next && <HintArrow at={hint[next]} />}
    </StationTable>
  )
}
