import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { SolderingIron } from '../models/HandTools'
import { playTipWipe } from '@/sound'
import * as THREE from 'three'
import { useGame, useCtx } from '@/store'
import { TOOLS } from '@/data/parts'
import { JOINTS_PER_KEY, SUPPLIES } from '@/data/supplies'
import { Y } from '@/data/steps'
import { MissingSlot, Part } from './StationKit'
import { DesolderPump } from '../models/DesolderPump'
import { createSolderSpool } from '../models/solderSpool'

// Model đồ hàn (`bun run convert:solder-tools`):
// - bút hàn 60W (yarankepang, Sketchfab, CC BY 4.0): mét, dựng theo +y, mũi ở y = 0.123
// - trạm hàn "Sodering_Iron.obj": trạm + giá lò xo + mỏ hàn nằm trên bàn + dây nối, đơn vị OBJ (~2.5cm)
// - giá bùi nhùi "Soldering Brass Sponge Stand" (in 3D, mm): node "base" là vòm có lỗ chéo
const IRON_60W = '/models/solder/iron-60w.glb'
const STATION = '/models/solder/iron-station.glb'
const SPONGE = '/models/solder/sponge-stand.glb'
;[IRON_60W, STATION, SPONGE].forEach((url) => useGLTF.preload(url))

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Bản sao model có đổ bóng (mỗi chỗ đặt 1 bản); only = chỉ hiện 1 node */
function useModel(url: string, only?: string) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      o.castShadow = o.receiveShadow = true
      if (only && o.name !== only) o.visible = false
    })
    return copy
  }, [scene, only])
}

/** Shared wound-wire reel model, also used by Shopii. */
function Spool({ wire, mounted }: { wire: string; mounted: boolean }) {
  const color = SUPPLIES[wire].color
  const model = useMemo(() => createSolderSpool(color, mounted), [color, mounted])
  useEffect(
    () => () => {
      const materials = new Set<THREE.Material>()
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        o.geometry.dispose()
        for (const mat of Array.isArray(o.material) ? o.material : [o.material]) materials.add(mat)
      })
      materials.forEach((mat) => mat.dispose())
    },
    [model],
  )
  return <primitive object={model} />
}

/** Bút hàn 60W nằm ngang ở hàng sau (mũi hướng về board, không chạm cuộn thiếc), dây + phích kéo ra ngoài */
function Pen() {
  const model = useModel(IRON_60W)
  return (
    <group rotation-y={-Math.PI / 2 - 0.15}>
      <group rotation-x={Math.PI / 2} scale={40}>
        <primitive object={model} />
      </group>
    </group>
  )
}

/**
 * Đồ hàn bày cạnh board ở bước hàn: bút hàn 60W hoặc trạm hàn (có giá lò xo, mỏ hàn nối dây vào trạm),
 * giá bùi nhùi đồng và cuộn thiếc dựng đứng. Thiếu mỏ hàn / bùi nhùi / hết thiếc thì để ô vàng nét đứt,
 * bấm để mở Shopii mua
 */
