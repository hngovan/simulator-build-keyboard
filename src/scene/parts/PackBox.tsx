import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, useCtx, useStep } from '@/store'
import { Y } from '@/data/steps'
import { requestPack, usePack } from '@/features/bench/packStore'
import { playTape } from '@/sound'
import { Clickable, HintArrow } from '../stations/StationKit'
import { TapeGun } from '../models/PackingTools'
import { M } from '../room/roomLayout'
import { LABEL, fragileSticker, shortName } from '../room/boxLabels'
import { NO_OUTLINE } from '../common/hoverOutline'

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
/** độ dày vách thùng, cao thùng tối thiểu (u); bàn phím cao hơn (case CAD dày + keycap SA...) thì thùng cao theo `packHeight` */
const T = 0.1
const MIN_H = 2.4
/** chừa trên đỉnh keycap tới miệng thùng (u) */
const TOP_GAP = 0.25
/** cao thùng theo đỉnh bàn phím đo được: bàn phím hạ xuống đáy thùng (dời lên FLOOR_Y so với lúc nằm trên bàn) */
const packHeight = (top: number | null) =>
  top === null ? MIN_H : Math.max(MIN_H, top + FLOOR_Y - Y.table + TOP_GAP)
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
  const frame = useRef(0)
  const box = useMemo(() => new THREE.Box3(), [])
  // rời đóng gói (đơn khác) thì đo lại
  useEffect(() => () => usePack.setState({ top: null }), [])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const { at, top } = usePack.getState()
    const t = at === null ? 0 : Math.min(1, (performance.now() - at) / PACK_MS)
    // đo đỉnh bàn phím lúc còn nằm trên bàn (chờ đóng gói: mỗi 20 khung, vì model / keycap có thể tải muộn; vừa bấm đóng gói / cất
    // dở mà chưa đo thì đo ngay khung đầu)
    if (t === 0 ? frame.current++ % 20 === 0 : top === null && t < 0.05) {
      g.position.set(0, 0, 0)
      g.updateMatrixWorld(true)
      const y = box.setFromObject(g).max.y
      if (Number.isFinite(y) && Math.abs(y - (top ?? -99)) > 0.01) usePack.setState({ top: y })
    }
    const m = ease(Math.min(1, t / 0.6))
    const h = packHeight(usePack.getState().top)
    g.position.set(0, Math.sin(m * Math.PI) * h * 1.3 + FLOOR_Y * m, z * m)
  })
  return <group ref={ref}>{children}</group>
}

export function PackBox() {
  const ctx = useCtx()
  const step = useStep()
  const at = usePack((p) => p.at)
  // cất đơn dở: thùng đơn băng keo xanh, xong thì cầm lên; giao: băng keo đỏ, xong thì đóng gói chấm điểm
  const stash = usePack((p) => p.stash)
  const H = packHeight(usePack((p) => p.top))
  const W = ctx.width + 1.2
  const D = ctx.depth + 1.2
  const startZ = boxZ(ctx.depth)
  // nhãn giao hàng ghi tên khách + tem dễ vỡ như thùng đã đóng gói (`CardBox` kind packed)
  const name = useGame((s) => shortName(s.order?.customer ?? ''))
  const tag = Math.min(H * 0.7, W * 0.22)
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
        {/* mặt trước (quay ra người chơi): nhãn giao hàng tên khách + tem dễ vỡ */}
        <mesh
          position={[-W * 0.1, H * 0.55, D / 2 + T / 2 + 0.002]}
          material={LABEL}
          name={NO_OUTLINE}
        >
          <planeGeometry args={[W * 0.5, H * 0.4]} />
        </mesh>
        {name && (
          <Text
            position={[-W * 0.1, H * 0.55, D / 2 + T / 2 + 0.004]}
            fontSize={H * 0.13}
            maxWidth={W * 0.46}
            color="#273139"
            anchorX="center"
            anchorY="middle"
            whiteSpace="nowrap"
          >
            {name}
          </Text>
        )}
        <mesh
          position={[W * 0.33, H * 0.5, D / 2 + T / 2 + 0.002]}
          material={fragileSticker()}
          name={NO_OUTLINE}
        >
          <planeGeometry args={[tag, tag]} />
        </mesh>
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
          {/* tem dễ vỡ trên nắp phải (gập theo nắp) */}
          <mesh
            position={[-W * 0.22, T * 0.31, D * 0.25]}
            rotation-x={-Math.PI / 2}
            material={fragileSticker()}
            name={NO_OUTLINE}
          >
            <planeGeometry args={[tag * 1.2, tag * 1.2]} />
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
