import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { Text } from '@/scene/common/Text3D'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useGame, useCtx, useBuild } from '@/store'
import { Y } from '@/data/steps'
import { playOpenBox } from '@/sound'
import { useHover } from '../common/useHover'

/** rê chuột thì kiện hàng sáng lên */
function useGlow(model: THREE.Object3D, hover: boolean, color: string) {
  useEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) (m.material as THREE.MeshStandardMaterial).emissive?.set(hover ? color : '#000')
    })
  }, [model, hover, color])
}

/** Bóc vật liệu riêng + bật đổ bóng cho bản sao model */
function prepare(model: THREE.Object3D) {
  model.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = m.receiveShadow = true
    m.material = (m.material as THREE.MeshStandardMaterial).clone()
    // mesh có xương: khung bao gốc không theo nắp đang mở
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) m.frustumCulled = false
  })
  return model
}

// Rương gỗ "Chest_ Box_ Wooden_26_MB" (Mehdi Shahsavan, Sketchfab, CC BY 4.0), hệ mét.
// Có sẵn hoạt cảnh 4s: bật chốt khoá (0–1.6s) rồi lật nắp ra sau (1.6–4s)
const CHEST_GLB = '/models/room/wooden_chest.glb'
useGLTF.preload(CHEST_GLB)
/** đế rương đo từ glb (m): dài theo x, khoá ở mặt trước +z; cao cả nắp ~0.9 */
const CHEST = { cx: 0.015, cz: -0.09, w: 1.59, d: 0.82, h: 0.9 }
/** tua nhanh hoạt cảnh mở rương */
const CHEST_SPEED = 2.6

