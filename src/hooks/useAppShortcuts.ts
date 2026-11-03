import { useEffect } from 'react'
import { useGame } from '@/store'
import { runEntry, runSig } from '@/data/gameOver'
import { beaconRun } from '@/lib/leaderboardApi'
import { closeSettings, menuOpen, openSettings } from '@/lib/settingsMenu'

/**
 * Phím tắt toàn app + lưu khi đóng tab:
 * - Esc: mở / đóng menu Cài đặt ngoài game (`GameSettings`) ở máy tính, bàn build, đi lại. Đứng dậy = nút quay lại.
 *   Bỏ qua khi đang gõ chữ, đang test phím (Esc là 1 phím test), hoặc đang có popup (popup tự bắt Esc của nó)
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
      // popup xác nhận nổi trên Cài đặt (thoát, build thử...) thì để popup tự xử lý
      if (document.querySelector('[class*="z-[3500]"], [class*="z-[4000]"]')) return
      if (menuOpen()) return closeSettings()
      if (s.screen === 'bench' && !s.walk && s.build && s.ctx?.steps[s.build.stepIdx] === 'test')
        return
      // popup phủ màn (xem 3D, lịch...) đang mở thì để popup tự xử lý Esc
      if (document.querySelector('[role="dialog"]')) return
      // popup nhỏ (chuông, menu chọn...) bắt Esc thì `preventDefault`: chờ hết các listener rồi mới mở Cài đặt
      setTimeout(() => !e.defaultPrevented && openSettings())
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
