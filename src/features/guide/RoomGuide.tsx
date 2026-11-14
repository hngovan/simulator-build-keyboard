import { useGame } from '@/store'
import { HudCard } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'
import { roomGuideText } from './roomGuideSteps'
import { useIntro } from '@/features/intro/introStore'
import { useSpeak } from '@/hooks/useSpeak'

/**
 * Khung lời dẫn giữa trên màn hình khi đi lại (không chặn chuột). Không còn la bàn trong khung (người dùng bảo xoá):
 * chỉ đường bằng mũi tên 3D `GuideMarker` trong cảnh
 */
export function RoomGuide() {
  const text = useGame(roomGuideText)
  // đang tập đi lại (sau đoạn mở đầu): không hiện lời dẫn, người chơi tự mò theo dấu ? / bong bóng "Tương tác"
  const learning = useIntro((s) => !!s.learn)
  // lời dẫn hiện suốt lúc đi lại: mỗi câu chỉ đọc 1 lần
  useSpeak([learning ? null : text], true)
  if (!text || learning) return null
  return (
    <HudCard className="pointer-events-none fixed top-3 left-1/2 z-[6] flex w-[min(500px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 !p-3 max-md:top-16">
      <GuideGirl className="h-16 w-auto shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-head text-sm font-extrabold text-yellow">Keeb-chan</div>
        <p className="text-sm leading-snug">{text}</p>
      </div>
    </HudCard>
  )
}
