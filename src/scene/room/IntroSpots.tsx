import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '@/store'
import { Y } from '@/data/steps'
import { MouseIcon } from '@/components/game/ControlsHint'
import { INTRO_OFF, quiet, tipFirstClick, useIntro, type TipId } from '@/features/intro/introStore'
import { screenCenter } from '../models/computerLayout'
import {
  BACK_M,
  CALENDAR,
  DOORWAY,
  FLOOR_Y,
  HALF_W,
  HALL,
  M,
  RACK,
  ROOM,
  SHIP_SHELF,
  inReach,
} from './roomLayout'
import { RoomSpot } from './RoomSpot'

/** chỗ đặt dấu ? (đơn vị cảnh): lơ lửng trên mặt bàn build, chính giữa tờ lịch, trên kệ nhận hàng cuối hành lang, trên kệ giao hàng */
const TIP_AT: Record<TipId, [number, number, number]> = {
  bench: [0, Y.table + 0.3 * M, 0.1 * M],
  // chính giữa tờ lịch, nổi trước mặt giấy
  calendar: [0, FLOOR_Y + CALENDAR.y * M, ROOM.back + 0.08 * M],
  // kệ sắt nhận hàng cuối hành lang: lơ lửng trên nóc kệ
  door: [RACK.x * M, FLOOR_Y + (RACK.h + 0.22) * M, (RACK.z + 0.1) * M],
  // kệ giao hàng tường phải trong phòng (kệ sắt hạ thấp 80%): lơ lửng trên nóc kệ, nhích ra phía phòng
  ship: [(SHIP_SHELF.x - 0.1) * M, FLOOR_Y + (RACK.h * 0.8 + 0.22) * M, SHIP_SHELF.z * M],
  // chính giữa tranh graffiti QMK tường trái (toạ độ tranh trong Room.tsx), nổi trước mặt tranh
  qmk: [(-HALF_W + 0.08) * M, FLOOR_Y + 1.6 * M, ((BACK_M + DOORWAY.z0) / 2) * M],
}
/** tới gần màn hình máy tính bấy nhiêu mét (theo mặt sàn) thì hiện bong bóng "Tương tác" */
const NEAR_PC = 2.2

