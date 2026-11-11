import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BackButton, ColorDot, ColorInput, OptionSelect } from '@/components/ui'
import { cn } from '@/lib/format'
import { LAYOUTS, VARIANT_NAME, variantLabel, variantShort } from '@/data/layouts'
import {
  CASES,
  caseFits,
  keycapColorOf,
  KEYCAP_MATERIALS,
  MOUNTS,
  PCB_TYPES,
  PLATES,
  STABS,
  SWITCH_KINDS,
  SWITCHES,
  mountStabIssue,
} from '@/data/parts'
import { FEET_IDS, ORING_IDS, SOLDER_IDS, SUPPLIES } from '@/data/supplies'
import type { LayoutId, SwitchKind } from '@/types'
import { useGame } from '@/store'
import {
  CASE_GROUPS,
  FF_NAME,
  FINISHES,
  KC_MATS,
  PLATE_IDS,
  STAB_IDS,
  SWITCH_IDS,
  chooseCaseAuto,
  chooseStab,
  derive,
  famCase,
  famOf,
  finishOf,
  kitName,
  layoutName,
  pick40,
  setFam,
  setFree,
  useFreeForm,
  type CaseRow,
  type TileId,
} from './freeForm'

// Bảng Free build: danh sách loại case (cột trái) + màn chọn riêng của từng ô lựa chọn phụ (cột phải), mỗi cái 1 component

/**
 * Nút chọn nhỏ trong bảng Free build (lọc cỡ case / loại switch, số mảnh, chất liệu, layout...): không viền,
 * đang chọn = khối vàng đặc chữ tối (như `TabChip`), chưa chọn = nền tối rê chuột sáng hơn. Không transition: đổi lựa chọn phải đổi ngay (chuyển màu dần làm chữ trắng → đen bị trễ)
 */
function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={!!active}
      className={cn(
        'rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-45',
        active ? 'bg-yellow text-[#3a2b00]' : 'bg-panel-2 text-ink enabled:hover:bg-line',
        className,
      )}
      {...props}
    />
  )
}

/** đầu cột: số thứ tự bước + tên + gợi ý ngắn */
export function ColumnTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-yellow text-xs font-extrabold text-[#3a2b00]">
        {n}
      </span>
      <span className="font-head text-base font-extrabold">{title}</span>
      {hint && <span className="truncate text-xs text-muted">{hint}</span>}
    </div>
  )
}

/** nhóm lựa chọn phụ trong bảng: nhãn nhỏ phía trên + nội dung */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-extrabold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </div>
  )
}

/** 1 dòng lựa chọn bấm được: tên đậm + mô tả, đang chọn nền vàng sẫm + chữ vàng, không viền (danh sách plate / stab / switch / mount...) */
function Row({
  active,
  disabled,
  title,
  onClick,
  swatch,
  name,
  desc,
  tag,
}: {
  active: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
  swatch?: string
  name: string
  desc?: string
  /** chữ nhỏ bên phải (loại switch...) */
  tag?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        'flex w-full shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors disabled:opacity-45',
        active ? 'bg-[#4a4320]' : 'bg-panel-2 enabled:hover:bg-line',
      )}
    >
      {swatch && (
        <i
          className="size-4 shrink-0 rounded-full border-2 border-black/40"
          style={{ background: swatch }}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('text-sm font-bold', active && 'text-yellow')}>{name}</span>
        {desc && <span className="text-xs text-muted">{desc}</span>}
      </span>
      {tag && <span className="shrink-0 text-xs font-bold text-muted">{tag}</span>}
    </button>
  )
}

const list = 'flex flex-col gap-1'
const dots = 'flex flex-wrap gap-1.5'

