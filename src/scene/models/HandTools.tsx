import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { ScrewBit } from '@/types'

// ---------- Dụng cụ cầm tay (đầu mũi ở gốc toạ độ, thân hướng lên +y) ----------

// Hiệu ứng vặn: tay thì xoay từng nấc, điện thì quay nhanh + rung
/** dir: 1 = ngược chiều kim đồng hồ nhìn từ trên (tháo vít), -1 = cùng chiều (vặn vào) */
function useSpin(
  ref: RefObject<THREE.Group | null>,
  spinKey: number,
  electric: boolean,
  dir: 1 | -1 = 1,
) {
  const state = useRef({ key: spinKey, t: 0, target: 0 })
  useFrame((_, dt) => {
    const s = state.current
    if (s.key !== spinKey) {
      s.key = spinKey
      s.t = electric ? 0.4 : 0.25
      s.target += (dir * Math.PI) / 2
    }
    if (!ref.current) return
    if (s.t > 0) {
      s.t -= dt
      if (electric) {
        ref.current.rotation.y += dir * dt * 40
        ref.current.position.x = (Math.random() - 0.5) * 0.01
      } else {
        ref.current.rotation.y += (s.target - ref.current.rotation.y) * Math.min(1, dt * 14)
        ref.current.position.y = -0.03
      }
    } else {
      ref.current.position.set(0, 0, 0)
    }
  })
}

// Tua vít tay: model Poly Haven (CC0, `bun run fetch:room`), dùng bản nhẹ không texture (`bun run convert:screwdriver-lite`)
// hệ mét, cán ở dưới (y -0.08) → mũi ở trên (y 0.135)
const SCREWDRIVER_GLB = '/models/room/screwdriver-lite.glb'
const SCREWDRIVER_TIP_Y = 0.135
/** thu về dài ~1.6u cho dễ nhìn cạnh con vít (thật dài 21cm) */
const SCREWDRIVER_SCALE = 1.6 / 0.215
useGLTF.preload(SCREWDRIVER_GLB)

export function ManualScrewdriver({ spinKey }: { spinKey: number }) {
  const ref = useRef<THREE.Group>(null)
  useSpin(ref, spinKey, false)
  const { scene } = useGLTF(SCREWDRIVER_GLB)
  // mỗi con vít có thể hiện tua vít riêng (lúc rê chuột qua lại) nên clone
  const model = useMemo(() => {
    const c = scene.clone()
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    return c
  }, [scene])
  return (
    <group ref={ref}>
      {/* lật ngược cho mũi ở gốc, cán hướng lên */}
      <group
        rotation-x={Math.PI}
        position-y={SCREWDRIVER_TIP_Y * SCREWDRIVER_SCALE}
        scale={SCREWDRIVER_SCALE}
      >
        <primitive object={model} />
      </group>
    </group>
  )
}

// Tua vít điện: "Electric Screwdriver_ Tool" (MugoflighterfluidArt, Sketchfab, CC BY 4.0),
// `bun run convert:hand-tools`: mũi ở gốc, trục mũi +y, tay cầm chĩa +x, dài ~1.45u.
// Node "bit" (mũi + đầu kẹp) quay khi vặn, "body" đứng yên
const ELECTRIC_SCREWDRIVER_GLB = '/models/tools/electric-screwdriver.glb'
useGLTF.preload(ELECTRIC_SCREWDRIVER_GLB)

export function ElectricScrewdriver({ spinKey }: { spinKey: number }) {
  const ref = useRef<THREE.Group>(null)
  useSpin(ref, spinKey, true)
  const { scene } = useGLTF(ELECTRIC_SCREWDRIVER_GLB)
  const { bit, body } = useMemo(() => {
    const pick = (name: string) => {
      const c = scene.getObjectByName(name)!.clone()
      c.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true
      })
      return c
    }
    return { bit: pick('bit'), body: pick('body') }
  }, [scene])
  return (
    <group>
      <group ref={ref}>
        <primitive object={bit} />
      </group>
      <primitive object={body} />
    </group>
  )
}

