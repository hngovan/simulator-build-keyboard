import { useEffect } from 'react'
import { useGame } from '@/store'

/**
 * Phím tắt bàn build (R đổi kéo / xoay, Space về góc nhìn mặc định, M danh sách đơn): bỏ qua khi đang gõ ô nhập
 * hoặc ở bước test (mọi phím là phím đang test)
 */
export function useBenchKey(code: string, run: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      const typing = (e.target as HTMLElement | null)?.closest?.(
        'input, textarea, [contenteditable]',
      )
      const testing = !!s.build && s.step() === 'test'
      if (
        e.code === code &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.repeat &&
        !typing &&
        !testing
      ) {
        // Space: không để trình duyệt bấm nút đang focus / cuộn trang
        e.preventDefault()
        run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code, run])
}
