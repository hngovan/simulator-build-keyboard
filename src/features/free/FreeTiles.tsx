import type { ReactNode } from 'react'
import { CircleDot, Layers, LayoutGrid, type LucideIcon } from 'lucide-react'
import {
  IconKeycap,
  IconPcb,
  IconPlate,
  IconStab,
  IconSwitch,
  type GameIcon,
} from '@/components/art/GameIcons'
import {
  CASES,
  caseColorOf,
  keycapColorOf,
  KEYCAP_MATERIALS,
  caseTwoTone,
  tintSwatch,
  MOUNTS,
  PCB_TYPES,
  PLATES,
  STABS,
  SWITCHES,
} from '@/data/parts'
import { SUPPLIES } from '@/data/supplies'
import { VARIANT_NAME, variantShort } from '@/data/layouts'
import { cn } from '@/lib/format'
import { useGame } from '@/store'
import { ColorInput } from '@/components/ui'
import {
  chooseCase,
  derive,
  kitName,
  layoutName,
  setFree,
  useFreeForm,
  type TileId,
} from './freeForm'

/** chấm màu nhỏ cạnh giá trị đang chọn (chỉ để xem, không bấm) */
const Dot = ({ color }: { color: string }) => (
  <i
    className="inline-block size-3.5 shrink-0 rounded-full border-2 border-black/40"
    style={{ background: color }}
  />
)

/**
 * Khung 1 ô lựa chọn phụ (lưới bento cột phải): nhãn nhỏ chữ hoa + giá trị đang chọn (+ dòng phụ). Bấm ô = vào màn chọn riêng của ô đó
 * (`useFreeForm.tile`). Chưa chọn case thì các ô khác khoá
 */