/** thẻ case dựng bằng code cùng cỡ (gộp 1 dòng "Case 60%"): bấm = chọn; số mảnh / chất liệu chọn ở khu `CaseOptions` bên dưới danh sách */
function CodedCaseCard({ row }: { row: Extract<CaseRow, { ids: string[] }> }) {
  const f = useFreeForm()
  const id = famCase(row.ids, famOf(f, row.ff, row.ids))
  const active = !!f.pick && row.ids.includes(f.pick.caseId)
  return (
    <CaseRowButton
      active={active}
      onClick={() => chooseCaseAuto(id)}
      name={`Case ${FF_NAME[row.ff]}`}
      meta={active ? CASES[id].name : 'tự chọn số mảnh, chất liệu'}
    />
  )
}

/** 1 dòng case trong danh sách cuộn: tên + dòng phụ, đang chọn nền vàng sẫm + chữ vàng (không viền) */
function CaseRowButton({
  active,
  onClick,
  name,
  meta,
}: {
  active: boolean
  onClick: () => void
  name: string
  meta: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex w-full shrink-0 flex-col rounded-xl px-3 py-2 text-left transition-colors',
        active ? 'bg-[#4a4320]' : 'bg-panel-2 hover:bg-line',
      )}
    >
      <span className={cn('text-sm font-bold', active && 'text-yellow')}>{name}</span>
      <span className="truncate text-xs text-muted">{meta}</span>
    </button>
  )
}

/** thẻ 1 case CAD: tên + số mảnh / mount */
function CadCaseCard({ id }: { id: string }) {
  const active = useFreeForm((f) => f.pick?.caseId === id)
  const c = CASES[id]
  return (
    <CaseRowButton
      active={active}
      onClick={() => chooseCaseAuto(id)}
      name={c.name}
      meta={`${c.pieces} mảnh · ${c.mounts.map((m) => MOUNTS[m].name).join(', ')}`}
    />
  )
}

/**
 * Khu lựa chọn phụ của case đang chọn (dưới danh sách, đứng yên): chỉ hiện khi case là dòng "Case 60%" dựng bằng code →
 * số mảnh, chất liệu có ở số mảnh đó, cổng USB (khi có bản cổng C trên PCB). Case CAD không có gì để chọn thêm thì ẩn
 */
