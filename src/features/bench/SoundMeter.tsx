import { useShallow } from 'zustand/react/shallow'
import { useGame, currentSound } from '@/store'
import { SOUND_WISH, soundLabel, soundMatch } from '@/data/parts'
import { HudPanel, Muted, SoundBars } from '@/components/ui'
import { cn } from '@/lib/format'

/** Máy đo âm thanh ở bước test: so với âm khách muốn */
export function SoundMeter() {
  const profile = useGame(useShallow(currentSound))
  const wish = useGame((s) => s.order!.wish)
  const match = Math.round(soundMatch(profile, wish) * 100)
  const tone = match >= 80 ? 'text-green' : match >= 50 ? 'text-yellow' : 'text-[#ff8a8a]'
  return (
    <HudPanel id="sound" title="🎧 Máy đo âm thanh">
      <div className="mb-2 flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2">
        <div className={cn('font-head text-3xl leading-none font-extrabold', tone)}>{match}%</div>
        <div className="min-w-0 text-xs leading-snug">
          <div>
            Khớp ý khách: <b>{SOUND_WISH[wish].name}</b>
          </div>
          <div className="text-muted">
            Đang nghe giống: <b className="text-white">{soundLabel(profile)}</b>
          </div>
        </div>
      </div>
      <SoundBars {...profile} target={SOUND_WISH[wish].target} size="md" />
      <Muted>Vạch trắng = âm khách muốn</Muted>
    </HudPanel>
  )
}
