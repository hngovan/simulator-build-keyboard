import { useState, type ReactNode } from 'react'
import { ChevronDown, CircleAlert, ClipboardList, Clock } from 'lucide-react'
import { useGame } from '@/store'
import { SCREW_FULL, checkInventory, partSpent } from '@/data/parts'
import { buildContext, buildPercent } from '@/data/steps'
import { Badge, ProgressBar, progressTone } from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import type { Order } from '@/types'
import type { JobSession } from '@/store/persistence'
import { CustomerAvatar } from './CustomerAvatar'

/** 1 đơn trong danh sách đơn: đang làm / đã nhận (đơn mới chỉ nhận ở Mezzenger, không hiện ở đây) */
export interface OrderEntry {
  order: Order
  kind: 'active' | 'job'
  /** kho đồ + build của đơn */
  session?: Pick<JobSession, 'inventory' | 'build' | 'mount' | 'provided' | 'spent'>
}

/**
 * Tiền dư linh kiện của đơn = budget khách trả − tiền đã mua linh kiện (`partSpent`, như "Đã chi" ở Chi tiết đơn).
 * Chỉ biết khi đã đủ linh kiện (hoặc đã vào build); âm = mua lố budget, shop chịu
 */
function leftover(c: OrderEntry, missing: { ok: boolean }[] | null) {
  if (c.order.cancel || !c.session || (!c.session.build && (!missing || missing.length)))
    return null
  return c.order.budget - partSpent(c.session.inventory, c.order, c.session.spent)
}

/** Badge thời gian: đơn mới = số ngày làm; đã nhận = còn bao nhiêu ngày tới hạn / trễ */
function TimeBadge({ order, day }: { order: Order; day: number }) {
  const left = order.dueDay === undefined ? null : order.dueDay - day
  const [text, tone] =
    left === null
      ? [`${order.days} ngày`, 'blue' as const]
      : left < 0
        ? [`trễ ${-left} ngày`, 'red' as const]
        : left === 0
          ? ['hạn hôm nay', 'yellow' as const]
          : [`còn ${left} ngày`, left === 1 ? ('yellow' as const) : ('green' as const)]
  return (
    <Badge solid tone={tone} className="ml-0">
      <Clock className="size-3" strokeWidth={3} />
      {text}
    </Badge>
  )
}

/** Danh sách đơn dùng chung (bàn build + app Danh sách đơn): đơn đang làm → đơn đã nhận (gấp trước) */
export function useOrderEntries(): OrderEntry[] {
  const s = useGame()
  return [
    ...(s.order && !s.result ? [{ order: s.order, kind: 'active' as const, session: s }] : []),
    ...[...s.jobs]
      .sort((a, b) => (a.order.dueDay ?? 0) - (b.order.dueDay ?? 0))
      .map((j) => ({ order: j.order, kind: 'job' as const, session: j.session })),
  ]
}

/** % tiến độ build của 1 đơn (chưa vào bàn build = 0) */
function useProgress(c: OrderEntry) {
  const clicks = SCREW_FULL
  const ctxNow = useGame((s) => s.ctx)
  const b = c.session?.build
  if (!b) return 0
  const ctx =
    c.kind === 'active'
      ? ctxNow
      : c.session?.mount && buildContext(c.order, c.session.inventory, c.session.mount)
  return ctx ? buildPercent(b, ctx, clicks) : 0
}

/**
 * Khung danh sách đơn cùng kiểu bảng xếp hạng: đầu (icon + tiêu đề + dòng phụ + ⓘ) → khung nền tối có hàng tiêu đề cột
 * → các dòng đơn (`OrderCard`). Dùng ở bàn build (`OrderPicker`) + app Danh sách đơn
 */
