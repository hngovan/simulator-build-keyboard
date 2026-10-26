import { ClipboardList, Monitor, ShoppingBag, UsersRound, X } from 'lucide-react'
import { useGame } from '@/store'
import { CATS } from '@/data/parts'
import { Button, IconButton, Muted, TitleBar, TitleButton } from '@/components/ui'
import { APPS } from '@/features/desktop/apps'
import { OrderSpec } from '@/components/game/OrderSpec'
import { OrderCard, useOrderEntries, type OrderEntry } from '@/components/game/OrderCard'
import { StatusChips } from '@/components/game/StatusChips'
import { CamModeButton, ResetCamButton } from './CamModeButton'

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
      {/* giống cửa sổ app Danh sách đơn ở máy tính, chỉ có nút đóng */}
      <div className="flex max-h-[80vh] w-[min(680px,100%)] flex-col overflow-hidden rounded-2xl border-[3px] border-black/40 bg-panel shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
        <TitleBar title={APPS.order.title} color={APPS.order.color}>
          <TitleButton close aria-label="Đóng danh sách đơn" title="Đóng" onClick={close}>
            <X />
          </TitleButton>
        </TitleBar>
        <div className="flex min-h-0 flex-col gap-2 p-3.5">
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
              {/* chọn đơn khác bên trái, các chỗ mua đồ là nút icon (rê chuột hiện tooltip) bên phải */}
              <div className="flex items-center justify-between gap-2">
                <Button onClick={() => setShort(null)}>← Chọn đơn khác</Button>
                <div className="flex gap-2">
                  <IconButton
                    tone="orange"
                    icon={<ShoppingBag />}
                    label="Mua ở Shopii"
                    onClick={() => s.openShop(short.missing[0].cat)}
                  />
                  <IconButton
                    tone="blue"
                    icon={<UsersRound />}
                    label="Tìm ở Hội Phím Cơ"
                    onClick={() => {
                      s.goPC()
                      s.openApp('group')
                    }}
                  />
                  <IconButton
                    icon={<ClipboardList />}
                    label="Xem chi tiết đơn"
                    onClick={() => {
                      s.goPC()
                      s.openApp('order')
                    }}
                  />
                </div>
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
                    // đơn đang làm chưa vào build: kiểm tra kho như đơn khác (thiếu thì hiện danh sách mua)
                    c.kind === 'active' ? (
                      <Button
                        tone="green"
                        size="sm"
                        onClick={() => (c.session?.build ? close() : pick(c))}
                      >
                        Tiếp tục làm
                      </Button>
                    ) : (
                      <Button tone="blue" size="sm" onClick={() => pick(c)}>
                        {c.session?.build ? 'Đổi sang làm tiếp' : 'Đổi sang build'}
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Muted>Chưa nhận đơn nào. Vào Mezzenger đọc tin khách rồi bấm "Nhận đơn".</Muted>
              <Button
                tone="blue"
                size="sm"
                onClick={() => {
                  s.goPC()
                  s.openApp('messenger')
                }}
              >
                Mở Mezzenger
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** HUD bàn build trống: về máy tính + bảng chọn đơn (mở khi bấm ô vàng trên bàn) */
export function EmptyBenchHud() {
  const s = useGame()
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <div className="flex gap-2">
          <IconButton tone="blue" icon={<Monitor />} label="Về máy tính" onClick={s.zoomToPC} />
          <ResetCamButton />
          <CamModeButton />
        </div>
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
