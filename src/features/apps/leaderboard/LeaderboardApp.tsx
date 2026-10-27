import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Crown,
  CircleAlert,
  Star,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useGame } from '@/store'
import { Button, TabChip } from '@/components/ui'
import { NameAvatar } from '@/components/game/CustomerAvatar'
import { cn, fmtMoney } from '@/lib/format'
import { runEntry } from '@/data/gameOver'
import {
  fetchBoard,
  flushPending,
  runScore,
  type RunReason,
  type ServerRankKey,
  type ServerRun,
} from '@/lib/leaderboardApi'

type Row = Omit<ServerRun, 'reason'> & { reason?: RunReason; mine?: boolean }
type Load = 'loading' | 'error' | { total: number; runs: ServerRun[] }

/** bộ lọc xếp hạng: tên tab + icon + cách hiện giá trị bên phải mỗi dòng */
const SORTS: [ServerRankKey, string, LucideIcon, (r: Row) => string][] = [
  ['score', 'Tổng điểm', Crown, (r) => `${runScore(r).toLocaleString('vi-VN')} điểm`],
  ['money', 'Tiền', Wallet, (r) => fmtMoney(r.money)],
  ['done', 'Số đơn', ClipboardList, (r) => `${r.done} đơn`],
  ['rep', 'Uy tín', Star, (r) => `Uy tín ${r.rep}`],
  ['day', 'Số ngày', CalendarDays, (r) => `${r.day} ngày`],
]
const valueOf = (r: Row, key: ServerRankKey) => (key === 'score' ? runScore(r) : r[key])
/** lên bảng: điểm tổng không âm + uy tín không âm */
const ranked = (r: Row) => runScore(r) >= 0 && r.rep >= 0

