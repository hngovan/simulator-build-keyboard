import { useGame } from '@/store'
import { Alert, Button, HudCard, KeyValueTable } from '@/components/ui'
import { END_TEXT } from '@/data/gameOver'
import { fmtMoney } from '@/lib/format'

/** Popup tổng kết khi thua / phá sản: đã gửi bảng xếp hạng, bản lưu đã xoá */
export function GameOverDialog() {
  const over = useGame((s) => s.gameOver)
  const close = useGame((s) => s.closeGameOver)
  if (!over) return null
  const { entry, sent } = over
  const info = END_TEXT[over.reason]
  return (
    <div className="fixed inset-0 z-[4000] grid animate-fade-in place-items-center bg-black/70 p-4">
      <HudCard className="flex w-[min(460px,100%)] flex-col gap-3">
        <h3 className="font-head text-2xl font-extrabold text-yellow">{info.title}</h3>
        <Alert title="Game over">{info.text}</Alert>
        <KeyValueTable
          rows={[
            ['Chủ shop', entry.name],
            ['Trụ được', `${entry.day} ngày`],
            ['Đơn đã giao', String(entry.done)],
            ['Uy tín', String(entry.rep)],
            ['Sao TB', `${entry.stars ? entry.stars.toFixed(2) : '–'}★`],
            ['Tiền còn lại', fmtMoney(entry.money)],
          ]}
        />
        {sent === 'offline' ? (
          <Alert title="Chưa gửi được kết quả">
            Chưa kết nối được server bảng xếp hạng, kết quả sẽ tự gửi lại lần sau.
          </Alert>
        ) : (
          <div className="text-center text-[13px] text-ink/75">
            {sent === 'sending'
              ? 'Đang gửi kết quả lên bảng xếp hạng...'
              : `Đã ghi lên bảng xếp hạng: hạng ${sent.rank} / ${sent.total} theo tiền.`}
          </div>
        )}
        <Button tone="green" size="lg" onClick={close}>
          ↩ Về màn hình chính
        </Button>
      </HudCard>
    </div>
  )
}
