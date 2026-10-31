import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useGame } from '@/store'
import { isPackedBox } from '@/store/carrySlice'
import { checkInventory } from '@/data/parts'
import { Y } from '@/data/steps'
import { CuttingMat } from './common/CuttingMat'
import { fitAspect } from './common/fitAspect'
import { benchView } from './common/benchPose'
import { Clickable, HintArrow } from './stations/StationKit'
import { GhostBlock, JobBox } from './room/DoorParcels'
import { M } from './room/roomLayout'
import { useRoom } from './room/roomStore'

/** thùng trên bàn đúng cỡ thật (bằng thùng trên kệ / trên tay) */
const BOX_SCALE = 1

/**
 * Bàn build chưa vào build: tấm lót trống, hoặc thùng đang đặt trên bàn — thùng đơn còn thiếu đồ (bấm để thử mở thùng
 * bắt đầu build) / thùng vừa đóng gói (bấm để cầm lên mang đi giao). Bàn chưa có thùng thì luôn hiện khối mờ chỗ đặt thùng đơn
 */
export function EmptyBench() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  // bấm "Góc nhìn mặc định" (camKey tăng) thì đưa camera về nhìn cả bàn
  const camKey = useGame((s) => s.camKey)
  // màn dọc (điện thoại): lùi xa cho thấy đủ bề ngang bàn
  const fit = useThree((s) => fitAspect(s.size.width / s.size.height))
  useEffect(() => {
    // đang đi lại trong phòng: không kéo camera về bàn
    if (useGame.getState().walk) return
    // trên bàn luôn có thùng hoặc khối mờ chỗ đặt thùng (cỡ thật, cao gần 10u): lùi xa cho thấy trọn thùng + mặt bàn
    camera.position.set(...benchView({ width: null, box: true }, fit))
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [camera, controls, camKey, fit])
  const box = useGame((s) => s.benchBox)
  const packed = useGame((s) => !!s.benchBox && isPackedBox(s, s.benchBox))
  const walk = useGame((s) => s.walk)
  // thùng đơn thiếu đồ: không viền khi rê, không mũi tên (bấm cũng không vào build được; HUD liệt kê món thiếu)
  const ready = useGame(
    (s) =>
      !!s.benchBox &&
      (isPackedBox(s, s.benchBox) ||
        (s.order?.id === s.benchBox && checkInventory(s.inventory, s.order).every((c) => c.ok))),
  )
  // bàn chưa có thùng: khối mờ đúng cỡ thùng đơn chỉ chỗ đặt (như ô trống trên kệ), cho biết phải mang thùng đơn tới;
  // đang cầm thùng đã đóng gói (không đặt lên bàn được) thì ẩn
  const placing = useGame((s) => !s.benchBox && !(s.held && isPackedBox(s, s.held)))
  // đang cầm thùng đơn trỏ vào bàn thì sáng viền (bấm bàn để đặt)
  const carrying = useGame((s) => s.walk && !!s.held)
  const benchHover = useRoom((r) => r.benchHover)
  const act = () => {
    const g = useGame.getState()
    if (!g.benchBox) return
    // thùng đã đóng gói: cầm lên đi giao; thùng đơn: thử mở thùng vào build (thiếu đồ thì HUD liệt kê)
    if (packed) g.pickBench()
    else g.buildOrder(g.benchBox)
  }
  return (
    <>
      <CuttingMat w={31.5} d={23.5} position-y={Y.table + 0.005} />
      {box && (
        // thùng giữa bàn (đúng cỡ thật như trên kệ); đang ngồi mới bấm được
        <Clickable active={!walk && ready} onAct={act}>
          <group position-y={Y.table} scale={M * BOX_SCALE}>
            <JobBox id={box} />
          </group>
          {!walk && ready && <HintArrow at={[0, Y.table + 0.3 * M * BOX_SCALE, 0]} size={2} />}
        </Clickable>
      )}
      {placing && (
        // khối xanh nhạt viền mảnh đúng cỡ thùng: chỗ đặt (bấm bàn để đặt)
        <group position-y={Y.table} scale={M * BOX_SCALE}>
          <GhostBlock hot={carrying && benchHover} />
        </group>
      )}
    </>
  )
}
