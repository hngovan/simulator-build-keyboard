import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { playUiSelect } from '@/sound'
import { Button } from '@/components/ui'
import { KeyCap } from '@/components/game/ControlsHint'
import { GuideGirl } from '@/components/art/GuideGirl'
import { TOUR_ID } from '@/data/tourIds'

/** câu hỏi tên xưởng (hiện ô nhập) là câu thứ mấy trong `lines` */
const ASK = 3

/** nền chấm bi tím (kiểu màn hội thoại) */
const BACKDROP = {
  backgroundColor: '#2b2350',
  backgroundImage:
    'radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2.5px), radial-gradient(circle at 50% 35%, #4a3a8f, transparent 70%)',
  backgroundSize: '26px 26px, 100% 100%',
}

/**
 * Màn Keeb-chan chào + đặt tên xưởng: lần đầu ngồi máy tính của lượt mới (`name` còn rỗng), phủ kín màn kiểu hội thoại.
 * Space / Enter / bấm = câu kế; câu hỏi tên hiện ô nhập (Enter chốt); hết câu cuối mới ghi `name` (màn này tự đóng, tour máy tính
 * chạy tiếp nếu đã chọn ✓ ở đoạn mở đầu). `role="dialog"`: Esc không mở Cài đặt
 */
export function Greeting() {
  const [i, setI] = useState(0)
  const [name, setName] = useState('')
  const tour = useGame((s) => !s.guideSeen.includes(TOUR_ID))
  const shop = name.trim()
  // cốt truyện: người chơi đang thất nghiệp, bạn cũ (anh QuýB) nhắn nhờ build 1 con 60% → nảy ra ý mở xưởng build phím
  const lines = [
    'Chào! Mình là Keeb-chan, trợ lý trong máy của bạn!',
    'Anh QuýB, bạn cũ của bạn, vừa nhắn nhờ build giúp một con phím 60% kìa.',
    'Mà nè... chơi phím bao nhiêu năm, giờ lại đang thất nghiệp. Sao bạn không mở luôn một xưởng build phím nhỉ?',
    'Quyết vậy đi! Xưởng của bạn tên là gì?',
    `"${shop}", tên hay đó! ${tour ? 'Đơn đầu tiên là của anh QuýB, để mình chỉ bạn từng bước nhé!' : 'Đơn đầu tiên là của anh QuýB, mở Mezzenger xem nhé!'}`,
  ]
  const asking = i === ASK
  const next = () => {
    if (asking && !shop) return
    playUiSelect()
    if (i < lines.length - 1) return setI(i + 1)
    const s = useGame.getState()
    useGame.setState({ name: shop })
    s.toast(`Chào mừng ${shop} tới xưởng phím! 🎉`, 'good')
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      // đang gõ tên: chỉ Enter chốt, Space là dấu cách
      if (e.key !== 'Enter' && (asking || e.key !== ' ')) return
      e.preventDefault()
      next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[2400] animate-fade-in overflow-hidden select-none"
      style={BACKDROP}
      onClick={() => !asking && next()}
    >
      {/* Keeb-chan đứng giữa, chân chìm sau khung thoại; câu chào thì lắc người vẫy chào */}
      <div className="absolute inset-x-0 bottom-24 flex justify-center">
        <div className={`origin-bottom ${i === 0 ? 'animate-wave' : 'animate-bob'}`}>
          <GuideGirl className="h-[min(64vh,600px)] w-auto" />
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-4 mx-auto max-w-[980px]">
        <div className="flex items-end justify-between px-3">
          <span className="rounded-t-xl bg-yellow px-5 py-1 font-head text-lg font-extrabold text-bg">
            Keeb-chan
          </span>
          {!asking && (
            <span className="mb-1.5 flex items-center gap-1.5 font-head text-sm font-bold text-ink/80">
              <KeyCap>Space</KeyCap>
            </span>
          )}
        </div>
        <div className="flex min-h-[112px] flex-col gap-3 rounded-2xl border-[3px] border-black/45 bg-panel/92 px-5 py-4 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
          <p key={i} className="animate-fade-in font-head text-2xl leading-snug font-bold">
            {lines[i]}
          </p>
          {asking && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                next()
              }}
            >
              <input
                autoFocus
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="VD: Tuấn Keeb"
                className="min-w-0 flex-1 rounded-xl border-2 border-line bg-panel-2 px-3 py-2 text-lg outline-none focus:border-yellow"
              />
              <Button tone="yellow" type="submit" disabled={!shop}>
                Chốt tên
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
