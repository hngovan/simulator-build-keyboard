import { useEffect } from 'react'
import { useGame, currentSound } from '@/store'
import { playKey } from '@/sound'

/**
 * Bắt phím thật khi đang ở bước test: phím 3D lún xuống + phát tiếng (click chuột vào phím 3D cũng được).
 * - Nhiều phím cùng mã (2 Space / 2 B của Alice, 2 Shift...): ưu tiên phím chưa test, nhả đúng phím đã nhấn
 * - Phím chỉ báo keyup (PrintScreen trên Windows): coi như nhấn + nhả luôn
 * - Rời cửa sổ khi đang giữ phím: nhả hết cho phím 3D khỏi kẹt
 */
export function useKeyboardTest() {
  useEffect(() => {
    /** mã phím thật → id phím 3D đang giữ */
    const held = new Map<string, string>()
    const testing = () => {
      const s = useGame.getState()
      // đang đi lại trong phòng: WASD là phím đi, không tính test
      return s.screen === 'bench' && !s.walk && s.step() === 'test' && s.ctx ? s : null
    }
    /** phím 3D ứng với mã: ưu tiên phím chưa test */
    const pick = (code: string) => {
      const s = testing()
      const list = s?.ctx?.keys.filter((k) => k.code === code) ?? []
      return list.find((k) => !s?.build?.tested[k.id]) ?? list[0]
    }
    const press = (id: string, down: boolean) => {
      const s = useGame.getState()
      if (s.press(id, down)) playKey(currentSound(s), down)
    }
    const onDown = (e: KeyboardEvent) => {
      if (!testing()) return
      if (held.has(e.code)) return e.preventDefault() // auto-repeat
      const k = pick(e.code)
      if (!k) return
      e.preventDefault()
      held.set(e.code, k.id)
      press(k.id, true)
    }
    const onUp = (e: KeyboardEvent) => {
      if (!testing()) return
      const id = held.get(e.code)
      if (id) {
        e.preventDefault()
        held.delete(e.code)
        press(id, false)
        return
      }
      const k = pick(e.code)
      if (!k) return
      e.preventDefault()
      press(k.id, true)
      setTimeout(() => press(k.id, false), 90)
    }
    const releaseAll = () => {
      for (const id of held.values()) press(id, false)
      held.clear()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [])
}
