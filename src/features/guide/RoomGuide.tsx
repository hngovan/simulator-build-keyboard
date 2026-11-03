import { ArrowUp } from 'lucide-react'
import { useGame } from '@/store'
import { HudCard } from '@/components/ui'
import { GuideGirl } from '@/components/art/GuideGirl'
import { useRoom } from '@/scene/room/roomStore'
import { roomGuideText } from './roomGuideSteps'

/** hướng chỗ cần tới so với hướng đang nhìn (độ, + = bên phải) → chữ ngắn */
function dirText(deg: number) {
  const a = Math.abs(deg)
  if (a < 25) return 'phía trước'
  if (a > 140) return 'sau lưng, quay người lại'
  const side = deg > 0 ? 'phải' : 'trái'
  return a < 70 ? `chếch ${side}` : `quay sang ${side}`
}

/**
 * Khung lời dẫn giữa trên màn hình khi đi lại (không chặn chuột) + la bàn: mũi tên xoay theo hướng chỗ cần tới
 * (`useRoom.guideDir` do `GuideMarker` trong cảnh tính mỗi khung hình) + khoảng cách
 */
export function RoomGuide() {
  const text = useGame(roomGuideText)
  const dir = useRoom((r) => r.guideDir)
  const dist = useRoom((r) => r.guideDist)
  if (!text) return null
  return (
    <HudCard className="pointer-events-none fixed top-3 left-1/2 z-[6] flex w-[min(500px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 !p-3 max-md:top-16">
      <GuideGirl className="h-16 w-auto shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-head text-sm font-extrabold text-yellow">Keeb-chan</div>
        <p className="text-sm leading-snug">{text}</p>
      </div>
      {dir !== null && (
        <div className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-yellow/15 ring-2 ring-yellow">
            <ArrowUp
              className="size-7 text-yellow transition-transform duration-150"
              strokeWidth={3}
              style={{ transform: `rotate(${dir}deg)` }}
            />
          </span>
          <span className="text-[11px] leading-tight font-bold text-muted">
            {dirText(dir)}
            {dist !== null && ` · ${dist}m`}
          </span>
        </div>
      )}
    </HudCard>
  )
}
