import { useState, type ReactNode } from 'react'
import { Droplet, Keyboard, LayoutGrid, PackageOpen, Wrench, type LucideIcon } from 'lucide-react'
import { useGame } from '@/store'
import {
  CATS,
  STABS,
  SWITCHES,
  TOOLS,
  TOOL_KINDS,
  itemName,
  stabStock,
  stabText,
  stabTotal,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { jobPartFree } from '@/data/selling'
import { SupplyArt, ToolArt } from '@/components/art/ToolArt'
import { PartArt } from '@/components/art/PartArt'
import { useModelThumb, type ThumbKind } from '@/features/apps/shop/modelThumb'
import { useCaseThumb } from '@/features/apps/messenger/orderThumb'
import { CaseViewer } from '@/features/apps/messenger/OrderViewer'
import { ShopProductViewer } from '@/features/apps/shop/ShopProductViewer'
import type {
  CaseItem,
  KeycapItem,
  PartCategory,
  PartItem,
  PcbItem,
  PlateItem,
  StabItem,
  SwitchItem,
} from '@/types'
import {
  Badge,
  Button,
  Empty,
  Heading,
  OptionChip,
  Panel,
  Tooltip,
  ViewHint,
} from '@/components/ui'
import { cn } from '@/lib/format'
import type { ToolKind } from '@/types'

// cùng key với bản cũ (mảng id theo thứ tự) → đọc ra thành vị trí ô
const SLOTS_KEY = 'sbk-ui-inventory-order'
/** số cột lưới + số ô tối thiểu */
const COLS = 4
const MIN_SLOTS = 12
/** số ô luôn là bội của 12 để lưới 4 / 6 cột (cửa sổ rộng) đều kín hàng */
const SLOT_STEP = 12

/** bộ lọc kho: theo tiền tố id món (part / tool / supply) */
type Filter = 'all' | 'part' | 'tool' | 'supply'
const FILTERS: { id: Filter; icon: LucideIcon; label: string }[] = [
  { id: 'all', icon: LayoutGrid, label: 'Tất cả' },
  { id: 'part', icon: Keyboard, label: 'Linh kiện (mọi đơn + kho chung)' },
  { id: 'tool', icon: Wrench, label: 'Dụng cụ' },
  { id: 'supply', icon: Droplet, label: 'Lube & vật tư' },
]
const remainText = (it: Owned) =>
  it.left === undefined
    ? null
    : it.total
      ? `Còn ${it.left}/${it.total} lần`
      : it.id.startsWith('part:')
        ? `Còn ${it.left} ${it.id.includes('stab') ? 'cái' : 'con'}`
        : `Còn ${it.left} lượt`

/** Khung xem 3D của 1 món trong kho (như Shopii), chân khung ghi nhóm + số lần còn dùng */
function ItemViewer({ it, onClose }: { it: Owned; onClose: () => void }) {
  const footer = (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      {it.tag && <b className="text-muted">{it.tag}</b>}
      {it.flaw && (
        <Badge solid tone="red" className="ml-0" title="Không lắp cho khách được, chỉ đăng bán lại">
          Hàng lỗi: {it.flaw}
        </Badge>
      )}
      {it.detail && <b className="text-yellow">{it.detail}</b>}
      {it.using && <b className="text-green">Đang dùng</b>}
      {remainText(it) && <b className="text-yellow">{remainText(it)}</b>}
      {it.sell && (
        <Button
          size="sm"
          tone="blue"
          title="Mở Hội Phím Cơ → Bài của tôi để đăng bán"
          onClick={() => {
            useGame.getState().openSell()
            onClose()
          }}
        >
          Đăng bán
        </Button>
      )}
      {it.action && (
        <Button
          size="sm"
          tone="green"
          title={it.action.title}
          onClick={() => {
            it.action!.run()
            onClose()
          }}
        >
          {it.action.label}
        </Button>
      )}
    </div>
  )
  if (it.thumb && 'caseId' in it.thumb)
    return (
      <CaseViewer
        caseId={it.thumb.caseId}
        color={it.thumb.color}
        onClose={onClose}
        footer={footer}
      />
    )
  if (!it.thumb) return null
  return (
    <ShopProductViewer
      kind={it.thumb.kind}
      type={it.thumb.type}
      title={it.name}
      onClose={onClose}
      footer={footer}
    />
  )
}

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
  /** linh kiện thuộc đơn nào / kho chung (ghi dưới tên) */
  tag?: string
  /** chi tiết số lượng (stab theo cỡ dây) hiện ở khung xem */
  detail?: string
  /** nút trong khung xem (lấy từ kho chung, cất về kho) */
  action?: { label: string; title: string; run: () => void }
  /** hàng pass lỗi (viền đỏ + badge "Hàng lỗi") */
  flaw?: string
  /** đăng bán được ở Hội Phím Cơ (kho chung, đồ đơn đã nhận chưa assem) */
  sell?: boolean
}

