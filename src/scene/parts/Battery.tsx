import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { useBuild, useCtx, useGame, useStep } from '@/store'
import { Y, batteryFits, batterySize } from '@/data/steps'
import { batteryLabel as labelTexture } from '../models/batteryModel'
import type { BatterySpot } from '@/types'
import { playClick } from '@/sound'
import { useHover } from '../common/useHover'
import { HINT_COLOR, HINT_HOVER } from '../common/hoverOutline'
import { HintArrow } from '../stations/StationKit'
import { MM } from '../models/Switch'
import { boardGroup } from './Daughterboard'
import { useAssemblyFlipped } from './caseSplit'

// Pin Li-Po trong hốc sàn case (bước `battery`, case dựng bằng code ≤ 60%): viên pin dẹt bọc nhôm + nhãn xanh, đầu dây có băng keo
// vàng, 2 sợi dây đỏ (+) / đen (−) tới đầu cắm JST PH 2 pin; cắm vào jack pin mặt dưới PCB (`PcbBatteryJack`, hệ board).
// Toạ độ `BatterySlot`: hệ cảnh trong nhóm case dưới (như Daughterboard)

/** jack JST PH 2 pin nằm ngang (mm): rộng, cao (treo dưới PCB), sâu; miệng ở gốc quay −z, thân về +z */
const JACK = { w: 6, h: 3.2, l: 6 }
/** đầu cắm (mm): rộng, cao, dài, cắm lút `in` */
const PLUG = { w: 5.2, h: 2.6, l: 5, in: 3.6 }
/** 2 sợi dây đỏ / đen bước 2mm, bán kính (mm) */
const WIRES = ['#d63a2f', '#1d1d1f']
const WIRE_R = 0.5
/** đầu dây chưa cắm dựng đứng ngoài cạnh pin (u) */
const LOOSE = { out: 0.3, rise: 0.4 }

/** bước lắp pin: đã cầm đầu dây (chờ bấm jack pin trên PCB) */
export const useBatPick = create<{ picked: boolean }>(() => ({ picked: false }))

/** băng keo Kapton vàng bọc quanh viên pin (thân pin nhìn thấy ở viền + mép) */
const kaptonMat = new THREE.MeshPhysicalMaterial({
  color: '#e0a92a',
  roughness: 0.28,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
})
/** bó mạch bảo vệ ở đầu ra dây (băng keo vàng dày hơn, sẫm hơn chút) */
const tapeMat = new THREE.MeshPhysicalMaterial({ color: '#d39a1c', roughness: 0.3, clearcoat: 0.5 })
const housingMat = new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.6 })
const holeMat = new THREE.MeshBasicMaterial({ color: '#141414' })
const wireMats = WIRES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }))
const plugGeo = new THREE.BoxGeometry(PLUG.w * MM, PLUG.h * MM, PLUG.l * MM)
const ghostMat = (hover: boolean, bad = false) => (
  <meshBasicMaterial
    color={bad ? '#e0533d' : hover ? HINT_HOVER : HINT_COLOR}
    transparent
    opacity={hover ? 0.85 : 0.5}
    depthWrite={false}
  />
)

/** vật bấm được, sáng viền khi rê */
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

/** viên pin (u): gốc = tâm mặt đáy, cạnh dài theo x, dây ra ở cạnh `side` */
/** nhãn trắng in thông số dán mặt trên pin (canvas, cache theo loại): mã cỡ TTWWLL, 3.7V, mAh / Wh, mã QR, ký hiệu thùng rác gạch,
 * +/− ở phía đầu dây (`side`) — kiểu pin Li-Po bán lẻ */

/**
 * viên pin Li-Po (u): gốc = tâm mặt đáy, cạnh dài theo x, dây ra ở cạnh `side`. Như pin bán lẻ: túi pin bọc băng keo Kapton vàng
 * (lộ ở viền + 4 mép), mặt trên dán nhãn trắng in thông số chừa viền vàng, đầu dây có bó mạch bảo vệ gập lại bọc băng keo
 */
