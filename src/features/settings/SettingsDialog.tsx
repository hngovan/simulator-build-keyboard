import { useEffect } from 'react'
import { create } from 'zustand'
import { createPortal } from 'react-dom'
import { FlaskConical, Keyboard, Settings, Volume2, X, type LucideIcon } from 'lucide-react'
import { TabChip, TitleBar, TitleButton } from '@/components/ui'
import { useGame } from '@/store'
import { AudioTab, DevTab, GameTab, KeysTab } from './SettingsTabs'

type SettingsTab = 'game' | 'audio' | 'keys' | 'dev'

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: 'game', label: 'Chung', icon: Settings },
  { id: 'audio', label: 'Âm thanh', icon: Volume2 },
  { id: 'keys', label: 'Phím tắt', icon: Keyboard },
  ...(import.meta.env.DEV ? [{ id: 'dev' as const, label: 'Dev', icon: FlaskConical }] : []),
]

/** popup Cài đặt (máy tính / bàn build / đi lại): Esc bật / tắt (`useAppShortcuts`); tab đang chọn nhớ giữa các lần mở, không lưu */
export const useSettingsPop = create(() => ({
  open: false,
  tab: 'game' as SettingsTab,
  /** lúc mở do mất khoá tâm chuột (Esc lúc đi lại, `WalkControls`): Esc ngay sau đó không đóng lại */
  at: 0,
}))

/**
 * Cài đặt nổi giữa màn, mở bằng Esc: Chung (lưu tiến trình, về màn đăng nhập) / Âm thanh / Phím tắt (chỉ xem) /
 * Dev (chỉ khi dev). Hình nền đổi ở app Cài đặt trong máy tính. Bấm nền tối / nút X / Esc để đóng
 */
export function SettingsDialog() {
  const open = useSettingsPop((s) => s.open)
  const tab = useSettingsPop((s) => s.tab)
  const screen = useGame((s) => s.screen)
  // về màn đăng nhập thì đóng popup
  useEffect(() => {
    if (screen === 'title') useSettingsPop.setState({ open: false })
  }, [screen])
  if (!open || screen === 'title') return null
  const close = () => useSettingsPop.setState({ open: false })
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex max-h-[min(84vh,680px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
        <TitleBar color="#66758f" title="Cài đặt">
          <TitleButton close aria-label="Đóng (Esc)" title="Đóng (Esc)" onClick={close}>
            <X />
          </TitleButton>
        </TitleBar>
        <div className="flex flex-wrap gap-1.5 border-b border-black/20 px-3.5 py-2.5 max-md:px-2.5">
          {TABS.map((t) => (
            <TabChip
              key={t.id}
              active={tab === t.id}
              icon={t.icon}
              onClick={() => useSettingsPop.setState({ tab: t.id })}
            >
              {t.label}
            </TabChip>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5 text-left max-md:p-2.5">
          {tab === 'game' && <GameTab />}
          {tab === 'audio' && <AudioTab />}
          {tab === 'keys' && <KeysTab />}
          {tab === 'dev' && import.meta.env.DEV && <DevTab />}
        </div>
      </div>
    </div>,
    document.body,
  )
}
