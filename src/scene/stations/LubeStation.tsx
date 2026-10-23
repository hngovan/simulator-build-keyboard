import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useBuild, useCtx } from '@/store'
import { SUPPLIES } from '@/data/supplies'
import { playBrush, playClick } from '@/sound'
import { useHover } from '../common/useHover'
import { MM, SWITCH_CAD, SwitchBottom, SwitchSpring, SwitchStem, SwitchTop } from '../models/Switch'
import { GreaseStroke, LubeBrush, type Stroke } from '../models/ModTools'
import { StationTable, alongPass, ease, passPhase, seg } from './StationKit'

// ---------- bố cục bàn lube (đơn vị u của bàn) ----------
const B = 3.2 // phóng to switch để dễ nhìn
const U = B * MM
const TABLE = -0.55
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const { body, cavity, legs } = SWITCH_CAD
const TOP_AT = v(-4, TABLE, -1.1) // housing trên
const STEM_AT = v(-1.4, TABLE + (-legs.bottom + 0.3) * U, -1.1) // stem đứng
const STEM_TURN = 0.6 // xoay stem để thấy 1 bên thân
const BOTTOM_AT = v(1.6, TABLE + 4.81 * U, -1.1) // housing dưới (đặt sát bàn)
const SPRING_AT = v(-1.6, TABLE + 2.6 * U, 1.5) // lò xo nằm ngang
const BOX_AT = v(1.4, TABLE, 1.5) // hộp lắc lò xo
const BOTTLE_AT = v(3, TABLE, 1.6) // lọ dầu GPL 105
const JAR_AT = v(4.3, TABLE, -1.3) // hũ mỡ switch
const BRUSH_IDLE = v(-3.2, TABLE + 0.1, 1.9)

