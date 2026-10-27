import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { SCREW_FULL, screwLevel } from '@/data/parts'
import { SCREW_BITS, SCREW_STEPS, Y, torqueWindow } from '@/data/steps'
import { cn } from '@/lib/format'
import type { ScrewBit, ScrewPoint, ScrewStep } from '@/types'
import { playDrill, playScrew } from '@/sound'
import { useHover } from '../common/useHover'
import { useCamLock } from '../common/camLock'
import { BIT_SWAP_MS, BitDriver, SCREW_SPIN, SPIN_MS } from '../models/HandTools'
import { MM } from '../models/Switch'
import { HintArrow } from '../stations/StationKit'

interface ScrewProps extends ScrewPoint {
  y?: number
  mode: 'remove' | 'tighten'
  interactive: boolean
  bit: ScrewBit
  requiredBit: ScrewBit
  style: ScrewStyle
  /** thân ốc dài thêm (u) tính từ mặt bắt vít xuống: case mica xếp lớp vít xuyên tới tấm đáy */
  shaft?: number
  /** con vít tiếp theo cần vặn / tháo: mũi tên vàng chỉ vào */
  hint?: boolean
  /** rút ngắn còn tỉ lệ này của chiều dài ốc (giữ đầu ốc), vd vít stab 2/3 */
  short?: number
  /** độ cao miệng lỗ (mặc định = y): vít tray chìm dưới plate thì khung nét đứt / vòng vàng nằm trên mặt plate cho khỏi bị che */
  mouth?: number
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
/** bán kính đầu ốc (mm): ốc tháo ra nằm ngang tì đầu xuống mặt khay / bàn */
const HEAD_R: Record<ScrewStyle, number> = { countersunk: 3, socket: 1.9, button: 2.85 }
const SCREW_STYLES: Record<ScrewStep, ScrewStyle> = {
  caseOpen: 'countersunk',
  stabScrew: 'button',
  topScrew: 'button',
  trayScrew: 'socket',
  // cùng bộ ốc lúc tháo case (caseOpen) vặn lại: cùng kiểu đầu ốc
  caseScrew: 'countersunk',
}

/**
 * Ren xoắn của model ốc (đo từ GLB bằng gltf-transform, đơn vị mm, đỉnh đầu ốc ở y = 0): đường kính ngoài / chân ren, bước ren,
 * pha `y0` của đỉnh ren (đỉnh ren ở chỗ (y + bước·θ/2π − y0) chia hết cho bước: ren phải), đáy model `end`.
 * Thân ren dài vẽ tiếp đúng ren này nên nối liền model, không lộ chỗ ghép
 */
const THREADS: Record<
  ScrewStyle,
  { pitch: number; major: number; minor: number; y0: number; end: number }
> = {
  countersunk: { pitch: 0.5, major: 1.5, minor: 1.19, y0: 0.2496, end: -10 },
  button: { pitch: 0.5, major: 1.5, minor: 1.19, y0: 0.0993, end: -9.65 },
  socket: { pitch: 0.4, major: 1, minor: 0.755, y0: 0.1999, end: -8 },
}
/** vẽ chồng lên đuôi model 1 đoạn (mm) che chỗ model vát mép đuôi */
const THREAD_OVERLAP = 0.4
const threadCache = new Map<string, THREE.BufferGeometry>()
/**
 * Thân ren xoắn dài (vít case mica xuyên mọi lớp), toạ độ mm như model: từ gần đuôi model xuống tới `bottom` (mm),
 * mỗi vòng 32 cạnh, mỗi bước ren 8 lát; bán kính theo pha ren (răng tam giác đỉnh = major, chân = minor),
 * mũi vát vào tâm. Cache theo cỡ ốc + độ dài (dùng chung giữa các con vít)
 */
function threadGeometry(style: ScrewStyle, bottom: number) {
  const key = `${style}:${Math.round(bottom * 100)}`
  let geo = threadCache.get(key)
  if (geo) return geo
  const t = THREADS[style]
  const top = t.end + THREAD_OVERLAP
  const SEG = 32
  const rows = Math.max(2, Math.ceil(((top - bottom) / t.pitch) * 8))
  const pos: number[] = []
  const idx: number[] = []
  const radius = (y: number, th: number) => {
    const u = ((((y + (t.pitch * th) / (2 * Math.PI) - t.y0) / t.pitch) % 1) + 1) % 1
    return t.minor + (t.major - t.minor) * Math.abs(1 - 2 * u)
  }
  for (let j = 0; j <= rows; j++) {
    const y = top - ((top - bottom) * j) / rows
    for (let i = 0; i <= SEG; i++) {
      const th = (i / SEG) * Math.PI * 2
      const r = radius(y, th)
      pos.push(r * Math.cos(th), y, r * Math.sin(th))
    }
  }
  // mũi vít: điểm tâm dưới đáy
  const tip = pos.length / 3
  pos.push(0, bottom - t.minor * 0.6, 0)
  const row = SEG + 1
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < SEG; i++) {
      const a0 = j * row + i
      const b0 = a0 + row
      idx.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0)
    }
  for (let i = 0; i < SEG; i++) idx.push(rows * row + i, rows * row + i + 1, tip)
  geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  threadCache.set(key, geo)
  return geo
}

