import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, ListFilter } from 'lucide-react'
import { cn, fmt } from '@/lib/format'
import type { ProductOption } from '@/types'

/** khoảng cách tối thiểu tới mép màn hình / nút (px) */
const EDGE = 8

/**
 * Popup nổi gắn theo nút (portal ra `body`, `position: fixed`): không bị khung cuộn (cột trái / lưới sản phẩm) cắt hay đẩy
 * thanh cuộn ngang. Bên dưới không đủ chỗ thì lật lên trên nút; cao quá chỗ trống thì cuộn trong popup.
 * Bấm ra ngoài (không phải nút / popup) thì đóng
 */
function Floating({
  anchor,
  onClose,
  width,
  className,
  children,
}: {
  anchor: RefObject<HTMLElement>
  onClose: () => void
  /** bề rộng px; không có = bằng nút (tối thiểu 200) */
  width?: number
  className?: string
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{
    left: number
    width: number
    top?: number
    bottom?: number
    maxHeight: number
  } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect()
      if (!a) return
      const w = Math.min(width ?? Math.max(200, a.width), innerWidth - EDGE * 2)
      const left = Math.min(Math.max(EDGE, a.left), innerWidth - w - EDGE)
      const below = innerHeight - a.bottom - EDGE * 2
      const above = a.top - EDGE * 2
      const need = box.current?.scrollHeight ?? 0
      // dưới không đủ mà trên rộng hơn: lật lên
      setPos(
        need > below && above > below
          ? { left, width: w, bottom: innerHeight - a.top + 4, maxHeight: above }
          : { left, width: w, top: a.bottom + 4, maxHeight: below },
      )
    }
    place()
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !anchor.current?.contains(t)) onClose()
    }
    addEventListener('resize', place)
    // cuộn bất kỳ khung nào (cột trái, lưới, cửa sổ) thì đặt lại theo nút
    addEventListener('scroll', place, true)
    addEventListener('pointerdown', close)
    return () => {
      removeEventListener('resize', place)
      removeEventListener('scroll', place, true)
      removeEventListener('pointerdown', close)
    }
  }, [anchor, width, onClose])
  return createPortal(
    <div
      ref={box}
      role="listbox"
      style={pos ?? { left: 0, top: 0 }}
      className={cn(
        'fixed z-[2000] overflow-y-auto rounded-xl bg-[#1b2130] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10',
        // lần vẽ đầu chỉ để đo chiều cao, chưa hiện
        !pos && 'invisible',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}

/** 1 dòng chọn trong popup (cùng kiểu menu lọc hội thoại Mezzenger) */
function Row({
  active,
  swatch,
  label,
  note,
  onClick,
}: {
  active: boolean
  swatch?: string
  label: string
  note?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-head text-sm font-extrabold transition-colors',
        active ? 'bg-yellow/15 text-yellow' : 'text-ink/85 hover:bg-white/5',
      )}
    >
      {swatch && (
        <i
          className="size-3 shrink-0 rounded-full border-2 border-black/40"
          style={{ background: swatch }}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {note && <span className="shrink-0 text-xs text-muted">{note}</span>}
      <Check className={cn('size-4 shrink-0', !active && 'invisible')} />
    </button>
  )
}

/** nút mở popup lọc: mở (hoặc đang lọc) = vàng */
function TriggerButton({
  btn,
  open,
  lit,
  title,
  onClick,
  children,
}: {
  btn: RefObject<HTMLButtonElement>
  open: boolean
  lit?: boolean
  title?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      ref={btn}
      type="button"
      title={title}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-head text-sm font-extrabold transition-colors',
        open || lit ? 'bg-yellow text-[#3a2b00]' : 'bg-black/25 text-ink hover:bg-black/35',
      )}
    >
      {children}
      <ListFilter className="size-4 shrink-0" />
    </button>
  )
}

