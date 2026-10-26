import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, useBuild, useCtx, type StabModKind } from '@/store'
import { STABS, TOOLS } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { stabModRules } from '@/data/mods'
import { stabUnits, type StabSet } from '@/data/steps'
import { playBrush, playClick } from '@/sound'
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
  setScissors,
  wireGreaseCurve,
  type Stroke,
} from '../models/ModTools'
import { LubeJar } from '../models/LubeJar'
import {
  Clickable,
  HintArrow,
  Label,
  MissingSlot,
  StationTable,
  alongPass,
  ease,
  passPhase,
  seg,
} from './StationKit'

// ---------- bố cục bàn mod (đơn vị u của bàn, gốc ở giữa bàn) ----------
const B = 2 // phóng to stab để dễ nhìn
const U = B * MM // 1mm của stab trên bàn
const TABLE = -0.55 // mặt bàn
/** mặt bàn tối thiểu; nhiều stab thì nới theo lưới (xem layoutSets) */
const TABLE_MIN = { w: 14, d: 9.6 }
// Bố cục: cột trái = băng Urgo, kéo, kìm · giữa = đúng số stab của layout (2 housing + 2 slider + dây mỗi bộ),
// xếp lưới: stab ngắn 2 cột (3 cột khi > 4 cái), stab dài mỗi cái 1 hàng · cột phải = hũ mỡ + cọ
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
/** Cherry chưa cắt chân: 2 mấu chân (tới y = -1.65mm) chống slider cao lên */
const FEET_RAISE = 1.8 * U
const STEM_TOP_Y = TABLE + (CAD.stem.top + 1.65) * U // đỉnh slider khi còn chân
const BAND = v(-4.9, TABLE + 0.03, -4) // băng Urgo đầu tiên, các băng sau xếp về phía trước
const BAND_STEP = 0.7
const PAD_AWAY = v(-7.3, TABLE + 0.03, -1.6) // phần gạc bỏ đi: để cạnh kéo (góc trái)
// kéo (góc trái) và kìm (cạnh stem) nằm dọc, mũi chĩa ra sau, 2 mũi thẳng hàng ở TIP_Z (trong khung trắng):
// mũi kéo cách đinh tán 0.68, mũi kìm cách chốt 0.65
const TIP_Z = -3.75
const SCISSORS_IDLE = v(-7.5, TABLE + 0.04, TIP_Z + 0.68)
// nằm dọc giữa băng Urgo và cột slider đầu tiên, mũi chĩa lên (−z)
const CLIPPER_IDLE = v(-2.95, TABLE + 0.09, TIP_Z + 0.45)
/** góc kìm lúc nằm chờ / lúc kẹp chân (đều mũi −z: nằm dọc, đưa từ phía trước vào) */
const CLIPPER_ROT_IDLE = Math.PI / 2
const CLIPPER_ROT_CUT = Math.PI / 2
/** lưới bày stab: tâm hàng đầu, bước hàng, tâm các cột stab ngắn, tâm stab dài */
const ROW0 = -3.3
// wire của mỗi bộ nằm trước housing (hz + 2, dài ~1.2): bước hàng đủ xa để không đè housing hàng sau
const ROW_STEP = 4.2
const SHORT_CX = [0.3, 4.6, 8.9]
const LONG_CX = 2
const HOLEE_Y = CAD.wireHoleY + CAD.wireR + 0.15

/** Vị trí 1 bộ stab mẫu trên bàn */
interface SetLayout extends StabSet {
  g: number
  cx: number
  hz: number
  /** tâm 2 housing */
  hx: [number, number]
  /** slider dựng đứng (đáy thân ở y = 0.15mm) để phết được cả 2 mặt; bản còn chân đứng cao hơn */
  stand: THREE.Vector3[]
  standFeet: THREE.Vector3[]
  /** slider đã lắp vào housing */
  seat: THREE.Vector3[]
  wireLie: THREE.Vector3
  wireSeat: THREE.Vector3
  band: THREE.Vector3
}