/** Vị trí ô người chơi tự xếp (tiện ích riêng máy): phần tử i = id món ở ô i, null = ô trống */
function loadSlots(): (string | null)[] {
  try {
    const v = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '[]')
    return Array.isArray(v) ? v : []
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
    <div className="pointer-events-none flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black/15">
      {src ? <img src={src} alt={it.name} className="h-full w-full object-contain" /> : it.art}
    </div>
  )
}

/** Ảnh model 3D của 1 linh kiện (case dùng ảnh vỏ case riêng) */
function partThumb(cat: PartCategory, item: PartItem): Owned['thumb'] {
  if (cat === 'case') return { caseId: (item as CaseItem).id, color: (item as CaseItem).color }
  if (cat === 'keycap')
    return { kind: 'keycap', type: `${(item as KeycapItem).kit}:${(item as KeycapItem).color}` }
  if (cat === 'pcb')
    return { kind: 'pcb', type: `${(item as PcbItem).layout}:${(item as PcbItem).type}` }
  if (cat === 'plate')
    return { kind: 'plate', type: `${(item as PlateItem).layout}:${(item as PlateItem).material}` }
  return { kind: cat, type: (item as SwitchItem | StabItem).type }
}

/** 1 linh kiện thành 1 ô kho; switch hiện số con, stab hiện số cái */
function partOwned(
  id: string,
  cat: PartCategory,
  item: PartItem,
  group: string,
  extra: Partial<Owned> = {},
): Owned {
  const left =
    cat === 'switch'
      ? (item as SwitchItem).count
      : cat === 'stab'
        ? stabTotal(stabStock(item as StabItem))
        : undefined
  return {
    id,
    // số lượng đã có badge ở góc ô: tên chỉ ghi loại (bỏ × 450 / (4 ngắn + 1 dài))
    name:
      cat === 'switch'
        ? SWITCHES[(item as SwitchItem).type].name
        : cat === 'stab'
          ? `Stab ${STABS[(item as StabItem).type].name}`
          : itemName(cat, item),
    group,
    art: <PartArt category={cat} color="#888" />,
    thumb: partThumb(cat, item),
    ...(left !== undefined ? { left } : {}),
    ...(cat === 'stab' ? { detail: stabText(stabStock(item as StabItem)) } : {}),
    ...((item as { flaw?: string }).flaw ? { flaw: (item as { flaw: string }).flaw } : {}),
    ...extra,
  }
}

/**
 * Linh kiện của shop: đơn đang làm, đơn đang chờ (ghi tên khách) và kho chung (mua dư, bị thay, thừa sau khi giao).
 * Đồ trong kho chung tự vào đơn hợp yêu cầu khi nhận / chuyển đơn, hoặc bấm vào ô để lấy
 */
