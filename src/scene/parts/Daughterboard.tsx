import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Clone, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { useGame, useBuild, useCtx, useStep } from '@/store'
import { DTB_MM, SPIN_MS, USB_PORT_MM, Y, torqueSpec } from '@/data/steps'
import { screwLevel } from '@/data/parts'
import { SkillBar } from '@/components/game/SkillBar'
import { SKILL_PORTAL } from '@/components/game/skillPortal'
import { skillBusy, startSkill, useSkill } from '../common/skill'
import { playClick, playDrill, playScrew } from '@/sound'
import { markScrewSpin } from '../common/screwSpin'
import { CurrentDriver } from './Screw'
import { CASE_FOAM_T } from './Foam'
import { useHover } from '../common/useHover'
import { HINT_COLOR, HINT_HOVER } from '../common/hoverOutline'
import { HintArrow } from '../stations/StationKit'
import { MM } from '../models/Switch'
import type { DtbSpot } from '@/types'
import type { WallPort } from './caseShell'
import { useAssemblyFlipped } from './caseSplit'

// Daughterboard ai03 Unified C3 (MIT, `bun run convert:dtb`) bắt vào sàn case sát vách sau, cổng USB-C ló ra lỗ khoét vách;
// dây JST SH 4 pin (dựng bằng code: 2 đầu cắm + 4 sợi dây AWG28) nối DTB với cổng JST mặt dưới PCB.
// Toạ độ trong file: u, gốc = tâm mặt dưới DTB (`DtbSpot`: case CAD có thể kê trụ / nghiêng theo sàn), trừ `PcbJst` nằm trong hệ board

const DTB_GLB = '/models/dtb/unified-c3.glb'
const SCREW_GLB = '/models/screws/socket-cap-m2x6.glb'
/**
 * vít M2 trong file dài 8mm (đầu 2mm + thân 6mm, gốc = đỉnh đầu, trục −y): bắt sẵn trong lỗ ren đầu nhô 2mm thì mũi xuống 6mm
 * dưới mặt sàn, sàn case dựng bằng code / mica 2 tấm đáy chỉ dày 5,7mm (0,3u) → mũi lòi ra mặt đáy. Rút còn 5,5mm (thân 3,5mm
 * ăn trong bạc ren): mũi chỉ xuống 3,5mm dưới mặt sàn
 */
const SCREW_LEN = 5.5
/** case nhựa sàn mỏng 1,9mm (`ABS_FLOOR`): vít ngắn còn 3,6mm (thân 1,6mm) cho khỏi lòi mặt đáy */
const SCREW_LEN_THIN = 3.6

/** clone model vít, ép mọi đỉnh dưới `SCREW_LEN` lên đúng mức đó (thân hình trụ nên chỉ ngắn lại, đầu giữ nguyên) */
function shortScrew(src: THREE.Object3D, len = SCREW_LEN) {
  const out = src.clone(true)
  out.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const g = (o.geometry as THREE.BufferGeometry).clone()
    const pos = g.getAttribute('position')
    // đỉnh trong hệ mesh: đổi qua hệ gốc model bằng ma trận của mesh (file chỉ có 1 node, thường là ma trận đơn vị)
    o.updateWorldMatrix(true, false)
    const m = o.matrixWorld
    const inv = m.clone().invert()
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m)
      if (v.y < -len) pos.setXYZ(i, ...v.setY(-len).applyMatrix4(inv).toArray())
    }
    pos.needsUpdate = true
    g.computeBoundingBox()
    g.computeBoundingSphere()
    o.geometry = g
  })
  return out
}
useGLTF.preload(DTB_GLB)

/** lỗ cổng USB-C khoét xuyên vách sau case (tâm ngang tâm cổng USB-C của DTB nằm trên sàn) */
export const usbPort = (x: number, floor: number = Y.floorTop): WallPort => ({
  x,
  y: floor + DTB_MM.usb.y * MM,
  w: USB_PORT_MM.w * MM,
  h: USB_PORT_MM.h * MM,
  r: USB_PORT_MM.r * MM,
})

/** đầu dây chưa cắm nằm trên sàn trước DTB (case không rãnh dây): lệch so với DTB (u) */
const LOOSE = { dx: 0.63, dz: 1.6 }
/** các chỗ thử đặt đầu dây (dx, dz) khi chỗ mặc định vướng standoff tray: gần trước, xa sau */
const LOOSE_TRY: [number, number][] = [
  [LOOSE.dx, LOOSE.dz],
  ...[1.6, 1.3, 1.9, 1.0, 2.2].flatMap((dz) =>
    [0.63, -0.63, 0.3, -0.3, 1, -1, 0].map((dx) => [dx, dz] as [number, number]),
  ),
]
/** dây + đầu cắm cách tâm standoff tối thiểu (u): bán kính trụ 0,1 + nửa bề ngang đầu cắm / dây */
const POST_CLEAR = 0.26

