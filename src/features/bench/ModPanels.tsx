import type { ReactNode } from 'react'
import { useGame, useBuild, useCtx } from '@/store'
import { STABS, SWITCHES, TOOLS } from '@/data/parts'
import {
  FEET_IDS,
  ORING_IDS,
  FOAM_ID,
  JOINTS_PER_KEY,
  LUBE_IDS,
  SOLDER_IDS,
  SUPPLIES,
  lubeUseFit,
  solderSkill,
  spellBonus,
  spellRun,
  SPELL_LUBE,
  SPELL_OPEN,
  type LubeUse,
} from '@/data/supplies'
import { stabModRules } from '@/data/mods'
import { stabSets } from '@/data/steps'
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
  type StepDotState,
} from '@/components/ui'
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
  /** nút làm bước này (ẩn khi đã xong / không làm được) */
  onDo?: () => void
}

/** 1 mod: chấm trạng thái giống danh sách bước (✓ xong · số vàng = nên làm tiếp · – không cần) */
function ModRow({ index, state, name, req, onDo }: ModRowProps) {
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
      {/* chưa làm được (đang chạy hoạt cảnh / không cần / không cho phép) thì chỉ mờ đi, không ẩn */}
      {state !== 'done' && (
        <Button size="sm" tone="blue" onClick={onDo} disabled={!onDo} className="shrink-0">
          Làm
        </Button>
      )}
    </div>
  )
}

