import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Moon } from 'lucide-react'
import { useGame } from '@/store'
import { LAYOUTS } from '@/data/layouts'
import { CASES } from '@/data/parts'
import { Badge, Button, Muted, type BadgeTone } from '@/components/ui'
import { CustomerAvatar } from '@/components/game/CustomerAvatar'
import { OrderSpec } from '@/components/game/OrderSpec'
import { cn, fmt } from '@/lib/format'
import type { Order } from '@/types'
import type { PackedOrder } from '@/store/persistence'
import { ChatBubble } from './ChatBubble'
import { ResultCard } from './ResultCard'
import { orderLook, useOrderThumb } from './orderThumb'
import { OrderViewer } from './OrderViewer'

const reaction = (stars: number, late?: number) =>
  late
    ? `Phím ok nhưng trễ ${late} ngày shop ơi, lần sau nhanh hơn nhé 😤`
    : stars >= 4
      ? 'Phím xịn quá shop ơi, cảm ơn nhiều!'
      : stars >= 3
        ? 'Cũng ổn, nhưng chưa hoàn hảo lắm.'
        : 'Không giống mình dặn lắm shop ạ 😕'

/** Ảnh bàn phím ghép sẵn theo đơn; bấm để mở xem 3D chi tiết (chờ chụp xong thì hiện ô trống) */
function OrderImage({ order, className }: { order: Order; className?: string }) {
  const src = useOrderThumb(order)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        title="Bấm để xem chi tiết 3D"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-black/20 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(0,0,0,0.55)]',
          className,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={`Bàn phím ${LAYOUTS[order.layout].name}`}
            className="h-full w-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <span className="animate-bob text-2xl">⌨️</span>
        )}
        <span className="absolute right-1 bottom-1 rounded-full bg-black/60 px-1.5 text-[10px] opacity-0 group-hover:opacity-100">
          🔍 Xem 3D
        </span>
      </button>
      {open && <OrderViewer order={order} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Hạn giao so với hôm nay */
function DueBadge({ order }: { order: Order }) {
  const day = useGame((s) => s.day)
  const left = (order.dueDay ?? day + order.days) - day
  if (order.dueDay === undefined) return <Badge tone="blue">⏳ {order.days} ngày</Badge>
  return left > 0 ? (
    <Badge tone={left === 1 ? 'yellow' : 'green'}>⏳ còn {left} ngày</Badge>
  ) : left === 0 ? (
    <Badge tone="yellow">⏰ hạn hôm nay</Badge>
  ) : (
    <Badge tone="red">⚠️ trễ {-left} ngày</Badge>
  )
}

/** 1 hội thoại: đơn mới (offer) hoặc đơn đã đóng gói (chờ gửi / đã gửi) */
type Thread =
  { kind: 'offer'; order: Order } | { kind: 'packed'; order: Order; packed: PackedOrder }

const STATUS: Record<string, [string, BadgeTone]> = {
  offer: ['Đơn mới', 'yellow'],
  ready: ['Chờ gửi', 'orange'],
  sent: ['Đã gửi', 'green'],
}
const statusOf = (t: Thread) =>
  t.kind === 'offer' ? STATUS.offer : t.packed.shipped ? STATUS.sent : STATUS.ready

/** Dòng hội thoại ở cột trái: avatar, tên, tin cuối, trạng thái */
function ThreadRow({ t, active, onPick }: { t: Thread; active: boolean; onPick: () => void }) {
  const [label, tone] = statusOf(t)
  const last =
    t.kind === 'offer'
      ? t.order.lines[t.order.lines.length - 1]
      : t.packed.shipped
        ? reaction(t.packed.result.stars, t.packed.result.late)
        : 'Bàn phím của bạn xong rồi nè 📦'
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
        active ? 'bg-purple/35' : 'hover:bg-white/5',
      )}
    >
      <CustomerAvatar avatar={t.order.avatar} customer={t.order.customer} className="size-10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <b className="truncate text-sm">{t.order.customer}</b>
          <Badge tone={tone} className="ml-0 shrink-0">
            {label}
          </Badge>
        </div>
        <div className="truncate text-xs text-muted">{last}</div>
      </div>
    </button>
  )
}