// ---------- nét phết mỡ (mm, trong khung từng chi tiết) ----------
// 2 bên thân stem (mặt trượt)
const STEM_STROKES: Stroke[] = [-1, 1].map((sx) => ({
  a: [sx * (body.halfX + 0.02), body.top - 0.5, 0],
  b: [sx * (body.halfX + 0.02), body.bottom + 0.6, 0],
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
type P3 = [number, number, number]
const stemToWorld = ([x, y, z]: P3) =>
  STEM_AT.clone().add(v(x * U, y * U, z * U).applyAxisAngle(v(0, 1, 0), STEM_TURN))
const bottomToWorld = ([x, y, z]: P3) => BOTTOM_AT.clone().add(v(x * U, y * U, z * U))
const PASSES = [
  ...STEM_STROKES.map((s, j) => ({ key: `s${j}`, points: [stemToWorld(s.a), stemToWorld(s.b)] })),
  ...HOUSING_STROKES.map((s, j) => ({
    key: `h${j}`,
    points: [bottomToWorld(s.a), bottomToWorld(s.b)],
  })),
]

/** Tiến độ hoạt cảnh bàn lube (null nếu không chạy). Đọc thẳng store để dùng trong useFrame */
function animProgress(kind: 'switch' | 'spring') {
  const a = useGame.getState().lubeAnim
  if (!a || a.kind !== kind) return null
  return Math.min(1, (performance.now() - a.at) / (a.dur * 1000))
}

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

/** Cọ: quét lần lượt 2 bên thân stem rồi 2 thành hốc housing; nghỉ thì nằm trên bàn */
function SwitchBrush({ lube }: { lube?: string }) {
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
    const i = Math.min(PASSES.length - 1, Math.floor(p * PASSES.length))
    const tip = alongPass(PASSES[i].points, passPhase(p, i, PASSES.length))
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

/** Hũ mỡ có nhãn */
function LubeJar({ id, at }: { id: string; at: THREE.Vector3 }) {
  return (
    <group position={at}>
      <mesh position-y={0.28}>
        <cylinderGeometry args={[0.45, 0.45, 0.56, 24]} />
        <meshPhysicalMaterial color={SUPPLIES[id].color} transmission={0.4} roughness={0.2} />
      </mesh>
      <mesh position-y={0.62}>
        <cylinderGeometry args={[0.48, 0.48, 0.12, 24]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <Text
        position={[0, 0.69, 0]}
        rotation-x={-Math.PI / 2}
        fontSize={0.13}
        color="#fff"
        anchorX="center"
      >
        {SUPPLIES[id].name.replace('Krytox ', '').replace('Tribosys ', '')}
      </Text>
    </group>
  )
}

/**
 * Lube lò xo kiểu "bag lube": mở hộp → thả lò xo vào → nhỏ dầu GPL 105 → đóng nắp → lắc đều → lấy ra
 */
function SpringShaker({ lubed, oil }: { lubed: boolean; oil: string }) {
  const box = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const spring = useRef<THREE.Group>(null)
  const bottle = useRef<THREE.Group>(null)
  const drops = useRef<THREE.Group>(null)
  const inside = useRef<THREE.Group>(null)
  const spots = useMemo(() => [v(-0.35, 0.2, -0.15), v(0.05, 0.2, 0.15), v(0.4, 0.2, -0.1)], [])
  useFrame(({ clock }) => {
    const p = animProgress('spring')
    const t = p ?? 0
    const active = p !== null
    // nắp: mở (0 → 0.12), đóng lại (0.48 → 0.56)
    if (lid.current)
      lid.current.rotation.x = active
        ? -1.9 * (ease(seg(t, 0, 0.12)) - ease(seg(t, 0.48, 0.56)))
        : 0
    // lò xo bay vào hộp rồi trở về chỗ cũ khi xong
    const sp = spring.current
    if (sp) {
      const inBox = BOX_AT.clone().add(v(0, 0.35, 0))
      const go = ease(seg(t, 0.12, 0.3))
      const back = ease(seg(t, 0.92, 1))
      sp.position.lerpVectors(SPRING_AT, inBox, go).lerp(SPRING_AT, back)
      sp.position.y += Math.sin(go * Math.PI) * 0.8 + Math.sin(back * Math.PI) * 0.8
      sp.visible = !active || go < 1 || back > 0
    }
    // các lò xo trong hộp (đại diện cả bộ) nảy theo nhịp lắc
    const shaking = active && t > 0.56 && t < 0.92
    if (inside.current) {
      inside.current.visible = active && t > 0.28 && t < 0.95
      inside.current.children.forEach((c, i) => {
        c.position.copy(spots[i])
        if (shaking)
          c.position.add(
            v(
              Math.sin(clock.elapsedTime * 40 + i) * 0.08,
              Math.abs(Math.sin(clock.elapsedTime * 30 + i * 2)) * 0.12,
              0,
            ),
          )
      })
    }
    // lọ dầu nghiêng nhỏ giọt (0.32 → 0.48)
    const pour = seg(t, 0.32, 0.48)
    if (bottle.current) {
      bottle.current.position.lerpVectors(
        BOTTLE_AT,
        BOX_AT.clone().add(v(0.5, 0.9, 0)),
        Math.sin(pour * Math.PI) > 0 ? Math.min(1, pour * 3) * (1 - seg(t, 0.46, 0.5)) : 0,
      )
      bottle.current.rotation.z = Math.sin(pour * Math.PI) * 1.9
    }
    if (drops.current) {
      drops.current.visible = pour > 0.25 && pour < 1
      drops.current.children.forEach((d, i) => {
        const f = (pour * 3 + i * 0.33) % 1
        d.position.set(0.25, 0.75 - f * 0.6, 0)
      })
    }
    // lắc hộp (0.56 → 0.92)
    const b = box.current
    if (b) {
      if (shaking) {
        const e = clock.elapsedTime
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
        {/* hộp nhựa trong + nắp bản lề phía sau */}
        <RoundedBox args={[1.5, 0.7, 1.05]} radius={0.06} position-y={0.35}>
          <meshPhysicalMaterial
            color="#e6f1ff"
            transmission={0.85}
            roughness={0.08}
            thickness={0.2}
            transparent
            opacity={0.55}
          />
        </RoundedBox>
        <group ref={lid} position={[0, 0.72, -0.52]}>
          <mesh position-z={0.52}>
            <boxGeometry args={[1.55, 0.06, 1.08]} />
            <meshStandardMaterial color="#2f6fd8" roughness={0.5} />
          </mesh>
        </group>
        <Text
          position={[0, 0.77, 0.15]}
          rotation-x={-Math.PI / 2}
          fontSize={0.14}
          color="#fff"
          anchorX="center"
        >
          LẮC LÒ XO · GPL 105
        </Text>
        <group ref={inside} visible={false}>
          {spots.map((s, i) => (
            <group key={i} position={s} rotation-z={Math.PI / 2} scale={U}>
              <SwitchSpring lubed />
            </group>
          ))}
        </group>
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
      {/* lọ dầu nhỏ giọt */}
      <group ref={bottle} position={BOTTLE_AT}>
        <mesh position-y={0.32}>
          <cylinderGeometry args={[0.2, 0.22, 0.64, 18]} />
          <meshPhysicalMaterial color="#cfe0ee" transmission={0.6} roughness={0.15} />
        </mesh>
        <mesh position-y={0.74}>
          <coneGeometry args={[0.1, 0.22, 14]} />
          <meshStandardMaterial color="#f2f2f2" />
        </mesh>
      </group>
      {/* lò xo của switch đang mở */}
      <group ref={spring} position={SPRING_AT}>
        <group rotation-z={-Math.PI / 2} position-x={-9 * U} scale={U}>
          <SwitchSpring lubed={lubed} />
        </group>
      </group>
    </>
  )
}

// ---------------- Bàn lube switch ----------------
export function LubeStation() {
  const ctx = useCtx()
  const build = useBuild()
  const type = useGame((s) => s.inventory.switch!.type)
  const pick = useGame((s) => s.lubePick)
  const anim = useGame((s) => s.lubeAnim)
  const { lubeBatch, lubeSprings } = useGame.getState()
  const total = ctx.keys.length
  const k = ctx.width / 12
  const busy = !!anim
  const greaseLube = build.lubeType ?? (anim?.kind === 'switch' ? anim.lube : null)

  // tiến độ hiện mỡ từng nét: chạy theo cọ khi đang phết, đủ khi đã lube
  const progress = useMemo(() => Object.fromEntries(PASSES.map((p) => [p.key, { current: 1 }])), [])
  useFrame(() => {
    const p = animProgress('switch')
    PASSES.forEach((pass, i) => {
      progress[pass.key].current = p === null ? 1 : seg(passPhase(p, i, PASSES.length), 0, 0.55)
    })
  })

  // âm thanh: cọ quét / lắc hộp lạch cạch
  useEffect(() => {
    if (!anim) return
    if (anim.kind === 'switch') playBrush()
    if (anim.kind === 'spring') {
      const ts = Array.from({ length: 10 }, (_, i) =>
        setTimeout(() => playClick(1800 + (i % 3) * 400), anim.dur * 1000 * (0.58 + i * 0.033)),
      )
      return () => ts.forEach(clearTimeout)
    }
  }, [anim])

  return (
    <StationTable k={k} w={11} d={6} color="#3b3d4a">
      {/* stem + housing dưới: click để lube 1 mẻ switch */}
      <Clickable active={!busy && build.lubed < total} onAct={() => lubeBatch()}>
        <group position={STEM_AT} rotation-y={STEM_TURN} scale={U}>
          <SwitchStem type={type} lubed={build.lubed > 0} />
          {greaseLube &&
            STEM_STROKES.map((s, j) => (
              <GreaseStroke key={j} lube={greaseLube} stroke={s} progress={progress[`s${j}`]} />
            ))}
        </group>
        <group position={BOTTOM_AT} scale={U}>
          <SwitchBottom type={type} pins={false} />
          {greaseLube &&
            HOUSING_STROKES.map((s, j) => (
              <GreaseStroke key={j} lube={greaseLube} stroke={s} progress={progress[`h${j}`]} />
            ))}
        </group>
        <group position={TOP_AT} scale={U}>
          <SwitchTop type={type} />
        </group>
      </Clickable>

      {/* lò xo + hộp lắc: click để lube lò xo */}
      <Clickable active={!busy && !build.springLube} onAct={() => lubeSprings()}>
        <SpringShaker lubed={!!build.springLube} oil={pick.spring} />
      </Clickable>

      <LubeJar id={pick.switch} at={JAR_AT} />
      <SwitchBrush lube={anim?.kind === 'switch' ? anim.lube : undefined} />
    </StationTable>
  )
}
