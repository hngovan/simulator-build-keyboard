import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '@/store'
import { SUPPLIES, solderTiming } from '@/data/supplies'
import { Y } from '@/data/steps'
import type { Key, SolderJoint } from '@/types'
import { playSolder, playDesolder } from '@/sound'
import { cn } from '@/lib/format'
import { useHover } from '../common/useHover'
import { SolderingIron } from '../models/HandTools'
import { DesolderPump } from '../models/DesolderPump'

// Vị trí 2 chân switch MX (mm, so với tâm)
const PINS: [number, number][] = [
  [-3.81, -2.54],
  [2.54, -5.08],
]
const DULL = new THREE.Color('#8f9398')
const SHINY = new THREE.Color('#b9bdc2')

/** số 0..1 cố định theo mã phím */
const seedOf = (id: string) =>
  ([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000) / 999

/** mối hàn bản lưu cũ (true) coi như thiếc thường, đạt */
const jointOf = (j: SolderJoint | true | undefined): SolderJoint | null =>
  j === true ? { wire: 'solder6337', burnt: false } : (j ?? null)

/** One flexible feed wire; its tip stays anchored while the free end sways slightly. */
function SolderFeed({ color, time }: { color: string; time: number }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.12, 0.035, 0.025),
        new THREE.Vector3(0.32, 0.13, 0.07),
        new THREE.Vector3(0.55, 0.24, 0.17),
        new THREE.Vector3(0.82, 0.32, 0.19),
      ]),
    [],
  )
  return (
    <group
      rotation-y={Math.sin(time * 5) * 0.035}
      rotation-z={Math.sin(time * 7) * 0.018}
      scale-x={1 + Math.sin(time * 6) * 0.025}
    >
      <mesh>
        <tubeGeometry args={[curve, 32, 0.012, 8, false]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.45} />
      </mesh>
    </group>
  )
}

/** px mỗi giây trên thanh nhiệt */
const PX_PER_S = 46