/** Câu trả lời nhanh (lựa chọn đối thoại) dưới khung chat */
function Reply({
  tone = 'default',
  onClick,
  children,
}: {
  tone?: 'default' | 'green' | 'red' | 'orange'
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-extrabold transition-[transform,background-color] hover:-translate-y-0.5',
        tone === 'green' && 'border-green/60 bg-green/15 text-green hover:bg-green/25',
        tone === 'red' && 'border-red/60 bg-red/10 text-red hover:bg-red/20',
        tone === 'orange' && 'border-orange/60 bg-orange/15 text-orange hover:bg-orange/25',
        tone === 'default' && 'border-white/20 bg-white/5 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

/** Khung chat của 1 hội thoại */
function ChatView({ t }: { t: Thread }) {
  const { acceptOrder, declineOrder, shipOrder } = useGame.getState()
  const order = t.order
  const { caseId } = orderLook(order)
  // tin nhắn qua lại trong phiên (không lưu): hỏi chi tiết, xem điểm
  const [asked, setAsked] = useState(false)
  const [score, setScore] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [asked, score, t])
  const packed = t.kind === 'packed' ? t.packed : null
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* đầu hội thoại */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2">
        <CustomerAvatar avatar={order.avatar} customer={order.customer} className="size-10" />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{order.customer}</b>
          <Muted>
            {order.type === 'kit' ? 'Gửi kit' : 'Shop lo hết'} · {LAYOUTS[order.layout].name}
            {order.featured && ` · ${CASES[caseId].name}`}
          </Muted>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {!packed && <DueBadge order={order} />}
          <Badge tone="green">Công {fmt(order.labor)}</Badge>
          <Badge>Budget {fmt(order.budget)}</Badge>
          {order.featured && <Badge tone="rep">✨ Thiết kế mở</Badge>}
        </div>
      </div>

      {/* tin nhắn */}
      <div ref={body} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
        <ChatBubble from="in">
          <OrderImage order={order} className="h-[120px] w-[200px]" />
        </ChatBubble>
        {order.lines.map((l, i) => (
          <ChatBubble key={i} from="in">
            {l}
          </ChatBubble>
        ))}
        {asked && (
          <>
            <ChatBubble from="out">Bạn gửi shop chi tiết yêu cầu nhé?</ChatBubble>
            <ChatBubble from="in" wide>
              <OrderSpec order={order} compact />
            </ChatBubble>
          </>
        )}
        {packed && (
          <>
            <ChatBubble from="out">Ok bạn, shop nhận đơn nhé! 👌</ChatBubble>
            <ChatBubble from="out">
              Bàn phím của bạn xong rồi nè 📦 ({'★'.repeat(packed.result.stars)})
            </ChatBubble>
            {packed.shipped && (
              <>
                <ChatBubble from="out">Shop gửi hàng rồi, bạn check giúp shop nhé 🚚</ChatBubble>
                <ChatBubble from="in">
                  {reaction(packed.result.stars, packed.result.late)}
                </ChatBubble>
                <Muted className="self-center">
                  +{fmt(packed.result.reimburse + packed.result.labor)} đã vào ví
                </Muted>
              </>
            )}
            {score && <ResultCard result={packed.result} />}
          </>
        )}
      </div>

      {/* lựa chọn trả lời */}
      <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-3 py-2.5">
        {!packed && (
          <>
            {!asked && (
              <Reply onClick={() => setAsked(true)}>💬 Cho shop xem chi tiết yêu cầu</Reply>
            )}
            <Reply tone="green" onClick={() => acceptOrder(order.id)}>
              Nhận đơn
            </Reply>
            <Reply tone="red" onClick={() => declineOrder(order.id)}>
              Xin lỗi, shop không nhận được
            </Reply>
          </>
        )}
        {packed && !packed.shipped && (
          <Reply tone="orange" onClick={() => shipOrder(order.id)}>
            🚚 Gửi hàng cho khách
          </Reply>
        )}
        {packed && (
          <Reply onClick={() => setScore(!score)}>{score ? 'Ẩn điểm' : '📊 Xem điểm chấm'}</Reply>
        )}
      </div>
    </div>
  )
}

// Tin nhắn: đơn mới trong ngày + đơn đã đóng gói (gửi từng đơn cho khách). Đơn đã nhận xem ở app "Danh sách đơn"
export function Messenger() {
  const offers = useGame((s) => s.offers)
  const packed = useGame((s) => s.packed)
  const day = useGame((s) => s.day)
  const nextDay = useGame((s) => s.nextDay)
  const threads: Thread[] = [
    ...packed
      .filter((p) => !p.shipped)
      .map((p) => ({ kind: 'packed' as const, order: p.order, packed: p })),
    ...offers.map((o) => ({ kind: 'offer' as const, order: o })),
    ...packed
      .filter((p) => p.shipped)
      .map((p) => ({ kind: 'packed' as const, order: p.order, packed: p })),
  ]
  const [pick, setPick] = useState<string | null>(null)
  // hội thoại đang mở (vừa nhận / từ chối thì nhảy sang hội thoại đầu tiên)
  const current = threads.find((t) => t.order.id === pick) ?? threads[0]
  const unsent = packed.filter((p) => !p.shipped).length

  return (
    <div className="flex h-[min(620px,72vh)] overflow-hidden rounded-xl bg-black/15">
      {/* danh sách hội thoại */}
      <div className="flex w-[260px] shrink-0 flex-col border-r border-white/10">
        <div className="flex items-center justify-between px-3 py-2">
          <b>📅 Ngày {day}</b>
          <Muted>{offers.length} đơn mới</Muted>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5">
          {threads.map((t) => (
            <ThreadRow
              key={t.order.id}
              t={t}
              active={t === current}
              onPick={() => setPick(t.order.id)}
            />
          ))}
          {!threads.length && (
            <Muted className="px-2 py-3">
              Hết tin nhắn mới, kết thúc ngày để nhận đơn mới nhé.
            </Muted>
          )}
        </div>
        <div className="border-t border-white/10 p-2">
          <Button
            tone="green"
            className="flex w-full items-center justify-center gap-2"
            onClick={nextDay}
          >
            <Moon className="size-4" />
            Kết thúc ngày{unsent ? ` · gửi ${unsent} đơn` : ''}
          </Button>
        </div>
      </div>
      {current ? (
        <ChatView
          key={current.order.id + (current.kind === 'packed' && current.packed.shipped ? 's' : '')}
          t={current}
        />
      ) : (
        <div className="grid flex-1 place-items-center text-muted">Chọn 1 hội thoại</div>
      )}
    </div>
  )
}
