import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { useGame, useBuild, useCtx } from '@/store'
import { SUPPLIES } from '@/data/supplies'
import { SWITCHES, TOOLS } from '@/data/parts'
import { playBrush, playClick } from '@/sound'
import { useHover } from '../common/useHover'
import {
  MM,
  SWITCH_CAD,
  SwitchBottom,
  SwitchSpring,
  SwitchStem,
  SwitchTop,
  switchMaterials,
} from '../models/Switch'
import { GreaseStroke, LubeBrush, type Stroke } from '../models/ModTools'
import { createOilBottle } from '../models/lubeJarModel'
import { LubeJar } from '../models/LubeJar'
import { SwitchLubeStation } from '../models/SwitchLubeStation'
import { MissingSlot, StationTable, alongPass, ease, passPhase, seg } from './StationKit'

// ---------- bố cục bàn lube (đơn vị u của bàn) ----------
// Switch + lò xo đúng cỡ thật (B = 1) để so được với hộp lắc: switch ≈ 1/10, lò xo trong hộp ≈ 1/20 chiều dài hộp
const B = 1
const U = B * MM
const TABLE = -0.55
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const { body, cavity, legs } = SWITCH_CAD
const TOP_AT = v(-2.6, TABLE, 5.7) // housing trên
const STEM_AT = v(-1.3, TABLE + (-legs.bottom + 0.3) * U, 5.7) // stem đứng
const STEM_TURN = 0.6 // xoay stem để thấy 1 bên thân
const BOTTOM_AT = v(0, TABLE + 4.81 * U, 5.7) // housing dưới (đặt sát bàn)
const SPRING_AT = v(1.4, TABLE + 2.6 * U, 5.7) // lò xo nằm ngang
const BOX_AT = v(0.2, TABLE, 4) // hộp lắc lò xo
/** hộp nhựa đựng cả mẻ lò xo (u bàn) */
const BOX = { w: 7.5, d: 2.4, h: 1.5 }
const TRAY_AT = v(-5.5, TABLE, 4.4)
const TRAY = { w: 1.9, d: 1.45, h: 0.32 }
const LUBE_MODEL = '/models/lube'
const BOX_SCALE: [number, number, number] = [BOX.w / 80, BOX.h / 15.5, BOX.d / 62.4]
const TRAY_SCALE: [number, number, number] = [TRAY.w / 190, TRAY.h / 24, TRAY.d / 130]
useGLTF.preload(`${LUBE_MODEL}/spring-box-base.glb`)
useGLTF.preload(`${LUBE_MODEL}/spring-box-lid.glb`)
useGLTF.preload(`${LUBE_MODEL}/spring-tray.glb`)
/** lò xo trong hộp thu về 0.4 lần → dài ≈ 1/20 chiều dài hộp */
const IN_BOX = 0.4
const BOTTLE_AT = v(4.7, TABLE, 1.5) // lọ dầu GPL 105
const JAR_AT = v(3.4, TABLE, -1.6) // hũ mỡ switch
const BRUSH_IDLE = v(-3.6, TABLE + 0.1, 5.7)
// đồ mở switch MX (in 3D, mm, `bun run convert:hand-tools`) + switch nguyên chờ mở đặt trên
const OPENER_GLB = '/models/tools/mx-opener.glb'
useGLTF.preload(OPENER_GLB)
const OPENER_AT = v(4.6, TABLE, -3.4)
/** switch nguyên ngồi trong lòng đồ mở: mặt plate (y = 0 của switch) cao hơn bàn (mm) */
const OPENER_SEAT = 14

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

// Switch linear: model Kailh Choc V2 red (koktoh, CC BY-NC-SA 4.0, ), mm, Y lên
const CHOC_GLB = '/models/choc-red.glb'
useGLTF.preload(CHOC_GLB)
/** đáy từng chi tiết Choc (mm) để đặt sát bàn */
const CHOC_BASE = { bottom: -3.3, stem: 0.2, top: 0.05 }

