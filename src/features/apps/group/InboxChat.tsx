import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  BadgePercent,
  Camera,
  Gift,
  Hand,
  Handshake,
  PencilLine,
  Search,
  Send,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react'
import { useGame } from '@/store'
import { itemName } from '@/data/parts'
import { OFFER_MAX, dealFloor, greet, type InboxAction } from '@/data/market'
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

/** Popup tự nhập giá trả (k): gợi ý sẵn ~85% giá đang chào */
function OfferPopup({
  price,
  left,
  onSend,
  onClose,
}: {
  price: number
  left: number
  onSend: (n: number) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(String(Math.max(0, Math.round((price * 0.85) / 50) * 50)))
  const n = Number(value)
  const ok = Number.isFinite(n) && n > 0 && n <= price
  const send = () => ok && onSend(n)
  return (
    <div
      className="absolute inset-0 z-10 grid animate-fade-in place-items-center bg-black/50 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[min(90%,340px)] rounded-2xl border-[3px] border-black/40 bg-panel-2 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="mb-1 font-extrabold">Trả giá</div>
        <div className="mb-3 text-xs text-muted">
          Đang chào {fmt(price)} · còn {left} lần trả giá. Trả thấp quá dễ ăn block.
        </div>
        <label className="flex items-center gap-2 rounded-xl border-2 border-line bg-black/30 px-3 py-2 focus-within:border-yellow">
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
              if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-lg font-extrabold outline-none"
          />
          <span className="font-bold text-muted">k</span>
        </label>
        {!ok && value !== '' && (
          <div className="mt-1 text-xs text-[#ffb4b4]">Nhập từ 1k tới {fmt(price)}</div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button size="sm" onClick={onClose}>
            Huỷ
          </Button>
          <Button size="sm" tone="green" disabled={!ok} onClick={send}>
            Gửi giá
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Khung inbox người bán ở Hội Phím Cơ: hỏi han / trả giá rồi chuyển khoản chốt đơn */
export function InboxChat({ post, onClose }: { post: GroupPost; onClose: () => void }) {
  const live = useGame((s) => s.posts.find((p) => p.id === post.id)) ?? post
  const { inboxPost, buyPost } = useGame.getState()
  const deal = live.deal ?? { price: live.price, ship: 0, log: [], used: [] }
  const body = useRef<HTMLDivElement>(null)
  const [offering, setOffering] = useState(false)
  const offersLeft = OFFER_MAX - deal.used.filter((a) => a === 'offer').length
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [deal.log.length])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !offering && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, offering])
  // "câm điếc": xin stk luôn khi chưa hỏi gì; hỏi rồi thì hết cơ hội
  const muted = deal.used.includes('mute')
  const done = live.sold || deal.blocked || deal.gift
  const pay = () => {
    if (buyPost(live) !== 'fail') onClose()
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex h-[min(78vh,640px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
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
          {deal.gift && !live.sold ? (
            <Button tone="green" className="flex items-center gap-1.5 self-end" onClick={pay}>
              <Gift className="size-4" />
              Nhận quà free
            </Button>
          ) : done ? (
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
              {!muted && (
                <>
                  <Button
                    size="sm"
                    tone="orange"
                    title={`Tự nhập giá muốn trả (còn ${offersLeft} lần)`}
                    disabled={offersLeft <= 0 || deal.price <= dealFloor(live)}
                    className="flex items-center gap-1.5"
                    onClick={() => setOffering(true)}
                  >
                    <PencilLine />
                    Trả giá…
                  </Button>
                  <Button
                    size="sm"
                    tone="red"
                    title="Năn nỉ xin free: hiếm khi được cho, 10% bị ban khỏi chợ 3 ngày"
                    disabled={deal.used.includes('beg')}
                    className="flex items-center gap-1.5"
                    onClick={() => inboxPost(live.id, 'beg')}
                  >
                    <Hand />
                    Đi ăn xin
                  </Button>
                </>
              )}
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
        {offering && (
          <OfferPopup
            price={deal.price}
            left={offersLeft}
            onClose={() => setOffering(false)}
            onSend={(n) => {
              inboxPost(live.id, 'offer', n)
              setOffering(false)
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
