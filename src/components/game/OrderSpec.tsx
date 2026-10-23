import type { ReactNode } from 'react'
import { LAYOUTS, variantText } from '@/data/layouts'
import {
  CASES,
  CASE_COLORS,
  KEYCAP_COLORS,
  MOUNTS,
  PCB_TYPES,
  PLATES,
  SOUND_WISH,
  STABS,
} from '@/data/parts'
import { fmt } from '@/lib/format'
import { KeyValueTable } from '@/components/ui'
import type { Order } from '@/types'

const LUBE_PREF = {
  want: 'Có, lube đúng loại mỡ',
  none: 'KHÔNG lube (giữ tiếng gốc)',
  any: 'Tuỳ shop',
} as const

/** Bảng tóm tắt yêu cầu của khách */
export function OrderSpec({ order, compact }: { order: Order; compact?: boolean }) {
  const vt = variantText(order.variant)
  const rows: [string, ReactNode][] = [
    ['Layout', `${LAYOUTS[order.layout].name}${vt.length ? ' · ' + vt.join(' · ') : ''}`],
    ['Âm thanh', SOUND_WISH[order.wish].name],
    ['Keycap', KEYCAP_COLORS[order.keycapColor].name],
  ]
  if (order.kit) {
    const k = order.kit
    rows.push(
      [
        'Kit khách gửi',
        `${CASES[k.case.id].name} (${CASE_COLORS[k.case.color].name}) · PCB ${PCB_TYPES[k.pcb.type].name} · Plate ${PLATES[k.plate.material].name}${k.stab ? ' · Stab ' + STABS[k.stab.type].name : ''}`,
      ],
      ['Mount', order.mount ? MOUNTS[order.mount].name : '—'],
    )
  } else {
    rows.push(
      ['Loại đơn', 'Mua từ A → Z'],
      ['Case', order.caseColor ? CASE_COLORS[order.caseColor].name : 'Shop tự chọn'],
    )
  }
  rows.push(
    ['Lube switch', LUBE_PREF[order.lubePref]],
    ['Budget linh kiện', fmt(order.budget)],
    ['Tiền công', fmt(order.labor)],
  )
  return <KeyValueTable rows={rows} compact={compact} />
}
