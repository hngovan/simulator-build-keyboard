import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { requestPack, usePack } from '@/features/bench/packStore'
import { Clickable, HintArrow } from '../stations/StationKit'

// Cất đơn dở (nút "Cầm thùng đơn lên"): cùng hoạt cảnh, băng keo xanh, xong thì cầm thùng lên (`pickBench`), không chấm điểm.
// Đóng gói (bước cuối `pack`): thùng carton mở 2 nắp nằm sau bàn phím, bấm thì thùng nhấc lên bay tới úp bao lấy bàn phím,
// 2 nắp gập lại + dán băng keo đỏ, xong mới `deliver` (bàn còn lại thùng đã đóng gói để cầm ra kệ giao hàng)

const CARD = new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.9 })
const INSIDE = new THREE.MeshStandardMaterial({ color: '#9c7140', roughness: 0.95 })
const TAPE = new THREE.MeshStandardMaterial({ color: '#ff5d5d', roughness: 0.5 })
/** băng keo xanh của thùng đơn (cất đơn dở) */
const TAPE_ORDER = new THREE.MeshStandardMaterial({ color: '#3d8bff', roughness: 0.5 })
/** hoạt cảnh: bay tới + gập nắp (ms), giữ thêm 1 chút rồi mới đóng gói */
const PACK_MS = 1700
const HOLD_MS = 350
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
  const tape = useRef<THREE.Mesh>(null)

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
      Math.max(0, at + PACK_MS + HOLD_MS - performance.now()),
    )
    return () => clearTimeout(t)
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
    if (tape.current) tape.current.visible = f >= 1
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
        {/* băng keo đỏ dán dọc nắp khi đóng xong */}
        <mesh
          ref={tape}
          position-y={H + T * 0.35}
          material={stash ? TAPE_ORDER : TAPE}
          visible={false}
        >
          <boxGeometry args={[W * 0.12, 0.02, D + 0.1]} />
        </mesh>
        {idle && <HintArrow at={[0, H + 0.6, 0]} size={2.5} />}
      </group>
    </Clickable>
  )
}
