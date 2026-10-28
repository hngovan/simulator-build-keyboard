import { useGame, type GameState } from '@/store'
import { TOOLS } from '@/data/parts'

/**
 * Mũi tên xanh bước hàn (như bàn mod stab) chỉ việc tiếp theo:
 * có phím cháy + bút hút thiếc → phím cháy đầu tiên; mũi hàn đen → 'clean' (bùi nhùi);
 * còn lại → phím chưa hàn đầu tiên (thứ tự hàng → cột). null = không chỉ gì
 */
function solderHint(s: GameState): string | null {
  const { ctx, build } = s
  if (!ctx || !build || ctx.steps[build.stepIdx] !== 'solder') return null
  if (TOOLS.solder[s.tools.solder].none) return null
  const keys = [...ctx.keys].sort((a, b) => a.y - b.y || a.x - b.x)
  const joint = (id: string) => build.solder[id]
  const burnt = keys.find((k) => {
    const j = joint(k.id)
    return !!j && j !== true && j.burnt
  })
  if (burnt && !TOOLS.desolder[s.tools.desolder ?? 0].none) return burnt.id
  if (build.tipDirty) return TOOLS.tipCleaner[s.tools.tipCleaner].none ? null : 'clean'
  return keys.find((k) => !joint(k.id))?.id ?? null
}

/** Chỗ mũi tên bước hàn đang chỉ: mã phím, 'clean' (bùi nhùi) hoặc null */
export const useSolderHint = () => useGame(solderHint)
