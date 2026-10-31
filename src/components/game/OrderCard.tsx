import { useState, type ReactNode } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { useGame } from '@/store'
import { LAYOUTS } from '@/data/layouts'
import { MOUNTS, SWITCH_KINDS, checkInventory } from '@/data/parts'
import { Badge } from '@/components/ui'
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

/** Badge thời gian: đơn mới = số ngày làm; đã nhận = còn bao nhiêu ngày tới hạn / trễ */
export function TimeBadge({ order, day }: { order: Order; day: number }) {
  const left = order.dueDay === undefined ? null : order.dueDay - day
  const [text, tone] =
    left === null
      ? [`${order.days} ngày`, 'blue' as const]
      : left < 0
        ? [`Trễ ${-left} ngày`, 'red' as const]
        : left === 0
          ? ['Hạn hôm nay', 'yellow' as const]
          : [`Còn ${left} ngày`, left === 1 ? ('yellow' as const) : ('green' as const)]
  return (
    <Badge solid tone={tone} className="ml-0 shrink-0">
      <Clock className="size-3" strokeWidth={3} />
      {text}
    </Badge>
  )
}

/** Danh sách đơn dùng chung: đơn đang làm → đơn đã nhận (gấp trước) */
export function useOrderEntries(): OrderEntry[] {
  const s = useGame()
  return [
    ...(s.order && !s.result ? [{ order: s.order, kind: 'active' as const, session: s }] : []),
    ...[...s.jobs]
      .sort((a, b) => (a.order.dueDay ?? 0) - (b.order.dueDay ?? 0))
      .map((j) => ({ order: j.order, kind: 'job' as const, session: j.session })),
  ]
}

/** đếm món linh kiện đã đạt / tổng số ô đối chiếu của đơn */
export function partCount(c: OrderEntry) {
  if (!c.session) return { ok: 0, all: 0 }
  const placed = c.session.build ? Object.keys(c.session.build.switches).length : 0
  const checks = checkInventory(c.session.inventory, c.order, placed)
  return { ok: checks.filter((x) => x.ok).length, all: checks.length }
}

/** thanh tiến độ mảnh (xanh khi đủ, vàng khi thiếu) */
export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-black/35', className)}>
      <div
        className={cn('h-full rounded-full', value >= 1 ? 'bg-green' : 'bg-green/80')}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

/**
 * Thẻ 1 đơn (đơn đang làm viền vàng). Đóng: avatar, tên + hạn, thanh "Linh kiện x/y", tiền công, nút hành động (`action`).
 * Mở: dòng phụ layout · mount · loại switch, tiền công to, phần thân `detail` (linh kiện, yêu cầu, ngân sách, nút)
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
  const active = kind === 'active'
  const cancelled = order.cancel === 'sold'
  const parts = partCount(c)
  const mount = session?.mount ?? order.mount
  const sub = [
    `Bàn phím ${LAYOUTS[order.layout].name}`,
    mount && MOUNTS[mount] && MOUNTS[mount].name,
    order.switchKind && SWITCH_KINDS[order.switchKind],
  ]
    .filter(Boolean)
    .join(' · ')
  const toggle = () => setOpen(!open)
  return (
    <div
      className={cn(
        'rounded-2xl',
        active ? 'bg-[#2c2a1c] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
        cancelled && 'opacity-70',
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        title={open ? 'Thu gọn đơn' : 'Xem chi tiết đơn'}
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
        onClick={toggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
      >
        <CustomerAvatar
          avatar={order.avatar}
          customer={order.customer}
          className="size-11 ring-2 ring-white/15"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn('truncate font-head text-lg font-extrabold', active && 'text-yellow')}
            >
              {order.customer}
            </span>
            <TimeBadge order={order} day={day} />
          </div>
          {cancelled ? (
            <span className="truncate text-xs font-bold text-red">
              Khách huỷ kèo vì phát hiện bạn bán đồ của khách
            </span>
          ) : open ? (
            <span className="truncate text-xs font-bold text-muted">{sub}</span>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              <Bar value={parts.all ? parts.ok / parts.all : 0} className="w-16" />
              Linh kiện {parts.ok}/{parts.all}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="font-head text-xl font-extrabold text-green">{fmt(order.labor)}</span>
          {open && <span className="mt-1 text-[11px] font-bold text-muted">tiền công</span>}
        </div>
        {/* bấm nút hành động không mở / đóng thẻ */}
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!open && !cancelled && action}
          <button
            type="button"
            aria-label={open ? 'Thu gọn' : 'Mở chi tiết'}
            onClick={toggle}
            className="grid size-8 place-items-center rounded-lg bg-black/25 text-muted hover:text-ink"
          >
            <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>
      {open && <div className="px-3 pb-3">{detail}</div>}
    </div>
  )
}