/** Cảnh báo thiếu dụng cụ */
function ToolWarn({ kinds }: { kinds: ('brush' | 'clipper' | 'opener')[] }) {
  const tools = useGame((s) => s.tools)
  const openShop = useGame((s) => s.openShop)
  const missing = kinds.filter((k) => TOOLS[k][tools[k]].none)
  if (!missing.length) return null
  // khung cảnh báo nổi bật (thay dòng chữ đỏ nhỏ), kèm nút mở Shopii đúng mục dụng cụ
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
  const mods = useBuild().stabMods
  const model = useGame((s) => s.inventory.stab!.type)
  const finishOptional = useGame((s) => s.finishOptional)
  const modStab = useGame((s) => s.modStab)
  const busy = useGame((s) => !!s.stabAnim)
  const n = ctx.stabKeys.length
  const m = STABS[model]
  const rules = stabModRules(model)
  // mod nên làm tiếp theo (cùng thứ tự mũi tên vàng trên bàn)
  const next = rules.find((r) => r.needed && r.allowed && !mods[r.kind])?.kind
  return (
    <HudPanel
      id="stabMod"
      title={`🛠 Mod stab (${n} stab)`}
      footer={
        <Button tone="green" className="w-full" onClick={finishOptional} disabled={busy}>
          {mods.wired ? 'Xong, đi lắp stab' : 'Bỏ qua mod'}
        </Button>
      }
    >
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
              name={r.label}
              state={mods[r.kind] ? 'done' : !r.needed ? 'skip' : r.kind === next ? 'cur' : 'todo'}
              req={r.reason ?? ''}
              onDo={r.allowed && !busy ? () => modStab(r.kind) : undefined}
            />
          ))}
        {/* kìm cắt chỉ cần khi phải clip chân stem */}
        <ToolWarn kinds={m.feet ? ['brush', 'clipper'] : ['brush']} />
      </HudSection>
      <HudSection id="stabMod.housing" title="Housing + slider">
        <LubePicker slot="housing" use="housing" disabled={!!mods.housing} />
      </HudSection>
      <HudSection id="stabMod.wire" title="Wire">
        <LubePicker slot="wire" use="wire" disabled={!!mods.wire} />
      </HudSection>
      <HudSection id="stabMod.help" title="Hướng dẫn">
        <Muted>
          Click bộ phận trên bàn (theo mũi tên vàng) hoặc bấm "Làm". Mỗi lần lube / dán băng dùng{' '}
          {n} lượt vật tư.
        </Muted>
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
  // phép mở / phép lube switch (bán riêng, lượt riêng): thợ lõ thành 10 con, có chứng chỉ thì cộng 10 (`spellRun`)
  const openLeft = useGame((s) => s.supplies[SPELL_OPEN] ?? 0)
  const lubeLeft = useGame((s) => s.supplies[SPELL_LUBE] ?? 0)
  const openSpell = useGame((s) => spellBonus(s.supplies, SPELL_OPEN))
  const lubeSpell = useGame((s) => spellBonus(s.supplies, SPELL_LUBE))
  const perOpen = spellRun(TOOLS.cert[certLv].n!, openSpell)
  const perLube = spellRun(TOOLS.cert[certLv].n!, lubeSpell)
  // save cũ: switch của đơn đang build bị bán mất cả loại (null) → coi như hết switch, không vỡ bảng
  const swType = useGame((s) => s.inventory.switch?.type)
  const pref = useGame((s) => s.order!.lubePref)
  const finishOptional = useGame((s) => s.finishOptional)
  const busy = useGame((s) => !!s.lubeAnim)
  const sw = swType ? SWITCHES[swType] : undefined
  const total = ctx.keys.length
  const opened = build.opened ?? build.lubed
  if (!sw)
    return (
      <HudPanel
        id="switchLube"
        title="🧴 Lube switch"
        footer={
          <Button tone="green" className="w-full" onClick={finishOptional} disabled={busy}>
            Bỏ qua lube →
          </Button>
        }
      >
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
    <HudPanel
      id="switchLube"
      title="🧴 Lube switch"
      footer={
        <Button tone="green" className="w-full" onClick={finishOptional} disabled={busy}>
          {build.lubed ? 'Xong, đi lắp switch →' : 'Bỏ qua lube →'}
        </Button>
      }
    >
      {/* thông tin switch lên đầu, các khung cảnh báo xếp liền nhau bên dưới */}
      <Muted>
        {sw.name} ({sw.feel}){sw.prelubed ? ' · đã lube sẵn từ nhà máy' : ' · chưa lube'}
      </Muted>
      {/* khách dặn không lube: đưa vào khung cảnh báo cho khỏi bỏ sót */}
      {pref === 'none' ? (
        <Alert title={PREF_TEXT[pref]}>Lube vào sẽ bị trừ điểm, bấm "Bỏ qua lube" để đi tiếp</Alert>
      ) : (
        <div className={cn('text-xs font-bold', pref === 'want' ? 'text-green' : 'text-muted')}>
          {PREF_TEXT[pref]}
        </div>
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
        <div className="text-xs">{`Click switch trên đồ mở để tách housing, stem và lò xo, mỗi lần ${perOpen} con`}</div>
        {openLeft > 0 && (
          <div className="text-xs font-bold text-green">{`Phép mở switch: ${perOpen}/lần (còn ${openLeft} lần)`}</div>
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
          <div className="text-xs">{`Đã mở chờ lube: ${opened - build.lubed} · ${perLube} con / mẻ (theo bậc thợ${lubeSpell ? ' + phép' : ''})`}</div>
        )}
        {lubeLeft > 0 && (
          <div className="text-xs font-bold text-green">{`Phép lube switch: ${perLube}/mẻ (còn ${lubeLeft} lần)`}</div>
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
  const solderOwned = useGame((s) => s.solderOwned)
  const lastPurchase = useGame((s) => s.lastSolderPurchase)
  const undoPurchase = useGame((s) => s.undoSolderPurchase)
  const iron = TOOLS.solder[tools.solder]
  const cleaner = TOOLS.tipCleaner[tools.tipCleaner]
  const joints = Object.values(build.solder)
  const burnt = joints.filter((j) => j !== true && j.burnt).length
  const total = ctx.keys.length
  const wear = useGame((s) => s.wear.desolder ?? 0)
  const pump = TOOLS.desolder[tools.desolder ?? 0]
  const good = joints.length - burnt
  const skill = solderSkill(tools.solder >= 2, pick)
  // dụng cụ có độ bền: hiện số lần dùng còn lại (hết thì hỏng, phải mua lại)
  const wearAll = useGame((s) => s.wear)
  const tool = (t: { name: string; none?: boolean; life?: number }, kind?: ToolKind) => {
    const left = t.life && kind ? t.life - (wearAll[kind] ?? 0) : null
    return (
      <div className={cn('text-xs', t.none ? 'text-red' : 'text-[#9fe6b6]')}>
        {t.none ? '⚠️ ' : '✓ '}
        {t.name}
        {left !== null && !t.none && (
          <span className={cn('ml-1', left <= 30 ? 'text-yellow' : 'text-muted')}>
            · còn {left}/{t.life} lần
          </span>
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
        {/* đổi qua lại bút hàn / trạm hàn đã mua; chưa mua thì mờ đi (mua ở Shopii) */}
        <div className="flex flex-wrap gap-1">
          {TOOLS.solder.map((item, level) => {
            if (item.none) return null
            const using = tools.solder === level
            const owned = using || solderOwned[level] !== undefined
            const left =
              (item.life ?? 0) - (using ? (wearAll.solder ?? 0) : (solderOwned[level] ?? 0))
            return (
              <Button
                key={level}
                size="sm"
                tone={using ? 'green' : 'default'}
                disabled={!owned || using}
                title={owned ? `Còn ${left}/${item.life} lần` : 'Chưa có'}
                onClick={() => buyTool('solder', level)}
              >
                {using ? '✓ ' : ''}
                {SOLDER_SHORT[level]}
              </Button>
            )
          })}
        </div>
        {lastPurchase && (
          <Button size="sm" onClick={undoPurchase}>
            Hoàn tác mua {TOOLS.solder[lastPurchase.level].name} · hoàn {fmt(lastPurchase.cost)}
          </Button>
        )}
        {tool(cleaner, 'tipCleaner')}
        {tool(pump)}
        {!pump.none && <Muted>Bút hút thiếc: {Math.max(0, 1000 - wear)}/1000 lượt còn lại</Muted>}
        {burnt > 0 && <Muted>Bấm mối cháy để hút thiếc, lau mũi hàn rồi hàn lại.</Muted>}
        {!iron.none && (
          <Muted>
            Mỗi phím: bấm cho kim nhiệt chạy, bấm lần nữa dừng trong vùng xanh (rộng{' '}
            {Math.round(skill.width * 100)}% thanh, vàng = hoàn hảo); đỏ phải là cháy chân
          </Muted>
        )}
      </HudSection>
      <HudSection id="solder.wire" title="Thiếc hàn">
        <div className="flex flex-wrap gap-1">
          {SOLDER_IDS.map((id) => (
            <OptionChip key={id} active={pick === id} onClick={() => setSolderPick(id)}>
              {SUPPLIES[id].name} ({supplies[id] ?? 0})
            </OptionChip>
          ))}
        </div>
        <Muted>{SUPPLIES[pick].desc}</Muted>
        <Muted>
          Mỗi phím dùng {JOINTS_PER_KEY} mối hàn · cần {(total - good) * JOINTS_PER_KEY} mối nữa
        </Muted>
      </HudSection>
    </HudPanel>
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
  return (
    <HudPanel id="feet" title="🦶 Dán feet cao su">
      <ProgressBar value={total ? done / total : 1} tone="green" />
      <div className="text-xs">
        Đã dán {done}/{total} feet
      </div>
      <HudSection id="feet.pick" title="Loại feet">
        <div className="flex flex-wrap gap-1">
          {/* nhiều màu: chỉ hiện màu đang có trong kho + màu đang chọn */}
          {FEET_IDS.filter((id) => id === pick || (supplies[id] ?? 0) > 0).map((id) => (
            <OptionChip
              key={id}
              active={pick === id}
              swatch={SUPPLIES[id].color}
              onClick={() => setFeetPick(id)}
            >
              {SUPPLIES[id].name.replace('Feet cao su ', 'Feet ')} ({supplies[id] ?? 0})
            </OptionChip>
          ))}
        </div>
        <Muted>Chọn màu feet hợp màu case (mua thêm màu khác ở Shopii). 1 lần mua = 4 cái.</Muted>
      </HudSection>
      {left > 0 && (supplies[pick] ?? 0) < left && (
        <Alert
          tone="yellow"
          title={`Còn thiếu feet: cần ${left}, ${SUPPLIES[pick].name.toLowerCase()} còn ${supplies[pick] ?? 0}`}
        >
          {have >= left && <Muted>Màu khác còn đủ, đổi màu để dán tiếp.</Muted>}
          <Button size="sm" tone="yellow" onClick={() => openShop('supply')}>
            Mua feet ở Shopii
          </Button>
        </Alert>
      )}
    </HudPanel>
  )
}

/** Bảng bước cuốn O-ring: chọn độ cứng dây (trắng 30A / đen 50A / đỏ 70A, số còn trong kho), khách đòi thì nhắc */
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
