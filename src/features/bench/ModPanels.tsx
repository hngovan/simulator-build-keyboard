import type { ReactNode } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import { STABS, SWITCHES, TOOLS } from '@/data/parts'
import {
  FEET_IDS,
  BATTERY_IDS,
  ORING_IDS,
  FOAM_ID,
  CASE_FOAM_ID,
  JOINTS_PER_KEY,
  LUBE_IDS,
  SOLDER_IDS,
  SUPPLIES,
  lubeUseFit,
  spellBonus,
  spellRun,
  spellBatch,
  SPELL_LUBE,
  SPELL_STAB,
  SPELL_OPEN,
  SPELL_ASSEM,
  SPELL_KEYCAP,
  type LubeUse,
} from '@/data/supplies'
import { lubeAdvice, stabModRules, unitsModded } from '@/data/mods'
import { toolOnWay } from '@/data/shipping'
import { batteryFits, stabSets } from '@/data/steps'
import type { LubePick } from '@/store/shopSlice'
import type { ToolKind } from '@/types'
import {
  Alert,
  Button,
  HudPanel,
  HudSection,
  Muted,
  OptionChip,
  ProgressBar,
  StepDot,
  ThumbLoading,
  type StepDotState,
} from '@/components/ui'
import { Info, Lightbulb } from 'lucide-react'
import { ToolCard } from './ToolCard'
import { useModelThumb } from '@/features/apps/shop/modelThumb'
import { cn, fmt } from '@/lib/format'

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
      {/* nhận xét độ hợp của mỡ đang chọn: đặt trên đầu, đọc trước khi chọn */}
      <span className={cn('text-xs font-bold', fitTone(fit))}>
        {SUPPLIES[value].name}: {note}
      </span>
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => (
          <OptionChip
            key={id}
            active={value === id}
            disabled={disabled}
            onClick={() => setLubePick(slot, id)}
            title={SUPPLIES[id].desc}
          >
            {SUPPLIES[id].name} ({supplies[id] ?? 0})
          </OptionChip>
        ))}
      </div>
    </div>
  )
}

interface ModRowProps {
  /** thứ tự hiện trong chấm trạng thái */
  index: number
  state: StepDotState
  name: string
  req: ReactNode
}

/** 1 mod: chấm trạng thái giống danh sách bước (✓ xong · số vàng = nên làm tiếp · – không cần); làm = bấm bộ phận trên bàn mod */
function ModRow({ index, state, name, req }: ModRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-dashed border-line py-1.5 last:border-b-0',
        state === 'done' && 'text-[#9fe6b6]',
        state === 'cur' && 'font-extrabold text-white',
        state === 'skip' && 'text-muted',
      )}
    >
      <StepDot state={state}>{index}</StepDot>
      {/* tên bước + lý do (dòng dưới, chữ nhỏ) để tên không bị bóp vỡ dòng */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{name}</span>
        {req && <span className="text-xs font-normal text-muted">{req}</span>}
      </span>
    </div>
  )
}

/** Cảnh báo thiếu dụng cụ */
function ToolWarn({ kinds }: { kinds: ('brush' | 'clipper' | 'opener')[] }) {
  const tools = useGame((s) => s.tools)
  const openShop = useGame((s) => s.openShop)
  const missing = kinds.filter((k) => TOOLS[k][tools[k]].none)
  if (!missing.length) return null
  // khung cảnh báo nổi bật (thay dòng chữ đỏ nhỏ), kèm nút mở Shopii đúng mục dụng cụ; đã đặt thì nhắc ra cửa nhận
  return (
    <Alert title="Thiếu dụng cụ">
      <ul className="list-disc pl-5">
        {missing.map((k) => (
          <li key={k}>{TOOLS[k][1].name}</li>
        ))}
      </ul>
      <Button size="sm" tone="red" onClick={() => openShop('tool')}>
        🛒 Mua ở Shopii
      </Button>
    </Alert>
  )
}