/**
 * Rút ngắn ốc còn `k` chiều dài (giữ nguyên đầu ốc): đưa các mesh về hệ model (mm, đỉnh đầu ốc y = 0, thân chĩa −y)
 * rồi ép phần thân dưới đầu ốc theo trục y. Hình học clone riêng, không đụng model GLB dùng chung
 */
function shortenScrew(root: THREE.Object3D, style: ScrewStyle, k: number) {
  const total = -THREADS[style].end
  const head = HEAD_H[style]
  const s = (k * total - head) / (total - head)
  root.updateMatrixWorld(true)
  const meshes: THREE.Mesh[] = []
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  for (const m of meshes) {
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y < -head) pos.setY(i, -head + (y + head) * s)
    }
    m.removeFromParent()
    m.geometry = g
    m.position.set(0, 0, 0)
    m.rotation.set(0, 0, 0)
    m.scale.set(1, 1, 1)
    root.add(m)
  }
}

/** mặt đầu ốc (đĩa phẳng r, đỉnh ở y = CAP_TOP) + rãnh đầu vít lõm xuống tới RECESS_Y */
const CAP_R = 0.064
const CAP_TOP = 0.008
const RECESS_Y = 0.001
/** hình rãnh đầu vít trên mặt 2D (u, tâm gốc): chữ thập / sao Torx 6 cánh / rãnh dẹt */
function recessShape(bit: ScrewBit) {
  const shape = new THREE.Shape()
  if (bit === 'phillips') {
    const a = 0.05
    const w = 0.016
    const pts: [number, number][] = [
      [w, w],
      [a, w],
      [a, -w],
      [w, -w],
      [w, -a],
      [-w, -a],
      [-w, -w],
      [-a, -w],
      [-a, w],
      [-w, w],
      [-w, a],
      [w, a],
    ]
    shape.setFromPoints(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  } else if (bit === 'torx') {
    const pts: THREE.Vector2[] = []
    for (let i = 0; i < 12; i++) {
      const r = i % 2 ? 0.026 : 0.046
      const t = (i * Math.PI) / 6
      pts.push(new THREE.Vector2(Math.cos(t) * r, Math.sin(t) * r))
    }
    shape.setFromPoints(pts)
  } else {
    const a = 0.055
    const w = 0.013
    shape.setFromPoints(
      [
        [a, w],
        [-a, w],
        [-a, -w],
        [a, -w],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    )
  }
  return shape
}
const recessCache = new Map<
  ScrewBit,
  { cap: THREE.BufferGeometry; walls: THREE.BufferGeometry; floor: THREE.BufferGeometry }
>()
function recessGeometry(bit: ScrewBit) {
  let g = recessCache.get(bit)
  if (g) return g
  const hole = recessShape(bit)
  const top = new THREE.Shape().absarc(0, 0, CAP_R, 0, Math.PI * 2, false)
  top.holes.push(new THREE.Path(hole.getPoints()))
  g = {
    // mặt đầu ốc phẳng khoét lỗ rãnh
    cap: new THREE.ShapeGeometry(top, 20).rotateX(-Math.PI / 2).translate(0, CAP_TOP, 0),
    // thành rãnh: đùn hình rãnh, chỉ vẽ mặt hông (nhóm 1)
    walls: new THREE.ExtrudeGeometry(hole, { depth: CAP_TOP - RECESS_Y, bevelEnabled: false })
      .rotateX(-Math.PI / 2)
      .translate(0, RECESS_Y, 0),
    floor: new THREE.ShapeGeometry(hole).rotateX(-Math.PI / 2).translate(0, RECESS_Y, 0),
  }
  recessCache.set(bit, g)
  return g
}
/** Đầu ốc chữ thập / Torx / dẹt: rãnh lõm xuống mặt đầu ốc (thành tối + đáy tối), không phải gờ đen nổi lên */
function BitRecess({ bit }: { bit: ScrewBit }) {
  const g = recessGeometry(bit)
  // vật liệu riêng mỗi con: ốc bay ra thì mờ dần (chỉnh opacity), dùng chung sẽ mờ lây sang mọi con khác
  const { CAP_MAT, WALL_MATS, FLOOR_MAT } = useMemo(
    () => ({
      CAP_MAT: new THREE.MeshStandardMaterial({ color: '#b8bec7', metalness: 0.9, roughness: 0.3 }),
      WALL_MATS: [
        new THREE.MeshBasicMaterial({ visible: false }),
        new THREE.MeshStandardMaterial({
          color: '#3a3e44',
          metalness: 0.6,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      ],
      FLOOR_MAT: new THREE.MeshBasicMaterial({ color: '#1e2024' }),
    }),
    [],
  )
  return (
    <>
      <mesh geometry={g.cap} material={CAP_MAT} />
      <mesh position-y={CAP_TOP / 2} material={CAP_MAT}>
        <cylinderGeometry args={[CAP_R, CAP_R, CAP_TOP, 20, 1, true]} />
      </mesh>
      <mesh geometry={g.walls} material={WALL_MATS} />
      <mesh geometry={g.floor} material={FLOOR_MAT} />
    </>
  )
}

const ghostCache = new Map<ScrewStyle, THREE.BufferGeometry>()
/** Khung nét đứt hình đầu ốc (2 vòng tròn đáy / đỉnh đầu + 6 cạnh đứng), mặt dưới ở y = 0 */
function ghostGeometry(style: ScrewStyle) {
  let g = ghostCache.get(style)
  if (g) return g
  const r = HEAD_R[style] * MM
  const h = Math.max(HEAD_H[style] * MM, 0.04)
  const pts: THREE.Vector3[] = []
  const N = 32
  for (const y of [0.004, h])
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2
      const a1 = ((i + 1) / N) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a0) * r, y, Math.sin(a0) * r))
      pts.push(new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r))
    }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.004, Math.sin(a) * r))
    pts.push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r))
  }
  g = new THREE.BufferGeometry().setFromPoints(pts)
  ghostCache.set(style, g)
  return g
}