export function OrderListFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <ClipboardList className="size-9" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-2xl leading-tight font-extrabold text-yellow">
            Danh sách đơn
          </div>
          <div className="truncate text-sm text-muted">Đơn đang làm và đơn đã nhận</div>
        </div>
        <span
          className="shrink-0 self-start text-muted hover:text-ink"
          title="Bấm vào đơn để xem chi tiết · ở bàn build bấm phím M để mở / đóng"
        >
          <CircleAlert className="size-5" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-black/15 p-1.5">
        <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
          <div className="flex-1">Khách</div>
          <div title="Tiền công + tiền dư linh kiện (budget − đã chi, hiện khi đủ linh kiện)">
            Tiền công + dư
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/**
 * Dòng 1 đơn (kiểu dòng bảng xếp hạng): avatar, tên + hạn, tiến độ / linh kiện thiếu, tiền công bên phải, nút hành động
 * (`action`); đơn đang làm viền vàng. Bấm vào dòng để mở `detail` bên dưới, bấm lần nữa để đóng
 */
export function OrderCard({
  c,
  action,
  detail,
  defaultOpen = false,
}: {
  c: OrderEntry
  action: ReactNode
  detail: ReactNode
  defaultOpen?: boolean
}) {
  const day = useGame((s) => s.day)
  const [open, setOpen] = useState(defaultOpen)
  const { order, kind, session } = c
  const missing = session ? checkInventory(session.inventory, order).filter((x) => !x.ok) : null
  const pct = useProgress(c)
  const active = kind === 'active'
  const left = leftover(c, missing)
  // đủ linh kiện: đã vào build (startBuild đã kiểm kho) hoặc kho đơn không thiếu món nào
  const ready = !!session?.build || (!!missing && !missing.length)
  const cancelled = order.cancel === 'sold'
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2',
        active ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
        cancelled && 'opacity-70',
      )}
    >
      {/* bấm phần đầu dòng để mở / đóng chi tiết */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        title={open ? 'Thu gọn chi tiết đơn' : 'Xem chi tiết đơn'}
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(!open)}
      >
        <CustomerAvatar
          avatar={order.avatar}
          customer={order.customer}
          className="size-11 ring-2 ring-white/15"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn('truncate font-head text-base font-extrabold', active && 'text-yellow')}
            >
              {order.customer}
            </span>
            <TimeBadge order={order} day={day} />
          </div>
          {/* trạng thái: đủ / không đủ linh kiện; khách huỷ kèo vì bị bán đồ thì báo đỏ */}
          <div className="truncate text-xs font-bold">
            {cancelled ? (
              <span className="text-red">Khách huỷ kèo vì phát hiện bạn bán đồ của khách</span>
            ) : ready ? (
              <span className="text-green">Đủ linh kiện</span>
            ) : (
              <span className="text-yellow">Không đủ linh kiện</span>
            )}
          </div>
        </div>
        {/* tiền công + tiền dư linh kiện (đủ linh kiện mới biết), lố budget thì trừ đỏ */}
        <div
          className="flex items-baseline gap-1 font-head text-xl font-extrabold whitespace-nowrap"
          title={
            left === null
              ? 'Tiền công (đủ linh kiện mới tính được tiền dư)'
              : `Tiền công ${fmt(order.labor)} + dư linh kiện ${fmt(left)}`
          }
        >
          <span className="text-green">{fmt(order.labor)}</span>
          {left !== null && (
            <>
              <span className="text-muted">{left < 0 ? '−' : '+'}</span>
              <span className={left < 0 ? 'text-red' : 'text-green'}>{fmt(Math.abs(left))}</span>
            </>
          )}
        </div>
        {/* bấm nút hành động không mở / đóng dòng */}
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* đơn khách đã huỷ kèo: không làm tiếp được */}
          {!cancelled && action}
          <ChevronDown
            className={cn('size-5 text-muted transition-transform', open && 'rotate-180')}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
      {session?.build && pct < 1 && !cancelled && (
        <ProgressBar value={pct} tone={progressTone(pct)} className="mt-2" />
      )}
      {open && <div className="mt-2">{detail}</div>}
    </div>
  )
}