export function SolderKit() {
  const ctx = useCtx()
  const ironLv = useGame((s) => s.tools.solder)
  const wire = useGame((s) => s.solderPick)
  const have = useGame((s) => s.supplies[s.solderPick] ?? 0)
  const openShop = useGame((s) => s.openShop)
  const cleaner = useGame((s) => !TOOLS.tipCleaner[s.tools.tipCleaner].none)
  const dirty = useGame((s) => !!s.build?.tipDirty)
  const cleanTip = useGame((s) => s.cleanTip)
  const hasPump = useGame((s) => !TOOLS.desolder[s.tools.desolder ?? 0].none)
  const hasHolder = useGame((s) => (s.tools.spoolHolder ?? 0) > 0)
  const station = useModel(STATION)
  const sponge = useModel(SPONGE, 'base')
  const [cleaning, setCleaning] = useState(false)
  const cleanTime = useRef<number | null>(null)
  const wipingIron = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (cleanTime.current === null) return
    if (!dirty || !cleaner || TOOLS.solder[ironLv].none) {
      cleanTime.current = null
      setCleaning(false)
      return
    }
    cleanTime.current += dt
    const t = cleanTime.current
    if (wipingIron.current) {
      wipingIron.current.position.set(
        -0.35 + Math.sin(t * 18) * 0.12,
        0.73 + Math.abs(Math.sin(t * 9)) * 0.09,
        0,
      )
    }
    if (t >= 1.5) {
      cleanTime.current = null
      cleanTip()
      setCleaning(false)
    }
  })
  const startCleaning = () => {
    if (cleanTime.current !== null || TOOLS.solder[ironLv].none) return
    cleanTime.current = 0
    setCleaning(true)
    playTipWipe()
  }
  const noIron = TOOLS.solder[ironLv].none
  const noWire = have < JOINTS_PER_KEY
  const x = ctx.width / 2 + 2.8
  // Place opposite the previous position; face the opening back toward the keyboard.
  const cleanerPosition: [number, number, number] = [-x, 0, -(ctx.depth / 2 + 2.8)]
  // bút rã hàn nằm ngang: to hơn 1 chút cho dễ thấy (scale 1.45), nâng theo cho thân vẫn chạm bàn
  const PUMP_SCALE = 1.45
  const pumpPosition: [number, number, number] = [-x + 1.8, 0.2 * PUMP_SCALE, cleanerPosition[2]]
  return (
    <group position={[x, Y.table + 0.08, 0]}>
      {hasPump ? (
        <group position={pumpPosition} rotation-z={-Math.PI / 2} scale={PUMP_SCALE}>
          <DesolderPump />
        </group>
      ) : (
        <MissingSlot
          at={v(pumpPosition[0] + 1.8, 0, pumpPosition[2])}
          size={[3.6, 1.1]}
          label="Thiếu bút hút thiếc"
          onAct={() => openShop('tool')}
        />
      )}
      {noIron ? (
        <MissingSlot
          at={v(0, 0, -2.6)}
          size={[2.8, 2.2]}
          label="Thiếu bút hàn"
          onAct={() => openShop('tool')}
        />
      ) : ironLv >= 2 ? (
        // trạm hàn: cả cụm (trạm, giá lò xo, mỏ hàn + dây) từ model gốc
        <group position={[1.6, 0, -2.4]} rotation-y={Math.PI} scale={0.6}>
          <primitive object={station} />
        </group>
      ) : (
        <group position={[2.6, 0.15, -3.4]}>
          <Pen />
        </group>
      )}
      {/* giá bùi nhùi đồng: hàn cháy làm mũi đen, bấm vào để dí mũi hàn lau sạch */}
      {cleaner ? (
        <Part
          active={dirty && !cleaning}
          onAct={startCleaning}
          position={cleanerPosition}
          rotation-y={Math.PI / 2}
        >
          <group rotation-y={Math.PI} scale={1.9 / 63}>
            <primitive object={sponge} />
          </group>
          {cleaning && (
            <group ref={wipingIron} position={[-0.35, 0.73, 0]} scale={3.2}>
              <SolderingIron station={ironLv >= 2} dirty={dirty} />
              <Html center position={[0, 1.7, 0]}>
                <div className="pointer-events-none text-xs font-bold whitespace-nowrap text-yellow">
                  Đang lau mũi hàn...
                </div>
              </Html>
            </group>
          )}
          {/* cục bùi nhùi đồng lộ ra ở lỗ vòm */}
          <mesh position={[-0.35, 0.75, 0]} scale={[0.75, 0.6, 0.75]}>
            <icosahedronGeometry args={[0.55, 1]} />
            <meshStandardMaterial color="#d9a441" metalness={0.9} roughness={0.55} flatShading />
          </mesh>
          {dirty && (
            <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[1.1, 1.3, 32]} />
              <meshBasicMaterial color="#ffcc2e" transparent opacity={0.9} />
            </mesh>
          )}
        </Part>
      ) : (
        <MissingSlot
          at={v(...cleanerPosition)}
          size={[2, 2]}
          label="Thiếu bùi nhùi lau mũi hàn"
          onAct={() => openShop('tool')}
        />
      )}
      {noWire ? (
        <MissingSlot
          at={v(0, 0, 2)}
          size={[2.4, 2.6]}
          label={`Thiếu ${SUPPLIES[wire].name}`}
          onAct={() => openShop('supply')}
        />
      ) : (
        <group position={[0, 0, 1.7]}>
          <Spool wire={wire} mounted={hasHolder} />
        </group>
      )}
    </group>
  )
}