function Pack({ id, side, ghost }: { id: string; side: 1 | -1; ghost?: ReactNode }) {
  const b = batterySize(id)!
  // bó mạch bảo vệ ở đầu dây (~4mm), nhãn chừa viền vàng ~1,5mm
  const pcm = 4 * MM
  const rim = 1.5 * MM
  const tex = useMemo(() => (ghost ? null : labelTexture(id, side)), [id, side, ghost])
  return (
    <group>
      <RoundedBox
        args={[b.l - (ghost ? 0 : pcm), b.t, b.w]}
        radius={Math.min(b.t / 2 - 0.001, 0.025)}
        smoothness={3}
        position={[ghost ? 0 : (-side * pcm) / 2, b.t / 2, 0]}
        material={ghost ? undefined : kaptonMat}
        castShadow={!ghost}
        receiveShadow
      >
        {ghost}
      </RoundedBox>
      {!ghost && tex && (
        <>
          {/* nhãn trắng mặt trên */}
          <mesh position={[(-side * pcm) / 2, b.t + 0.0015, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[b.l - pcm - 2 * rim, b.w - 2 * rim]} />
            <meshStandardMaterial map={tex} roughness={0.55} metalness={0.05} />
          </mesh>
          {/* bó mạch bảo vệ: mỏng hơn thân pin, gập ở đầu ra dây */}
          <mesh position={[side * (b.l / 2 - pcm / 2), b.t * 0.4, 0]} material={tapeMat} castShadow>
            <boxGeometry args={[pcm, b.t * 0.8, b.w * 0.92]} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** đầu cắm JST PH: `at` = miệng (đầu cắm vào jack), thân + dây về phía −z hệ đầu cắm */
function Plug({ mat }: { mat?: ReactNode }) {
  return (
    <mesh
      geometry={plugGeo}
      material={mat ? undefined : housingMat}
      position-z={(PLUG.in - PLUG.l / 2) * MM}
      castShadow
    >
      {mat}
    </mesh>
  )
}

/** 2 sợi dây từ `a` (ra theo `outA`) tới `b` (ra theo `outB`), chùng xuống giữa */
function wireGeometries(
  a: THREE.Vector3,
  outA: THREE.Vector3,
  b: THREE.Vector3,
  outB: THREE.Vector3,
) {
  // giữa 2 đầu: 2 đầu gần cùng cao độ (board đã thả vào case) thì võng xuống; chênh nhiều (board dựng) thì đi thẳng, không bẻ ngược
  // về sát pin (khúc gập gắt làm 2 sợi xoắn chéo nhau)
  const mid = a.clone().lerp(b, 0.5)
  if (Math.abs(a.y - b.y) < 0.3) mid.setY(Math.min(a.y, b.y) + 0.04)
  const pts = [
    a.clone(),
    a.clone().addScaledVector(outA, 0.12),
    mid,
    b.clone().addScaledVector(outB, 0.12),
    b.clone(),
  ]
  const center = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const n = 48
  // 2 sợi nằm dẹt cạnh nhau: hướng tách lấy vuông góc hướng dây ra khỏi pin (nằm ngang), rồi chuyển dọc dây theo kiểu khung song song
  // (chiếu bỏ thành phần theo tiếp tuyến) → không lật dấu giữa chừng, 2 sợi không bắt chéo
  let side = new THREE.Vector3().crossVectors(outA, new THREE.Vector3(0, 1, 0))
  if (side.lengthSq() < 1e-6) side.set(0, 0, 1)
  side.normalize()
  const samples = Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n
    const tan = center.getTangentAt(t)
    const s2 = side.clone().addScaledVector(tan, -side.dot(tan))
    if (s2.lengthSq() > 1e-6) side = s2.normalize()
    return { p: center.getPointAt(t), side: side.clone() }
  })
  return WIRES.map((_, i) => {
    const d = (i - 0.5) * 2 * MM
    const curve = new THREE.CatmullRomCurve3(
      samples.map((x) => x.p.clone().addScaledVector(x.side, d)),
    )
    return new THREE.TubeGeometry(curve, n * 2, WIRE_R * MM, 6)
  })
}

/**
 * Hốc pin + pin trong case dưới. Bước `battery`: chưa đặt = khối pin mờ (pin đang chọn, đỏ = to hơn hốc) trên hốc, bấm để đặt;
 * đặt rồi = đầu dây dựng đứng ngoài cạnh pin, bấm cầm lên rồi bấm jack pin trên PCB (board đang dựng) để cắm
 */
export function BatterySlot({ at }: { at: BatterySpot }) {
  const step = useStep()
  const bat = useBuild().battery
  const pickId = useGame((s) => s.batteryPick)
  const flipped = useAssemblyFlipped()
  const active = step === 'battery' && !flipped
  const picked = useBatPick((p) => p.picked)
  useEffect(() => {
    useBatPick.setState({ picked: false })
  }, [step, bat?.plugged])
  const id = bat?.id ?? pickId
  const size = batterySize(id)
  // đầu ra dây: cạnh ngắn `side`, lệch về sau 1/4 bề sâu pin (khớp chỗ đặt jack trên PCB)
  const tail = useMemo(
    () =>
      size
        ? new THREE.Vector3(at.x + at.side * (size.l / 2), at.y + size.t * 0.5, at.z - at.d / 4)
        : new THREE.Vector3(),
    [at, size],
  )
  const loose = useMemo(
    () => tail.clone().add(new THREE.Vector3(at.side * LOOSE.out, LOOSE.rise, 0)),
    [tail, at],
  )
  const held = loose.clone().setY(loose.y + 0.12)
  const jackLocal = useMemo(
    () => new THREE.Vector3(at.jack.x, Y.pcbBot - (JACK.h / 2) * MM, at.jack.z),
    [at],
  )
  const jackQ = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), at.jack.ry),
    [at],
  )
  const root = useRef<THREE.Group>(null)
  const plugRef = useRef<THREE.Group>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const last = useRef('')
  const q = useMemo(() => new THREE.Quaternion(), [])
  const tmp = useMemo(() => new THREE.Quaternion(), [])
  const plugged = !!bat?.plugged
  useFrame(() => {
    if (!bat || !root.current) return
    // đầu cắm: chưa cắm = dựng đứng (miệng lên); cắm rồi = theo jack trên board (dựng / thả vào case)
    let end = picked && !plugged ? held : loose
    let back = new THREE.Vector3(0, -1, 0)
    const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
    const board = boardGroup.current
    if (plugged && board) {
      end = root.current.worldToLocal(board.localToWorld(jackLocal.clone()))
      board.getWorldQuaternion(q)
      root.current.getWorldQuaternion(tmp)
      q.premultiply(tmp.invert()).multiply(jackQ)
      back = new THREE.Vector3(0, 0, -1).applyQuaternion(q)
      quat.copy(q)
    }
    plugRef.current?.position.copy(end)
    plugRef.current?.quaternion.copy(quat)
    const key = [...end.toArray(), ...back.toArray()].map((v) => v.toFixed(4)).join()
    if (key === last.current) return
    last.current = key
    // đuôi đầu cắm (chỗ dây ra): lùi khỏi miệng theo hướng dây
    const tailB = end.clone().addScaledVector(back, (PLUG.l - PLUG.in) * MM)
    wireGeometries(tail, new THREE.Vector3(at.side, 0, 0), tailB, back).forEach((g, i) => {
      const m = meshes.current[i]
      if (!m) return g.dispose()
      m.geometry.dispose()
      m.geometry = g
    })
  })
  useEffect(() => {
    last.current = ''
  }, [bat, picked])
  if (!size) return null
  const fits = batteryFits(id, at)
  return (
    <group ref={root}>
      {bat ? (
        <>
          <group position={[at.x, at.y, at.z]}>
            <Pack id={bat.id} side={at.side} />
          </group>
          {WIRES.map((_, i) => (
            <mesh
              key={i}
              ref={(m) => void (meshes.current[i] = m)}
              material={wireMats[i]}
              castShadow
            >
              <bufferGeometry />
            </mesh>
          ))}
          <group ref={plugRef}>
            {active && !plugged ? (
              <Target
                onPick={() => {
                  useBatPick.setState({ picked: !picked })
                  playClick(picked ? 700 : 1000)
                }}
              >
                {(hover) => (
                  <>
                    <Plug />
                    <mesh position-z={(PLUG.in - PLUG.l / 2) * MM}>
                      <boxGeometry
                        args={[(PLUG.w + 1.5) * MM, (PLUG.h + 1.5) * MM, (PLUG.l + 1.5) * MM]}
                      />
                      {ghostMat(hover || picked)}
                    </mesh>
                  </>
                )}
              </Target>
            ) : (
              <Plug />
            )}
          </group>
          {active && !plugged && !picked && (
            <HintArrow at={[loose.x, loose.y + 0.15, loose.z]} size={0.6} />
          )}
        </>
      ) : (
        active && (
          <>
            <Target
              onPick={() => {
                useGame.getState().placeBattery()
                playClick(fits ? 800 : 300)
              }}
            >
              {(hover) => (
                <group position={[at.x, at.y + 0.5, at.z]}>
                  <Pack id={id} side={at.side} ghost={ghostMat(hover, !fits)} />
                </group>
              )}
            </Target>
            <HintArrow at={[at.x, at.y + 1, at.z]} size={0.8} />
          </>
        )
      )}
    </group>
  )
}

