import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { requestPack, usePack } from '@/features/bench/packStore'
import { playTape } from '@/sound'
import { Clickable, HintArrow } from '../stations/StationKit'
import { TapeGun } from '../models/PackingTools'
import { M } from '../room/roomLayout'

// Cất đơn dở (nút "Cầm thùng đơn lên"): cùng hoạt cảnh, băng keo xanh, xong thì cầm thùng lên (`pickBench`), không chấm điểm.
// Đóng gói (bước cuối `pack`): thùng carton mở 2 nắp nằm sau bàn phím (đứng yên, có đáy), bấm thì bàn phím nhấc lên vòng qua miệng
// thùng rồi hạ vào đáy thùng (`PackCarry`; trước là thùng bay úp chụp lên bàn phím — trông như nhét thùng vào case), 2 nắp gập lại,
// súng băng keo kéo dán dọc nắp (băng đỏ dài dần theo súng), xong mới `deliver` (bàn còn lại thùng đã đóng gói để cầm ra kệ giao hàng)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const INSIDE = new THREE.MeshStandardMaterial({ color: '#9c7140', roughness: 0.95 })
const TAPE = new THREE.MeshStandardMaterial({ color: '#ff5d5d', roughness: 0.5 })
/** băng keo xanh của thùng đơn (cất đơn dở) */
const TAPE_ORDER = new THREE.MeshStandardMaterial({ color: '#3d8bff', roughness: 0.5 })
/** hoạt cảnh: bay tới + gập nắp (ms), súng băng keo dán dọc nắp (ms), giữ thêm 1 chút rồi mới đóng gói */
const PACK_MS = 1700
const TAPE_MS = 1300
const HOLD_MS = 350
/** đáy thùng: ngay trên mặt thảm cắt (thảm đặt Y.table + 0,005, dày 0,07 — thấp hơn thì bị thảm che, nhìn xuyên thấy thảm) */
const FLOOR_Y = 0.08
/** bề rộng băng keo 48mm (u) */
const TAPE_W = 0.048 * M
/** băng keo chừa ra 2 đầu (gập xuống vách trước / sau, u) */
const TAPE_OVER = 0.05
/** súng băng keo nhỏ hơn cỡ thật 1 chút cho cân với thùng bàn phím */
const GUN_SCALE = 0.65
/** độ dày vách thùng, cao thùng (u) */
const T = 0.1
const H = 2.4
/** góc nắp mở (rad) */
const OPEN = 2.3

const ease = (t: number) => t * t * (3 - 2 * t)

/** chỗ thùng chờ (z, u): ngay sau bàn phím (góc nhìn mặc định còn thấy miệng thùng + mũi tên) */
const boxZ = (depth: number) => -(depth + 1.2 + 0.4)

/**
 * Bàn phím (Assembly) bọc trong đây: lúc đóng gói nhấc lên theo vòng cung cao hơn miệng thùng, bay ra sau rồi hạ nằm lên đáy thùng
 * (0 → 0.6 thời gian hoạt cảnh, 0.6 → 1 thùng gập nắp)
 */
export function PackCarry({ children }: { children: ReactNode }) {
  const ctx = useCtx()
  const ref = useRef<THREE.Group>(null)
  const z = boxZ(ctx.depth)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const at = usePack.getState().at
    const t = at === null ? 0 : Math.min(1, (performance.now() - at) / PACK_MS)
    const m = ease(Math.min(1, t / 0.6))
    g.position.set(0, Math.sin(m * Math.PI) * H * 1.3 + FLOOR_Y * m, z * m)
  })
  return <group ref={ref}>{children}</group>
}

