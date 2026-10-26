import {
  PLATELESS,
  addStab,
  checkInventory,
  stabNeed,
  stabStock,
  stabTotal,
  switchOk,
} from '@/data/parts'
import { getLayout } from '@/data/layouts'
import type {
  Inventory,
  Key,
  Order,
  PartCategory,
  PartItem,
  Spare,
  StabItem,
  SwitchItem,
} from '@/types'

// Kho chung của shop: linh kiện chưa gắn với đơn nào (mua dư, bị thay, thừa sau khi giao, đơn bị huỷ).
// Đơn nào được làm (nhận / chuyển sang) thì tự lấy món hợp yêu cầu từ kho chung (`fillFromStock`)

/** Cất 1 món vào kho chung: switch / stab cùng loại gộp số lượng, món khác (case, PCB...) xếp riêng từng cái */
export function addPart(spare: Spare, cat: PartCategory, item: PartItem | null): Spare {
  // plateless không phải món thật, không cất
  if (!item || (cat === 'plate' && (item as { material: string }).material === PLATELESS))
    return spare
  // switch lỗi để riêng từng lô (không gộp với switch tốt)
  if (cat === 'switch' && !(item as { flaw?: string }).flaw) {
    const sw = item as SwitchItem
    if (sw.count <= 0) return spare
    // giữ tiền đã trả (nếu có) theo loại để lấy ra lại vẫn tính đúng "Đã chi"
    const had = spare.switchPaid?.[sw.type]
    return {
      ...spare,
      switches: { ...spare.switches, [sw.type]: (spare.switches[sw.type] ?? 0) + sw.count },
      ...(sw.paid
        ? {
            switchPaid: {
              ...spare.switchPaid,
              [sw.type]: {
                paid: (had?.paid ?? 0) + sw.paid,
                n: (had?.n ?? 0) + (sw.paidN ?? sw.count),
              },
            },
          }
        : {}),
    }
  }
  if (cat === 'stab' && !(item as StabItem).flaw) {
    const st = item as StabItem
    const add = stabStock(st)
    if (stabTotal(add) <= 0) return spare
    const have = stabStock(spare.stabs[st.type] ?? { short: 0, long: 0, long7: 0 })
    return { ...spare, stabs: { ...spare.stabs, [st.type]: addStab(have, add) } }
  }
  return { ...spare, items: [...spare.items, { cat, item }] }
}

/** Bỏ hẳn 1 loại switch khỏi kho chung (cả tiền đã trả) */
export function dropSwitch(spare: Spare, type: string): Spare {
  return {
    ...spare,
    switches: without(spare.switches, type),
    ...(spare.switchPaid?.[type] ? { switchPaid: without(spare.switchPaid, type) } : {}),
  }
}

/** Lấy hết switch loại `type` trong kho chung (kèm tiền đã trả), gộp vào `cur` nếu cùng loại */
export function takeSwitches(spare: Spare, type: string, cur?: SwitchItem | null) {
  const n = spare.switches[type] ?? 0
  const p = spare.switchPaid?.[type]
  const same = cur?.type === type ? cur : null
  const item: SwitchItem = { ...same, type, count: (same?.count ?? 0) + n }
  if (p) {
    item.paid = (same?.paid ?? 0) + p.paid
    item.paidN = (same?.paidN ?? 0) + p.n
  }
  return { spare: dropSwitch(spare, type), item, n }
}

/** Sau khi giao: switch còn lại + stab thừa so với layout vào kho chung (stab khách gửi thì trả khách) */
export function leftoverSpare(spare: Spare, inv: Inventory, keys: Key[], stabProvided: boolean) {
  let out = addPart(
    spare,
    'switch',
    inv.switch && { type: inv.switch.type, count: inv.switch.count },
  )
  if (inv.stab && !stabProvided) {
    const have = stabStock(inv.stab)
    const need = stabNeed(keys)
    out = addPart(out, 'stab', {
      ...inv.stab,
      short: Math.max(0, have.short - need.short),
      long: Math.max(0, have.long - need.long),
      long7: Math.max(0, have.long7 - need.long7),
    })
  }
  return out
}

