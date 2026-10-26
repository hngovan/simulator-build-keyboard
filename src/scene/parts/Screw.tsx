import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { TOOLS } from '@/data/parts'
import { BIT_LABELS, SCREW_BITS, SCREW_STEPS } from '@/data/steps'
import type { ScrewBit, ScrewPoint, ScrewStep } from '@/types'
import { playDrill, playScrew } from '@/sound'
import { useHover } from '../common/useHover'
import { BIT_SWAP_MS, BitDriver, SCREW_SPIN, SPIN_MS } from '../models/HandTools'
import { MM } from '../models/Switch'

interface ScrewProps extends ScrewPoint {
  y?: number
  mode: 'remove' | 'tighten'
  interactive: boolean
  bit: ScrewBit
  requiredBit: ScrewBit
  style: ScrewStyle
}

type ScrewStyle = 'countersunk' | 'socket' | 'button'
const SCREW_MODELS: Record<ScrewStyle, string> = {
  countersunk: '/models/screws/countersunk-m3x10.glb',
  socket: '/models/screws/socket-cap-m2x6.glb',
  button: '/models/screws/button-head-m3x8.glb',
}
Object.values(SCREW_MODELS).forEach((url) => useGLTF.preload(url))
/** chiều cao đầu ốc (mm) nhô khỏi bề mặt; vít đầu bằng âm (countersunk) nằm chìm ngang mặt */
const HEAD_H: Record<ScrewStyle, number> = { countersunk: 0, socket: 2, button: 1.65 }
const SCREW_STYLES: Record<ScrewStep, ScrewStyle> = {
  caseOpen: 'countersunk',
  stabScrew: 'button',
  topScrew: 'button',
  trayScrew: 'socket',
  caseScrew: 'socket',
}

/** thời gian ốc bay ra khỏi lỗ sau lần vặn cuối khi tháo (ms) */
const OUT_MS = 800
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Con vít: click để vặn (tua vít tay 3 lần, tua vít điện 1 lần). Rê chuột hiện tua vít.
 * Vặn vào: xoay cùng chiều kim đồng hồ, lún dần xuống. Tháo: xoay ngược chiều, trồi dần lên theo
 * ren; lần cuối ốc tuột khỏi lỗ, bay lên, nghiêng và mờ dần rồi mới biến mất
 */
function Screw({ id, x, y = 0, z, mode, interactive, bit, requiredBit, style }: ScrewProps) {
  const turns = useGame((s) => s.build?.screws[id] ?? 0)
  const toolLv = useGame((s) => s.tools.screw)
  const turnScrew = useGame((s) => s.turnScrew)
  const toast = useGame((s) => s.toast)
  const clicks = TOOLS.screw[toolLv].clicks!
  const done = turns >= clicks
  const { hover, bind } = useHover(interactive && !done)
  const ref = useRef<THREE.Group>(null)
  const { scene } = useGLTF(SCREW_MODELS[style])
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((part) => {
      const m = part as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      // vật liệu riêng để mờ dần lúc ốc bay ra
      m.material = (m.material as THREE.Material).clone()
    })
    return copy
  }, [scene])
  const spinMs = toolLv ? SPIN_MS.electric : SPIN_MS.manual
  const p = Math.min(1, turns / clicks)
  // tháo: trồi lên theo ren (thân ốc ~0.4u) · vặn: lún từ 0.25 xuống mặt
  const liftAt = (q: number) => (mode === 'tighten' ? (1 - q) * 0.25 : q * 0.4)
  const dir = mode === 'tighten' ? -1 : 1
  const removed = mode === 'remove' && done
  // ốc đã tháo sẵn (tải lại / hoàn tác) thì ẩn luôn; vừa tháo xong thì chạy hiệu ứng bay ra
  const [gone, setGone] = useState(removed)
  if (gone && !removed) setGone(false) // hoàn tác: ốc quay lại lỗ
  const outAt = useRef<number | null>(null)
  useEffect(() => {
    if (!removed) {
      outAt.current = null
      return
    }
    if (gone) return
    // chờ tua vít quay xong lần cuối rồi ốc mới tuột ra
    outAt.current = performance.now() + spinMs
    const t = setTimeout(() => setGone(true), spinMs + OUT_MS)
    return () => clearTimeout(t)
  }, [removed, gone, spinMs])
  // tiến độ hiển thị chạy dần theo nhịp quay của tua vít (hoàn tác thì nhảy luôn)
  const anim = useRef({ turns, from: p, at: 0 })
  const shown = useRef(p)
  const tool = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const now = performance.now()
    const a = anim.current
    if (a.turns !== turns) {
      a.from = turns > a.turns ? shown.current : p
      a.at = now
      a.turns = turns
    }
    const k = Math.min(1, (now - a.at) / spinMs)
    shown.current = a.from + (p - a.from) * (toolLv ? k : ease(k))
    const lift = liftAt(shown.current)
    const t = outAt.current === null ? 0 : Math.min(1, Math.max(0, (now - outAt.current) / OUT_MS))
    const e = ease(t)
    // bay ra: vọt lên, lệch sang bên, nghiêng rồi mờ dần ở nửa sau
    g.position.y = y + lift + e * 1.4
    g.position.x = e * 0.5
    g.rotation.z = e * 1.1
    g.rotation.y = dir * shown.current * (toolLv ? SCREW_SPIN.electric : SCREW_SPIN.manual) + e * 6
    if (tool.current) tool.current.position.y = y + lift + 0.04
    if (head.current) {
      const o = 1 - Math.max(0, (t - 0.45) / 0.55)
      head.current.traverse((m) => {
        const mat = (m as THREE.Mesh).material as THREE.Material | undefined
        if (!mat) return
        mat.transparent = o < 1
        mat.opacity = o
      })
    }
  })

  // vừa vặn thì giữ tua vít tới khi quay xong (click cuối làm vít hết tương tác → mất hover ngay)
  const [busy, setBusy] = useState(false)
  const lastTurns = useRef(turns)
  useEffect(() => {
    const up = turns > lastTurns.current
    lastTurns.current = turns
    if (!up) return
    setBusy(true)
    const t = setTimeout(() => setBusy(false), spinMs)
    return () => clearTimeout(t)
  }, [turns, spinMs])
  const [showTool, setShowTool] = useState(false)
  const want = hover || busy
  useEffect(() => {
    const t = setTimeout(() => setShowTool(want), want ? 0 : 200)
    return () => clearTimeout(t)
  }, [want])

  if (gone && !showTool) return null
  return (
    <group position={[x, 0, z]}>
      <group
        ref={ref}
        position-y={y + liftAt(p)}
        onPointerDown={(e) => {
          if (!interactive || done) return
          e.stopPropagation()
          if (bit !== requiredBit) {
            toast(`Cần đầu vít ${BIT_LABELS[requiredBit]}`, 'bad')
            return
          }
          turnScrew(id)
          if (toolLv) playDrill()
          else playScrew()
        }}
        {...bind}
      >
        {!gone && (
          // model có đỉnh đầu ốc ở y = 0: nâng lên 1 đầu ốc để mặt dưới đầu tì vào bề mặt,
          // thân ốc chui vào trong (vít stab bắt từ đáy PCB thì thân ăn vào housing, không lòi lên mặt trên)
          <group ref={head} position-y={HEAD_H[style] * MM}>
            <primitive object={model} scale={MM} />
            {requiredBit !== 'hex' && (
              <mesh position-y={0.004}>
                <cylinderGeometry args={[0.064, 0.064, 0.008, 20]} />
                <meshStandardMaterial color="#b8bec7" metalness={0.9} roughness={0.3} />
              </mesh>
            )}
            {requiredBit === 'phillips' &&
              [0, Math.PI / 2].map((r) => (
                <mesh key={r} position-y={0.009} rotation-y={r}>
                  <boxGeometry args={[0.16, 0.015, 0.035]} />
                  <meshBasicMaterial color="#333" />
                </mesh>
              ))}
            {requiredBit === 'torx' &&
              [0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
                <mesh key={r} position-y={0.009} rotation-y={r}>
                  <boxGeometry args={[0.14, 0.01, 0.026]} />
                  <meshBasicMaterial color="#30343a" />
                </mesh>
              ))}
            {requiredBit === 'flat' && (
              <mesh position-y={0.009}>
                <boxGeometry args={[0.16, 0.01, 0.03]} />
                <meshBasicMaterial color="#30343a" />
              </mesh>
            )}
          </group>
        )}
        {interactive && !done && !hover && (
          <mesh position-y={0.04} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.15, 0.2, 24]} />
            <meshBasicMaterial color="#ffd84a" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      {showTool && interactive && (
        <group ref={tool} position-y={y + liftAt(p) + 0.04} rotation={[0.35, 0, -0.3]} scale={1.6}>
          <CurrentDriver spinKey={turns} dir={dir} />
        </group>
      )}
    </group>
  )
}

