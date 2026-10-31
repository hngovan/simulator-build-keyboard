import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Package } from 'lucide-react'
import { useGame } from '@/store'
import { calendarDays } from '@/data/calendar'
import { SHIP_SPEEDS } from '@/data/shipping'
import { BackButton, Button } from '@/components/ui'
import { cn } from '@/lib/format'
import { EndDayDialog } from '@/features/desktop/EndDayDialog'
import { useRoom } from '@/scene/room/roomStore'

// màu theo tờ lịch treo tường 3D (`scene/room/WallCalendar.tsx` drawCalendar) để popup nhìn như cầm tờ lịch đó lên
const RED = '#c0392b'
const PAPER = '#fbf8f1'
const GRID = '#d9d2c3'
const INK = '#3a3530'
const GREEN = '#1e7a44'
const ORANGE = '#e67e22'
/** số vòng lò xo gáy lịch (như lịch 3D) */
const RINGS = 13

/** mép trên giấy note bị xé (răng cưa không đều, cố định) */
const TORN = (() => {
  const pts: string[] = []
  const n = 26
  for (let i = 0; i <= n; i++) {
    // độ sâu răng cưa giả ngẫu nhiên cố định theo i
    const y = 1.2 + ((i * 37) % 7) * 0.45 + (i % 2) * 1.1
    pts.push(`${((i / n) * 100).toFixed(1)}% ${y.toFixed(2)}%`)
  }
  return `polygon(${pts.join(',')}, 100% 100%, 0 100%)`
})()

/** chấm cam hạn giao (như chấm trên lịch 3D) */
function DueDot({ className }: { className?: string }) {
  return <span className={cn('size-3 rounded-full', className)} style={{ background: ORANGE }} />
}

/** 1 việc trên giấy note: chấm màu + tiêu đề + dòng chi tiết, mỗi dòng nằm trên 1 dòng kẻ */
function NoteItem({
  color,
  title,
  children,
}: {
  color: string
  title: string
  children?: ReactNode
}) {
  return (
    <li className="flex gap-2">
      <span className="mt-2 size-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0">
        <div className="text-base leading-7 font-extrabold">{title}</div>
        {children && (
          <div className="text-sm leading-7 font-semibold text-[#5d5035]">{children}</div>
        )}
      </div>
    </li>
  )
}

/**
 * Popup lịch xưởng (bấm lịch treo tường), trái = tờ lịch giống hệt lịch 3D trong phòng nhưng to (bìa nâu, 13 vòng lò xo + đinh,
 * đầu đỏ "LỊCH XƯỞNG PHÍM / NGÀY n" căn giữa, lưới 4 tuần không hàng thứ, ô sale hồng + "SALE", hôm nay số xanh khoanh bầu dục,
 * ngày qua gạch chéo bút đỏ, hạn giao chấm cam góc (tên khách chỉ ở giấy note), hàng tới hộp xanh góc phải, chân "Đã làm n ngày" + chú thích);
 * bấm ô = xem việc ngày đó. Phải = tờ giấy note xé từ sổ (mép trên răng cưa, dòng kẻ, lề đỏ, đứng thẳng, băng dính) ghi việc ngày
 * đang chọn + "Kết thúc ngày" (popup tổng kết `EndDayDialog`) / "Quay lại làm việc"; góc trên trái `BackButton` đóng lịch (= Esc)
 */