/** khoảng cách từ điểm `p` tới đoạn `a`–`b` trên mặt sàn (x, z) */
function segDist(p: [number, number], a: [number, number], b: [number, number]) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]]
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)),
  )
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}
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
  /** cao độ sàn case (hệ DTB): có thì dây (không rãnh) ra khỏi đầu cắm DTB là hạ sát sàn, chạy dọc sàn tới dưới jack rồi mới
   * dựng lên cắm — sàn thấp hơn socket hotswap / chân switch nên dây không đè lên chúng */
  floor?: number,
) {
  // dây nằm sàn: đoạn ló khỏi jack ngắn để chỗ dựng lên sát ngay miệng jack (jack đã né socket, xa hơn có thể đụng)
  const lead = floor !== undefined && !via.length ? 0.12 : 0.3
  const ends = [b.clone().addScaledVector(out, lead), b.clone()]
  const pts = [a.clone(), a.clone().add(new THREE.Vector3(0, 0, via.length ? 0.1 : lead))]
  if (via.length) pts.push(...via.map((p) => p.clone()))
  else if (floor !== undefined) {
    // hạ xuống sàn ngay trước DTB, chạy sát sàn, tới dưới đầu dây ló khỏi jack thì dựng thẳng lên
    const down = pts[1]
      .clone()
      .add(new THREE.Vector3(0, 0, 0.12))
      .setY(floor)
    const under = ends[0].clone().setY(floor)
    const dist = Math.hypot(under.x - down.x, under.z - down.z)
    pts.push(down)
    // điểm giữa dọc sàn: giữ dây phẳng, không võng / cong lên khỏi sàn
    const n = Math.floor(dist / 0.4)
    for (let k = 1; k < n; k++) pts.push(down.clone().lerp(under, k / n))
    if (dist > 0.15) pts.push(under)
    // dựng lên: 1 điểm lưng chừng sát đường thẳng đứng cho khúc cua gọn
    pts.push(under.clone().setY((floor + ends[0].y) / 2))
  } else if (ends[0].z < pts[1].z) {
    // jack nằm sau đầu cắm DTB (board đang dựng / nhấc trên case): dây vòng lên trước rồi vắt qua phía trên mạch DTB,
    // không chạy ngược ra sau xuyên qua mạch
    const hump = pts[1].clone().add(new THREE.Vector3(0, 0.25, 0.12))
    pts.push(hump)
    const over = hump.clone().lerp(ends[0], 0.5)
    over.y = Math.max(hump.y + 0.05, over.y)
    pts.push(over)
  } else {
    // dây dài, chùng xuống giữa 2 đầu khi 2 đầu gần nhau (nằm dưới PCB)
    const mid = pts[1].clone().lerp(ends[0], 0.5)
    mid.y = Math.min(pts[1].y, ends[0].y) + 0.05
    pts.push(mid)
  }
  pts.push(...ends)
  const center = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const n = via.length ? 120 : floor !== undefined ? 80 : 40
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
  const ctx = useCtx()
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
  // không rãnh: né standoff tray (trụ đồng dưới PCB, `TrayStandoffs` trong Case.tsx) — dây từ đuôi đầu cắm DTB chạy thẳng tới đầu
  // chưa cắm không được đi xuyên trụ, thử lần lượt các chỗ `LOOSE_TRY`
  const looseXz = useMemo(() => {
    if (via.length || ctx.mount !== 'tray') return LOOSE_TRY[0]
    const seat = ctx.caseDef.seat
    const posts = ctx.screws.trayScrew.map(
      (p) => [p.x + (seat?.dx ?? 0) - at.x, p.z + (seat?.dz ?? 0) - at.z] as [number, number],
    )
    const from: [number, number] = [0, tailA.z]
    return (
      LOOSE_TRY.find(([dx, dz]) => {
        const to: [number, number] = [dx, mouth.z + dz]
        return posts.every((p) => segDist(p, from, to) > POST_CLEAR)
      }) ?? LOOSE_TRY[0]
    )
  }, [ctx, at, via, mouth, tailA])
  const loose = useMemo(
    () =>
      (via.length
        ? via[via.length - 1].clone()
        : new THREE.Vector3(looseXz[0], at.floor - at.y, mouth.z + looseXz[1])
      ).setY((via.length ? via[via.length - 1].y : at.floor - at.y) + LOOSE_RISE),
    [mouth, at, via, looseXz],
  )
  // miệng cổng JST trên PCB (hệ board): cổng treo ngược dưới mặt PCB, miệng quay ra sau
  const pcbLocal = useMemo(() => new THREE.Vector3(at.jack.x, PCB_MOUTH_Y, at.jack.z), [at])
  // sàn case (hệ DTB): dây đã cắm nằm sát sàn, thấp hơn socket hotswap + chân switch dưới PCB nên không đè lên.
  // Chỉ khi board đã thả vào case: board còn dựng / nhấc (bước jst, lắp lại tạ) thì dây vắt lên không
  // lót foam đáy case: dây / đầu dây chờ cắm nằm trên mặt foam
  const foamUp = b.caseFoam ? CASE_FOAM_T : 0
  const floorY = at.floor - at.y + WIRE_R * MM + foamUp
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
    wireGeometries(tailA, tailB, back, via, plugged && b.inCase ? floorY : undefined).forEach(
      (g, i) => {
        const m = meshes.current[i]
        if (!m) return g.dispose()
        m.geometry.dispose()
        m.geometry = g
      },
    )
  })
  // cắm / thả board vào case: đổi kiểu đi dây (vắt lên không / nằm sàn) thì dựng lại
  useEffect(() => {
    last.current = ''
  }, [plugged, b.inCase])
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