/** Bộ vít của 1 bước. flip: vít bắt từ mặt dưới (đầu vít hướng xuống) */
export function ScrewSet({ step, y, flip }: { step: ScrewStep; y: number; flip?: boolean }) {
  const ctx = useCtx()
  const cur = useStep()
  const bit = useGame((s) => s.screwBit)
  const requiredBit = SCREW_BITS[step]
  const list = ctx.screws[step].map((sc) => (
    <Screw
      key={sc.id}
      {...sc}
      // nhóm lật quay 180° quanh trục x nên đảo cả z: đảo dấu trước để vít về đúng chỗ stab
      z={flip ? -sc.z : sc.z}
      y={flip ? 0 : y}
      mode={SCREW_STEPS[step]}
      interactive={cur === step}
      bit={bit}
      requiredBit={requiredBit}
      style={SCREW_STYLES[step]}
    />
  ))
  return (
    <>
      {flip ? (
        <group position-y={y} rotation-x={Math.PI}>
          {list}
        </group>
      ) : (
        list
      )}
      {/* bảng chọn đầu vít nằm ở HUD (giữa trên màn hình); thay đầu thì tua vít hiện ra cạnh bàn để xem */}
      {cur === step && <BitSwapPreview at={[0, (flip ? 0 : y) + 1.4, ctx.depth / 2 + 1]} />}
    </>
  )
}

/** Tua vít đang dùng (tay / điện) gắn đầu vít đang chọn */
function CurrentDriver({ spinKey, dir }: { spinKey: number; dir?: 1 | -1 }) {
  const electric = useGame((s) => s.tools.screw > 0)
  const bit = useGame((s) => s.screwBit)
  const prevBit = useGame((s) => s.prevScrewBit)
  const swapAt = useGame((s) => s.bitSwapAt)
  return (
    <BitDriver
      electric={electric}
      bit={bit}
      prevBit={prevBit}
      swapAt={swapAt}
      spinKey={spinKey}
      dir={dir}
    />
  )
}

/** Vừa thay đầu vít: tua vít hiện ở mép trước bàn chạy hiệu ứng tháo / lắp đầu rồi ẩn đi */
function BitSwapPreview({ at }: { at: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = (performance.now() - useGame.getState().bitSwapAt) / 1000
    if (ref.current) ref.current.visible = t >= 0 && t < BIT_SWAP_MS / 1000
  })
  return (
    <group ref={ref} position={at} rotation-z={-0.25} scale={2.4} visible={false}>
      <CurrentDriver spinKey={0} />
    </group>
  )
}