export function CalendarDialog() {
  const day = useGame((s) => s.day)
  const order = useGame((s) => (s.result ? null : s.order))
  const jobs = useGame((s) => s.jobs)
  const parcels = useGame((s) => s.parcels)
  const packed = useGame((s) => s.packed.filter((p) => !p.shipped).length)
  const [endDay, setEndDay] = useState(false)
  const [pick, setPick] = useState(day)
  const close = () => useRoom.setState({ calendar: false })
  const days = useMemo(
    () => calendarDays(day, [...(order ? [order] : []), ...jobs.map((j) => j.order)], parcels),
    [day, order, jobs, parcels],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (endDay)
    return (
      <EndDayDialog
        onClose={() => {
          setEndDay(false)
          close()
        }}
      />
    )
  const sel = days.find((d) => d.day === pick) ?? days[0]
  const empty = !sel.sale && !sel.due.length && !sel.parcels.length && !(sel.day === day && packed)
  return (
    <div
      role="dialog"
      className="fixed inset-0 z-[3000] grid animate-fade-in place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      {/* nút quay lại góc trên trái như máy tính / bàn build (= Esc) */}
      <BackButton onClick={close} className="absolute top-3 left-3" />
      <div className="flex max-h-full items-stretch gap-10 overflow-x-hidden overflow-y-auto px-4 pt-8 pb-4 max-md:flex-col max-md:gap-6">
        {/* tờ lịch: tỉ lệ dọc như lịch 3D (520 × 700), to gần hết chiều cao màn */}
        <div className="relative aspect-[520/600] h-[min(78vh,700px)] shrink-0 rounded-md bg-[#6b4a33] p-[1.5%] shadow-[0_18px_50px_rgba(0,0,0,0.6)] max-md:h-auto max-md:w-[min(92vw,520px)]">
          {/* đinh treo + gáy lò xo */}
          <span className="absolute -top-6 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#555] shadow-[0_2px_3px_rgba(0,0,0,0.6)]" />
          <div className="pointer-events-none absolute inset-x-[6%] -top-3 z-10 flex justify-between">
            {Array.from({ length: RINGS }, (_, i) => (
              <span
                key={i}
                className="h-6 w-2 rounded-full border-2 border-[#7d838c] bg-gradient-to-b from-[#e3e6ea] to-[#9aa0a8]"
              />
            ))}
          </div>
          <div
            className="flex h-full flex-col overflow-hidden"
            style={{ background: PAPER, color: INK }}
          >
            {/* đầu lịch đỏ, chữ căn giữa (21% chiều cao như lịch 3D) */}
            <div
              className="flex h-[21%] shrink-0 flex-col items-center justify-center text-white"
              style={{ background: RED }}
            >
              <div className="font-head text-[clamp(14px,2.6vh,26px)] font-extrabold tracking-wide">
                LỊCH XƯỞNG PHÍM
              </div>
              <div className="font-head text-[clamp(32px,7vh,68px)] leading-none font-black">
                NGÀY {day}
              </div>
            </div>
            {/* lưới 7 × 4 kẻ nét liền (mỗi ô chỉ kẻ phải + dưới, khung ngoài kẻ trái + trên) */}
            <div
              className="mx-[3%] mt-[3%] grid min-h-0 flex-1 grid-cols-7 grid-rows-4 border-t-2 border-l-2"
              style={{ borderColor: GRID }}
            >
              {days.map((d) => {
                const today = d.day === day
                const past = d.day < day
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setPick(d.day)}
                    title={`Ngày ${d.day}`}
                    className="relative flex flex-col items-center border-r-2 border-b-2 transition-[filter] hover:brightness-95"
                    style={{ borderColor: GRID, background: d.sale ? '#ffe1dc' : PAPER }}
                  >
                    {/* ngày đang chọn (khác hôm nay): viền đỏ phủ trong ô, không đè nét kẻ */}
                    {d.day === pick && !today && (
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{ boxShadow: `inset 0 0 0 2px ${RED}` }}
                      />
                    )}
                    {/* hạn giao: chấm cam góc trái (tên khách xem ở giấy note khi bấm ô); hàng tới: hộp xanh góc phải */}
                    {d.due.length > 0 && <DueDot className="absolute top-1 left-1" />}
                    {d.parcels.length > 0 && (
                      <Package
                        className="absolute top-1 right-1 size-4 text-[#2f6fd6]"
                        strokeWidth={2.6}
                      />
                    )}
                    <span
                      className={cn(
                        // ô vuông cố định (size theo vh) → vòng khoanh hôm nay luôn tròn
                        'mt-[8%] grid size-[clamp(30px,5.4vh,50px)] shrink-0 place-items-center rounded-full font-head text-[clamp(18px,3.4vh,32px)] leading-none',
                        today ? 'font-black' : 'font-bold',
                      )}
                      style={
                        today
                          ? { color: GREEN, boxShadow: `inset 0 0 0 3px ${GREEN}` }
                          : { color: INK }
                      }
                    >
                      {d.day}
                    </span>
                    {d.sale && (
                      <span
                        className="mt-auto pb-1 text-[clamp(10px,1.6vh,15px)] font-extrabold"
                        style={{ color: RED }}
                      >
                        SALE
                      </span>
                    )}
                    {/* ngày đã qua: gạch chéo bút đỏ */}
                    {past && (
                      <svg
                        className="pointer-events-none absolute inset-[10%]"
                        viewBox="0 0 10 10"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0 0 L10 10 M10 0 L0 10"
                          stroke="rgba(192,57,43,0.75)"
                          strokeWidth={4}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
            {/* chân lịch: số ngày đã làm + chú thích */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 px-[3.5%] py-[3%] text-[clamp(11px,1.8vh,16px)] font-bold">
              <span>Đã làm {day - 1} ngày</span>
              <span className="flex items-center gap-1.5" style={{ color: ORANGE }}>
                <DueDot /> hạn giao
              </span>
              <span className="flex items-center gap-1.5 text-[#2f6fd6]">
                <Package className="size-4" strokeWidth={2.6} /> hàng tới
              </span>
              <span style={{ color: RED }}>SALE Shopii</span>
            </div>
          </div>
        </div>

        {/* tờ giấy xé từ sổ note (cao bằng tờ lịch) + 2 nút cỡ thường */}
        <div className="flex w-[300px] shrink-0 flex-col gap-3 max-md:w-[min(92vw,360px)]">
          {/* drop-shadow ở lớp ngoài: clip-path cắt mất box-shadow */}
          <div className="min-h-0 flex-1 drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]">
            {/* min-h: màn hẹp (xếp dọc) không có tờ lịch kéo cao */}
            <div className="relative h-full min-h-[360px]">
              <span className="absolute -top-2 left-1/2 z-10 h-7 w-24 -translate-x-1/2 -rotate-6 bg-[#f2c9a8]/80 shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
              <div
                // absolute: nhiều việc thì cuộn trong tờ note, không đẩy cao cả popup (cao bằng tờ lịch)
                className="absolute inset-0 overflow-y-auto pt-9 pr-5 pb-6 pl-12 text-[#3b3423]"
                style={{
                  clipPath: TORN,
                  // dòng kẻ xanh mờ + lề đỏ như giấy sổ
                  background: `linear-gradient(90deg, transparent 34px, rgba(214,80,80,0.55) 34px, rgba(214,80,80,0.55) 36px, transparent 36px), repeating-linear-gradient(180deg, transparent 0 27px, rgba(70,110,170,0.22) 27px 28px), #fdf3b4`,
                  backgroundPosition: '0 0, 0 8px, 0 0',
                  // dòng kẻ cuộn theo chữ
                  backgroundAttachment: 'local',
                }}
              >
                <div className="font-head text-2xl leading-7 font-extrabold">
                  {sel.day === day
                    ? 'Hôm nay'
                    : `Ngày ${sel.day}${sel.day < day ? ' · Đã qua' : ''}`}
                </div>
                <div className="text-sm leading-7 font-bold text-[#8a7a45]">Việc trong ngày</div>
                <ul className="mt-1 flex flex-col">
                  {sel.sale && (
                    <NoteItem color={RED} title="Shopii sale">
                      Linh kiện giảm 5–30%
                    </NoteItem>
                  )}
                  {sel.due.map((o) => (
                    <NoteItem
                      key={o.id}
                      color={ORANGE}
                      title={o.dueDay! < day ? 'Trễ hạn giao' : 'Hạn giao đơn'}
                    >
                      {o.customer}
                    </NoteItem>
                  ))}
                  {sel.parcels.map((p) => (
                    <NoteItem
                      key={p.id}
                      color="#2f6fd6"
                      // đã tới cửa = đã giao; chưa tới thì đếm số ngày còn lại tính từ hôm nay
                      title={
                        p.arrive <= day
                          ? 'Đơn đã được giao'
                          : `Chờ giao hàng · còn ${p.arrive - day} ngày`
                      }
                    >
                      {p.label} · {SHIP_SPEEDS[p.speed].name}
                    </NoteItem>
                  ))}
                  {sel.day === day && packed > 0 && (
                    <NoteItem color={GREEN} title="Chờ gửi khách">
                      {packed} thùng đã đóng gói ở hành lang
                    </NoteItem>
                  )}
                  {empty && (
                    <li className="text-sm leading-7 font-semibold text-[#8a7a45]">
                      Không có việc gì ~
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <Button tone="green" className="w-full" onClick={() => setEndDay(true)}>
            Kết thúc ngày {day}
          </Button>
          {/* nút sáng như giấy (ghi đè màu Button) */}
          <Button
            className="w-full !bg-[#f3f0ea] !text-[#2b2f38] hover:brightness-95"
            onClick={close}
          >
            Quay lại làm việc
          </Button>
        </div>
      </div>
    </div>
  )
}