/** vít M2 DTB nằm chờ trên miệng lỗ lúc siết (u) */
const DTB_RISE = 0.08

/**
 * 1 lỗ vít M2 của DTB (vít lấy từ khay ốc, lỗ ren trên sàn case để trống tới lúc đặt DTB), có hoạt cảnh tua vít như vít
 * assem (`Screw.tsx`): rê chuột hiện tua vít trên đầu vít. `tighten` = DTB đã đặt, nhấn giữ chạy thanh lực (vít + tua vít quay trên miệng lỗ), đạt thì vít lún xuống;
 * `done` = vít đã siết (vẽ tĩnh)
 */
function DtbHole({
  i,
  mode,
  pos,
  model,
  hint,
}: {
  i: number
  mode: 'tighten' | 'done'
  /** vị trí vít đã bắt chặt (u, hệ DTB) */
  pos: [number, number, number]
  model: THREE.Object3D
  hint: boolean
}) {
  const toolLv = useGame((s) => screwLevel(s.tools, s.screwPick))
  const spinMs = toolLv ? SPIN_MS.electric : SPIN_MS.manual
  const skill = useSkill((k) => (k.active?.id === `dtb-${i}` ? k.active : null))
  const { hover, bind } = useHover(mode !== 'done')
  // nhịp quay tua vít: mỗi thao tác + mỗi nhịp lúc giữ thanh lực
  const [kick, setKick] = useState(0)
  const [tick, setTick] = useState(0)
  // hoạt cảnh siết xong (cục bộ): vít lún xuống theo nhịp tua vít
  const [anim, setAnim] = useState<{ at: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!anim) return
    markScrewSpin(spinMs)
    timer.current = setTimeout(() => setAnim(null), spinMs)
  }, [anim, spinMs])
  const screw = useRef<THREE.Group>(null)
  const tool = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const now = performance.now()
    if (skill) {
      const n = Math.floor((now - skill.check.at) / spinMs)
      if (n !== tick) setTick(n)
    }
    const k = anim ? Math.min(1, (now - anim.at) / spinMs) : 0
    const rise = anim ? (1 - k) * DTB_RISE : mode === 'tighten' ? DTB_RISE : 0
    const turning = !!skill || (anim !== null && k < 1)
    if (screw.current) {
      screw.current.position.y = pos[1] + rise
      if (turning) screw.current.rotation.y -= dt * 8
    }
    tool.current?.position.setY(pos[1] + rise + 0.02)
  })
  const onDown = () => {
    // nhấn giữ: thanh lực chạy như vặn vít assem, nhả chuột thì chấm
    if (mode !== 'tighten' || skillBusy()) return
    if (toolLv) playDrill()
    else playScrew()
    startSkill(`dtb-${i}`, torqueSpec(toolLv), (r) => {
      if (r !== 'low') playClick(r === 'high' ? 300 : 1100)
      useGame.getState().screwDtb(i, r)
      // siết vào (kể cả tuôn ren): vít lún xuống theo nhịp tua vít rồi mới vẽ tĩnh
      if (useGame.getState().build?.dtb?.screws?.[i]) {
        setAnim({ at: performance.now() })
        setKick((k) => k + 1)
      }
    })
  }
  // vít hiện: đã siết hoặc đang tra trên miệng lỗ lúc siết
  const showScrew = mode === 'done' || !!skill
  const showTool = (mode !== 'done' && hover) || !!skill || anim !== null
  const ringY = pos[1] - 2 * MM + 0.004
  return (
    <>
      {showScrew && (
        <group ref={screw} position={pos} scale={MM}>
          <Clone object={model} castShadow />
        </group>
      )}
      {mode !== 'done' && (
        <group
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            onDown()
          }}
          {...bind}
        >
          {/* vùng bấm vô hình quanh đầu vít (vòng xanh ẩn khi rê / đang vặn không làm mất hover) */}
          <mesh position={[pos[0], pos[1] + DTB_RISE / 2, pos[2]]} visible={false}>
            <cylinderGeometry args={[3 * MM, 3 * MM, DTB_RISE + 0.05, 12]} />
          </mesh>
          {!showTool && (
            <mesh position={[pos[0], ringY, pos[2]]} rotation-x={-Math.PI / 2} raycast={noHit}>
              <circleGeometry args={[2.4 * MM, 24]} />
              {ghostMat(hint)}
            </mesh>
          )}
        </group>
      )}
      {hint && !showTool && <HintArrow at={[pos[0], 0.12, pos[2]]} size={0.6} />}
      {showTool && (
        <group ref={tool} position={pos} rotation={[0.35, 0, -0.3]} scale={1.6}>
          <CurrentDriver spinKey={kick * 1000 + tick} dir={-1} />
        </group>
      )}
      {skill && (
        <Html center position={[pos[0], 0.35, pos[2]]} zIndexRange={[6, 6]} portal={SKILL_PORTAL}>
          <SkillBar check={skill.check} />
        </Html>
      )}
    </>
  )
}

