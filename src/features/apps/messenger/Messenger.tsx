import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChartColumn,
  Check,
  EyeOff,
  Handshake,
  Keyboard,
  MapPin,
  Moon,
  Truck,
  X,
} from 'lucide-react'
import { useGame } from '@/store'
import { LAYOUTS } from '@/data/layouts'
import { CASES } from '@/data/parts'
import { DECLINE_FREE } from '@/data/reviews'
import { Badge, Button, Muted, ViewHint, type BadgeTone, type ButtonTone } from '@/components/ui'
import { CustomerAvatar } from '@/components/game/CustomerAvatar'
import { cn } from '@/lib/format'
import type { Order } from '@/types'
import type { PackedOrder } from '@/store/persistence'
import { ChatBubble } from './ChatBubble'
import { withEmotes } from './emotes'
import { Highlight } from './highlight'
import { ResultCard } from './ResultCard'
import { orderLook, useOrderThumb } from './orderThumb'
import { OrderViewer } from './OrderViewer'

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
        <ViewHint />
      </button>
      {open && <OrderViewer order={order} onClose={() => setOpen(false)} />}
    </>
  )
}

const ADDRESSES = [
  '12 Nguyễn Trãi, Q.1, TP.HCM',
  '45 Lê Lợi, Hải Châu, Đà Nẵng',
  '88 Cầu Giấy, Hà Nội',
  '7 Trần Phú, Nha Trang',
  '203 Võ Văn Tần, Q.3, TP.HCM',
  '16 Hùng Vương, Huế',
]

/** Cách nhận hàng cố định theo đơn: khách tự qua shop lấy (1/3) hoặc gửi về địa chỉ */
function delivery(order: Order) {
  const h = Math.abs([...order.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  return { pickup: h % 3 === 0, address: ADDRESSES[h % ADDRESSES.length] }
}

/**
 * 1 hội thoại: đơn mới · đã nhận (đang làm / chờ làm) · đã đóng gói chờ gửi · đã từ chối.
 * Hội thoại chỉ mất khi gửi hàng cho khách (đơn từ chối: mất khi sang ngày mới)
 */
type Thread =
  | { kind: 'offer'; order: Order }
  | { kind: 'accepted'; order: Order; active: boolean }
  | { kind: 'packed'; order: Order; packed: PackedOrder }
  | { kind: 'rejected'; order: Order; angry: boolean }

const STATUS: Record<string, [string, BadgeTone]> = {
  offer: ['Đơn mới', 'yellow'],
  active: ['Đang làm', 'green'],
  accepted: ['Đã nhận', 'blue'],
  packed: ['Chờ gửi', 'orange'],
  rejected: ['Từ chối', 'red'],
}
const statusOf = (t: Thread) => STATUS[t.kind === 'accepted' && t.active ? 'active' : t.kind]

// tin nhắn qua lại của từng hành động (shop gửi → khách đáp)
const MSG = {
  accept: 'Ok shop nhận đơn này nhé 👌',
  accepted: (o: Order) => `Tuyệt, cảm ơn shop! Hẹn ngày ${o.dueDay ?? '?'} nhé 🙏`,
  decline: 'Xin lỗi bạn, đợt này shop kín lịch rồi, không nhận được 🙏',
  declined: (angry: boolean) =>
    angry ? 'Shop gì chảnh vậy, nhắn mãi không nhận 😒' : 'Tiếc quá, hẹn shop dịp khác nhé',
  done: 'Bàn phím của bạn xong rồi nè 📦',
}

/** Dòng hội thoại ở cột trái: avatar, tên, tin cuối, trạng thái */
function ThreadRow({ t, active, onPick }: { t: Thread; active: boolean; onPick: () => void }) {
  const [label, tone] = statusOf(t)
  const last =
    t.kind === 'offer'
      ? t.order.lines[t.order.lines.length - 1]
      : t.kind === 'accepted'
        ? MSG.accepted(t.order)
        : t.kind === 'packed'
          ? MSG.done
          : MSG.declined(t.angry)
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
        active ? 'bg-purple/35' : 'hover:bg-white/5',
        t.kind === 'rejected' && 'opacity-60',
      )}
    >
      <CustomerAvatar avatar={t.order.avatar} customer={t.order.customer} className="size-10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <b className="truncate text-sm">{t.order.customer}</b>
          <Badge solid tone={tone} className="ml-0 shrink-0">
            {label}
          </Badge>
        </div>
        <div className="truncate text-xs text-muted">{withEmotes(last, 'h-[1.4em]')}</div>
      </div>
    </button>
  )
}

/** Câu trả lời nhanh dưới khung chat: nút game có icon (cùng kiểu nút "Kết thúc ngày") */
function Reply({
  tone = 'default',
  icon,
  onClick,
  children,
}: {
  tone?: ButtonTone
  icon: ReactNode
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      tone={tone}
      className="flex items-center gap-2 max-md:flex-1 max-md:justify-center max-md:px-2 max-md:whitespace-nowrap [&_svg]:size-4"
      onClick={onClick}
    >
      {icon}
      {children}
    </Button>
  )
}

