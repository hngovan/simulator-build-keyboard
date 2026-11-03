import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Clone, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { useGame, useBuild, useCtx, useStep } from '@/store'
import { DTB_MM, USB_PORT_MM, Y, torqueSpec } from '@/data/steps'
import { screwLevel } from '@/data/parts'
import { SkillBar } from '@/components/game/SkillBar'
import { SKILL_PORTAL } from '@/components/game/skillPortal'
import { skillBusy, startSkill, useSkill } from '../common/skill'
import { playClick, playScrew } from '@/sound'
import { useHover } from '../common/useHover'
import { HINT_COLOR, HINT_HOVER } from '../common/hoverOutline'
import { HintArrow } from '../stations/StationKit'
import { MM } from '../models/Switch'
import type { DtbSpot } from '@/types'
import type { WallPort } from './caseShell'

// Daughterboard ai03 Unified C3 (MIT, `bun run convert:dtb`) bắt vào sàn case sát vách sau, cổng USB-C ló ra lỗ khoét vách;
// dây JST SH 4 pin (dựng bằng code: 2 đầu cắm + 4 sợi dây AWG28) nối DTB với cổng JST mặt dưới PCB.
// Toạ độ trong file: u, gốc = tâm mặt dưới DTB (`DtbSpot`: case CAD có thể kê trụ / nghiêng theo sàn), trừ `PcbJst` nằm trong hệ board

const DTB_GLB = '/models/dtb/unified-c3.glb'
const SCREW_GLB = '/models/screws/socket-cap-m2x6.glb'
useGLTF.preload(DTB_GLB)

/** khe chừa trên gờ đỡ trong lòng case cho DTB (u) */
export const DTB_GAP = (DTB_MM.w + 2) * MM
/** lỗ cổng USB-C khoét xuyên vách sau case (tâm ngang tâm cổng USB-C của DTB nằm trên sàn) */
export const usbPort = (x: number): WallPort => ({
  x,
  y: Y.floorTop + DTB_MM.usb.y * MM,
  w: USB_PORT_MM.w * MM,
  h: USB_PORT_MM.h * MM,
  r: USB_PORT_MM.r * MM,
})

/** đầu dây chưa cắm nằm trên sàn trước DTB (case không rãnh dây): lệch so với DTB (u) */
const LOOSE = { dx: 0.63, dz: 1.6 }
/** đầu dây chưa cắm dựng đứng ló lên khỏi sàn / khe rãnh (u): miệng đầu cắm cao hơn chỗ dây nằm, cho thấy là chờ cắm */
const LOOSE_RISE = 0.5

/** đầu cắm dựng đứng: miệng ở `at` quay lên, thân + dây chĩa xuống */
function StandPlug({ at, mat }: { at: THREE.Vector3; mat?: ReactNode }) {
  return (
    <group position={at} rotation-x={-Math.PI / 2}>
      <Plug at={ORIGIN} dir={-1} mat={mat} />
    </group>
  )
}
/**
 * đầu cắm dây (SHR-04V-S, mm): rộng, cao, dài; cắm lút vào cổng `in` (gần hết thân, chừa 0,3mm mép: cắm hờ 2mm thì thân đầu cắm
 * lòi ra ngoài jack, che chỗ dây ra)
 */
const PLUG = { w: 5, h: 2.4, l: 4.2, in: 3.9 }
/** dây 4 sợi bước 1mm (VBUS / D− / D+ / GND), bán kính sợi (mm) */
const WIRES = ['#d63a2f', '#f2f2f2', '#3aa457', '#1d1d1f']
const WIRE_R = 0.42
/** tâm miệng cổng JST trên PCB (hệ board): cổng treo ngược dưới mặt PCB, thấp hơn mặt dưới PCB 1,45mm */
const PCB_MOUTH_Y = Y.pcbBot - 1.45 * MM
/** bước cắm dây vào PCB: board dựng gần thẳng đứng (mép sau ở dưới, mặt dưới PCB quay ra trước) cho thấy cổng JST */
const STAND_TILT = -1.35