export function StabModPanel() {
  const ctx = useCtx()
  const build = useBuild()
  const mods = build.stabMods
  const model = useGame((s) => s.inventory.stab!.type)
  const n = ctx.stabKeys.length
  const m = STABS[model]
  const rules = stabModRules(model)
  // mod nên làm tiếp theo (cùng thứ tự mũi tên vàng trên bàn)
  const next = rules.find((r) => r.needed && r.allowed && !mods[r.kind])?.kind
  // phép mod stab: mỗi lần mod làm luôn nhiều con
  const stabLeft = useGame((s) => s.supplies[SPELL_STAB] ?? 0)
  const stabSpell = useGame((s) => spellBonus(s.supplies, SPELL_STAB))
  // bậc thợ cộng dồn phép (`spellBatch`): số stab mỗi lần mod
  const stabRun = useGame((s) => spellBatch(TOOLS.cert[s.tools.cert ?? 0].n!, stabSpell))
  return (
    <HudPanel id="stabMod" title={`🛠 Mod stab (${n} stab)`}>
      <Muted>
        {stabSets(ctx.stabKeys)
          .map((s) => `${s.label} ×${s.count}`)
          .join(' · ')}
      </Muted>
      <Muted>
        {m.name}: {m.desc}
      </Muted>
      <HudSection id="stabMod.steps" title="Các bước mod">
        {/* chỉ liệt kê mod stab này cần (TX / Staebies khít, chân clip sẵn: không có bước clip / Holee); lỡ làm rồi thì vẫn hiện */}
        {rules
          .filter((r) => r.needed || mods[r.kind])
          .map((r, i) => (
            <ModRow
              key={r.kind}
              index={i + 1}
              // mod làm từng con: hiện số con đã làm
              name={`${r.label} (${unitsModded(build, r.kind, n)}/${n})`}
              state={mods[r.kind] ? 'done' : !r.needed ? 'skip' : r.kind === next ? 'cur' : 'todo'}
              req={r.reason ?? ''}
            />
          ))}
        {/* kìm cắt chỉ cần khi phải clip chân stem */}
        <ToolWarn kinds={m.feet ? ['brush', 'clipper'] : ['brush']} />
        {stabLeft > 0 && (
          <>
            <div className="text-xs">{`Mỗi lần mod ${stabRun} stab`}</div>
            <div className="text-xs font-bold text-green">{`Phép mod stab: ${stabSpell} stab/lần (còn ${stabLeft} lần)`}</div>
          </>
        )}
      </HudSection>
      <HudSection id="stabMod.housing" title="Housing + slider">
        {/* con đầu phết rồi thì các con sau dùng cùng loại mỡ */}
        <LubePicker
          slot="housing"
          use="housing"
          disabled={!!mods.housing || !!build.stabModLube?.housing}
        />
      </HudSection>
      <HudSection id="stabMod.wire" title="Wire">
        <LubePicker slot="wire" use="wire" disabled={!!mods.wire || !!build.stabModLube?.wire} />
      </HudSection>
    </HudPanel>
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
  const certLv = useGame((s) => s.tools.cert ?? 0)
  // phép mở / phép lube switch (bán riêng, lượt riêng): bậc thợ cộng dồn 10 (`spellRun`)
  const openLeft = useGame((s) => s.supplies[SPELL_OPEN] ?? 0)
  const lubeLeft = useGame((s) => s.supplies[SPELL_LUBE] ?? 0)
  const openSpell = useGame((s) => spellBonus(s.supplies, SPELL_OPEN))
  const lubeSpell = useGame((s) => spellBonus(s.supplies, SPELL_LUBE))
  const perOpen = spellRun(TOOLS.cert[certLv].n!, openSpell)
  const perLube = spellRun(TOOLS.cert[certLv].n!, lubeSpell)
  // save cũ: switch của đơn đang build bị bán mất cả loại (null) → coi như hết switch, không vỡ bảng
  const swType = useGame((s) => s.inventory.switch?.type)
  const pref = useGame((s) => s.order!.lubePref)
  const sw = swType ? SWITCHES[swType] : undefined
  const total = ctx.keys.length
  const opened = build.opened ?? build.lubed
  const closed = build.swClosed ?? 0
  // lò xo đã thả lại vào housing (bản lưu cũ: = số con đã đóng)
  const springsIn = Math.max(build.springsIn ?? 0, closed)
  if (!sw)
    return (
      <HudPanel id="switchLube" title="🧴 Lube switch">
        <Alert title="Hết switch">
          Switch của đơn đã bán hết, mua thêm để lube
          {/* mở Shopii đúng mục switch (như nút mua dụng cụ ở ToolWarn) */}
          <Button size="sm" tone="red" onClick={() => useGame.getState().openShop('switch')}>
            Mua ở Shopii
          </Button>
        </Alert>
      </HudPanel>
    )
  return (
    // không lube thì bấm "Bỏ qua" ở nút bước dưới đáy
    <HudPanel id="switchLube" title="🧴 Lube switch">
      {/* thông tin switch lên đầu, các khung cảnh báo xếp liền nhau bên dưới */}
      <Muted>
        {sw.name} ({sw.feel}){sw.prelubed ? ' · đã lube sẵn từ nhà máy' : ' · chưa lube'}
      </Muted>
      {/* khách dặn không lube: đưa vào khung cảnh báo cho khỏi bỏ sót */}
      {pref === 'none' ? (
        <Alert title={PREF_TEXT[pref]}>Lube vào sẽ bị trừ điểm, bấm "Bỏ qua" để đi tiếp</Alert>
      ) : (
        <div className={cn('text-xs font-bold', pref === 'want' ? 'text-green' : 'text-muted')}>
          {PREF_TEXT[pref]}
        </div>
      )}
      {/* tactile / clicky: lube thân dễ mất khấc / tiếng click, lube lò xo thì luôn được */}
      {pref !== 'none' && lubeAdvice(sw.feel) && (
        <Alert title={sw.feel === 'clicky' ? 'Switch clicky' : 'Switch tactile'}>
          {lubeAdvice(sw.feel)}
        </Alert>
      )}
      <ToolWarn kinds={['opener', 'brush']} />
      <HudSection
        id="switchLube.open"
        title={
          <span className="flex items-center gap-2">
            <StepDot state={opened >= total ? 'done' : 'cur'}>1</StepDot>
            Mở switch {opened}/{total}
          </span>
        }
      >
        <div className="text-xs">{`Click switch trên đồ mở để tách housing, stem và lò xo, mỗi lần ${perOpen} switch`}</div>
        {openLeft > 0 && (
          <div className="text-xs font-bold text-green">{`Phép mở switch: ${openSpell} switch/lần (còn ${openLeft} lần)`}</div>
        )}
        <ProgressBar value={opened / total} tone="green" className="mt-1" />
      </HudSection>
      <HudSection
        id="switchLube.switch"
        title={
          <span className="flex items-center gap-2">
            <StepDot state={build.lubed >= total ? 'done' : opened > build.lubed ? 'cur' : 'todo'}>
              2
            </StepDot>
            Lube switch {build.lubed}/{total}
          </span>
        }
      >
        {!opener.none && (
          <div className="text-xs">{`Đã mở chờ lube: ${opened - build.lubed} · mỗi lần lube ${perLube} switch`}</div>
        )}
        {lubeLeft > 0 && (
          <div className="text-xs font-bold text-green">{`Phép lube switch: ${lubeSpell} switch/lần (còn ${lubeLeft} lần)`}</div>
        )}
        <LubePicker slot="switch" use={sw.feel} disabled={!!build.lubeType} />
        <ProgressBar value={build.lubed / total} tone="green" className="mt-1" />
      </HudSection>
      <HudSection
        id="switchLube.spring"
        title={
          <span className="flex items-center gap-2">
            <StepDot state={build.springLube ? 'done' : 'todo'}>3</StepDot>
            Lube lò xo (hết tiếng ping)
          </span>
        }
      >
        <LubePicker slot="spring" use="spring" disabled={!!build.springLube} />
        <div className="text-xs">
          {build.springLube
            ? `Lò xo đã lube ${SUPPLIES[build.springLube].name}`
            : opened < total
              ? `Mỗi switch mở ra bỏ 1 lò xo vào hộp (${opened}/${total}), mở hết mới lube được`
              : 'Click hộp lắc trên bàn: nhỏ dầu vào hộp lò xo rồi lắc đều'}
        </div>
      </HudSection>
      <HudSection
        id="switchLube.close"
        title={
          <span className="flex items-center gap-2">
            <StepDot state={opened > 0 && closed >= opened ? 'done' : closed > 0 ? 'cur' : 'todo'}>
              4
            </StepDot>
            Lắp lại: lò xo {springsIn} · đóng {closed}/{opened || total}
          </span>
        }
      >
        <div className="text-xs">
          {`Lube xong thì click lưới switch trên bàn, xen kẽ: lần 1 thả lò xo từ hộp vào housing, lần 2 lắp stem + úp housing trên đóng lại (mỗi lần ${perOpen} switch). Đã thả lò xo thì không lube thêm / lube lò xo được nữa`}
        </div>
        <ProgressBar value={opened ? closed / opened : 0} tone="green" className="mt-1" />
      </HudSection>
    </HudPanel>
  )
}

/** tên ngắn trên nút đổi dụng cụ hàn */
const SOLDER_SHORT: Record<number, string> = { 1: 'Bút hàn', 2: 'Trạm hàn' }

/** Panel bước hàn: dụng cụ hàn đang có, chọn loại thiếc, tiến độ + số mối cháy */
export function SolderPanel() {
  const ctx = useCtx()
  const build = useBuild()
  const tools = useGame((s) => s.tools)
  const supplies = useGame((s) => s.supplies)
  const pick = useGame((s) => s.solderPick)
  const setSolderPick = useGame((s) => s.setSolderPick)
  const buyTool = useGame((s) => s.buyTool)
  const addCart = useGame((s) => s.addCart)
  const parcels = useGame((s) => s.parcels)
  const solderOwned = useGame((s) => s.solderOwned)
  const lastPurchase = useGame((s) => s.lastSolderPurchase)
  const undoPurchase = useGame((s) => s.undoSolderPurchase)
  const iron = TOOLS.solder[tools.solder]
  const cleaner = TOOLS.tipCleaner[tools.tipCleaner]
  const joints = Object.values(build.solder)
  const burnt = joints.filter((j) => j !== true && j.burnt).length
  const total = ctx.keys.length
  const pump = TOOLS.desolder[tools.desolder ?? 0]
  const good = joints.length - burnt
  // dụng cụ có độ bền: hiện số lần dùng còn lại (hết thì hỏng, phải mua lại)
  const wearAll = useGame((s) => s.wear)
  // tên 1 dòng, độ bền (còn / tổng) xuống dòng dưới
  const tool = (t: { name: string; none?: boolean; life?: number }, kind?: ToolKind) => {
    const left = t.life && kind ? t.life - (wearAll[kind] ?? 0) : null
    return (
      <div className={cn('text-xs', t.none ? 'text-red' : 'text-[#9fe6b6]')}>
        {t.none ? '⚠️ ' : '✓ '}
        {t.name}
        {left !== null && !t.none && (
          <div className={cn('pl-4', left <= 30 ? 'text-yellow' : 'text-muted')}>
            Độ bền: {Math.max(0, left)}/{t.life}
          </div>
        )}
      </div>
    )
  }
  return (
    <HudPanel id="solder" title="🔥 Hàn switch">
      <ProgressBar value={good / total} tone="green" />
      <div className="text-xs">
        Đã hàn đạt {good}/{total}
        {burnt > 0 && <span className="text-red"> · {burnt} mối cháy xém</span>}
      </div>
      {build.tipDirty && (
        <div className="text-xs font-bold text-yellow">
          Mũi hàn đen: bấm bùi nhùi trên bàn để lau rồi hàn tiếp
        </div>
      )}
      <HudSection id="solder.tools" title="Dụng cụ">
        {tool(iron, 'solder')}
        {/* đổi qua lại bút hàn / trạm hàn đã mua; chưa có thì bấm thêm vào giỏ Shopii (thanh toán ở máy tính) */}
        <div className="flex gap-1">
          {TOOLS.solder.map((item, level) => {
            if (item.none) return null
            const using = tools.solder === level
            const owned = using || solderOwned[level] !== undefined
            const left =
              (item.life ?? 0) - (using ? (wearAll.solder ?? 0) : (solderOwned[level] ?? 0))
            // chưa có: thêm vào giỏ Shopii, thanh toán ở máy tính rồi ra cửa nhận mới dùng
            const coming = !owned && toolOnWay(parcels, 'solder', level)
            return (
              <ToolCard
                key={level}
                kind="solder"
                level={level}
                label={SOLDER_SHORT[level]}
                note={owned ? undefined : coming ? 'Đang giao' : fmt(item.price)}
                active={using}
                disabled={using || coming}
                title={
                  owned
                    ? `Còn ${left}/${item.life} lần`
                    : coming
                      ? 'Đang giao, ra cửa nhận hàng'
                      : `Chưa có · thêm vào giỏ Shopii ${fmt(item.price)}`
                }
                onClick={() => {
                  if (owned) return void buyTool('solder', level)
                  addCart({
                    key: `tool-solder:${level}`,
                    product: `tool-solder-${level}`,
                    label: item.name,
                    unit: { kind: 'tool', tool: 'solder', level, price: item.price },
                    qty: 1,
                  })
                }}
              />
            )
          })}
        </div>
        {lastPurchase && (
          <Button size="sm" onClick={undoPurchase}>
            Hoàn tác mua {TOOLS.solder[lastPurchase.level].name} · hoàn {fmt(lastPurchase.cost)}
          </Button>
        )}
        {tool(cleaner, 'tipCleaner')}
        {tool(pump, 'desolder')}
        {burnt > 0 && <Muted>Bấm mối cháy để hút thiếc, lau mũi hàn rồi hàn lại.</Muted>}
        {/* 1 khung chung: cách hàn + bút hàn khó giữ nhiệt (`PEN_BURN`), luôn hiện để biết khác biệt lúc chọn dụng cụ */}
        <Alert tone="yellow" icon={Lightbulb} title="Hướng dẫn">
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
            <li>
              Giữ chuột cho thanh nhiệt chạy, nhả trong vùng xanh, nhả vùng đỏ là bị cháy chân hàn
            </li>
            <li>
              Nhiệt độ bút hàn không ổn định nên nhả đúng vùng xanh vẫn có tỉ lệ bị cháy chân. Trạm
              hàn giữ nhiệt ổn định, không bị
            </li>
          </ul>
        </Alert>
      </HudSection>
      <HudSection id="solder.wire" title="Thiếc hàn">
        <div className="flex flex-wrap gap-1">
          {SOLDER_IDS.map((id) => (
            <OptionChip
              key={id}
              active={pick === id}
              onClick={() => setSolderPick(id)}
              title={SUPPLIES[id].desc}
            >
              {SUPPLIES[id].name} ({supplies[id] ?? 0})
            </OptionChip>
          ))}
        </div>
        <Muted>
          Mỗi chân switch cần {JOINTS_PER_KEY} mối hàn: {(total - good) * JOINTS_PER_KEY}/
          {total * JOINTS_PER_KEY} mối hàn còn lại
        </Muted>
        {/* mô tả loại thiếc đang chọn: khung ghi chú dưới cùng */}
        <Alert tone="yellow" icon={Info} title="Ghi chú">
          <span className="text-xs">{SUPPLIES[pick].desc}</span>
        </Alert>
      </HudSection>
    </HudPanel>
  )
}

/** Ảnh model feet theo màu (`supply:<id>`, chụp sẵn bằng bake:thumbs; chưa có thì ô màu) */
function FeetThumb({ id }: { id: string }) {
  const thumb = useModelThumb('supply', id)
  return (
    <div className="relative grid h-24 w-full place-items-center overflow-hidden rounded-xl bg-black/15">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 size-full object-contain"
          draggable={false}
        />
      ) : thumb === undefined ? (
        <ThumbLoading />
      ) : (
        <span className="size-12 rounded-full" style={{ background: SUPPLIES[id].color }} />
      )}
    </div>
  )
}

