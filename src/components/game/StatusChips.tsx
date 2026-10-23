import { useGame } from '@/store'
import { fmt } from '@/lib/format'
import { Chip } from '@/components/ui'

/** Tiền, uy tín, ngày */
export function StatusChips() {
  const money = useGame((s) => s.money)
  const rep = useGame((s) => s.rep)
  const day = useGame((s) => s.day)
  const name = useGame((s) => s.name)
  return (
    <div className="flex gap-1.5">
      {name && <Chip>👤 {name}</Chip>}
      <Chip tone="money">💰 {fmt(money)}</Chip>
      <Chip tone="rep">⭐ {rep}</Chip>
      <Chip tone="day">📅 Ngày {day}</Chip>
    </div>
  )
}
