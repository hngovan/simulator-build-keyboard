import { create } from 'zustand'

/** tab của menu Cài đặt ngoài game (Esc) */
export type SettingsTab = 'game' | 'audio' | 'keys' | 'display' | 'dev'

/** Menu Cài đặt ngoài game: Esc mở / đóng (`useAppShortcuts`), mở thì phím đi lại / phím tắt bàn build không ăn (`menuOpen`) */
export const useSettingsMenu = create(() => ({ open: false, tab: 'game' as SettingsTab }))

export const openSettings = (tab?: SettingsTab) =>
  useSettingsMenu.setState((s) => ({ open: true, tab: tab ?? s.tab }))
export const closeSettings = () => useSettingsMenu.setState({ open: false })
export const menuOpen = () => useSettingsMenu.getState().open
