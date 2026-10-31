import { useState, type ReactNode } from 'react'
import { ShoppingCart, Volume2 } from 'lucide-react'
import { useGame } from '@/store'
import { variantText } from '@/data/layouts'
import { SUPPLIES } from '@/data/supplies'
import {
  CASES,
  CASE_COLORS,
  CATS,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  MOUNTS,
  PCB_TYPES,
  PLATELESS_MOUNTS,
  PLATES,
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
  switchWant,
} from '@/data/parts'
import { Badge, Button, OptionSelect, StepDot, TabChip, Toggle } from '@/components/ui'
import { cn, fmt } from '@/lib/format'
import { Bar, OrderCard, useOrderEntries, type OrderEntry } from '@/components/game/OrderCard'
import { CustomerAvatar } from '@/components/game/CustomerAvatar'
import { contextFor } from '@/data/steps'
import type { BuildState, Inventory, Order, PartCategory } from '@/types'
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
  order: Order
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
  if (types.length < 2) return null
  const count = (t: string) => (t === current?.type ? current.count : 0) + (spare[t] ?? 0)
  return (
    <OptionSelect
      className="mt-1 max-w-[260px]"
      value={Math.max(0, types.indexOf(current?.type ?? ''))}
      options={types.map((t) => ({ label: SWITCHES[t].name, note: `${count(t)} con` }))}
      onChange={(i) => types[i] !== current?.type && takeStock(`switch:${types[i]}`)}
    />
  )
}

/** món khách muốn (khi kho đơn chưa có): đòi đích danh thì ghi tên, không thì "Shop tự chọn" */
function wantText(cat: PartCategory, o: Order) {
  switch (cat) {
    case 'case':
      return (
        [o.caseId && CASES[o.caseId]?.name, o.caseColor && CASE_COLORS[o.caseColor].name]
          .filter(Boolean)
          .join(' · ') || 'Shop tự chọn'
      )
    case 'pcb':
      return o.pcbType ? PCB_TYPES[o.pcbType].name : 'Shop tự chọn'
    case 'plate':
      return o.plateMaterial ? PLATES[o.plateMaterial].name : 'Shop tự chọn'
    case 'stab':
      return o.stabType ? STABS[o.stabType].name : 'Shop tự chọn'
    case 'switch':
      return switchWant(o) ?? 'Shop tự chọn'
    case 'keycap':
      return [
        o.keycapKit && KEYCAP_KITS[o.keycapKit].profile.toUpperCase(),
        o.keycapMaterial && KEYCAP_MATERIALS[o.keycapMaterial].name,
        KEYCAP_COLORS[o.keycapColor].name,
      ]
        .filter(Boolean)
        .join(' · ')
  }
}

/** yêu cầu thêm của khách thành chip (biến thể layout, dây O-ring, lube, foam) */
function wishChips(o: Order) {
  return [
    ...variantText(o.variant),
    o.oring && SUPPLIES[o.oring].name.replace('Dây ', ''),
    o.lubePref === 'none' ? 'KHÔNG lube switch' : o.lubePref === 'want' && 'Lube switch',
    o.foam ? 'Foam PCB: khách muốn' : 'Foam PCB: tuỳ shop',
  ].filter((x): x is string => !!x)
}

/** Khối có tiêu đề nhỏ trong thân đơn */
function Block({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-black/20 p-2.5">
      <div className="mb-2 font-head text-sm font-extrabold">{title}</div>
      {children}
    </div>
  )
}