/** Toàn bộ linh kiện shop đã mua của 1 đơn (món khách gửi thì không) cất vào kho chung */
export function stashAll(
  spare: Spare,
  inv: Inventory,
  provided: Partial<Record<PartCategory, true>>,
) {
  let out = spare
  for (const cat of Object.keys(inv) as PartCategory[])
    if (!provided[cat]) out = addPart(out, cat, inv[cat])
  return out
}

/** Bỏ 1 loại khỏi bảng đếm */
export function without<T>(rec: Record<string, T>, key: string) {
  const out = { ...rec }
  delete out[key]
  return out
}

/** Món `cat` trong kho đơn có đạt yêu cầu đơn không */
const catOk = (inv: Inventory, order: Order, cat: PartCategory) =>
  checkInventory(inv, order).find((c) => c.cat === cat)?.ok ?? false

/**
 * Lấy đồ trong kho chung cho đơn: ô còn trống (shop chưa mua, khách không gửi) thì lấy món đầu tiên hợp yêu cầu;
 * switch / stab cùng loại đang có thì gộp thêm. `locked` = các món không đổi được nữa (đã bắt đầu build)
 */
export function fillFromStock(
  spare: Spare,
  inv: Inventory,
  order: Order,
  provided: Partial<Record<PartCategory, true>>,
): { spare: Spare; inventory: Inventory; taken: string[] } {
  let next = { ...inv }
  let sp = spare
  const taken: string[] = []
  // switch: gộp cùng loại, chưa có thì lấy loại đúng yêu cầu khách có nhiều con nhất
  const swTypes = Object.entries(sp.switches).filter(
    ([t, n]) => n > 0 && (next.switch ? next.switch.type === t : switchOk(t, order)),
  )
  if (swTypes.length) {
    const [type] = swTypes.sort((a, b) => b[1] - a[1])[0]
    const r = takeSwitches(sp, type, next.switch)
    next.switch = r.item
    sp = r.spare
    taken.push(`${r.n} switch`)
  }
  // stab: chỉ khi layout cần stab và khách không gửi
  const needStab = getLayout(order.layout, order.variant).keys.some((k) => k.stab)
  if (needStab && !provided.stab) {
    const stTypes = Object.entries(sp.stabs).filter(([t]) =>
      next.stab
        ? next.stab.type === t
        : catOk({ ...next, stab: { type: t, short: 99, long: 99, long7: 99 } }, order, 'plate') ||
          !next.plate,
    )
    if (stTypes.length) {
      const [type, entry] = stTypes.sort(
        (a, b) => stabTotal(stabStock(b[1])) - stabTotal(stabStock(a[1])),
      )[0]
      const add = stabStock(entry)
      const have = stabStock(next.stab ?? { short: 0, long: 0, long7: 0 })
      next.stab = { ...next.stab, type, ...addStab(have, add) }
      sp = { ...sp, stabs: without(sp.stabs, type) }
      taken.push(`${stabTotal(add)} stab`)
    }
  }
  // case / PCB / plate / keycap / stab lỗi: ô trống thì lấy món đầu tiên đạt yêu cầu
  const items = [...sp.items]
  for (const cat of ['case', 'pcb', 'plate', 'keycap', 'stab'] as const) {
    if (next[cat] || provided[cat]) continue
    const i = items.findIndex(
      (x) => x.cat === cat && catOk({ ...next, [cat]: x.item } as Inventory, order, cat),
    )
    if (i < 0) continue
    next = { ...next, [cat]: items[i].item }
    items.splice(i, 1)
    taken.push(cat === 'keycap' ? 'keycap' : cat === 'case' ? 'case' : cat.toUpperCase())
  }
  sp = { ...sp, items }
  return { spare: sp, inventory: next, taken }
}