/** 3 chấm nhấp nhô: tin đang gửi */
function Typing() {
  return (
    <span className="flex h-5 items-center gap-1" aria-label="Đang gửi">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="size-2 animate-bounce rounded-full bg-white/85"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )
}

/** để người chơi thấy tin nhắn rồi mới đổi trạng thái đơn (ms) */
const REPLY_DELAY = 800

/** Khung chat của 1 hội thoại */
/** `onReply`: giữ hội thoại này đang mở sau khi đơn đổi trạng thái (không nhảy sang hội thoại khác) */
function ChatView({ t, onReply, onBack }: { t: Thread; onReply: () => void; onBack: () => void }) {
  const { acceptOrder, declineOrder, shipOrder, goBench } = useGame.getState()
  const order = t.order
  const { caseId } = orderLook(order)
  // tin vừa gửi trong phiên (không lưu): nhận / từ chối / gửi hàng; xin địa chỉ, xem điểm
  const [sent, setSent] = useState<'accept' | 'decline' | 'ship' | null>(null)
  const [askedAddr, setAskedAddr] = useState(false)
  const [score, setScore] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  // cuộn xuống tin mới nhất khi đổi hội thoại / trạng thái đơn / có tin gửi; không theo object `t`
  // (dựng lại mỗi lần render, bấm xem ảnh đơn cũng làm khung chat bị cuộn)
  const threadKey = `${t.order.id}:${t.kind}`
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [sent, askedAddr, score, threadKey])
  const packed = t.kind === 'packed' ? t.packed : null
  const { pickup, address } = delivery(order)
  const accepted = t.kind === 'accepted' || !!packed
  // hiện tin vừa gửi rồi mới đổi trạng thái đơn
  const act = (kind: NonNullable<typeof sent>, run: () => void) => {
    onReply()
    setSent(kind)
    setTimeout(run, REPLY_DELAY)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* đầu hội thoại */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-3 text-[13px]">
        {/* cửa sổ hẹp (mobile): 1 cột, nút quay lại danh sách hội thoại */}
        <button
          type="button"
          aria-label="Quay lại danh sách hội thoại"
          onClick={onBack}
          className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/10 @xl:hidden"
        >
          <ChevronLeft className="size-5" />
        </button>
        <CustomerAvatar avatar={order.avatar} customer={order.customer} className="size-10" />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{order.customer}</b>
          <Muted>
            {order.type === 'kit' ? 'Gửi kit' : 'Shop lo hết'} · {LAYOUTS[order.layout].name}
            {order.featured && ` · ${CASES[caseId].name}`}
          </Muted>
        </div>
      </div>

      {/* tin nhắn */}
      <div ref={body} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
        <ChatBubble from="in">
          <OrderImage order={order} className="h-[120px] w-[200px]" />
        </ChatBubble>
        {order.lines.map((l, i) => (
          <ChatBubble key={i} from="in">
            <Highlight text={l} order={order} />
          </ChatBubble>
        ))}
        {accepted && <ChatBubble from="out">{MSG.accept}</ChatBubble>}
        {accepted && <ChatBubble from="in">{MSG.accepted(order)}</ChatBubble>}
        {t.kind === 'rejected' && <ChatBubble from="out">{MSG.decline}</ChatBubble>}
        {t.kind === 'rejected' && <ChatBubble from="in">{MSG.declined(t.angry)}</ChatBubble>}
        {packed && (
          <>
            <ChatBubble from="out">
              {MSG.done} ({'★'.repeat(packed.result.stars)})
            </ChatBubble>
            {pickup ? (
              <ChatBubble from="in">Ui nhanh vậy! Mình tự qua shop lấy nhé 🛵</ChatBubble>
            ) : (
              askedAddr && (
                <>
                  <ChatBubble from="out">Bạn cho shop xin địa chỉ giao hàng nhé?</ChatBubble>
                  <ChatBubble from="in">
                    Gửi giúp mình về <b className="text-yellow">{address}</b> nha shop 🙏
                  </ChatBubble>
                </>
              )
            )}
            {score && <ResultCard result={packed.result} />}
          </>
        )}
        {/* vừa bấm trả lời: bong bóng "…" đang gửi, xong thì hiện tin thật */}
        {sent && (
          <ChatBubble from="out">
            <Typing />
          </ChatBubble>
        )}
      </div>

      {/* lựa chọn trả lời: mỗi nút = 1 tin nhắn gửi khách (đáy luôn có, cao bằng đáy cột trái) */}
      <div className="flex h-16 shrink-0 items-center justify-end gap-2 border-t border-white/10 px-3">
        {sent ? null : t.kind === 'rejected' ? (
          // đã từ chối: nút mờ ở góc phải, không bấm được (hết nhắn tiếp)
          <Button disabled className="flex items-center gap-2 [&_svg]:size-4">
            <Ban />
            Bạn đã từ chối đơn này
          </Button>
        ) : (
          <>
            {t.kind === 'offer' && (
              <>
                <Reply
                  tone="green"
                  icon={<Check />}
                  onClick={() => act('accept', () => acceptOrder(order.id))}
                >
                  Nhận đơn
                </Reply>
                <Reply
                  tone="red"
                  icon={<X />}
                  onClick={() => act('decline', () => declineOrder(order.id))}
                >
                  {/* điện thoại: chữ ngắn cho 2 nút vừa 1 hàng */}
                  <span className="max-md:hidden">Xin lỗi, shop không nhận được</span>
                  <span className="md:hidden">Từ chối đơn</span>
                </Reply>
              </>
            )}
            {t.kind === 'accepted' && (
              <Reply tone="blue" icon={<Keyboard />} onClick={goBench}>
                Ra bàn build
              </Reply>
            )}
            {packed && !pickup && !askedAddr && (
              <Reply icon={<MapPin />} onClick={() => setAskedAddr(true)}>
                Xin địa chỉ giao hàng
              </Reply>
            )}
            {packed && (pickup || askedAddr) && (
              <Reply
                tone="orange"
                icon={pickup ? <Handshake /> : <Truck />}
                onClick={() => act('ship', () => shipOrder(order.id))}
              >
                {pickup ? 'Giao tận tay khách' : 'Gửi hàng cho khách'}
              </Reply>
            )}
            {packed && (
              <Reply icon={score ? <EyeOff /> : <ChartColumn />} onClick={() => setScore(!score)}>
                {score ? 'Ẩn điểm' : 'Xem điểm chấm'}
              </Reply>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Tin nhắn: mỗi đơn 1 hội thoại (đơn mới, đã nhận, chờ gửi, đã từ chối); gửi hàng xong thì hội thoại mất
export function Messenger() {
  const offers = useGame((s) => s.offers)
  const packed = useGame((s) => s.packed)
  const order = useGame((s) => s.order)
  const jobs = useGame((s) => s.jobs)
  const rejected = useGame((s) => s.rejected)
  const day = useGame((s) => s.day)
  const nextDay = useGame((s) => s.nextDay)
  const unsent = packed.filter((p) => !p.shipped)
  const isPacked = (o: Order) => unsent.some((p) => p.order.id === o.id)
  const threads: Thread[] = [
    ...unsent.map((p) => ({ kind: 'packed' as const, order: p.order, packed: p })),
    ...offers.map((o) => ({ kind: 'offer' as const, order: o })),
    ...(order && !isPacked(order) ? [{ kind: 'accepted' as const, order, active: true }] : []),
    ...jobs.map((j) => ({ kind: 'accepted' as const, order: j.order, active: false })),
    ...rejected.map((o, i) => ({ kind: 'rejected' as const, order: o, angry: i >= DECLINE_FREE })),
  ]
  const [pick, setPick] = useState<string | null>(null)
  // cửa sổ hẹp: chỉ hiện 1 cột — danh sách hoặc khung chat
  const [chatOpen, setChatOpen] = useState(false)
  // hội thoại đang mở (vừa gửi hàng thì nhảy sang hội thoại đầu tiên)
  const current = threads.find((t) => t.order.id === pick) ?? threads[0]

  return (
    <div className="flex h-[min(620px,72vh)] overflow-hidden rounded-xl border border-white/10 bg-black/15 group-data-fill/win:h-full">
      {/* danh sách hội thoại */}
      <div
        className={cn(
          'flex w-[260px] shrink-0 flex-col border-r border-white/10 @max-xl:w-full @max-xl:border-r-0',
          chatOpen && '@max-xl:hidden',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3">
          <b className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-yellow" />
            Ngày {day}
          </b>
          {offers.length ? (
            <Badge solid tone="yellow" className="ml-0">
              {offers.length} đơn mới
            </Badge>
          ) : (
            <Muted>Hết đơn mới</Muted>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
          {threads.map((t) => (
            <ThreadRow
              key={t.order.id}
              t={t}
              active={t === current}
              onPick={() => {
                setPick(t.order.id)
                setChatOpen(true)
              }}
            />
          ))}
          {!threads.length && (
            <Muted className="px-2 py-3">
              Hết tin nhắn mới, kết thúc ngày để nhận đơn mới nhé.
            </Muted>
          )}
        </div>
        <div className="flex h-16 shrink-0 items-center border-t border-white/10 px-3">
          <Button
            tone="green"
            className="flex w-full items-center justify-center gap-2"
            onClick={nextDay}
          >
            <Moon className="size-4" />
            Kết thúc ngày{unsent.length ? ` · gửi ${unsent.length} đơn` : ''}
          </Button>
        </div>
      </div>
      <div className={cn('flex min-w-0 flex-1', !chatOpen && '@max-xl:hidden')}>
        {current ? (
          <ChatView
            key={current.order.id + current.kind}
            t={current}
            onReply={() => setPick(current.order.id)}
            onBack={() => setChatOpen(false)}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-muted">Chọn 1 hội thoại</div>
        )}
      </div>
    </div>
  )
}