// Mỏ hàn (model thật, `bun run convert:solder-tools`):
// - bút hàn 60W "Soldering Iron 60W Adjustable Temprature" (yarankepang, Sketchfab, CC BY 4.0): mét, mũi ở y = 0.123
// - mỏ hàn của trạm tách từ "Sodering_Iron.obj": mũi ở gốc, cán hướng +y, dài 8.1 đơn vị
const IRON_60W = '/models/solder/iron-60w.glb'
const IRON_PRO = '/models/solder/iron-pro.glb'
useGLTF.preload(IRON_60W)
useGLTF.preload(IRON_PRO)
/** cả 2 loại thu về dài ~1.45 đơn vị (mũi ở gốc, cán hướng lên) */
const IRON_LEN = 1.45

/** Mỏ hàn: mũi đỏ dần khi giữ (đen khi bẩn), khói bốc lên. Gốc = mũi hàn */
/** dirty: mũi hàn đen do vừa hàn cháy (phải lau vào bùi nhùi) */
export function SolderingIron({
  heat = 0,
  station,
  dirty,
}: {
  heat?: number
  station?: boolean
  dirty?: boolean
}) {
  const tip = useRef<THREE.MeshStandardMaterial>(null)
  const { scene } = useGLTF(station ? IRON_PRO : IRON_60W)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      o.castShadow = true
      // bút 60W cầm trên tay: bỏ dây điện + phích cắm (Object_10/11 trong model) cho gọn
      if (/^Object_1[01]$/.test(o.name)) o.visible = false
    })
    return copy
  }, [scene])
  const smoke = useRef<(THREE.Mesh | null)[]>([])
  const puffs = useMemo(
    () => [0, 0.2, 0.4, 0.6, 0.8].map((p) => ({ phase: p, x: (Math.random() - 0.5) * 0.1 })),
    [],
  )
  useFrame(({ clock }) => {
    if (tip.current) tip.current.emissiveIntensity = heat * 4
    smoke.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.8 + puffs[i].phase) % 1
      m.position.set(puffs[i].x + Math.sin(t * 6 + i) * 0.05, 0.05 + t * 0.8, 0)
      m.scale.setScalar(0.04 + t * 0.12)
      ;(m.material as THREE.MeshBasicMaterial).opacity = heat > 0 ? (1 - t) * 0.5 * heat : 0
    })
  })
  return (
    <group>
      <group rotation-z={0.6}>
        {station ? (
          <primitive object={model} scale={IRON_LEN / 8.1} />
        ) : (
          // bút 60W dựng theo +y, mũi ở trên: lật ngược cho mũi về gốc
          <group
            rotation-x={Math.PI}
            position-y={IRON_LEN * (0.123 / 0.154)}
            scale={IRON_LEN / 0.154}
          >
            <primitive object={model} />
          </group>
        )}
        {/* đầu mũi: nóng thì đỏ rực, hàn cháy thì đen (phải lau bùi nhùi) */}
        <mesh position-y={0.03}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial
            ref={tip}
            color={dirty ? '#1b1714' : '#9aa0a8'}
            emissive="#ff5a1a"
            emissiveIntensity={0}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      </group>
      {puffs.map((p, i) => (
        <mesh
          key={p.phase}
          ref={(m) => {
            smoke.current[i] = m
          }}
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#e8e8e8" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- Đầu vít thay được ----------

/** dài đầu vít (đơn vị tool): mũi ở gốc, chuôi lục giác cắm vào tua vít ở y = BIT_LEN */
export const BIT_LEN = 0.3
const bitSteel = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.25 })
const bitShank = new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6).translate(0, BIT_LEN - 0.08, 0)

/** Mũi đầu vít theo loại (dài từ y = 0 tới ~0.14) */
function BitTip({ bit }: { bit: ScrewBit }) {
  switch (bit) {
    case 'hex':
      return (
        <mesh material={bitSteel} position-y={0.07}>
          <cylinderGeometry args={[0.026, 0.026, 0.14, 6]} />
        </mesh>
      )
    case 'flat':
      return (
        <mesh material={bitSteel} position-y={0.07}>
          <boxGeometry args={[0.07, 0.14, 0.012]} />
        </mesh>
      )
    case 'torx':
      // sao 6 cánh: 3 thanh xoay 60°
      return (
        <group position-y={0.07}>
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
            <mesh key={r} material={bitSteel} rotation-y={r}>
              <boxGeometry args={[0.055, 0.14, 0.016]} />
            </mesh>
          ))}
        </group>
      )
    default:
      // chữ thập: 2 cánh thuôn nhọn về mũi
      return (
        <group position-y={0.07}>
          {[0, Math.PI / 2].map((r) => (
            <mesh key={r} material={bitSteel} rotation-y={r}>
              <cylinderGeometry args={[0.035, 0.004, 0.14, 4]} />
            </mesh>
          ))}
        </group>
      )
  }
}

