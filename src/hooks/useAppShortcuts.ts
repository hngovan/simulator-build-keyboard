import { useEffect } from 'react'
import { useGame } from '@/store'
import { runEntry, runSig } from '@/data/gameOver'
import { beaconRun } from '@/lib/leaderboardApi'

/**
 * Phím tắt toàn app + lưu khi đóng tab:
 * - Esc: mở Cài đặt (đang mở trên cùng thì đóng). Bỏ qua khi đang gõ chữ, đang test phím (Esc là 1 phím test),
 *   hoặc đang có popup (popup tự bắt Esc của nó)
 * - đóng tab / tải lại trang: tiến trình mới chưa lên bảng xếp hạng thì tự gửi (sendBeacon vẫn gửi khi trang đã tắt)
 */
export function useAppShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      const s = useGame.getState()
      if (s.screen === 'title' || s.gameOver) return
      if (s.screen === 'bench' && s.build && s.ctx?.steps[s.build.stepIdx] === 'test') return
      // popup phủ màn (xác nhận, xem 3D...) đang mở thì để popup tự xử lý Esc
      if (document.querySelector('[class*="z-[3500]"], [class*="z-[4000]"], [role="dialog"]'))
        return
      const top = s.windows[s.windows.length - 1]
      if (s.screen === 'pc' && top === 'settings' && !s.minimized.includes('settings'))
        return s.closeApp('settings')
      if (s.screen === 'bench') s.goPC()
      s.openApp('settings')
    }
    const onHide = () => {
      const s = useGame.getState()
      if (!s.unsynced()) return
      beaconRun(runEntry(s, 'save'))
      useGame.setState({ lbSynced: runSig(s) })
      s.save()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])
}
