import { useEffect } from 'react'
import { useGame, currentSound } from '@/store'
import { playKey } from '@/sound'

/** Bắt phím thật khi đang ở bước test: phím 3D lún xuống + phát tiếng */
export function useKeyboardTest() {
  useEffect(() => {
    const handle = (down: boolean) => (e: KeyboardEvent) => {
      const s = useGame.getState()
      if (s.screen !== 'bench' || s.step() !== 'test' || !s.ctx) return
      const k = s.ctx.keys.find((k) => k.code === e.code)
      if (!k) return
      e.preventDefault()
      if (down && s.pressed[k.id]) return // bỏ qua auto-repeat
      if (s.press(k.id, down)) playKey(currentSound(s), down)
    }
    const onDown = handle(true)
    const onUp = handle(false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])
}
