import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  BadgePercent,
  Camera,
  Gift,
  Handshake,
  Search,
  Send,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react'
import { useGame } from '@/store'
import { itemName } from '@/data/parts'
import { greet, type InboxAction } from '@/data/market'
import { Button, TitleBar, TitleButton, type ButtonTone } from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import type { GroupPost } from '@/types'
import { ChatBubble } from '../messenger/ChatBubble'

/** các câu inbox người chơi chọn được (mỗi câu 1 lần) */
const ACTIONS: { id: InboxAction; icon: ReactNode; label: string; tone?: ButtonTone }[] = [
  { id: 'photo', icon: <Camera />, label: 'Xin hình check flaw' },
  { id: 'var', icon: <Search />, label: 'Check var uy tín' },
  { id: 'loc', icon: <Gift />, label: 'Lộc lá cho em đi bác', tone: 'yellow' },
  { id: 'chot', icon: <Handshake />, label: 'Nhanh gọn em chốt luôn', tone: 'yellow' },
  { id: 'lowball', icon: <BadgePercent />, label: 'Lowball −30%', tone: 'orange' },
]

/** Khung inbox người bán ở Hội Phím Cơ: hỏi han / trả giá rồi chuyển khoản chốt đơn */
export function InboxChat({ post, onClose }: { post: GroupPost; onClose: () => void }) {
  const live = useGame((s) => s.posts.find((p) => p.id === post.id)) ?? post
  const { inboxPost, buyPost } = useGame.getState()
  const deal = live.deal ?? { price: live.price, ship: 0, log: [], used: [] }
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [deal.log.length])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  // "câm điếc": xin stk luôn khi chưa hỏi gì; hỏi rồi thì hết cơ hội
  const muted = deal.used.includes('mute')
  const done = live.sold || deal.blocked
  const pay = () => {
    if (buyPost(live) !== 'fail') onClose()
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-[min(78vh,640px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
        <TitleBar
          color="#1877f2"
          title={
            <>
              Inbox {live.seller}
              <span className="ml-2 font-sans text-xs font-bold opacity-80">
                {itemName(live.product.cat, live.opt.item)}
              </span>
            </>
          }
        >
          <TitleButton close aria-label="Đóng inbox" title="Đóng" onClick={onClose}>
            <X />
          </TitleButton>
        </TitleBar>

        {/* tin nhắn: người bán bên trái, mình bên phải, hệ thống ở giữa */}
        <div ref={body} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
          <ChatBubble from="in">{greet(live)}</ChatBubble>
          {deal.log.map((l, i) =>
            l.from === 'system' ? (
              <div
                key={i}
                className="self-center rounded-full bg-black/30 px-3 py-1 text-xs font-bold"
              >
                {l.text}
              </div>
            ) : (
              <ChatBubble key={i} from={l.from === 'me' ? 'out' : 'in'}>
                {l.text}
              </ChatBubble>
            ),
          )}
        </div>

        {/* giá đang thương lượng + câu trả lời nhanh */}
        <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              Giá: {deal.price < live.price && <s className="mr-1">{fmt(live.price)}</s>}
              <b className="text-[#ff8c5a]">{fmt(deal.price)}</b> · Ship{' '}
              <b className={deal.ship ? 'text-ink' : 'text-green'}>
                {deal.ship ? fmt(deal.ship) : 'free'}
              </b>
            </span>
            <span className="text-muted">
              Tổng <b className="text-ink">{fmt(deal.price + deal.ship)}</b>
            </span>
          </div>
          {done ? (
            <Button disabled className="self-end">
              {live.sold ? 'Đã chốt đơn' : 'Bạn đã bị chặn'}
            </Button>
          ) : (
            <div className="flex flex-wrap justify-end gap-1.5 [&_svg]:size-4">
              {!muted &&
                ACTIONS.map((a) => (
                  <Button
                    key={a.id}
                    size="sm"
                    tone={a.tone}
                    disabled={deal.used.includes(a.id)}
                    className="flex items-center gap-1.5"
                    onClick={() => inboxPost(live.id, a.id)}
                  >
                    {a.icon}
                    {a.label}
                  </Button>
                ))}
              {!deal.used.length && (
                <Button
                  size="sm"
                  tone="blue"
                  title="Không hỏi gì, xin stk luôn: được bớt hữu duyên"
                  className="flex items-center gap-1.5"
                  onClick={() => inboxPost(live.id, 'mute')}
                >
                  <VolumeX />
                  Nhanh gọn cho người câm điếc
                </Button>
              )}
              <Button
                size="sm"
                tone="green"
                className={cn('flex items-center gap-1.5')}
                onClick={pay}
              >
                {muted ? <Send /> : <Wallet />}
                Chuyển khoản {fmt(deal.price + deal.ship)}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
