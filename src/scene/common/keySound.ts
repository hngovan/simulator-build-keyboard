import { currentSound, useGame } from '@/store'
import { keySize, playKey, type KeyRole } from '@/sound'
import { pingKey } from './pingWaves'

/**
 * Bước test: tiếng 1 phím vừa nhấn / nhả (đã qua `press`). Cỡ phím theo bề ngang (1u / 2u / space); phím có stab kêu lạch xạch
 * dây theo mod stab (lube dây gần hết, lube housing còn một nửa); nhấn phím góc case viền mỏng thì vang (`pingKey`)
 */
export function testKeySound(id: string, down: boolean) {
  const s = useGame.getState()
  const k = s.ctx?.keys.find((x) => x.id === id)
  const mods = s.build?.stabMods
  const rattle = mods?.wire ? 0.15 : mods?.housing ? 0.5 : 1
  const size = keySize(k && k.stab ? k.w : 1)
  const role: KeyRole =
    size === 'space'
      ? 'space'
      : k?.code === 'Enter' || k?.code === 'NumpadEnter'
        ? 'enter'
        : k?.code === 'Backspace' || size === '2u'
          ? 'backspace'
          : 'generic'
  // hàng phím (0 = hàng số / F … 4 = hàng dưới) → tiếng GENERIC_R0–R4
  playKey(currentSound(s), down, { size, rattle, role, row: k?.row ?? 2 })
  if (down) pingKey(id)
}
