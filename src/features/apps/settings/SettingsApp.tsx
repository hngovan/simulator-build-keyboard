import { create } from 'zustand'
import { FlaskConical, Keyboard, Settings, Volume2, type LucideIcon } from 'lucide-react'
import { useGame } from '@/store'
import { cn } from '@/lib/format'
import { TabChip } from '@/components/ui'
import { Wallpaper } from '@/features/desktop/Wallpaper'
import { WALLPAPERS, WALLPAPER_IDS, wallpaperOf } from '@/features/desktop/wallpapers'
import { Section } from '@/features/settings/SettingsParts'
import { AudioTab, DevTab, GameTab, KeysTab } from '@/features/settings/SettingsTabs'

type SettingsTab = 'game' | 'audio' | 'keys' | 'dev'

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: 'game', label: 'Chung', icon: Settings },
  { id: 'audio', label: 'Âm thanh', icon: Volume2 },
  { id: 'keys', label: 'Phím tắt', icon: Keyboard },
  ...(import.meta.env.DEV ? [{ id: 'dev' as const, label: 'Dev', icon: FlaskConical }] : []),
]

/** tab đang chọn: nhớ giữa các lần mở app (không lưu save) */
const useTab = create(() => ({ tab: 'game' as SettingsTab }))

/**
 * Cài đặt trong máy tính (KeebOS), mọi cài đặt ở đây: Chung (lưu tiến trình, hình nền, về màn đăng nhập) /
 * Âm thanh / Phím tắt (cố định, chỉ xem) / Dev (chỉ khi dev: tiền vô hạn, build thử, FPS). Tab nội dung ở `features/settings/SettingsTabs`
 */
export function SettingsApp() {
  const tab = useTab((s) => s.tab)
  const pick = (t: SettingsTab) => useTab.setState({ tab: t })
  return (
    <div className="flex flex-col gap-3">
      {/* hàng tab dính đầu cửa sổ khi cuộn (giống app Kho) */}
      <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 flex flex-wrap gap-1.5 bg-panel px-3.5 pt-3.5 pb-1 max-md:-top-2.5 max-md:-mx-2.5 max-md:-mt-2.5 max-md:px-2.5 max-md:pt-2.5">
        {TABS.map((t) => (
          <TabChip key={t.id} active={tab === t.id} icon={t.icon} onClick={() => pick(t.id)}>
            {t.label}
          </TabChip>
        ))}
      </div>
      {tab === 'game' && (
        <GameTab>
          <WallpaperSection />
        </GameTab>
      )}
      {tab === 'audio' && <AudioTab />}
      {tab === 'keys' && <KeysTab />}
      {tab === 'dev' && import.meta.env.DEV && <DevTab />}
    </div>
  )
}

/** Ô xem trước thu nhỏ (vẽ cỡ 800×450 rồi scale, không ghi tên, tên ở tooltip), đang chọn viền vàng */
function WallpaperSection() {
  const current = useGame((s) => s.wallpaper)
  return (
    <Section title="Hình nền" info="Lưu cùng tiến trình">
      <div className="grid grid-cols-3 gap-1.5">
        {WALLPAPER_IDS.map((id) => {
          const active = id === wallpaperOf(current)
          return (
            <button
              key={id}
              title={`Đặt hình nền: ${WALLPAPERS[id]}`}
              onClick={() => useGame.setState({ wallpaper: id })}
              className={cn(
                'rounded-xl p-1.5 transition-colors',
                active
                  ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset'
                  : 'bg-panel-2 hover:bg-[#323d52]',
              )}
            >
              <span className="relative block aspect-video w-full overflow-hidden rounded-lg">
                <span className="pointer-events-none absolute top-0 left-0 h-[450px] w-[800px] origin-top-left scale-[0.19]">
                  <Wallpaper id={id} />
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Section>
  )
}
