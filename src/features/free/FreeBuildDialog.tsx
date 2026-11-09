import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { Button, HudCard, Muted, OptionChip, OptionSelect } from '@/components/ui'
import { cn } from '@/lib/format'
import { LAYOUTS, VARIANT_NAME, variantLabel, variantShort } from '@/data/layouts'
import {
  caseFits,
  CASES,
  CASE_COLORS,
  caseSwatch,
  KEYCAP_COLORS,
  KEYCAP_KITS,
  MOUNTS,
  PCB_TYPES,
  PLATES,
  STABS,
  SWITCHES,
  mountStabIssue,
  plateIds,
} from '@/data/parts'
import { FEET_IDS, ORING_IDS, SOLDER_IDS, SUPPLIES } from '@/data/supplies'
import type { FormFactor, LayoutId, Variant, VariantKey } from '@/types'
import { useGame } from '@/store'
import { freeKits, freeLayouts, startFreeBuild } from './freeBuild'

/** thứ tự nhóm cỡ case trong bảng */
// nhóm case theo cỡ từ nhỏ tới lớn (Planck ortho 12 × 4 ngay sau 40%)
const FF_ORDER: FormFactor[] = ['40', 'planck', '60', '65', 'alice', '75', 'frl', 'tkl', 'full']
/** tên nhóm cỡ case (đầu nhóm + nút lọc) */
const FF_NAME: Record<FormFactor, string> = {
  '40': '40%',
  planck: 'Planck',
  '60': '60%',
  '65': '65%',
  alice: 'Alice',
  '75': '75%',
  frl: 'FRL',
  tkl: 'TKL',
  full: 'Full size',
}
const PLATE_IDS = plateIds()
const STAB_IDS = Object.keys(STABS)
const SWITCH_IDS = Object.keys(SWITCHES)
const KC_COLORS = Object.keys(KEYCAP_COLORS)
/** tên bộ keycap gọn: bỏ "Full" / "(mọi layout)", chỉ còn profile (Cherry, OEM, SA...) */
const kitName = (id: string) =>
  KEYCAP_KITS[id].name.replace(/\s*\(.*\)/, '').replace(/\s+Full$/, '')

/** chất liệu chọn trong dòng case dựng bằng code (thứ tự nút) */
const FINISHES = [
  ['anod', 'Nhôm anod'],
  ['ecoat', 'Nhôm E-coat'],
  ['abs', 'Nhựa ABS'],
  ['pc', 'Nhựa PC'],
  ['pcalu', 'Nắp PC · đáy nhôm'],
  ['wood', 'Gỗ'],
  ['mica', 'Mica'],
  ['acrylic', 'Acrylic'],
] as const
/** chất liệu 1 case trong dòng: case 2 chất liệu (nắp PC đáy nhôm) tính riêng */
const finishOf = (id: string) => (CASES[id].bottom ? 'pcalu' : CASES[id].material)
/**
 * case dựng bằng code (không CAD) cùng cỡ gộp 1 thẻ "Case 60%": chọn số mảnh trước → hiện chất liệu có ở số mảnh đó (+ cổng USB)
 * → màu; case CAD đứng riêng
 */