/**
 * Chọn option sản phẩm Shopii kiểu nút lọc (như lọc hội thoại ở chat): nút hiện lựa chọn hiện tại, bấm mở popup
 * 2 cột nằm ngang: chất liệu (nhóm, kèm giá) | màu / loại. Giá chỉ hiện ở cột nào có giá khác nhau
 * (case: màu nào cũng cùng giá, chỉ khác giá theo chất liệu)
 */
export function OptionFilter({
  options,
  groups,
  shown,
  sel,
  onGroup,
  onPick,
}: {
  options: ProductOption[]
  /** nhóm cấp 1 (chất liệu case); < 2 nhóm thì chỉ 1 cột */
  groups: string[]
  /** option của nhóm đang chọn: [option, chỉ số trong `options`] */
  shown: (readonly [ProductOption, number])[]
  sel: number
  onGroup: (gi: number) => void
  onPick: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const opt = options[sel] ?? options[0]
  const twoCols = groups.length > 1
  const groupPrice = (g: string) => options.find((o) => o.group === g)!.price
  const groupNotes = new Set(groups.map(groupPrice)).size > 1
  const optNotes = new Set(shown.map(([o]) => o.price)).size > 1
  return (
    <>
      <TriggerButton
        btn={btn}
        open={open}
        title="Chọn loại sản phẩm"
        onClick={() => setOpen((o) => !o)}
      >
        <i
          className="size-3 shrink-0 rounded-full border-2 border-black/40"
          style={{ background: opt.swatch }}
        />
        <span className="min-w-0 flex-1 truncate">
          {twoCols && opt.group ? `${opt.group} · ${opt.label}` : opt.label}
        </span>
      </TriggerButton>
      {open && (
        <Floating
          anchor={btn}
          onClose={() => setOpen(false)}
          width={twoCols ? 360 : undefined}
          className="flex gap-1"
        >
          {twoCols && (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="px-2.5 pt-1 pb-0.5 text-xs font-bold text-muted">Chất liệu</div>
              {groups.map((g, gi) => (
                <Row
                  key={g}
                  active={g === opt.group}
                  label={g}
                  note={groupNotes ? fmt(groupPrice(g)) : undefined}
                  // đổi chất liệu: giữ popup mở để chọn tiếp màu
                  onClick={() => onGroup(gi)}
                />
              ))}
            </div>
          )}
          <div
            className={cn(
              'flex min-w-0 flex-1 flex-col',
              twoCols && 'border-l border-white/10 pl-1',
            )}
          >
            <div className="px-2.5 pt-1 pb-0.5 text-xs font-bold text-muted">
              {twoCols ? 'Màu' : 'Lựa chọn'}
            </div>
            {shown.map(([o, i]) => (
              <Row
                key={i}
                active={i === sel}
                swatch={o.swatch}
                label={o.label}
                note={optNotes ? fmt(o.price) : undefined}
                onClick={() => {
                  onPick(i)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </Floating>
      )}
    </>
  )
}

/** Nút lọc 1 cột cùng kiểu `OptionFilter` (bộ lọc trong mục, cạnh ô tìm trên lưới sản phẩm Shopii): nút hiện mục đang chọn, popup danh sách + số khớp */
export function ListFilterPicker({
  items,
  value,
  onChange,
  title,
}: {
  items: { label: string; note?: string }[]
  value: number
  onChange: (i: number) => void
  /** tooltip nút */
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const cur = items[value] ?? items[0]
  return (
    <>
      <TriggerButton
        btn={btn}
        open={open}
        lit={value > 0}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate">{cur.label}</span>
        {cur.note && <span className="shrink-0 text-xs opacity-70">{cur.note}</span>}
      </TriggerButton>
      {open && (
        <Floating anchor={btn} onClose={() => setOpen(false)} className="flex flex-col">
          {items.map((it, i) => (
            <Row
              key={it.label}
              active={i === value}
              label={it.label}
              note={it.note}
              onClick={() => {
                onChange(i)
                setOpen(false)
              }}
            />
          ))}
        </Floating>
      )}
    </>
  )
}
