import { useEffect } from 'react'
import { hush, speak } from '@/data/voice'

/** câu đã đọc trong phiên (cho `once`) */
const said = new Set<string>()

/**
 * Đọc thành tiếng lời Keeb-chan đang hiện (`lines` đổi thì đọc câu mới, khung thoại đóng thì dừng).
 * `once`: mỗi câu chỉ đọc 1 lần mỗi phiên (lời dẫn khi đi lại hiện đi hiện lại)
 */
export function useSpeak(lines: (string | null | undefined)[], once = false) {
  const key = lines.filter(Boolean).join('\n')
  useEffect(() => {
    if (!key) return
    if (once) {
      if (said.has(key)) return
      said.add(key)
    }
    speak(key.split('\n'))
    return hush
  }, [key, once])
}
