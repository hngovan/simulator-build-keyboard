import { useGame } from '@/store'
import { cn } from '@/lib/format'
import { Wallpaper } from '@/features/desktop/Wallpaper'
import { WALLPAPERS, WALLPAPER_IDS, wallpaperOf } from '@/features/desktop/wallpapers'
import { Section } from '@/features/settings/SettingsParts'

/**
 * Cài đặt trong máy tính (KeebOS): chỉ đổi hình nền desktop. Âm thanh, phím tắt, lưu tiến trình... ở menu Cài đặt
 * ngoài game (Esc, `features/settings/GameSettings`).
 * Ô xem trước thu nhỏ (vẽ cỡ 800×450 rồi scale, không ghi tên, tên ở tooltip), đang chọn viền vàng
 */
export function SettingsApp() {
  const current = useGame((s) => s.wallpaper)
  return (
    <Section title="Hình nền" info="Lưu cùng tiến trình. Cài đặt khác: bấm Esc">
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
                <span className="pointer-events-none absolute top-0 left-0 h-[450px] w-[800px] origin-top-left scale-[0.16]">
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
