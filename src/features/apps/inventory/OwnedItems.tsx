import { useState, type ReactNode } from 'react'
import { useGame } from '@/store'
import { CATS, TOOLS, TOOL_KINDS, itemName } from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { SupplyArt, ToolArt } from '@/components/art/ToolArt'
import { PartArt } from '@/components/art/PartArt'
import { useModelThumb, type ThumbKind } from '@/features/apps/shop/modelThumb'
import { useCaseThumb } from '@/features/apps/messenger/orderThumb'
import type {
  CaseItem,
  KeycapItem,
  PartCategory,
  PcbItem,
  PlateItem,
  StabItem,
  SwitchItem,
} from '@/types'
import { Heading, Muted, Panel } from '@/components/ui'
import { cn } from '@/lib/format'
import type { ToolKind } from '@/types'

const ORDER_KEY = 'sbk-ui-inventory-order'

interface Owned {
  id: string
  name: string
  /** nhóm (loại dụng cụ / vật tư) */
  group: string
  /** ảnh vẽ SVG hiện trong lúc chụp model */
  art: ReactNode
  /** ảnh model 3D giống Shopii (case dùng ảnh vỏ case riêng) */
  thumb?: { kind: ThumbKind; type: string } | { caseId: string; color: string }
  /** số lần còn dùng được / tổng (dụng cụ có độ bền, vật tư = số lượt còn) */
  left?: number
  total?: number
  /** đang lắp dùng (dụng cụ có nhiều bậc như bút hàn / trạm hàn) */
  using?: boolean
}

