import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { Badge, Button, OptionChip, type BadgeTone } from '@/components/ui'
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

const MEDALS = ['🥇', '🥈', '🥉']
const REASON: Record<RunReason, [string, BadgeTone]> = {
  save: ['Đang chơi', 'green'],
  rep: ['Dính phốt', 'red'],
  money: ['Cạn vốn', 'orange'],
  bankrupt: ['Phá sản', 'default'],
  newgame: ['Chơi lại', 'blue'],
}

type Row = Omit<ServerRun, 'reason'> & { reason?: RunReason; mine?: boolean }
type Load = 'loading' | 'error' | { total: number; runs: ServerRun[] }

/** bộ lọc xếp hạng: tên chip + cách hiện giá trị bên phải mỗi dòng */
const SORTS: [ServerRankKey, string, (r: Row) => string][] = [
  ['score', 'Tổng điểm', (r) => `${runScore(r).toLocaleString('vi-VN')} điểm`],
  ['money', 'Tiền', (r) => fmtMoney(r.money)],
  ['done', 'Số đơn', (r) => `${r.done} đơn`],
  ['rep', 'Uy tín', (r) => `Uy tín ${r.rep}`],
  ['day', 'Số ngày', (r) => `${r.day} ngày`],
]
const valueOf = (r: Row, key: ServerRankKey) => (key === 'score' ? runScore(r) : r[key])

// Bảng xếp hạng server: lượt chơi đã kết thúc của mọi người (thua / phá sản / chơi lại) + lượt đang chơi,
// mặc định xếp theo điểm tổng hợp (tiền lãi + uy tín + sao + đơn theo sao, ngày không tính, `runScore`), lọc lại theo từng thông số
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
  const [, label, show] = SORTS.find((s) => s[0] === key)!

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
      ? [...data.runs.filter((r) => r.runId !== runId), ...(mine ? [mine] : [])].sort(
          (a, b) => valueOf(b, key) - valueOf(a, key),
        )
      : []
  const pos = rows.findIndex((r) => r.mine)

  return (
    <div className="flex h-[min(560px,68vh)] flex-col gap-2 group-data-fill/win:h-full">
      {mine && (
        <div className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2">
          <div className="font-head text-3xl font-extrabold text-yellow">
            #{pos >= 0 ? pos + 1 : '–'}
          </div>
          <div className="min-w-0 flex-1 truncate font-head text-lg font-extrabold">
            {mine.name}
          </div>
          <div className="font-head text-lg font-extrabold text-green">{show(mine)}</div>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {SORTS.map(([k, name]) => (
          <OptionChip
            key={k}
            active={k === key}
            onClick={() => k !== key && (setData('loading'), setKey(k))}
            title={
              k === 'score'
                ? 'Mỗi đơn 10 điểm, mỗi uy tín 20, mỗi ngày 5, mỗi 100k tiền 1'
                : undefined
            }
          >
            {name}
          </OptionChip>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {data === 'loading' ? (
          <LoadingRows />
        ) : data === 'error' ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-ink/75">
            Không kết nối được server bảng xếp hạng.
            <Button onClick={() => (setData('loading'), setReload((n) => n + 1))}>⟳ Thử lại</Button>
          </div>
        ) : (
          rows.map((r, i) => <RunRow key={r.runId} r={r} rank={i} value={show(r)} />)
        )}
      </div>
      <div className="text-center text-[13px] text-ink/75">
        Xếp theo {label.toLowerCase()} · ghi khi thua game, phá sản hoặc chơi mới
        {typeof data === 'object' && ` · ${data.total} lượt chơi`}
      </div>
    </div>
  )
}

/** khung xương nhấp nháy đúng dáng các dòng bảng trong lúc tải */
function LoadingRows() {
  return (
    <div role="status" aria-label="Đang tải bảng xếp hạng" className="flex flex-col gap-1">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-2.5 rounded-xl bg-panel-2 px-2.5 py-2"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="size-6 rounded-full bg-white/10" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-3.5 w-2/5 rounded bg-white/10" />
            <div className="flex gap-1">
              {[12, 10, 14, 10].map((w, j) => (
                <div key={j} className="h-4 rounded bg-white/10" style={{ width: `${w * 4}px` }} />
              ))}
            </div>
          </div>
          <div className="h-5 w-16 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

function RunRow({ r, rank, value }: { r: Row; rank: number; value: string }) {
  const reason = r.reason && REASON[r.reason]
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-2.5 py-1.5',
        r.mine ? 'bg-[#4a3f1a] ring-2 ring-yellow ring-inset' : 'bg-panel-2',
      )}
    >
      <div className="w-7 text-center font-head text-lg font-extrabold">
        {MEDALS[rank] ?? rank + 1}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* tên + badge cùng 1 hàng flex để badge căn giữa theo chiều dọc với chữ */}
        <div className={cn('flex min-w-0 items-center gap-1 font-bold', r.mine && 'text-yellow')}>
          <span className="truncate">{r.name}</span>
          {r.mine ? (
            <Badge solid tone="yellow" className="ml-0 shrink-0">
              Bạn
            </Badge>
          ) : (
            reason && (
              <Badge solid tone={reason[1]} className="ml-0 shrink-0">
                {reason[0]}
              </Badge>
            )
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge solid tone="blue" className="ml-0">
            {r.day} ngày
          </Badge>
          <Badge solid tone="green" className="ml-0">
            {r.done} đơn
          </Badge>
          <Badge solid tone="orange" className="ml-0">
            Uy tín {r.rep}
          </Badge>
          <Badge solid className="ml-0">
            {fmtMoney(r.money)}
          </Badge>
          {/* có đánh giá mới hiện sao vàng kèm điểm trung bình */}
          {r.stars > 0 && (
            <Badge solid tone="yellow" className="ml-0">
              {r.stars.toFixed(2)}★
            </Badge>
          )}
        </div>
      </div>
      <div className="font-head text-lg font-extrabold whitespace-nowrap text-green">{value}</div>
    </div>
  )
}
