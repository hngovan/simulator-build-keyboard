import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useGame } from '@/store'
import { CATS, TOOLS, checkInventory } from '@/data/parts'
import { buildContext, buildPercent } from '@/data/steps'
import { LAYOUTS } from '@/data/layouts'
import { Badge, ProgressBar, StepDot, progressTone } from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import type { Order } from '@/types'
import type { JobSession } from '@/store/persistence'
import { CustomerAvatar } from './CustomerAvatar'

/** 1 đơn trong danh sách đơn: đang làm / đã nhận / đơn mới */
export interface OrderEntry {
  order: Order
  kind: 'active' | 'job' | 'offer'
  /** kho đồ + build của đơn (đơn mới: chưa có) */
  session?: Pick<JobSession, 'inventory' | 'build' | 'mount' | 'provided' | 'spent'>
}

const KIND_TEXT = { active: 'Đang làm', job: 'Đã nhận', offer: 'Đơn mới' } as const
const KIND_TONE = { active: 'green', job: 'blue', offer: 'yellow' } as const

/** Danh sách đơn dùng chung (bàn build + app Danh sách đơn): đơn đang làm → đơn đã nhận (gấp trước) → đơn mới */
export function useOrderEntries(): OrderEntry[] {
  const s = useGame()
  return [
    ...(s.order && !s.result ? [{ order: s.order, kind: 'active' as const, session: s }] : []),
    ...[...s.jobs]
      .sort((a, b) => (a.order.dueDay ?? 0) - (b.order.dueDay ?? 0))
      .map((j) => ({ order: j.order, kind: 'job' as const, session: j.session })),
    ...s.offers.map((o) => ({ order: o, kind: 'offer' as const })),
  ]
}

/** % tiến độ build của 1 đơn (chưa vào bàn build = 0) */
function useProgress(c: OrderEntry) {
  const clicks = useGame((s) => TOOLS.screw[s.tools.screw].clicks!)
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
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(!open)}
      >
        <CustomerAvatar avatar={order.avatar} customer={order.customer} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 font-extrabold">
            {order.customer}
            <Badge tone={KIND_TONE[kind]}>{KIND_TEXT[kind]}</Badge>
            {order.type === 'kit' && <Badge className="ml-0">Kit khách gửi</Badge>}
          </div>
          <div className="text-xs text-muted">
            {LAYOUTS[order.layout].name} · tiền công {fmt(order.labor)} ·{' '}
            {order.dueDay !== undefined ? (
              <span className={late ? 'text-red' : ''}>hạn ngày {order.dueDay}</span>
            ) : (
              `làm trong ${order.days} ngày`
            )}
          </div>
          <div className="text-xs">
            {session?.build ? (
              pct >= 1 ? (
                <span className="inline-flex items-center gap-1.5 text-green">
                  <StepDot state="done">✓</StepDot> Đã build xong
                </span>
              ) : (
                <span className="text-muted">Đã build {Math.round(pct * 100)}%</span>
              )
            ) : missing && !missing.length ? (
              <span className="text-green">Đủ linh kiện, vào build ngay</span>
            ) : missing ? (
              <span className="text-yellow">
                Thiếu: {missing.map((m) => CATS[m.cat]).join(', ')}
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
