import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, useBuild } from '@/store'
import { Y } from '@/data/steps'
import { playCut, playOpenBox } from '@/sound'
import { Clickable, HintArrow } from '../stations/StationKit'
import { JobBox, ORDER_BOX, ORDER_BOX_H } from '../room/DoorParcels'
import { M } from '../room/roomLayout'
import { BoxCutter } from '../models/PackingTools'

/** rạch băng keo bằng dao rọc giấy (ms), rồi bật 2 nắp (ms), xong tự sang bước sau */
const CUT_MS = 1300
const OPEN_MS = 1400
const ease = (t: number) => t * t * (3 - 2 * t)
const [, BOX_H, BOX_D] = ORDER_BOX
/** dao chạy quá 2 đầu đường băng keo 1 chút (m) */
const OVER = 0.015
/** vết rạch: rãnh tối mảnh dọc giữa băng keo */
const SLIT = new THREE.MeshBasicMaterial({ color: '#2a1d10' })

/**
 * Bước mở hộp: đúng thùng carton đơn hàng đang đặt trên bàn (cỡ thật, băng keo xanh, tên khách, tem dễ vỡ — `JobBox`).
 * Bấm vào thùng: dao rọc giấy hạ xuống mép sau, rạch dọc đường băng keo về phía trước (vết rạch dài dần), nhấc dao lên,
 * thùng rung nhẹ rồi 2 nắp gập bật ra trước / sau, xong tự sang bước sau (không cần nút tiếp tục)
 */
export function ShippingBox() {
  const id = useGame((s) => s.order?.id)
  const unbox = useGame((s) => s.unbox)
  const unboxed = useBuild().unboxed
  const [openAt, setOpenAt] = useState<number | null>(null)
  const ref = useRef<THREE.Group>(null)
  const back = useRef<THREE.Group>(null)
  const front = useRef<THREE.Group>(null)
  const knife = useRef<THREE.Group>(null)
  const slit = useRef<THREE.Group>(null)
  // mở xong → tự sang bước sau
  useEffect(() => {
    if (openAt === null) return
    const t = setTimeout(() => useGame.getState().nextStep(), CUT_MS + OPEN_MS)
    // tiếng rạch lúc dao bắt đầu kéo, tiếng bóc / sột soạt lúc nắp bật
    const cut = setTimeout(() => playCut((CUT_MS * 0.6) / 1000), CUT_MS * 0.2)
    const open = setTimeout(playOpenBox, CUT_MS)
    return () => [t, cut, open].forEach(clearTimeout)
  }, [openAt])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const el = openAt === null ? -1 : performance.now() - openAt
    // dao: 0–0.2 hạ xuống mép sau, 0.2–0.8 rạch về trước, 0.8–1 nhấc lên; ngoài khoảng đó ẩn
    const c = el < 0 ? -1 : Math.min(1, el / CUT_MS)
    const k = knife.current
    if (k) {
      k.visible = c >= 0 && c < 1
      const z0 = -BOX_D / 2 - OVER
      const z1 = BOX_D / 2 + OVER
      const slide = ease(Math.min(1, Math.max(0, (c - 0.2) / 0.6)))
      const down = ease(Math.min(1, c / 0.2))
      const up = ease(Math.max(0, (c - 0.8) / 0.2))
      k.position.set(0, BOX_H + 0.0035 + (1 - down) * 0.12 + up * 0.12, z0 + (z1 - z0) * slide)
      // vết rạch dài theo dao, mất khi nắp bật ra
      if (slit.current) {
        slit.current.visible = c > 0.2 && c < 1
        slit.current.scale.z = Math.max(0.001, slide)
      }
    }
    // nắp bật sau khi rạch xong
    const t = el < CUT_MS ? 0 : Math.min(1, (el - CUT_MS) / OPEN_MS)
    g.rotation.z = t > 0 && t < 0.25 ? Math.sin(t * 90) * 0.04 * (1 - t / 0.25) : 0
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
          setOpenAt(performance.now())
        }}
      >
        <group ref={ref} position-y={Y.table} scale={M}>
          <JobBox id={id} flaps={{ back, front }} />
        </group>
      </Clickable>
      {/* dao rọc giấy + vết rạch (ngoài Clickable: không viền khi rê chuột) */}
      <group position-y={Y.table} scale={M}>
        <group ref={knife} visible={false}>
          <BoxCutter />
        </group>
        <group ref={slit} position={[0, BOX_H + 0.0046, -BOX_D / 2]} visible={false}>
          <mesh position-z={BOX_D / 2} material={SLIT}>
            <boxGeometry args={[0.0025, 0.0004, BOX_D]} />
          </mesh>
        </group>
      </group>
      {openAt === null && <HintArrow at={[0, Y.table + (ORDER_BOX_H + 0.08) * M, 0]} size={2} />}
    </>
  )
}