/** jack pin JST PH 2 pin mặt dưới PCB (hệ board): miệng quay về phía pin; đang cầm đầu dây thì sáng lên, bấm để cắm */
export function PcbBatteryJack() {
  const { battery } = useCtx()
  const step = useStep()
  const bat = useBuild().battery
  const picked = useBatPick((p) => p.picked)
  if (!battery) return null
  const target = step === 'battery' && picked && !!bat && !bat.plugged
  return (
    <group position={[battery.jack.x, Y.pcbBot, battery.jack.z]} rotation-y={battery.jack.ry}>
      {/* thân jack treo dưới PCB: miệng ở z = 0, thân về +z */}
      <mesh position={[0, (-JACK.h / 2) * MM, (JACK.l / 2) * MM]} material={housingMat} castShadow>
        <boxGeometry args={[JACK.w * MM, JACK.h * MM, JACK.l * MM]} />
      </mesh>
      <mesh position={[0, (-JACK.h / 2) * MM, -0.002]} material={holeMat}>
        <boxGeometry args={[(PLUG.w + 0.2) * MM, (PLUG.h + 0.2) * MM, 0.003]} />
      </mesh>
      {target && (
        <>
          <Target
            onPick={() => {
              useGame.getState().plugBattery()
              useBatPick.setState({ picked: false })
              playClick(1300)
            }}
          >
            {(hover) => (
              <mesh position={[0, (-JACK.h / 2) * MM, (JACK.l / 2) * MM]}>
                <boxGeometry args={[(JACK.w + 2) * MM, (JACK.h + 2) * MM, (JACK.l + 2) * MM]} />
                {ghostMat(hover)}
              </mesh>
            )}
          </Target>
          {/* "lên" của jack là phía mặt dưới PCB (board dựng) → mũi tên chỉ từ dưới lên */}
          <group rotation-x={Math.PI}>
            <HintArrow at={[0, 0.3, 0]} size={0.6} />
          </group>
        </>
      )}
    </group>
  )
}