/**
 * Tư thế board lúc dựng ở bước `jst` (chưa cắm): xoay quanh trục x qua tâm board, mép sau nằm trên mép sau case
 * (`depth` = bề sâu board, u). Board (và case trên top mount đã bắt vít vào plate) lerp tới tư thế này
 */
export function jstStand(depth: number) {
  const s = -Math.sin(STAND_TILT)
  return { y: Y.caseTop + 0.5 * depth * s + 0.35, z: -0.4 * depth, tilt: STAND_TILT }
}

/** bước `jst`: đã bấm cầm đầu dây (chờ bấm jack JST trên PCB để cắm) */
export const useJstPick = create<{ picked: boolean }>(() => ({ picked: false }))

/** group board đang vẽ (Board gán): đầu dây đã cắm đọc vị trí cổng JST theo board thật (nhấc / dựng / ngồi theo seat) */
export const boardGroup: { current: THREE.Group | null } = { current: null }
/** trụ đỡ DTB (case CAD lỗ USB cao hơn sàn): bán kính (mm) */
const POST_R = 2.2
/** bạc ren đồng M2 chìm trong sàn / đầu trụ (mm): bán kính ngoài, lỗ ren */
const INSERT = { r: 1.7, hole: 1 }
/** vít tháo ra: trồi lên khỏi lỗ rồi biến mất (vào khay ốc `ScrewTray`) trong `FLY_MS` */
const FLY_MS = 500
const FLY_UP = 0.6
const insertMat = new THREE.MeshStandardMaterial({
  color: '#c9a646',
  metalness: 0.85,
  roughness: 0.3,
})
const holeMat = new THREE.MeshBasicMaterial({ color: '#141414' })

const plugGeo = new THREE.BoxGeometry(PLUG.w * MM, PLUG.h * MM, PLUG.l * MM)
const plugMat = new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.6 })
const wireMats = WIRES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }))
const ghostMat = (hover: boolean) => (
  <meshBasicMaterial
    color={hover ? HINT_HOVER : HINT_COLOR}
    transparent
    opacity={hover ? 0.85 : 0.5}
    depthWrite={false}
  />
)

type Nodes = Record<string, THREE.Mesh>

/** mạch DTB (mạch đen + cổng USB-C + linh kiện + cổng JST); ghost = khối xanh chờ đặt */
function DtbModel({ ghost }: { ghost?: ReactNode }) {
  const { nodes } = useGLTF(DTB_GLB) as unknown as { nodes: Nodes }
  return (
    <group scale={MM}>
      {['pcb', 'usb', 'parts', 'jst'].map((n) => (
        <mesh
          key={n}
          geometry={nodes[n].geometry}
          material={ghost ? undefined : nodes[n].material}
          castShadow={!ghost}
          receiveShadow
        >
          {ghost}
        </mesh>
      ))}
    </group>
  )
}

/** vật bấm được (chấm xanh / khối mờ), viền sáng khi rê chuột */
function Target({
  children,
  onPick,
}: {
  children: (hover: boolean) => ReactNode
  onPick: () => void
}) {
  const { hover, bind } = useHover(true)
  return (
    <group
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onPick()
      }}
      {...bind}
    >
      {children(hover)}
    </group>
  )
}

/** đầu cắm dây JST: `at` = miệng cổng, `dir` = hướng dây chạy ra (+1 tới trước / −1 ra sau) */
function Plug({ at, dir, mat }: { at: THREE.Vector3; dir: 1 | -1; mat?: ReactNode }) {
  return (
    <mesh
      geometry={plugGeo}
      material={mat ? undefined : plugMat}
      position={[at.x, at.y, at.z + dir * (PLUG.l / 2 - PLUG.in) * MM]}
      castShadow
    >
      {mat}
    </mesh>
  )
}

