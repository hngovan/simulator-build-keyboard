import { useGame } from '@/store'
import {
  CATS,
  CASES,
  MOUNTS,
  SOUND_WISH,
  buildSound,
  checkInventory,
  itemName,
  soundLabel,
} from '@/data/parts'
import {
  Badge,
  Button,
  Heading,
  Muted,
  OptionChip,
  Panel,
  ProgressBar,
  SoundBars,
  StepDot,
} from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import { OrderSpec } from '@/components/game/OrderSpec'
import { OrderCard, useOrderEntries, type OrderEntry } from '@/components/game/OrderCard'
import { buildContext } from '@/data/steps'

/** Chi tiết 1 đơn: yêu cầu khách, đối chiếu linh kiện (✓ như bàn build), mount, âm thanh, ngân sách */
function OrderDetail({ c }: { c: OrderEntry }) {
  const s = useGame()
  const { order, kind } = c
  // đơn mới chưa nhận: chỉ có yêu cầu của khách
  if (!c.session) return <OrderSpec order={order} compact />
  const active = kind === 'active'
  const { inventory, provided, mount, build, spent } = c.session
  const ctx = active ? s.ctx : mount ? buildContext(order, inventory, mount) : null
  const checks = checkInventory(inventory, order, build ? Object.keys(build.switches).length : 0)
  const ready = checks.every((x) => x.ok)
  const caseDef = inventory.case && CASES[inventory.case.id]
  const profile =
    inventory.switch && inventory.plate
      ? buildSound(inventory, mount, build, ctx?.keys.length)
      : null
  const over = spent > order.budget

  return (
    <div className="flex flex-col">
      <Panel className="mt-0">
        <OrderSpec order={order} />
      </Panel>
      <Panel>
        <Heading>Đối chiếu linh kiện</Heading>
        <table className="w-full border-collapse">
          <tbody>
            {checks.map((x, i) => (
              <tr
                key={x.cat}
                className={cn(
                  'border-b border-dashed border-line last:border-b-0',
                  x.ok ? 'text-[#9fe6b6]' : 'bg-red/5',
                )}
              >
                <td className="w-8 p-1.5 align-top">
                  <StepDot state={x.ok ? 'done' : 'cur'}>{i + 1}</StepDot>
                </td>
                <td className="p-1.5 align-top font-bold">{CATS[x.cat]}</td>
                <td className="p-1.5 align-top text-ink">
                  {/* chưa có món này thì chỉ hiện lý do thiếu */}
                  {inventory[x.cat] && itemName(x.cat, inventory[x.cat])}
                  {provided[x.cat] && (
                    <Badge solid tone="green">
                      Khách gửi
                    </Badge>
                  )}
                  {!x.ok && <div className="text-red">{x.msg}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {caseDef && (
        <Panel>
          <Heading note={order.mount && `(khách yêu cầu: ${MOUNTS[order.mount].name})`}>
            Kiểu mount
          </Heading>
          <div className="mb-1.5 flex flex-wrap gap-2">
            {caseDef.mounts.map((m) => (
              <OptionChip
                key={m}
                big
                active={mount === m}
                // chỉ chọn mount cho đơn đang làm, chưa vào bàn build
                disabled={!active || !!build}
                onClick={() => s.setMount(m)}
              >
                <b>{MOUNTS[m].name}</b>
                <span>{MOUNTS[m].desc}</span>
              </OptionChip>
            ))}
          </div>
          <Muted>
            Case{' '}
            {caseDef.pieces === 2 ? '2 mảnh: phải tháo vít mở case và vặn lại khi xong' : '1 mảnh'}
          </Muted>
        </Panel>
      )}

      <Panel>
        <Heading note={`· khách muốn: ${SOUND_WISH[order.wish].name}`}>Dự đoán âm thanh</Heading>
        {profile ? (
          <>
            <SoundBars {...profile} target={SOUND_WISH[order.wish].target} />
            <div className="text-xs">
              Nghe giống: <b>{soundLabel(profile)}</b>
            </div>
          </>
        ) : (
          <Muted>Cần có switch + plate để dự đoán</Muted>
        )}
      </Panel>

      <Panel>
        <div className="mb-1.5 flex justify-between">
          <span>Đã chi linh kiện</span>
          <b className={over ? 'text-red' : ''}>
            {fmt(spent)} / {fmt(order.budget)}
          </b>
        </div>
        <ProgressBar value={spent / order.budget} tone={over ? 'red' : 'green'} />
        <Muted className="mt-1 block text-xs">
          {over
            ? `Lố ${fmt(spent - order.budget)}, khách chỉ trả ${fmt(order.budget)}`
            : `Còn dư ${fmt(order.budget - spent)} vào túi khi giao`}
        </Muted>
      </Panel>
      {active && !ready && !build && (
        <Muted className="mt-2">Mua đủ linh kiện còn thiếu rồi ra bàn build</Muted>
      )}
    </div>
  )
}

// Danh sách đơn (giống bảng danh sách đơn ở bàn build): mỗi đơn mở ra xem chi tiết đầy đủ
export function OrderApp() {
  const list = useOrderEntries()
  const s = useGame()
  if (!list.length)
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted">
        Chưa nhận đơn nào. Vào Mezzenger đọc tin khách rồi bấm "Nhận đơn".
        <Button tone="blue" size="sm" onClick={() => s.openApp('messenger')}>
          Mở Mezzenger
        </Button>
      </div>
    )
  const ready = !!s.order && checkInventory(s.inventory, s.order, 0).every((x) => x.ok)
  return (
    // chữ 14px đồng bộ HUD bàn build (chữ nhỏ 12 → 14px)
    <div className="flex flex-col gap-1.5 text-sm [&_.text-xs]:text-sm">
      {list.map((c) => (
        <OrderCard
          key={c.order.id}
          c={c}
          defaultOpen={c.kind === 'active'}
          detail={<OrderDetail c={c} />}
          action={
            c.kind === 'active' ? (
              <Button tone="green" size="sm" disabled={!ready && !s.build} onClick={s.startBuild}>
                {s.build ? 'Làm tiếp' : ready ? 'Ra bàn build' : 'Chưa đủ đồ'}
              </Button>
            ) : (
              <Button tone="blue" size="sm" onClick={() => s.switchJob(c.order.id)}>
                Đổi sang làm
              </Button>
            )
          }
        />
      ))}
    </div>
  )
}
