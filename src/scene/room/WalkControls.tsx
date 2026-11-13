import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '@/store'
import { useSettingsPop } from '@/features/settings/SettingsDialog'
import { pcEye, screenCenter } from '../models/computerLayout'
import { BLOCKS, BODY_R, EYE_Y, M, SPOTS, WALK_AREAS } from './roomLayout'
import { useRoom } from './roomStore'
import { useMouseSens } from '@/lib/mouseSens'
import { learnAdd, useIntro } from '@/features/intro/introStore'
import { PAN_LOOK, PAN_TO } from './introPath'

/** tốc độ đi (m/s); phòng hẹp nên không có chạy */
const SPEED = 2.2
/** độ nhạy kéo chuột nhìn (rad / px) */
const LOOK = 0.0042
/** độ nhạy khi khoá tâm chuột (rad / px chuột di chuyển, kiểu Minecraft) */
const LOCK_LOOK = 0.0024
/** bỏ cú giật chuột bất thường (trình duyệt đôi khi trả movementX rất lớn) */
const LOCK_SPIKE = 250
/** kéo quá bao nhiêu px thì không tính là bấm */
const DRAG_PX = 6
/** zoom con lăn chuột giữa: góc nhìn hẹp nhất = FOV gốc × ZOOM_MIN, mỗi nấc cuộn đổi bao nhiêu (0..1) */
const ZOOM_MIN = 0.4
const ZOOM_STEP = 0.12
/** thời gian bay camera khi đứng dậy / ngồi xuống (s) */
const FLY_S = 0.7

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  KeyS: [0, -1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
}

/** đẩy điểm (x, z) vào vùng đi được gần nhất (phòng / hành lang / ô cửa) rồi ra khỏi các khối cản (bàn, kệ) */
function collide(p: THREE.Vector3) {
  const r = BODY_R
  let best: [number, number] = [p.x, p.z]
  let bestD = Infinity
  for (const [x0, x1, z0, z1] of WALK_AREAS) {
    const x = THREE.MathUtils.clamp(p.x, x0, x1)
    const z = THREE.MathUtils.clamp(p.z, z0, z1)
    const d = (x - p.x) ** 2 + (z - p.z) ** 2
    if (d < bestD) [best, bestD] = [[x, z], d]
  }
  ;[p.x, p.z] = best
  for (const [x0, x1, z0, z1] of BLOCKS) {
    const cx = THREE.MathUtils.clamp(p.x, x0, x1)
    const cz = THREE.MathUtils.clamp(p.z, z0, z1)
    const dx = p.x - cx
    const dz = p.z - cz
    const d = Math.hypot(dx, dz)
    if (d >= r) continue
    if (d > 1e-6) {
      p.x = cx + (dx / d) * r
      p.z = cz + (dz / d) * r
    } else {
      // tâm lọt vào trong khối: đẩy ra cạnh gần nhất
      const out = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z]
      const i = out.indexOf(Math.min(...out))
      if (i === 0) p.x = x0 - r
      else if (i === 1) p.x = x1 + r
      else if (i === 2) p.z = z0 - r
      else p.z = z1 + r
    }
  }
}

/** đang có popup / cửa sổ phủ màn: nhả khoá chuột cho bấm popup */
function blocked() {
  if (
    useRoom.getState().calendar ||
    useSettingsPop.getState().open ||
    useGame.getState().pcZoom ||
    useIntro.getState().phase
  )
    return true
  return !!document.querySelector(
    '[role="dialog"], [class*="z-[2000]"], [class*="z-[3000]"], [class*="z-[3500]"], [class*="z-[4000]"]',
  )
}

/** xin khoá tâm chuột (Chrome trả Promise, có thể từ chối khi chưa có thao tác người dùng): lỗi thì thôi */
function lockPointer(el: HTMLElement) {
  try {
    const p = el.requestPointerLock() as unknown as Promise<void> | undefined
    p?.catch?.(() => {})
  } catch {
    /* trình duyệt từ chối: bấm vào cảnh để khoá lại */
  }
}

/** góc quay ngang / ngẩng của camera khi nhìn từ `from` tới `to` */
function aim(from: THREE.Vector3, to: THREE.Vector3) {
  const d = to.clone().sub(from)
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }
}

/** tư thế đứng dậy: chỗ đứng cạnh bàn vừa rời, nhìn về bàn đó */
function standPose(spot: 'pc' | 'bench') {
  const [x, z] = SPOTS[spot]
  const pos = new THREE.Vector3(x * M, EYE_Y, z * M)
  const look = spot === 'pc' ? new THREE.Vector3(...screenCenter()) : new THREE.Vector3(0, 0, 0)
  return { pos, ...aim(pos, look) }
}

