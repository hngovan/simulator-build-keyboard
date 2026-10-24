import { cn } from '@/lib/format'

/** Công tắc bật / tắt kiểu game (thay checkbox): núm trượt, bật thì xanh */
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  /** đọc màn hình / tooltip khi không có chữ đi kèm */
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-black/40 transition-colors duration-200',
        'shadow-[inset_0_2px_3px_rgba(0,0,0,0.35)] hover:brightness-110',
        checked ? 'bg-green' : 'bg-[#4a5670]',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-[18px] place-items-center rounded-full bg-white text-[10px] font-extrabold shadow-[0_2px_0_rgba(0,0,0,0.35)] transition-transform duration-200',
          checked ? 'translate-x-[20px] text-green' : 'translate-x-[1px] text-muted',
        )}
      >
        {checked ? '✓' : ''}
      </span>
    </button>
  )
}
