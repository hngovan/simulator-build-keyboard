import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { useGame, useBuild } from '@/store'
import { Y } from '@/data/steps'
import { playOpenBox } from '@/sound'
import { Clickable, HintArrow } from '../stations/StationKit'
import { JobBox, ORDER_BOX_H } from '../room/DoorParcels'
import { M } from '../room/roomLayout'

/** thời gian hiệu ứng mở thùng (ms) rồi tự sang bước sau */
const OPEN_MS = 1400
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * Bước mở hộp: đúng thùng carton đơn hàng đang đặt trên bàn (cỡ thật, băng keo xanh, tên khách, tem dễ vỡ — `JobBox`).
 * Bấm vào thùng: rung nhẹ khi xé băng keo, 2 nắp gập bật ra trước / sau rồi tự sang bước sau (không cần nút tiếp tục)
 */
export function ShippingBox() {
  const id = useGame((s) => s.order?.id)
  const unbox = useGame((s) => s.unbox)
  const unboxed = useBuild().unboxed
  const [openAt, setOpenAt] = useState<number | null>(null)
  const ref = useRef<THREE.Group>(null)
  const back = useRef<THREE.Group>(null)
  const front = useRef<THREE.Group>(null)
  // mở xong → tự sang bước sau
  useEffect(() => {
    if (openAt === null) return
    const t = setTimeout(() => useGame.getState().nextStep(), OPEN_MS)
    return () => clearTimeout(t)
  }, [openAt])
  useFrame(() => {
    const g = ref.current
    if (!g || openAt === null) return
    const t = Math.min(1, (performance.now() - openAt) / OPEN_MS)
    // rung khi xé băng keo
    g.rotation.z = t < 0.25 ? Math.sin(t * 90) * 0.04 * (1 - t / 0.25) : 0
    const e = ease(Math.max(0, (t - 0.25) / 0.6))
    // nắp sau bản lề mép sau lật ra sau, nắp trước lật ra trước
    if (back.current) back.current.rotation.x = -e * 2.3
    if (front.current) front.current.rotation.x = e * 2.3
  })
  if (!id) return null
  return (
    <>
      <Clickable
        active={openAt === null}
        onAct={() => {
          // hoàn tác quay về bước này thì thùng đã tính là mở: chỉ chạy lại hiệu ứng
          if (!unboxed) unbox()
          playOpenBox()
          setOpenAt(performance.now())
        }}
      >
        <group ref={ref} position-y={Y.table} scale={M}>
          <JobBox id={id} flaps={{ back, front }} />
        </group>
      </Clickable>
      {openAt === null && <HintArrow at={[0, Y.table + (ORDER_BOX_H + 0.08) * M, 0]} size={2} />}
    </>
  )
}