/** ảnh dấu ?: hình tròn màu `fill` viền trắng, chữ ? đậm (vàng = còn xa, xanh lá = đã trong tầm với, bấm được) */
function markTexture(fill: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(64, 64, 60, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = fill
  g.beginPath()
  g.arc(64, 64, 50, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#141821'
  g.font = '800 78px "Baloo 2", Nunito, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('?', 64, 70)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** icon trên màn hình máy tính (khác dấu ?): hình tròn cam viền trắng, bong bóng chat trắng 3 chấm = có tin nhắn chờ đọc */
function chatTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(64, 64, 60, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#ff6a3d'
  g.beginPath()
  g.arc(64, 64, 50, 0, Math.PI * 2)
  g.fill()
  // bong bóng chat bo góc + đuôi nhọn góc trái dưới
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(32, 36, 64, 44, 14)
  g.fill()
  g.beginPath()
  g.moveTo(42, 74)
  g.lineTo(40, 96)
  g.lineTo(62, 78)
  g.fill()
  g.fillStyle = '#ff6a3d'
  for (const x of [48, 64, 80]) {
    g.beginPath()
    g.arc(x, 58, 5, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** icon tin nhắn nhấp nhô trên màn hình máy tính: chỉ để nhìn thấy từ xa (không bắt tia chọn, bấm là bấm màn hình) */
function PcMark({ at, map }: { at: [number, number, number]; map: THREE.Texture }) {
  const ref = useRef<THREE.Sprite>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = at[1] + Math.sin(clock.elapsedTime * 2.5) * 0.02 * M
  })
  return (
    <sprite ref={ref} position={at} scale={0.2 * M} raycast={() => null} renderOrder={10}>
      <spriteMaterial map={map} toneMapped={false} depthWrite={false} />
    </sprite>
  )
}

/**
 * tia chọn của dấu ?: trúng thì báo khoảng cách 0 để luôn đứng đầu danh sách vật trúng tia. Dấu ? lơ lửng **trong** vùng bấm của
 * bàn build (khối vô hình cao hơn mặt bàn) nên tính theo khoảng cách thật thì bàn nhận bấm trước rồi chặn luôn
 */
function hitFirst(this: THREE.Sprite, ray: THREE.Raycaster, hits: THREE.Intersection[]) {
  const own: THREE.Intersection[] = []
  THREE.Sprite.prototype.raycast.call(this, ray, own)
  for (const h of own) hits.push({ ...h, distance: 0 })
}

/**
 * dấu ? nhấp nhô, luôn quay về camera (vàng; trỏ đúng vào nó trong tầm với thì xanh lá + to lên báo bấm được); bấm thì hiện phụ đề rồi mất. Không ghi độ sâu + vẽ sau cùng: phần trong suốt quanh hình tròn
 * (tấm ảnh vuông) không che khối mờ chỗ đặt thùng trên bàn phía sau (trước bị lộ ô vuông quanh dấu ?)
 */
function Mark({ id, map, live }: { id: TipId; map: THREE.Texture; live: THREE.Texture }) {
  const ref = useRef<THREE.Sprite>(null)
  const at = TIP_AT[id]
  // đang trỏ (tâm ngắm / con trỏ) đúng vào dấu ? và đứng trong tầm với: lúc này bấm là ăn
  const hot = useRef(false)
  const aim = (e: ThreeEvent<PointerEvent>) => (hot.current = inReach(e))
  useFrame(({ clock }) => {
    const sp = ref.current
    if (!sp) return
    sp.position.y = Math.sin(clock.elapsedTime * 2.5) * 0.02 * M
    // chỉ khi trỏ đúng vào dấu ? (không phải cứ đứng gần): đổi sang xanh lá + to lên, phập phồng nhanh
    const want = hot.current ? live : map
    if (sp.material.map !== want) {
      sp.material.map = want
      sp.material.needsUpdate = true
    }
    sp.scale.setScalar((hot.current ? 0.2 + Math.sin(clock.elapsedTime * 7) * 0.012 : 0.16) * M)
  })
  return (
    <RoomSpot label="Xem thử" outline={false} block position={at} onAct={() => tipFirstClick(id)}>
      <sprite
        ref={ref}
        scale={0.16 * M}
        raycast={hitFirst}
        renderOrder={10}
        onPointerOver={aim}
        onPointerMove={aim}
        onPointerOut={() => (hot.current = false)}
      >
        <spriteMaterial map={map} toneMapped={false} depthWrite={false} />
      </sprite>
    </RoomSpot>
  )
}

/**
 * Vật dẫn lúc tập đi lại (`useIntro.learn = 'free'`, sau 2 bước nhìn quanh / di chuyển): dấu ? trên bàn build + cạnh lịch, icon tin nhắn trên màn hình máy tính,
 * tới gần màn hình máy tính thì hiện bong bóng "Tương tác"; bấm màn hình lần đầu = phụ đề (`pcFirstClick`), lần nữa = camera bay vào + hết tập
 */
export function IntroSpots() {
  const walk = useGame((s) => s.walk)
  const free = useIntro((s) => s.learn === 'free')
  const tips = useIntro((s) => s.tips)
  const map = useMemo(() => markTexture('#ffcc2e'), [])
  const live = useMemo(() => markTexture('#2ed3a0'), [])
  const chat = useMemo(() => chatTexture(), [])
  const near = useIntro((s) => s.nearPc)
  const pc = useMemo(() => screenCenter(), [])
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (!s.pcZoom || prev.pcZoom || !useIntro.getState().learn) return
        // vào máy tính: lời tự ngẫm đang kể dở ("Có tin nhắn mới...") im, khỏi chen giọng Keeb-chan chào
        quiet()
        // thẻ tin nhắn trên màn hình 3D giữ tới lúc bay vào xong
        useIntro.setState({ ...INTRO_OFF, ping: true })
        window.setTimeout(() => useIntro.setState({ ping: false }), 1500)
      }),
    [],
  )
  useFrame(({ camera }) => {
    if (!free) return
    // phải đứng trong phòng: bong bóng là lớp DOM vẽ đè lên cảnh, đứng ngoài hành lang sát tường trái sẽ thấy nó xuyên tường
    const ok =
      camera.position.x > HALL.x1 * M &&
      Math.hypot(camera.position.x - pc[0], camera.position.z - pc[2]) < NEAR_PC * M
    if (ok !== near) useIntro.setState({ nearPc: ok })
  })
  if (!walk || !free) return null
  return (
    <>
      {tips.map((id) => (
        <Mark key={id} id={id} map={map} live={live} />
      ))}
      {/* máy tính: icon tin nhắn hiện sẵn từ đầu (thấy từ xa), tới gần thì đổi thành bong bóng "Tương tác" */}
      {!near && <PcMark at={[pc[0], pc[1] + 0.3 * M, pc[2]]} map={chat} />}
      {near && (
        <Html
          position={[pc[0], pc[1] + 0.3 * M, pc[2]]}
          center
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative flex animate-pop flex-col items-center gap-1 rounded-2xl border-[3px] border-ink bg-panel px-4 py-2 whitespace-nowrap shadow-[0_5px_0_rgba(0,0,0,0.4)] select-none">
            <span className="font-head text-base font-extrabold tracking-wide text-yellow uppercase">
              Tương tác
            </span>
            <MouseIcon btn="left" />
            <span className="absolute -bottom-[11px] left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-[3px] border-r-[3px] border-b-[3px] border-ink bg-panel" />
          </div>
        </Html>
      )}
    </>
  )
}