/** 1 chi tiết switch Choc, tô màu theo loại switch đang lube */
function ChocPart({
  part,
  type,
  lubed = false,
}: {
  part: 'bottom' | 'stem' | 'top'
  type: string
  lubed?: boolean
}) {
  const { nodes } = useGLTF(CHOC_GLB) as unknown as { nodes: Record<string, THREE.Mesh> }
  const m = switchMaterials(type)
  const mat = part === 'top' ? m.top : part === 'bottom' ? m.bottom : lubed ? m.stemLubed : m.stem
  return (
    <mesh geometry={nodes[part].geometry} material={mat} position-y={-CHOC_BASE[part]} castShadow />
  )
}

/** Switch nguyên (chưa mở) đúng dáng lắp ráp; Choc dùng thẳng node GLB (đã ở vị trí lắp) */
function WholeSwitch({
  type,
  choc,
  topRef,
}: {
  type: string
  choc: boolean
  topRef: RefObject<THREE.Group>
}) {
  const { nodes } = useGLTF(CHOC_GLB) as unknown as { nodes: Record<string, THREE.Mesh> }
  const m = switchMaterials(type)
  if (choc)
    return (
      <>
        <mesh geometry={nodes.bottom.geometry} material={m.bottom} castShadow />
        <mesh geometry={nodes.stem.geometry} material={m.stem} castShadow />
        <group ref={topRef}>
          <mesh geometry={nodes.top.geometry} material={m.top} castShadow />
        </group>
      </>
    )
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

/** Đồ mở switch + 1 switch nguyên chờ mở: click thì ấn xuống, housing trên bật lên rồi bay sang chỗ để vỏ */
function SwitchOpener({ type, choc, left }: { type: string; choc: boolean; left: number }) {
  const opener = useGLTF(OPENER_GLB).scene
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
    <group position={OPENER_AT} scale={U}>
      <primitive object={opener} />
      {left > 0 && (
        <group ref={whole} position-y={OPENER_SEAT}>
          <WholeSwitch type={type} choc={choc} topRef={top} />
        </group>
      )}
      {/* số switch còn phải mở */}
      <Text
        position={[0, 34, 0]}
        fontSize={5}
        color="#ffd84a"
        outlineWidth={0.4}
        outlineColor="#000"
        anchorX="center"
      >
        {left > 0 ? `Còn ${left} switch chưa mở` : 'Đã mở hết'}
      </Text>
    </group>
  )
}

