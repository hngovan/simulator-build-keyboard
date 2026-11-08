import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, HudCard, Muted, OptionChip, OptionSelect } from '@/components/ui'
import { cn } from '@/lib/format'
import { LAYOUTS, variantLabel } from '@/data/layouts'
import {
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
const FF_ORDER: FormFactor[] = ['40', 'planck', '60', '65', '75', 'alice', 'frl', 'tkl', 'full']
const PLATE_IDS = plateIds()
const STAB_IDS = Object.keys(STABS)
const SWITCH_IDS = Object.keys(SWITCHES)
const KC_COLORS = Object.keys(KEYCAP_COLORS)
/** tên bộ keycap gọn: bỏ "Full" / "(mọi layout)", chỉ còn profile (Cherry, OEM, SA...) */
const kitName = (id: string) =>
  KEYCAP_KITS[id].name.replace(/\s*\(.*\)/, '').replace(/\s+Full$/, '')

/** chất liệu chọn trong họ case: bề mặt nhôm, loại nhựa */
const FINISHES = [
  ['anod', 'Anod'],
  ['ecoat', 'E-coat'],
  ['abs', 'ABS'],
  ['pc', 'PC'],
] as const
/** họ case dựng bằng code (không CAD) gộp 1 dòng mỗi cỡ: nhôm (anod / E-coat), nhựa (ABS đục / PC trong); chọn chất liệu + số mảnh */
type Family = 'alu' | 'plastic'
const FAMILY_NAME: Record<Family, string> = { alu: 'nhôm', plastic: 'nhựa' }
const familyOf = (id: string): Family | null => {
  const c = CASES[id]
  // case CAD / case 2 chất liệu (nắp PC đáy nhôm) đứng riêng
  if (c.model || c.bottom) return null
  if (c.material === 'anod' || c.material === 'ecoat') return 'alu'
  return c.material === 'abs' || c.material === 'pc' ? 'plastic' : null
}
/** 1 dòng trong bảng: case lẻ hoặc cả họ case cùng cỡ */
type Row = { id: string } | { ff: FormFactor; fam: Family; ids: string[] }
/** case trong họ theo chất liệu + số mảnh; thiếu đúng tổ hợp thì giữ chất liệu (PC chỉ có 2 mảnh), rồi cùng số mảnh */
const aluPick = (ids: string[], finish: string, pieces: number, usb = false) => {
  // cổng USB: daughterboard / cổng C hàn trên PCB (`pcbUsb`, nhôm 1 mảnh 60% / 40% bên trái, TKL bên phải); thiếu thì lấy bản DTB
  const list = ids.filter((id) => !!CASES[id].pcbUsb === usb)
  const pool = list.length ? list : ids.filter((id) => !CASES[id].pcbUsb)
  return (
    pool.find((id) => CASES[id].material === finish && CASES[id].pieces === pieces) ??
    pool.find((id) => CASES[id].material === finish) ??
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
      <span className="w-24 text-muted">{label}</span>
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
    return { ff, ids, rows }
  }).filter((g) => g.ids.length)
  // dòng họ case: chất liệu + số mảnh đang chọn theo cỡ + họ (mặc định anod / ABS, 2 mảnh)
  const [famSel, setFamSel] = useState<
    Record<string, { finish: string; pieces: number; usb?: boolean }>
  >({})
  const famOf = (key: string, ids: string[]) =>
    famSel[key] ?? {
      finish: CASES[ids[0]].material === 'abs' ? 'abs' : 'anod',
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
  const kits = layout ? freeKits(layout) : []
  const kitId = kits.includes(kit) ? kit : (kits[0] ?? '')
  const go = () => {
    if (!pick || !layout) return
    startFreeBuild({
      ...pick,
      layout,
      variant,
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
        <h3 className="font-head text-xl font-extrabold text-yellow">Free build: chọn case</h3>
        <Muted className="text-sm">
          Bấm 1 ô màu để chọn case. Có sẵn đủ linh kiện + dụng cụ + vật tư, không cần mua. Đóng gói
          xong cầm thùng đặt lên kệ giao hàng là build xong, chọn case khác build tiếp (không chấm
          điểm).
        </Muted>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-2xl bg-black/15 p-1.5">
          {groups.map((g) => (
            <div key={g.ff} className="flex flex-col gap-1">
              <div className="px-2 pt-1 text-[13px] font-bold text-muted">
                {g.ff.toUpperCase()} · {g.ids.length} case
              </div>
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
                        CASES[nid].colors.includes(pick.color) ? pick.color : CASES[nid].colors[0],
                      )
                    }
                  }
                  // số mảnh có ở chất liệu đang xem (PC chỉ 2 mảnh)
                  const pieces = [
                    ...new Set(
                      row.ids
                        .filter((x) => CASES[x].material === c.material)
                        .map((x) => CASES[x].pieces),
                    ),
                  ].sort()
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex flex-wrap items-center gap-2 rounded-xl border-2 bg-panel-2 px-3 py-1.5',
                        pick && row.ids.includes(pick.caseId)
                          ? 'border-yellow'
                          : 'border-transparent',
                      )}
                    >
                      <span className="min-w-[200px] flex-1 text-sm font-bold">
                        Case {row.ff.toUpperCase()} {FAMILY_NAME[row.fam]}
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          {FINISHES.find(([f]) => f === c.material)?.[1]} · {c.pieces} mảnh ·{' '}
                          {c.pcbUsb ? 'cổng C trên PCB · ' : ''}
                          {c.mounts.map((m) => MOUNTS[m].name).join(', ')}
                        </span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {FINISHES.filter(([f]) => row.ids.some((x) => CASES[x].material === f)).map(
                          ([f, label]) => (
                            <OptionChip
                              key={f}
                              active={sel.finish === f}
                              onClick={() =>
                                set({
                                  ...sel,
                                  finish: f,
                                  pieces: CASES[aluPick(row.ids, f, sel.pieces, sel.usb)].pieces,
                                })
                              }
                            >
                              {label}
                            </OptionChip>
                          ),
                        )}
                        {pieces.map((p) => (
                          <OptionChip
                            key={p}
                            active={c.pieces === p}
                            onClick={() => set({ ...sel, pieces: p })}
                          >
                            {p} mảnh
                          </OptionChip>
                        ))}
                        {/* cổng USB: daughterboard hoặc cổng C hàn trên PCB (chỉ case có bản `pcbUsb` cùng chất liệu + số mảnh) */}
                        {row.ids.some(
                          (x) =>
                            CASES[x].pcbUsb &&
                            CASES[x].material === c.material &&
                            CASES[x].pieces === c.pieces,
                        ) &&
                          ([false, true] as const).map((u) => (
                            <OptionChip
                              key={String(u)}
                              active={!!c.pcbUsb === u}
                              onClick={() => set({ ...sel, usb: u })}
                            >
                              {u ? 'Cổng C trên PCB' : 'Daughterboard'}
                            </OptionChip>
                          ))}
                      </div>
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
          ))}
        </div>
        {pick && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="font-bold text-yellow">
              {CASES[pick.caseId].name} · {CASE_COLORS[pick.color]?.name ?? pick.color}
            </div>
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
              {layouts.map((l) => (
                <OptionChip key={l} active={layout === l} onClick={() => setLayout(l)}>
                  {LAYOUTS[l].name}
                </OptionChip>
              ))}
            </Line>
            {layout &&
              (Object.entries(LAYOUTS[layout].variants) as [VariantKey, string[]][])
                .filter(([, opts]) => opts.length > 1)
                .map(([k, opts]) => {
                  const cur = variant[k] && opts.includes(variant[k]!) ? variant[k] : opts[0]
                  return (
                    <Line key={k} label="Kiểu layout">
                      {opts.map((val) => (
                        <OptionChip
                          key={val}
                          active={cur === val}
                          onClick={() => setVariant({ ...variant, [k]: val })}
                        >
                          {variantLabel(k, val)}
                        </OptionChip>
                      ))}
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
