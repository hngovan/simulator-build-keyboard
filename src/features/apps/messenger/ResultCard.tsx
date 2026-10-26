import { Button, Panel, ScoreRow, Muted } from '@/components/ui'
import { fmt } from '@/lib/format'
import type { DeliveryResult } from '@/types'

/** Bảng điểm chấm của đơn đã đóng gói (chưa có sao: sao hiện khi khách nhận hàng và đánh giá) */
/** onNext: nút kết thúc ngày (bỏ trống khi hiện trong danh sách đơn đã đóng gói) */
export function ResultCard({ result, onNext }: { result: DeliveryResult; onNext?: () => void }) {
  return (
    <Panel>
      {/* chưa hiện sao: khách nhận hàng mới đánh giá (thông báo + app Đánh giá) */}
      <Muted className="mb-1.5 block">Số sao do khách chấm khi nhận hàng</Muted>
      {result.checks.map((c) => (
        <ScoreRow
          key={c.label}
          label={`${c.got >= c.pts * 0.95 ? '✅' : c.got > 0 ? '🟡' : '❌'} ${c.label}`}
          value={`${Math.round(c.got)}/${c.pts}`}
        />
      ))}
      <ScoreRow strong label="Tổng điểm" value={`${result.score}/100`} />
      <Muted>
        Khách trả budget linh kiện {fmt(result.reimburse)} + tiền công {fmt(result.labor)}
      </Muted>
      {onNext && (
        <Button tone="green" wide onClick={onNext}>
          🌙 Kết thúc ngày, nhận đơn mới
        </Button>
      )}
    </Panel>
  )
}
