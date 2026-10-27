import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { TOOLS } from '@/data/parts'
import type { ScrewBit } from '@/types'
import { SPIN_MS } from '@/data/steps'

// ---------- Dụng cụ cầm tay (đầu mũi ở gốc toạ độ, thân hướng lên +y) ----------

export { SPIN_MS }
/** góc ốc xoay cho trọn 1 con vít: tay 3 nấc × 2.2, điện quay nhiều vòng trong 1 hơi */
export const SCREW_SPIN = { manual: 6.6, electric: 28 }
/** tua vít tay xoay đúng bằng góc ốc mỗi nấc (không trượt so với ốc) */
const MANUAL_TURN = SCREW_SPIN.manual / TOOLS.screw[0].clicks!
const ease = (t: number) => t * t * (3 - 2 * t)

// Hiệu ứng vặn: tay thì nhấn xuống + vặn chậm 1 nấc theo cổ tay, điện thì motor quay nhanh + rung
/** dir: 1 = ngược chiều kim đồng hồ nhìn từ trên (tháo vít), -1 = cùng chiều (vặn vào) */
function useSpin(
  ref: RefObject<THREE.Group | null>,
  spinKey: number,
  electric: boolean,
  dir: 1 | -1 = 1,
) {
  const state = useRef({ key: spinKey, t: 0, from: 0, to: 0, at: 0 })
  useFrame((_, dt) => {
    const s = state.current
    const g = ref.current
    if (s.key !== spinKey) {
      s.key = spinKey
      s.t = (electric ? SPIN_MS.electric : SPIN_MS.manual) / 1000
      s.from = s.to
      s.to += dir * MANUAL_TURN
      s.at = performance.now()
    }
    if (!g) return
    if (electric) {
      if (s.t > 0) {
        s.t -= dt
        g.rotation.y += dir * dt * 40
        g.position.x = (Math.random() - 0.5) * 0.01
      } else g.position.set(0, 0, 0)
      return
    }
    // tay: xoay êm đúng 1 nấc cùng nhịp với ốc, nhấn xuống giữa chừng, cổ tay nghiêng nhẹ theo chiều vặn
    const k = Math.min(1, (performance.now() - s.at) / SPIN_MS.manual)
    const bump = Math.sin(Math.PI * k)
    g.rotation.y = s.from + (s.to - s.from) * ease(k)
    g.position.y = -0.03 * bump
    g.rotation.z = dir * 0.06 * bump
  })
}

// Tua vít tay vẽ bằng code (thay model Poly Haven: lưỡi dẹt cố định, không khớp đầu vít đang chọn):
// kiểu tua vít thay đầu — đầu kẹp lục giác ở gốc (đầu vít `DriverBit` cắm vào), thân thép, cán nhựa đỏ có rãnh + đệm cao su đen.
// Gốc toạ độ = miệng đầu kẹp (BitDriver đặt ở y = BIT_LEN, ngay trên đầu vít), cán hướng lên +y, dài ~1.35u
const handleRed = new THREE.MeshStandardMaterial({ color: '#e0553a', roughness: 0.45 })
const gripBlack = new THREE.MeshStandardMaterial({ color: '#25262b', roughness: 0.85 })
const chrome = new THREE.MeshStandardMaterial({ color: '#d6dbe2', metalness: 1, roughness: 0.2 })

export function ManualScrewdriver() {
  return (
    <group>
      {/* đầu kẹp lục giác ôm chuôi đầu vít */}
      <mesh material={chrome} position-y={0.01} castShadow>
        <cylinderGeometry args={[0.05, 0.045, 0.14, 6]} />
      </mesh>
      {/* thân thép */}
      <mesh material={chrome} position-y={0.29} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 12]} />
      </mesh>
      {/* khâu nối cán */}
      <mesh material={chrome} position-y={0.52} castShadow>
        <cylinderGeometry args={[0.075, 0.05, 0.06, 16]} />
      </mesh>
      {/* cán nhựa thon dần về đầu, 6 rãnh bám tay */}
      <mesh material={handleRed} position-y={0.88} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.66, 6]} />
      </mesh>
      {/* đệm cao su ôm giữa cán */}
      <mesh material={gripBlack} position-y={0.9} castShadow>
        <cylinderGeometry args={[0.125, 0.13, 0.28, 18]} />
      </mesh>
      {/* đầu cán bo tròn */}
      <mesh material={handleRed} position-y={1.21} scale-y={0.45} castShadow>
        <sphereGeometry args={[0.1, 18, 10]} />
      </mesh>
    </group>
  )
}

// Tua vít điện: "Electric Screwdriver_ Tool" (MugoflighterfluidArt, Sketchfab, CC BY 4.0),
// `bun run convert:hand-tools`: mũi ở gốc, trục mũi +y, tay cầm chĩa +x, dài ~1.45u.
// Node "bit" (mũi + đầu kẹp) quay khi vặn, "body" đứng yên
const ELECTRIC_SCREWDRIVER_GLB = '/models/tools/electric-screwdriver.glb'
useGLTF.preload(ELECTRIC_SCREWDRIVER_GLB)

export function ElectricScrewdriver({ spinKey, dir }: { spinKey: number; dir?: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null)
  useSpin(ref, spinKey, true, dir)
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
const BIT_LEN = 0.3
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
function DriverBit({ bit }: { bit: ScrewBit }) {
  return (
    <group>
      <BitTip bit={bit} />
      <mesh geometry={bitShank} material={bitSteel} />
    </group>
  )
}

const SWAP_DUR = 0.9
/** tua vít hiện ra cạnh bàn bao lâu mỗi lần đổi đầu vít (ms) */
export const BIT_SWAP_MS = 1300

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
  const bits = (
    <>
      <group ref={newBit}>
        <DriverBit bit={bit} />
      </group>
      <group ref={oldBit} visible={false}>
        <DriverBit bit={prevBit} />
      </group>
    </>
  )
  // tua vít tay: cả cây xoay theo tay · tua vít điện: thân đứng yên, chỉ đầu kẹp + đầu vít quay
  if (electric)
    return (
      <group>
        <group ref={body} position-y={BIT_LEN}>
          <ElectricScrewdriver spinKey={spinKey} dir={dir} />
        </group>
        <group ref={spin}>{bits}</group>
      </group>
    )
  return (
    <group ref={spin}>
      <group ref={body} position-y={BIT_LEN}>
        <ManualScrewdriver />
      </group>
      {bits}
    </group>
  )
}
