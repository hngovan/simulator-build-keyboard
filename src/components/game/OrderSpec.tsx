import type { ReactNode } from 'react'
import { LAYOUTS, variantText } from '@/data/layouts'
import { SUPPLIES } from '@/data/supplies'
import {
  CASES,
  CASE_COLORS,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  MOUNTS,
  PCB_TYPES,
  pcbLabel,
  PLATES,
  SOUND_WISH,
  STABS,
  switchWant,
} from '@/data/parts'
import { cn, fmt } from '@/lib/format'
import { KeyValueTable } from '@/components/ui'
import type { Order } from '@/types'

const LUBE_PREF = {
  want: 'Có, lube đúng loại mỡ',
  none: 'KHÔNG lube (giữ tiếng gốc)',
  any: 'Tuỳ shop',
} as const

/** Khối "Kit khách gửi" trên đầu: chữ xanh, mỗi món 1 dòng = đã có sẵn, không cần mua */
function KitBox({ order, compact }: { order: Order; compact?: boolean }) {
  const k = order.kit!
  // khách chỉ gửi 1 vài món: liệt kê món nào có
  const items = [
    // tên case chung đã có chữ "Case" (vd "Case 75% mica") thì không thêm nữa
    k.case &&
      `${/^case /i.test(CASES[k.case.id].name) ? '' : 'Case '}${CASES[k.case.id].name} (${CASE_COLORS[k.case.color].name})`,
    k.pcb && `PCB ${pcbLabel(k.pcb)}`,
    k.plate && `Plate ${PLATES[k.plate.material].name}`,
    k.stab && `Stab ${STABS[k.stab.type].name}`,
  ].filter((x): x is string => !!x)
  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-green/40 bg-green/10 px-2.5 py-1.5 text-[#9fe6b6]',
        compact ? 'text-xs' : 'text-sm',
      )}
    >
      <div className="font-extrabold">📦 Kit khách gửi (có sẵn, không cần mua)</div>
      <ul className="mt-0.5 list-disc pl-5">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

/** Bảng tóm tắt yêu cầu của khách; đơn kit thì liệt kê đồ khách gửi trên đầu */
export function OrderSpec({
  order,
  compact,
  mount,
}: {
  order: Order
  compact?: boolean
  /** kiểu mount đang build (bàn build): luôn hiện dòng Mount, ghi chú nếu khách đòi mount khác */
  mount?: string | null
}) {
  const vt = variantText(order.variant)
  const rows: [string, ReactNode][] = [
    ['Layout', `${LAYOUTS[order.layout].name}${vt.length ? ' · ' + vt.join(' · ') : ''}`],
    ['Âm thanh', SOUND_WISH[order.wish].name],
    ['Switch', switchWant(order) ?? 'Shop tự chọn'],
    [
      'Keycap',
      [
        order.keycapKit && KEYCAP_KITS[order.keycapKit].profile.toUpperCase(),
        order.keycapMaterial && KEYCAP_MATERIALS[order.keycapMaterial].name,
        KEYCAP_COLORS[order.keycapColor].name,
      ]
        .filter(Boolean)
        .join(' · '),
    ],
  ]
  // kit chỉ có 1 vài món: món nào khách không gửi thì hiện yêu cầu như đơn mua đủ
  const k = order.kit
  if (!k) rows.push(['Loại đơn', 'Mua từ A → Z'])
  // mount: đang build thì hiện mount đã chọn; khách gửi case / đòi mount (vd O-ring) thì hiện yêu cầu
  const want = order.mount
  if (mount)
    rows.push([
      'Mount',
      `${MOUNTS[mount].name}${want ? (want === mount ? ' (khách yêu cầu)' : ` · khách cần ${MOUNTS[want].name}`) : ''}`,
    ])
  else if (k?.case || want) rows.push(['Mount', want ? MOUNTS[want].name : '—'])
  if (order.oring) rows.push(['Dây O-ring', SUPPLIES[order.oring].name.replace('Dây O-ring ', '')])
  if (!k?.case)
    rows.push([
      'Case',
      [
        order.caseId && CASES[order.caseId]?.name,
        order.caseColor && CASE_COLORS[order.caseColor].name,
      ]
        .filter(Boolean)
        .join(' · ') || 'Shop tự chọn',
    ])
  if (!k?.pcb) rows.push(['PCB', order.pcbType ? PCB_TYPES[order.pcbType].name : 'Shop tự chọn'])
  if (!k?.plate)
    rows.push(['Plate', order.plateMaterial ? PLATES[order.plateMaterial].name : 'Shop tự chọn'])
  if (order.stabType && !k?.stab) rows.push(['Stab', STABS[order.stabType].name])
  rows.push(
    ['Lube switch', LUBE_PREF[order.lubePref]],
    ['Foam PCB', order.foam ? 'Khách muốn lót foam' : 'Tuỳ shop'],
    ['Budget linh kiện', fmt(order.budget)],
    ['Tiền công', fmt(order.labor)],
  )
  return (
    <>
      {order.kit && <KitBox order={order} compact={compact} />}
      <KeyValueTable rows={rows} compact={compact} />
    </>
  )
}
