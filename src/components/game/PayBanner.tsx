import { X } from 'lucide-react'
import { useGame } from '@/store'

/**
 * Banner giữa đầu màn hình khi vừa giao hàng (đặt thùng vào kệ giao hàng): nhắc vào Mezzenger bấm "Thu tiền" nhận thù lao.
 * Bấm banner thì mở thẳng hội thoại của khách; thu xong / sang ngày thì tự tắt
 */
export function PayBanner() {
  const pay = useGame((s) => s.payBanner)
  const screen = useGame((s) => s.screen)
  if (!pay || screen === 'title') return null
  const open = () => {
    const s = useGame.getState()
    s.setMessengerPick(pay.id)
    s.openApp('messenger')
    if (s.screen === 'bench') s.zoomToPC()
  }
  return (
    <div className="pointer-events-none fixed inset-x-3 top-16 z-[3000] flex justify-center">
      <div
        role="button"
        tabIndex={0}
        title="Mở tin nhắn của khách để thu tiền"
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && open()}
        className="pointer-events-auto relative flex w-[min(520px,100%)] animate-pop cursor-pointer rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.94)] py-3 pr-10 pl-4 shadow-[0_6px_0_#0006]"
      >
        <div className="min-w-0">
          <div className="font-head text-xl leading-tight font-extrabold text-yellow">
            Nhận thù lao của bạn
          </div>
          <div className="text-base leading-snug">
            Tuyệt vời, giờ bạn chỉ cần thu thù lao của mình ({pay.amount}k từ {pay.customer}): ấn
            vào tin nhắn và bấm <b className="text-green">Thu tiền</b>.
          </div>
        </div>
        <button
          type="button"
          aria-label="Ẩn thông báo"
          title="Ẩn thông báo"
          className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-ink"
          onClick={(e) => {
            e.stopPropagation()
            useGame.setState({ payBanner: null })
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
