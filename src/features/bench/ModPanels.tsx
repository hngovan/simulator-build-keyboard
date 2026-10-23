import type { ReactNode } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import { STABS, SWITCHES, TOOLS } from '@/data/parts'
import { LUBE_IDS, SUPPLIES, lubeUseFit, type LubeUse } from '@/data/supplies'
import { stabModRules } from '@/data/mods'
import type { LubePick } from '@/store/shopSlice'
import { Button, HudCard, Muted, OptionChip, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/format'

const fitTone = (fit: number) =>
  fit >= 0.9 ? 'text-green' : fit >= 0.7 ? 'text-yellow' : 'text-red'

/**
 * Chọn lube cho 1 mục đích (switch / housing / dây / lò xo).
 * Hiện mọi loại lube dùng được + số lượt còn + độ hợp, để người chơi tự chọn (chọn sai bị trừ điểm)
 */
function LubePicker({
  slot,
  use,
  disabled,
}: {
  slot: keyof LubePick
  use: LubeUse
  disabled?: boolean
}) {
  const supplies = useGame((s) => s.supplies)
  const value = useGame((s) => s.lubePick[slot])
  const setLubePick = useGame((s) => s.setLubePick)
  const ids = LUBE_IDS.filter((id) => lubeUseFit(id, use)[0] > 0)
  const [fit, note] = lubeUseFit(value, use)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => (
          <OptionChip
            key={id}
            active={value === id}
            disabled={disabled}
            onClick={() => setLubePick(slot, id)}
          >
            {SUPPLIES[id].name} ({supplies[id] ?? 0})
          </OptionChip>
        ))}
      </div>
      <span className={cn('text-xs', fitTone(fit))}>
        {SUPPLIES[value].name}: {note}
      </span>
    </div>
  )
}

interface ModRowProps {
  done: boolean
  name: string
  req: ReactNode
  skip?: boolean
  /** nút làm bước này (ẩn khi đã xong / không làm được) */
  onDo?: () => void
}

function ModRow({ done, name, req, skip, onDo }: ModRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-b border-dashed border-line py-1.5',
        done && 'text-[#9fe6b6]',
        skip && 'text-muted',
      )}
    >
      <span>
        {done ? '✅' : skip ? '➖' : '⬜'} {name}
      </span>
      <span className="flex items-center gap-1.5 text-right text-xs">
        {req}
        {onDo && !done && (
          <Button size="sm" tone="blue" onClick={onDo}>
            Làm
          </Button>
        )}
      </span>
    </div>
  )
}

/** Cảnh báo thiếu dụng cụ */
function ToolWarn({ kinds }: { kinds: ('brush' | 'clipper' | 'opener')[] }) {
  const tools = useGame((s) => s.tools)
  const missing = kinds.filter((k) => TOOLS[k][tools[k]].none)
  if (!missing.length) return null
  return (
    <div className="text-xs text-red">
      ⚠️ Thiếu: {missing.map((k) => TOOLS[k][1].name).join(', ')} (Tiệm Đồ Nghề / Shopii)
    </div>
  )
}

export function StabModPanel() {
  const ctx = useCtx()
  const mods = useBuild().stabMods
  const model = useGame((s) => s.inventory.stab!.type)
  const finishOptional = useGame((s) => s.finishOptional)
  const modStab = useGame((s) => s.modStab)
  const busy = useGame((s) => !!s.stabAnim)
  const n = ctx.stabKeys.length
  const m = STABS[model]
  return (
    <HudCard className="flex flex-col gap-1.5">
      <h4 className="text-base">🛠 Mod stab ({n} stab)</h4>
      <Muted>
        {m.name}: {m.desc}
      </Muted>
      {stabModRules(model).map((r) => (
        <ModRow
          key={r.kind}
          name={r.label}
          done={!!mods[r.kind]}
          skip={!r.needed && !mods[r.kind]}
          req={r.reason ?? ''}
          onDo={r.allowed && !busy ? () => modStab(r.kind) : undefined}
        />
      ))}
      <ToolWarn kinds={['brush', 'clipper']} />
      <Muted>Lube housing + slider:</Muted>
      <LubePicker slot="housing" use="housing" disabled={!!mods.housing} />
      <Muted>Lube dây stab:</Muted>
      <LubePicker slot="wire" use="wire" disabled={!!mods.wire} />
      <Muted>
        Click bộ phận trên bàn (theo mũi tên vàng) hoặc bấm "Làm". Mỗi lần lube / dán băng dùng {n}{' '}
        lượt vật tư.
      </Muted>
      <Button tone="green" wide onClick={finishOptional}>
        {mods.wired ? 'Xong, đi lắp stab →' : 'Bỏ qua mod →'}
      </Button>
    </HudCard>
  )
}

const PREF_TEXT = {
  want: 'Khách MUỐN lube switch',
  none: 'Khách dặn KHÔNG lube (giữ tiếng gốc)',
  any: 'Khách không yêu cầu, tuỳ shop',
} as const

export function LubePanel() {
  const ctx = useCtx()
  const build = useBuild()
  const opener = useGame((s) => TOOLS.opener[s.tools.opener])
  const swType = useGame((s) => s.inventory.switch!.type)
  const pref = useGame((s) => s.order!.lubePref)
  const finishOptional = useGame((s) => s.finishOptional)
  const sw = SWITCHES[swType]
  return (
    <HudCard className="flex flex-col gap-1.5">
      <h4 className="text-base">🧴 Lube switch</h4>
      <div
        className={cn(
          'text-xs font-bold',
          pref === 'none' ? 'text-red' : pref === 'want' ? 'text-green' : 'text-muted',
        )}
      >
        {PREF_TEXT[pref]}
      </div>
      <Muted>
        {sw.name} ({sw.feel}){sw.prelubed ? ' · đã lube sẵn từ nhà máy' : ' · chưa lube'}
      </Muted>
      <ToolWarn kinds={['opener', 'brush']} />
      {!opener.none && <div className="text-xs">{`${opener.name}: ${opener.n} con / mẻ`}</div>}
      <Muted>Lube switch:</Muted>
      <LubePicker slot="switch" use={sw.feel} disabled={!!build.lubeType} />
      <ProgressBar value={build.lubed / ctx.keys.length} className="mt-1" />
      <div className="text-xs">
        Đã lube {build.lubed}/{ctx.keys.length}
      </div>
      <Muted>Lube lò xo (hết tiếng ping):</Muted>
      <LubePicker slot="spring" use="spring" disabled={!!build.springLube} />
      <div className="text-xs">
        {build.springLube
          ? `✅ Lò xo đã lube ${SUPPLIES[build.springLube].name}`
          : 'Click hộp lắc trên bàn: bỏ lò xo vào hộp với dầu rồi lắc đều'}
      </div>
      <Button tone="green" wide onClick={finishOptional}>
        {build.lubed ? 'Xong, đi lắp switch →' : 'Bỏ qua lube →'}
      </Button>
    </HudCard>
  )
}