/**
 * 4 sợi dây từ đuôi đầu cắm DTB (a, chạy tới +z) tới đuôi đầu cắm còn lại (b, dây chạy ra theo `out`); `via` = nằm dọc rãnh
 * đi dây của case (hệ DTB), không có thì chùng xuống giữa 2 đầu.
 * 4 sợi xếp dẹt như dây JST thật: lệch nhau theo phương ngang vuông góc hướng dây (trước lệch cố định theo x → đoạn dây chạy
 * dọc trục z 4 sợi chồng khít nhau, chớp sọc); đoạn dựng đứng giữ phương lệch của đoạn trước
 */
function wireGeometries(
  a: THREE.Vector3,
  b: THREE.Vector3,
  out: THREE.Vector3,
  via: THREE.Vector3[],
) {
  const lead = 0.3
  const ends = [b.clone().addScaledVector(out, lead), b.clone()]
  const pts = [a.clone(), a.clone().add(new THREE.Vector3(0, 0, via.length ? 0.1 : lead))]
  if (via.length) pts.push(...via.map((p) => p.clone()))
  else {
    // dây dài, chùng xuống giữa 2 đầu khi 2 đầu gần nhau (nằm dưới PCB)
    const mid = pts[1].clone().lerp(ends[0], 0.5)
    mid.y = Math.min(pts[1].y, ends[0].y) + 0.05
    pts.push(mid)
  }
  pts.push(...ends)
  const center = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const n = via.length ? 120 : 40
  const up = new THREE.Vector3(0, 1, 0)
  let side = new THREE.Vector3(1, 0, 0)
  const samples = Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n
    const tan = center.getTangentAt(t)
    const s = new THREE.Vector3().crossVectors(tan, up)
    // dây gần thẳng đứng: tích có hướng ≈ 0 → giữ phương cũ
    if (s.lengthSq() > 0.04) side = s.normalize().multiplyScalar(Math.sign(s.dot(side)) || 1)
    return { p: center.getPointAt(t), side: side.clone() }
  })
  return WIRES.map((_, i) => {
    const d = (i - 1.5) * MM
    const curve = new THREE.CatmullRomCurve3(
      samples.map((x) => x.p.clone().addScaledVector(x.side, d)),
    )
    return new THREE.TubeGeometry(curve, n * 2, WIRE_R * MM, 6)
  })
}