/** Vị trí mỗi stab + kích thước bàn + chỗ đặt hũ mỡ / cọ (cột phải, sau mép phải của các bộ) */
function layoutSets(sets: StabSet[]) {
  const shorts = sets.filter((s) => !s.long).length
  const cols = shorts > 4 ? 3 : 2
  const shortRows = Math.ceil(shorts / cols)
  let si = 0
  let li = 0
  const list: SetLayout[] = sets.map((s, g) => {
    const row = s.long ? shortRows + li++ : Math.floor(si / cols)
    const hz = ROW0 + ROW_STEP * row
    const cx = s.long ? LONG_CX : SHORT_CX[si++ % cols]
    const half = s.spanMm * U
    const hx: [number, number] = [cx - half, cx + half]
    // stab ngắn: 2 slider đứng chồng bên trái housing · stab dài: mỗi slider đứng cạnh housing của nó (phía trong)
    const stand = s.long
      ? hx.map((x, i) => v(x + (i ? -1 : 1), TABLE - 0.15 * U, hz))
      : [-0.5, 0.5].map((dz) => v(hx[0] - 1, TABLE - 0.15 * U, hz + dz))
    return {
      ...s,
      g,
      cx,
      hz,
      hx,
      stand,
      standFeet: stand.map((p) => p.clone().setY(p.y + FEET_RAISE)),
      seat: hx.map((x) => v(x, TABLE, hz)),
      wireLie: v(cx, TABLE - (CAD.wireHoleY - CAD.wireR) * U, hz + 2),
      wireSeat: v(cx, TABLE, hz),
      band: BAND.clone().add(v(0, 0, g * BAND_STEP)),
    }
  })
  const right = Math.max(...list.map((L) => (L.long ? L.hx[1] + 0.6 : L.hx[1] + 0.8)))
  // mép trước: wire hàng cuối nằm ở hz + 2 và dài ~1.2, chừa thêm cho khung trắng của tấm lót
  const front = Math.max(...list.map((L) => L.hz)) + 3.8
  const toolX = right + 1
  return {
    layout: list,
    table: {
      w: 2 * Math.max(TABLE_MIN.w / 2, toolX + 2.6, -Math.min(CLIPPER_IDLE.x, SCISSORS_IDLE.x) + 1),
      d: 2 * Math.max(TABLE_MIN.d / 2, front),
    },
    // 2 hũ cách nhau đủ chỗ cho nhãn ("Housing + slider") nằm dưới hũ trước
    jars: [v(toolX + 0.7, TABLE, ROW0 + 0.3), v(toolX + 0.7, TABLE, ROW0 + 3.2)],
    // mũi cọ; cán nằm dọc về bên trái
    brush: v(toolX + 2, TABLE + 0.1, ROW0 + 5.6),
  }
}

/** toạ độ mm trên slider đứng (chưa tính chân) → toạ độ bàn */
const standToWorld = (L: SetLayout, i: number, [x, y, z]: [number, number, number]) =>
  L.stand[i].clone().add(v(x * U, y * U, z * U))

const ORDER: StabModKind[] = ['clip', 'bandaid', 'housing', 'assembled', 'wire', 'wired']

/** Tiến độ hoạt cảnh của 1 loại mod (null nếu không chạy). Đọc thẳng store để dùng trong useFrame */
function animProgress(kind: StabModKind) {
  const a = useGame.getState().stabAnim
  if (!a || a.kind !== kind) return null
  return Math.min(1, (performance.now() - a.at) / (a.dur * 1000))
}
/** dụng cụ làm lần lượt n phần việc: phần thứ mấy đang làm + tiến độ trong phần đó */
const slotOf = (p: number, n: number) => {
  const j = Math.min(n - 1, Math.floor(p * n))
  return [j, seg(p, j / n, (j + 1) / n)] as const
}