/** Ốc chưa tra vào lỗ (bước vặn vào, chưa bấm lần nào): khung nét đứt vàng ở miệng lỗ */
function ScrewGhost({ style }: { style: ScrewStyle }) {
  const line = useMemo(() => {
    const l = new THREE.LineSegments(
      ghostGeometry(style),
      new THREE.LineDashedMaterial({ color: '#ffd84a', dashSize: 0.025, gapSize: 0.018 }),
    )
    l.computeLineDistances()
    return l
  }, [style])
  return <primitive object={line} />
}

/** thời gian ốc bay ra khỏi lỗ sau lần vặn cuối khi tháo (ms) */
export const OUT_MS = 800
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Con vít: click để vặn (tua vít tay 3 lần, tua vít điện 1 lần). Rê chuột hiện tua vít.
 * Vặn vào: xoay cùng chiều kim đồng hồ, lún dần xuống. Tháo: xoay ngược chiều, trồi dần lên theo
 * ren; lần cuối ốc tuột khỏi lỗ, bay lên, nghiêng và mờ dần rồi mới biến mất
 */
function Screw({
  id,
  x,
  y = 0,
  z,
  mode,
  interactive,
  bit,
  requiredBit,
  style,
  shaft = 0,
  hint = false,
  short = 1,
  mouth = y,
}: ScrewProps) {
  const turns = useGame((s) => s.build?.screws[id] ?? 0)
  const toolLv = useGame((s) => screwLevel(s.tools, s.screwPick))
  const turnScrew = useGame((s) => s.turnScrew)
  const tightenScrew = useGame((s) => s.tightenScrew)
  // tiến độ tính theo mức đầy chung (tay 3 nấc, điện 1 click = đầy)
  const clicks = SCREW_FULL
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
    if (short < 1) shortenScrew(copy, style, short)
    return copy
  }, [scene, short, style])
  // thân ren dài dùng chung vật liệu với model ốc: cùng màu / độ bóng, mờ dần cùng lúc khi ốc bay ra
  const modelMat = useMemo(() => {
    let mat: THREE.Material | undefined
    model.traverse((o) => {
      if (!mat && (o as THREE.Mesh).isMesh) mat = (o as THREE.Mesh).material as THREE.Material
    })
    return mat
  }, [model])
  const spinMs = toolLv ? SPIN_MS.electric : SPIN_MS.manual
  const p = Math.min(1, turns / clicks)
  // vặn vào: giữ chuột siết, lực (giây) chạy theo thanh; vùng chặt ngẫu nhiên theo tua vít mỗi lần bấm
  const hold = useRef<{ at: number; base: number; lo: number; hi: number } | null>(null)
  const [held, setHeld] = useState<{ t: number; lo: number; hi: number } | null>(null)
  const [spinTick, setSpinTick] = useState(0)
  const holding = !!held
  useEffect(() => {
    if (!holding) return
    useCamLock.setState({ locked: true })
    return () => useCamLock.setState({ locked: false })
  }, [holding])
  const holdTime = () => {
    const h = hold.current
    return h ? h.base + (performance.now() - h.at) / 1000 : 0
  }
  const release = () => {
    const h = hold.current
    if (!h) return
    const t = holdTime()
    hold.current = null
    setHeld(null)
    tightenScrew(id, t, h)
  }
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
    const h = hold.current
    if (h) {
      const t = holdTime()
      shown.current = Math.min(1, t / h.lo)
      a.from = shown.current
      setHeld({ t, lo: h.lo, hi: h.hi })
      // tua vít quay liên tục: mỗi nhịp quay 1 lần
      const tick = Math.floor(((now - h.at) / spinMs) * (toolLv ? 1 : 1.5))
      if (tick !== spinTick) setSpinTick(tick)
      // giữ quá vùng chặt: tuôn ren ngay, không chờ nhả chuột
      if (t >= h.hi) release()
    }
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
  const want = hover || busy || !!held
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
          if (!interactive || done || hold.current) return
          e.stopPropagation()
          if (toolLv) playDrill()
          else playScrew()
          if (mode === 'remove') return turnScrew(id)
          const win = torqueWindow(toolLv)
          // sai đầu vít: trượt toét ren ngay khi siết
          if (bit !== requiredBit) return tightenScrew(id, 0, win)
          hold.current = { at: performance.now(), base: (turns / clicks) * win.lo, ...win }
          setHeld({ t: hold.current.base, ...win })
        }}
        onPointerUp={release}
        onPointerOver={bind.onPointerOver}
        onPointerOut={() => {
          bind.onPointerOut()
          release()
        }}
      >
        {/* vặn vào mà chưa bấm lần nào: chỉ khung nét đứt ở miệng lỗ (ốc chưa tra), bấm mới tra ốc vào rồi vặn */}
        {mode === 'tighten' && turns === 0 && (
          <group position-y={mouth - y - liftAt(0)}>
            <ScrewGhost style={style} />
          </group>
        )}
        {!gone && !(mode === 'tighten' && turns === 0) && (
          // model có đỉnh đầu ốc ở y = 0: nâng lên 1 đầu ốc để mặt dưới đầu tì vào bề mặt,
          // thân ốc chui vào trong (vít stab bắt từ đáy PCB thì thân ăn vào housing, không lòi lên mặt trên)
          <group ref={head} position-y={HEAD_H[style] * MM}>
            <primitive object={model} scale={MM} />
            {shaft > 0 && (
              // thân ren dài xuyên các lớp mica (model gốc chỉ dài 6–10mm)
              // cùng hệ toạ độ với model (mm, đỉnh đầu ốc y = 0): đáy thân ren = mặt bắt vít − shaft
              <mesh
                geometry={threadGeometry(style, -HEAD_H[style] - shaft / MM)}
                material={modelMat}
                scale={MM}
                castShadow
              />
            )}
            {requiredBit !== 'hex' && <BitRecess bit={requiredBit} />}
          </group>
        )}
        {interactive && !done && !hover && (
          // ốc chưa tra: vòng vàng nằm sát miệng lỗ (quanh khung nét đứt), không lơ lửng chỗ ốc chờ
          <mesh
            position-y={mode === 'tighten' && turns === 0 ? mouth - y + 0.04 - liftAt(0) : 0.04}
            rotation-x={-Math.PI / 2}
          >
            <ringGeometry args={[0.15, 0.2, 24]} />
            <meshBasicMaterial color="#ffd84a" transparent opacity={0.8} />
          </mesh>
        )}
        {/* mũi tên vàng chỉ con vít tiếp theo (rê chuột vào / đang vặn thì ẩn cho thấy tua vít) */}
        {hint && interactive && !done && !hover && !busy && !held && <HintArrow at={[0, 0.3, 0]} />}
        {held && (
          <Html center position={[0, 0.3, 0]} zIndexRange={[6, 6]}>
            <TorqueBar t={held.t} lo={held.lo} hi={held.hi} />
          </Html>
        )}
      </group>
      {showTool && interactive && (
        <group ref={tool} position-y={y + liftAt(p) + 0.04} rotation={[0.35, 0, -0.3]} scale={1.6}>
          <CurrentDriver spinKey={turns * 100 + spinTick} dir={dir} />
        </group>
      )}
    </group>
  )
}