/** dây JST: đầu DTB cắm sẵn; đầu kia nằm trong case (chưa cắm) hoặc cắm vào cổng PCB, theo board nhấc lên / thả xuống */
function JstCable({ at }: { at: DtbSpot }) {
  const step = useStep()
  const b = useBuild()
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const plugRef = useRef<THREE.Group>(null)
  const plugged = !!b.jst
  const mouth = useMemo(() => new THREE.Vector3(0, DTB_MM.jst.y * MM, DTB_MM.jst.z * MM), [])
  const tailA = useMemo(
    () => mouth.clone().add(new THREE.Vector3(0, 0, (PLUG.l - PLUG.in) * MM)),
    [mouth],
  )
  // rãnh đi dây (case CAD): đổi về hệ DTB, dây nằm sát đáy rãnh; bỏ điểm sát miệng JST (dây vừa ra khỏi đầu cắm)
  const via = useMemo(() => {
    const toDtb = new THREE.Euler(-at.tilt, 0, 0)
    const pts = (at.groove ?? []).map(([x, y, z]) =>
      new THREE.Vector3(x - at.x, y - at.y + WIRE_R * 2 * MM, z - at.z).applyEuler(toDtb),
    )
    // rãnh dò bắt đầu từ tâm DTB (Duality): mấy điểm đầu nằm dưới mạch / đầu cắm → dây quặt ngược vào gầm mạch, khúc cua bị che.
    // Bỏ điểm đầu rãnh còn trong bề ngang mạch (+1mm) và chưa ra khỏi đuôi đầu cắm: dây ra khỏi đầu cắm cua thẳng tới điểm rãnh ngoài mép mạch
    const under = (p: THREE.Vector3) =>
      Math.abs(p.x) < (DTB_MM.w / 2 + 1) * MM && p.z < tailA.z + 1 * MM
    let first = 0
    while (first < pts.length && under(pts[first])) first++
    return pts.slice(first).filter((p) => p.distanceTo(tailA) > 0.15)
  }, [at, tailA])
  // đầu chưa cắm nằm trên sàn case: cuối rãnh, không rãnh thì trước DTB (DTB kê trụ thì sàn thấp hơn mặt dưới mạch)
  // đầu chưa cắm dựng đứng ló lên khỏi cuối rãnh (không rãnh: khỏi sàn trước DTB), miệng quay lên chờ cắm
  const loose = useMemo(
    () =>
      (via.length
        ? via[via.length - 1].clone()
        : new THREE.Vector3(LOOSE.dx, at.floor - at.y, mouth.z + LOOSE.dz)
      ).setY((via.length ? via[via.length - 1].y : at.floor - at.y) + LOOSE_RISE),
    [mouth, at, via],
  )
  // miệng cổng JST trên PCB (hệ board): cổng treo ngược dưới mặt PCB, miệng quay ra sau
  const pcbLocal = useMemo(() => new THREE.Vector3(at.jack.x, PCB_MOUTH_Y, at.jack.z), [at])
  // hướng jack trên PCB (xoay quanh trục đứng của board, né socket / chân switch: `DtbSpot.jack`)
  const jackQ = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), at.jack.ry),
    [at],
  )
  const root = useRef<THREE.Group>(null)
  const last = useRef('')
  const q = useMemo(() => new THREE.Quaternion(), [])
  const tmp = useMemo(() => new THREE.Quaternion(), [])
  useFrame(() => {
    const board = boardGroup.current
    // chưa cắm: đầu cắm dựng đứng (đang cầm thì nhấc cao hơn), dây chạy xuống; đã cắm: theo jack trên board
    let end = useJstPick.getState().picked && !plugged ? loose.clone().setY(loose.y + 0.12) : loose
    let back = new THREE.Vector3(0, plugged ? 0 : -1, plugged ? -1 : 0)
    if (plugged && board && root.current) {
      end = root.current.worldToLocal(board.localToWorld(pcbLocal.clone()))
      board.getWorldQuaternion(q)
      root.current.getWorldQuaternion(tmp)
      q.premultiply(tmp.invert()).multiply(jackQ)
      back = back.applyQuaternion(q)
      plugRef.current?.position.copy(end)
      plugRef.current?.quaternion.copy(q)
    }
    const key = [...end.toArray(), ...back.toArray()].map((v) => v.toFixed(4)).join()
    if (key === last.current) return
    last.current = key
    const tailB = end.clone().addScaledVector(back, (PLUG.l - PLUG.in) * MM)
    // chưa cắm: dây nằm dọc hết rãnh rồi dựng lên đầu cắm ở cuối rãnh
    wireGeometries(tailA, tailB, back, via).forEach((g, i) => {
      const m = meshes.current[i]
      if (!m) return g.dispose()
      m.geometry.dispose()
      m.geometry = g
    })
  })
  useEffect(() => {
    last.current = ''
  }, [plugged])
  const active = step === 'jst' && !plugged
  const picked = useJstPick((p) => p.picked)
  // rời bước / cắm xong thì bỏ cầm
  useEffect(() => {
    useJstPick.setState({ picked: false })
  }, [step, plugged])
  // đang cầm: đầu dây nhấc khỏi sàn chờ cắm vào jack PCB
  const held = loose.clone().setY(loose.y + 0.12)
  return (
    <group ref={root}>
      <Plug at={mouth} dir={1} />
      {WIRES.map((_, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} material={wireMats[i]} castShadow>
          <bufferGeometry />
        </mesh>
      ))}
      {plugged ? (
        // đầu cắm vào cổng PCB: đi theo board (vị trí cập nhật mỗi khung hình)
        <group ref={plugRef}>
          <Plug at={ORIGIN} dir={-1} />
        </group>
      ) : active ? (
        // bấm đầu dây = cầm lên (sáng viền), bấm lại = đặt xuống; cầm rồi thì bấm jack JST trên PCB để cắm (`PcbJst`)
        <>
          <Target
            onPick={() => {
              useJstPick.setState({ picked: !picked })
              playClick(picked ? 700 : 1000)
            }}
          >
            {(hover) => <StandPlug at={picked ? held : loose} mat={ghostMat(hover || picked)} />}
          </Target>
          <StandPlug at={picked ? held : loose} />
          {!picked && <HintArrow at={[loose.x, loose.y + 0.15, loose.z]} size={0.8} />}
        </>
      ) : (
        <StandPlug at={loose} />
      )}
    </group>
  )
}

