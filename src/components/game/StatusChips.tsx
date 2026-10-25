import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, Star, UserRound, Wallet } from 'lucide-react'
import { useGame } from '@/store'
import { TOOLS } from '@/data/parts'
import { CERT_BONUS, REP_RULES, REP_TIERS, certBonus, repTier } from '@/data/reputation'
import { cn, fmt } from '@/lib/format'
import { Button, Chip, Tooltip } from '@/components/ui'

type Side = 'top' | 'bottom'

/**
 * Chip mở bảng thông tin khi rê chuột (rời chuột 200ms thì đóng, di vào bảng vẫn giữ); bấm để ghim / bỏ ghim
 * (màn hình cảm ứng), bấm ra ngoài / Esc để đóng. `side`: bảng mở lên trên hay xuống dưới
 */
function InfoChip({
  chip,
  tip,
  side,
  children,
}: {
  chip: ReactNode
  tip: string
  side: Side
  children: ReactNode
}) {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hover || pinned
  const ref = useRef<HTMLDivElement>(null)
  const leave = useRef<ReturnType<typeof setTimeout>>(undefined)
  const enter = () => {
    clearTimeout(leave.current)
    setHover(true)
  }
  const exit = () => {
    clearTimeout(leave.current)
    leave.current = setTimeout(() => setHover(false), 200)
  }
  useEffect(() => () => clearTimeout(leave.current), [])
  useEffect(() => {
    if (!open) return
    const close = () => {
      setPinned(false)
      setHover(false)
    }
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={exit}>
      <button
        type="button"
        aria-label={tip}
        aria-expanded={open}
        className="cursor-pointer"
        onClick={() => setPinned(!pinned)}
      >
        {chip}
      </button>
      {open && (
        <div
          className={cn(
            'absolute right-0 z-[300] w-[320px] animate-pop rounded-xl border-[3px] border-black/40 bg-panel p-3 text-left text-sm shadow-[0_12px_32px_rgba(0,0,0,0.55)]',
            side === 'top' ? 'bottom-full mb-2.5' : 'top-full mt-2.5',
            // mobile: bảng nổi giữa màn, sát trên taskbar / dưới thanh menu
            'max-md:fixed max-md:inset-x-2 max-md:max-h-[70vh] max-md:w-auto max-md:overflow-y-auto',
            side === 'top' ? 'max-md:bottom-[calc(var(--taskbar-h)+8px)]' : 'max-md:top-16',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** dòng nhãn mờ + giá trị đậm trong bảng */
const Row = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-muted">{k}</span>
    <b className="text-right">{v}</b>
  </div>
)

/** Bảng uy tín: bậc hiện tại, ảnh hưởng tới số đơn / tiền công, cách uy tín lên xuống */
function RepInfo({ rep }: { rep: number }) {
  const { tier, next } = repTier(rep)
  const { openApp, goPC } = useGame.getState()
  return (
    <div className="flex flex-col gap-2">
      <div className="font-head text-base font-extrabold">
        <span className="text-yellow">★ {rep}</span> · {tier.name}
      </div>
      {next && (
        <div className="text-xs text-muted">
          Còn <b className="text-ink">{next.min - rep}</b> uy tín để lên{' '}
          <b className="text-ink">{next.name}</b>
        </div>
      )}
      <div className="rounded-lg bg-panel-2 px-2.5 py-1.5">
        <Row k="Đơn mới mỗi ngày" v={`${tier.offers[0]}–${tier.offers[1]} đơn`} />
        <Row
          k="Tiền công khách trả"
          v={
            <span className={tier.pay > 1 ? 'text-green' : tier.pay < 1 ? 'text-red' : ''}>
              ×{tier.pay} ({tier.pay >= 1 ? '+' : '−'}
              {Math.round(Math.abs(tier.pay - 1) * 100)}%)
            </span>
          }
        />
      </div>
      {/* các bậc uy tín: bậc đang đứng tô vàng */}
      <div className="flex flex-col gap-0.5 text-xs">
        {[...REP_TIERS].reverse().map((t) => (
          <div
            key={t.name}
            className={cn(
              'flex justify-between rounded-md px-2 py-0.5',
              t === tier ? 'bg-yellow/15 font-extrabold text-yellow' : 'text-muted',
            )}
          >
            <span>
              {t.name} {Number.isFinite(t.min) ? `(≥ ${t.min})` : '(< −5)'}
            </span>
            <span>
              {t.offers[0]}–{t.offers[1]} đơn · ×{t.pay}
            </span>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-0.5 text-xs font-extrabold tracking-wide text-muted uppercase">
          Uy tín thay đổi khi
        </div>
        {REP_RULES.map(([k, v]) => (
          <div key={k} className="text-xs leading-snug">
            <b>{k}</b>: <span className="text-muted">{v}</span>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        tone="yellow"
        onClick={() => {
          goPC()
          openApp('reviews')
        }}
      >
        Xem đánh giá khách
      </Button>
    </div>
  )
}

/** Bảng ví tiền: thu nhập cơ bản từ chứng chỉ thợ (cộng ngay khi nhận đơn) */
function MoneyInfo({ money, cert }: { money: number; cert: number }) {
  const bonus = certBonus(cert)
  return (
    <div className="flex flex-col gap-2">
      <div className="font-head text-base font-extrabold">
        Ví: <span className="text-green">{fmt(money)}</span>
      </div>
      <div className="rounded-lg bg-panel-2 px-2.5 py-1.5">
        <Row k="Bậc thợ" v={TOOLS.cert[cert]?.name ?? 'Thợ lõ'} />
        <Row
          k="Thu nhập cơ bản / đơn nhận"
          v={<span className={bonus ? 'text-green' : 'text-muted'}>+{fmt(bonus)}</span>}
        />
      </div>
      <div className="text-xs leading-snug text-muted">
        Có chứng chỉ thợ thì mỗi lần <b className="text-ink">nhận đơn</b> được cộng ngay thu nhập cơ
        bản vào ví:{' '}
        {CERT_BONUS.slice(1).map((b, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <b className="text-ink">{TOOLS.cert[i + 1].name.replace('Chứng chỉ thợ ', '')}</b> +
            {fmt(b)}
          </span>
        ))}
        . Mua ở Shopii → Chứng chỉ thợ.
      </div>
      <div className="text-xs leading-snug text-muted">
        Tiền linh kiện shop ứng trước, giao hàng khách hoàn lại (tối đa bằng budget) + trả tiền công
        theo điểm.
      </div>
    </div>
  )
}

/**
 * Tên thợ, tiền, uy tín, ngày: icon lucide + chữ, rê chuột hiện tooltip; tiền / uy tín rê chuột hiện luôn bảng giải thích.
 * `tipSide`: taskbar sát đáy màn hình thì tooltip + bảng mở lên trên
 */
export function StatusChips({ tipSide = 'bottom' }: { tipSide?: Side }) {
  const money = useGame((s) => s.money)
  const rep = useGame((s) => s.rep)
  const day = useGame((s) => s.day)
  const name = useGame((s) => s.name)
  const cert = useGame((s) => s.tools.cert ?? 0)
  return (
    <div className="flex gap-1.5 [&_svg]:size-4 [&_svg]:shrink-0">
      {/* mobile: bỏ chip tên cho đủ chỗ */}
      {name && (
        <span className="max-md:hidden">
          <Tooltip content="Tên thợ build" side={tipSide}>
            <Chip tone="name">
              <UserRound />
              {name}
            </Chip>
          </Tooltip>
        </span>
      )}
      <InfoChip
        tip="Ví tiền"
        side={tipSide}
        chip={
          <Chip tone="money">
            <Wallet className="text-[#9ff0b8]" />
            {fmt(money)}
          </Chip>
        }
      >
        <MoneyInfo money={money} cert={cert} />
      </InfoChip>
      <InfoChip
        tip="Uy tín"
        side={tipSide}
        chip={
          <Chip tone="rep">
            <Star className="fill-yellow text-yellow" />
            {rep}
          </Chip>
        }
      >
        <RepInfo rep={rep} />
      </InfoChip>
      <Tooltip content="Ngày hiện tại" side={tipSide}>
        <Chip tone="day">
          <CalendarDays className="text-[#9cc2ff]" />
          Ngày {day}
        </Chip>
      </Tooltip>
    </div>
  )
}
