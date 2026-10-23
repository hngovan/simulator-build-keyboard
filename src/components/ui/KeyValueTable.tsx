import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

/** Bảng 2 cột: nhãn xám bên trái, giá trị đậm bên phải */
export function KeyValueTable({
  rows,
  compact,
}: {
  rows: [string, ReactNode][]
  compact?: boolean
}) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className={cn('border-b border-dashed border-line', compact && 'text-xs')}>
            <td
              className={cn(
                'w-px align-top whitespace-nowrap text-muted',
                compact ? 'p-0.5 pr-2' : 'p-1 pr-2',
              )}
            >
              {k}
            </td>
            <td className={cn('align-top font-bold', compact ? 'p-0.5' : 'p-1')}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Dòng kết quả có nhãn bên trái, điểm bên phải */
export function ScoreRow({
  label,
  value,
  strong,
}: {
  label: ReactNode
  value: ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        'flex justify-between gap-2 py-1',
        strong ? 'font-head text-lg' : 'border-b border-dashed border-line',
      )}
    >
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
