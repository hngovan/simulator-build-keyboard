import { useState } from 'react'
import { cn } from '@/lib/format'
import { isHex, parseColor } from '@/lib/color'

/**
 * Chọn màu tự do: ô tròn mở bảng màu của hệ thống + ô gõ mã màu (hex `#a1b2c3` hoặc rgb `120, 80, 200`).
 * `hex` = màu đang chọn (đã đổi ra hex); gõ sai thì viền đỏ, không đổi màu
 */
export function ColorInput({
  hex,
  onChange,
  className,
}: {
  hex: string
  onChange: (hex: string) => void
  className?: string
}) {
  // chữ đang gõ dở (null = không gõ: hiện mã màu đang chọn, đổi theo ô màu / bảng màu)
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? hex
  const bad = parseColor(text) === null
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <label
        title="Mở bảng màu"
        className="relative size-6 shrink-0 cursor-[var(--cursor-hand)] overflow-hidden rounded-full shadow-[0_2px_0_rgba(0,0,0,0.45)]"
        style={{ background: 'conic-gradient(#f44, #fc3, #5d5, #3cf, #55f, #f4c, #f44)' }}
      >
        <input
          type="color"
          aria-label="Bảng màu"
          value={isHex(hex) ? hex : '#888888'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-[var(--cursor-hand)] opacity-0"
        />
      </label>
      <input
        value={text}
        spellCheck={false}
        aria-label="Mã màu hex hoặc rgb"
        title="Mã màu: #a1b2c3 hoặc 120, 80, 200"
        placeholder="#hex / r, g, b"
        onChange={(e) => {
          setDraft(e.target.value)
          const c = parseColor(e.target.value)
          if (c) onChange(c)
        }}
        onBlur={() => setDraft(null)}
        className={cn(
          'h-6 w-[104px] min-w-0 rounded-md border-2 bg-black/25 px-1.5 text-xs font-bold uppercase outline-none placeholder:text-muted placeholder:normal-case',
          bad ? 'border-red' : 'border-black/40 focus:border-yellow',
        )}
      />
    </div>
  )
}
