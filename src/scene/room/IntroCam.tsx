import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INTRO, useIntro } from '@/features/intro/introStore'
import { playNotify } from '@/sound'
import { useSceneLoading } from '../common/loadingStore'
import { pcEye, screenCenter } from '../models/computerLayout'
import { PAN_FROM, PAN_LOOK, PAN_TO } from './introPath'

const smooth = (k: number) => k * k * (3 - 2 * k)

/**
 * Camera đoạn mở đầu (mỗi lần chơi mới): lia phòng → bay tới chỗ nhìn màn hình máy tính (đúng tư thế ngồi máy `pcEye`) → màn hình
 * báo tin nhắn mới (`ping`) → lùi về chỗ hiện chữ studio (`PAN_TO`) → popup hỏi hướng dẫn (`phase = 'ask'`, đứng yên).
 * Lúc này WalkControls nhường camera; bỏ qua (bấm / phím) = `phase` nhảy thẳng sang 'ask', camera đứng luôn ở `PAN_TO`
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
      // bỏ qua giữa chừng: màn hình vẫn phải có tin nhắn, camera đứng ở chỗ hiện chữ studio
      if (!ping) useIntro.setState({ ping: true })
      camera.position.copy(PAN_TO)
      camera.lookAt(PAN_LOOK)
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
    const arrived = at - INTRO.credits - INTRO.fly
    // đọc xong tin nhắn: lùi về đúng chỗ hiện chữ studio rồi mới hỏi
    const leave = arrived - INTRO.ping - INTRO.ask
    const k =
      leave > 0
        ? 1 - smooth(Math.min(1, leave / INTRO.back))
        : smooth(Math.min(1, (at - INTRO.credits) / INTRO.fly))
    camera.position.lerpVectors(PAN_TO, eye, k)
    camera.lookAt(new THREE.Vector3().lerpVectors(PAN_LOOK, screen, k))
    if (arrived >= INTRO.ping && !ping) {
      useIntro.setState({ ping: true })
      playNotify()
    }
    if (leave >= INTRO.back) useIntro.setState({ phase: 'ask' })
  })
  return null
}
