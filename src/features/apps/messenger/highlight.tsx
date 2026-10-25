import type { ReactNode } from 'react'
import { LAYOUTS } from '@/data/layouts'
import {
  CASES,
  CASE_COLORS,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  KEYCAP_MATERIALS,
  MOUNTS,
  PLATES,
  STABS,
  SWITCHES,
  SWITCH_KINDS,
} from '@/data/parts'
import type { Order } from '@/types'
import { withEmotes } from './emotes'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Từ cần chú ý trong tin nhắn của khách: [regex, class màu] (in đậm + đổi màu) */
function termsOf(order: Order): [RegExp, string][] {
  const words = [
    LAYOUTS[order.layout].name,
    order.switchKind && SWITCH_KINDS[order.switchKind],
    order.switchType && SWITCHES[order.switchType]?.name,
    order.caseId && CASES[order.caseId]?.name,
    order.stabType && STABS[order.stabType]?.name,
    order.plateMaterial && PLATES[order.plateMaterial]?.name,
    order.keycapKit && KEYCAP_KITS[order.keycapKit]?.profile.toUpperCase(),
    order.keycapKit && KEYCAP_KITS[order.keycapKit]?.name,
    order.keycapMaterial && KEYCAP_MATERIALS[order.keycapMaterial]?.name,
    KEYCAP_COLORS[order.keycapColor]?.name.toLowerCase(),
    order.caseColor && CASE_COLORS[order.caseColor]?.name.toLowerCase(),
    order.mount && MOUNTS[order.mount]?.name,
    // đồ khách gửi kèm
    order.kit?.case && CASES[order.kit.case.id]?.name,
    order.kit?.plate && PLATES[order.kit.plate.material]?.name,
    order.kit?.stab && STABS[order.kit.stab.type]?.name,
  ].filter((w): w is string => !!w)
  return [
    // tiền: budget / tiền công
    [/\d[\d.,]*k\b/g, 'text-green'],
    // hạn, điều cấm
    [/\d+ ngày|đừng lube switch|KHÔNG|lạch cạch|trễ/g, 'text-red'],
    // yêu cầu bắt buộc về mạch / lube / stab
    [/HÀN \(solder\)|hotswap|lube switch|lube đúng loại mỡ|stab phải êm/gi, 'text-orange'],
    ...words.map((w): [RegExp, string] => [new RegExp(escape(w), 'g'), 'text-yellow']),
  ]
}

/** Tin nhắn khách: in đậm + tô màu các chi tiết cần chú ý của đơn */
export function Highlight({ text, order }: { text: string; order: Order }) {
  const terms = termsOf(order)
  const out: ReactNode[] = []
  let rest = text
  while (rest) {
    // khớp sớm nhất (bằng nhau thì lấy chuỗi dài hơn)
    let best: { index: number; len: number; cls: string } | null = null
    for (const [re, cls] of terms) {
      re.lastIndex = 0
      const m = re.exec(rest)
      if (
        m &&
        (!best || m.index < best.index || (m.index === best.index && m[0].length > best.len))
      )
        best = { index: m.index, len: m[0].length, cls }
    }
    if (!best) {
      out.push(withEmotes(rest))
      break
    }
    if (best.index) out.push(withEmotes(rest.slice(0, best.index)))
    out.push(
      <b key={out.length} className={best.cls}>
        {rest.slice(best.index, best.index + best.len)}
      </b>,
    )
    rest = rest.slice(best.index + best.len)
  }
  return <>{out}</>
}
