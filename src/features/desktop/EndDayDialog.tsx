import type { ReactNode } from 'react'
import { useGame } from '@/store'
import { CANCEL_AFTER, NO_WORK_FINE } from '@/store/shopSlice'
import { shipRep } from '@/data/reviews'
import { Alert, Button, HudCard, KeyValueTable } from '@/components/ui'
import { cn, fmt, fmtMoney } from '@/lib/format'

/** số có dấu +/− tô xanh / đỏ */
function Delta({ n, text }: { n: number; text: string }) {
  return (
    <span className={cn(n > 0 ? 'text-green' : n < 0 ? 'text-red' : 'text-muted')}>
      {n > 0 ? '+' : ''}
      {text}
    </span>
  )
}

/**
 * Popup tổng kết ngày (bấm icon "Kết thúc ngày" ở desktop): tiền / uy tín so đầu ngày, đơn nhận / từ chối / xong,
 * cảnh báo những gì sẽ xảy ra khi qua ngày (`nextDay`): gửi nốt đơn chờ, đền đơn nhận mà không làm, khách huỷ đơn trễ
 */
export function EndDayDialog({ onClose }: { onClose: () => void }) {
  const s = useGame()
  const start = s.dayStart ?? { money: s.money, rep: s.rep }
  const unsent = s.packed.filter((p) => !p.shipped)
  const income = unsent.reduce((a, p) => a + p.result.reimburse + p.result.labor, 0)
  const repGain = unsent.reduce((a, p) => a + shipRep(p.result), 0)
  // giống nextDay: đơn đang chờ trễ quá CANCEL_AFTER ngày thì khách huỷ, đơn nhận mà cả ngày không làm thì đền tiền
  const cancelled = s.jobs.filter((j) => s.day + 1 - (j.order.dueDay ?? s.day + 1) > CANCEL_AFTER)
  const doing = [...(s.order && !s.result ? [s.order] : []), ...s.jobs.map((j) => j.order)]
  const idle = doing
    .filter((o) => !s.worked.includes(o.id))
    .filter((o) => !cancelled.some((j) => j.order.id === o.id))
  const fine = idle.reduce((a, o) => a + Math.round((o.labor * NO_WORK_FINE) / 10) * 10, 0)
  const blocked = !s.acceptedToday && !s.worked.length && !s.packed.length && s.offers.length > 0

  const rows: [string, ReactNode][] = [
    [
      'Tiền',
      <>
        {fmtMoney(s.money)} (
        <Delta n={s.money - start.money} text={fmtMoney(s.money - start.money)} />)
      </>,
    ],
    [
      'Uy tín',
      <>
        {s.rep} (<Delta n={s.rep - start.rep} text={String(s.rep - start.rep)} />)
      </>,
    ],
    ['Đơn nhận', `${s.acceptedToday} đơn`],
    ['Đơn từ chối', `${s.rejected.length} đơn`],
    ['Đơn xong', `${s.packed.length - unsent.length} đã gửi · ${unsent.length} chờ gửi`],
    ['Đang làm dở', `${doing.length} đơn`],
    ['Đơn mới chưa trả lời', `${s.offers.length} đơn`],
  ]

  return (
    <div className="fixed inset-0 z-[3000] grid animate-fade-in place-items-center bg-black/70 p-4">
      <HudCard className="flex w-[min(440px,100%)] flex-col gap-3">
        <h3 className="font-head text-2xl font-extrabold text-yellow">🌙 Tổng kết ngày {s.day}</h3>
        <KeyValueTable rows={rows} />
        {blocked && (
          <Alert title="Chưa qua ngày được">
            Phải nhận làm ít nhất 1 đơn trong ngày mới qua ngày mới được.
          </Alert>
        )}
        {!blocked && (unsent.length > 0 || fine > 0 || cancelled.length > 0) && (
          <Alert title="Khi kết thúc ngày">
            <ul className="list-disc pl-5">
              {unsent.length > 0 && (
                <li>
                  Tự gửi {unsent.length} đơn chờ gửi: +{fmt(income)}
                  {repGain ? `, uy tín ${repGain > 0 ? '+' : ''}${repGain}` : ''}
                </li>
              )}
              {fine > 0 && (
                <li>
                  {idle.length} đơn đã nhận mà chưa làm: đền khách {fmt(fine)}
                </li>
              )}
              {cancelled.length > 0 && (
                <li>
                  {cancelled.length} đơn trễ hạn quá lâu bị huỷ: −{cancelled.length * 3} uy tín
                </li>
              )}
            </ul>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onClose}>
            Tiếp tục làm
          </Button>
          <Button
            tone="green"
            className="flex-1"
            disabled={blocked}
            onClick={() => {
              s.nextDay()
              onClose()
            }}
          >
            Kết thúc ngày
          </Button>
        </div>
      </HudCard>
    </div>
  )
}