// Bảng xếp hạng server: lượt chơi đã kết thúc của mọi người (thua / phá sản / chơi lại) + lượt đang chơi,
// mặc định xếp theo điểm tổng hợp (tiền lãi + uy tín + sao + đơn theo sao, ngày không tính, `runScore`), lọc lại theo từng thông số.
// Lượt điểm tổng âm hoặc uy tín âm không lên bảng; mở bảng thì tự cuộn tới dòng của mình
export function LeaderboardApp() {
  const name = useGame((s) => s.name)
  const day = useGame((s) => s.day)
  const done = useGame((s) => s.done)
  const money = useGame((s) => s.money)
  const rep = useGame((s) => s.rep)
  const runId = useGame((s) => s.runId)
  const reviews = useGame((s) => s.reviews)
  const [data, setData] = useState<Load>('loading')
  const [reload, setReload] = useState(0)
  const [key, setKey] = useState<ServerRankKey>('score')
  const [, label, , show] = SORTS.find((s) => s[0] === key)!

  useEffect(() => {
    let live = true
    // gửi nốt các lượt chưa gửi được rồi mới lấy bảng
    flushPending()
      .then(() => fetchBoard(key))
      .then((d) => live && setData(d))
      .catch(() => live && setData('error'))
    return () => {
      live = false
    }
  }, [reload, key])

  // lượt đang chơi chưa có trên server: chèn vào bảng theo thông số hiện tại
  const mine: Row | null = name
    ? {
        ...runEntry({ name, day, done, money, rep, runId, reviews }, 'newgame'),
        reason: undefined,
        at: 0,
        mine: true,
      }
    : null
  const rows: Row[] =
    typeof data === 'object'
      ? [...data.runs.filter((r) => r.runId !== runId), ...(mine ? [mine] : [])]
          .filter(ranked)
          .sort((a, b) => valueOf(b, key) - valueOf(a, key))
      : []
  const pos = rows.findIndex((r) => r.mine)
  const list = useRef<HTMLDivElement>(null)

  // tải xong / đổi bộ lọc thì cuộn tới dòng của mình (giữa khung), muốn xem người cao hơn thì tự cuộn lên
  useEffect(() => {
    const box = list.current
    const row = box?.querySelector<HTMLElement>('[data-mine]')
    if (!box || !row) return
    const off = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
    box.scrollTop = off - (box.clientHeight - row.offsetHeight) / 2
  }, [data, key, pos])

  return (
    <div className="flex h-[min(640px,72vh)] flex-col gap-3 group-data-fill/win:h-full">
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-yellow/15 text-yellow">
          <Trophy className="size-9 fill-yellow/30" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-head text-2xl leading-tight font-extrabold text-yellow">
            Bảng xếp hạng
          </div>
          <div className="truncate text-sm text-muted">
            Xem thành tích và thứ hạng của các người chơi khác
          </div>
        </div>
        <span
          className="shrink-0 self-start text-muted hover:text-ink"
          title={`Xếp theo ${label.toLowerCase()} · ghi khi thua game, phá sản hoặc chơi mới`}
        >
          <CircleAlert className="size-5" />
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SORTS.map(([k, name, icon]) => (
          <TabChip
            key={k}
            active={k === key}
            icon={icon}
            title={
              k === 'score' ? 'Tiền lãi, uy tín, sao trung bình và số đơn theo sao' : undefined
            }
            onClick={() => k !== key && (setData('loading'), setKey(k))}
          >
            {name}
          </TabChip>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-black/15 p-1.5">
        <div className="flex items-center gap-3 px-3 pt-1 pb-2 text-[13px] font-bold text-muted">
          <div className="w-10">Hạng</div>
          <div className="flex-1 pl-1">Người chơi</div>
          <div>{label}</div>
        </div>
        <div ref={list} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {data === 'loading' ? (
            <LoadingRows />
          ) : data === 'error' ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-ink/75">
              Không kết nối được server bảng xếp hạng.
              <Button onClick={() => (setData('loading'), setReload((n) => n + 1))}>
                ⟳ Thử lại
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-ink/75">Chưa có lượt chơi nào lên bảng.</div>
          ) : (
            rows.map((r, i) => <RunRow key={r.runId} r={r} rank={i} value={show(r)} />)
          )}
        </div>
      </div>
    </div>
  )
}

/** khung xương nhấp nháy đúng dáng các dòng bảng trong lúc tải */
function LoadingRows() {
  return (
    <div role="status" aria-label="Đang tải bảng xếp hạng" className="flex flex-col gap-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="size-10 rounded-full bg-white/10" />
          <div className="size-11 rounded-full bg-white/10" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-4 w-2/5 rounded bg-white/10" />
          </div>
          <div className="h-6 w-20 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

/** màu huy hiệu hạng 1 / 2 / 3 (vàng / bạc / đồng), từ hạng 4 là ô tròn tối */
const PODIUM = ['#ffcc2e', '#c3cede', '#d08a52']

function RankMark({ rank }: { rank: number }) {
  const color = PODIUM[rank]
  return (
    <div className="relative grid size-10 shrink-0 place-items-center">
      {color ? (
        // huy hiệu răng cưa, số hạng nằm giữa
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 size-full drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]"
        >
          <path
            fill={color}
            d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 rounded-full bg-[#2c3647] ring-1 ring-white/10" />
      )}
      <span
        className={cn(
          'relative font-head text-lg font-extrabold',
          color ? 'text-[#2a2105]' : 'text-ink',
        )}
      >
        {rank + 1}
      </span>
    </div>
  )
}

function RunRow({ r, rank, value }: { r: Row; rank: number; value: string }) {
  return (
    <div
      data-mine={r.mine || undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2',
        r.mine ? 'bg-[#3a3418] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
      )}
    >
      <RankMark rank={rank} />
      <NameAvatar name={r.name} className="size-11 ring-2 ring-white/15" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* tên dài bị cắt "..." thì rê chuột xem đủ tên */}
        <div
          title={r.name}
          data-tip-align="start"
          className={cn('truncate font-head text-base font-extrabold', r.mine && 'text-yellow')}
        >
          {r.name}
        </div>
      </div>
      <div className="font-head text-xl font-extrabold whitespace-nowrap text-green">{value}</div>
    </div>
  )
}