const ORIGIN = new THREE.Vector3()

/** cổng JST SH 4 pin trên PCB bàn phím (hệ board): treo ngược dưới mặt PCB, miệng quay ra sau đón dây từ DTB */
export function PcbJst() {
  const { dtb } = useCtx()
  const { nodes } = useGLTF(DTB_GLB) as unknown as { nodes: Nodes }
  const step = useStep()
  const plugged = !!useBuild().jst
  const picked = useJstPick((p) => p.picked)
  const plugJst = useGame((s) => s.plugJst)
  if (!dtb) return null
  // đang cầm đầu dây: jack sáng lên, bấm để cắm (board vẫn dựng tới khi người chơi bấm sang bước kế)
  const target = step === 'jst' && picked && !plugged
  return (
    <group position={[dtb.jack.x, Y.pcbBot, dtb.jack.z]} rotation-y={dtb.jack.ry}>
      <group rotation-x={Math.PI}>
        {target && (
          <>
            <Target
              onPick={() => {
                plugJst()
                useJstPick.setState({ picked: false })
                playClick(1300)
              }}
            >
              {(hover) => (
                <mesh position={[0, 1.5 * MM, 2 * MM]}>
                  <boxGeometry args={[8 * MM, 4 * MM, 6 * MM]} />
                  {ghostMat(hover)}
                </mesh>
              )}
            </Target>
            {/* nhóm đã lật ngược: "lên" ở đây là phía mặt dưới PCB → mũi tên chĩa vào jack */}
            <HintArrow at={[0, 0.3, 2 * MM]} size={0.8} />
          </>
        )}
        {/* cổng trong model DTB: đáy ở y 1,65mm, miệng ở z 7,8mm → dời về gốc rồi lật ngược (miệng quay −z) */}
        <mesh
          geometry={nodes.jst.geometry}
          material={nodes.jst.material}
          scale={MM}
          position={[0, -1.65 * MM, -DTB_MM.jst.z * MM]}
          castShadow
        />
      </group>
    </group>
  )
}

/** bạc ren M2 chìm ngang mặt sàn / đầu trụ (vòng đồng + lỗ đen), gốc = mặt trên */
function Insert() {
  return (
    <group rotation-x={-Math.PI / 2} position-y={0.003}>
      <mesh material={insertMat}>
        <ringGeometry args={[INSERT.hole * MM, INSERT.r * MM, 20]} />
      </mesh>
      <mesh material={holeMat}>
        <circleGeometry args={[INSERT.hole * MM, 16]} />
      </mesh>
    </group>
  )
}

/** vít M2 bắt sẵn trong lỗ ren (đầu tựa mặt sàn / đầu trụ) */
function HoleScrew({ at, model }: { at: [number, number, number]; model: THREE.Object3D }) {
  return (
    <group position={at} scale={MM}>
      <Clone object={model} castShadow />
    </group>
  )
}