function CaseOptions() {
  const f = useFreeForm()
  const row = CASE_GROUPS.flatMap((g) => g.rows).find(
    (r): r is Extract<CaseRow, { ids: string[] }> =>
      'ids' in r && !!f.pick && r.ids.includes(f.pick.caseId),
  )
  if (!row) return null
  const sel = famOf(f, row.ff, row.ids)
  const id = famCase(row.ids, sel)
  const c = CASES[id]
  const has = (finish: string, pieces: number) =>
    row.ids.some((x) => finishOf(x) === finish && CASES[x].pieces === pieces)
  const pieces = [...new Set(row.ids.map((x) => CASES[x].pieces))].sort()
  const finishes = FINISHES.filter(([x]) => has(x, c.pieces))
  const hasUsb = row.ids.some(
    (x) => CASES[x].pcbUsb && finishOf(x) === finishOf(id) && CASES[x].pieces === c.pieces,
  )
  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-2xl bg-panel-2 p-3">
      <Field label="Số mảnh">
        <div className="flex flex-wrap gap-1">
          {pieces.map((p) => (
            <Chip
              key={p}
              active={c.pieces === p}
              // đổi số mảnh: giữ chất liệu nếu số mảnh đó có, không thì chất liệu đầu tiên của số mảnh đó
              onClick={() =>
                setFam(row.ff, row.ids, {
                  ...sel,
                  pieces: p,
                  finish: has(sel.finish, p)
                    ? sel.finish
                    : (FINISHES.find(([x]) => has(x, p))?.[0] ?? sel.finish),
                })
              }
            >
              {p} mảnh
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Chất liệu">
        <div className="flex flex-wrap gap-1">
          {finishes.map(([x, label]) => (
            <Chip
              key={x}
              active={finishOf(id) === x}
              onClick={() => setFam(row.ff, row.ids, { ...sel, finish: x, pieces: c.pieces })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </Field>
      {hasUsb && (
        <Field label="Cổng USB">
          <div className="flex flex-wrap gap-1">
            {([false, true] as const).map((u) => (
              <Chip
                key={String(u)}
                active={!!c.pcbUsb === u}
                onClick={() => setFam(row.ff, row.ids, { ...sel, usb: u })}
              >
                {u ? 'Cổng C trên PCB' : 'Daughterboard'}
              </Chip>
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}

/** Hàng lọc case theo cỡ (đứng yên phía trên danh sách) */
function CaseFilter() {
  const ffFilter = useFreeForm((f) => f.ffFilter)
  return (
    <div className="flex shrink-0 flex-wrap gap-1">
      <Chip active={!ffFilter} onClick={() => setFree({ ffFilter: '' })}>
        Tất cả
      </Chip>
      {CASE_GROUPS.map((g) => (
        <Chip key={g.ff} active={ffFilter === g.ff} onClick={() => setFree({ ffFilter: g.ff })}>
          {FF_NAME[g.ff]}
        </Chip>
      ))}
    </div>
  )
}

/** danh sách thẻ case theo cỡ */
function CaseCards() {
  const ffFilter = useFreeForm((f) => f.ffFilter)
  return (
    <>
      {CASE_GROUPS.filter((g) => !ffFilter || g.ff === ffFilter).map((g) => (
        <div key={g.ff} className={list}>
          {!ffFilter && (
            <div className="flex items-baseline gap-2 px-1 pt-1">
              <span className="font-head text-sm font-extrabold text-yellow">{FF_NAME[g.ff]}</span>
              <span className="text-xs text-muted">{g.rows.length} case</span>
            </div>
          )}
          {g.rows.map((row) =>
            'ids' in row ? (
              <CodedCaseCard key={row.ff} row={row} />
            ) : (
              <CadCaseCard key={row.id} id={row.id} />
            ),
          )}
        </div>
      ))}
    </>
  )
}

/** Bảng chọn layout: nút layout case làm được + từng kiểu layout (space, backspace, hàng dưới...) */
function LayoutPicker() {
  const f = useFreeForm()
  const d = derive(f)
  const caseId = f.pick?.caseId
  /** hàng dưới case làm được ở layout `l`: các kiểu WK (space 6.25u / 7u) + có WKL không */
  const wkOf = (l: LayoutId) => {
    const ok = (LAYOUTS[l].variants.bottom ?? []).filter(
      (val) => !caseId || caseFits(CASES[caseId], l, { ...f.variant, bottom: val }),
    )
    return { wk: ok.filter((v) => v !== 'wkl'), wkl: ok.includes('wkl') }
  }
  // nhiều layout cùng có WK / WKL (TKL + TKL F13): nút ghi kèm tên layout
  const manyWk = d.layouts.filter((l) => LAYOUTS[l].variants.bottom).length > 1
  const curBottom = d.variant.bottom
  const anyWk = d.layouts.some((l) => LAYOUTS[l].variants.bottom)
  // dòng "Layout row cuối" (hàng dưới / space) nằm ngay dưới "Kiểu layout", rồi mới tới backspace, shift...
  const rows = [...d.variantRows].sort(
    ([a], [b]) => Number(b === 'bottom' || b === 'space') - Number(a === 'bottom' || a === 'space'),
  )
  return (
    <>
      <Field label="Kiểu layout">
        <div className="flex flex-wrap gap-1">
          {d.layouts
            .filter((l) => !(l === 'planck' && d.planckIn40))
            .flatMap((l) =>
              l === '40' && d.split40
                ? [
                    <Chip
                      key="40"
                      active={d.baseLayout === '40' && !d.hhkb40}
                      onClick={() => pick40(false)}
                    >
                      {LAYOUTS['40'].name}
                    </Chip>,
                    <Chip key="40hhkb" active={d.hhkb40} onClick={() => pick40(true)}>
                      40% HHKB
                    </Chip>,
                  ]
                : wkOf(l).wk.length || wkOf(l).wkl
                  ? // layout có hàng dưới WK / WKL: tách 2 nút kiểu layout, space 6.25u / 7u chọn ở dòng dưới
                    (['wk', 'wkl'] as const)
                      .filter((fam) => (fam === 'wk' ? wkOf(l).wk.length : wkOf(l).wkl))
                      .map((fam) => (
                        <Chip
                          key={l + fam}
                          active={f.layout === l && (curBottom === 'wkl') === (fam === 'wkl')}
                          onClick={() =>
                            setFree({
                              layout: l,
                              variant: {
                                ...f.variant,
                                bottom:
                                  fam === 'wkl'
                                    ? 'wkl'
                                    : f.variant.bottom && wkOf(l).wk.includes(f.variant.bottom)
                                      ? f.variant.bottom
                                      : wkOf(l).wk[0],
                              },
                            })
                          }
                        >
                          {(manyWk ? layoutName(l) + ' ' : '') + fam.toUpperCase()}
                        </Chip>
                      ))
                  : [
                      <Chip
                        key={l}
                        active={f.layout === l || (l === '40' && d.baseLayout === '40')}
                        onClick={() => setFree({ layout: l })}
                      >
                        {/* đứng cạnh nút WK / WKL thì ghi gọn "HHKB" / "True HHKB" */}
                        {anyWk ? LAYOUTS[l].name : layoutName(l)}
                      </Chip>,
                    ],
            )}
        </div>
      </Field>
      {rows.map(([k, all]) => {
        // hàng dưới: WK / WKL đã chọn ở "Kiểu layout" → dòng này chỉ còn các kiểu space của WK (6.25u / 7u)
        const opts = k === 'bottom' ? all.filter((v) => v !== 'wkl') : all
        if (k === 'bottom' && (curBottom === 'wkl' || opts.length < 2)) return null
        const cur = f.layout === 'planck' ? 'planck' : d.curVariant(k, opts)
        const pick = (val: string) => {
          // 40%: chọn "Planck" ở kiểu space = đổi sang layout Planck, chọn kiểu khác thì về 40%
          if (val === 'planck') return setFree({ layout: 'planck' })
          setFree({
            ...(f.layout === 'planck' ? { layout: '40' as const } : {}),
            variant: { ...f.variant, [k]: val },
          })
        }
        return (
          <Field key={k} label={VARIANT_NAME[k]}>
            {/* ít kiểu → nút bấm thấy hết; nhiều kiểu (40%: 7 kiểu space) → ô đổ xuống */}
            {opts.length <= 3 ? (
              <div className="flex flex-wrap gap-1">
                {opts.map((val) => (
                  <Chip key={val} active={cur === val} onClick={() => pick(val)}>
                    {val === 'planck' ? LAYOUTS.planck.name : variantShort(k, val)}
                  </Chip>
                ))}
              </div>
            ) : (
              <OptionSelect
                options={opts.map((val) => ({
                  label: val === 'planck' ? LAYOUTS.planck.name : variantLabel(k, val),
                }))}
                value={Math.max(0, opts.indexOf(cur))}
                onChange={(i) => pick(opts[i])}
              />
            )}
          </Field>
        )
      })}
    </>
  )
}

/** Bảng chọn mount (mount case làm được; stab screw-in cấn O-ring thì khoá) + dây O-ring */
function MountPicker() {
  const f = useFreeForm()
  const oring = useGame((s) => s.oringPick)
  if (!f.pick) return null
  return (
    <>
      <div className={list}>
        {CASES[f.pick.caseId].mounts.map((m) => {
          const issue = mountStabIssue(m, f.stab)
          return (
            <Row
              key={m}
              active={f.mount === m}
              disabled={!!issue}
              title={issue ?? undefined}
              onClick={() => setFree({ mount: m })}
              name={MOUNTS[m].name}
              desc={issue ?? MOUNTS[m].desc}
            />
          )
        })}
      </div>
      {f.mount === 'oring' && (
        <Field label="Dây O-ring">
          <div className={dots}>
            {ORING_IDS.map((id) => (
              <ColorDot
                key={id}
                color={SUPPLIES[id].color}
                name={SUPPLIES[id].name}
                active={oring === id}
                onClick={() => useGame.setState({ oringPick: id })}
              />
            ))}
          </div>
        </Field>
      )}
    </>
  )
}

/** Bảng chọn PCB + thiếc hàn (PCB hàn) */
function PcbPicker() {
  const pcb = useFreeForm((f) => f.pcb)
  const solder = useGame((s) => s.solderPick)
  return (
    <>
      <div className={list}>
        {Object.keys(PCB_TYPES).map((t) => (
          <Row
            key={t}
            active={pcb === t}
            onClick={() => setFree({ pcb: t })}
            name={PCB_TYPES[t].name}
            desc={PCB_TYPES[t].desc}
          />
        ))}
      </div>
      {pcb === 'solder' && (
        <Field label="Thiếc hàn">
          <div className={list}>
            {SOLDER_IDS.map((id) => (
              <Row
                key={id}
                active={solder === id}
                onClick={() => useGame.setState({ solderPick: id })}
                name={SUPPLIES[id].name}
              />
            ))}
          </div>
        </Field>
      )}
    </>
  )
}

function PlatePicker() {
  const plate = useFreeForm((f) => f.plate)
  return (
    <div className={list}>
      {PLATE_IDS.map((id) => (
        <Row
          key={id}
          active={plate === id}
          onClick={() => setFree({ plate: id })}
          name={PLATES[id].name}
        />
      ))}
    </div>
  )
}

function StabPicker() {
  const stab = useFreeForm((f) => f.stab)
  return (
    <div className={list}>
      {STAB_IDS.map((id) => (
        <Row key={id} active={stab === id} onClick={() => chooseStab(id)} name={STABS[id].name} />
      ))}
    </div>
  )
}

/** loại switch có bán (thứ tự `SWITCH_KINDS`) */
const SW_KINDS = (Object.keys(SWITCH_KINDS) as SwitchKind[]).filter((k) =>
  SWITCH_IDS.some((id) => SWITCHES[id].kind === k),
)

/** Hàng lọc switch theo loại (đứng yên phía trên danh sách) */
function SwitchFilter() {
  const kind = useFreeForm((f) => f.swKind)
  return (
    <div className="flex shrink-0 flex-wrap gap-1">
      <Chip active={!kind} onClick={() => setFree({ swKind: '' })}>
        Tất cả
      </Chip>
      {SW_KINDS.map((k) => (
        <Chip key={k} active={kind === k} onClick={() => setFree({ swKind: k })}>
          {SWITCH_KINDS[k]}
        </Chip>
      ))}
    </div>
  )
}

/** Bảng chọn switch: mỗi switch 1 dòng có chấm màu thân + loại */
function SwitchPicker() {
  const sw = useFreeForm((f) => f.sw)
  const kind = useFreeForm((f) => f.swKind)
  return (
    <div className={list}>
      {SWITCH_IDS.filter((id) => !kind || SWITCHES[id].kind === kind).map((id) => (
        <Row
          key={id}
          active={sw === id}
          onClick={() => setFree({ sw: id })}
          swatch={SWITCHES[id].color}
          name={SWITCHES[id].name}
          desc={SWITCHES[id].desc}
          tag={SWITCH_KINDS[SWITCHES[id].kind]}
        />
      ))}
    </div>
  )
}

/** Bảng chọn keycap: bộ (profile) lắp được layout, chất liệu, màu */
function KeycapPicker() {
  const f = useFreeForm()
  const d = derive(f)
  return (
    <>
      <Field label="Bộ keycap (profile)">
        <div className="flex flex-wrap gap-1">
          {d.kits.map((id) => (
            <Chip key={id} active={d.kitId === id} onClick={() => setFree({ kit: id })}>
              {kitName(id)}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Chất liệu">
        <div className="flex flex-wrap gap-1">
          {KC_MATS.map((m) => (
            <Chip key={m} active={f.kcMat === m} onClick={() => setFree({ kcMat: m })}>
              {KEYCAP_MATERIALS[m].name}
            </Chip>
          ))}
        </div>
      </Field>
      {/* màu tự do (bảng màu / mã hex, rgb); keycap PC = nhựa trong nhuộm màu đó */}
      <Field label={`Màu · ${keycapColorOf(d.kcColor).name}`}>
        <ColorInput
          hex={keycapColorOf(d.kcColor).hex}
          onChange={(kcColor) => setFree({ kcColor })}
        />
      </Field>
    </>
  )
}

function FeetPicker() {
  const feet = useGame((s) => s.feetPick)
  return (
    <Field label={`Màu feet · ${SUPPLIES[feet].name}`}>
      <div className={dots}>
        {FEET_IDS.map((id) => (
          <ColorDot
            key={id}
            color={SUPPLIES[id].color}
            name={SUPPLIES[id].name}
            active={feet === id}
            onClick={() => useGame.setState({ feetPick: id })}
          />
        ))}
      </div>
    </Field>
  )
}

/**
 * Cột trái bảng Free build: lựa chọn chính = loại case. Hàng lọc theo cỡ đứng yên, danh sách thẻ cuộn; bấm thẻ là chọn case
 * (xem trước 3D đổi ngay), màu + các lựa chọn phụ ở cột phải
 */
export function CaseList() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ColumnTitle n={1} title="Loại case" hint="bấm để chọn" />
      <CaseFilter />
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-2xl bg-black/15 p-1.5 max-md:max-h-[40vh] max-md:flex-none">
        <CaseCards />
      </div>
      <CaseOptions />
    </div>
  )
}

/** tiêu đề + gợi ý + bảng chọn (+ hàng lọc đứng yên) của từng ô */
const PICKERS: Record<
  TileId,
  { title: string; hint: string; Picker: () => ReactNode; Filter?: () => ReactNode }
> = {
  layout: { title: 'Chọn layout', hint: 'Chỉ hiện layout case này lắp vừa', Picker: LayoutPicker },
  mount: { title: 'Chọn mount', hint: 'Kiểu gá board vào case', Picker: MountPicker },
  pcb: { title: 'Chọn PCB', hint: 'Hotswap cắm là xong, PCB hàn phải hàn', Picker: PcbPicker },
  plate: { title: 'Chọn plate', hint: 'Chất liệu plate đổi tiếng gõ', Picker: PlatePicker },
  stab: { title: 'Chọn stab', hint: 'Stab cho phím dài', Picker: StabPicker },
  switch: {
    title: 'Chọn switch',
    hint: 'Lọc theo loại rồi bấm chọn',
    Picker: SwitchPicker,
    Filter: SwitchFilter,
  },
  keycap: { title: 'Chọn keycap', hint: 'Profile, chất liệu, màu', Picker: KeycapPicker },
  feet: { title: 'Chọn feet', hint: 'Feet cao su dán đáy case', Picker: FeetPicker },
}

/**
 * Màn chọn riêng của 1 ô lựa chọn phụ (`useFreeForm.tile`): nút quay lại lưới ô + tiêu đề, hàng lọc đứng yên,
 * chỉ danh sách bên dưới cuộn
 */
export function FreePicker({ tile }: { tile: TileId }) {
  const { title, hint, Picker, Filter } = PICKERS[tile]
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <BackButton onClick={() => setFree({ tile: null })} />
        <div className="flex min-w-0 flex-col">
          <span className="font-head text-lg leading-tight font-extrabold text-yellow">
            {title}
          </span>
          <span className="truncate text-xs text-muted">{hint}</span>
        </div>
      </div>
      {Filter && <Filter />}
      {/* key theo ô: đổi ô thì cuộn về đầu */}
      <div
        key={tile}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-black/15 p-2 max-md:max-h-[50vh] max-md:flex-none"
      >
        <Picker />
      </div>
    </div>
  )
}
