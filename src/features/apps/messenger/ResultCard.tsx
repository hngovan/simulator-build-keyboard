import { Button, Panel, ScoreRow, Muted } from '@/components/ui'
import { fmt } from '@/lib/format'
import type { DeliveryResult } from '@/types'

/** Kết quả chấm điểm sau khi giao hàng */
export function ResultCard({ result, onNext }: { result: DeliveryResult; onNext: () => void }) {
  return (
    <Panel>
      <div className="text-[34px] text-yellow [text-shadow:0_3px_0_#0006]">
        {'★'.repeat(result.stars)}
        <span className="text-[#4a5263]">{'★'.repeat(5 - result.stars)}</span>
      </div>
      {result.checks.map((c) => (
        <ScoreRow
          key={c.label}
          label={`${c.got >= c.pts * 0.95 ? '✅' : c.got > 0 ? '🟡' : '❌'} ${c.label}`}
          value={`${Math.round(c.got)}/${c.pts}`}
        />
      ))}
      <ScoreRow strong label="Tổng điểm" value={`${result.score}/100`} />
      <Muted>
        Khách hoàn tiền linh kiện {fmt(result.reimburse)} + tiền công {fmt(result.labor)}
      </Muted>
      <Button tone="green" wide onClick={onNext}>
        🌙 Kết thúc ngày, nhận đơn mới
      </Button>
    </Panel>
  )
}
