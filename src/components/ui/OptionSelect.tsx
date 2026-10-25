import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/format'

interface Option {
  label: string
  swatch?: string
  /** chữ phụ bên phải (giá...) */
  note?: string
}

/** Chọn 1 option dạng đổ xuống (thay hàng OptionChip khi có nhiều lựa chọn), cùng kiểu khối như OptionChip */
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
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
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
        onClick={() => setOpen((o) => !o)}
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
      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border-2 border-black/40 bg-[#1b2130] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
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
        </ul>
      )}
    </div>
  )
}