type Family = 'coded'
const familyOf = (id: string): Family | null => (CASES[id].model ? null : 'coded')
/** kiểu space 40% thuộc nhóm "40% HHKB" (bỏ 2 phím góc hàng dưới) */
const isHhkb40 = (v?: string) => !!v?.startsWith('hhkb')
/** tên nút layout ở bảng chọn (HHKB là layout 60%) */
const CHIP_NAME: Partial<Record<LayoutId, string>> = {
  hhkb: '60% HHKB',
  truehhkb: '60% True HHKB',
}
/** 1 dòng trong bảng: case lẻ hoặc cả họ case cùng cỡ */
type Row = { id: string } | { ff: FormFactor; fam: Family; ids: string[] }
/** case trong họ theo chất liệu + số mảnh; thiếu đúng tổ hợp thì giữ chất liệu (PC chỉ có 2 mảnh), rồi cùng số mảnh */
const aluPick = (ids: string[], finish: string, pieces: number, usb = false) => {
  // cổng USB: daughterboard / cổng C hàn trên PCB (`pcbUsb`, nhôm 1 mảnh 60% / 40% bên trái, TKL bên phải); thiếu thì lấy bản DTB
  const list = ids.filter((id) => !!CASES[id].pcbUsb === usb)
  const pool = list.length ? list : ids.filter((id) => !CASES[id].pcbUsb)
  return (
    pool.find((id) => finishOf(id) === finish && CASES[id].pieces === pieces) ??
    pool.find((id) => finishOf(id) === finish) ??
    pool.find((id) => CASES[id].pieces === pieces) ??
    pool[0] ??
    ids[0]
  )
}

/** ô màu bấm chọn (case, keycap, feet, O-ring) */
function Swatch({
  hex,
  name,
  active,
  onClick,
}: {
  hex: string
  name: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={name}
      onClick={onClick}
      className={cn(
        'size-6 rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-px',
        active ? 'border-yellow' : 'border-black/40',
      )}
      style={{ background: hex }}
    />
  )
}

/** 1 hàng lựa chọn: nhãn trái + nội dung */
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      {children}
    </div>
  )
}