export function PackBox() {
  const ctx = useCtx()
  const step = useStep()
  const at = usePack((p) => p.at)
  // cất đơn dở: thùng đơn băng keo xanh, xong thì cầm lên; giao: băng keo đỏ, xong thì đóng gói chấm điểm
  const stash = usePack((p) => p.stash)
  const W = ctx.width + 1.2
  const D = ctx.depth + 1.2
  const startZ = boxZ(ctx.depth)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const tape = useRef<THREE.Group>(null)
  const gun = useRef<THREE.Group>(null)

  // xong hoạt cảnh: đóng gói (chấm điểm, thùng nằm lại trên bàn)
  useEffect(() => {
    if (at === null) return
    const t = setTimeout(
      () => {
        const { stash } = usePack.getState()
        usePack.setState({ at: null, stash: false })
        if (stash) useGame.getState().pickBench()
        else useGame.getState().deliver()
      },
      Math.max(0, at + PACK_MS + TAPE_MS + HOLD_MS - performance.now()),
    )
    // tiếng kéo băng keo lúc súng bắt đầu chạy dọc nắp
    const snd = setTimeout(
      () => playTape((TAPE_MS * 0.6) / 1000),
      Math.max(0, at + PACK_MS + TAPE_MS * 0.2 - performance.now()),
    )
    return () => [t, snd].forEach(clearTimeout)
  }, [at])

  useFrame(() => {
    const t = at === null ? 0 : Math.min(1, (performance.now() - at) / PACK_MS)
    // 0 → 0.6: bàn phím bay vào thùng (`PackCarry`); 0.6 → 1: gập 2 nắp trái / phải (khe giữa dọc đường băng keo)
    const f = ease(Math.max(0, (t - 0.6) / 0.4))
    if (left.current) left.current.rotation.z = OPEN * (1 - f)
    if (right.current) right.current.rotation.z = -OPEN * (1 - f)
    // súng băng keo: 0–0.2 hạ xuống mép sau, 0.2–0.8 kéo về trước (băng dài theo), 0.8–1 nhấc lên; ngoài khoảng đó ẩn
    const el = at === null ? -1 : performance.now() - at - PACK_MS
    const c = el < 0 ? -1 : Math.min(1, el / TAPE_MS)
    const slide = ease(Math.min(1, Math.max(0, (c - 0.2) / 0.6)))
    const z0 = -D / 2 - TAPE_OVER
    const z1 = D / 2 + TAPE_OVER
    if (gun.current) {
      gun.current.visible = c >= 0 && c < 1
      const down = ease(Math.min(1, c / 0.2))
      const up = ease(Math.max(0, (c - 0.8) / 0.2))
      gun.current.position.set(0, H + T * 0.3 + (1 - down + up) * H * 0.8, z0 + (z1 - z0) * slide)
    }
    if (tape.current) {
      tape.current.visible = c > 0.2
      tape.current.scale.z = Math.max(0.001, slide)
    }
  })

  const idle = step === 'pack' && at === null
  const wall = (w: number, d: number, x: number, z: number) => (
    <mesh position={[x, H / 2, z]} material={CARD} castShadow receiveShadow>
      <boxGeometry args={[w, H, d]} />
    </mesh>
  )
  return (
    <Clickable active={idle} onAct={requestPack}>
      <group position={[0, Y.table, startZ]}>
        {/* 4 vách + đáy (lòng thùng tối hơn, ngay trên mặt thảm); thùng đứng yên, bàn phím bay vào nằm trên đáy */}
        {wall(W, T, 0, -D / 2)}
        {wall(W, T, 0, D / 2)}
        {wall(T, D, -W / 2, 0)}
        {wall(T, D, W / 2, 0)}
        <mesh position-y={FLOOR_Y} rotation-x={-Math.PI / 2} material={INSIDE}>
          <planeGeometry args={[W - T, D - T]} />
        </mesh>
        {/* 2 nắp gập: bản lề ở mép trái / mép phải miệng thùng, khép lại thành khe giữa dọc trước – sau (băng keo dán lên khe) */}
        <group ref={left} position={[-W / 2, H, 0]}>
          <mesh position-x={W / 4} material={CARD} castShadow>
            <boxGeometry args={[W / 2, T * 0.6, D]} />
          </mesh>
        </group>
        <group ref={right} position={[W / 2, H, 0]}>
          <mesh position-x={-W / 4} material={CARD} castShadow>
            <boxGeometry args={[W / 2, T * 0.6, D]} />
          </mesh>
        </group>
        {/* băng keo dán dọc nắp: gốc ở mép sau, dài dần theo súng (scale z) */}
        <group ref={tape} position={[0, H + T * 0.35, -D / 2 - TAPE_OVER]} visible={false}>
          <mesh position-z={(D + 2 * TAPE_OVER) / 2} material={stash ? TAPE_ORDER : TAPE}>
            <boxGeometry args={[TAPE_W, 0.02, D + 2 * TAPE_OVER]} />
          </mesh>
        </group>
        {/* súng dán băng keo (m → u), cùng màu băng */}
        <group ref={gun} visible={false}>
          <TapeGun tape={stash ? TAPE_ORDER : TAPE} scale={M * GUN_SCALE} />
        </group>
        {idle && <HintArrow at={[0, H + 0.6, 0]} size={2.5} />}
      </group>
    </Clickable>
  )
}