/** px mỗi giây trên thanh lực */
const TORQUE_PX = 110

/** Thanh lực vặn (giây giữ chuột): vàng = đang siết, xanh = nhả là chặt, đỏ = tuôn ren */
function TorqueBar({ t, lo, hi }: { t: number; lo: number; hi: number }) {
  const end = hi + 0.3
  const pct = (x: number) => `${Math.min(100, (x / end) * 100)}%`
  const zone = t < lo ? 'turn' : t < hi ? 'ok' : 'strip'
  return (
    <div
      className="pointer-events-none -translate-y-12 select-none"
      style={{ width: end * TORQUE_PX }}
    >
      <div className="relative h-4 overflow-hidden border-2 border-black/60 bg-[#1b1f28]">
        <div
          className={cn('absolute inset-y-0', zone === 'turn' ? 'bg-green/20' : 'bg-green/75')}
          style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }}
        />
        <div className="absolute inset-y-0 right-0 bg-red/45" style={{ left: pct(hi) }} />
        <div
          className={cn(
            'relative h-full',
            zone === 'turn' ? 'bg-yellow' : zone === 'ok' ? 'bg-green' : 'bg-red',
          )}
          style={{ width: pct(t) }}
        />
      </div>
    </div>
  )
}

/** Bộ vít của 1 bước. flip: vít bắt từ mặt dưới (đầu vít hướng xuống) */
export function ScrewSet({
  step,
  y,
  flip,
  mouth,
}: {
  step: ScrewStep
  y: number
  flip?: boolean
  /** độ cao miệng lỗ (vít chìm trong lỗ, vd vít tray dưới plate) */
  mouth?: number
}) {
  const ctx = useCtx()
  const cur = useStep()
  const bit = useGame((s) => s.screwBit)
  const requiredBit = SCREW_BITS[step]
  // case mica xếp lớp: vít từ mặt trên xuyên mọi tấm, dài tới gần tấm đáy (không chỉ ăn vài lớp trên)
  const longShaft =
    (step === 'caseScrew' || step === 'caseOpen') &&
    ctx.caseDef.material === 'mica' &&
    ctx.screwSide === 'top'
      ? y - Y.floorBot - 0.06
      : step === 'trayScrew'
        ? TRAY_SHAFT
        : 0
  // mũi tên chỉ con vít chưa xong gần giữa board nhất (giữa khung hình, không bị khung HUD 2 bên che), rồi mới ra các góc
  const next = useGame(
    (s) =>
      ctx.screws[step]
        .filter((sc) => (s.build?.screws[sc.id] ?? 0) < SCREW_FULL)
        .sort((a, b) => Math.abs(a.x) - Math.abs(b.x) || a.z - b.z)[0]?.id,
  )
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
      shaft={longShaft}
      hint={sc.id === next}
      // vít stab: model M3×8 lòi lên quá cao qua PCB → ngắn còn 2/3
      short={step === 'stabScrew' ? 2 / 3 : 1}
      mouth={flip ? undefined : mouth}
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
      {/* bảng chọn đầu vít nằm ở HUD (giữa trên màn hình); thay đầu thì tua vít hiện lơ lửng trên giữa board để xem
          (mép trước bàn thì sát đáy khung hình, bị bảng bước che) */}
      {cur === step && <BitSwapPreview at={[0, (flip ? 0 : y) + 0.9, 1.2]} />}
    </>
  )
}