function useParts(): Owned[] {
  const inv = useGame((s) => s.inventory)
  const provided = useGame((s) => s.provided)
  const order = useGame((s) => s.order)
  const result = useGame((s) => s.result)
  const build = useGame((s) => s.build)
  const jobs = useGame((s) => s.jobs)
  const spare = useGame((s) => s.spare)
  const { takeStock, releasePart } = useGame.getState()
  const list: Owned[] = []
  const cats = Object.keys(CATS) as PartCategory[]
  for (const cat of cats) {
    const item = inv[cat]
    if (!item) continue
    list.push(
      partOwned(`part:${cat}`, cat, item, provided[cat] ? `${CATS[cat]} · khách gửi` : CATS[cat], {
        tag: order ? `Đơn ${order.customer}` : undefined,
        using: true,
        sell: !!order && !result && jobPartFree(cat, item, build),
      }),
    )
  }
  for (const j of jobs)
    for (const cat of cats) {
      const item = j.session.inventory[cat]
      if (!item) continue
      const free = !j.session.build && !j.session.provided[cat]
      list.push(
        partOwned(`part:job:${j.order.id}:${cat}`, cat, item, CATS[cat], {
          tag: `Đơn ${j.order.customer}`,
          sell: jobPartFree(cat, item, j.session.build),
          action: free
            ? {
                label: 'Cất về kho chung',
                title: 'Bỏ món này khỏi đơn đang chờ để đơn khác dùng',
                run: () => releasePart(j.order.id, cat),
              }
            : undefined,
        }),
      )
    }
  const canTake = !!order && !result
  const take = (key: string) =>
    canTake
      ? { label: 'Dùng cho đơn đang làm', title: 'Lấy vào đơn đang làm', run: () => takeStock(key) }
      : undefined
  for (const [type, n] of Object.entries(spare.switches))
    if (n > 0)
      list.push(
        partOwned(`part:stock:switch:${type}`, 'switch', { type, count: n }, CATS.switch, {
          tag: 'Kho chung',
          sell: true,
          action: take(`switch:${type}`),
        }),
      )
  for (const [type, st] of Object.entries(spare.stabs))
    if (stabTotal(stabStock(st)) > 0)
      list.push(
        partOwned(`part:stock:stab:${type}`, 'stab', { type, ...st }, CATS.stab, {
          tag: 'Kho chung',
          sell: true,
          action: take(`stab:${type}`),
        }),
      )
  spare.items.forEach((x, i) =>
    list.push(
      partOwned(`part:stock:item:${i}:${x.cat}`, x.cat, x.item, CATS[x.cat], {
        tag: 'Kho chung',
        sell: true,
        action: take(`item:${i}`),
      }),
    ),
  )
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
      group: sp.spell ? 'Sách phép' : 'Lube & vật tư',
      art: <SupplyArt id={id} color={sp.color} />,
      thumb: { kind: sp.fit ? 'lubeJar' : 'supply', type: id },
      left: n,
    })
  }
  return list
}

/**
 * Kho kiểu túi đồ trong game: lưới ô cố định (ô trống cũng hiện khung lõm), kéo món đồ thả vào ô bất kỳ,
 * thả lên ô đã có đồ thì 2 món đổi chỗ; vị trí ô nhớ trên máy, món mới mua vào ô trống đầu tiên.
 * Mỗi ô hiện số lần còn dùng được (độ bền dụng cụ / số lượt vật tư)
 */