/** raycast rỗng: vòng chỉ dẫn không nhận chuột */
const noHit = () => {}

/**
 * Daughterboard trong case dưới. Lỗ ren (bạc đồng) trên sàn case để trống, 2 vít M2 nằm sẵn trên khay ốc; bước `dtb`: đặt mạch
 * → siết 2 vít qua lỗ DTB → cắm dây JST; từ đó trở đi nằm cố định trong case
 */
export function Daughterboard({ at }: { at: DtbSpot }) {
  const step = useStep()
  const d = useBuild().dtb ?? {}
  const { placeDtb, plugDtb } = useGame.getState()
  // thanh lực đang chạy ở lỗ vít DTB nào
  const skill = useSkill((k) => (k.active?.id.startsWith('dtb-') ? k.active : null))
  // lật case xem đáy (Q) thì tạm khoá đặt mạch / vít / dây (mặt trong case quay xuống, bấm xuyên sàn)
  const flipped = useAssemblyFlipped()
  const active = step === 'dtb' && !flipped
  const screws = d.screws ?? {}
  const nextHole = d.placed ? DTB_MM.holes.findIndex((_, i) => !screws[i]) : -1
  const mouth: [number, number, number] = [0, DTB_MM.jst.y * MM, DTB_MM.jst.z * MM]
  const headY = (DTB_MM.t + 2) * MM
  const screwSrc = useGLTF(SCREW_GLB).scene
  // kê trụ: mặt dưới mạch cao hơn sàn (case CAD lỗ USB nằm cao / case nhựa trụ nhựa đúc liền sàn)
  const post = at.y - at.floor
  // case nhựa (sàn mỏng): trụ kê là trụ nhựa liền sàn (Case.tsx `DtbPosts`), không vẽ trụ kim loại
  const plastic = at.floor < Y.floorTop - 1e-6 && at.tilt === 0
  // sàn mỏng không trụ: vít ngắn hơn cho khỏi lòi mặt đáy
  const thin = plastic && post < 0.01
  const screwModel = useMemo(
    () => shortScrew(screwSrc, thin ? SCREW_LEN_THIN : SCREW_LEN),
    [screwSrc, thin],
  )
  return (
    <group position={[at.x, at.y, at.z]} rotation-x={at.tilt}>
      {post > 0.01 &&
        !plastic &&
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
      {d.placed ? (
        <DtbModel />
      ) : (
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
          screws[i] || active ? (
            <DtbHole
              key={i}
              i={i}
              mode={screws[i] ? 'done' : 'tighten'}
              pos={[hx * MM, headY, hz * MM]}
              model={screwModel}
              hint={i === nextHole && !skill}
            />
          ) : null,
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