// ---------- các đường phết mỡ (mm, trong khung của từng chi tiết) ----------
// Housing: phết dọc 2 thành trong của hốc (chỗ slider trượt), từ miệng hốc xuống sâu ~4mm, mỡ áp vào thành
const HOUSING_STROKES: Stroke[] = [-1, 1].map((sx) => ({
  a: [sx * (CAD.cavityHalfW - 0.02), CAD.housingTop - 0.3, 0],
  b: [sx * (CAD.cavityHalfW - 0.02), CAD.housingTop - 4.2, 0],
  n: [-sx, 0, 0],
  w: 2.6,
}))
// Slider: phết thân ở cả 2 mặt trượt (±x, áp vào 2 thành hốc housing),
// tránh chữ thập phía trên và lỗ dây / Holee phía dưới
const STEM_STROKES: Stroke[] = [1, -1].flatMap((sx) =>
  [-1.3, 1.3].map((z) => ({
    a: [sx * (CAD.stem.halfW + 0.02), CAD.stem.bodyTop - 0.3, z],
    b: [sx * (CAD.stem.halfW + 0.02), 3, z],
    n: [sx, 0, 0],
    w: 1.5,
  })),
)

/** Các nét quét theo thứ tự cọ đi: danh sách điểm trên bàn mà mũi cọ chạy qua */
interface Pass {
  key: string
  points: THREE.Vector3[]
  /** nghiêng cán cọ quanh trục z: cán ngả ra phía ngoài mặt đang phết */
  tilt: number
  /** nét trên slider: nâng theo chân slider nếu chưa cắt */
  stem?: boolean
}
type P3 = [number, number, number]
type Passes = Record<'housing' | 'wire', Pass[]>

/** Nét phết của mọi bộ: cọ đi hết bộ này rồi sang bộ khác */
function buildPasses(layout: SetLayout[]): Passes {
  const housing = layout.flatMap((L) => {
    const toWorld = (hx: number, [x, y, z]: P3) => v(hx + x * U, TABLE + y * U, L.hz + z * U)
    return [
      ...L.hx.flatMap((hx, i) =>
        HOUSING_STROKES.map((s, j) => ({
          key: `${L.g}h${i}${j}`,
          points: [toWorld(hx, s.a), toWorld(hx, s.b)],
          tilt: -0.6,
        })),
      ),
      ...[0, 1].flatMap((i) =>
        STEM_STROKES.map((s, j) => ({
          key: `${L.g}s${i}${j}`,
          points: [standToWorld(L, i, s.a), standToWorld(L, i, s.b)],
          tilt: s.n[0] > 0 ? -0.6 : 0.6,
          stem: true,
        })),
      ),
    ]
  })
  // dây: cọ chạy dọc đường tâm (móc → góc uốn → thanh ngang) ở mỗi bên
  const wire = layout.flatMap((L) =>
    ([-1, 1] as const).map((side, j) => ({
      key: `${L.g}w${j}`,
      points: wireGreaseCurve(side, L.spanMm)
        .getSpacedPoints(24)
        .map((p) => L.wireLie.clone().add(p.multiplyScalar(U))),
      tilt: -0.6,
    })),
  )
  return { housing, wire }
}

type Progress = Record<string, MutableRefObject<number>>

interface StemProps {
  L: SetLayout
  i: number
  /** tổng số slider trên bàn (kìm cắt lần lượt từng cái) */
  total: number
  model: string
  feet: boolean
  lubed: boolean
  holee: boolean
  assembled: boolean
  grease: string | null
  progress: Progress
}

/** Slider: dựng đứng trên bàn → (cắt chân, Holee, phết mỡ 2 mặt) → nhấc lên và thả vào housing */
function MovingStem({
  L,
  i,
  total,
  model,
  feet,
  lubed,
  holee,
  assembled,
  grease,
  progress,
}: StemProps) {
  const ref = useRef<THREE.Group>(null)
  const feetRef = useRef<THREE.Group>(null)
  const j = L.g * 2 + i
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const c = animProgress('clip')
    const hasFeet = feet && !(c !== null && c > (j + 0.44) / total)
    const stand = (hasFeet ? L.standFeet : L.stand)[i]
    const seat = L.seat[i]
    const p = animProgress('assembled')
    if (p !== null)
      g.position
        .lerpVectors(stand, seat.clone().setY(seat.y + 1.3), ease(seg(p, 0, 0.55)))
        .lerp(seat, ease(seg(p, 0.55, 1)))
    else if (assembled) g.position.copy(seat)
    else {
      // cắt chân xong slider hạ dần xuống mặt bàn
      g.position.x = stand.x
      g.position.z = stand.z
      g.position.y += (stand.y - g.position.y) * Math.min(1, dt * 12)
    }
    if (feetRef.current) feetRef.current.visible = hasFeet
  })
  return (
    <group ref={ref} position={assembled ? L.seat[i] : (feet ? L.standFeet : L.stand)[i]}>
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
          STEM_STROKES.map((s, k) => (
            <GreaseStroke key={k} lube={grease} stroke={s} progress={progress[`${L.g}s${i}${k}`]} />
          ))}
      </group>
    </group>
  )
}

