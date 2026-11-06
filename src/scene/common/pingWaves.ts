import { create } from 'zustand'
import { useGame } from '@/store'
import { cornerPing, pingCorner } from '@/data/ping'
import { playPing } from '@/sound'

/** 1 đợt sóng âm vang góc case (vẽ kiểu sóng wifi nhiễu ở góc, `PingWaves`) */
export interface PingWave {
  id: number
  /** 0 sau trái, 1 sau phải, 2 trước trái, 3 trước phải (`pingCorner`) */
  corner: number
  /** performance.now() lúc phát */
  at: number
  strength: number
}

/** thời gian 1 đợt sóng (ms) */
export const WAVE_MS = 1000

export const usePingWaves = create<{ waves: PingWave[] }>(() => ({ waves: [] }))
let seq = 0

/**
 * Bước test: vừa nhấn phím `id` (đã ăn) mà case viền mỏng O-ring / top mount và phím nằm ở góc → kêu "bong" + sóng ở góc đó.
 * Lót foam PCB / foam đáy case thì ít lần nhấn bị vang hơn, tiếng nhỏ hơn (`cornerPing`)
 */
export function pingKey(id: string) {
  const s = useGame.getState()
  if (!s.ctx || !s.build || !s.pressed[id]) return
  const strength = cornerPing(s.inventory.case?.id, s.mount, !!s.build.foam, !!s.build.caseFoam)
  if (!strength || Math.random() >= strength) return
  const corner = pingCorner(s.ctx.keys, id)
  if (corner < 0) return
  playPing(strength)
  const wave = { id: ++seq, corner, at: performance.now(), strength }
  usePingWaves.setState((w) => ({ waves: [...w.waves.slice(-7), wave] }))
  setTimeout(
    () => usePingWaves.setState((w) => ({ waves: w.waves.filter((x) => x.id !== wave.id) })),
    WAVE_MS + 50,
  )
}