/** Thứ tự ô người chơi tự xếp (tiện ích riêng máy); món mới mua nối vào cuối */
function loadOrder(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Ảnh 1 ô: model 3D chụp sẵn (cache chung với Shopii), chưa chụp xong thì hiện ảnh vẽ */
function Thumb({ it }: { it: Owned }) {
  const model = it.thumb && 'kind' in it.thumb ? it.thumb : null
  const box = it.thumb && 'caseId' in it.thumb ? it.thumb : null
  const shot = useModelThumb(model?.kind ?? null, model?.type)
  const caseShot = useCaseThumb(box?.caseId, box?.color)
  const src = shot ?? caseShot
  return (
    <div className="pointer-events-none flex h-[80px] items-center justify-center overflow-hidden rounded-lg bg-black/15">
      {src ? <img src={src} alt={it.name} className="h-full w-full object-contain" /> : it.art}
    </div>
  )
}

/** Linh kiện của đơn đang làm còn trong kho (switch còn bao nhiêu con) */
function useParts(): Owned[] {
  const inv = useGame((s) => s.inventory)
  const provided = useGame((s) => s.provided)
  const list: Owned[] = []
  for (const cat of Object.keys(CATS) as PartCategory[]) {
    const item = inv[cat]
    if (!item) continue
    const thumb: Owned['thumb'] =
      cat === 'case'
        ? { caseId: (item as CaseItem).id, color: (item as CaseItem).color }
        : cat === 'keycap'
          ? { kind: 'keycap', type: `${(item as KeycapItem).kit}:${(item as KeycapItem).color}` }
          : cat === 'pcb'
            ? {
                kind: 'pcb',
                type:
                  (item as PcbItem).model ??
                  `${(item as PcbItem).layout}:${(item as PcbItem).type}`,
              }
            : cat === 'plate'
              ? {
                  kind: 'plate',
                  type: `${(item as PlateItem).layout}:${(item as PlateItem).material}`,
                }
              : { kind: cat, type: (item as SwitchItem | StabItem).type }
    list.push({
      id: `part:${cat}`,
      name: itemName(cat, item),
      group: provided[cat] ? `${CATS[cat]} · khách gửi` : CATS[cat],
      art: <PartArt category={cat} color="#888" />,
      thumb,
      ...(cat === 'switch' ? { left: (item as SwitchItem).count } : {}),
    })
  }
  return list
}

/** Danh sách đồ đang có: dụng cụ đã mua (kể cả bút / trạm hàn cất dự phòng) + vật tư còn lượt */
function useOwned(): Owned[] {
  const parts = useParts()
  const tools = useGame((s) => s.tools)
  const wear = useGame((s) => s.wear)
  const solderOwned = useGame((s) => s.solderOwned)
  const supplies = useGame((s) => s.supplies)
  const list: Owned[] = [...parts]
  for (const [kind, levels] of Object.entries(TOOLS) as [ToolKind, typeof TOOLS.switch][]) {
    levels.forEach((t, level) => {
      if (t.none || !t.price) return
      const using = tools[kind] === level
      // bút hàn / trạm hàn đã mua nhưng đang cất (đổi qua lại được), số lần dùng lưu riêng
      const spare = kind === 'solder' && !using && solderOwned[level] !== undefined
      if (!using && !spare) return
      const used = using ? (wear[kind] ?? 0) : solderOwned[level]
      list.push({
        id: `tool:${kind}:${level}`,
        name: t.name,
        group: TOOL_KINDS[kind],
        art: <ToolArt kind={kind} level={level} />,
        thumb: { kind: 'tool', type: `${kind}:${level}` },
        ...(t.life ? { left: t.life - used, total: t.life } : {}),
        using: kind === 'solder' ? using : undefined,
      })
    })
  }
  for (const [id, n] of Object.entries(supplies)) {
    const sp = SUPPLIES[id]
    if (!sp || n <= 0) continue
    list.push({
      id: `supply:${id}`,
      name: sp.name,
      group: 'Lube & vật tư',
      art: <SupplyArt id={id} color={sp.color} />,
      thumb: { kind: sp.fit ? 'lubeJar' : 'supply', type: id },
      left: n,
    })
  }
  return list
}

/**
 * Ô vật phẩm đã mua trong Kho: kéo thả để đổi chỗ (thứ tự nhớ trên máy),
 * mỗi ô hiện số lần còn dùng được (độ bền dụng cụ / số lượt vật tư)
 */
export function OwnedItems() {
  const owned = useOwned()
  const [order, setOrder] = useState(loadOrder)
  const [dragging, setDragging] = useState<string | null>(null)
  const rank = (id: string) => {
    const i = order.indexOf(id)
    return i < 0 ? Infinity : i
  }
  const items = [...owned].sort((a, b) => rank(a.id) - rank(b.id))
  const ids = items.map((i) => i.id)
  // kéo qua ô khác thì đổi chỗ ngay để thấy trước vị trí mới
  const moveTo = (target: string) => {
    if (!dragging || dragging === target) return
    const next = ids.filter((id) => id !== dragging)
    next.splice(ids.indexOf(target), 0, dragging)
    setOrder(next)
  }
  const save = () => {
    setDragging(null)
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
    } catch {
      // không lưu được thì lần sau về thứ tự mặc định
    }
  }

  return (
    <Panel>
      <Heading note="· kéo thả để đổi chỗ">Đồ trong kho</Heading>
      {items.length ? (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {items.map((it) => {
            const low = it.total ? it.left! <= it.total * 0.1 : false
            return (
              <div
                key={it.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDragging(it.id)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  moveTo(it.id)
                }}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={save}
                title={`${it.group} · kéo để đổi chỗ`}
                className={cn(
                  'flex cursor-grab flex-col gap-1 rounded-xl border-2 bg-panel p-1.5 transition-transform active:cursor-grabbing',
                  it.using ? 'border-green' : 'border-line hover:border-white/30',
                  dragging === it.id && 'opacity-40',
                )}
              >
                <Thumb it={it} />
                <div className="text-xs leading-tight font-bold">{it.name}</div>
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-muted">{it.group}</span>
                  {it.using && <span className="font-bold text-green">Đang dùng</span>}
                </div>
                {it.left !== undefined && (
                  <div className={cn('text-xs font-extrabold', low ? 'text-yellow' : 'text-ink')}>
                    {it.total
                      ? `Còn ${it.left}/${it.total} lần`
                      : it.id === 'part:switch'
                        ? `Còn ${it.left} con`
                        : `Còn ${it.left} lượt`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <Muted>Kho đang trống. Mua linh kiện, dụng cụ, vật tư ở Shopii.</Muted>
      )}
    </Panel>
  )
}