/**
 * Đi lại trong phòng góc nhìn người: WASD đi (không dùng phím mũi tên). Chuột khoá tâm kiểu Minecraft (pointer lock): bấm vào cảnh
 * để khoá, rê chuột nhìn quanh, bấm vật ở tâm ngắm giữa màn (tia chọn bắn từ tâm, `setEvents` compute); giữ Alt hiện con trỏ
 * (nhả Alt khoá lại), Esc trình duyệt nhả chuột → mở Cài đặt; có popup thì tự nhả. Không khoá (cảm ứng / đang giữ Alt) thì kéo
 * chuột / 1 ngón nhìn quanh như cũ. Cuộn con lăn chuột giữa zoom
 * (thu hẹp góc nhìn, rời chế độ đi lại thì trả FOV gốc). Bấm đồ vật (màn hình, bàn build, lịch, thùng hàng) do từng vật tự xử lý.
 * Đứng dậy / ngồi xuống: camera bay mượt giữa tư thế cũ và mới (`useRoom.fly`)
 */
export function WalkControls() {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const setEvents = useThree((s) => s.setEvents)
  const st = useRef({
    yaw: 0,
    pitch: 0,
    /** đang khoá tâm chuột / đang giữ Alt / nhả khoá do mình chủ động (không phải Esc) */
    locked: false,
    alt: false,
    selfExit: false,
    /** lần cuối bắn lại tia chọn từ tâm (giây, đồng hồ useFrame) */
    rayAt: 0,
    keys: new Set<string>(),
    /** mức zoom 0 (không) .. 1 (sát nhất) đang muốn / đang hiện */
    zoom: 0,
    shownZoom: 0,
    drag: null as { x: number; y: number; moved: boolean } | null,
    anim: null as null | {
      t: number
      from: THREE.Vector3
      fromQ: THREE.Quaternion
      to: THREE.Vector3
      toQ: THREE.Quaternion
      then?: () => void
    },
  })

  // vừa đứng dậy: bay từ tư thế hiện tại (ngồi bàn build / sát màn hình máy tính) ra chỗ đứng
  useEffect(() => {
    const s = st.current
    const { spot } = useRoom.getState()
    // từ máy tính ra: đặt camera ở chỗ nhìn màn hình (PcView) rồi bay ra chỗ đứng như vừa ngả người ra
    if (spot === 'pc') {
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 42
      // Canvas phủ kín cửa sổ: cỡ cửa sổ = cỡ khung vẽ
      camera.position.set(...pcEye(fov, window.innerWidth, window.innerHeight))
      camera.lookAt(...screenCenter())
    }
    const pose = standPose(spot)
    s.yaw = pose.yaw
    s.pitch = pose.pitch
    s.anim = {
      t: 0,
      from: camera.position.clone(),
      fromQ: camera.quaternion.clone(),
      to: pose.pos,
      toQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.pitch, pose.yaw, 0, 'YXZ')),
    }
  }, [camera])

  // FOV gốc của camera: zoom tính theo nó, rời chế độ đi lại thì trả lại
  const baseFov = useRef(camera instanceof THREE.PerspectiveCamera ? camera.fov : 42)
  useEffect(() => {
    const fov = baseFov.current
    return () => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // dev: mở camera trong console như CameraRig (không có OrbitControls)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3f = { camera, controls: null, scene, gl }
  }, [camera, scene, gl])

  // bay tới tư thế khác (ngồi vào bàn build...) theo yêu cầu từ ngoài
  useEffect(
    () =>
      useRoom.subscribe((r, prev) => {
        if (!r.fly || r.fly === prev.fly) return
        const to = new THREE.Vector3(...r.fly.pos)
        const m = new THREE.Matrix4().lookAt(to, new THREE.Vector3(...r.fly.look), camera.up)
        st.current.anim = {
          t: 0,
          from: camera.position.clone(),
          fromQ: camera.quaternion.clone(),
          to,
          toQ: new THREE.Quaternion().setFromRotationMatrix(m),
          then: r.fly.then,
        }
      }),
    [camera],
  )

  // khoá tâm: tia chọn (rê / bấm vật) bắn từ giữa màn thay vì vị trí con trỏ (con trỏ đứng yên khi khoá)
  const get = useThree((s) => s.get)
  useEffect(() => {
    const old = get().events.compute
    setEvents({
      compute: (event, state, prev) => {
        if (st.current.locked) state.pointer.set(0, 0)
        else if (old) return old(event, state, prev)
        else
          state.pointer.set(
            (event.offsetX / state.size.width) * 2 - 1,
            -(event.offsetY / state.size.height) * 2 + 1,
          )
        state.raycaster.setFromCamera(state.pointer, state.camera)
      },
    })
    return () => setEvents({ compute: old })
  }, [get, setEvents])

  // khoá tâm chuột: vào chế độ đi lại thì thử khoá luôn (vừa bấm đứng dậy, còn hiệu lực thao tác người dùng),
  // Esc (trình duyệt nhả) → mở Cài đặt như Minecraft; popup mở thì nhả, rời chế độ đi lại thì nhả
  useEffect(() => {
    const s = st.current
    const release = () => {
      if (document.pointerLockElement !== dom) return
      s.selfExit = true
      document.exitPointerLock()
    }
    const change = () => {
      const on = document.pointerLockElement === dom
      s.locked = on
      useRoom.setState({ locked: on })
      if (on) {
        s.drag = null
        return
      }
      // tự nhả (Alt / popup / rời phòng) thì thôi; mất khoá ngoài ý (Esc, đổi cửa sổ) = mở Cài đặt
      if (s.selfExit) s.selfExit = false
      else if (!blocked()) useSettingsPop.setState({ open: true, at: Date.now() })
    }
    const altDown = (e: KeyboardEvent) => {
      if (e.key !== 'Alt') return
      e.preventDefault()
      if (e.repeat) return
      s.alt = true
      release()
    }
    const altUp = (e: KeyboardEvent) => {
      if (e.key !== 'Alt') return
      // chặn trình duyệt nhảy vào thanh menu khi nhả Alt
      e.preventDefault()
      s.alt = false
      if (!blocked()) lockPointer(dom)
    }
    const blur = () => (s.alt = false)
    // có popup (lịch, Cài đặt, xem kệ...) thì nhả chuột cho bấm popup
    const poll = window.setInterval(() => {
      if (s.locked && blocked()) release()
    }, 150)
    // đóng Cài đặt (bấm X / nền) = quay lại chơi: khoá lại luôn như Minecraft (Esc đóng thì trình duyệt có thể từ chối, bấm cảnh để khoá)
    const offPop = useSettingsPop.subscribe((p, old) => {
      if (old.open && !p.open && !blocked()) lockPointer(dom)
    })
    document.addEventListener('pointerlockchange', change)
    window.addEventListener('keydown', altDown)
    window.addEventListener('keyup', altUp)
    window.addEventListener('blur', blur)
    if (!blocked()) lockPointer(dom)
    return () => {
      window.clearInterval(poll)
      offPop()
      document.removeEventListener('pointerlockchange', change)
      window.removeEventListener('keydown', altDown)
      window.removeEventListener('keyup', altUp)
      window.removeEventListener('blur', blur)
      release()
      useRoom.setState({ locked: false })
    }
  }, [dom])

  useEffect(() => {
    const s = st.current
    const typing = (e: KeyboardEvent) =>
      !!(e.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"]',
      )
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey) return
      if (!KEYS[e.code]) return
      s.keys.add(e.code)
    }
    const up = (e: KeyboardEvent) => s.keys.delete(e.code)
    const blur = () => s.keys.clear()
    const pDown = (e: PointerEvent) => {
      if (s.locked) return
      // chuột (không giữ Alt): bấm vào cảnh = khoá tâm chuột; cảm ứng / đang giữ Alt: kéo nhìn như cũ
      if (e.pointerType === 'mouse' && !s.alt && !blocked()) return lockPointer(dom)
      s.drag = { x: e.clientX, y: e.clientY, moved: false }
    }
    const pMove = (e: PointerEvent) => {
      if (s.locked) {
        if (s.anim || Math.abs(e.movementX) > LOCK_SPIKE || Math.abs(e.movementY) > LOCK_SPIKE)
          return
        const look = LOCK_LOOK * useMouseSens.getState().sens * (1 - s.shownZoom * (1 - ZOOM_MIN))
        s.yaw -= e.movementX * look
        s.pitch = THREE.MathUtils.clamp(s.pitch - e.movementY * look, -1.5, 1.5)
        learnAdd('look', (Math.abs(e.movementX) + Math.abs(e.movementY)) * look)
        return
      }
      const d = s.drag
      if (!d || s.anim) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return
      d.moved = true
      // đang zoom thì nhìn quanh chậm lại theo góc nhìn
      const look = LOOK * useMouseSens.getState().sens * (1 - s.shownZoom * (1 - ZOOM_MIN))
      s.yaw -= dx * look
      s.pitch = THREE.MathUtils.clamp(s.pitch - dy * look, -1.35, 1.35)
      learnAdd('look', (Math.abs(dx) + Math.abs(dy)) * look)
      d.x = e.clientX
      d.y = e.clientY
    }
    const pUp = () => (s.drag = null)
    const noMenu = (e: Event) => e.preventDefault()
    // con lăn chuột giữa: cuộn lên phóng to, cuộn xuống thu nhỏ
    const wheel = (e: WheelEvent) => {
      if (s.anim || !e.deltaY) return
      s.zoom = THREE.MathUtils.clamp(s.zoom - Math.sign(e.deltaY) * ZOOM_STEP, 0, 1)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    dom.addEventListener('pointerdown', pDown)
    window.addEventListener('pointermove', pMove)
    window.addEventListener('pointerup', pUp)
    dom.addEventListener('contextmenu', noMenu)
    dom.addEventListener('wheel', wheel, { passive: true })
    return () => {
      dom.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      dom.removeEventListener('pointerdown', pDown)
      window.removeEventListener('pointermove', pMove)
      window.removeEventListener('pointerup', pUp)
      dom.removeEventListener('contextmenu', noMenu)
    }
  }, [dom])

  // sửa camera qua state của useFrame (không sửa thẳng giá trị lấy từ hook)
  useFrame((state, rawDt) => {
    const s = st.current
    const cam = state.camera
    // đang bay vào màn hình máy tính: PcZoom điều khiển camera
    // đoạn mở đầu: IntroCam điều khiển camera (xong thì bay từ chỗ camera đang đứng ra chỗ đứng đi lại)
    if (useIntro.getState().phase) {
      if (s.anim) {
        // hết đoạn mở đầu: đứng ngay dưới chỗ camera vừa nhìn toàn cảnh (phía sau phòng), vẫn nhìn về 2 cái bàn, không bay tới sát máy tính
        const a = s.anim
        a.t = 0
        a.from.copy(cam.position)
        a.fromQ.copy(cam.quaternion)
        a.to.set(PAN_TO.x, EYE_Y, PAN_TO.z)
        collide(a.to)
        const look = aim(a.to, PAN_LOOK)
        s.yaw = look.yaw
        s.pitch = look.pitch
        a.toQ.setFromEuler(new THREE.Euler(look.pitch, look.yaw, 0, 'YXZ'))
      }
      return
    }
    if (useGame.getState().pcZoom) return
    const dt = Math.min(rawDt, 1 / 30)
    // zoom mượt về mức muốn; bay camera (ngồi / đứng) thì bỏ zoom
    if (s.anim) s.zoom = 0
    if (Math.abs(s.shownZoom - s.zoom) > 1e-3 && cam instanceof THREE.PerspectiveCamera) {
      s.shownZoom += (s.zoom - s.shownZoom) * Math.min(1, dt * 10)
      cam.fov = baseFov.current * (1 - s.shownZoom * (1 - ZOOM_MIN))
      cam.updateProjectionMatrix()
    }
    if (s.anim) {
      const a = s.anim
      a.t = Math.min(1, a.t + dt / FLY_S)
      const e = a.t * a.t * (3 - 2 * a.t)
      cam.position.lerpVectors(a.from, a.to, e)
      cam.quaternion.slerpQuaternions(a.fromQ, a.toQ, e)
      if (a.t >= 1) {
        // bay xong: đi tiếp theo hướng nhìn mới
        const e = new THREE.Euler().setFromQuaternion(a.toQ, 'YXZ')
        s.yaw = e.y
        s.pitch = e.x
        s.anim = null
        a.then?.()
      }
      return
    }
    // popup lịch đang mở: đứng yên
    if (useRoom.getState().calendar) return
    const move = new THREE.Vector2()
    for (const k of s.keys) if (KEYS[k]) move.add(new THREE.Vector2(...KEYS[k]))
    const pos = cam.position
    const speed = SPEED * M * dt
    const fwd = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
    if (move.lengthSq()) {
      move.normalize()
      pos.addScaledVector(fwd, move.y * speed).addScaledVector(right, move.x * speed)
      learnAdd('move', SPEED * dt)
    }
    collide(pos)
    pos.y = EYE_Y
    cam.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
    // khoá tâm: đi / quay mà không rê chuột thì R3F không tự bắn lại tia chọn → bắn lại từ tâm ~20 lần / giây
    if (s.locked && state.clock.elapsedTime - s.rayAt > 0.05) {
      s.rayAt = state.clock.elapsedTime
      state.events.update?.()
    }
  })
  return null
}
