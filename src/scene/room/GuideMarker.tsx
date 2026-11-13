import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '@/store'
import { Y } from '@/data/steps'
import { roomGuideTarget, type GuideTarget } from '@/features/guide/roomGuideSteps'
import { CALENDAR, DOORWAY, FLOOR_Y, HALL, M, PC_DESK, RACK, ROOM, SHIP_SHELF } from './roomLayout'
import { useRoom } from './roomStore'
import { useIntro } from '@/features/intro/introStore'

/** chỗ đặt điểm đánh dấu (đơn vị cảnh), lơ lửng trên vật cần bấm */
const SPOT: Record<GuideTarget, [number, number, number]> = {
  pc: [PC_DESK.x * M, Y.table + 0.75 * M, PC_DESK.z * M],
  bench: [0, Y.table + 0.55 * M, 0],
  door: [RACK.x * M, FLOOR_Y + (RACK.h + 0.45) * M, RACK.z * M],
  calendar: [0, FLOOR_Y + (CALENDAR.y + CALENDAR.h / 2 + 0.2) * M, ROOM.back + 0.15 * M],
  // kệ giao hàng sát tường phải (cao ~1,6m)
  ship: [SHIP_SHELF.x * M, FLOOR_Y + 1.75 * M, SHIP_SHELF.z * M],
}

/** cửa phòng ra hành lang: điểm trung gian khi người chơi và đích ở 2 bên tường */
const DOOR_AT: [number, number, number] = [
  HALL.x1 * M,
  FLOOR_Y + 1.6 * M,
  ((DOORWAY.z0 + DOORWAY.z1) / 2) * M,
]
/** đích ở hành lang (bên kia tường trái phòng) */
const inHall = (x: number) => x < HALL.x1 * M

const v = new THREE.Vector3()
const f = new THREE.Vector3()

/**
 * Điểm đánh dấu dẫn đường cho người mới khi đi lại (`roomGuide`): mũi tên vàng nhấp nhô trên chỗ cần tới, vẽ đè lên
 * mọi thứ (thấy xuyên tường); mỗi khung hình tính hướng chỗ đó so với hướng nhìn + khoảng cách → `useRoom.guideDir / guideDist`
 * (la bàn trên khung lời dẫn Keeb-chan, biết hành lang ở hướng nào)
 */
export function GuideMarker() {
  const walk = useGame((s) => s.walk)
  const target = useGame(roomGuideTarget)
  // đang tập đi lại (sau đoạn mở đầu): không có mũi tên, máy tính có icon tin nhắn riêng (`IntroSpots`)
  const learning = useIntro((s) => !!s.learn)
  const at = walk && target && !learning ? SPOT[target] : null
  const ref = useRef<THREE.Mesh>(null)
  const last = useRef({ dir: NaN, dist: NaN })
  useEffect(() => {
    if (at) return
    last.current = { dir: NaN, dist: NaN }
    useRoom.setState({ guideDir: null, guideDist: null })
  }, [at])
  useFrame(({ camera, clock }) => {
    if (!at || !ref.current) return
    // khác phía tường với đích (trong phòng ↔ hành lang): chỉ cửa phòng trước
    const p = inHall(camera.position.x) !== inHall(at[0]) ? DOOR_AT : at
    ref.current.position.set(p[0], p[1] + Math.sin(clock.elapsedTime * 3) * 0.06 * M, p[2])
    ref.current.rotation.y = clock.elapsedTime * 1.5
    // hướng tới đích trên mặt sàn so với hướng nhìn: + = bên phải
    camera.getWorldDirection(f)
    v.set(p[0] - camera.position.x, 0, p[2] - camera.position.z)
    const dist = Math.round(v.length() / M)
    const dir = (Math.atan2(f.x * v.z - f.z * v.x, f.x * v.x + f.z * v.z) * 180) / Math.PI
    // làm tròn 10° cho đỡ cập nhật HUD liên tục
    const d = Math.round(dir / 10) * 10
    if (d !== last.current.dir || dist !== last.current.dist) {
      last.current = { dir: d, dist }
      useRoom.setState({ guideDir: d, guideDist: dist })
    }
  })
  if (!at) return null
  return (
    <mesh ref={ref} rotation-x={Math.PI} renderOrder={999} scale={M}>
      <coneGeometry args={[0.07, 0.18, 16]} />
      <meshBasicMaterial color="#ffd64f" depthTest={false} transparent opacity={0.95} />
    </mesh>
  )
}