/** Thân 1 đơn khi mở: linh kiện cần có (mua ở Shopii), kiểu lắp, yêu cầu khách, ngân sách, nút mua đồ thiếu / ra bàn build */
function OrderDetail({ c }: { c: OrderEntry }) {
  const s = useGame()
  const { order, kind } = c
  if (!c.session) return null
  const active = kind === 'active'
  const { inventory, provided, mount, build } = c.session
  const spent = partSpent(inventory, order, c.session.spent)
  const ctx = active ? s.ctx : contextFor(order, inventory, mount)
  const placed = build ? Object.keys(build.switches).length : 0
  const checks = checkInventory(inventory, order, placed)
  const missing = checks.filter((x) => !x.ok)
  const ready = !missing.length
  const caseDef = inventory.case && CASES[inventory.case.id]
  const plateless = isPlateless(inventory.plate)
  const profile =
    inventory.switch && inventory.plate
      ? buildSound(inventory, mount, build, ctx?.keys.length)
      : null
  const keys = getLayout(order.layout, order.variant).keys
  // dòng phụ dưới tên món: switch / stab ghi số cần / số đang có
  const subOf = (cat: PartCategory) => {
    const sw = inventory.switch
    if (cat === 'switch' && sw)
      return `${SWITCHES[sw.type]?.name ?? sw.type} · cần ${Math.max(0, keys.length - placed)} / có ${sw.count}`
    const st = inventory.stab
    if (cat === 'stab' && st && keys.some((k) => k.stab))
      return `cần ${stabText(stabNeed(keys))} · có ${stabText(stabStock(st))}`
    return null
  }
  const left = order.budget - spent
  const over = left < 0
  // chọn mount / plateless chỉ khi đơn đang làm chưa vào bàn build
  const canSetup = active && !build && !!caseDef
  // plateless chỉ cho mount tray
  const mounts = caseDef
    ? caseDef.mounts.filter((m) => !plateless || PLATELESS_MOUNTS.includes(m))
    : []
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-bold">
        <span className="shrink-0">
          Linh kiện {checks.length - missing.length}/{checks.length}
        </span>
        <Bar value={(checks.length - missing.length) / checks.length} className="flex-1" />
        {missing.length > 0 && (
          <span className="max-w-[45%] truncate text-red">
            Thiếu: {missing.map((x) => CATS[x.cat]).join(', ')}
          </span>
        )}
      </div>

      <Block title="Linh kiện cần có">
        <div className="flex flex-col gap-1">
          {checks.map((x, i) => {
            const has = inventory[x.cat]
            const sub = subOf(x.cat)
            return (
              <div
                key={x.cat}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
                  !x.ok && 'bg-red/10 ring-1 ring-red/40 ring-inset',
                )}
              >
                {/* chấm ✓ / số thứ tự giống danh sách bước ở bàn build */}
                <StepDot state={x.ok ? 'done' : 'cur'}>{i + 1}</StepDot>
                <span className={cn('w-14 shrink-0 font-bold', x.ok ? 'text-muted' : 'text-red')}>
                  {CATS[x.cat]}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">
                    {has ? itemName(x.cat, has) : wantText(x.cat, order)}
                  </span>
                  {x.ok ? (
                    sub && <span className="truncate text-xs text-muted">{sub} · đủ</span>
                  ) : (
                    <span className="text-xs text-red">{x.msg}</span>
                  )}
                  {x.cat === 'switch' && active && !provided.switch && (
                    <SwitchPick order={order} current={inventory.switch} build={build} />
                  )}
                </div>
                {provided[x.cat] && (
                  <Badge solid tone="green" className="ml-0 shrink-0">
                    Khách gửi
                  </Badge>
                )}
                {!x.ok && !provided[x.cat] && (
                  <Button size="sm" tone="orange" onClick={() => s.openShop(x.cat)}>
                    Mua ở Shopii
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </Block>

      {canSetup && (
        <Block title="Kiểu lắp">
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect
              className="min-w-[180px] flex-1"
              value={Math.max(0, mounts.indexOf(mount ?? ''))}
              options={mounts.map((m) => ({
                label: MOUNTS[m].name,
                note: order.mount === m ? 'khách cần' : undefined,
              }))}
              onChange={(i) => s.setMount(mounts[i])}
            />
            {(plateless || (!provided.plate && !order.plateMaterial && !order.foam)) && (
              <label
                className="flex items-center gap-2 text-xs font-bold text-muted"
                title="Bỏ plate, switch hàn thẳng PCB: cần PCB hàn + Tray mount, không dùng stab plate-mount"
              >
                Plateless
                <Toggle checked={plateless} onChange={s.setPlateless} label="Plateless" />
              </label>
            )}
          </div>
        </Block>
      )}

      <Block title="Yêu cầu của khách">
        <div className="flex flex-wrap gap-1.5">
          {wishChips(order).map((t) => (
            <span key={t} className="rounded-lg bg-panel-2 px-2 py-1 text-xs font-bold">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-panel-2 px-2 py-1.5 text-xs">
          <Volume2 className="size-4 shrink-0 text-yellow" />
          <span className="min-w-0 flex-1 truncate font-bold">
            Âm thanh: {SOUND_WISH[order.wish].name}
          </span>
          <span className="shrink-0 text-muted">
            {profile ? `Dự đoán: ${soundLabel(profile)}` : 'Dự đoán khi có switch'}
          </span>
        </div>
      </Block>

      <Block
        title={
          <div className="flex justify-between">
            Ngân sách linh kiện
            <span className={over ? 'text-red' : 'text-green'}>
              {fmt(spent)} <span className="text-muted">/ {fmt(order.budget)}</span>
            </span>
          </div>
        }
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
          <div
            className={cn('h-full rounded-full', over ? 'bg-red' : 'bg-green')}
            style={{ width: `${Math.min(100, (spent / order.budget) * 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="text-muted">
            {over ? `Lố ${fmt(-left)}, shop chịu` : 'Phần dư sẽ là của bạn'}
          </span>
          <span className="font-bold text-green">
            Dự kiến nhận: {fmt(order.labor)} {over ? `− ${fmt(-left)}` : `+ ${fmt(left)}`}
          </span>
        </div>
      </Block>

      {active && (
        <div className="flex gap-2">
          {missing.length > 0 && !build && (
            <Button
              tone="orange"
              className="inline-flex flex-1 items-center justify-center gap-2"
              onClick={() => s.openShop(missing[0].cat)}
            >
              <ShoppingCart className="size-4" />
              Mua đồ còn thiếu ({missing.length})
            </Button>
          )}
          {ready || build ? (
            <Button tone="green" className="flex-1" onClick={s.startBuild}>
              {build ? 'Làm tiếp ở bàn build' : 'Ra bàn build'}
            </Button>
          ) : (
            <div className="grid flex-1 place-items-center rounded-[10px] border-2 border-dashed border-line px-3 text-sm font-bold text-muted">
              Ra bàn build · cần đủ {checks.length}/{checks.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type Tab = 'work' | 'wait' | 'done'

/**
 * Danh sách đơn: tab Đang làm (đơn đang làm + đơn đã nhận, mở ra xem linh kiện / yêu cầu / ngân sách) · Chờ nhận
 * (đã đóng gói, chưa gửi) · Đã giao (gửi trong ngày)
 */
export function OrderApp() {
  const list = useOrderEntries()
  const s = useGame()
  const [tab, setTab] = useState<Tab>('work')
  const waiting = s.packed.filter((p) => !p.shipped)
  const shipped = s.packed.filter((p) => p.shipped)
  const packed = tab === 'wait' ? waiting : shipped
  return (
    <div className="flex min-h-0 flex-col gap-3 text-sm">
      <div className="flex gap-1.5">
        <TabChip active={tab === 'work'} onClick={() => setTab('work')}>
          Đang làm · {list.length}
        </TabChip>
        <TabChip active={tab === 'wait'} onClick={() => setTab('wait')}>
          Chờ nhận · {waiting.length}
        </TabChip>
        <TabChip active={tab === 'done'} onClick={() => setTab('done')}>
          Đã giao{shipped.length ? ` · ${shipped.length}` : ''}
        </TabChip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tab === 'work' ? (
          list.length ? (
            list.map((c) => (
              <OrderCard
                key={c.order.id}
                c={c}
                defaultOpen={c.kind === 'active'}
                detail={<OrderDetail c={c} />}
                action={
                  c.kind === 'active' ? null : (
                    <Button tone="blue" size="sm" onClick={() => s.switchJob(c.order.id)}>
                      Nhận làm
                    </Button>
                  )
                }
              />
            ))
          ) : (
            <Empty>
              Chưa nhận đơn nào. Vào Mezzenger đọc tin khách rồi bấm "Nhận đơn".
              <Button tone="blue" size="sm" onClick={() => s.openApp('messenger')}>
                Mở Mezzenger
              </Button>
            </Empty>
          )
        ) : packed.length ? (
          packed.map((p) => (
            <div
              key={p.order.id}
              className="flex items-center gap-3 rounded-2xl bg-panel-2 px-3 py-2.5"
            >
              <CustomerAvatar
                avatar={p.order.avatar}
                customer={p.order.customer}
                className="size-11 ring-2 ring-white/15"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-head text-lg font-extrabold">
                  {p.order.customer}
                </span>
                <span className="text-xs font-bold text-muted">
                  {tab === 'wait'
                    ? 'Đã đóng gói · mang thùng ra kệ giao hàng cạnh chậu cây'
                    : `${'★'.repeat(p.result.stars)}${'☆'.repeat(5 - p.result.stars)} · ${
                        p.paid === false ? 'chưa thu tiền ở Mezzenger' : 'đã thu tiền'
                      }`}
                </span>
              </div>
              <span className="font-head text-xl font-extrabold text-green">
                {fmt(p.result.labor + p.result.reimburse)}
              </span>
            </div>
          ))
        ) : (
          <Empty>
            {tab === 'wait' ? 'Chưa có thùng nào chờ gửi' : 'Hôm nay chưa giao đơn nào'}
          </Empty>
        )}
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted">
      {children}
    </div>
  )
}
