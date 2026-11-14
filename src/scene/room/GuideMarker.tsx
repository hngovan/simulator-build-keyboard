import { useEffect, useMemo, useRef } from 'react'
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
/** mũi tên rẽ ở cửa phòng nằm ngang cao bấy nhiêu mét (ngang tầm ngực, dưới tầm mắt nên thấy được mặt trên) */
const TURN_Y = 1.05
/**
 * Hình mũi tên rẽ (m, nhìn từ trên xuống): thân đi thẳng qua cửa theo +x rồi bẻ góc vuông sang +y, đầu nhọn chỉ hướng rẽ.
 * Người dùng: mũi tên chỉ xuống lơ lửng giữa ô cửa không cho biết qua cửa rồi đi hướng nào
 */
function turnShape() {
  const s = new THREE.Shape()
  const pts: [number, number][] = [
    [-0.42, -0.06],
    [0.14, -0.06],
    [0.14, 0.26],
    [0.25, 0.26],
    [0.08, 0.5],
    [-0.09, 0.26],
    [0.02, 0.26],
    [0.02, 0.06],
    [-0.42, 0.06],
  ]
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  return s
}

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
  const turn = useRef<THREE.Mesh>(null)
  const turnGeo = useMemo(
    () => new THREE.ExtrudeGeometry(turnShape(), { depth: 0.025, bevelEnabled: false }),
    [],
  )
  useEffect(() => () => turnGeo.dispose(), [turnGeo])
  const last = useRef({ dir: NaN, dist: NaN })
  useEffect(() => {
    if (at) return
    last.current = { dir: NaN, dist: NaN }
    useRoom.setState({ guideDir: null, guideDist: null })
  }, [at])
  useFrame(({ camera, clock }) => {
    if (!at || !ref.current || !turn.current) return
    // khác phía tường với đích (trong phòng ↔ hành lang): chỉ cửa phòng trước
    const viaDoor = inHall(camera.position.x) !== inHall(at[0])
    const p = viaDoor ? DOOR_AT : at
    const bob = Math.sin(clock.elapsedTime * 3) * 0.06 * M
    ref.current.visible = !viaDoor
    turn.current.visible = viaDoor
    if (viaDoor) {
      // mũi tên rẽ nằm ngang trong ô cửa: thân theo hướng đi qua cửa (về phía đích), đầu bẻ về phía đích dọc tường.
      // Hình vẽ trong mặt xy rồi ngả ra nằm ngang (xoay −90° quanh x: y → −z), lật bằng scale âm (vật liệu 2 mặt)
      const through = inHall(at[0]) ? -1 : 1
      const side = at[2] < p[2] ? -1 : 1
      turn.current.position.set(p[0], FLOOR_Y + TURN_Y * M + bob * 0.5, p[2])
      turn.current.scale.set(through * M, -side * M, M)
    } else {
      ref.current.position.set(p[0], p[1] + bob, p[2])
      ref.current.rotation.y = clock.elapsedTime * 1.5
    }
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
    <>
      <mesh ref={ref} rotation-x={Math.PI} renderOrder={999} scale={M}>
        <coneGeometry args={[0.07, 0.18, 16]} />
        <meshBasicMaterial color="#ffd64f" depthTest={false} transparent opacity={0.95} />
      </mesh>
      <mesh
        ref={turn}
        geometry={turnGeo}
        rotation-x={-Math.PI / 2}
        renderOrder={999}
        visible={false}
        raycast={() => null}
      >
        <meshBasicMaterial
          color="#ffd64f"
          depthTest={false}
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}