/** Thanh tiến độ hàn theo giây thật: vàng = đang nung, xanh = nhả là đạt, đỏ = cháy xém; vạch từng giây */
function HeatBar({ t, ready, burn }: { t: number; ready: number; burn: number }) {
  const end = burn + 0.5
  const pct = (x: number) => `${Math.min(100, (x / end) * 100)}%`
  const zone = t < ready ? 'heat' : t < burn ? 'ok' : 'burnt'
  const ticks = Array.from({ length: Math.floor(end) + 1 }, (_, i) => i)
  return (
    <div
      className="pointer-events-none -translate-y-14 select-none"
      style={{ width: end * PX_PER_S }}
    >
      <div className="relative h-4 overflow-hidden border-2 border-black/60 bg-[#1b1f28]">
        {/* vùng đạt: xanh nhạt khi chưa nung tới, tới nơi thì xanh đậm; vùng cháy đỏ */}
        <div
          className={cn(
            'absolute inset-y-0 transition-colors',
            zone === 'heat' ? 'bg-green/20' : 'bg-green/75',
          )}
          style={{ left: pct(ready), width: `calc(${pct(burn)} - ${pct(ready)})` }}
        />
        <div className="absolute inset-y-0 right-0 bg-red/45" style={{ left: pct(burn) }} />
        <div
          className={cn(
            'relative h-full',
            zone === 'heat' ? 'bg-yellow' : zone === 'ok' ? 'bg-green' : 'bg-red',
          )}
          style={{ width: pct(t) }}
        />
        {ticks.map((i) => (
          <div key={i} className="absolute inset-y-0 w-px bg-black/50" style={{ left: pct(i) }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Chân hàn ở mặt dưới PCB: giữ chuột để nung, thiếc chảy dần ra 2 chân.
 * Nhả khi thanh tiến độ vào vùng xanh là đạt; nhả sớm thì thiếc chưa ăn (làm lại); giữ quá vạch thì cháy xém
 */
export function SolderPad({ k }: { k: Key }) {
  // chọn giá trị gốc trong store rồi mới đổi (jointOf tạo object mới, đặt trong selector sẽ render lặp vô hạn)
  const joint = jointOf(useGame((s) => s.build?.solder[k.id]))
  const done = !!joint
  const removing = !!joint?.burnt
  const ironLv = useGame((s) => s.tools.solder)
  const wire = useGame((s) => s.solderPick)
  const dirty = useGame((s) => !!s.build?.tipDirty)
  const { solderKey, failSolderKey, canSolder, canDesolder, desolderKey } = useGame.getState()
  const station = ironLv >= 2
  // lúc thiếc chảy khác nhau một chút giữa các phím (cố định theo phím)
  const { ready, burn } = solderTiming(station, wire, seedOf(k.id))
  const [holding, setHolding] = useState(false)
  const [t, setT] = useState(0)
  const time = useRef(0)
  const active = useRef(false)
  const suctionPlayed = useRef(false)
  const removeDuration = 1.4
  const removeProgress = removing && holding ? Math.min(1, t / removeDuration) : 0
  const remaining = 1 - THREE.MathUtils.smoothstep(removeProgress, 0.65, 1)
  const { hover, bind } = useHover(!done || removing)

  const stop = () => {
    active.current = false
    setHolding(false)
    time.current = 0
    suctionPlayed.current = false
    setT(0)
  }
  useFrame((_, dt) => {
    if (!active.current || (done && !removing)) return
    time.current += dt
    setT(time.current)
    if (removing) {
      if (time.current >= removeDuration * 0.65 && !suctionPlayed.current) {
        suctionPlayed.current = true
        playDesolder()
      }
      if (time.current >= removeDuration) {
        stop()
        desolderKey(k.id)
      }
      return
    }
    if (time.current >= burn) {
      stop()
      solderKey(k.id, true)
    }
  })
  const release = () => {
    if (!active.current) return
    const held = time.current
    stop()
    if (removing) return
    if (held >= ready) solderKey(k.id, false)
    else failSolderKey(k.id)
  }

  // thiếc chảy: bắt đầu ở 30% thời gian nung, đầy khi tới vạch đạt
  const progress = holding && !removing ? Math.min(1, t / ready) : 0
  const transfer = THREE.MathUtils.smoothstep(progress, 0.44, 0.58)
  const lift = Math.sin(transfer * Math.PI) * 0.16
  const toolX = THREE.MathUtils.lerp(PINS[0][0], PINS[1][0], transfer) / 19.05
  const toolZ = -THREE.MathUtils.lerp(PINS[0][1], PINS[1][1], transfer) / 19.05
  const heat = holding ? Math.min(1, t / ready) : 0
  const scorch =
    holding && !removing ? THREE.MathUtils.clamp((t - ready) / (burn - ready), 0, 1) : 0
  const shine = SUPPLIES[joint?.wire ?? wire]?.solder?.shine ?? 0.65
  const wireColor = SUPPLIES[wire]?.color ?? '#c9ccd0'
  const blob = joint?.burnt
    ? '#6f6253'
    : `#${new THREE.Color().lerpColors(DULL, SHINY, shine).getHexString()}`

  // group xoay 180° để "phía trên" của pad hướng ra ngoài mặt đáy PCB
  return (
    <group position={[k.cx, Y.pcbBot, k.cz]} rotation={[Math.PI, -k.rot, 0]}>
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.002}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!active.current && (removing ? canDesolder() : !done && canSolder())) {
            active.current = true
            setHolding(true)
            playSolder()
          }
        }}
        onPointerUp={release}
        onPointerOver={bind.onPointerOver}
        onPointerOut={() => {
          bind.onPointerOut()
          release()
        }}
      >
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial
          color="#ffd84a"
          transparent
          opacity={hover ? 0.2 : 0}
          depthWrite={false}
        />
      </mesh>
      {PINS.map(([px, pz], index) => {
        const melt = THREE.MathUtils.smoothstep(
          progress,
          index === 0 ? 0.12 : 0.62,
          index === 0 ? 0.44 : 1,
        )
        return (
          <group key={px} position={[px / 19.05, 0, -pz / 19.05]}>
            {/* pad đồng: nóng thì đỏ lên, cháy thì xém đen quanh chân */}
            <mesh position-y={0.004} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.08, 16]} />
              <meshStandardMaterial
                color={joint?.burnt ? '#3b2a1c' : done ? '#e8e8ea' : '#d4a64a'}
                emissive="#ff4a10"
                emissiveIntensity={heat * 0.8}
                metalness={0.9}
                roughness={0.25}
              />
            </mesh>
            {(joint?.burnt || scorch > 0) && (
              <mesh position-y={0.003} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.08, 0.15, 20]} />
                <meshBasicMaterial
                  color="#20140b"
                  transparent
                  opacity={joint?.burnt ? 0.85 : scorch * 0.85}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* giọt thiếc: lớn dần khi chảy, đông lại thành chóp bóng (thiếc xịn) / xỉn (thiếc rẻ) */}
            {(done || melt > 0) && (
              <mesh
                position-y={0.012 + (1 - remaining) * 0.08}
                scale={
                  done ? [remaining, 0.55 * remaining, remaining] : [melt, 0.25 + melt * 0.35, melt]
                }
              >
                <sphereGeometry args={[0.085, 14, 10]} />
                <meshStandardMaterial
                  color={blob}
                  emissive="#ff7a2a"
                  emissiveIntensity={done ? 0 : 0.6 * (1 - scorch * 0.5)}
                  metalness={1}
                  roughness={joint?.burnt ? 0.8 : 0.5 - shine * 0.42}
                />
              </mesh>
            )}
          </group>
        )
      })}
      {holding && !removing && (
        <group position={[toolX + 0.025, 0.025 + lift, toolZ]}>
          <SolderFeed color={wireColor} time={t} />
        </group>
      )}
      {(hover || holding) && (!done || removing) && (
        <group position={[toolX, 0.01 + lift, toolZ]} scale={1.8}>
          <SolderingIron heat={Math.min(1, heat + scorch)} station={station} dirty={dirty} />
        </group>
      )}
      {holding && removing && (
        <group position={[-0.2, 0.05, 0.13]} rotation-z={-0.5} scale={0.8}>
          <DesolderPump progress={removeProgress} />
        </group>
      )}
      {hover && removing && !holding && (
        <Html center position={[0, 0.4, 0]}>
          <div className="pointer-events-none text-xs whitespace-nowrap text-yellow">
            Giữ chuột để hút thiếc cháy
          </div>
        </Html>
      )}
      {holding && (
        <Html center position={[0, 0.3, 0]} zIndexRange={[6, 6]}>
          {removing ? (
            <div className="pointer-events-none w-[200px] -translate-y-14">
              <div className="h-4 border-2 border-black/60 bg-[#1b1f28]">
                <div className="h-full bg-sky-400" style={{ width: `${removeProgress * 100}%` }} />
              </div>
            </div>
          ) : (
            <HeatBar t={t} ready={ready} burn={burn} />
          )}
        </Html>
      )}
    </group>
  )
}
