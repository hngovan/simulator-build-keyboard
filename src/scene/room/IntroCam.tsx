import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INTRO, useIntro } from '@/features/intro/introStore'
import { playNotify } from '@/sound'
import { Y } from '@/data/steps'
import { useSceneLoading } from '../common/loadingStore'
import { pcEye, screenCenter } from '../models/computerLayout'
import { EYE_Y, M, PC_DESK } from './roomLayout'

/** lia phòng lúc hiện chữ studio (m): từ góc phải gần tường trước trôi chậm vào giữa phòng, nhìn về 2 cái bàn */
const PAN_FROM = new THREE.Vector3(1.55 * M, EYE_Y + 0.25 * M, 3.75 * M)
const PAN_TO = new THREE.Vector3(0.75 * M, EYE_Y + 0.05 * M, 3.0 * M)
const PAN_LOOK = new THREE.Vector3((PC_DESK.x / 2) * M, Y.table + 0.25 * M, 0)

const smooth = (k: number) => k * k * (3 - 2 * k)

/**
 * Camera đoạn mở đầu (người chơi lần đầu): lia phòng → bay tới chỗ nhìn màn hình máy tính (đúng tư thế ngồi máy `pcEye`) → màn hình
 * báo tin nhắn mới (`ping`) → popup hỏi hướng dẫn (`phase = 'ask'`, đứng yên). Lúc này WalkControls nhường camera;
 * bỏ qua (bấm / phím) = `phase` nhảy thẳng sang 'ask', camera đứng luôn ở màn hình
 */
export function IntroCam() {
  const t = useRef(0)
  useFrame(({ camera, size }, raw) => {
    const { phase, ping } = useIntro.getState()
    if (!phase) return void (t.current = 0)
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 42
    const eye = new THREE.Vector3(...pcEye(fov, size.width, size.height))
    const screen = new THREE.Vector3(...screenCenter())
    if (phase === 'ask') {
      // bỏ qua giữa chừng: màn hình vẫn phải có tin nhắn
      if (!ping) useIntro.setState({ ping: true })
      camera.position.copy(eye)
      camera.lookAt(screen)
      return
    }
    // màn chờ còn che: đứng sẵn ở đầu đường lia
    if (useSceneLoading.getState().settled) t.current += Math.min(raw, 1 / 30)
    const at = t.current
    if (at < INTRO.credits) {
      // trôi chậm dần (dừng êm trước khi bay)
      const k = at / INTRO.credits
      camera.position.lerpVectors(PAN_FROM, PAN_TO, 1 - (1 - k) * (1 - k))
      camera.lookAt(PAN_LOOK)
      return
    }
    if (phase === 'credits') useIntro.setState({ phase: 'message' })
    const k = smooth(Math.min(1, (at - INTRO.credits) / INTRO.fly))
    camera.position.lerpVectors(PAN_TO, eye, k)
    camera.lookAt(new THREE.Vector3().lerpVectors(PAN_LOOK, screen, k))
    const arrived = at - INTRO.credits - INTRO.fly
    if (arrived >= INTRO.ping && !ping) {
      useIntro.setState({ ping: true })
      playNotify()
    }
    if (arrived >= INTRO.ping + INTRO.ask) useIntro.setState({ phase: 'ask' })
  })
  return null
}
