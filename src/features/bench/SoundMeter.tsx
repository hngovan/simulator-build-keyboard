import { useShallow } from 'zustand/react/shallow'
import { useGame, currentSound } from '@/store'
import { SOUND_WISH, soundLabel, soundMatch } from '@/data/parts'
import { HudCard, Muted, SoundBars } from '@/components/ui'

/** Máy đo âm thanh ở bước test: so với âm khách muốn */
export function SoundMeter() {
  const profile = useGame(useShallow(currentSound))
  const wish = useGame((s) => s.order!.wish)
  return (
    <HudCard>
      <h4 className="mb-2 text-base">🎧 Máy đo âm thanh</h4>
      <SoundBars {...profile} target={SOUND_WISH[wish].target} />
      <div className="text-xs">
        Nghe giống: <b>{soundLabel(profile)}</b>
      </div>
      <div className="text-xs">
        Khớp ý khách ({SOUND_WISH[wish].name}):{' '}
        <b>{Math.round(soundMatch(profile, wish) * 100)}%</b>
      </div>
      <Muted>Vạch vàng = âm khách mong muốn</Muted>
    </HudCard>
  )
}