/** Dây stab: nằm trên bàn → nhấc lên → xỏ 2 đầu móc vào lỗ slider → ấn vào ngàm (bật nhẹ) */
function MovingWire({
  L,
  wired,
  lube,
  progress,
  onSnap,
}: {
  L: SetLayout
  wired: boolean
  lube: string | null
  progress: Progress
  onSnap?: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const snapped = useRef(false)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const p = animProgress('wired')
    if (p === null) {
      snapped.current = false
      g.position.copy(wired ? L.wireSeat : L.wireLie)
      return
    }
    const above = v(L.cx, L.wireSeat.y + 0.45, L.hz + 0.9)
    const front = v(L.cx, L.wireSeat.y + 0.12, L.hz)
    g.position
      .lerpVectors(L.wireLie, above, ease(seg(p, 0, 0.35)))
      .lerp(front, ease(seg(p, 0.35, 0.7)))
    const snap = seg(p, 0.7, 1)
    if (snap > 0)
      g.position.y =
        front.y +
        (L.wireSeat.y - front.y) * Math.min(1, snap * 1.6) -
        Math.sin(snap * Math.PI) * 0.03
    if (snap > 0.6 && !snapped.current) {
      snapped.current = true
      onSnap?.()
    }
  })
  return (
    <group ref={ref}>
      <group scale={U}>
        <StabWireCad spanMm={L.spanMm} />
        {lube &&
          ([-1, 1] as const).map((side, j) => (
            <WireGrease
              key={side}
              lube={lube}
              spanMm={L.spanMm}
              side={side}
              progress={progress[`${L.g}w${j}`]}
            />
          ))}
      </group>
    </group>
  )
}

/** Cọ lube: đi theo từng nét phết (a → b rồi quét ngược lại), mỡ đặc quét chậm. Xong thì nằm lại trên bàn */
function AnimatedBrush({
  passes,
  stemRaise,
  idle,
}: {
  passes: Passes
  stemRaise: number
  idle: THREE.Vector3
}) {
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
      g.position.copy(idle)
      g.rotation.set(0, 0, Math.PI / 2)
      return
    }
    const list = passes[kind]
    const i = Math.min(list.length - 1, Math.floor(p * list.length))
    const pass = list[i]
    const tip = alongPass(pass.points, passPhase(p, i, list.length))
    if (pass.stem) tip.y += stemRaise
    // ấn cọ xuống nhẹ theo nhịp, mỡ đặc ấn sâu hơn
    g.position
      .copy(tip)
      .setY(tip.y + 0.03 + Math.abs(Math.sin(clock.elapsedTime * (12 - visc * 5))) * 0.02)
    g.rotation.set(0, 0, pass.tilt)
  })
  return (
    <group ref={ref}>
      <LubeBrush lube={lube} />
    </group>
  )
}