/** 1 đầu vít hoàn chỉnh: mũi + chuôi lục giác */
export function DriverBit({ bit }: { bit: ScrewBit }) {
  return (
    <group>
      <BitTip bit={bit} />
      <mesh geometry={bitShank} material={bitSteel} />
    </group>
  )
}

const SWAP_DUR = 0.9

/**
 * Tua vít (tay / điện) gắn đầu vít đang chọn. Vừa thay đầu (swapAt) thì chạy hiệu ứng:
 * đầu cũ tuột ra rơi xuống → đầu mới bay lên xoay vào khớp, tua vít nảy nhẹ khi ăn khớp
 */
export function BitDriver({
  electric,
  bit,
  prevBit,
  swapAt,
  spinKey,
  dir = 1,
}: {
  electric: boolean
  bit: ScrewBit
  /** đầu vít vừa tháo ra (chạy hiệu ứng rơi) */
  prevBit: ScrewBit
  swapAt: number
  spinKey: number
  /** chiều xoay: 1 tháo ra, -1 vặn vào */
  dir?: 1 | -1
}) {
  const spin = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const oldBit = useRef<THREE.Group>(null)
  const newBit = useRef<THREE.Group>(null)
  useSpin(spin, spinKey, electric, dir)
  useFrame(() => {
    const t = (performance.now() - swapAt) / 1000 / SWAP_DUR
    const active = t >= 0 && t < 1
    const out = Math.min(1, Math.max(0, t / 0.4))
    const into = Math.min(1, Math.max(0, (t - 0.4) / 0.45))
    if (oldBit.current) {
      oldBit.current.visible = active && out < 1
      oldBit.current.position.set(out * 0.12, -out * 0.5, 0)
      oldBit.current.rotation.z = out * 1.2
    }
    if (newBit.current) {
      const e = into * into * (3 - 2 * into)
      newBit.current.position.y = active ? -0.45 * (1 - e) : 0
      newBit.current.rotation.y = active ? (1 - e) * Math.PI * 2 : 0
      newBit.current.visible = !active || t > 0.35
    }
    // nảy nhẹ khi đầu mới ăn khớp
    if (body.current)
      body.current.position.y =
        BIT_LEN + (active && into >= 1 ? Math.sin((t - 0.85) * 40) * 0.01 : 0)
  })
  return (
    <group ref={spin}>
      <group ref={body} position-y={BIT_LEN}>
        {electric ? <ElectricScrewdriver spinKey={0} /> : <ManualScrewdriver spinKey={0} />}
      </group>
      <group ref={newBit}>
        <DriverBit bit={bit} />
      </group>
      <group ref={oldBit} visible={false}>
        <DriverBit bit={prevBit} />
      </group>
    </group>
  )
}
