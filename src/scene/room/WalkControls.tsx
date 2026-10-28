import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '@/store'
import { screenCenter, screenEye } from '../models/computerLayout'
import { BLOCKS, BODY_R, EYE_Y, M, SPOTS, WALK_AREAS } from './roomLayout'
import { useRoom } from './roomStore'

/** tốc độ đi (m/s), giữ Shift thì chạy */
const SPEED = 2.2
const RUN = 3.4
/** độ nhạy kéo chuột nhìn (rad / px) */
const LOOK = 0.0042
/** kéo quá bao nhiêu px thì không tính là bấm */
const DRAG_PX = 6
/** thời gian bay camera khi đứng dậy / ngồi xuống (s) */
const FLY_S = 0.7

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
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
 * Đi lại trong phòng góc nhìn người: WASD / mũi tên đi (Shift chạy), kéo chuột / 1 ngón nhìn quanh,
 * bấm sàn thì tự đi tới chỗ đó. Bấm đồ vật (màn hình, bàn build, lịch, thùng hàng) do từng vật tự xử lý.
 * Đứng dậy / ngồi xuống: camera bay mượt giữa tư thế cũ và mới (`useRoom.fly`)
 */
export function WalkControls() {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const st = useRef({
    yaw: 0,
    pitch: 0,
    keys: new Set<string>(),
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
    // từ máy tính vào: Canvas mới dựng, đặt camera sát màn hình như vừa ngả người ra
    if (spot === 'pc') {
      camera.position.set(...screenEye())
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

  // dev: mở camera trong console như CameraRig (không có OrbitControls)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (import.meta.env.DEV) window.__r3f = { camera, controls: null, scene }
  }, [camera, scene])

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

  useEffect(() => {
    const s = st.current
    const typing = (e: KeyboardEvent) =>
      !!(e.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"]',
      )
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey) return
      if (KEYS[e.code] || e.code.startsWith('Shift')) {
        s.keys.add(e.code)
        // đi bằng phím thì bỏ điểm đang tự đi tới
        if (KEYS[e.code]) useRoom.setState({ goal: null })
      }
    }
    const up = (e: KeyboardEvent) => s.keys.delete(e.code)
    const blur = () => s.keys.clear()
    const pDown = (e: PointerEvent) => {
      s.drag = { x: e.clientX, y: e.clientY, moved: false }
    }
    const pMove = (e: PointerEvent) => {
      const d = s.drag
      if (!d || s.anim) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return
      d.moved = true
      s.yaw -= dx * LOOK
      s.pitch = THREE.MathUtils.clamp(s.pitch - dy * LOOK, -1.35, 1.35)
      d.x = e.clientX
      d.y = e.clientY
    }
    const pUp = () => (s.drag = null)
    const noMenu = (e: Event) => e.preventDefault()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    dom.addEventListener('pointerdown', pDown)
    window.addEventListener('pointermove', pMove)
    window.addEventListener('pointerup', pUp)
    dom.addEventListener('contextmenu', noMenu)
    return () => {
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
    if (useGame.getState().pcZoom) return
    const dt = Math.min(rawDt, 1 / 30)
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
    const speed = (s.keys.has('ShiftLeft') || s.keys.has('ShiftRight') ? RUN : SPEED) * M * dt
    const fwd = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
    if (move.lengthSq()) {
      move.normalize()
      pos.addScaledVector(fwd, move.y * speed).addScaledVector(right, move.x * speed)
    } else {
      // bấm sàn: tự đi tới (dừng cách 1 thân người)
      const goal = useRoom.getState().goal
      if (goal) {
        const d = new THREE.Vector3(goal[0] - pos.x, 0, goal[1] - pos.z)
        const len = d.length()
        if (len < speed + 0.05 * M) useRoom.setState({ goal: null })
        else pos.addScaledVector(d.normalize(), speed)
      }
    }
    const before = pos.clone()
    collide(pos)
    // tự đi mà bị bàn / tường chặn lại thì thôi
    if (useRoom.getState().goal && before.distanceTo(pos) > speed * 0.8)
      useRoom.setState({ goal: null })
    pos.y = EYE_Y
    cam.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
  })
  return null
}