/** Tua vít đang dùng (tay / điện) gắn đầu vít đang chọn */
function CurrentDriver({ spinKey, dir }: { spinKey: number; dir?: 1 | -1 }) {
  const electric = useGame((s) => screwLevel(s.tools, s.screwPick) > 0)
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
    <group ref={ref} position={at} rotation-z={-0.25} scale={1.5} visible={false}>
      <CurrentDriver spinKey={0} />
    </group>
  )
}

/** Độ dài ốc của bước `step` (u): model gốc hoặc thân ren dài thêm (`shaft`, case mica) */
/** thân ren dài của vít tray: đầu ốc tì mặt PCB, xuyên PCB rồi ăn ~0,12u vào trụ đồng */
export const TRAY_SHAFT = Y.pcbTop - Y.pcbBot + 0.12

export function screwLength(step: ScrewStep, shaft = 0) {
  const style = SCREW_STYLES[step]
  return Math.max(-THREADS[style].end, HEAD_H[style] + shaft / MM) * MM
}

/**
 * Ốc đã tháo nằm ngang (khay đựng ốc / vương trên bàn): đúng model + cỡ + độ dài ốc của bước `step` (kể cả thân ren dài
 * `shaft` của case mica). Trục ốc theo x, tâm ốc ở gốc, mặt dưới đầu ốc tì y = 0
 */
export function LooseScrew({ step, shaft = 0 }: { step: ScrewStep; shaft?: number }) {
  const style = SCREW_STYLES[step]
  const { scene } = useGLTF(SCREW_MODELS[style])
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    return copy
  }, [scene])
  const mat = useMemo(() => {
    let m: THREE.Material | undefined
    model.traverse((o) => {
      if (!m && (o as THREE.Mesh).isMesh) m = (o as THREE.Mesh).material as THREE.Material
    })
    return m
  }, [model])
  const len = screwLength(step, shaft)
  return (
    // xoay +90° quanh z: đỉnh đầu ốc (y = 0 của model) về gốc, thân (−y) chĩa sang +x
    <group position={[-len / 2, HEAD_R[style] * MM, 0]} rotation-z={Math.PI / 2}>
      <primitive object={model} scale={MM} />
      {shaft > 0 && (
        <mesh
          geometry={threadGeometry(style, -HEAD_H[style] - shaft / MM)}
          material={mat}
          scale={MM}
          castShadow
        />
      )}
    </group>
  )
}
