import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/format'

interface Option {
  label: string
  swatch?: string
  /** chữ phụ bên phải (giá...) */
  note?: string
}

/** cách mép màn hình (px) và cao tối đa danh sách */
const EDGE = 8
const MAX_H = 240

/**
 * Chọn 1 option dạng đổ xuống (thay hàng OptionChip khi có nhiều lựa chọn), cùng kiểu khối như OptionChip.
 * Danh sách vẽ ra `document.body` (fixed theo nút) để khung cuộn chứa nút (giỏ hàng...) không cắt mất;
 * dưới không đủ chỗ thì lật lên trên, cuộn khung nào cũng đặt lại theo nút
 */
export function OptionSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: Option[]
  value: number
  onChange: (i: number) => void
  className?: string
}) {
  const [open, setOpenState] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [pos, setPos] = useState<{
    left: number
    width: number
    top?: number
    bottom?: number
    maxHeight: number
  } | null>(null)
  // đóng thì xoá vị trí: lần mở sau đo lại (lần vẽ đầu ẩn để đo chiều cao)
  const setOpen = (v: boolean) => {
    setOpenState(v)
    if (!v) setPos(null)
  }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = box.current?.getBoundingClientRect()
      if (!a) return
      const width = Math.min(a.width, innerWidth - EDGE * 2)
      const left = Math.min(Math.max(EDGE, a.left), innerWidth - width - EDGE)
      const below = innerHeight - a.bottom - EDGE * 2
      const above = a.top - EDGE * 2
      const need = Math.min(MAX_H, list.current?.scrollHeight ?? 0)
      setPos(
        need > below && above > below
          ? { left, width, bottom: innerHeight - a.top + 4, maxHeight: Math.min(MAX_H, above) }
          : { left, width, top: a.bottom + 4, maxHeight: Math.min(MAX_H, below) },
      )
    }
    place()
    addEventListener('resize', place)
    // cuộn khung ngoài thì đặt lại theo nút; cuộn chính danh sách thì thôi
    const onScroll = (e: Event) => e.target !== list.current && place()
    addEventListener('scroll', onScroll, true)
    return () => {
      removeEventListener('resize', place)
      removeEventListener('scroll', onScroll, true)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !list.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  // mở ra (vừa có vị trí lần đầu) thì cuộn tới option đang chọn 1 lần; sau đó để người chơi tự cuộn
  const shown = !!pos
  useEffect(() => {
    if (shown)
      list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [shown])
  const cur = options[value]
  const swatch = (s?: string) =>
    s && (
      <i
        className="size-3 shrink-0 rounded-sm border-2 border-black/40"
        style={{ background: s }}
      />
    )
  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-1.5 rounded-md border-2 px-2.5 py-1 text-xs font-bold',
          'shadow-[0_3px_0_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color] duration-100',
          open
            ? 'border-yellow bg-[#4a3f1a] text-yellow'
            : 'border-[#4a5670] bg-[#2b3447] text-ink hover:border-[#6b7a99]',
        )}
      >
        {swatch(cur?.swatch)}
        <span className="min-w-0 flex-1 truncate text-left">{cur?.label}</span>
        {cur?.note && <span className="shrink-0 text-[#ff8c5a]">{cur.note}</span>}
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            role="listbox"
            style={pos ?? { left: 0, top: 0, maxHeight: MAX_H }}
            className={cn(
              'fixed z-[2000] overflow-y-auto rounded-lg border-2 border-black/40 bg-[#1b2130] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.5)]',
              // lần vẽ đầu chỉ để đo chiều cao, chưa hiện
              !pos && 'invisible',
            )}
          >
            {options.map((o, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === value}
                  onClick={() => {
                    onChange(i)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-bold',
                    i === value ? 'bg-[#4a3f1a] text-yellow' : 'text-ink hover:bg-white/10',
                  )}
                >
                  {swatch(o.swatch)}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.note && <span className="shrink-0 text-[#ff8c5a]">{o.note}</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
