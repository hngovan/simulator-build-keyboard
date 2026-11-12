import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { useGame } from '@/store'
import { playUiSelect } from '@/sound'
import { Button, HudCard } from '@/components/ui'
import { markIntroSeen, useIntro } from './introStore'

/** trả lời popup: có = bỏ dấu "đã xem tour" + ngồi luôn vào máy tính (tour máy tính chạy), không = đứng dậy đi lại tự do */
function finish(guide: boolean) {
  playUiSelect()
  markIntroSeen()
  const s = useGame.getState()
  if (guide) {
    // camera đang ở đúng chỗ nhìn màn hình: vào desktop luôn (như `PcZoom` bay xong)
    useGame.setState({ guideSeen: [], walk: false })
    s.goPC()
    s.resetCam()
  }
  useIntro.setState({ phase: null, ping: false })
  s.toast(`Chào mừng ${s.name} tới xưởng phím! 🎉`, 'good')
}

/**
 * Lớp phủ đoạn mở đầu (người chơi lần đầu, cảnh 3D do `IntroCam` lái): chữ studio giữa màn → (camera bay vào màn hình, tin nhắn mới)
 * → popup giữa màn hỏi có cần hướng dẫn không (✗ / ✓). Bấm / Enter / Space / Esc lúc chưa tới popup = bỏ qua tới popup.
 * Phủ kín màn + `role="dialog"`: chặn bấm cảnh 3D, Esc không mở Cài đặt
 */
export function Intro() {
  const phase = useIntro((s) => s.phase)
  const ask = phase === 'ask'
  useEffect(() => {
    if (!phase) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (!ask) {
        if (!['Escape', 'Enter', ' '].includes(e.key)) return
        e.preventDefault()
        useIntro.setState({ phase: 'ask' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        finish(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        finish(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, ask])
  if (!phase) return null
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[3000] flex items-center justify-center px-4 select-none"
      onClick={() => !ask && useIntro.setState({ phase: 'ask' })}
    >
      {/* vào cảnh: màn đen tan dần */}
      <div className="pointer-events-none absolute inset-0 animate-fade-out bg-black" />
      {phase === 'credits' && (
        <div className="pointer-events-none animate-credits text-center text-white [text-shadow:0_4px_14px_rgba(0,0,0,0.75)]">
          <div className="font-logo text-[72px] leading-none font-extrabold tracking-wide uppercase max-md:text-[44px]">
            KeebStudio
          </div>
          <div className="mt-2 font-head text-2xl font-bold tracking-[0.2em] uppercase max-md:text-base">
            Hân hạnh giới thiệu
          </div>
        </div>
      )}
      {!ask && (
        <div className="pointer-events-none absolute bottom-6 font-head text-sm font-bold text-white/70 [text-shadow:0_2px_4px_#000]">
          Bấm để bỏ qua
        </div>
      )}
      {ask && (
        <HudCard className="flex w-[380px] max-w-full animate-pop flex-col gap-4 !p-5 text-center">
          <div className="font-head text-2xl leading-tight font-extrabold">
            <span className="text-yellow">Hướng dẫn:</span> bạn có muốn biết cách chơi trò chơi
            không?
          </div>
          <div className="flex justify-between">
            <Button
              tone="red"
              title="Không, tôi biết chơi rồi (Esc)"
              aria-label="Không cần hướng dẫn"
              onClick={() => finish(false)}
            >
              <X className="size-6" strokeWidth={3} />
            </Button>
            <Button
              tone="green"
              title="Có, hướng dẫn tôi (Enter)"
              aria-label="Có, hướng dẫn tôi"
              onClick={() => finish(true)}
            >
              <Check className="size-6" strokeWidth={3} />
            </Button>
          </div>
        </HudCard>
      )}
    </div>
  )
}