/** Tiến độ hoạt cảnh bàn lube (null nếu không chạy). Đọc thẳng store để dùng trong useFrame */
function animProgress(kind: 'switch' | 'spring' | 'open') {
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

/**
 * Lube lò xo kiểu "bag lube": mở hộp → thả lò xo vào → nhỏ dầu GPL 105 → đóng nắp → lắc đều → lấy ra
 */
function SpringShaker({ lubed, oil, noOil }: { lubed: boolean; oil: string; noOil: boolean }) {
  const bottleModel = useMemo(() => createOilBottle(oil), [oil])
  const boxBase = useGLTF(`${LUBE_MODEL}/spring-box-base.glb`).scene
  const boxLid = useGLTF(`${LUBE_MODEL}/spring-box-lid.glb`).scene
  const trayModel = useGLTF(`${LUBE_MODEL}/spring-tray.glb`).scene
  const box = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const spring = useRef<THREE.Group>(null)
  const bottle = useRef<THREE.Group>(null)
  const drops = useRef<THREE.Group>(null)
  const inside = useRef<THREE.Group>(null)
  const inTray = useRef<THREE.Group>(null)
  // cả mẻ lò xo nằm rải trong hộp; lò xo trên bàn bay vào thì thu về IN_BOX cho cùng cỡ
  const spots = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) =>
        v(
          ((i % 6) / 5 - 0.5) * (BOX.w - 1.2) + ((i * 37) % 7) * 0.05,
          0.12,
          (Math.floor(i / 6) - 1) * (BOX.d / 3.4),
        ),
      ),
    [],
  )
  useFrame(({ clock }) => {
    const p = animProgress('spring')
    const t = p ?? 0
    const active = p !== null
    // nắp: mở (0 → 0.12), đóng lại (0.48 → 0.56)
    if (lid.current)
      lid.current.rotation.x = active
        ? -1.9 * (ease(seg(t, 0, 0.12)) - ease(seg(t, 0.48, 0.56)))
        : 0
    // lò xo bay vào hộp rồi chuyển sang khay khi lắc xong
    const sp = spring.current
    if (sp) {
      const inBox = BOX_AT.clone().add(v(0, 0.2, 0))
      const go = ease(seg(t, 0.12, 0.3))
      const back = ease(seg(t, 0.92, 1))
      sp.position
        .lerpVectors(SPRING_AT, inBox, go)
        .lerp(TRAY_AT.clone().add(v(0, TRAY.h + 0.2, 0)), back)
      sp.position.y += Math.sin(go * Math.PI) * 0.8 + Math.sin(back * Math.PI) * 0.8
      sp.scale.setScalar(1 - (1 - IN_BOX) * go * (1 - back))
      sp.visible = (!lubed && !active) || (active && (go < 1 || back > 0))
    }
    // các lò xo trong hộp (đại diện cả bộ) nảy theo nhịp lắc
    const shaking = active && t > 0.56 && t < 0.92
    if (inside.current) {
      inside.current.visible = active && t > 0.28 && t < 0.92
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
    if (inTray.current) inTray.current.visible = lubed || (active && t >= 0.92)
    // lọ dầu nghiêng nhỏ giọt (0.32 → 0.48)
    const pour = seg(t, 0.32, 0.48)
    if (bottle.current) {
      bottle.current.position.lerpVectors(
        BOTTLE_AT,
        BOX_AT.clone().add(v(0.8, BOX.h + 0.6, 0)),
        Math.sin(pour * Math.PI) > 0 ? Math.min(1, pour * 3) * (1 - seg(t, 0.46, 0.5)) : 0,
      )
      bottle.current.rotation.z = Math.sin(pour * Math.PI) * 1.9
    }
    if (drops.current) {
      drops.current.visible = pour > 0.25 && pour < 1
      drops.current.children.forEach((d, i) => {
        const f = (pour * 3 + i * 0.33) % 1
        d.position.set(0.55, BOX.h + 0.35 - f * (BOX.h + 0.2), 0)
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
        <group ref={inside} visible={false}>
          {spots.map((s, i) => (
            <group key={i} position={s} rotation={[0, i * 1.3, Math.PI / 2]} scale={U * IN_BOX}>
              {/* gốc lò xo ở 1 đầu: dời về giữa cho nằm cân trong hộp */}
              <group position-y={-9}>
                <SwitchSpring lubed />
              </group>
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
      <group position={TRAY_AT}>
        <primitive object={trayModel} scale={TRAY_SCALE} />
        <group ref={inTray} visible={false}>
          {spots.map((_, i) => (
            <group
              key={i}
              position={[
                ((i % 6) - 2.5) * ((TRAY.w - 0.4) / 6),
                TRAY.h * 0.65,
                (Math.floor(i / 6) - 1) * ((TRAY.d - 0.25) / 3),
              ]}
              rotation={[0, i * 0.7, Math.PI / 2]}
              scale={U * IN_BOX}
            >
              <group position-y={-9}>
                <SwitchSpring lubed />
              </group>
            </group>
          ))}
        </group>
      </group>
      {/* lọ dầu nhỏ giọt (hết dầu thì để ô trống ở bàn chính) */}
      {!noOil && (
        // cùng mẫu lọ với ảnh Shopii (có nhãn tên dầu)
        <group ref={bottle} position={BOTTLE_AT}>
          <primitive object={bottleModel} />
        </group>
      )}
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
  // switch linear dùng model Choc V2 red mới
  const choc = SWITCHES[type].feel === 'linear'
  const anim = useGame((s) => s.lubeAnim)
  const { lubeBatch, lubeSprings, openSwitch } = useGame.getState()
  const opened = build.opened ?? build.lubed
  const noOpener = useGame((s) => TOOLS.opener[s.tools.opener].none)
  const total = ctx.keys.length
  const k = ctx.width / 12
  const busy = !!anim
  const greaseLube = build.lubeType ?? (anim?.kind === 'switch' ? anim.lube : null)

  // đồ còn thiếu: ô nét đứt vàng như bàn mod stab, bấm để mở Shopii đúng mục
  const supplies = useGame((s) => s.supplies)
  const noBrush = useGame((s) => TOOLS.brush[s.tools.brush].none)
  const openShop = useGame((s) => s.openShop)
  const noGrease =
    build.lubed < total && anim?.kind !== 'switch' && (supplies[pick.switch] ?? 0) <= 0
  const noOil = !build.springLube && anim?.kind !== 'spring' && (supplies[pick.spring] ?? 0) < total

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
    if (anim.kind === 'open') setTimeout(() => playClick(2400), anim.dur * 300)
    if (anim.kind === 'spring') {
      const ts = Array.from({ length: 10 }, (_, i) =>
        setTimeout(() => playClick(1800 + (i % 3) * 400), anim.dur * 1000 * (0.58 + i * 0.033)),
      )
      return () => ts.forEach(clearTimeout)
    }
  }, [anim])

  return (
    <StationTable k={k} w={14} d={12.5}>
      <SwitchLubeStation />
      {/* switch nguyên trên đồ mở: click để tách vỏ 1 con */}
      {noOpener ? (
        <MissingSlot
          at={OPENER_AT}
          size={[1.2, 1.2]}
          label="Thiếu đồ mở switch"
          onAct={() => openShop('tool')}
        />
      ) : (
        <Clickable active={!busy && opened < total} onAct={() => openSwitch()}>
          <SwitchOpener type={type} choc={choc} left={total - opened} />
        </Clickable>
      )}
      {/* stem + housing dưới (switch đã mở): click để lube 1 mẻ; chưa có switch mở thì không bày */}
      <group visible={opened > build.lubed || build.lubed >= total || anim?.kind === 'switch'}>
        <Clickable
          active={!busy && opened > build.lubed && build.lubed < total}
          onAct={() => lubeBatch()}
        >
          <group position={STEM_AT} rotation-y={STEM_TURN} scale={U}>
            {choc ? (
              // Choc đặt sát bàn: bù độ cao chân stem MX đã tính sẵn trong STEM_AT
              <group position-y={legs.bottom - 0.3}>
                <ChocPart part="stem" type={type} lubed={build.lubed > 0} />
              </group>
            ) : (
              <SwitchStem type={type} lubed={build.lubed > 0} />
            )}
            {greaseLube &&
              STEM_STROKES.map((s, j) => (
                <GreaseStroke key={j} lube={greaseLube} stroke={s} progress={progress[`s${j}`]} />
              ))}
          </group>
          <group position={BOTTOM_AT} scale={U}>
            {choc ? (
              <group position-y={-4.81}>
                <ChocPart part="bottom" type={type} />
              </group>
            ) : (
              <SwitchBottom type={type} pins={false} />
            )}
            {greaseLube &&
              HOUSING_STROKES.map((s, j) => (
                <GreaseStroke key={j} lube={greaseLube} stroke={s} progress={progress[`h${j}`]} />
              ))}
          </group>
          <group position={TOP_AT} scale={U}>
            {choc ? <ChocPart part="top" type={type} /> : <SwitchTop type={type} />}
          </group>
        </Clickable>
      </group>

      {/* lò xo + hộp lắc: click để lube lò xo */}
      <Clickable active={!busy && !build.springLube} onAct={() => lubeSprings()}>
        <SpringShaker lubed={!!build.springLube} oil={pick.spring} noOil={noOil} />
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
        <SwitchBrush lube={anim?.kind === 'switch' ? anim.lube : undefined} />
      )}
    </StationTable>
  )
}