/** Kìm cắt: đưa từ phía trước vào kẹp 2 chân dưới đáy từng slider, chân bị cắt rơi xuống bàn */
function AnimatedClipper({ layout }: { layout: SetLayout[] }) {
  const ref = useRef<THREE.Group>(null)
  const pieces = useRef<THREE.Group>(null)
  const total = layout.length * 2
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const p = animProgress('clip')
    if (p === null) {
      g.position.copy(CLIPPER_IDLE)
      g.rotation.set(0, CLIPPER_ROT_IDLE, 0)
      setJaw(g.children[0], 1, 0.22, 0.16)
      if (pieces.current) pieces.current.visible = false
      return
    }
    const [j, q] = slotOf(p, total)
    // tâm 2 chân (y = -0.75mm của slider còn chân); kìm chĩa mũi về -z
    const foot = layout[j >> 1].standFeet[j & 1].clone().add(v(0, -0.75 * U, 0.65))
    const go = ease(seg(q, 0, 0.4)) * (1 - ease(seg(q, 0.6, 1)))
    g.position
      .lerpVectors(CLIPPER_IDLE, foot, ease(seg(q, 0, 0.4)))
      .lerp(CLIPPER_IDLE, ease(seg(q, 0.6, 1)))
    g.rotation.set(0, CLIPPER_ROT_IDLE + (CLIPPER_ROT_CUT - CLIPPER_ROT_IDLE) * go, 0)
    setJaw(
      g.children[0],
      q < 0.4 ? 1 : q < 0.5 ? 1 - seg(q, 0.4, 0.5) : seg(q, 0.5, 0.6),
      0.22,
      0.16,
    )
    if (pieces.current) {
      pieces.current.visible = q > 0.45
      const fall = seg(q, 0.45, 0.9)
      pieces.current.position.set(
        foot.x + fall * 0.25,
        foot.y - fall * (foot.y - TABLE - 0.02),
        foot.z - 0.3 + fall * 0.15,
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
        {[-1.3, 1.3].map((x) => (
          <mesh key={x} position-x={x * U}>
            <boxGeometry args={[0.9 * U, 1.8 * U, 1 * U]} />
            <meshStandardMaterial color="#f2f2f2" />
          </mesh>
        ))}
      </group>
    </>
  )
}

// Holee mod: mỗi bộ dùng 1 miếng băng. Lúc cắt, băng được nhấc lên khỏi bàn (như cầm trên tay)
// để kéo dựng đứng kẹp 2 lưỡi trên / dưới băng
const LIFT = 0.35
/** tiến độ Holee của băng thứ g (băng làm lần lượt) */
const bandT = (g: number, n: number, applied: boolean) => {
  const p = animProgress('bandaid')
  return p === null ? (applied ? 1 : 0) : seg(p, g / n, (g + 1) / n)
}

/** Kéo: lần lượt cắt từng miếng băng */
function AnimatedScissors({ layout, applied }: { layout: SetLayout[]; applied: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const sc = ref.current
    if (!sc) return
    const p = animProgress('bandaid')
    const [g, t] = p === null ? [0, applied ? 1 : 0] : slotOf(p, layout.length)
    const band = layout[g].band
    // kéo dựng đứng (mặt mở của 2 lưỡi thẳng đứng), mũi chĩa về -z, cắt ngang bề rộng băng
    const cut1 = band.clone().add(v(-URGO.padLen / 2, LIFT, 0.4))
    const cut2 = band.clone().add(v(URGO.padLen / 2, LIFT, 0.4))
    sc.position.lerpVectors(SCISSORS_IDLE, cut1, ease(seg(t, 0.12, 0.2)))
    if (t > 0.2) sc.position.lerpVectors(cut1, cut2, ease(seg(t, 0.25, 0.32)))
    if (t > 0.37) sc.position.lerpVectors(cut2, SCISSORS_IDLE, ease(seg(t, 0.37, 0.45)))
    // nằm trên bàn → lật nghiêng 90° quanh trục thân kéo khi cắt → nằm lại
    const upright = ease(seg(t, 0.12, 0.2)) * (1 - ease(seg(t, 0.37, 0.45)))
    sc.rotation.set((Math.PI / 2) * upright, Math.PI / 2, 0, 'YXZ')
    const snip = (a: number) => Math.sin(seg(t, a, a + 0.05) * Math.PI) // khép rồi mở
    setScissors(sc.children[0], 1 - Math.max(snip(0.2), snip(0.32)))
  })
  return (
    <group ref={ref} position={SCISSORS_IDLE}>
      <Scissors />
    </group>
  )
}

