import { useEffect, useState } from 'react'
import { useGame } from '@/store'
import { Badge, Button, type BadgeTone } from '@/components/ui'
import { cn, fmtMoney } from '@/lib/format'
import { runEntry } from '@/data/gameOver'
import { fetchBoard, flushPending, type RunEndReason, type ServerRun } from '@/lib/leaderboardApi'

const MEDALS = ['🥇', '🥈', '🥉']
const REASON: Record<RunEndReason, [string, BadgeTone]> = {
  rep: ['Dính phốt', 'red'],
  money: ['Cạn vốn', 'orange'],
  bankrupt: ['Phá sản', 'default'],
  newgame: ['Chơi lại', 'blue'],
}

type Row = Omit<ServerRun, 'reason'> & { reason?: RunEndReason; mine?: boolean }
type Load = 'loading' | 'error' | { total: number; runs: ServerRun[] }

const fmtStars = (v: number) => (v ? v.toFixed(2) : '–')

// Bảng xếp hạng server: lượt chơi đã kết thúc của mọi người (thua / phá sản / chơi lại) + lượt đang chơi, xếp theo tiền
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

  useEffect(() => {
    let live = true
    // gửi nốt các lượt chưa gửi được rồi mới lấy bảng
    flushPending()
      .then(() => fetchBoard('money'))
      .then((d) => live && setData(d))
      .catch(() => live && setData('error'))
    return () => {
      live = false
    }
  }, [reload])

  // lượt đang chơi chưa có trên server: chèn vào bảng theo số tiền hiện tại
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
          (a, b) => b.money - a.money,
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
          <div className="font-head text-lg font-extrabold text-green">{fmtMoney(mine.money)}</div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {data === 'loading' ? (
          <div className="py-8 text-center text-ink/75">Đang tải bảng xếp hạng...</div>
        ) : data === 'error' ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-ink/75">
            Không kết nối được server bảng xếp hạng.
            <Button onClick={() => (setData('loading'), setReload((n) => n + 1))}>⟳ Thử lại</Button>
          </div>
        ) : (
          rows.map((r, i) => <RunRow key={r.runId} r={r} rank={i} />)
        )}
      </div>
      <div className="text-center text-[13px] text-ink/75">
        Xếp theo tiền · ghi khi thua game, phá sản hoặc chơi mới
        {typeof data === 'object' && ` · ${data.total} lượt chơi`}
      </div>
    </div>
  )
}

function RunRow({ r, rank }: { r: Row; rank: number }) {
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
        <div className={cn('truncate font-bold', r.mine && 'text-yellow')}>
          {r.name}
          {r.mine ? (
            <Badge solid tone="yellow">
              Bạn
            </Badge>
          ) : (
            reason && (
              <Badge solid tone={reason[1]}>
                {reason[0]}
              </Badge>
            )
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
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
            {fmtStars(r.stars)}★
          </Badge>
        </div>
      </div>
      <div className="font-head text-lg font-extrabold text-green">{fmtMoney(r.money)}</div>
    </div>
  )
}
