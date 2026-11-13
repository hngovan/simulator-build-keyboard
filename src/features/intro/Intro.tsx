import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { useGame } from '@/store'
import { playUiSelect } from '@/sound'
import { Button, HudCard } from '@/components/ui'
import { ALL_TIPS, INTRO_OFF, useIntro } from './introStore'

/** trả lời popup: có = bỏ dấu "đã xem tour" + tập đi lại (`LearnHud`, `IntroSpots`) rồi tự tới máy tính, không = đi lại tự do */
function finish(guide: boolean) {
  playUiSelect()
  if (guide) {
    // bật tour + tập đi lại: nhìn quanh → di chuyển → tự đi tới máy tính (thẻ tin nhắn còn trên màn hình 3D tới lúc ngồi vào máy)
    useGame.setState({ guideSeen: [] })
    useIntro.setState({ phase: null, learn: 'look', progress: 0, tips: ALL_TIPS })
  } else useIntro.setState(INTRO_OFF)
  // vừa bấm / gõ phím trả lời: khoá tâm chuột luôn để rê chuột là nhìn quanh được (trình duyệt từ chối thì bấm vào cảnh)
  try {
    const lock = document.querySelector('canvas')?.requestPointerLock() as unknown as
      Promise<void> | undefined
    lock?.catch?.(() => {})
  } catch {
    /* bấm vào cảnh để khoá */
  }
}

/**
 * Lớp phủ đoạn mở đầu (mỗi lần chơi mới, cảnh 3D do `IntroCam` lái): chữ studio giữa màn → (camera bay vào màn hình, tin nhắn mới, lùi về)
 * → popup giữa màn hỏi có cần hướng dẫn không (✗ / ✓). Phím bất kỳ lúc chưa tới popup = bỏ qua tới popup (bấm chuột không bỏ qua: dễ bấm nhầm).
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
        // phím bất kỳ = bỏ qua (trừ Esc, phím bổ trợ / phím F để còn Alt+Tab, F12...)
        if (e.ctrlKey || e.altKey || e.metaKey) return
        if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key) || /^F\d+$/.test(e.key))
          return
        // Esc không bỏ qua: bấm 2 lần liền (bỏ qua rồi ✗ ở popup) là mất cả đoạn mở đầu lẫn hướng dẫn
        if (e.key === 'Escape') return void e.preventDefault()
        e.preventDefault()
        useIntro.setState({ phase: 'ask' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        finish(true)
      } else if (e.key === 'Escape') {
        // Esc không trả lời thay người chơi (dễ bấm nhầm thành "không cần hướng dẫn"): phải bấm nút ✗
        e.preventDefault()
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
    >
      {/* vào cảnh: màn đen tan dần */}
      <div className="pointer-events-none absolute inset-0 animate-fade-out bg-black" />
      {/* phòng sáng màu: phủ tối cả màn cùng nhịp với chữ + chữ viền đen cho dễ đọc */}
      {phase === 'credits' && (
        <div className="pointer-events-none absolute inset-0 animate-credits bg-[#0d0f16]/60" />
      )}
      {phase === 'credits' && (
        <div className="pointer-events-none relative animate-credits text-center text-white [-webkit-text-stroke:6px_#141821] [paint-order:stroke_fill] [text-shadow:0_5px_0_rgba(0,0,0,0.55)]">
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
          Bấm phím bất kỳ để bỏ qua
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
              title="Không, tôi biết chơi rồi"
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