/** vít vừa tháo: trồi lên rồi ẩn (đã vào khay ốc) */
function FlyScrew({ at, model }: { at: [number, number, number]; model: THREE.Object3D }) {
  const ref = useRef<THREE.Group>(null)
  const start = useRef(0)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    start.current ||= performance.now()
    const t = (performance.now() - start.current) / FLY_MS
    g.position.y = at[1] + Math.min(1, t) * FLY_UP
    g.visible = t < 1
  })
  return (
    <group ref={ref} position={at} scale={MM}>
      <Clone object={model} castShadow />
    </group>
  )
}

/**
 * Daughterboard trong case dưới. Lỗ ren (bạc đồng) + 2 vít M2 bắt sẵn trong case từ đầu; bước `dtb`: tháo 2 vít ra (đặt cạnh lỗ)
 * → đặt mạch → siết lại 2 vít qua lỗ DTB → cắm dây JST; từ đó trở đi nằm cố định trong case
 */
export function Daughterboard({ at }: { at: DtbSpot }) {
  const step = useStep()
  const d = useBuild().dtb ?? {}
  const { unscrewDtb, placeDtb, screwDtb, plugDtb } = useGame.getState()
  const toolLv = useGame((s) => screwLevel(s.tools, s.screwPick))
  // thanh lực đang chạy ở lỗ vít DTB nào
  const skill = useSkill((k) => (k.active?.id.startsWith('dtb-') ? k.active : null))
  const active = step === 'dtb'
  const screws = d.screws ?? {}
  const nextHole = d.placed ? DTB_MM.holes.findIndex((_, i) => !screws[i]) : -1
  const mouth: [number, number, number] = [0, DTB_MM.jst.y * MM, DTB_MM.jst.z * MM]
  const headY = (DTB_MM.t + 2) * MM
  const screwModel = useGLTF(SCREW_GLB).scene
  // kê trụ: mặt dưới mạch cao hơn sàn (case CAD lỗ USB nằm cao)
  const post = at.y - at.floor
  const out = d.out ?? {}
  // vít chưa tháo khỏi lỗ ren (đầu tựa mặt sàn / đầu trụ); đã tháo mà chưa siết lại thì nằm cạnh, phía trước DTB
  const inHole = (i: number): [number, number, number] => [
    DTB_MM.holes[i][0] * MM,
    2 * MM,
    DTB_MM.holes[i][1] * MM,
  ]
  // vít đã tháo lúc vào bàn (tải lại): nằm trong khay rồi, không bay lại
  const [outAtMount] = useState(() => new Set(Object.keys(out).map(Number)))
  const nextOut = !d.placed ? DTB_MM.holes.findIndex((_, i) => !out[i]) : -1
  const allOut = nextOut < 0
  return (
    <group position={[at.x, at.y, at.z]} rotation-x={at.tilt}>
      {post > 0.01 &&
        DTB_MM.holes.map(([hx, hz], i) => (
          <mesh key={i} position={[hx * MM, -post / 2, hz * MM]} castShadow receiveShadow>
            <cylinderGeometry args={[POST_R * MM, POST_R * MM, post, 16]} />
            <meshStandardMaterial color="#b8b2a8" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
      {/* lỗ ren chờ DTB (bị mạch che khi đã đặt) */}
      {!d.placed &&
        DTB_MM.holes.map(([hx, hz], i) => (
          <group key={i} position={[hx * MM, 0, hz * MM]}>
            <Insert />
          </group>
        ))}
      {/* vít M2: bắt sẵn trong lỗ ren (bước DTB bấm để tháo) → tháo ra bay vào khay ốc → siết lại thì vẽ ở dưới (qua lỗ DTB) */}
      {DTB_MM.holes.map((_, i) =>
        screws[i] ? null : !out[i] && !d.placed ? (
          active ? (
            <Target
              key={i}
              onPick={() => {
                unscrewDtb(i)
                playScrew()
              }}
            >
              {(hover) => (
                <>
                  <HoleScrew at={inHole(i)} model={screwModel} />
                  <mesh position={inHole(i)} rotation-x={-Math.PI / 2}>
                    <circleGeometry args={[2.4 * MM, 24]} />
                    {ghostMat(hover || i === nextOut)}
                  </mesh>
                </>
              )}
            </Target>
          ) : (
            <HoleScrew key={i} at={inHole(i)} model={screwModel} />
          )
        ) : (
          active &&
          !d.placed &&
          !outAtMount.has(i) && <FlyScrew key={i} at={inHole(i)} model={screwModel} />
        ),
      )}
      {active && !d.placed && nextOut >= 0 && (
        <HintArrow at={[inHole(nextOut)[0], 0.12, inHole(nextOut)[2]]} size={0.6} />
      )}
      {d.placed ? (
        <DtbModel />
      ) : (
        allOut &&
        active && (
          <>
            <Target
              onPick={() => {
                placeDtb()
                playClick(800)
              }}
            >
              {(hover) => (
                <group position-y={0.25}>
                  <DtbModel ghost={ghostMat(hover)} />
                </group>
              )}
            </Target>
            <HintArrow at={[0, 0.45, 0]} size={0.8} />
          </>
        )
      )}
      {d.placed &&
        DTB_MM.holes.map(([hx, hz], i) =>
          screws[i] ? (
            <group key={i} position={[hx * MM, headY, hz * MM]} scale={MM}>
              <Clone object={screwModel} castShadow />
            </group>
          ) : (
            active && (
              <Target
                key={i}
                onPick={() => {
                  // nhấn giữ: thanh lực chạy như vặn vít assem, nhả chuột thì chấm
                  if (skillBusy()) return
                  startSkill(`dtb-${i}`, torqueSpec(toolLv), (r) => {
                    if (r !== 'low') playClick(r === 'high' ? 300 : 1100)
                    screwDtb(i, r)
                  })
                }}
              >
                {(hover) => (
                  <mesh
                    position={[hx * MM, DTB_MM.t * MM + 0.004, hz * MM]}
                    rotation-x={-Math.PI / 2}
                  >
                    <circleGeometry args={[2.4 * MM, 24]} />
                    {ghostMat(hover || i === nextHole)}
                  </mesh>
                )}
              </Target>
            )
          ),
        )}
      {skill && (
        <Html
          center
          position={[
            DTB_MM.holes[Number(skill.id.slice(4))][0] * MM,
            0.35,
            DTB_MM.holes[Number(skill.id.slice(4))][1] * MM,
          ]}
          zIndexRange={[6, 6]}
          portal={SKILL_PORTAL}
        >
          <SkillBar check={skill.check} />
        </Html>
      )}
      {active && nextHole >= 0 && !skill && (
        <HintArrow
          at={[DTB_MM.holes[nextHole][0] * MM, 0.12, DTB_MM.holes[nextHole][1] * MM]}
          size={0.6}
        />
      )}
      {/* bắt đủ vít: đầu dây JST chờ cắm trước miệng cổng */}
      {active && d.placed && nextHole < 0 && !d.plugged && (
        <>
          <Target
            onPick={() => {
              plugDtb()
              playClick(1300)
            }}
          >
            {(hover) => (
              <Plug
                at={new THREE.Vector3(...mouth).setZ(mouth[2] + 0.12)}
                dir={1}
                mat={ghostMat(hover)}
              />
            )}
          </Target>
          <HintArrow at={[0, mouth[1] + 0.12, mouth[2] + 0.12]} size={0.6} />
        </>
      )}
      {d.plugged && <JstCable at={at} />}
    </group>
  )
}