/** Panel bước dán feet: chọn feet đen / trắng (số còn trong kho), tiến độ, hết feet thì mở Shopii */
export function FeetPanel() {
  const ctx = useCtx()
  const build = useBuild()
  const supplies = useGame((s) => s.supplies)
  const pick = useGame((s) => s.feetPick)
  const setFeetPick = useGame((s) => s.setFeetPick)
  const openShop = useGame((s) => s.openShop)
  const done = Object.keys(build.feet ?? {}).length
  const total = ctx.feet.length
  const left = total - done
  const have = FEET_IDS.reduce((a, id) => a + (supplies[id] ?? 0), 0)
  // đã dán ≥ 1 cái: khoá màu theo feet đầu (placeFoot cũng dùng màu này), hoàn tác hết thì mở lại
  const locked = Object.values(build.feet ?? {})[0]
  const cur = locked ?? pick
  return (
    <HudPanel id="feet" title="🦶 Dán feet cao su">
      <ProgressBar value={total ? done / total : 1} tone="green" />
      <div className="text-xs">
        Đã dán {done}/{total} feet
      </div>
      <HudSection id="feet.pick" title="Loại feet">
        {/* ảnh model feet màu đang chọn (ảnh chụp sẵn như thẻ Shopii) + hàng ô màu để chọn */}
        <FeetThumb id={cur} />
        <div className="text-center text-xs font-bold">
          {SUPPLIES[cur].name}
          <span
            className={cn('font-semibold', (supplies[cur] ?? 0) > 0 ? 'text-muted' : 'text-red')}
          >
            {` · còn ${supplies[cur] ?? 0}`}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {FEET_IDS.map((id) => {
            const n = supplies[id] ?? 0
            const off = !!locked && id !== locked
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFeetPick(id)}
                disabled={off}
                title={
                  off
                    ? `Đã dán ${SUPPLIES[locked].name.toLowerCase()}, các feet phải cùng màu (hoàn tác để đổi)`
                    : `${SUPPLIES[id].name}: ${n > 0 ? `còn ${n}` : 'chưa có, mua ở Shopii'}`
                }
                className={cn(
                  'relative size-7 rounded-full border-2 shadow-[0_2px_0_#0006]',
                  cur === id
                    ? 'border-green ring-2 ring-green/50'
                    : 'border-black/40 enabled:hover:border-yellow',
                  (off || (n <= 0 && cur !== id)) && 'opacity-35',
                )}
                style={{ background: SUPPLIES[id].color }}
              >
                {n > 0 && (
                  <span className="absolute -right-1.5 -bottom-1.5 rounded-md bg-black/80 px-1 text-[9px] leading-tight font-extrabold text-white">
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <Muted>
          {locked
            ? 'Đã dán feet đầu tiên: các feet còn lại phải cùng màu (hoàn tác hết để đổi màu).'
            : 'Chọn màu feet hợp màu case (mua thêm màu khác ở Shopii). 1 lần mua = 4 cái.'}
        </Muted>
      </HudSection>
      {left > 0 && (supplies[cur] ?? 0) < left && (
        <Alert
          tone="yellow"
          title={`Còn thiếu feet: cần ${left}, ${SUPPLIES[cur].name.toLowerCase()} còn ${supplies[cur] ?? 0}`}
        >
          {have >= left && !locked && <Muted>Màu khác còn đủ, đổi màu để dán tiếp.</Muted>}
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua feet ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/** Bảng bước cuốn O-ring: chọn độ cứng dây (trắng 30A / đen 50A / cam 70A, số còn trong kho), khách đòi thì nhắc */
export function RingPanel() {
  const build = useBuild()
  const supplies = useGame((s) => s.supplies)
  const pick = useGame((s) => s.oringPick)
  const want = useGame((s) => s.order?.oring)
  const setOringPick = useGame((s) => s.setOringPick)
  const openShop = useGame((s) => s.openShop)
  const done = typeof build.ring === 'string' ? build.ring : build.ring ? 'oring50' : null
  return (
    <HudPanel id="ring" title="⭕ Dây O-ring">
      <div className="text-xs">
        {done
          ? `Đã cuốn ${SUPPLIES[done].name}`
          : 'Chọn dây rồi click vào board để cuốn quanh viền'}
      </div>
      {want && (
        <Alert tone="yellow" title={`Khách muốn ${SUPPLIES[want].name}`}>
          {done && done !== want && (
            <Muted>Đang cuốn loại khác, khách sẽ chấm trượt mục này.</Muted>
          )}
        </Alert>
      )}
      <HudSection id="ring.pick" title="Độ cứng dây">
        <div className="flex flex-wrap gap-1">
          {ORING_IDS.map((id) => (
            <OptionChip
              key={id}
              active={pick === id}
              disabled={!!done}
              swatch={SUPPLIES[id].color}
              onClick={() => setOringPick(id)}
              title={SUPPLIES[id].desc.replace(/^.*bàn phím. /, '')}
            >
              {SUPPLIES[id].name.replace('Dây O-ring ', '')} ({supplies[id] ?? 0})
            </OptionChip>
          ))}
        </div>
        <Muted>{SUPPLIES[pick].desc.replace(/^.*bàn phím\. /, '')}</Muted>
      </HudSection>
      {!done && (supplies[pick] ?? 0) < 1 && (
        <Alert tone="yellow" title={`Hết ${SUPPLIES[pick].name.toLowerCase()}`}>
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua dây O-ring ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/** Bảng bước lót foam PCB (tuỳ chọn): còn bao nhiêu tấm Poron, thiếu thì mua ở Shopii */
export function FoamPanel() {
  const build = useBuild()
  const have = useGame((s) => s.supplies[FOAM_ID] ?? 0)
  const openShop = useGame((s) => s.openShop)
  return (
    <HudPanel id="foam" title="🧽 Foam Poron lót PCB">
      <div className="text-xs">
        {build.foam ? 'Đã lót foam' : `Còn ${have} tấm foam (1 tấm / bàn phím)`}
      </div>
      <Muted>
        Foam nằm giữa PCB và plate: giảm rung, tiếng gõ trầm, thock hơn. Không cần thì bấm "Bỏ qua".
      </Muted>
      {!build.foam && have < 1 && (
        <Alert tone="yellow" title="Hết foam Poron">
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua foam ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/** Bảng bước lắp pin (tuỳ chọn): chọn dung lượng (số còn trong kho, pin to hơn hốc thì khoá), trạng thái đặt / cắm dây */
export function BatteryPanel() {
  const ctx = useCtx()
  const bat = useBuild().battery
  const supplies = useGame((s) => s.supplies)
  const pick = useGame((s) => s.batteryPick)
  const openShop = useGame((s) => s.openShop)
  const fit = BATTERY_IDS.filter((id) => batteryFits(id, ctx.battery))
  const max = fit[fit.length - 1]
  const cur = bat?.id ?? pick
  return (
    <HudPanel id="battery" title="🔋 Lắp pin Li-Po">
      <div className="text-xs">
        {!bat
          ? 'Chọn pin rồi click hốc pin trên sàn case'
          : bat.plugged
            ? `Đã lắp ${SUPPLIES[bat.id].name}, dây đã cắm vào PCB`
            : 'Đã đặt pin: click đầu dây đỏ / đen rồi click jack pin trên PCB'}
      </div>
      <HudSection id="battery.pick" title="Dung lượng">
        <div className="flex flex-wrap gap-1.5">
          {BATTERY_IDS.map((id) => {
            const n = supplies[id] ?? 0
            const ok = fit.includes(id)
            return (
              <OptionChip
                key={id}
                active={cur === id}
                disabled={!!bat || !ok}
                onClick={() => useGame.setState({ batteryPick: id })}
                title={
                  ok
                    ? `${SUPPLIES[id].name}: ${n > 0 ? `còn ${n}` : 'chưa có, mua ở Shopii'}`
                    : 'To hơn hốc pin của case này'
                }
              >
                {SUPPLIES[id].battery!.mah}mAh{n > 0 ? ` · ${n}` : ''}
              </OptionChip>
            )
          })}
        </div>
        <Muted>
          {max
            ? `Hốc pin case này vừa tối đa ${SUPPLIES[max].battery!.mah}mAh${ctx.mount === 'tray' ? ' (tray mount: trụ đồng chiếm chỗ)' : ''}. Không làm không dây thì bấm "Bỏ qua".`
            : 'Hốc pin case này quá nhỏ cho mọi loại pin.'}
        </Muted>
      </HudSection>
      {!bat && (supplies[cur] ?? 0) < 1 && (
        <Alert tone="yellow" title={`Hết ${SUPPLIES[cur].name.toLowerCase()}`}>
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua pin ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/** Bảng bước lót foam đáy case (tuỳ chọn): còn bao nhiêu tấm, thiếu thì mua ở Shopii */
export function CaseFoamPanel() {
  const build = useBuild()
  const have = useGame((s) => s.supplies[CASE_FOAM_ID] ?? 0)
  const openShop = useGame((s) => s.openShop)
  return (
    <HudPanel id="caseFoam" title="🧽 Foam lót đáy case">
      <div className="text-xs">
        {build.caseFoam ? 'Đã lót foam đáy case' : `Còn ${have} tấm foam đáy (1 tấm / bàn phím)`}
      </div>
      <Muted>
        Tấm Poron đen nằm dưới đáy case, khoét sẵn lỗ trụ tray mount + chỗ daughterboard: bớt tiếng
        rỗng, đỡ vang góc. Không cần thì bấm "Bỏ qua".
      </Muted>
      {!build.caseFoam && have < 1 && (
        <Alert tone="yellow" title="Hết foam đáy case">
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua foam ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/**
 * Panel bước lắp switch / keycap: tiến độ, số phím mỗi lần bấm (bậc thợ + phép lắp), phép còn bao nhiêu lần;
 * chưa có phép thì nhắc mua ở Shopii → Sách phép
 */
export function InstallPanel({ kind }: { kind: 'switch' | 'keycap' }) {
  const ctx = useCtx()
  const build = useBuild()
  const certLv = useGame((s) => s.tools.cert ?? 0)
  const spellId = kind === 'switch' ? SPELL_ASSEM : SPELL_KEYCAP
  const left = useGame((s) => s.supplies[spellId] ?? 0)
  const bonus = useGame((s) => spellBonus(s.supplies, spellId))
  const openShop = useGame((s) => s.openShop)
  const certN = TOOLS.cert[certLv].n!
  const per = spellRun(certN, bonus)
  const total = ctx.keys.length
  const done = ctx.keys.filter(
    (k) => (kind === 'switch' ? build.switches : build.keycaps)[k.id],
  ).length
  const what = kind === 'switch' ? 'switch' : 'keycap'
  return (
    <HudPanel id={`install.${kind}`} title={kind === 'switch' ? '🔩 Lắp switch' : '⌨️ Lắp keycap'}>
      <ProgressBar value={done / total} tone="green" />
      <div className="text-xs">
        Đã lắp {done}/{total}
      </div>
      <div className="text-xs">{`Mỗi lần bấm lắp ${per} ${what} liền nhau trong hàng`}</div>
      {/* chứng chỉ thợ + phép cộng dồn (`spellRun`): mỗi nguồn 1 dòng; thợ lõ không có dòng chứng chỉ */}
      {certN > 1 && (
        <div className="text-xs font-bold text-green">
          {`${TOOLS.cert[certLv].name.replace('Chứng chỉ thợ', 'Thợ')}: ${certN} ${what}/lần`}
        </div>
      )}
      {left > 0 ? (
        <div className="text-xs font-bold text-green">
          {`${SUPPLIES[spellId].name}: ${bonus} ${what}/lần (còn ${left} lần)`}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Muted className="flex-1">{`Chưa có ${SUPPLIES[spellId].name}`}</Muted>
          <Button size="sm" onClick={() => openShop('spell')}>
            Mua ở Shopii
          </Button>
        </div>
      )}
    </HudPanel>
  )
}
