import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { useGame } from '@/store'
import {
  JOINTS_PER_KEY,
  SPELL_DESOLDER,
  SPELL_SOLDER,
  SUPPLIES,
  solderSkill,
  spellBonus,
  spellSolderKeys,
} from '@/data/supplies'
import { Y } from '@/data/steps'
import type { Key, SolderJoint } from '@/types'
import { playSolder, playDesolder } from '@/sound'
import { useHover } from '../common/useHover'
import { cancelSkill, skillBusy, startSkill, useSkill } from '../common/skill'
import { SkillBar } from '@/components/game/SkillBar'
import { needleAt } from '@/data/skillCheck'
import { HintArrow } from '../stations/StationKit'
import { HINT_COLOR } from '../common/hoverOutline'
import { useSolderHint } from './solderHint'
import { SolderingIron } from '../models/HandTools'
import { DesolderPump } from '../models/DesolderPump'

// Vị trí 2 chân switch MX (mm, so với tâm)
const PINS: [number, number][] = [
  [-3.81, -2.54],
  [2.54, -5.08],
]
const DULL = new THREE.Color('#8f9398')
const SHINY = new THREE.Color('#b9bdc2')

/** Các ô sáng khi rê vào 1 ô hàn: ô đó + các phím phép hàn sẽ hàn ké (đủ thiếc mới tính) / phép rã hàn sẽ hút ké */
const useSolderLit = create<{ lit: ReadonlySet<string> }>(() => ({ lit: new Set() }))
function lightFrom(id: string | null) {
  const s = useGame.getState()
  if (!id || !s.ctx || !s.build) return useSolderLit.setState({ lit: new Set() })
  const solder = s.build.solder
  // rê vào phím cháy: sáng các phím cháy mà phép rã hàn sẽ hút ké
  const burnt = (k: string) => jointOf(solder[k])?.burnt ?? false
  if (burnt(id)) {
    const more = spellSolderKeys(
      s.ctx.keys,
      (k) => !burnt(k),
      id,
      spellBonus(s.supplies, SPELL_DESOLDER) - 1,
    )
    return useSolderLit.setState({ lit: new Set([id, ...more.map((k) => k.id)]) })
  }
  const n = Math.min(
    spellBonus(s.supplies, SPELL_SOLDER) - 1,
    Math.floor(((s.supplies[s.solderPick] ?? 0) - JOINTS_PER_KEY) / JOINTS_PER_KEY),
  )
  const extra = spellSolderKeys(s.ctx.keys, (k) => !!solder[k], id, n)
  useSolderLit.setState({ lit: new Set([id, ...extra.map((k) => k.id)]) })
}

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

/**
 * Chân hàn ở mặt dưới PCB: bấm để nung (skill check, kim nhiệt chạy qua lại), thiếc chảy dần ra 2 chân theo kim.
 * Bấm lần nữa / Space dừng kim: xanh là đạt (vàng = hoàn hảo), đỏ trái thiếc chưa ăn (hụt), đỏ phải cháy xém.
 * Mối cháy: bấm 1 lần là bút hút thiếc tự hút
 */