/**
 * 1 miếng băng Urgo: gỡ giấy lót → kéo cắt lấy 2 đầu dính (bỏ phần gạc giữa) →
 * dán từng mảnh vào cạnh trên lỗ cắm dây của 2 slider trong bộ
 */
function HoleeBandage({
  L,
  sets,
  applied,
  stemRaise,
}: {
  L: SetLayout
  sets: number
  applied: boolean
  stemRaise: number
}) {
  const end0 = useRef<THREE.Group>(null)
  const end1 = useRef<THREE.Group>(null)
  const pad = useRef<THREE.Group>(null)
  const papers = useRef<THREE.Group>(null)
  const { endHome, holeAt, padAway } = useMemo(
    () => ({
      endHome: [-1, 1].map((s) =>
        L.band.clone().add(v(s * (URGO.padLen / 2 + URGO.endLen / 2), 0, 0)),
      ),
      // vị trí mảnh Holee trên slider đứng (cạnh trên lỗ dây)
      holeAt: [0, 1].map((i) => standToWorld(L, i, [0, HOLEE_Y, 0]).add(v(0, stemRaise, 0))),
      padAway: PAD_AWAY.clone().add(v(0, L.g * 0.02, L.g * 0.25)),
    }),
    [L, stemRaise],
  )
  // giấy lót: 2 tấm phủ kín băng, mỗi tấm 1 nửa
  const paperW = URGO.endLen + URGO.padLen / 2 + 0.02
  useFrame(() => {
    const t = bandT(L.g, sets, applied)
    // giấy lót trượt ra 2 bên
    const peel = ease(seg(t, 0, 0.12))
    papers.current?.children.forEach((m, i) => {
      const side = i === 0 ? -1 : 1
      m.visible = peel < 1
      m.position.set(side * (paperW / 2 + peel * 1.1), -0.02 - peel * 0.04, 0)
    })
    const lift = LIFT * (ease(seg(t, 0.1, 0.16)) - ease(seg(t, 0.42, 0.5)))
    // phần gạc bị bỏ sang một bên
    pad.current?.position.lerpVectors(L.band, padAway, ease(seg(t, 0.42, 0.5))).add(v(0, lift, 0))
    // 2 đầu dính: đưa từ phía trước tới cạnh trên lỗ dây của slider đứng, thu nhỏ vừa bề mặt slider
    ;[end0.current, end1.current].forEach((g, i) => {
      if (!g) return
      const f = ease(seg(t, 0.5 + i * 0.25, 0.75 + i * 0.25))
      g.visible = f < 1
      g.position
        .lerpVectors(endHome[i], holeAt[i].clone().add(v(0, 0.1, 0.7)), Math.min(1, f * 1.4))
        .lerp(holeAt[i], seg(f, 0.7, 1))
      if (f === 0) g.position.y += lift
      g.scale.set(1 - f * 0.3, 1, 1 + f * 0.25)
    })
  })
  return (
    <>
      <group ref={papers} position={L.band}>
        {!applied &&
          [-1, 1].map((s) => (
            <mesh key={s} position-x={(s * paperW) / 2}>
              <boxGeometry args={[paperW, 0.008, URGO.width + 0.03]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
      </group>
      <group ref={end0} position={endHome[0]} visible={!applied}>
        <UrgoEnd side={-1} />
      </group>
      <group ref={end1} position={endHome[1]} visible={!applied}>
        <UrgoEnd side={1} />
      </group>
      <group ref={pad} position={applied ? padAway : L.band}>
        <UrgoPad />
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
  const k0 = ctx.width / 12
  const busy = !!anim
  // thao tác nên làm tiếp theo (mũi tên vàng)
  const next = ORDER.find((kind) => rule(kind).needed && rule(kind).allowed && !mods[kind])

  const {
    layout,
    table,
    jars: JARS_AT,
    brush: BRUSH_IDLE,
  } = useMemo(() => layoutSets(stabUnits(ctx.stabKeys)), [ctx.stabKeys])
  // bàn nới ra theo số stab thì thu tỉ lệ lại để cả bàn vẫn nằm gọn trong khung nhìn
  const k = k0 * Math.min(1, 17 / table.w, 12 / table.d)
  const passes = useMemo(() => buildPasses(layout), [layout])
  const L0 = layout[0]

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
    for (const pass of [...passes.housing, ...passes.wire]) map[pass.key] = { current: 1 }
    return map
  }, [passes])
  useFrame(() => {
    for (const kind of ['housing', 'wire'] as const) {
      const p = animProgress(kind)
      passes[kind].forEach((pass, i, all) => {
        progress[pass.key].current = p === null ? 1 : seg(passPhase(p, i, all.length), 0, 0.55)
      })
    }
  })

  const act = (kind: StabModKind) => () => {
    if (!busy) modStab(kind)
  }

  // đồ còn thiếu: để trống ô nét đứt trên bàn, người chơi về máy tính mua rồi quay lại
  const tools = useGame((s) => s.tools)
  const urgoLeft = useGame((s) => s.supplies.urgo ?? 0)
  const supplies = useGame((s) => s.supplies)
  const lubePick = useGame((s) => s.lubePick)
  // hũ mỡ cho housing / slider + wire: mỗi loại 1 hũ (nhãn = tên mỡ); thiếu thì để ô trống
  const jars = (() => {
    const list: { lube: string; need: number }[] = []
    for (const kind of ['housing', 'wire'] as const) {
      if (!rule(kind).allowed) continue
      const lube = lubePick[kind]
      let jar = list.find((j) => j.lube === lube)
      if (!jar) list.push((jar = { lube, need: 0 }))
      if (!mods[kind] && anim?.kind !== kind) jar.need += ctx.stabKeys.length
    }
    return list.map((j) => ({ ...j, missing: (supplies[j.lube] ?? 0) < j.need }))
  })()
  const openShop = useGame((s) => s.openShop)
  const noClipper = m.feet && !mods.clip && TOOLS.clipper[tools.clipper].none
  const noBrush = TOOLS.brush[tools.brush].none
  // 1 miếng Urgo dán được 2 stab
  const urgoNeed = Math.ceil(ctx.stabKeys.length / 2)
  const noUrgo = !mods.bandaid && anim?.kind !== 'bandaid' && urgoLeft < urgoNeed
  // Holee chỉ cần cho stab còn chân (Cherry); stab khít / đời mới vẫn cố dán từ panel thì mới bày ra
  const showHolee = rule('bandaid').needed || mods.bandaid || anim?.kind === 'bandaid'
  // slider còn chân thì đứng cao hơn: nét cọ + chỗ dán Holee nâng theo
  const stemRaise = m.feet && !mods.clip ? FEET_RAISE : 0
  // bấm ô trống: về máy tính, mở Shopii đúng mục để mua (mua xong quay lại bàn là có đồ)
  const askBuy = (cat: 'tool' | 'supply') => () => openShop(cat)
  const lubeOf = (kind: 'housing' | 'wire') =>
    mods[kind] ?? (anim?.kind === kind ? anim.lube! : null)
  const housingLube = lubeOf('housing')
  const hint: Record<StabModKind, [number, number, number]> = {
    clip: [L0.stand[0].x, STEM_TOP_Y + 0.3, L0.stand[0].z],
    bandaid: [BAND.x, TABLE + 0.6, BAND.z],
    housing: [L0.hx[0], TABLE + CAD.housingTop * U + 0.6, L0.hz],
    assembled: [L0.stand[0].x, STEM_TOP_Y + 0.3, L0.hz],
    wire: [L0.cx, TABLE + 0.6, L0.wireLie.z + 0.6],
    wired: [L0.cx, TABLE + 1.1, L0.hz + 0.6],
  }

  return (
    <StationTable k={k} w={table.w} d={table.d}>
      {/* băng Urgo (mỗi bộ 1 miếng) + kéo (Holee mod); stab không cần Holee thì không bày ra */}
      {!showHolee ? null : noUrgo ? (
        <MissingSlot
          at={BAND.clone().add(v(0, 0, ((layout.length - 1) * BAND_STEP) / 2))}
          size={[
            URGO.endLen * 2 + URGO.padLen + 0.15,
            URGO.width + (layout.length - 1) * BAND_STEP + 0.15,
          ]}
          label={`Thiếu băng Urgo (còn ${urgoLeft}/${urgoNeed} miếng)`}
          onAct={askBuy('supply')}
        />
      ) : (
        <Clickable active={!busy && !mods.bandaid && !mods.assembled} onAct={act('bandaid')}>
          {layout.map((L) => (
            <HoleeBandage
              key={L.g}
              L={L}
              sets={layout.length}
              applied={mods.bandaid}
              stemRaise={stemRaise}
            />
          ))}
        </Clickable>
      )}
      {showHolee && <AnimatedScissors layout={layout} applied={mods.bandaid} />}

      {layout.map((L) => (
        <group key={L.g}>
          {/* nhãn loại dây + số bộ cần làm */}
          <Label
            position={L.long ? [L.cx + 2.6, TABLE + 0.01, L.hz] : [L.cx, TABLE + 0.01, L.hz + 1.1]}
            color="#ffcc2e"
          >
            {L.label}
          </Label>

          {/* 2 housing: click để phết mỡ (hoặc lắp slider nếu đã phết) */}
          <Clickable
            active={!busy && !mods.assembled}
            onAct={act(mods.housing || m.prelubed ? 'assembled' : 'housing')}
          >
            {L.hx.map((x, i) => (
              <group key={x} position={[x, TABLE, L.hz]} scale={U}>
                <StabHousingCad model={model} lubed={!!mods.housing || m.prelubed} />
                {housingLube &&
                  HOUSING_STROKES.map((s, j) => (
                    <GreaseStroke
                      key={j}
                      lube={housingLube}
                      stroke={s}
                      progress={progress[`${L.g}h${i}${j}`]}
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
                L={L}
                i={i}
                total={layout.length * 2}
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
              L={L}
              wired={mods.wired}
              lube={lubeOf('wire')}
              progress={progress}
              onSnap={L.g === 0 ? () => playClick(1600) : undefined}
            />
          </Clickable>
        </group>
      ))}

      {/* dụng cụ */}
      {noBrush ? (
        <MissingSlot
          at={BRUSH_IDLE.clone()
            .setY(TABLE)
            .add(v(-0.9, 0, 0))}
          size={[2, 0.45]}
          label="Thiếu cọ lube"
          onAct={askBuy('tool')}
        />
      ) : (
        <AnimatedBrush passes={passes} stemRaise={stemRaise} idle={BRUSH_IDLE} />
      )}
      {noClipper ? (
        <MissingSlot
          at={CLIPPER_IDLE.clone()
            .setY(TABLE)
            .add(v(0, 0, 0.3))}
          size={[1.2, 2.2]}
          label="Thiếu kìm cắt"
          onAct={askBuy('tool')}
        />
      ) : (
        m.feet && <AnimatedClipper layout={layout} />
      )}
      {mods.clip && (
        // chân stem đã cắt nằm trên bàn
        <group position={[L0.stand[1].x - 0.9, TABLE + 0.02, L0.stand[1].z + 0.75]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[i * 0.08, 0, (i % 2) * 0.1]} rotation-z={Math.PI / 2}>
              <boxGeometry args={[0.9 * U, 1.8 * U, 1 * U]} />
              <meshStandardMaterial color={m.stem} />
            </mesh>
          ))}
        </group>
      )}

      {jars.map((j, i) =>
        j.missing ? (
          <MissingSlot
            key={j.lube}
            at={JARS_AT[i]}
            size={[1.2, 1.2]}
            label={`Thiếu ${SUPPLIES[j.lube].name}`}
            onAct={askBuy('supply')}
          />
        ) : (
          <group key={j.lube} position={JARS_AT[i]}>
            <LubeJar lube={j.lube} />
            <Label position={[0, 0.01, 0.85]} color="#ffcc2e">
              {SUPPLIES[j.lube].name}
            </Label>
          </group>
        ),
      )}

      {!busy && next && <HintArrow at={hint[next]} size={1.8 * Math.max(1, k0 / k)} />}
    </StationTable>
  )
}
