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
import { SUPPLIES } from '@/data/supplies'
import {
  Badge,
  Button,
  Heading,
  Muted,
  OptionChip,
  Panel,
  ProgressBar,
  SoundBars,
} from '@/components/ui'
import { cn, fmt } from '@/lib/format'

// Kho đồ: kiểm tra linh kiện, chọn mount, dự đoán âm thanh, vật tư, ngân sách
export function InventoryApp() {
  const s = useGame()
  const { order, inventory, provided, mount, build, ctx, spent, supplies } = s
  if (!order)
    return (
      <div className="p-8 text-center text-muted">Chưa có đơn nào. Mở tin nhắn để nhận đơn.</div>
    )

  const checks = checkInventory(inventory, order, build ? Object.keys(build.switches).length : 0)
  const ready = checks.every((c) => c.ok)
  const caseDef = inventory.case && CASES[inventory.case.id]
  const profile =
    inventory.switch && inventory.plate
      ? buildSound(inventory, mount, build, ctx?.keys.length)
      : null
  const over = spent > order.budget

  return (
    <div>
      <table className="w-full border-collapse">
        <tbody>
          {checks.map((c) => (
            <tr
              key={c.cat}
              className={cn('border-b border-dashed border-line', !c.ok && 'bg-red/5')}
            >
              <td className="p-1.5 align-top">{c.ok ? '✅' : '❌'}</td>
              <td className="p-1.5 align-top font-bold">{CATS[c.cat]}</td>
              <td className="p-1.5 align-top">
                {itemName(c.cat, inventory[c.cat])}
                {provided[c.cat] && <Badge tone="blue">Khách gửi</Badge>}
                {!c.ok && <div className="text-xs text-red">{c.msg}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
                disabled={!!build}
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
            <SoundBars {...profile} />
            <div className="text-xs">
              Nghe giống: <b>{soundLabel(profile)}</b>
            </div>
          </>
        ) : (
          <Muted>Cần có switch + plate để dự đoán</Muted>
        )}
      </Panel>

      <Panel>
        <Heading note="· mua ở Shopii hoặc chợ, dùng cho nhiều đơn">Lube & vật tư</Heading>
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] gap-1.5">
          {Object.entries(SUPPLIES).map(([id, sp]) => (
            <div
              key={id}
              className="flex justify-between gap-1.5 rounded-lg bg-panel px-2 py-1.5 text-xs"
            >
              <span>{sp.name}</span>
              <b className={supplies[id] ? '' : 'text-red'}>{supplies[id] ?? 0}</b>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="mb-1.5 flex justify-between">
          <span>Đã chi linh kiện</span>
          <b className={over ? 'text-red' : ''}>
            {fmt(spent)} / {fmt(order.budget)}
          </b>
        </div>
        <ProgressBar value={spent / order.budget} tone={over ? 'over' : 'loud'} />
      </Panel>

      <Button tone="green" size="lg" wide disabled={!ready && !build} onClick={s.startBuild}>
        {build ? '🛠 Quay lại bàn build' : ready ? '🛠 Ra bàn build' : 'Chưa đủ linh kiện'}
      </Button>
    </div>
  )
}