/** Rương gỗ co giãn theo bàn phím; openAt != null thì chạy hoạt cảnh mở */
function ChestModel(props: { W: number; D: number; hover: boolean; openAt: number | null }) {
  const { W, D, hover, openAt } = props
  const { scene, animations } = useGLTF(CHEST_GLB)
  // mesh có xương (nắp, chốt) phải clone bằng SkeletonUtils mới giữ được khớp
  const model = useMemo(() => prepare(cloneSkinned(scene)), [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  useEffect(() => {
    // chạy 1 lần rồi giữ khung cuối; đứng yên ở khung đầu (đóng) cho tới khi click
    const act = mixer.clipAction(animations[0])
    act.setLoop(THREE.LoopOnce, 1)
    act.clampWhenFinished = true
    act.reset().play()
    act.paused = openAt === null
    act.timeScale = CHEST_SPEED
  }, [mixer, animations, openAt])
  useFrame((_, dt) => mixer.update(dt))
  useGlow(model, hover, '#2a1606')
  // co đều cả 3 trục (giữ đúng dáng rương), đủ lớn để chứa vừa bàn phím
  const k = chestScale(W, D)
  return (
    <group position-y={Y.table} scale={k}>
      <primitive object={model} position={[-CHEST.cx, 0, -CHEST.cz]} />
    </group>
  )
}

/** tỉ lệ rương: co đều cả 3 trục (không méo), cỡ vừa khung nhìn bàn build */
const chestScale = (W: number, D: number) => Math.min(W / CHEST.w, D / CHEST.d) * 0.7
/** chiều cao rương (u) theo cùng tỉ lệ ChestModel */
const chestH = (W: number, D: number) => chestScale(W, D) * CHEST.h

/** thời gian hiệu ứng mở hộp (ms) rồi tự sang bước sau */
const OPEN_MS = 1400
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Kiện hàng vừa kích thước bàn phím; click vào thân, nắp hay nhãn để mở rồi tự sang bước 2
 * (bước này không cần nút tiếp tục). Rung nhẹ khi xé băng keo, sau đó:
 * - túi zip: nắp lật lên quanh bản lề phía sau, lộ lớp mút có bàn phím bên trong
 * - hộp giấy: nhấc nắp chụp lên, đặt ra phía sau
 * - thùng carton: 2 nắp gập bật ra 2 bên, lộ khay bên trong
 * - rương gỗ: bật chốt khoá rồi lật nắp (hoạt cảnh có sẵn trong model)
 */
export function ShippingBox() {
  const ctx = useCtx()
  const packaging = useGame((s) => s.order?.kit?.packaging ?? 'thùng carton')
  const unbox = useGame((s) => s.unbox)
  const unboxed = useBuild().unboxed
  const [openAt, setOpenAt] = useState<number | null>(null)
  const { hover, bind } = useHover(openAt === null)
  const ref = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  /** nắp gập phía trước của thùng carton (nắp sau dùng ref `lid`) */
  const flap = useRef<THREE.Group>(null)
  const W = ctx.width + 2
  const D = ctx.depth + 2
  const bag = packaging === 'túi zip'
  const paper = packaging === 'hộp giấy'
  const chest = packaging === 'rương gỗ'
  const h = bag ? 1.15 : paper ? 1.2 : chest ? chestH(W, D) : 1.8
  // rương chờ hết hoạt cảnh bật chốt + lật nắp
  const openMs = chest ? 1900 : OPEN_MS
  const base = Y.table
  const top = base + h
  // mở xong → tự sang bước sau
  useEffect(() => {
    if (openAt === null) return
    const t = setTimeout(() => useGame.getState().nextStep(), openMs)
    return () => clearTimeout(t)
  }, [openAt, openMs])
  useFrame(() => {
    const g = ref.current
    if (!g || openAt === null || chest) return
    const t = Math.min(1, (performance.now() - openAt) / OPEN_MS)
    // rung khi xé băng keo / kéo khoá
    const shake = t < 0.25 ? Math.sin(t * 90) * 0.04 * (1 - t / 0.25) : 0
    g.rotation.z = shake
    const e = ease(Math.max(0, (t - 0.25) / 0.6))
    const l = lid.current
    if (bag && l) l.rotation.x = -e * 1.95
    else if (paper && l) {
      l.position.set(0, top + Math.sin(e * Math.PI) * 1.2 + e * 0.3, -D / 2 - e * (D * 0.75))
      l.rotation.x = -e * 0.35
    } else {
      // thùng carton: 2 nắp gập bật ra 2 bên (bản lề ở mép trước / mép sau)
      if (l) l.rotation.x = -e * 2.3
      if (flap.current) flap.current.rotation.x = e * 2.3
    }
  })

  const label = (
    <>
      <mesh position={[W * 0.28, top + 0.028, paper ? D * 0.22 : -D * 0.25]}>
        <boxGeometry args={[2.5, 0.02, 1.35]} />
        <meshStandardMaterial color="#f6f2e8" roughness={0.94} />
      </mesh>
      <Text
        position={[W * 0.28, top + 0.045, paper ? D * 0.22 : -D * 0.25]}
        rotation-x={-Math.PI / 2}
        fontSize={0.29}
        color="#273139"
      >
        SBK / KEYBOARD KIT
      </Text>
    </>
  )
  const clickText = (
    <Text
      position={[0, top + (bag ? 0.06 : 0.05), -D / 4]}
      rotation-x={-Math.PI / 2}
      fontSize={Math.min(0.72, W / 20)}
      color={bag ? '#f0f2f4' : '#4a2f14'}
      anchorX="center"
    >
      CLICK ĐỂ MỞ
    </Text>
  )
  /** nắp: bản lề ở mép sau mặt trên; con bên trong vẫn dùng toạ độ cảnh như phần thân */
  const hinged = (children: ReactNode) => (
    <group ref={lid} position={[0, top, -D / 2]}>
      <group position={[0, -top, D / 2]}>{children}</group>
    </group>
  )
  /** lớp mút bên trong + bóng bàn phím, lộ ra khi mở nắp */
  const inside = (y: number, color: string) => (
    <>
      <mesh position-y={y} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W - 0.3, D - 0.3]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position-y={y + 0.004} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[ctx.width, ctx.depth]} />
        <meshStandardMaterial color="#55595f" roughness={0.7} />
      </mesh>
    </>
  )
  const bagBody = h - 0.22

  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (openAt !== null) return
        // hoàn tác quay về bước này thì hộp đã tính là mở: chỉ chạy lại hiệu ứng
        if (!unboxed) unbox()
        playOpenBox()
        setOpenAt(performance.now())
      }}
      {...bind}
    >
      {bag ? (
        <>
          {/* túi đệm vải: thân + khoá kéo quanh đường mở; nắp mềm có quai xách */}
          <RoundedBox
            args={[W, bagBody, D]}
            radius={0.2}
            position-y={base + bagBody / 2}
            castShadow
          >
            <meshStandardMaterial color={hover ? '#405368' : '#293748'} roughness={0.92} />
          </RoundedBox>
          {inside(base + bagBody + 0.002, '#1b232d')}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, base + bagBody - 0.02, side * (D / 2 - 0.02)]}>
              <boxGeometry args={[W - 0.3, 0.04, 0.035]} />
              <meshStandardMaterial color="#a9abb0" metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
          {hinged(
            <>
              <RoundedBox args={[W, 0.3, D]} radius={0.14} position-y={top - 0.15} castShadow>
                <meshStandardMaterial color={hover ? '#4a6078' : '#304055'} roughness={0.9} />
              </RoundedBox>
              <RoundedBox args={[W - 0.18, 0.045, D - 0.18]} radius={0.02} position-y={top + 0.01}>
                <meshStandardMaterial color="#35485d" roughness={0.88} />
              </RoundedBox>
              <mesh position={[0, top + 0.18, -D / 2 + 0.45]}>
                <torusGeometry args={[0.45, 0.075, 8, 24, Math.PI]} />
                <meshStandardMaterial color="#17212d" roughness={0.9} />
              </mesh>
              <Text
                position={[0, top + 0.045, D / 5]}
                rotation-x={-Math.PI / 2}
                fontSize={0.42}
                color="#d6dce1"
              >
                KEYBOARD CARRY CASE
              </Text>
              {clickText}
            </>,
          )}
        </>
      ) : chest ? (
        <>
          <ChestModel W={W} D={D} hover={hover} openAt={openAt} />
          {openAt === null && (
            <Text
              position={[0, top + 0.3, D / 2]}
              fontSize={Math.min(0.72, W / 20)}
              color="#fff3d6"
              anchorX="center"
              outlineWidth={0.03}
              outlineColor="#2a1606"
            >
              CLICK ĐỂ MỞ
            </Text>
          )}
        </>
      ) : paper ? (
        <>
          {/* hộp giấy: thân + nắp chụp dựng bằng code */}
          <RoundedBox
            args={[W, h - 0.12, D]}
            radius={0.09}
            position-y={base + (h - 0.12) / 2}
            castShadow
          >
            <meshStandardMaterial color={hover ? '#f4f0e8' : '#e7e0d3'} roughness={0.94} />
          </RoundedBox>
          {inside(top - 0.118, '#cfc6b6')}
          {hinged(
            <>
              <mesh position-y={top - 0.06} castShadow>
                <boxGeometry args={[W + 0.04, 0.12, D + 0.04]} />
                <meshStandardMaterial color="#d7ccbc" roughness={0.95} />
              </mesh>
              <mesh position-y={top + 0.004}>
                <boxGeometry args={[W, 0.012, D]} />
                <meshStandardMaterial color="#ece6db" roughness={0.95} />
              </mesh>
              <mesh position-y={top + 0.015}>
                <boxGeometry args={[0.9, 0.016, D + 0.08]} />
                <meshStandardMaterial color="#7b8d98" roughness={0.75} />
              </mesh>
              {label}
              {clickText}
            </>,
          )}
        </>
      ) : (
        <>
          {/* thùng carton dựng bằng code (giữ đúng tỉ lệ ở mọi layout): thân + 2 nắp gập, băng keo dọc mối nối */}
          <mesh position-y={base + (h - 0.06) / 2} castShadow receiveShadow>
            <boxGeometry args={[W, h - 0.06, D]} />
            <meshStandardMaterial color={hover ? '#d6a873' : '#c4935a'} roughness={0.95} />
          </mesh>
          {inside(top - 0.059, '#a87c48')}
          {/* nắp sau: bản lề ở mép sau, phủ nửa sau mặt trên; mang nhãn kiện hàng */}
          {hinged(
            <>
              <mesh position={[0, top - 0.03, -D / 4]} castShadow>
                <boxGeometry args={[W, 0.05, D / 2]} />
                <meshStandardMaterial color={hover ? '#dcae78' : '#cb9a60'} roughness={0.95} />
              </mesh>
              <mesh position={[0, top - 0.002, -0.35]}>
                <boxGeometry args={[W, 0.012, 0.7]} />
                <meshStandardMaterial color="#d9b77c" roughness={0.6} />
              </mesh>
              {label}
            </>,
          )}
          {/* nắp trước: bản lề ở mép trước, phủ nửa trước; chữ "click để mở" */}
          <group ref={flap} position={[0, top, D / 2]}>
            <group position={[0, -top, -D / 2]}>
              <mesh position={[0, top - 0.03, D / 4]} castShadow>
                <boxGeometry args={[W, 0.05, D / 2]} />
                <meshStandardMaterial color={hover ? '#dcae78' : '#cb9a60'} roughness={0.95} />
              </mesh>
              <mesh position={[0, top - 0.002, 0.35]}>
                <boxGeometry args={[W, 0.012, 0.7]} />
                <meshStandardMaterial color="#d9b77c" roughness={0.6} />
              </mesh>
              <Text
                position={[0, top + 0.01, D / 4]}
                rotation-x={-Math.PI / 2}
                fontSize={Math.min(0.72, W / 20)}
                color="#4a2f14"
                anchorX="center"
              >
                CLICK ĐỂ MỞ
              </Text>
            </group>
          </group>
        </>
      )}
    </group>
  )
}
