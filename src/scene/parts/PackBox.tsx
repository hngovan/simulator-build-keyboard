import { useEffect, useRef } from 'react'
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
// Đóng gói (bước cuối `pack`): thùng carton mở 2 nắp nằm sau bàn phím, bấm thì thùng nhấc lên bay tới úp bao lấy bàn phím,
// 2 nắp gập lại, súng băng keo kéo dán dọc nắp (băng đỏ dài dần theo súng), xong mới `deliver` (bàn còn lại thùng đã đóng gói để cầm ra kệ giao hàng)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const INSIDE = new THREE.MeshStandardMaterial({ color: '#9c7140', roughness: 0.95 })
const TAPE = new THREE.MeshStandardMaterial({ color: '#ff5d5d', roughness: 0.5 })
/** băng keo xanh của thùng đơn (cất đơn dở) */
const TAPE_ORDER = new THREE.MeshStandardMaterial({ color: '#3d8bff', roughness: 0.5 })
/** hoạt cảnh: bay tới + gập nắp (ms), súng băng keo dán dọc nắp (ms), giữ thêm 1 chút rồi mới đóng gói */
const PACK_MS = 1700
const TAPE_MS = 1300
const HOLD_MS = 350
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

export function PackBox() {
  const ctx = useCtx()
  const step = useStep()
  const at = usePack((p) => p.at)
  // cất đơn dở: thùng đơn băng keo xanh, xong thì cầm lên; giao: băng keo đỏ, xong thì đóng gói chấm điểm
  const stash = usePack((p) => p.stash)
  const W = ctx.width + 1.2
  const D = ctx.depth + 1.2
  // chỗ chờ: ngay sau bàn phím (góc nhìn mặc định còn thấy miệng thùng + mũi tên)
  const startZ = -(D + 0.4)
  const ref = useRef<THREE.Group>(null)
  const back = useRef<THREE.Group>(null)
  const front = useRef<THREE.Group>(null)
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
    const g = ref.current
    if (!g) return
    const t = at === null ? 0 : Math.min(1, (performance.now() - at) / PACK_MS)
    // 0 → 0.6: nhấc lên vòng qua bàn phím rồi úp xuống; 0.6 → 1: gập 2 nắp
    const m = ease(Math.min(1, t / 0.6))
    g.position.set(0, Y.table + Math.sin(m * Math.PI) * H * 1.3, startZ * (1 - m))
    const f = ease(Math.max(0, (t - 0.6) / 0.4))
    if (back.current) back.current.rotation.x = -OPEN * (1 - f)
    if (front.current) front.current.rotation.x = OPEN * (1 - f)
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
      <group ref={ref} position={[0, Y.table, startZ]}>
        {/* 4 vách (không đáy: thùng úp xuống bao lấy bàn phím) + lòng thùng tối hơn */}
        {wall(W, T, 0, -D / 2)}
        {wall(W, T, 0, D / 2)}
        {wall(T, D, -W / 2, 0)}
        {wall(T, D, W / 2, 0)}
        <mesh position-y={0.02} rotation-x={-Math.PI / 2} material={INSIDE}>
          <planeGeometry args={[W - T, D - T]} />
        </mesh>
        {/* 2 nắp gập: bản lề ở mép sau / mép trước miệng thùng */}
        <group ref={back} position={[0, H, -D / 2]}>
          <mesh position-z={D / 4} material={CARD} castShadow>
            <boxGeometry args={[W, T * 0.6, D / 2]} />
          </mesh>
        </group>
        <group ref={front} position={[0, H, D / 2]}>
          <mesh position-z={-D / 4} material={CARD} castShadow>
            <boxGeometry args={[W, T * 0.6, D / 2]} />
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