function Tile({
  id,
  icon: Icon,
  label,
  value,
  sub,
  className,
  big,
}: {
  id: TileId
  /** icon đầu ô: chưa chọn (ô khoá / "Chưa chọn") vẫn có hình cho biết ô này là gì */
  icon: LucideIcon | GameIcon
  label: string
  value: ReactNode
  sub?: ReactNode
  className?: string
  /** ô chính (switch, keycap): cao hơn, chữ to hơn */
  big?: boolean
}) {
  const locked = useFreeForm((f) => !f.pick)
  return (
    <button
      type="button"
      disabled={locked}
      title={locked ? 'Chọn case trước đã' : `Chọn ${label.toLowerCase()}`}
      onClick={() => setFree({ tile: id })}
      className={cn(
        'group flex min-h-[64px] min-w-0 items-center gap-2 rounded-2xl bg-panel-2 px-3 py-2.5 text-left transition-[background-color,transform] duration-100',
        'enabled:hover:-translate-y-0.5 enabled:hover:bg-line disabled:opacity-45',
        big && 'min-h-[76px]',
        className,
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/25 text-muted group-enabled:group-hover:text-yellow">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-extrabold tracking-wide text-muted uppercase group-enabled:group-hover:text-yellow">
          {label}
        </span>
        <span
          className={cn(
            'flex min-w-0 items-center gap-1.5 font-head leading-tight font-extrabold',
            big ? 'text-lg' : 'text-base',
          )}
        >
          {value}
        </span>
        {sub && <span className="truncate text-xs text-muted">{sub}</span>}
      </span>
    </button>
  )
}

const none = <span className="text-muted">Chưa chọn</span>

/** Ô màu case: chọn màu tự do ngay trên ô (bảng màu hệ thống + gõ mã hex / rgb, không còn ô màu có sẵn) */
export function CaseColorTile({ className }: { className?: string }) {
  const pick = useFreeForm((f) => f.pick)
  if (!pick) return null
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl bg-panel-2 px-4 py-2.5', className)}
    >
      {/* case 2 mảnh: chọn riêng màu case trên / case dưới (chưa chọn màu dưới thì theo màu trên) */}
      {(caseTwoTone(CASES[pick.caseId]) ? (['top', 'bottom'] as const) : (['top'] as const)).map(
        (part) => {
          const cur = part === 'top' ? pick.color : (pick.botColor ?? pick.color)
          const label = !caseTwoTone(CASES[pick.caseId])
            ? 'Màu case'
            : part === 'top'
              ? 'Màu case trên'
              : 'Màu case dưới'
          const set = (col: string) =>
            part === 'top' ? chooseCase(pick.caseId, col) : chooseCase(pick.caseId, pick.color, col)
          return (
            <div key={part} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold tracking-wide text-muted uppercase">
                {label} · <span className="text-ink">{caseColorOf(cur).name}</span>
              </span>
              <ColorInput hex={caseColorOf(cur).hex} onChange={set} />
            </div>
          )
        },
      )}
    </section>
  )
}

/** Ô layout: tên layout + các kiểu đang chọn (space, backspace...) */
export function LayoutTile({ className }: { className?: string }) {
  const f = useFreeForm()
  const d = derive(f)
  const name = d.hhkb40 ? '40% HHKB' : f.layout && layoutName(f.layout)
  const kinds = d.variantRows
    .map(([k, opts]) => `${VARIANT_NAME[k]} ${variantShort(k, d.curVariant(k, opts))}`)
    .join(' · ')
  return (
    <Tile
      id="layout"
      icon={LayoutGrid}
      label="Layout"
      className={className}
      value={name ? <span className="truncate">{name}</span> : none}
      sub={f.layout === 'planck' ? 'Ortho 12 × 4' : kinds || undefined}
    />
  )
}

/** Ô mount (+ dây O-ring khi O-ring mount) */
export function MountTile({ className }: { className?: string }) {
  const mount = useFreeForm((f) => f.mount)
  const oring = useGame((s) => s.oringPick)
  return (
    <Tile
      id="mount"
      icon={Layers}
      label="Mount"
      className={className}
      value={
        MOUNTS[mount] ? (
          <>
            {mount === 'oring' && <Dot color={SUPPLIES[oring].color} />}
            <span className="truncate">{MOUNTS[mount].name}</span>
          </>
        ) : (
          none
        )
      }
    />
  )
}

/** Ô PCB (+ thiếc hàn khi PCB hàn) */
export function PcbTile({ className }: { className?: string }) {
  const pcb = useFreeForm((f) => f.pcb)
  const solder = useGame((s) => s.solderPick)
  return (
    <Tile
      id="pcb"
      icon={IconPcb}
      label="PCB"
      className={className}
      value={<span className="truncate">{PCB_TYPES[pcb].name}</span>}
      sub={pcb === 'solder' ? SUPPLIES[solder].name : undefined}
    />
  )
}

export function PlateTile({ className }: { className?: string }) {
  const plate = useFreeForm((f) => f.plate)
  return (
    <Tile
      id="plate"
      icon={IconPlate}
      label="Plate"
      className={className}
      value={<span className="truncate">{PLATES[plate].name}</span>}
    />
  )
}

export function StabTile({ className }: { className?: string }) {
  const stab = useFreeForm((f) => f.stab)
  return (
    <Tile
      id="stab"
      icon={IconStab}
      label="Stab"
      className={className}
      value={<span className="truncate">{STABS[stab].name}</span>}
    />
  )
}

/** Ô switch: chấm màu thân switch + tên + loại */
export function SwitchTile({ className, big }: { className?: string; big?: boolean }) {
  const sw = SWITCHES[useFreeForm((f) => f.sw)]
  return (
    <Tile
      id="switch"
      big={big}
      icon={IconSwitch}
      label="Switch"
      className={className}
      value={
        <>
          <Dot color={sw.color} />
          <span className="truncate">{sw.name}</span>
        </>
      }
      sub={sw.kind}
    />
  )
}

/** Ô keycap: chấm màu + profile, dòng phụ chất liệu · màu */
export function KeycapTile({ className, big }: { className?: string; big?: boolean }) {
  const f = useFreeForm()
  const d = derive(f)
  return (
    <Tile
      id="keycap"
      big={big}
      icon={IconKeycap}
      label="Keycap"
      className={className}
      value={
        d.kitId ? (
          <>
            <Dot color={tintSwatch(keycapColorOf(d.kcColor))} />
            <span className="truncate">{kitName(d.kitId)}</span>
          </>
        ) : (
          none
        )
      }
      sub={`${KEYCAP_MATERIALS[f.kcMat].name} · ${keycapColorOf(d.kcColor).name}`}
    />
  )
}

export function FeetTile({ className }: { className?: string }) {
  const feet = useGame((s) => s.feetPick)
  return (
    <Tile
      id="feet"
      icon={CircleDot}
      label="Feet"
      className={className}
      value={
        <>
          <Dot color={SUPPLIES[feet].color} />
          <span className="truncate">{SUPPLIES[feet].name}</span>
        </>
      }
    />
  )
}
