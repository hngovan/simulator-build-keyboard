import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INTRO, useIntro, type IntroPhase } from '@/features/intro/introStore'
import { playNotify } from '@/sound'
import { useSceneLoading } from '../common/loadingStore'
import { pcEye, screenCenter } from '../models/computerLayout'
import { HALL_SHOT, PAN_FROM, PAN_LOOK, PAN_TO, SHELF_SHOT, type IntroShot } from './introPath'

/**
 * Camera đoạn mở đầu (mỗi lần chơi mới): màn đen "NGÀY 1" → cảnh hành lang → cảnh góc kệ (`introPath`) → lia phòng → cắt cảnh sang trước màn hình máy tính (đúng tư thế ngồi máy `pcEye`, không bay) →
 * màn hình báo tin nhắn mới (`ping`) → cắt cảnh về chỗ hiện chữ studio (`PAN_TO`) → popup hỏi hướng dẫn (`phase = 'ask'`, đứng yên).
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
    let at = t.current
    // màn đen "NGÀY 1" → hành lang → góc kệ: mỗi cảnh cắt thẳng sang cảnh kế (không bay), trong cảnh camera trôi chậm đều
    const cuts: [IntroPhase, number, IntroShot][] = [
      ['day', INTRO.day, HALL_SHOT],
      ['hall', INTRO.hall, HALL_SHOT],
      ['shelf', INTRO.shelf, SHELF_SHOT],
    ]
    for (const [name, len, shot] of cuts) {
      if (at < len) {
        if (phase !== name) useIntro.setState({ phase: name })
        camera.position.lerpVectors(shot.from, shot.to, name === 'day' ? 0 : at / len)
        camera.lookAt(shot.look)
        return
      }
      at -= len
    }
    if (at < INTRO.credits) {
      if (phase !== 'credits') useIntro.setState({ phase: 'credits' })
      // trôi chậm dần (dừng êm trước khi cắt cảnh)
      const k = at / INTRO.credits
      camera.position.lerpVectors(PAN_FROM, PAN_TO, 1 - (1 - k) * (1 - k))
      camera.lookAt(PAN_LOOK)
      return
    }
    if (phase !== 'message') useIntro.setState({ phase: 'message' })
    // cắt cảnh như phim: không bay tới, khung hình kế đã ở ngay trước màn hình máy tính
    camera.position.copy(eye)
    camera.lookAt(screen)
    const seen = at - INTRO.credits
    if (seen >= INTRO.ping && !ping) {
      useIntro.setState({ ping: true })
      playNotify()
    }
    // đọc xong tin nhắn: cắt cảnh về chỗ hiện chữ studio (nhánh 'ask' ở trên đặt camera), popup hỏi hiện luôn
    if (seen >= INTRO.ping + INTRO.ask) useIntro.setState({ phase: 'ask' })
  })
  return null
}
