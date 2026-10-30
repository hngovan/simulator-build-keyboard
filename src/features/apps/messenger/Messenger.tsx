import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChartColumn,
  Coins,
  Check,
  EyeOff,
  ListFilter,
  Footprints,
  Handshake,
  Keyboard,
  MapPin,
  Truck,
  X,
} from 'lucide-react'
import { useGame } from '@/store'
import { LAYOUTS } from '@/data/layouts'
import { CASES } from '@/data/parts'
import { DECLINE_FREE } from '@/data/reviews'
import { payout } from '@/store/scoring'
import { Button, Muted, ThumbLoading, ViewHint, type ButtonTone } from '@/components/ui'
import { CustomerAvatar } from '@/components/game/CustomerAvatar'
import { OrderSpec } from '@/components/game/OrderSpec'
import { chatIntro } from '@/data/orders'
import { cn } from '@/lib/format'
import type { Order } from '@/types'
import type { PackedOrder } from '@/store/persistence'
import { ChatBubble } from './ChatBubble'
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
          'group relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-black/20',
          className,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={`Bàn phím ${LAYOUTS[order.layout].name}`}
            className="h-full w-full object-contain"
          />
        ) : (
          // ảnh đơn đang render lần đầu: khung loading thay icon tạm
          <ThumbLoading />
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
 * 1 hội thoại: đơn mới · đã nhận (đang làm / chờ làm) · đã đóng gói chờ gửi · đã gửi · đã từ chối.
 * Đơn đã gửi / từ chối giữ hội thoại tới hết ngày (sang ngày mới thì mất)
 */
type Thread =
  | { kind: 'offer'; order: Order }
  | { kind: 'accepted'; order: Order; active: boolean }
  | { kind: 'packed'; order: Order; packed: PackedOrder }
  | { kind: 'shipped'; order: Order; packed: PackedOrder }
  | { kind: 'rejected'; order: Order; angry: boolean }

/** mục lọc danh sách hội thoại (`FilterMenu`): tên + loại hội thoại thuộc mục */
type Filter = 'all' | 'new' | 'doing' | 'done' | 'cancel'
const FILTERS: [Filter, string, Thread['kind'][]][] = [
  ['all', 'Tất cả', []],
  ['new', 'Mới', ['offer']],
  ['doing', 'Đang làm', ['accepted']],
  ['done', 'Xong', ['packed', 'shipped']],
  ['cancel', 'Huỷ', ['rejected']],
]
/** đơn đã nhận mà khách huỷ kèo (phát hiện shop bán đồ khách gửi) */
const dropped = (t: Thread) => t.kind === 'accepted' && !!t.order.cancel
const inFilter = (t: Thread, f: Filter) =>
  f === 'all' ||
  (dropped(t) ? f === 'cancel' : FILTERS.find((x) => x[0] === f)![2].includes(t.kind))

// tin nhắn qua lại của từng hành động (shop gửi → khách đáp)
const MSG = {
  accept: 'Ok shop nhận đơn này nhé 👌',
  accepted: (o: Order) => `Tuyệt, cảm ơn shop! Hẹn ngày ${o.dueDay ?? '?'} nhé 🙏`,
  decline: 'Xin lỗi bạn, đợt này shop kín lịch rồi, không nhận được 🙏',
  declined: (angry: boolean) =>
    angry ? 'Shop gì chảnh vậy, nhắn mãi không nhận 😒' : 'Tiếc quá, hẹn shop dịp khác nhé',
  done: 'Bàn phím của bạn xong rồi nè 📦',
  shipped: (pickup: boolean) =>
    pickup
      ? 'Phím của bạn đây, chúc bạn gõ vui nhé ⌨️'
      : 'Shop gửi hàng rồi nhé, để ý điện thoại nha 🚚',
  thanks: 'Đã nhận, cảm ơn shop nhiều! 🥰',
  sold: 'Shop đem đồ mình gửi lên chợ bán à? Huỷ kèo, khỏi làm nữa 😡',
}

/** Phong bì thư chưa mở (vàng, nắp gập, dấu sáp đỏ) dán chéo ở góc phải trên thẻ: đơn mới = tin khách chưa trả lời */
function Envelope() {
  return (
    <svg
      viewBox="0 0 30 22"
      aria-label="Đơn mới"
      className="pointer-events-none absolute -top-2 right-1 h-[22px] w-[30px] rotate-[10deg] drop-shadow-[0_2px_1px_rgba(0,0,0,0.4)]"
    >
      <rect x="0.5" y="0.5" width="29" height="21" rx="2.5" fill="#ffe08a" stroke="#d9a93a" />
      {/* nếp gấp 2 bên + nắp trên */}
      <path d="M1.5 20.5L12.5 12.5M28.5 20.5L17.5 12.5" stroke="#d9a93a" strokeLinecap="round" />
      <path d="M1 1.5L15 13L29 1.5" fill="#ffd04d" stroke="#d9a93a" strokeLinejoin="round" />
      {/* dấu sáp */}
      <circle cx="15" cy="12.6" r="3.8" fill="#d62828" />
      <circle cx="15" cy="12.6" r="2.3" fill="none" stroke="#ff8080" strokeWidth="0.7" />
      <circle cx="13.8" cy="11.3" r="0.8" fill="#fff" opacity="0.6" />
    </svg>
  )
}

/**
 * Ghim đỏ cắm vào góc phải trên thẻ (đơn đang làm), nhìn phối cảnh từ trên xuống: đế + đầu ghim là elip có độ dày,
 * viền sáng trắng, bóng đổ xuống trái; vẽ theo trục đứng rồi xoay chéo cho đầu chĩa lên phải
 */
function Pin() {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-label="Đang làm"
      className="pointer-events-none absolute -top-3.5 -right-2.5 size-9"
    >
      <g transform="rotate(40 20 22)">
        {/* bóng đổ */}
        <ellipse cx="14.5" cy="30.5" rx="12" ry="8.5" fill="#000" opacity="0.3" />
        {/* đế: cạnh dày + mặt trên + viền sáng mép dưới phải */}
        <path d="M8 28V30.5A12 8.5 0 0 0 32 30.5V28Z" fill="#9e0b0b" />
        <ellipse cx="20" cy="30.5" rx="12" ry="8.5" fill="#9e0b0b" />
        <ellipse cx="20" cy="28" rx="12" ry="8.5" fill="#d81b1b" />
        <path
          d="M16 36.3A12 8.5 0 0 0 31.6 30.5"
          fill="none"
          stroke="#fff"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        {/* thân */}
        <path d="M14 17V28A6 4.2 0 0 0 26 28V17Z" fill="#b10f12" />
        {/* đầu: cạnh dày + mặt trên + viền sáng */}
        <path d="M11 15V17.5A9 6.4 0 0 0 29 17.5V15Z" fill="#a50c0c" />
        <ellipse cx="20" cy="17.5" rx="9" ry="6.4" fill="#a50c0c" />
        <ellipse cx="20" cy="15" rx="9" ry="6.4" fill="#e52020" />
        <path
          d="M17 21.2A9 6.4 0 0 0 28.8 16.5"
          fill="none"
          stroke="#fff"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

/** Kẹp giấy bạc nằm ngang kẹp ở mép trên thẻ (đơn đã nhận, chờ tới lượt làm), không chiếm chỗ dòng chữ */
function Clip() {
  return (
    <svg
      viewBox="0 0 34 14"
      aria-label="Đã nhận"
      className="pointer-events-none absolute -top-1.5 right-0 h-3.5 w-[34px] rotate-[344deg] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
    >
      <path
        transform="translate(34 0) rotate(90)"
        d="M9.5 11V26.5a2.75 2.75 0 0 1-5.5 0V6.5a4 4 0 0 1 8 0V25"
        fill="none"
        stroke="#d5dbe4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** lỗ răng cưa quanh tem (tâm các vòng tròn khoét trên viền 26×30) */
const PERFS = [
  ...[1, 5, 9, 13, 17, 21, 25].flatMap((x) => [
    [x, 0],
    [x, 30],
  ]),
  ...[5, 10, 15, 20, 25].flatMap((y) => [
    [0, y],
    [26, y],
  ]),
]

/** Tem bưu kiện cam răng cưa có hình hộp, dán chéo ở góc phải trên thẻ (đơn đóng gói chờ gửi) */
function PostStamp() {
  const mask = useId()
  return (
    <svg
      viewBox="0 0 26 30"
      aria-label="Chờ gửi"
      className="pointer-events-none absolute -top-2 right-2 h-[30px] w-[26px] rotate-[8deg] drop-shadow-[0_2px_1px_rgba(0,0,0,0.4)]"
    >
      <defs>
        <mask id={mask}>
          <rect width="26" height="30" fill="#fff" />
          {PERFS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#000" />
          ))}
        </mask>
      </defs>
      <rect width="26" height="30" fill="var(--color-orange)" mask={`url(#${mask})`} />
      <rect
        x="3.5"
        y="3.5"
        width="19"
        height="23"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeDasharray="2 1.5"
      />
      {/* hình hộp (theo icon Package của lucide) */}
      <g
        transform="translate(6 8) scale(0.58)"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
        <path d="M12 22V12" />
        <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
      </g>
    </svg>
  )
}

/** Dấu mộc đóng nghiêng bên phải thẻ (đã giao / huỷ); `top` = ngang hàng tên để dòng tin dưới dùng hết bề ngang */
function Stamp({
  tone,
  top,
  title,
  children,
}: {
  tone: 'green' | 'red'
  top?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cn(
        'absolute right-2 -rotate-12 rounded-md border-2 px-1.5 font-head text-[11px] leading-[18px] font-extrabold tracking-wider',
        top ? 'top-1.5' : 'top-1/2 -translate-y-1/2',
        tone === 'green' ? 'border-green text-green' : 'border-red text-red',
      )}
    >
      {children}
    </span>
  )
}

/** hạn giao của đơn đã nhận: còn n ngày / hạn hôm nay / trễ n ngày + màu theo độ gấp */
function dueOf(order: Order, day: number): [string, string] {
  const left = (order.dueDay ?? day) - day
  if (left < 0) return [`trễ ${-left} ngày`, 'text-red']
  if (left === 0) return ['hạn hôm nay', 'text-orange']
  return [`còn ${left} ngày`, left === 1 ? 'text-orange' : 'text-muted']
}

/** Nút icon lọc ở đầu cột hội thoại: bấm mới đổ xuống danh sách trạng thái (kèm số), đang lọc thì icon vàng */
function FilterMenu({
  threads,
  value,
  onChange,
}: {
  threads: Thread[]
  value: Filter
  onChange: (f: Filter) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        title="Lọc hội thoại"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid size-8 place-items-center rounded-lg transition-colors',
          open || value !== 'all'
            ? 'bg-yellow text-[#3a2b00]'
            : 'bg-panel-2 text-ink/85 hover:bg-line',
        )}
      >
        <ListFilter className="size-4" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 z-30 mt-1 w-40 rounded-xl bg-[#1b2130] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          {FILTERS.map(([f, name]) => (
            <li key={f}>
              <button
                type="button"
                role="option"
                aria-selected={f === value}
                onClick={() => {
                  onChange(f)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-head text-sm font-extrabold transition-colors',
                  f === value ? 'bg-yellow/15 text-yellow' : 'text-ink/85 hover:bg-white/5',
                )}
              >
                <span className="flex-1">{name}</span>
                <span className="text-xs text-muted">
                  {threads.filter((t) => inFilter(t, f)).length}
                </span>
                <Check className={cn('size-4', f !== value && 'invisible')} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Dòng hội thoại ở cột trái: avatar, tên, trạng thái */
function ThreadRow({ t, active, onPick }: { t: Thread; active: boolean; onPick: () => void }) {
  const day = useGame((s) => s.day)
  // trạng thái = vật gắn lên thẻ (không chữ): mới = phong bì, đang làm = ghim, đã nhận = kẹp giấy + hạn,
  // chờ gửi = tem bưu kiện, đã giao / huỷ = dấu mộc
  const fresh = t.kind === 'offer'
  const cut = dropped(t) || t.kind === 'rejected'
  const pinned = t.kind === 'accepted' && t.active && !cut
  const clipped = t.kind === 'accepted' && !t.active && !cut
  const due = clipped ? dueOf(t.order, day) : null
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
        active ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset' : 'bg-panel-2 hover:bg-line',
        cut && 'opacity-60',
        t.kind === 'shipped' && 'opacity-80',
      )}
    >
      <CustomerAvatar
        avatar={t.order.avatar}
        customer={t.order.customer}
        className="size-10 ring-2 ring-white/15"
      />
      {/* chừa chỗ cho vật gắn ở góc phải */}
      <div
        className={cn(
          'min-w-0 flex-1',
          t.kind === 'packed' && 'pr-6',
          t.kind === 'shipped' && 'pr-16',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-1',
            cut && 'pr-10',
            fresh && 'pr-8',
            pinned && 'pr-5',
          )}
        >
          <span
            className={cn('truncate font-head text-sm font-extrabold', active && 'text-yellow')}
          >
            {t.order.customer}
          </span>
          {due && <span className={cn('shrink-0 text-xs font-bold', due[1])}>{due[0]}</span>}
        </div>
      </div>
      {fresh && <Envelope />}
      {pinned && <Pin />}
      {clipped && <Clip />}
      {t.kind === 'packed' && <PostStamp />}
      {t.kind === 'shipped' && <Stamp tone="green">ĐÃ GIAO</Stamp>}
      {cut && (
        <Stamp
          tone="red"
          top
          title={
            dropped(t)
              ? 'Khách huỷ kèo vì phát hiện bạn bán đồ của khách'
              : t.kind === 'rejected' && t.angry
                ? 'Từ chối quá số đơn miễn phí: −1 uy tín'
                : 'Đã từ chối'
          }
        >
          HUỶ
        </Stamp>
      )}
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
  const { acceptOrder, declineOrder, goBench, collectPay } = useGame.getState()
  const order = t.order
  const { caseId } = orderLook(order)
  // tin vừa gửi trong phiên (không lưu): nhận / từ chối / gửi hàng; xin địa chỉ, xem điểm
  const [sent, setSent] = useState<'accept' | 'decline' | null>(null)
  const [askedAddr, setAskedAddr] = useState(false)
  const [score, setScore] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  // cuộn xuống tin mới nhất khi đổi hội thoại / trạng thái đơn / có tin gửi; không theo object `t`
  // (dựng lại mỗi lần render, bấm xem ảnh đơn cũng làm khung chat bị cuộn)
  const threadKey = `${t.order.id}:${t.kind}`
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })
  }, [sent, askedAddr, score, threadKey])
  const packed = t.kind === 'packed' || t.kind === 'shipped' ? t.packed : null
  const shipped = t.kind === 'shipped'
  const { pickup, address } = delivery(order)
  const accepted = t.kind === 'accepted' || !!packed
  // hiện tin vừa gửi rồi mới đổi trạng thái đơn
  const act = (kind: NonNullable<typeof sent>, run: () => void) => {
    onReply()
    setSent(kind)
    setTimeout(run, REPLY_DELAY)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-black/15 p-1.5">
      {/* đầu hội thoại */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-2 text-[13px]">
        {/* cửa sổ hẹp (mobile): 1 cột, nút quay lại danh sách hội thoại */}
        <button
          type="button"
          aria-label="Quay lại danh sách hội thoại"
          onClick={onBack}
          className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/10 @xl:hidden"
        >
          <ChevronLeft className="size-5" />
        </button>
        <CustomerAvatar
          avatar={order.avatar}
          customer={order.customer}
          className="size-10 ring-2 ring-white/15"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-head text-base font-extrabold">{order.customer}</div>
          <Muted>
            {order.type === 'kit' ? 'Gửi kit' : 'Shop lo hết'} · {LAYOUTS[order.layout].name}
            {order.featured && ` · ${CASES[caseId].name}`}
          </Muted>
        </div>
      </div>

      {/* tin nhắn */}
      <div
        ref={body}
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl bg-black/15 px-3 py-3"
      >
        <ChatBubble from="in">
          <OrderImage order={order} className="h-[120px] w-[200px]" />
        </ChatBubble>
        {/* tin khách ngắn gọn (1–2 ý chính) + bảng tóm tắt yêu cầu cho dễ đọc */}
        {chatIntro(order).map((l, i) => (
          <ChatBubble key={i} from="in">
            <Highlight text={l} order={order} />
          </ChatBubble>
        ))}
        <ChatBubble from="in" wide>
          <OrderSpec order={order} compact />
        </ChatBubble>
        {accepted && <ChatBubble from="out">{MSG.accept}</ChatBubble>}
        {accepted && <ChatBubble from="in">{MSG.accepted(order)}</ChatBubble>}
        {t.kind === 'rejected' && <ChatBubble from="out">{MSG.decline}</ChatBubble>}
        {t.kind === 'rejected' && <ChatBubble from="in">{MSG.declined(t.angry)}</ChatBubble>}
        {dropped(t) && <ChatBubble from="in">{MSG.sold}</ChatBubble>}
        {packed && (
          <>
            <ChatBubble from="out">
              {/* chưa hiện sao: sao chỉ có khi khách nhận hàng và đánh giá */}
              {MSG.done}
            </ChatBubble>
            {pickup ? (
              <ChatBubble from="in">Ui nhanh vậy! Mình tự qua shop lấy nhé 🛵</ChatBubble>
            ) : (
              (askedAddr || shipped) && (
                <>
                  <ChatBubble from="out">Bạn cho shop xin địa chỉ giao hàng nhé?</ChatBubble>
                  <ChatBubble from="in">
                    Gửi giúp mình về <b className="text-yellow">{address}</b> nha shop 🙏
                  </ChatBubble>
                </>
              )
            )}
            {shipped && <ChatBubble from="out">{MSG.shipped(pickup)}</ChatBubble>}
            {shipped && <ChatBubble from="in">{MSG.thanks}</ChatBubble>}
            {/* khách đã chuyển thù lao: bấm "Thu tiền" mới vào ví */}
            {shipped && (
              <ChatBubble from="in">
                Mình chuyển khoản <b className="text-green">{payout(packed.result)}k</b> cho shop
                rồi nha 💸
              </ChatBubble>
            )}
            {shipped && packed.paid !== false && (
              <ChatBubble from="out">Shop nhận được rồi, cảm ơn bạn nhiều! 🙏</ChatBubble>
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
      <div className="flex h-16 shrink-0 items-center justify-end gap-2 px-1.5">
        {sent ? null : dropped(t) ? (
          <Button disabled className="flex items-center gap-2 [&_svg]:size-4">
            <Ban />
            Khách đã huỷ kèo đơn này
          </Button>
        ) : t.kind === 'rejected' ? (
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
            {packed && !shipped && !pickup && !askedAddr && (
              <Reply icon={<MapPin />} onClick={() => setAskedAddr(true)}>
                Xin địa chỉ giao hàng
              </Reply>
            )}
            {/* gửi hàng: cầm thùng đã đóng gói ra kệ giao hàng cạnh chậu cây (không bấm gửi ở đây nữa) */}
            {packed && !shipped && (pickup || askedAddr) && (
              <span className="flex items-center gap-1.5 px-1 text-sm text-muted">
                {pickup ? <Handshake className="size-4" /> : <Truck className="size-4" />}
                Cầm thùng ra kệ giao hàng cạnh chậu cây để{' '}
                {pickup ? 'khách qua lấy' : 'gửi cho khách'}
              </span>
            )}
            {shipped && packed?.paid === false && (
              <Reply tone="green" icon={<Coins />} onClick={() => collectPay(order.id)}>
                Thu tiền (+{payout(packed!.result)}k)
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

// Tin nhắn: mỗi đơn 1 hội thoại (đơn mới, đã nhận, chờ gửi, đã gửi, đã từ chối), lọc theo trạng thái; sang ngày mới thì đơn đã gửi / từ chối mất
export function Messenger() {
  const offers = useGame((s) => s.offers)
  const packed = useGame((s) => s.packed)
  const order = useGame((s) => s.order)
  const jobs = useGame((s) => s.jobs)
  const rejected = useGame((s) => s.rejected)
  const day = useGame((s) => s.day)
  const unsent = packed.filter((p) => !p.shipped)
  const isPacked = (o: Order) => unsent.some((p) => p.order.id === o.id)
  // đơn đã gửi vẫn giữ hội thoại tới hết ngày (`packed` còn `shipped` tới `nextDay`)
  const threads: Thread[] = [
    ...unsent.map((p) => ({ kind: 'packed' as const, order: p.order, packed: p })),
    ...offers.map((o) => ({ kind: 'offer' as const, order: o })),
    ...(order && !isPacked(order) ? [{ kind: 'accepted' as const, order, active: true }] : []),
    ...jobs.map((j) => ({ kind: 'accepted' as const, order: j.order, active: false })),
    ...packed
      .filter((p) => p.shipped)
      .map((p) => ({ kind: 'shipped' as const, order: p.order, packed: p })),
    ...rejected.map((o, i) => ({ kind: 'rejected' as const, order: o, angry: i >= DECLINE_FREE })),
  ]
  const [filter, setFilter] = useState<Filter>('all')
  const shown = threads.filter((t) => inFilter(t, filter))
  // hội thoại đang mở lưu ở store: đóng gói đơn xong thì bàn build mở thẳng hội thoại đơn đó
  const pick = useGame((s) => s.messengerPick)
  const setPick = useGame((s) => s.setMessengerPick)
  // cửa sổ hẹp: chỉ hiện 1 cột — danh sách hoặc khung chat (vừa được mở thẳng 1 hội thoại thì vào khung chat luôn)
  const [chatOpen, setChatOpen] = useState(() => !!pick)
  // hội thoại đang mở (giữ nguyên dù đổi trạng thái ra khỏi tab đang lọc); chưa chọn thì lấy đầu tab
  const current = threads.find((t) => t.order.id === pick) ?? shown[0]

  return (
    <div className="flex h-[min(620px,72vh)] gap-3 group-data-fill/win:h-full">
      {/* danh sách hội thoại */}
      <div
        className={cn(
          'flex w-[260px] shrink-0 flex-col rounded-2xl bg-black/15 p-1.5 @max-xl:w-full',
          chatOpen && '@max-xl:hidden',
        )}
      >
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1.5 font-head text-xl font-extrabold text-yellow">
            <CalendarDays className="size-5" />
            Ngày {day}
          </div>
          <FilterMenu threads={threads} value={filter} onChange={setFilter} />
        </div>
        {/* gap-2 + pt-3: chừa chỗ phong bì / ghim nhô lên trên mép thẻ; pr-2.5: ghim lòi ra phải 10px
            (không chừa thì overflow-y-auto tự bật cuộn ngang), overflow-x-hidden chặn hẳn */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto pt-3 pr-2.5">
          {shown.map((t) => (
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
          {!threads.length ? (
            <Muted className="px-2 py-3">
              Hết tin nhắn mới: đứng dậy ra lịch trên tường bấm Kết thúc ngày để nhận đơn mới nhé.
            </Muted>
          ) : (
            !shown.length && <Muted className="px-2 py-3">Không có hội thoại nào ở mục này.</Muted>
          )}
        </div>
        {/* kết thúc ngày chỉ còn ở lịch treo tường trong phòng: nút đứng dậy đi ra đó;
            cao h-16 bằng thanh trả lời bên khung chat */}
        <div className="flex h-16 shrink-0 items-center px-1">
          <Button
            tone="green"
            className="flex w-full items-center justify-center gap-2 [&_svg]:size-4"
            title="Kết thúc ngày ở lịch treo tường"
            onClick={() => useGame.getState().standUp('pc')}
          >
            <Footprints />
            Đứng dậy ra lịch
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
