import { ClipboardList, Footprints, Hand, Monitor, ShoppingBag, UsersRound } from 'lucide-react'
import { useGame } from '@/store'
import { CATS, checkInventory } from '@/data/parts'
import { Button, IconButton } from '@/components/ui'
import { StatusChips } from '@/components/game/StatusChips'
import { boxCustomer, isPackedBox } from '@/store/carrySlice'
import { ResetCamButton } from './CamModeButton'

/**
 * Khung giữa đáy khi bàn build chưa vào build: bàn trống (ra kệ cửa lấy thùng đơn), thùng đơn còn thiếu linh kiện (danh sách
 * thiếu + chỗ mua, đủ thì bắt đầu build), hoặc thùng vừa đóng gói (cầm ra ô giao hàng)
 */
function BenchStatus() {
  const s = useGame()
  const box = s.benchBox
  const frame = (title: string, body: React.ReactNode) => (
    <div className="fixed bottom-3 left-1/2 z-[5] flex w-[min(560px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2 rounded-2xl border-[3px] border-yellow bg-[rgba(14,16,24,0.92)] px-5 py-3 text-center shadow-[0_6px_0_#0006]">
      <div className="font-head text-xl font-extrabold text-yellow">{title}</div>
      {body}
    </div>
  )
  if (!box)
    return frame(
      'Bàn build đang trống',
      <div className="text-base">
        {s.order || s.jobs.length
          ? 'Đứng dậy ra kệ hàng cuối hành lang (hoặc kệ cất đơn) cầm thùng đơn, mang về bấm bàn để đặt lên'
          : 'Chưa nhận đơn nào: về máy tính mở Mezzenger nhận đơn, thùng đơn sẽ tới kệ ngoài cửa'}
      </div>,
    )
  const who = boxCustomer(s, box)
  const pick = (
    <Button tone="blue" size="sm" onClick={s.pickBench}>
      <Hand className="mr-1 inline size-4" />
      Cầm thùng lên
    </Button>
  )
  if (isPackedBox(s, box))
    return frame(
      `Đã đóng gói đơn ${who}`,
      <>
        <div className="text-base">
          Cầm thùng lên rồi mang ra ô giao hàng (tầng trên kệ cuối hành lang) để gửi cho khách. Cần
          sửa thì mở thùng ra build lại, đóng gói lại sẽ chấm điểm lại
        </div>
        <div className="flex items-center justify-between gap-2">
          {pick}
          {s.packed.some((p) => p.order.id === box && p.session?.build) && (
            <Button size="sm" onClick={s.unpackBox}>
              Mở thùng, build lại
            </Button>
          )}
        </div>
      </>,
    )
  // thùng đơn trên bàn nhưng chưa vào build: còn thiếu linh kiện
  const missing =
    s.order?.id === box ? checkInventory(s.inventory, s.order).filter((c) => !c.ok) : []
  return frame(
    missing.length ? `Đơn ${who} còn thiếu linh kiện` : `Đơn ${who} đủ đồ rồi`,
    <>
      {missing.length > 0 && (
        <ul className="flex flex-col gap-1 text-left">
          {missing.map((m) => (
            <li key={m.cat} className="rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
              <b>{CATS[m.cat]}</b>: <span className="text-yellow">{m.msg}</span>
              {/* đã đặt Shopii cho đơn này, chưa nhận */}
              {s.parcels.some((p) =>
                p.items.some((it) => it.kind === 'part' && it.cat === m.cat && p.job === box),
              ) && <span className="text-muted"> · đang giao, tới cửa thì ra nhận</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        {pick}
        <div className="flex gap-2">
          {missing.length ? (
            <>
              <IconButton
                tone="orange"
                icon={<ShoppingBag />}
                label="Mua ở Shopii"
                onClick={() => s.openShop(missing[0].cat)}
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
            </>
          ) : (
            <Button tone="green" size="sm" onClick={() => s.buildOrder(box)}>
              Mở thùng, bắt đầu build
            </Button>
          )}
        </div>
      </div>
    </>,
  )
}

/** HUD bàn build chưa vào build: về máy tính, đứng dậy, góc nhìn + khung trạng thái thùng trên bàn */
export function EmptyBenchHud() {
  const s = useGame()
  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[8] flex items-center justify-between max-md:flex-wrap max-md:gap-2 [&>*]:pointer-events-auto">
        <div className="flex gap-2">
          <IconButton tone="blue" icon={<Monitor />} label="Về máy tính" onClick={s.zoomToPC} />
          <IconButton
            tone="green"
            icon={<Footprints />}
            label="Đứng dậy đi lại trong phòng"
            onClick={() => s.standUp('bench')}
          />
          <ResetCamButton />
        </div>
        <StatusChips />
      </div>
      <BenchStatus />
    </>
  )
}
