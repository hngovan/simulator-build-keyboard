import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { preloadSwitchSound } from '@/sound'
import { useGame, currentSound } from '@/store'
import { MOUNTS, SOUND_WISH, soundLabel, soundMatch } from '@/data/parts'
import { HudPanel, Muted, SoundBars } from '@/components/ui'
import { cn } from '@/lib/format'
import { cornerPing } from '@/data/ping'

/** Máy đo âm thanh ở bước test: so với âm khách muốn */
export function SoundMeter() {
  const profile = useGame(useShallow(currentSound))
  const wish = useGame((s) => s.order!.wish)
  // vào bước test: tải trước bộ tiếng switch đang lắp, lần gõ đầu đã có tiếng thật
  useEffect(() => preloadSwitchSound(profile.sound), [profile.sound])
  const match = Math.round(soundMatch(profile, wish) * 100)
  // case viền mỏng + O-ring / top mount: gõ phím góc kêu "bong" (sóng vàng ở góc case)
  const ping = useGame((s) =>
    cornerPing(s.inventory.case?.id, s.mount, !!s.build?.foam, !!s.build?.caseFoam),
  )
  const mount = useGame((s) => s.mount)
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
      {ping > 0 && (
        <div className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-xs leading-snug">
          <b className="text-yellow">🔔 Vang góc case</b>: viền mỏng +{' '}
          {mount ? MOUNTS[mount].name : ''} nên gõ phím ở góc nghe "bong" (sóng vàng ở góc).{' '}
          {ping < 1 ? 'Foam đã lót bớt vang.' : 'Lót foam PCB / foam đáy case thì bớt vang.'}
        </div>
      )}
    </HudPanel>
  )
}