/** Free build: bảng mọi case + màu, chọn 1 ô (+ layout, mount, PCB, plate, stab) rồi vào build ngay với đủ đồ */
export function FreeBuildDialog() {
  const onClose = () => useGame.setState({ freePick: false })
  const [pick, setPick] = useState<{ caseId: string; color: string } | null>(null)
  const [layout, setLayout] = useState<LayoutId | ''>('')
  // kiểu layout đang chọn (space liền / 7u / split, backspace, hàng dưới...); kiểu không có ở layout thì lấy kiểu đầu
  const [variant, setVariant] = useState<Variant>({})
  const [mount, setMount] = useState('')
  const [pcb, setPcb] = useState('hotswap')
  const [plate, setPlate] = useState(0)
  const [stab, setStab] = useState(0)
  const [sw, setSw] = useState(0)
  const [kit, setKit] = useState('')
  const [kcColor, setKcColor] = useState(KC_COLORS[0])
  // feet / thiếc / O-ring là vật tư đang chọn trong store (bàn build đổi tiếp được)
  const feet = useGame((s) => s.feetPick)
  const solder = useGame((s) => s.solderPick)
  const oring = useGame((s) => s.oringPick)

  const groups = FF_ORDER.map((ff) => {
    const ids = Object.keys(CASES).filter((id) => CASES[id].ff === ff)
    // case cùng họ (nhôm / nhựa) cùng cỡ gộp 1 dòng (đặt ở chỗ case đầu tiên của họ)
    const rows: Row[] = []
    for (const id of ids) {
      const fam = familyOf(id)
      const same = fam ? ids.filter((x) => familyOf(x) === fam) : []
      if (!fam) rows.push({ id })
      else if (id === same[0]) rows.push(same.length > 1 ? { ff, fam, ids: same } : { id })
    }
    // thẻ case dựng bằng code trước, rồi tới case CAD
    rows.sort((a, b) => Number(!('ids' in a)) - Number(!('ids' in b)))
    return { ff, ids, rows }
  }).filter((g) => g.ids.length)
  // dòng họ case: chất liệu + số mảnh đang chọn theo cỡ + họ (mặc định anod / ABS, 2 mảnh)
  // lọc bảng case theo cỡ ('' = tất cả)
  const [ffFilter, setFfFilter] = useState<FormFactor | ''>('')
  // phần cài đặt case đang chọn mở / thu gọn
  const [optsOpen, setOptsOpen] = useState(true)
  // nhóm cỡ case đang thu gọn (bấm đầu nhóm để đóng / mở)
  const [folded, setFolded] = useState<Set<FormFactor>>(new Set())
  const toggleFold = (ff: FormFactor) =>
    setFolded((s) => {
      const n = new Set(s)
      if (n.has(ff)) n.delete(ff)
      else n.add(ff)
      return n
    })
  const [famSel, setFamSel] = useState<
    Record<string, { finish: string; pieces: number; usb?: boolean }>
  >({})
  const famOf = (key: string, ids: string[]) =>
    famSel[key] ?? {
      // mặc định nhôm anod (không có thì chất liệu đầu tiên theo thứ tự nút), 2 mảnh
      finish: FINISHES.find(([f]) => ids.some((id) => finishOf(id) === f))?.[0] ?? finishOf(ids[0]),
      pieces: ids.some((id) => CASES[id].pieces === 2) ? 2 : 1,
    }
  const choose = (caseId: string, color: string) => {
    setPick({ caseId, color })
    const lays = freeLayouts(caseId)
    if (!layout || !lays.includes(layout)) setLayout(lays[0] ?? '')
    const ms = CASES[caseId].mounts
    if (!ms.includes(mount) || mountStabIssue(mount, STAB_IDS[stab]))
      setMount(ms.find((m) => !mountStabIssue(m, STAB_IDS[stab])) ?? ms[0])
  }
  // stab screw-in: O-ring mount bị cấn → khoá nút, đang chọn O-ring thì về mount khác
  const pickStab = (i: number) => {
    setStab(i)
    if (pick && mountStabIssue(mount, STAB_IDS[i])) {
      const m = CASES[pick.caseId].mounts.find((x) => !mountStabIssue(x, STAB_IDS[i]))
      if (m) setMount(m)
    }
  }
  const layouts = pick ? freeLayouts(pick.caseId) : []
  // kiểu layout case đang chọn làm được (HHKB space 10u chỉ case 2 mảnh: `caseFits`) + kiểu đang chọn thật sự (không hợp thì kiểu đầu)
  // Planck (ortho) gộp vào "Kiểu layout" của 40% (không nút layout riêng) khi case làm được cả 2
  const planckIn40 = layouts.includes('40') && layouts.includes('planck')
  const baseLayout: LayoutId | '' = layout === 'planck' && planckIn40 ? '40' : layout
  const variantOpts = (k: VariantKey, opts: string[]) =>
    pick && baseLayout
      ? opts.filter((val) => caseFits(CASES[pick.caseId], baseLayout, { ...variant, [k]: val }))
      : opts
  // lọc từ trên xuống: nút layout "40% HHKB" = layout 40% chỉ với các kiểu space HHKB (bỏ 2 phím góc); nút "40%" = các kiểu còn lại
  // (+ Planck); dữ liệu vẫn là layout '40' + `variant.space`
  const hhkb40 = baseLayout === '40' && layout === '40' && isHhkb40(variant.space)
  const scopeOpts = (k: VariantKey, opts: string[]) =>
    baseLayout === '40' && k === 'space'
      ? hhkb40
        ? opts.filter(isHhkb40)
        : [...opts.filter((v) => !isHhkb40(v)), ...(planckIn40 ? ['planck'] : [])]
      : opts
  const spaceAll = LAYOUTS['40'].variants.space ?? []
  const pick40 = (hhkb: boolean) => {
    const opts = variantOpts('space', spaceAll).filter((v) => isHhkb40(v) === hhkb)
    setLayout('40')
    setVariant({ ...variant, space: opts[0] })
  }
  const curVariant = (k: VariantKey, opts: string[]) => {
    const ok = variantOpts(k, opts)
    return variant[k] && ok.includes(variant[k]!) ? variant[k]! : ok[0]
  }
  const effVariant: Variant = layout
    ? Object.fromEntries(
        (Object.entries(LAYOUTS[layout].variants) as [VariantKey, string[]][]).map(([k, opts]) => [
          k,
          curVariant(k, opts),
        ]),
      )
    : {}
  const kits = layout ? freeKits(layout) : []
  const kitId = kits.includes(kit) ? kit : (kits[0] ?? '')
  const go = () => {
    if (!pick || !layout) return
    startFreeBuild({
      ...pick,
      layout,
      variant: effVariant,
      mount,
      pcb,
      plate: PLATE_IDS[plate],
      stab: STAB_IDS[stab],
      switchType: SWITCH_IDS[sw],
      keycapKit: kitId,
      keycapColor: kcColor,
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[3500] grid animate-fade-in place-items-center bg-black/60 p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <HudCard className="flex max-h-[90vh] w-[min(920px,100%)] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-head text-xl font-extrabold text-yellow">Free build: chọn case</h3>
          {/* lọc bảng case theo cỡ: 1 ô đổ xuống góc phải */}
          <OptionSelect
            className="w-44"
            options={[
              { label: 'Tất cả' },
              ...groups.map((g) => ({ label: FF_NAME[g.ff], note: `${g.rows.length}` })),
            ]}
            value={ffFilter ? groups.findIndex((g) => g.ff === ffFilter) + 1 : 0}
            onChange={(i) => setFfFilter(i ? groups[i - 1].ff : '')}
          />
        </div>
        <Muted className="text-sm">
          Bấm 1 ô màu để chọn case. Có sẵn đủ linh kiện + dụng cụ + vật tư, không cần mua. Đóng gói
          xong cầm thùng đặt lên kệ giao hàng là build xong, chọn case khác build tiếp (không chấm
          điểm).
        </Muted>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
          {groups
            .filter((g) => !ffFilter || g.ff === ffFilter)
            .map((g) => (
              // mỗi cỡ case = 1 khối khung riêng: đầu nhóm trên cùng, thẻ case nằm trong khung (rõ thuộc nhóm nào)
              <div
                key={g.ff}
                className="flex flex-col gap-1 rounded-2xl border-2 border-white/10 bg-black/20 p-1.5"
              >
                {/* đầu nhóm cỡ case: thanh bấm đóng / mở như sub menu */}
                <button
                  type="button"
                  onClick={() => toggleFold(g.ff)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10"
                  style={{ cursor: 'var(--cursor-hand)' }}
                >
                  <ChevronDown
                    className={cn(
                      'size-4 text-yellow transition-transform',
                      folded.has(g.ff) && '-rotate-90',
                    )}
                  />
                  <span className="font-head text-base font-extrabold text-yellow">
                    {FF_NAME[g.ff]}
                  </span>
                  <span className="text-xs text-muted">{g.rows.length} case</span>
                </button>
                {!folded.has(g.ff) && (
                  <div className="flex flex-col gap-1">
                    {g.rows.map((row) => {
                      if ('ids' in row) {
                        const key = `${row.ff}-${row.fam}`
                        const sel = famOf(key, row.ids)
                        const id = aluPick(row.ids, sel.finish, sel.pieces, sel.usb)
                        const c = CASES[id]
                        // đổi bề mặt / số mảnh: đang chọn case họ này thì chọn luôn case mới (giữ màu nếu có)
                        const set = (next: { finish: string; pieces: number; usb?: boolean }) => {
                          setFamSel({ ...famSel, [key]: next })
                          if (pick && row.ids.includes(pick.caseId)) {
                            const nid = aluPick(row.ids, next.finish, next.pieces, next.usb)
                            choose(
                              nid,
                              CASES[nid].colors.includes(pick.color)
                                ? pick.color
                                : CASES[nid].colors[0],
                            )
                          }
                        }
                        // số mảnh có trong thẻ, chất liệu có ở số mảnh đang chọn
                        const pieces = [...new Set(row.ids.map((x) => CASES[x].pieces))].sort()
                        const finishes = FINISHES.filter(([f]) =>
                          row.ids.some((x) => finishOf(x) === f && CASES[x].pieces === c.pieces),
                        )
                        // đổi số mảnh: giữ chất liệu nếu số mảnh đó có, không thì chất liệu đầu tiên của số mảnh đó
                        const setPieces = (p: number) => {
                          const ok = (f: string) =>
                            row.ids.some((x) => finishOf(x) === f && CASES[x].pieces === p)
                          set({
                            ...sel,
                            pieces: p,
                            finish: ok(sel.finish)
                              ? sel.finish
                              : (FINISHES.find(([f]) => ok(f))?.[0] ?? sel.finish),
                          })
                        }
                        return (
                          <div
                            key={key}
                            className={cn(
                              'flex flex-col gap-1.5 rounded-xl border-2 bg-panel-2 px-3 py-1.5',
                              pick && row.ids.includes(pick.caseId)
                                ? 'border-yellow'
                                : 'border-transparent',
                            )}
                          >
                            {/* hàng 1: tên case + chọn số mảnh; hàng 2: chất liệu (+ cổng USB) của số mảnh đó; hàng 3: màu (đều canh phải) */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="shrink-0 text-sm font-bold">
                                Case {FF_NAME[row.ff]}
                              </span>
                              <div className="flex flex-wrap justify-end gap-1">
                                {pieces.map((p) => (
                                  <OptionChip
                                    key={p}
                                    active={c.pieces === p}
                                    onClick={() => setPieces(p)}
                                  >
                                    {p} mảnh
                                  </OptionChip>
                                ))}
                              </div>
                            </div>
                            {/* chất liệu có ở số mảnh đang chọn: ô đổ xuống */}
                            <div className="flex justify-end">
                              <OptionSelect
                                className="w-52"
                                options={finishes.map(([, label]) => ({ label }))}
                                value={Math.max(
                                  0,
                                  finishes.findIndex(([f]) => f === finishOf(id)),
                                )}
                                onChange={(i) =>
                                  set({ ...sel, finish: finishes[i][0], pieces: c.pieces })
                                }
                              />
                            </div>
                            {/* cổng USB tách hàng riêng: daughterboard hoặc cổng C hàn trên PCB (chỉ case có bản `pcbUsb`
                                cùng chất liệu + số mảnh) */}
                            {row.ids.some(
                              (x) =>
                                CASES[x].pcbUsb &&
                                finishOf(x) === finishOf(id) &&
                                CASES[x].pieces === c.pieces,
                            ) && (
                              <div className="flex justify-end gap-1">
                                {([false, true] as const).map((u) => (
                                  <OptionChip
                                    key={String(u)}
                                    active={!!c.pcbUsb === u}
                                    onClick={() => set({ ...sel, usb: u })}
                                  >
                                    {u ? 'Cổng C trên PCB' : 'Daughterboard'}
                                  </OptionChip>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-end gap-1">
                              {c.colors.map((col) => (
                                <Swatch
                                  key={col}
                                  hex={caseSwatch(col)}
                                  name={CASE_COLORS[col]?.name ?? col}
                                  active={pick?.caseId === id && pick.color === col}
                                  onClick={() => choose(id, col)}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      }
                      const id = row.id
                      const c = CASES[id]
                      return (
                        <div
                          key={id}
                          className={cn(
                            'flex flex-wrap items-center gap-2 rounded-xl border-2 bg-panel-2 px-3 py-1.5',
                            pick?.caseId === id ? 'border-yellow' : 'border-transparent',
                          )}
                        >
                          <span className="min-w-[200px] flex-1 text-sm font-bold">
                            {c.name}
                            <span className="ml-1.5 text-xs font-normal text-muted">
                              {c.pieces} mảnh · {c.mounts.map((m) => MOUNTS[m].name).join(', ')}
                              {c.model ? ' · CAD' : ''}
                            </span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {c.colors.map((col) => (
                              <Swatch
                                key={col}
                                hex={caseSwatch(col)}
                                name={CASE_COLORS[col]?.name ?? col}
                                active={pick?.caseId === id && pick.color === col}
                                onClick={() => choose(id, col)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
        </div>
        {pick && (
          <div className="flex flex-col gap-2 text-sm">
            {/* tên case đang chọn + nút thu gọn / mở phần cài đặt (thu lại để danh sách case rộng ra) */}
            <button
              type="button"
              onClick={() => setOptsOpen((o) => !o)}
              className="flex items-center justify-between gap-2 rounded-xl bg-panel-2 px-3 py-2 text-left font-bold text-yellow hover:bg-white/10"
              style={{ cursor: 'var(--cursor-hand)' }}
              title={optsOpen ? 'Thu gọn cài đặt' : 'Mở cài đặt'}
            >
              <span>
                {CASES[pick.caseId].name} · {CASE_COLORS[pick.color]?.name ?? pick.color}
              </span>
              <ChevronDown
                className={cn('size-4 transition-transform', !optsOpen && 'rotate-180')}
              />
            </button>
            {optsOpen && (
              <>
                <Line label="Màu case">
                  {CASES[pick.caseId].colors.map((col) => (
                    <Swatch
                      key={col}
                      hex={caseSwatch(col)}
                      name={CASE_COLORS[col]?.name ?? col}
                      active={pick.color === col}
                      onClick={() => choose(pick.caseId, col)}
                    />
                  ))}
                </Line>
                <Line label="Màu keycap">
                  {KC_COLORS.map((c) => (
                    <Swatch
                      key={c}
                      hex={KEYCAP_COLORS[c].hex}
                      name={KEYCAP_COLORS[c].name}
                      active={kcColor === c}
                      onClick={() => setKcColor(c)}
                    />
                  ))}
                </Line>
                <Line label="Màu feet">
                  {FEET_IDS.map((id) => (
                    <Swatch
                      key={id}
                      hex={SUPPLIES[id].color}
                      name={SUPPLIES[id].name}
                      active={feet === id}
                      onClick={() => useGame.setState({ feetPick: id })}
                    />
                  ))}
                </Line>
                {mount === 'oring' && (
                  <Line label="Dây O-ring">
                    {ORING_IDS.map((id) => (
                      <Swatch
                        key={id}
                        hex={SUPPLIES[id].color}
                        name={SUPPLIES[id].name}
                        active={oring === id}
                        onClick={() => useGame.setState({ oringPick: id })}
                      />
                    ))}
                  </Line>
                )}
                <Line label="Layout">
                  {layouts
                    .filter((l) => !(l === 'planck' && planckIn40))
                    .flatMap((l) =>
                      l === '40' && variantOpts('space', spaceAll).some(isHhkb40)
                        ? [
                            <OptionChip
                              key="40"
                              active={baseLayout === '40' && !hhkb40}
                              onClick={() => pick40(false)}
                            >
                              {LAYOUTS['40'].name}
                            </OptionChip>,
                            <OptionChip key="40hhkb" active={hhkb40} onClick={() => pick40(true)}>
                              40% HHKB
                            </OptionChip>,
                          ]
                        : [
                            <OptionChip
                              key={l}
                              active={layout === l || (l === '40' && baseLayout === '40')}
                              onClick={() => setLayout(l)}
                            >
                              {CHIP_NAME[l] ?? LAYOUTS[l].name}
                            </OptionChip>,
                          ],
                    )}
                </Line>
                {baseLayout &&
                  (Object.entries(LAYOUTS[baseLayout].variants) as [VariantKey, string[]][])
                    // 40%: kiểu space theo nút layout (thường + Planck / HHKB), Planck chọn = đổi sang layout Planck
                    .map(([k, all]) => [k, scopeOpts(k, variantOpts(k, all))] as const)
                    .filter(
                      ([k, opts]) => opts.length > 1 && (layout !== 'planck' || k === 'space'),
                    )
                    .map(([k, opts]) => {
                      const cur = layout === 'planck' ? 'planck' : curVariant(k, opts)
                      return (
                        // mỗi lựa chọn 1 dòng riêng theo tên (Backspace, Caps Lock...); Caps Lock 2 kiểu → nút bấm, còn lại ô đổ xuống
                        // (40%: 7 kiểu space) cho gọn
                        <Line key={k} label={VARIANT_NAME[k]}>
                          {k === 'caps' ? (
                            opts.map((val) => (
                              <OptionChip
                                key={val}
                                active={cur === val}
                                onClick={() => setVariant({ ...variant, [k]: val })}
                              >
                                {variantShort(k, val)}
                              </OptionChip>
                            ))
                          ) : (
                            <OptionSelect
                              className="w-80"
                              options={opts.map((val) => ({
                                label:
                                  val === 'planck' ? LAYOUTS.planck.name : variantLabel(k, val),
                              }))}
                              value={Math.max(0, opts.indexOf(cur))}
                              onChange={(i) => {
                                if (opts[i] === 'planck') return setLayout('planck')
                                if (layout === 'planck') setLayout('40')
                                setVariant({ ...variant, [k]: opts[i] })
                              }}
                            />
                          )}
                        </Line>
                      )
                    })}
                <Line label="Mount">
                  {CASES[pick.caseId].mounts.map((m) => (
                    <OptionChip
                      key={m}
                      active={mount === m}
                      disabled={!!mountStabIssue(m, STAB_IDS[stab])}
                      title={mountStabIssue(m, STAB_IDS[stab]) ?? undefined}
                      onClick={() => setMount(m)}
                    >
                      {MOUNTS[m].name}
                    </OptionChip>
                  ))}
                </Line>
                <Line label="PCB">
                  {Object.keys(PCB_TYPES).map((t) => (
                    <OptionChip key={t} active={pcb === t} onClick={() => setPcb(t)}>
                      {PCB_TYPES[t].name}
                    </OptionChip>
                  ))}
                </Line>
                <Line label="Plate">
                  <OptionSelect
                    className="w-56"
                    options={PLATE_IDS.map((id) => ({ label: PLATES[id].name }))}
                    value={plate}
                    onChange={setPlate}
                  />
                  <span className="ml-3 w-12 text-muted">Stab</span>
                  <OptionSelect
                    className="w-56"
                    options={STAB_IDS.map((id) => ({ label: STABS[id].name }))}
                    value={stab}
                    onChange={pickStab}
                  />
                </Line>
                <Line label="Switch">
                  <OptionSelect
                    className="w-56"
                    options={SWITCH_IDS.map((id) => ({
                      label: `${SWITCHES[id].name} · ${SWITCHES[id].kind}`,
                    }))}
                    value={sw}
                    onChange={setSw}
                  />
                  <span className="ml-3 w-12 text-muted">Keycap</span>
                  <OptionSelect
                    className="w-56"
                    options={kits.map((id) => ({ label: kitName(id) }))}
                    value={Math.max(0, kits.indexOf(kitId))}
                    onChange={(i) => setKit(kits[i])}
                  />
                </Line>
                {pcb === 'solder' && (
                  <Line label="Thiếc hàn">
                    {SOLDER_IDS.map((id) => (
                      <OptionChip
                        key={id}
                        active={solder === id}
                        onClick={() => useGame.setState({ solderPick: id })}
                      >
                        {SUPPLIES[id].name}
                      </OptionChip>
                    ))}
                  </Line>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>Đóng</Button>
          <Button tone="green" disabled={!pick || !layout} onClick={go}>
            Build
          </Button>
        </div>
      </HudCard>
    </div>,
    document.body,
  )
}
