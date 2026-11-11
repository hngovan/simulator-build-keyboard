import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { useGame } from '@/store'
import { KEYCAP_KITS, keycapColorOf, type KeycapProfile } from '@/data/parts'
import type { Key } from '@/types'
import { lerpTo } from '../common/anim'
import {
  capGeometry,
  keycapShape,
  keycapModel,
  lCapCeiling,
  lCapGeometry,
  stemGeometry,
  stretchCap,
  capUnder,
  isCadWide,
  LEGEND_Z,
  legendPlane,
} from '../models/keycapShape'
import { legendFontUrl } from '../models/legendFont'
import { keycapMatParams, keycapMaterial } from '../models/keycapMaterial'
import { STEP_LOW, isStepped, keyOutline } from './keyShape'

/** sau bao lâu không bấm phím nào thì viền đỏ các phím chưa test (ms) */
const IDLE_MS = 5000

// dùng chung cho mọi phím: nhấp nháy cùng nhịp
const alertMat = new THREE.MeshBasicMaterial({
  color: '#ff4d4d',
  transparent: true,
  depthWrite: false,
})

/** Viền đỏ quanh mặt keycap chưa test, hiện khi người chơi ngừng bấm quá IDLE_MS */
function UntestedOutline({ w, h, y }: { w: number; h: number; y: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const idle = performance.now() - useGame.getState().testIdleFrom > IDLE_MS
    if (ref.current) ref.current.visible = idle
    if (idle) alertMat.opacity = 0.55 + Math.sin(clock.elapsedTime * 6) * 0.35
  })
  const t = 0.05 // bề rộng viền
  const bars: [number, number, number, number][] = [
    [0, -h / 2, w, t],
    [0, h / 2, w, t],
    [-w / 2, 0, t, h],
    [w / 2, 0, t, h],
  ]
  return (
    <group ref={ref} position-y={y} visible={false}>
      {bars.map(([x, z, bw, bd], i) => (
        <mesh key={i} position={[x, 0, z]} material={alertMat}>
          <boxGeometry args={[bw, 0.02, bd]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Mọi ký tự có thể in trên keycap (ASCII in được + mũi tên): truyền `characters` cho Text thì drei suspend tới khi font + đủ glyph
 * dựng xong → Suspense của bàn build giữ màn chờ, vào bước lắp keycap là chữ có sẵn (không lắp xong mới hiện chữ)
 */
const LEGEND_CHARS =
  Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('') + '→←'

/** font riêng của profile (Open Cherry / Open Gorton) chỉ có ASCII, không có mũi tên */
const ASCII_CHARS = LEGEND_CHARS.slice(0, 94)

/**
 * Cỡ chữ: nhãn dài co lại cho lọt phần giữa mặt keycap (2 đầu phím rộng lòng chảo cong lên, chữ tràn ra bị che),
 * chừa ~0,95u; font riêng (Gorton / Cherry) chữ rộng ~0,75 em, Nunito ~0,62 em
 */
const legendSize = (k: Key, wide: boolean) =>
  k.label.length > 1
    ? Math.min(0.2, Math.max(k.w - 0.95, 0.75) / (k.label.length * (wide ? 0.75 : 0.62)))
    : 0.3

/** Nunito không có glyph ↑ ↓ (hiện ô vuông) → in '→' xoay */
const ARROW_SPIN: Record<string, number> = { '↑': Math.PI / 2, '↓': -Math.PI / 2 }

function CapOverlay({
  k,
  profile,
  color,
  height,
  dish,
  inset,
  testing,
  tested,
  legend,
}: {
  k: Key
  profile: KeycapProfile
  color: string
  height: number
  dish: number
  inset: number
  testing: boolean
  tested: boolean
  /** chỗ in chữ đo trên mặt keycap thật: độ cao + góc nghiêng (không có = mặt phẳng ngang ở đáy lòng chảo) */
  legend?: { y: number; tilt: number }
}) {
  const col = keycapColorOf(color)
  const arrow = ARROW_SPIN[k.label] !== undefined || /[←→]/.test(k.label)
  // font riêng theo profile (Cherry / DCS kiểu Wyse / SA), mũi tên vẫn Nunito
  const font = arrow ? undefined : legendFontUrl(profile)
  return (
    <>
      {k.label && (
        <group
          position={[0, legend?.y ?? height - dish + 0.015, LEGEND_Z]}
          rotation-x={-Math.PI / 2 + (legend?.tilt ?? 0)}
        >
          <Text
            {...(font ? { font } : {})}
            characters={font ? ASCII_CHARS : LEGEND_CHARS}
            rotation-z={ARROW_SPIN[k.label] ?? 0}
            fontSize={legendSize(k, !!font)}
            color={col.legend}
          >
            {ARROW_SPIN[k.label] === undefined ? k.label : '→'}
          </Text>
        </group>
      )}
      {testing && !tested && (
        <UntestedOutline w={k.w - inset * 2 - 0.08} h={k.h - inset * 2 - 0.08} y={height + 0.02} />
      )}
      {tested && (
        <mesh position={[k.w / 2 - 0.2, height + 0.015, k.h / 2 - 0.2]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.06, 12]} />
          <meshBasicMaterial color="#3ddc84" />
        </mesh>
      )}
    </>
  )
}

function NativeCap({
  k,
  color,
  profile,
  testing,
  tested,
}: {
  k: Key
  color: string
  profile: KeycapProfile
  testing: boolean
  tested: boolean
}) {
  const model = keycapModel(profile, k.row, k.w, k.h)
  const source = useGLTF(`/models/keycaps/${model}.glb`).scene
  const scene = useMemo(() => {
    // phím rộng: kéo dãn phần giữa, giữ mép như keycap đúc thật
    const copy = stretchCap(source.clone(true), k.w, k.h)
    const material = keycapMaterial(color)
    copy.traverse((part) => {
      if ((part as THREE.Mesh).isMesh) {
        const mesh = part as THREE.Mesh
        mesh.material = material
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return copy
  }, [source, color, k.w, k.h])
  const shape = keycapShape(profile, k.row)
  const { height, dish } = useMemo(() => {
    const height = new THREE.Box3().setFromObject(source).max.y
    let center = -Infinity
    source.traverse((part) => {
      if (!(part as THREE.Mesh).isMesh) return
      const points = (part as THREE.Mesh).geometry.getAttribute('position')
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i)
        const z = points.getZ(i)
        if (Math.abs(x) < 0.08 && Math.abs(z) < 0.12) center = Math.max(center, points.getY(i))
      }
    })
    return { height, dish: Number.isFinite(center) ? height - center : shape.dish }
  }, [source, shape.dish])
  const legend = useMemo(() => legendPlane(scene), [scene])
  // phím có stab mà model kéo dãn từ 1u: thêm 2 stem stab + gân gia cố dưới lòng (model SA / DSA đúng cỡ đã có sẵn)
  const under = useMemo(() => capUnder(k, scene, isCadWide(model)), [k, scene, model])
  const underMat = useMemo(() => keycapMaterial(color), [color])
  return (
    <>
      <primitive object={scene} />
      {under && <mesh geometry={under} material={underMat} />}
      <CapOverlay
        k={k}
        profile={profile}
        color={color}
        height={height}
        dish={dish}
        inset={shape.inset}
        testing={testing}
        tested={tested}
        legend={legend}
      />
    </>
  )
}

/** Tải trước model keycap (theo profile + các hàng phím của layout) ngay khi vào bàn build, lắp keycap khỏi chờ */
export function KeycapPreload({ kit, keys }: { kit?: string; keys: Key[] }) {
  useEffect(() => {
    const profile = KEYCAP_KITS[kit ?? 'base']?.profile ?? 'cherry'
    for (const model of new Set(keys.map((k) => keycapModel(profile, k.row, k.w, k.h))))
      if (model) useGLTF.preload(`/models/keycaps/${model}.glb`)
  }, [kit, keys])
  return null
}

/** Keycap: lún xuống khi nhấn, có chấm xanh khi đã test; chưa test mà để lâu thì viền đỏ */
export function Keycap({ k, color, kit }: { k: Key; color: string; kit?: string }) {
  const ref = useRef<THREE.Group>(null)
  const pressed = useGame((s) => !!s.pressed[k.id])
  const tested = useGame((s) => !!s.build?.tested[k.id])
  const testing = useGame((s) => !!s.build && s.ctx?.steps[s.build.stepIdx] === 'test')
  const profile = KEYCAP_KITS[kit ?? 'base']?.profile ?? 'cherry'
  const shape = useMemo(() => keycapShape(profile, k.row), [profile, k.row])
  const geometry = useMemo(() => capGeometry(k.w - 0.08, k.h - 0.08, shape), [k.w, k.h, shape])
  // Caps stepped: `ext` cùng hàng phủ cả phím → bậc thấp dựng theo viền phím, phần nhô là keycap thường cỡ ô chính
  const stepped = isStepped(k)
  // Enter chữ L (ISO / Big-ass): chưa có CAD → dựng theo viền phím, mọi profile
  const lGeo = useMemo(
    () => (k.ext ? lCapGeometry(keyOutline(k, 0.04), k.h / 2, shape, profile) : null),
    [k, shape, profile],
  )
  // đo lòng keycap để gân / stem stab bám vào trần + vách (`capUnder`)
  const capProbe = useMemo(() => new THREE.Mesh(lGeo ?? geometry), [lGeo, geometry])
  const under = useMemo(() => capUnder(k, capProbe), [k, capProbe])
  useEffect(() => () => lGeo?.dispose(), [lGeo])
  const capMat = <meshStandardMaterial {...keycapMatParams(color)} />
  useFrame((_, dt) => lerpTo(ref, 'y', pressed ? -0.15 : 0, dt, 30))
  return (
    <group ref={ref}>
      {stepped && lGeo && (
        // bậc thấp (~40% cao keycap) phủ cả 1.75u
        <mesh geometry={lGeo} scale-y={STEP_LOW} castShadow receiveShadow>
          {capMat}
        </mesh>
      )}
      {lGeo && !stepped ? (
        <>
          {/* stem MX dưới lòng keycap (dựng bằng code nên không có sẵn như model CAD) */}
          <mesh geometry={stemGeometry(lCapCeiling(shape))}>{capMat}</mesh>
          {/* Enter chữ L: stab dọc + gân */}
          {under && <mesh geometry={under}>{capMat}</mesh>}
          <mesh geometry={lGeo} castShadow receiveShadow>
            <meshStandardMaterial {...keycapMatParams(color)} />
          </mesh>
          <CapOverlay
            k={k}
            profile={profile}
            color={color}
            height={shape.height}
            dish={0}
            inset={shape.inset}
            testing={testing}
            tested={tested}
          />
        </>
      ) : keycapModel(profile, k.row, k.w, k.h) ? (
        // model chưa tải xong thì chỉ phím này hiện trễ, không treo Suspense cả bàn build (cả cảnh nháy màn chờ)
        <Suspense fallback={null}>
          <NativeCap k={k} color={color} profile={profile} testing={testing} tested={tested} />
        </Suspense>
      ) : (
        <>
          <mesh geometry={stemGeometry(shape.height - shape.dish - 0.03)}>{capMat}</mesh>
          {under && <mesh geometry={under}>{capMat}</mesh>}
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial {...keycapMatParams(color)} />
          </mesh>
          <CapOverlay
            k={k}
            profile={profile}
            color={color}
            height={shape.height}
            dish={shape.dish}
            inset={shape.inset}
            testing={testing}
            tested={tested}
          />
        </>
      )}
    </group>
  )
}
