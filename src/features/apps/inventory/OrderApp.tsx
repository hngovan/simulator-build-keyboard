import { useGame } from '@/store'
import {
  CATS,
  CASES,
  MOUNTS,
  PLATELESS_MOUNTS,
  SOUND_WISH,
  STABS,
  SWITCHES,
  buildSound,
  checkInventory,
  isPlateless,
  itemName,
  partSpent,
  soundLabel,
  stabNeed,
  stabStock,
  stabText,
  switchOk,
} from '@/data/parts'
import {
  Badge,
  Button,
  Heading,
  Muted,
  OptionChip,
  OptionSelect,
  Panel,
  ProgressBar,
  SoundBars,
  StepDot,
  Toggle,
} from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import { OrderSpec } from '@/components/game/OrderSpec'
import {
  OrderCard,
  OrderListFrame,
  useOrderEntries,
  type OrderEntry,
} from '@/components/game/OrderCard'
import { buildContext } from '@/data/steps'
import type { BuildState, Inventory, PartCategory } from '@/types'
import { getLayout } from '@/data/layouts'

/**
 * Chọn loại switch dùng cho đơn đang làm (khách không đòi đích danh 1 loại): các loại đang có (đơn + kho chung) hợp loại
 * khách cần (`switchOk`). Đổi = lấy loại kia từ kho chung (`takeStock`), loại đang dùng cất lại kho. Đã cắm switch thì khoá
 */
function SwitchPick({
  order,
  current,
  build,
}: {
  order: OrderEntry['order']
  current: Inventory['switch']
  build: BuildState | null
}) {
  const spare = useGame((s) => s.spare.switches)
  const takeStock = useGame((s) => s.takeStock)
  if (order.switchType || (build && Object.keys(build.switches).length)) return null
  const types = [
    ...(current && !current.flaw ? [current.type] : []),
    ...Object.keys(spare).filter(
      (t) => spare[t] > 0 && t !== current?.type && SWITCHES[t] && switchOk(t, order),
    ),
  ]
  if (types.length < 2 && current) return null
  if (!types.length) return null
  const count = (t: string) => (t === current?.type ? current.count : 0) + (spare[t] ?? 0)
  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
      Chọn loại:
      <OptionSelect
        className="min-w-0 flex-1"
        value={Math.max(0, types.indexOf(current?.type ?? ''))}
        options={types.map((t) => ({ label: SWITCHES[t].name, note: `${count(t)} con` }))}
        onChange={(i) => types[i] !== current?.type && takeStock(`switch:${types[i]}`)}
      />
    </div>
  )
}

/** Chi tiết 1 đơn: yêu cầu khách, đối chiếu linh kiện (✓ như bàn build), mount, âm thanh, ngân sách */
function OrderDetail({ c }: { c: OrderEntry }) {
  const s = useGame()
  const { order, kind } = c
  // đơn mới chưa nhận: chỉ có yêu cầu của khách
  if (!c.session) return <OrderSpec order={order} compact />
  const active = kind === 'active'
  const { inventory, provided, mount, build } = c.session
  // chỉ tính linh kiện trong ô đối chiếu (mua dư / món bị thay / dụng cụ / vật tư không tính)
  const spent = partSpent(inventory, order, c.session.spent)
  const ctx = active ? s.ctx : mount ? buildContext(order, inventory, mount) : null
  const checks = checkInventory(inventory, order, build ? Object.keys(build.switches).length : 0)
  const ready = checks.every((x) => x.ok)
  const caseDef = inventory.case && CASES[inventory.case.id]
  const plateless = isPlateless(inventory.plate)
  const profile =
    inventory.switch && inventory.plate
      ? buildSound(inventory, mount, build, ctx?.keys.length)
      : null
  const over = spent > order.budget
  // switch / stab: ghi số khách cần / số đang có trong kho đơn (switch đã cắm thì chỉ còn cần phần chưa cắm)
  const keys = getLayout(order.layout, order.variant).keys
  const placed = build ? Object.keys(build.switches).length : 0
  const partLabel = (cat: PartCategory) => {
    const sw = inventory.switch
    if (cat === 'switch' && sw)
      return `${SWITCHES[sw.type]?.name ?? sw.type} · cần ${Math.max(0, keys.length - placed)} / kho ${sw.count}`
    const st = inventory.stab
    if (cat === 'stab' && st && keys.some((k) => k.stab))
      return `Stab ${STABS[st.type].name} · cần ${stabText(stabNeed(keys))} / kho ${stabText(stabStock(st))}`
    return itemName(cat, inventory[cat])
  }

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
                  {inventory[x.cat] && partLabel(x.cat)}
                  {provided[x.cat] && (
                    <Badge solid tone="green">
                      Khách gửi
                    </Badge>
                  )}
                  {!x.ok && <div className="text-red">{x.msg}</div>}
                  {x.cat === 'switch' && active && !provided.switch && (
                    <SwitchPick order={order} current={inventory.switch} build={build} />
                  )}
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
                // chỉ chọn mount cho đơn đang làm, chưa vào bàn build; plateless chỉ tray
                disabled={!active || !!build || (plateless && !PLATELESS_MOUNTS.includes(m))}
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
          {/* plateless: bỏ plate, switch hàn thẳng PCB (chỉ PCB hàn + tray mount) */}
          {(plateless ||
            (active && !build && !provided.plate && !order.plateMaterial && !order.foam)) && (
            <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-panel-2 px-2.5 py-2">
              {active && !build ? (
                <Toggle checked={plateless} onChange={s.setPlateless} label="Plateless" />
              ) : (
                <Badge solid tone="orange" className="ml-0">
                  Plateless
                </Badge>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <b>Plateless (không plate)</b>
                <Muted className="block text-xs">
                  Bỏ bước lắp plate, gõ mềm hơn. Bắt buộc PCB hàn + Tray mount, không dùng stab
                  plate-mount
                </Muted>
              </div>
            </div>
          )}
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
    <div className="text-sm [&_.text-xs]:text-sm">
      <OrderListFrame>
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
      </OrderListFrame>
    </div>
  )
}