export function OwnedItems() {
  const owned = useOwned()
  const [saved, setSaved] = useState(loadSlots)
  const [dragging, setDragging] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [viewing, setViewing] = useState<Owned | null>(null)
  const byId = new Map(owned.map((it) => [it.id, it]))
  // xếp đồ vào ô: giữ ô đã lưu, món mới vào ô trống đầu tiên
  const slots: (string | null)[] = saved.map((id) => (id && byId.has(id) ? id : null))
  for (const it of owned) {
    if (slots.includes(it.id)) continue
    const free = slots.indexOf(null)
    if (free < 0) slots.push(it.id)
    else slots[free] = it.id
  }
  // đủ ít nhất MIN_SLOTS ô, luôn dư 1 hàng trống ở cuối để kéo đồ xuống
  const last = slots.reduce((a, id, i) => (id ? i : a), -1)
  const count = Math.max(
    MIN_SLOTS,
    Math.ceil(((Math.ceil((last + 1) / COLS) + 1) * COLS) / SLOT_STEP) * SLOT_STEP,
  )
  while (slots.length < count) slots.push(null)
  slots.length = count
  // đang lọc: chỉ hiện món khớp (giữ thứ tự ô), không kéo thả
  const shown = filter === 'all' ? slots : slots.filter((id) => id?.startsWith(`${filter}:`))

  const drop = (target: number) => {
    const from = dragging ? slots.indexOf(dragging) : -1
    if (from >= 0 && from !== target) {
      const next = [...slots]
      ;[next[from], next[target]] = [next[target], next[from]]
      setSaved(next)
      try {
        localStorage.setItem(SLOTS_KEY, JSON.stringify(next))
      } catch {
        // không lưu được thì lần sau về chỗ mặc định
      }
    }
    setDragging(null)
    setHover(null)
  }

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <Heading>Đồ trong kho</Heading>
        {/* bộ lọc icon + số món: nút khối như OptionChip, đang chọn viền + icon vàng */}
        <div className="mb-2 flex gap-1.5">
          {FILTERS.map(({ id, icon: Icon, label }) => {
            const n =
              id === 'all' ? owned.length : owned.filter((o) => o.id.startsWith(`${id}:`)).length
            return (
              <Tooltip key={id} label={label}>
                <OptionChip
                  type="button"
                  aria-label={label}
                  aria-pressed={filter === id}
                  active={filter === id}
                  onClick={() => setFilter(id)}
                  className="h-8 cursor-pointer items-center! gap-1.5 leading-none"
                >
                  {/* icon + số món hiện luôn cạnh bộ lọc */}
                  <Icon className="size-4" />
                  <span className="flex h-4 items-center text-[13px] leading-none font-extrabold tabular-nums">
                    {n}
                  </span>
                </OptionChip>
              </Tooltip>
            )
          })}
        </div>
      </div>
      {!owned.length && (
        <div className="mb-2">
          <Empty icon={<PackageOpen />}>
            Kho đang trống. Mua linh kiện, dụng cụ, vật tư ở Shopii.
          </Empty>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-black/20 p-2 @3xl:grid-cols-6 @3xl:gap-3">
        {filter !== 'all' && !shown.length && (
          <div className="col-span-4 @3xl:col-span-6">
            <Empty icon={<PackageOpen />}>Không có món nào trong mục này.</Empty>
          </div>
        )}
        {shown.map((id, i) => {
          const it = id ? byId.get(id) : undefined
          const low = it?.total ? it.left! <= it.total * 0.1 : false
          return (
            // ô lưới: khung lõm tối; đang kéo qua thì viền vàng
            <div
              key={i}
              onDragOver={(e) => {
                e.preventDefault()
                if (hover !== i) setHover(i)
              }}
              onDragLeave={() => hover === i && setHover(null)}
              onDrop={(e) => {
                e.preventDefault()
                drop(i)
              }}
              className={cn(
                'aspect-square rounded-lg border-2 shadow-[inset_0_3px_0_rgba(0,0,0,0.35)] transition-colors',
                hover === i && dragging
                  ? 'border-yellow bg-yellow/10'
                  : 'border-black/40 bg-black/25',
              )}
            >
              {it && (
                <Tooltip label={it.name} side="top" hidden={!!dragging} className="flex size-full">
                  <div
                    draggable={filter === 'all'}
                    onClick={() => setViewing(it)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging(it.id)
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setHover(null)
                    }}
                    className={cn(
                      'group relative flex h-full w-full cursor-pointer flex-col gap-1 overflow-hidden rounded-md border-2 bg-panel p-1.5 active:cursor-grabbing',
                      it.flaw
                        ? 'border-red shadow-[0_0_0_2px_rgba(255,80,80,0.35)]'
                        : it.using
                          ? 'border-green'
                          : 'border-line hover:border-white/30',
                      dragging === it.id && 'opacity-40',
                    )}
                  >
                    <Thumb it={it} />
                    <ViewHint className="top-2 right-2 bottom-auto" />
                    {it.flaw && (
                      <Badge
                        solid
                        tone="red"
                        className="pointer-events-none absolute right-2 bottom-9 ml-0 px-1.5 text-[10px]"
                      >
                        Hàng lỗi
                      </Badge>
                    )}
                    <div className="truncate text-xs leading-tight font-bold">{it.name}</div>
                    {it.tag && (
                      <div
                        className={cn(
                          'truncate text-[10px] leading-tight font-bold',
                          it.tag === 'Kho chung' ? 'text-yellow' : 'text-muted',
                        )}
                      >
                        {it.tag}
                      </div>
                    )}
                    {/* số lần / lượt còn lại: badge tròn góc ảnh (đang dùng = viền xanh) */}
                    {it.left !== undefined && (
                      <span
                        aria-label={remainText(it) ?? undefined}
                        className={cn(
                          'pointer-events-none absolute top-2 left-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-black/40 px-1.5 text-[11px] font-extrabold shadow-[0_2px_0_rgba(0,0,0,0.35)]',
                          !it.total
                            ? 'bg-blue text-white'
                            : low
                              ? 'bg-red text-white'
                              : it.left! <= it.total * 0.5
                                ? 'bg-yellow text-[#3a2b00]'
                                : 'bg-green text-[#0d2a17]',
                        )}
                      >
                        {it.left}
                      </span>
                    )}
                  </div>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>
      {viewing && <ItemViewer it={viewing} onClose={() => setViewing(null)} />}
    </Panel>
  )
}