export function SolderPad({ k }: { k: Key }) {
  // chọn giá trị gốc trong store rồi mới đổi (jointOf tạo object mới, đặt trong selector sẽ render lặp vô hạn)
  const joint = jointOf(useGame((s) => s.build?.solder[k.id]))
  const done = !!joint
  const removing = !!joint?.burnt
  const ironLv = useGame((s) => s.tools.solder)
  const wire = useGame((s) => s.solderPick)
  const dirty = useGame((s) => !!s.build?.tipDirty)
  const hinted = useSolderHint() === k.id
  const { solderKey, failSolderKey, canSolder, canDesolder, desolderKey } = useGame.getState()
  const station = ironLv >= 2
  // lúc thiếc chảy khác nhau một chút giữa các phím (cố định theo phím)
  const skill = useSkill((s) => (s.active?.id === k.id ? s.active.check : null))
  useEffect(() => () => cancelSkill(k.id), [k.id])
  // đang hút thiếc (bấm 1 lần là tự chạy hết)
  const [holding, setHolding] = useState(false)
  const [t, setT] = useState(0)
  // vị trí kim nhiệt 0..1 khi đang hàn (vẽ thiếc chảy / xém theo kim)
  const [pos, setPos] = useState(0)
  const time = useRef(0)
  const active = useRef(false)
  const suctionPlayed = useRef(false)
  const removeDuration = 1.4
  const removeProgress = removing && holding ? Math.min(1, t / removeDuration) : 0
  const remaining = 1 - THREE.MathUtils.smoothstep(removeProgress, 0.65, 1)
  const { hover, bind } = useHover(!done || removing)
  // phép hàn: rê vào ô khác mà ô này sẽ được hàn ké thì cũng sáng
  const lit = useSolderLit((s) => s.lit.has(k.id)) && !done

  const stop = () => {
    active.current = false
    setHolding(false)
    time.current = 0
    suctionPlayed.current = false
    setT(0)
  }
  useFrame((_, dt) => {
    if (skill) {
      time.current += dt
      setT(time.current)
      return setPos(needleAt(skill))
    }
    if (!active.current || !removing) return
    time.current += dt
    setT(time.current)
    if (time.current >= removeDuration * 0.65 && !suctionPlayed.current) {
      suctionPlayed.current = true
      playDesolder()
    }
    if (time.current >= removeDuration) {
      stop()
      desolderKey(k.id)
    }
  })
  const heating = !!skill
  // thiếc chảy theo kim: đầy khi kim tới vùng xanh, quá vùng xanh thì xém dần
  const progress = heating ? Math.min(1, pos / skill.lo) : 0
  const transfer = THREE.MathUtils.smoothstep(progress, 0.44, 0.58)
  const lift = Math.sin(transfer * Math.PI) * 0.16
  const toolX = THREE.MathUtils.lerp(PINS[0][0], PINS[1][0], transfer) / 19.05
  const toolZ = -THREE.MathUtils.lerp(PINS[0][1], PINS[1][1], transfer) / 19.05
  const heat = heating ? Math.min(1, pos / skill.lo) : 0
  const scorch = heating ? THREE.MathUtils.clamp((pos - skill.hi) / (1 - skill.hi), 0, 1) : 0
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
          if (skillBusy() || active.current) return
          e.stopPropagation()
          if (removing) {
            if (!canDesolder()) return
            active.current = true
            time.current = 0
            setHolding(true)
            return
          }
          if (done || !canSolder()) return
          playSolder()
          startSkill(k.id, solderSkill(station, wire), (r) => {
            lightFrom(null)
            if (r === 'low') failSolderKey(k.id)
            else solderKey(k.id, r === 'high', 'overheat', r === 'perfect')
          })
        }}
        onPointerOver={(e) => {
          bind.onPointerOver(e)
          if (!done) lightFrom(k.id)
        }}
        onPointerOut={() => {
          bind.onPointerOut()
          if (!skill) lightFrom(null)
        }}
      >
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial
          color={HINT_COLOR}
          transparent
          opacity={hover || lit ? 0.2 : 0}
          depthWrite={false}
        />
      </mesh>
      {/* mũi tên xanh chỉ phím cần hàn / hút thiếc tiếp theo (ẩn khi đang giữ mỏ hàn) */}
      {hinted && !holding && !heating && <HintArrow at={[0, 0.35, 0]} size={1.5} />}
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
      {heating && (
        <group position={[toolX + 0.025, 0.025 + lift, toolZ]}>
          <SolderFeed color={wireColor} time={t} />
        </group>
      )}
      {(hover || holding || heating) && (!done || removing) && (
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
            Bấm để hút thiếc cháy
          </div>
        </Html>
      )}
      {holding && removing && (
        <Html center position={[0, 0.3, 0]} zIndexRange={[6, 6]}>
          <div className="pointer-events-none w-[200px] -translate-y-14">
            <div className="h-4 border-2 border-black/60 bg-[#1b1f28]">
              <div className="h-full bg-sky-400" style={{ width: `${removeProgress * 100}%` }} />
            </div>
          </div>
        </Html>
      )}
      {skill && (
        <Html center position={[0, 0.3, 0]} zIndexRange={[6, 6]}>
          <SkillBar check={skill} />
        </Html>
      )}
    </group>
  )
}
