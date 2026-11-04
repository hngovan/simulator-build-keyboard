import { useEffect } from 'react'
import { useGame } from '@/store'
import { runEntry, runSig } from '@/data/gameOver'
import { beaconRun } from '@/lib/leaderboardApi'

/**
 * Phím tắt toàn app + lưu khi đóng tab:
 * - Esc = nút quay lại (`BackButton`): ngồi máy tính / bàn build thì đứng dậy ra phòng (máy tính đang mở Cài đặt trên cùng thì
 *   đóng Cài đặt trước); đang đi lại thì thôi. Bỏ qua khi đang gõ chữ, đang test phím (Esc là 1 phím test), hoặc đang có
 *   popup (popup tự bắt Esc của nó; popup nhỏ bắt Esc thì `preventDefault`). Cài đặt nằm trong app Cài đặt của máy tính
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
      if (s.screen === 'bench' && !s.walk && s.build && s.ctx?.steps[s.build.stepIdx] === 'test')
        return
      // popup phủ màn (xác nhận, xem 3D, lịch...) đang mở thì để popup tự xử lý Esc
      if (document.querySelector('[class*="z-[3500]"], [class*="z-[4000]"], [role="dialog"]'))
        return
      // popup nhỏ (chuông, menu chọn...) bắt Esc thì `preventDefault`: chờ hết các listener rồi mới quay lại
      setTimeout(() => {
        if (e.defaultPrevented) return
        const g = useGame.getState()
        if (g.screen === 'pc') {
          const top = g.windows[g.windows.length - 1]
          if (top === 'settings' && !g.minimized.includes('settings')) return g.closeApp('settings')
          return g.standUp('pc')
        }
        if (g.screen === 'bench' && !g.walk) g.standUp('bench')
      })
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
