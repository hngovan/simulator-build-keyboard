import { useState, type ReactNode } from 'react'
import { ChevronDown, Clock } from 'lucide-react'
import { useGame } from '@/store'
import { CATS, SCREW_FULL, checkInventory } from '@/data/parts'
import { buildContext, buildPercent } from '@/data/steps'
import { LAYOUTS } from '@/data/layouts'
import { Badge, ProgressBar, StepDot, progressTone } from '@/components/ui'
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

const KIND_TEXT = { active: 'Đang làm', job: 'Đã nhận' } as const
const KIND_TONE = { active: 'green', job: 'blue' } as const

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
 * Card 1 đơn: thông tin, % tiến độ, linh kiện còn thiếu, nút hành động (`action`);
 * bấm vào card để mở `detail` bên dưới, bấm lần nữa để đóng
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
  const late = order.dueDay !== undefined && day > order.dueDay
  const pct = useProgress(c)
  return (
    <div
      // viền vẽ bên trong card (border) cho khỏi bị khung cuộn cắt; đơn đang làm nền + viền xanh
      className={cn(
        'rounded-xl border-2 px-3 py-2',
        kind === 'active' ? 'border-green/70 bg-green/15' : 'border-transparent bg-panel-2',
      )}
    >
      {/* bấm phần đầu card để mở / đóng chi tiết */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        title={open ? 'Thu gọn chi tiết đơn' : 'Xem chi tiết đơn'}
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(!open)}
      >
        <CustomerAvatar avatar={order.avatar} customer={order.customer} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 font-extrabold">
            {order.customer}
            <Badge solid tone={KIND_TONE[kind]}>
              {KIND_TEXT[kind]}
            </Badge>
            <TimeBadge order={order} day={day} />
            {order.type === 'kit' && (
              <Badge solid tone="orange" className="ml-0">
                Kit khách gửi
              </Badge>
            )}
          </div>
          {/* nhãn mờ + giá trị đậm cho dễ quét mắt */}
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>
              Layout <b className="text-ink">{LAYOUTS[order.layout].name}</b>
            </span>
            <span>
              Công <b className="text-green">{fmt(order.labor)}</b>
            </span>
            <span>
              Budget <b className="text-ink">{fmt(order.budget)}</b>
            </span>
            {order.dueDay !== undefined && (
              <span>
                Hạn <b className={late ? 'text-red' : 'text-ink'}>ngày {order.dueDay}</b>
              </span>
            )}
          </div>
          <div className="text-xs">
            {session?.build ? (
              pct >= 1 ? (
                <span className="inline-flex items-center gap-1.5 text-green">
                  <StepDot state="done">✓</StepDot> Đã build xong
                </span>
              ) : (
                <span className="text-muted">
                  Đã build <b className="text-ink">{Math.round(pct * 100)}%</b>
                </span>
              )
            ) : missing && !missing.length ? (
              <b className="text-green">Đủ linh kiện, vào build ngay</b>
            ) : missing ? (
              <span className="text-muted">
                Thiếu: <b className="text-yellow">{missing.map((m) => CATS[m.cat]).join(', ')}</b>
              </span>
            ) : (
              <span className="text-muted">Nhận đơn rồi mua linh kiện còn thiếu</span>
            )}
          </div>
        </div>
        {/* bấm nút hành động không mở / đóng card */}
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {action}
          <ChevronDown
            className={cn('size-5 text-muted transition-transform', open && 'rotate-180')}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
      {session?.build && pct < 1 && (
        <ProgressBar value={pct} tone={progressTone(pct)} className="mt-2" />
      )}
      {open && <div className="mt-2">{detail}</div>}
    </div>
  )
}
