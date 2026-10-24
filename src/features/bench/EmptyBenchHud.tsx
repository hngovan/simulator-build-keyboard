import { Monitor } from 'lucide-react'
import { useGame } from '@/store'
import { CATS } from '@/data/parts'
import { Button, HudCard, IconButton, Muted } from '@/components/ui'
import { OrderSpec } from '@/components/game/OrderSpec'
import { OrderCard, useOrderEntries, type OrderEntry } from '@/components/game/OrderCard'
import { StatusChips } from '@/components/game/StatusChips'

/**
 * Danh sách đơn (mở khi bấm ô vàng trên bàn trống, hoặc nút "Danh sách đơn" khi đang build):
 * đơn đang làm / đã nhận / đơn mới. Đổi sang đơn khác thì bản build đang dở được cất lại nguyên trạng
 */
export function OrderPicker() {
  const s = useGame()
  const list = useOrderEntries()
  const open = s.benchPicker
  // đơn vừa chọn nhưng còn thiếu linh kiện (ở store: đổi đơn lúc đang build thì HUD đổi sang bàn trống)
  const short = s.benchShort
  const setShort = (benchShort: typeof short) => useGame.setState({ benchShort })
  if (!open) return null
  const pick = (c: OrderEntry) => {
    const missing = s.buildOrder(c.order.id)
    if (missing?.length) setShort({ order: c.order, missing })
  }
  const close = () => {
    setShort(null)
    useGame.setState({ benchPicker: false })
  }
  return (
    <div
      className="fixed inset-0 z-[20] grid animate-fade-in place-items-center bg-black/50 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && close()}
    >
      <HudCard className="flex max-h-[80vh] w-[680px] max-w-full flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-head text-xl font-extrabold">📋 Danh sách đơn</h3>
          <Button size="sm" onClick={close}>
            ✕
          </Button>
        </div>
        {short ? (
          <>
            <div>
              Đơn của <b>{short.order.customer}</b> còn thiếu linh kiện, mua đủ rồi quay lại bàn
              build:
            </div>
            <ul className="flex flex-col gap-1">
              {short.missing.map((m) => (
                <li key={m.cat} className="rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
                  <b>{CATS[m.cat]}</b>: <span className="text-yellow">{m.msg}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button tone="orange" onClick={() => s.openShop(short.missing[0].cat)}>
                🛒 Mua ở Shopii
              </Button>
              <Button
                tone="blue"
                onClick={() => {
                  s.goPC()
                  s.openApp('order')
                }}
              >
                📋 Xem chi tiết đơn
              </Button>
              <Button onClick={() => setShort(null)}>← Chọn đơn khác</Button>
            </div>
          </>
        ) : list.length ? (
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {list.map((c) => (
              <OrderCard
                key={c.order.id}
                c={c}
                detail={<OrderSpec order={c.order} compact />}
                action={
                  c.kind === 'active' ? (
                    <Button tone="green" size="sm" onClick={close}>
                      Tiếp tục làm
                    </Button>
                  ) : (
                    <Button
                      tone={c.kind === 'offer' ? 'yellow' : 'blue'}
                      size="sm"
                      onClick={() => pick(c)}
                    >
                      {c.kind === 'offer'
                        ? 'Nhận & build'
                        : c.session?.build
                          ? 'Đổi sang làm tiếp'
                          : 'Đổi sang build'}
                    </Button>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <Muted>Chưa có đơn nào. Hôm nay hết đơn mới, kết thúc ngày để nhận thêm.</Muted>
        )}
      </HudCard>
    </div>
  )
}

/** HUD bàn build trống: về máy tính + bảng chọn đơn (mở khi bấm ô vàng trên bàn) */
export function EmptyBenchHud() {
  const s = useGame()
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between [&>*]:pointer-events-auto">
        <IconButton
          tone="blue"
          icon={<Monitor />}
          label="Về máy tính"
          hint="Đi tới màn hình trên bàn"
          onClick={s.zoomToPC}
        />
        <StatusChips />
      </div>
      {!s.benchPicker && (
        <div className="fixed bottom-3 left-1/2 z-[5] -translate-x-1/2 rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] px-5 py-3 text-center shadow-[0_6px_0_#0006]">
          <div className="font-head text-xl font-extrabold text-yellow">Bàn build đang trống</div>
          <div className="text-base">Bấm ô vàng trên bàn để chọn đơn và bắt đầu build</div>
        </div>
      )}
      <OrderPicker />
    </>
  )
}
