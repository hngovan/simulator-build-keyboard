import type { StateCreator } from 'zustand'
import { SCREW_STEPS, STEP_INFO, stabUnits, stepProgress } from '@/data/steps'
import { SWITCHES, TOOLS } from '@/data/parts'
import {
  JOINTS_PER_KEY,
  SPELL_ASSEM,
  SPELL_LUBE,
  SPELL_OPEN,
  SPELL_DESOLDER,
  SPELL_KEYCAP,
  installTargets,
  SPELL_SOLDER,
  spellSolderKeys,
  lubeUseFit,
  spellBonus,
  spellRun,
} from '@/data/supplies'
import {
  lubePicks,
  lubedIds,
  stabAnimDuration,
  stabModRules,
  type StabAnim,
  type StabModKind,
} from '@/data/mods'
import { SUPPLIES } from '@/data/supplies'
import type { BuildContext, BuildState, ScrewBit, ScrewStep, StepId, ToolKind } from '@/types'
import { scoreDelivery } from './scoring'
import { leftoverSpare } from './spare'
import type { GameState } from '.'
import { emptyInventory } from './shopSlice'

export type { StabModKind }

// Thao tác trên bàn build 3D
export interface BuildSlice {
  ctx: BuildContext | null
  build: BuildState | null
  pressed: Record<string, boolean>
  /** hoạt cảnh mod stab đang chạy (không lưu) */
  stabAnim: StabAnim | null
  /** hoạt cảnh bàn lube switch đang chạy: quét mỡ 1 mẻ switch / lắc hộp lò xo (không lưu) */
  lubeAnim: LubeAnim | null
  /** lịch sử thao tác để hoàn tác / quay lại bước cũ (không lưu) */
  history: HistoryEntry[]
  /** tổng vật tư đã dùng trong lần build này (để hoàn trả khi hoàn tác) */
  supplyUsed: Record<string, number>
  /**
   * Các trạng thái "phía trước" sau khi hoàn tác / quay lại bước cũ (redo, không lưu).
   * future[0] luôn là trạng thái hiện tại, phần tử cuối là chỗ xa nhất đã làm tới.
   * Làm thao tác mới ở bước cũ thì bỏ nhánh này (các bước sau phụ thuộc bước đó)
   */
  future: HistoryEntry[]
  /** hoàn tác thao tác vừa làm */
  undo: () => void
  /** quay lại đầu 1 bước đã làm */
  backToStep: (stepIdx: number) => void
  /** tiến tới 1 bước đã làm trước đó (sau khi quay lại), giữ nguyên các bước đã làm */
  forwardToStep: (stepIdx: number) => void
  step: () => StepId | undefined
  /** cập nhật build (không tự chuyển bước) */
  patchBuild: (patch: Partial<BuildState>) => void
  /** sang bước tiếp theo khi bước hiện tại xong (bước tuỳ chọn thì bỏ qua được) */
  nextStep: () => void
  /** đầu tua vít đang lắp (không lưu) */
  screwBit: ScrewBit
  /** đầu vít vừa tháo ra */
  prevScrewBit: ScrewBit
  /** performance.now() lúc vừa thay đầu vít, để chạy hiệu ứng thay đầu */
  bitSwapAt: number
  setScrewBit: (bit: ScrewBit) => void
  /** performance.now() lần cuối bấm phím ở bước test (hoặc lúc vào bước): để nhắc phím chưa test */
  testIdleFrom: number
  unbox: () => void
  turnScrew: (id: string) => void
  installStab: (id: string) => void
  placePlate: () => void
  modStab: (kind: StabModKind) => boolean
  /** tách switch bằng đồ mở: mỗi lần bậc thợ + phép mở con */
  openSwitch: () => boolean
  lubeBatch: (idx?: number) => number
  lubeSprings: () => boolean
  finishOptional: () => void
  installRun: (kind: 'switch' | 'keycap', id: string) => number
  /** hàn xong 1 phím (nhả mỏ hàn trong vùng đạt, hoặc giữ quá lâu: burnt) */
  solderKey: (id: string, burnt: boolean, cause?: 'overheat' | 'retries') => void
  failSolderKey: (id: string) => void
  /** đủ mỏ hàn + thiếc + mũi sạch để hàn tiếp không (thiếu thì báo) */
  canSolder: () => boolean
  canDesolder: () => boolean
  desolderKey: (id: string) => boolean
  /** dí mũi hàn vào bùi nhùi lau sạch (sau khi hàn cháy) */
  cleanTip: () => void
  /** dùng 1 lần dụng cụ có độ bền (mỏ hàn, bùi nhùi) */
  wearTool: (kind: ToolKind) => void
  placeGasket: (i: number) => void
  wrapRing: () => void
  dropInCase: () => void
  closeCase: () => void
  /** top mount: úp case trên lên plate */
  placeTopCase: () => void
  press: (id: string, down: boolean) => boolean
  deliver: () => void
}

export const newBuild = (): BuildState => ({
  stepIdx: 0,
  unboxed: false,
  screws: {},
  stabs: {},
  plate: false,
  switches: {},
  solder: {},
  solderFailures: {},
  gaskets: {},
  ring: false,
  inCase: false,
  closed: false,
  keycaps: {},
  tested: {},
  stabMods: {
    clip: false,
    bandaid: false,
    housing: null,
    wire: null,
    assembled: false,
    wired: false,
  },
  stabModDone: false,
  opened: 0,
  lubed: 0,
  lubeType: null,
  springLube: null,
  lubeDone: false,
})

const screwClicks = (s: GameState) => TOOLS.screw[s.tools.screw].clicks!

/** Trạng thái chụp lại trước 1 thao tác */
export interface HistoryEntry {
  build: BuildState
  /** số switch đã cắm lúc đó (để trả switch về kho) */
  installed: number
  supplyUsed: Record<string, number>
  step: StepId
}
const HISTORY_MAX = 300

interface LubeAnim {
  /** open = đang tách switch trên đồ mở */
  kind: 'switch' | 'spring' | 'open'
  lube: string
  /** số switch trong mẻ (kind = switch) */
  batch: number
  /** switch được bấm (cọ quét con này), kind = switch */
  idx?: number
  at: number
  dur: number
}

/**
 * Rút gọn lịch sử để lưu: giữ điểm bắt đầu của mọi bước (quay lại bước nào cũng được)
 * + 60 thao tác gần nhất (hoàn tác từng thao tác)
 */
export function compactHistory(history: HistoryEntry[], recent = 60): HistoryEntry[] {
  const keep = new Set<number>()
  const seenStep = new Set<number>()
  history.forEach((e, i) => {
    if (!seenStep.has(e.build.stepIdx)) {
      seenStep.add(e.build.stepIdx)
      keep.add(i)
    }
    if (i >= history.length - recent) keep.add(i)
  })
  return history.filter((_, i) => keep.has(i))
}

export const createBuildSlice: StateCreator<GameState, [], [], BuildSlice> = (set, get) => {
  // Chỉ cho thao tác khi đang ở đúng bước; trả về state đã chắc chắn có build
  const at = (step: StepId) => {
    const s = get()
    return s.build && s.ctx && s.step() === step
      ? (s as GameState & { build: BuildState; ctx: BuildContext })
      : null
  }
  // Chụp trạng thái TRƯỚC thao tác; chỉ ghi vào lịch sử khi thao tác thành công (commit)
  const snapshot = (): HistoryEntry | null => {
    const s = get()
    if (!s.build || !s.ctx) return null
    return {
      build: s.build,
      installed: Object.keys(s.build.switches).length,
      supplyUsed: s.supplyUsed,
      step: s.ctx.steps[s.build.stepIdx],
    }
  }
  const commit = (snap: HistoryEntry | null) => {
    if (snap) set((s) => ({ history: [...s.history, snap].slice(-HISTORY_MAX), future: [] }))
  }
  /** cất các trạng thái bị lùi qua vào future (giữ bất biến future[0] = trạng thái hiện tại) */
  const pushFuture = (s: GameState, skipped: HistoryEntry[]) =>
    s.future.length ? [...skipped, ...s.future] : [...skipped, snapshot()!]
  // Khôi phục 1 trạng thái cũ: trả lại switch + vật tư đã dùng sau thời điểm đó
  const restore = (e: HistoryEntry) => {
    const s = get()
    if (!s.build) return
    const back = Object.keys(s.build.switches).length - e.installed
    const supplies = { ...s.supplies }
    for (const [id, used] of Object.entries(s.supplyUsed))
      supplies[id] = (supplies[id] ?? 0) + used - (e.supplyUsed[id] ?? 0)
    const sw = s.inventory.switch
    set({
      build: e.build,
      supplies,
      supplyUsed: e.supplyUsed,
      inventory: sw ? { ...s.inventory, switch: { ...sw, count: sw.count + back } } : s.inventory,
      pressed: {},
      viewFlip: false,
    })
  }
  const once = (step: StepId, patch: Partial<BuildState>) => () => {
    const snap = snapshot()
    const s = at(step)
    // đã làm xong (đang chờ bấm bước tiếp theo) thì click lại không ghi thêm
    if (!s) return
    const [done, total] = stepProgress(step, s.build, s.ctx, screwClicks(s))
    if (done >= total) return
    commit(snap)
    get().patchBuild(patch)
  }

  return {
    ctx: null,
    build: null,
    pressed: {},
    stabAnim: null,
    lubeAnim: null,
    history: [],
    future: [],
    supplyUsed: {},
    screwBit: 'phillips',
    prevScrewBit: 'phillips',
    bitSwapAt: 0,
    testIdleFrom: 0,
    setScrewBit: (bit) => {
      const cur = get().screwBit
      if (cur !== bit) set({ screwBit: bit, prevScrewBit: cur, bitSwapAt: performance.now() })
    },

    undo: () => {
      const s = get()
      const e = s.history[s.history.length - 1]
      if (!e || s.stabAnim || s.lubeAnim) return
      const future = pushFuture(s, [e])
      restore(e)
      set({ history: s.history.slice(0, -1), future })
      s.toast(`↶ Hoàn tác: ${STEP_INFO[e.step].title}`)
    },
    backToStep: (stepIdx) => {
      const s = get()
      if (s.stabAnim || s.lubeAnim) return
      // lần đầu bước đó bắt đầu = trạng thái trước thao tác đầu tiên trong bước
      const j = s.history.findIndex((e) => e.build.stepIdx >= stepIdx)
      if (j < 0) return
      const e = s.history[j]
      const future = pushFuture(s, s.history.slice(j))
      restore(e)
      set({ history: s.history.slice(0, j), future })
      s.toast(`↶ Quay lại bước: ${STEP_INFO[e.step].title}`)
    },
    forwardToStep: (stepIdx) => {
      const s = get()
      if (s.stabAnim || s.lubeAnim || !s.build || s.future.length < 2) return
      // bước xa nhất = đúng trạng thái mới nhất (giữ phần đang làm dở trong bước đó);
      // bước giữa chừng = đầu bước (trạng thái trước thao tác đầu tiên trong bước)
      const head = s.future.length - 1
      let f =
        stepIdx >= s.future[head].build.stepIdx
          ? head
          : s.future.findIndex((e, i) => i > 0 && e.build.stepIdx >= stepIdx)
      if (f < 0) f = head
      const e = s.future[f]
      restore(
        // bước không có thao tác nào (vd bỏ qua bước tuỳ chọn): đứng ở bước được chọn, đã xong sẵn
        e.build.stepIdx > stepIdx && f < s.future.length - 1
          ? { ...e, build: { ...e.build, stepIdx } }
          : e,
      )
      set({
        history: [...s.history, ...s.future.slice(0, f)].slice(-HISTORY_MAX),
        future: f === s.future.length - 1 ? [] : s.future.slice(f),
      })
      s.toast(`↷ Tới bước: ${STEP_INFO[s.ctx!.steps[get().build!.stepIdx]].title}`)
    },

    step: () => {
      const { ctx, build } = get()
      return build ? ctx?.steps[build.stepIdx] : undefined
    },
    patchBuild: (patch) => {
      const s = get()
      if (!s.build || !s.ctx) return
      set({ build: { ...s.build, ...patch } })
    },
    // Không tự chuyển bước: người chơi xem kết quả rồi bấm "Bước tiếp theo".
    // Bước tuỳ chọn (mod stab / lube switch) bấm là bỏ qua phần chưa làm
    nextStep: () => {
      const s = get()
      if (!s.build || !s.ctx || s.stabAnim || s.lubeAnim) return
      const step = s.ctx.steps[s.build.stepIdx]
      if (s.build.stepIdx >= s.ctx.steps.length - 1) return
      // đang ở bước cũ (đã quay lại, chưa làm gì mới): đi tiếp theo nhánh đã làm
      if (s.future.length > 1) return s.forwardToStep(s.build.stepIdx + 1)
      const optional = step === 'stabMod' || step === 'switchLube'
      const [done, total] = stepProgress(step, s.build, s.ctx, screwClicks(s))
      if (!optional && done < total) return
      commit(snapshot())
      set({
        build: {
          ...s.build,
          ...(step === 'stabMod' ? { stabModDone: true } : {}),
          ...(step === 'switchLube' ? { lubeDone: true } : {}),
          stepIdx: s.build.stepIdx + 1,
        },
        viewFlip: false,
        testIdleFrom: performance.now(),
      })
    },
    unbox: once('unbox', { unboxed: true }),
    placePlate: once('plate', { plate: true }),
    wrapRing: once('ring', { ring: true }),
    dropInCase: once('caseIn', { inCase: true }),
    closeCase: once('caseClose', { closed: true }),
    placeTopCase: once('topCase', { closed: true }),

    turnScrew: (id) => {
      const s = get()
      const step = s.step() as ScrewStep
      if (
        !s.build ||
        !s.ctx ||
        !SCREW_STEPS[step] ||
        !s.ctx.screws[step].some((sc) => sc.id === id)
      )
        return
      const cur = s.build.screws[id] ?? 0
      if (cur >= screwClicks(s)) return
      commit(snapshot())
      s.patchBuild({ screws: { ...s.build.screws, [id]: cur + 1 } })
    },
    installStab: (id) => {
      const s = at('stab')
      if (!s || s.build.stabs[id]) return
      commit(snapshot())
      s.patchBuild({ stabs: { ...s.build.stabs, [id]: true } })
    },
    // Mod stab theo mẫu stab (áp dụng cho toàn bộ stab của layout). Kiểm tra + trừ vật tư ngay,
    // chạy hoạt cảnh trên bàn mod rồi mới ghi kết quả khi hoạt cảnh xong
    modStab: (kind) => {
      const s = at('stabMod')
      if (!s || !s.inventory.stab || s.stabAnim) return false
      const snap = snapshot()
      const n = s.ctx.stabKeys.length
      const mods = s.build.stabMods
      if (mods[kind]) return false
      const rules = stabModRules(s.inventory.stab.type)
      const rule = rules.find((r) => r.kind === kind)!
      const needed = (k: StabModKind) => rules.find((r) => r.kind === k)!.needed
      const fail = (msg: string) => (s.toast(msg, 'bad'), false)
      if (!rule.allowed) return fail(rule.reason ?? 'Không làm được mod này')

      let value: boolean | string = true
      let lube: string | undefined
      switch (kind) {
        case 'clip':
          if (mods.assembled) return fail('Slider đã lắp vào housing, phải tháo ra mới clip được')
          if (TOOLS.clipper[s.tools.clipper].none)
            return fail('Cần kìm cắt — mua ở Shopii → Dụng cụ')
          break
        case 'bandaid':
          if (mods.assembled)
            return fail('Phải Holee mod (dán băng vào lỗ wire trên slider) trước khi lắp slider')
          // 1 miếng Urgo cắt đôi dán được 2 stab
          if (!s.useSupply('urgo', Math.ceil(n / 2))) return false
          if (rule.reason) s.toast(`⚠️ ${rule.reason}`, 'bad')
          break
        case 'assembled':
          if (needed('clip') && !mods.clip) return fail('Clip chân stem trước khi lắp slider')
          if (needed('housing') && !mods.housing) return fail('Lube housing + slider trước khi lắp')
          break
        case 'wired':
          if (!mods.assembled) return fail('Lắp slider vào housing trước rồi mới lắp wire')
          if (!mods.wire) s.toast('⚠️ Wire chưa lube! Lắp vào rồi sẽ không lube được nữa', 'bad')
          break
        case 'housing':
        case 'wire': {
          if (kind === 'housing' && mods.assembled)
            return fail('Đã lắp slider rồi, không lube housing được nữa')
          if (kind === 'wire' && mods.wired)
            return fail('Wire đã lắp vào ngàm, không lube được nữa')
          if (TOOLS.brush[s.tools.brush].none) return fail('Cần cọ lube — mua ở Shopii → Dụng cụ')
          lube = s.lubePick[kind]
          const [fit, note] = lubeUseFit(lube, kind)
          if (!fit) return fail(`Không dùng ${SUPPLIES[lube].name} cho phần này được`)
          if (!s.useSupply(lube, n)) return false
          if (fit < 0.7) s.toast(`⚠️ ${note}`, 'bad')
          value = lube
          s.wearTool('brush')
        }
      }
      const dur = stabAnimDuration(kind, lube, stabUnits(s.ctx.stabKeys).length)
      commit(snap)
      set({ stabAnim: { kind, lube, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        if (!cur.build) return set({ stabAnim: null })
        set({ stabAnim: null })
        cur.patchBuild({ stabMods: { ...cur.build.stabMods, [kind]: value } })
      }, dur * 1000)
      return true
    },
    // Mở switch: đặt switch lên đồ mở, tách housing, stem và lò xo; số con mỗi lần = bậc thợ + phép mở switch
    openSwitch: () => {
      const s = at('switchLube')
      if (!s || s.lubeAnim) return false
      if (TOOLS.opener[s.tools.opener].none)
        return (s.toast('Cần đồ mở switch — mua ở Shopii → Dụng cụ', 'bad'), false)
      const opened = s.build.opened ?? s.build.lubed
      const left = s.ctx.keys.length - opened
      if (left <= 0) return false
      commit(snapshot())
      const certN = TOOLS.cert[s.tools.cert ?? 0].n!
      // phép chỉ tốn lượt khi thật sự mở nhiều hơn bậc thợ
      const spell = left > certN ? spellBonus(s.supplies, SPELL_OPEN) : 0
      if (spell) s.useSupply(SPELL_OPEN, 1)
      const n = Math.min(left, spellRun(certN, spell))
      const dur = 0.7
      set({ lubeAnim: { kind: 'open', lube: '', batch: n, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        set({ lubeAnim: null })
        if (cur.build) cur.patchBuild({ opened: (cur.build.opened ?? cur.build.lubed) + n })
      }, dur * 1000)
      return true
    },
    // Lube 1 mẻ switch đã mở: số lượng mỗi mẻ theo bậc thợ, cần cọ
    lubeBatch: (idx) => {
      const s = at('switchLube')
      if (!s || s.lubeAnim) return 0
      const snap = snapshot()
      const opener = TOOLS.opener[s.tools.opener]
      if (opener.none) return (s.toast('Cần đồ mở switch — mua ở Shopii → Dụng cụ', 'bad'), 0)
      if (TOOLS.brush[s.tools.brush].none)
        return (s.toast('Cần cọ lube — mua ở Shopii → Dụng cụ', 'bad'), 0)
      const type = s.lubePick.switch
      const sw = SWITCHES[s.inventory.switch!.type]
      const [fit, note] = lubeUseFit(type, sw.feel)
      if (!fit) return (s.toast(`Không dùng ${type} cho switch được`, 'bad'), 0)
      if (s.build.lubeType && s.build.lubeType !== type)
        return (s.toast('Đã lube loại khác rồi, không trộn 2 loại mỡ', 'bad'), 0)
      // chỉ lube được switch đã tách vỏ
      const left = (s.build.opened ?? s.build.lubed) - s.build.lubed
      if (left <= 0) return (s.toast('Mở switch bằng đồ mở trước rồi mới lube', 'bad'), 0)
      // mỗi mẻ = bậc thợ, có phép lube thì thợ lõ thành 10 / có chứng chỉ thì cộng 10
      const certN = TOOLS.cert[s.tools.cert ?? 0].n!
      const batch = Math.min(
        opener.n!,
        spellRun(certN, spellBonus(s.supplies, SPELL_LUBE)),
        left,
        s.supplies[type] ?? 0,
      )
      if (batch <= 0) return (s.useSupply(type, 1), 0)
      // mẻ = con được bấm + các con chưa lube kế tiếp nó (hết hàng thì vòng lại đầu lưới)
      const picked = lubePicks(lubedIds(s.build), s.build.opened ?? s.build.lubed, idx, batch)
      if (!s.useSupply(type, batch)) return 0
      // phép chỉ tốn lượt khi mẻ lớn hơn bậc thợ
      if (batch > certN) s.useSupply(SPELL_LUBE, 1)
      s.wearTool('brush')
      if (!s.build.lubed) {
        if (fit < 0.8) s.toast(`⚠️ ${note}`, 'bad')
        if (sw.prelubed) s.toast('⚠️ Switch này đã lube sẵn, lube thêm dễ over-lube', 'bad')
        if (s.order?.lubePref === 'none')
          s.toast('⚠️ Khách dặn không lube để giữ tiếng gốc!', 'bad')
      }
      commit(snap)
      const dur = 2.2 + (SUPPLIES[type].viscosity ?? 0.5) * 1.4
      set({
        lubeAnim: { kind: 'switch', lube: type, batch, idx: picked[0], at: performance.now(), dur },
      })
      setTimeout(() => {
        const cur = get()
        set({ lubeAnim: null })
        if (!cur.build) return
        const ids = [...lubedIds(cur.build), ...picked]
        cur.patchBuild({ lubed: ids.length, lubedIds: ids, lubeType: type })
      }, dur * 1000)
      return batch
    },
    // Lube lò xo cho cả bộ (hết tiếng ping)
    lubeSprings: () => {
      const s = at('switchLube')
      if (!s || s.build.springLube || s.lubeAnim) return false
      // lò xo lấy ra từ switch đã mở: mở hết mới đủ cả bộ trong hộp
      if ((s.build.opened ?? s.build.lubed) < s.ctx.keys.length)
        return (s.toast('Mở hết switch để lấy đủ lò xo vào hộp rồi mới lube', 'bad'), false)
      const snap = snapshot()
      if (TOOLS.brush[s.tools.brush].none)
        return (s.toast('Cần cọ lube — mua ở Shopii → Dụng cụ', 'bad'), false)
      const type = s.lubePick.spring
      const [fit, note] = lubeUseFit(type, 'spring')
      if (!fit) return (s.toast(`Không dùng ${type} cho lò xo được`, 'bad'), false)
      if (!s.useSupply(type, s.ctx.keys.length)) return false
      s.wearTool('brush')
      if (fit < 0.8) s.toast(`⚠️ ${note}`, 'bad')
      commit(snap)
      const dur = 3.8
      set({ lubeAnim: { kind: 'spring', lube: type, batch: 0, at: performance.now(), dur } })
      setTimeout(() => {
        const cur = get()
        set({ lubeAnim: null })
        if (cur.build) cur.patchBuild({ springLube: type })
      }, dur * 1000)
      return true
    },
    finishOptional: () => {
      const step = get().step()
      if (step === 'stabMod' || step === 'switchLube') get().nextStep()
    },
    // Lắp switch/keycap theo dụng cụ: n phím liền nhau trong cùng hàng, tính từ phím được click
    installRun: (kind, id) => {
      const s = at(kind)
      if (!s) return 0
      const snap = snapshot()
      const field = kind === 'switch' ? 'switches' : 'keycaps'
      // số phím mỗi lần theo bậc thợ (chứng chỉ) + phép lắp switch / phép lắp keycap
      const certN = TOOLS.cert[s.tools.cert ?? 0].n!
      const spell = kind === 'switch' ? SPELL_ASSEM : SPELL_KEYCAP
      const n = spellRun(certN, spellBonus(s.supplies, spell))
      let targets = installTargets(s.ctx.keys, (k) => !!s.build[field][k], id, n)
      if (!targets.includes(id)) return 0
      if (kind === 'switch') {
        const inv = s.inventory.switch!
        targets = targets.slice(0, inv.count)
        if (!targets.length) return (s.toast('Hết switch! Về máy tính mua thêm', 'bad'), 0)
        commit(snap)
        set({
          inventory: { ...s.inventory, switch: { ...inv, count: inv.count - targets.length } },
        })
      }
      if (kind === 'keycap') commit(snap)
      // phép chỉ tốn lượt khi lắp nhiều hơn bậc thợ
      if (targets.length > certN) s.useSupply(spell, 1)
      const next = { ...s.build[field] }
      targets.forEach((t) => (next[t] = true))
      s.patchBuild({ [field]: next })
      return targets.length
    },
    // dùng 1 lần dụng cụ có độ bền; đủ số lần thì hỏng, phải mua lại
    wearTool: (kind) => {
      const s = get()
      const tool = TOOLS[kind][s.tools[kind]]
      if (!tool.life) return
      const used = (s.wear[kind] ?? 0) + 1
      if (kind === 'solder') {
        const solderOwned = { ...s.solderOwned }
        if (used < tool.life) solderOwned[s.tools.solder] = used
        else delete solderOwned[s.tools.solder]
        // Undo only an unused purchase: never rewind completed soldering or durability.
        set({ solderOwned, lastSolderPurchase: null })
      }
      if (used < tool.life) return set({ wear: { ...s.wear, [kind]: used } })
      set({ tools: { ...s.tools, [kind]: 0 }, wear: { ...s.wear, [kind]: 0 } })
      s.toast(
        `💥 ${tool.name} đã hỏng sau ${tool.life} lần dùng — mua cái mới ở Shopii → Dụng cụ`,
        'bad',
      )
    },
    canSolder: () => {
      const s = get()
      if (TOOLS.solder[s.tools.solder].none)
        return (s.toast('Cần bút hàn / trạm hàn — mua ở Shopii → Dụng cụ', 'bad'), false)
      if ((s.supplies[s.solderPick] ?? 0) < JOINTS_PER_KEY)
        return (
          s.toast(`Hết ${SUPPLIES[s.solderPick].name} — mua thêm ở Shopii → Lube & vật tư`, 'bad'),
          false
        )
      if (s.build?.tipDirty)
        return (s.toast('Mũi hàn bị đen do cháy: dí vào bùi nhùi trên bàn để lau', 'bad'), false)
      return true
    },
    canDesolder: () => {
      const s = get()
      if (TOOLS.desolder[s.tools.desolder ?? 0].none)
        return (s.toast('Cần mua bút rã hàn hút thiếc ở Shopii → Dụng cụ', 'bad'), false)
      if (TOOLS.solder[s.tools.solder].none)
        return (s.toast('Cần mỏ hàn để nung chảy thiếc trước khi hút', 'bad'), false)
      return true
    },
    desolderKey: (id) => {
      const s = at('solder')
      const joint = s?.build.solder[id]
      if (!s || !joint || joint === true || !joint.burnt || !s.canDesolder()) return false
      commit(snapshot())
      const solder = { ...s.build.solder }
      delete solder[id]
      // phép rã hàn: 1 lần hút = 10 phím (phím này + 9 phím cháy kế tiếp, thứ tự hàng → cột)
      const bonus = spellBonus(s.supplies, SPELL_DESOLDER)
      const isBurnt = (k: string) => {
        const j = s.build.solder[k]
        return !!j && j !== true && j.burnt
      }
      const extra = bonus ? spellSolderKeys(s.ctx.keys, (k) => !isBurnt(k), id, bonus - 1) : []
      extra.forEach((k) => delete solder[k.id])
      if (extra.length) s.useSupply(SPELL_DESOLDER, 1)
      s.patchBuild({ solder })
      s.wearTool('desolder')
      const what = extra.length
        ? `Đã hút sạch thiếc cháy ${extra.length + 1} phím`
        : 'Đã hút sạch thiếc cháy'
      s.toast(
        s.build.tipDirty
          ? `${what}. Lau mũi hàn bằng bùi nhùi rồi hàn lại.`
          : `${what}, có thể hàn lại.`,
        'good',
      )
      return true
    },
    cleanTip: () => {
      const s = at('solder')
      if (!s || !s.build.tipDirty) return
      if (TOOLS.tipCleaner[s.tools.tipCleaner].none)
        return s.toast('Chưa có bùi nhùi lau mũi hàn — mua ở Shopii → Dụng cụ', 'bad')
      commit(snapshot())
      s.patchBuild({ tipDirty: false })
      s.wearTool('tipCleaner')
      s.toast('✨ Mũi hàn sạch bóng, hàn tiếp được rồi', 'good')
    },
    failSolderKey: (id) => {
      const s = at('solder')
      if (!s || s.build.solder[id] || !s.canSolder()) return
      const failures = (s.build.solderFailures?.[id] ?? 0) + 1
      s.patchBuild({
        solderFailures: { ...s.build.solderFailures, [id]: failures >= 4 ? 0 : failures },
      })
      if (failures >= 4) s.solderKey(id, true, 'retries')
      else s.toast(`Chưa đủ thiếc ăn chân (${failures}/3 lần hụt). Thử giữ thêm một chút.`)
    },
    solderKey: (id, burnt, cause = 'overheat') => {
      const s = at('solder')
      if (!s || s.build.solder[id] || !s.canSolder()) return
      const snap = snapshot()
      if (!s.useSupply(s.solderPick, JOINTS_PER_KEY)) return
      // thiếc đểu: có lúc cháy chân dù nhả đúng vùng xanh
      const luck = !burnt && Math.random() < (SUPPLIES[s.solderPick].solder?.burnChance ?? 0)
      if (luck) burnt = true
      commit(snap)
      const solder = { ...s.build.solder, [id]: { wire: s.solderPick, burnt } }
      // phép hàn switch: 1 lần hàn = 10 phím (phím này + 9 phím chưa hàn kế tiếp, thứ tự hàng → cột),
      // mỗi phím vẫn tốn 2 mối thiếc; hàn cháy thì cháy luôn cả 10
      const bonus = spellBonus(s.supplies, SPELL_SOLDER)
      let extraN = 0
      if (bonus) {
        const extra = spellSolderKeys(
          s.ctx.keys,
          (k) => !!solder[k],
          id,
          Math.min(bonus - 1, Math.floor((get().supplies[s.solderPick] ?? 0) / JOINTS_PER_KEY)),
        )
        if (extra.length) {
          s.useSupply(s.solderPick, extra.length * JOINTS_PER_KEY)
          s.useSupply(SPELL_SOLDER, 1)
          extra.forEach((k) => (solder[k.id] = { wire: s.solderPick, burnt }))
          extraN = extra.length
        }
      }
      get().patchBuild({
        solder,
        solderFailures: { ...s.build.solderFailures, [id]: 0 },
        ...(burnt ? { tipDirty: true } : {}),
      })
      s.wearTool('solder')
      if (burnt)
        s.toast(
          (extraN ? `🔥 Phép hàn: cháy luôn ${extraN + 1} phím\n` : '') +
            (cause === 'retries'
              ? '🔥 Hụt quá 3 lần: chân hàn bị cháy, mũi hàn đen — hút thiếc cháy, lau vào bùi nhùi rồi hàn lại'
              : luck
                ? '🔥 Thiếc đểu: chân hàn bị cháy dù nhả đúng lúc, mũi hàn đen — hút thiếc cháy, lau vào bùi nhùi rồi hàn lại'
                : '🔥 Giữ mỏ hàn quá lâu: chân hàn cháy xém, mũi hàn đen — hút thiếc cháy, lau vào bùi nhùi rồi hàn lại'),
          'bad',
        )
    },
    placeGasket: (i) => {
      const s = at('gasket')
      if (!s || s.build.gaskets[i]) return
      commit(snapshot())
      s.patchBuild({ gaskets: { ...s.build.gaskets, [i]: true } })
    },
    press: (id, down) => {
      const s = at('test')
      if (!s || !s.build.keycaps[id]) return false
      const pressed = { ...s.pressed, [id]: down }
      if (down && !s.build.tested[id])
        set({
          pressed,
          build: { ...s.build, tested: { ...s.build.tested, [id]: true } },
          testIdleFrom: performance.now(),
        })
      else set({ pressed, ...(down ? { testIdleFrom: performance.now() } : {}) })
      return true
    },

    deliver: () => {
      const s = get()
      if (!s.order || !s.build || !s.ctx) return
      const result = scoreDelivery({
        order: s.order,
        inventory: s.inventory,
        build: s.build,
        ctx: s.ctx,
        mount: s.mount,
        spent: s.spent,
        screwClicks: screwClicks(s),
        brushLevel: s.tools.brush,
      })
      // giao trễ hạn: mỗi ngày trễ trừ 1 uy tín
      const late = Math.max(0, s.day - (s.order.dueDay ?? s.day))
      if (late) result.late = late
      // đóng gói: chấm điểm sẵn, cất vào danh sách hôm nay; tiền + uy tín tính khi gửi cho khách (Mezzenger)
      set({
        packed: [...s.packed, { order: s.order, result }],
        // switch / stab thừa giữ lại cho đơn sau
        spare: leftoverSpare(s.spare, s.inventory, s.ctx.keys, !!s.provided.stab),
        order: null,
        result: null,
        inventory: emptyInventory(),
        provided: {},
        spent: 0,
        posts: [],
        mount: null,
        screen: 'pc',
        windows: ['messenger'],
        build: null,
        ctx: null,
        history: [],
        future: [],
        supplyUsed: {},
      })
      s.toast(
        `📦 Đã đóng gói đơn ${s.order.customer} (${'★'.repeat(result.stars)}) — vào Mezzenger gửi cho khách`,
        'good',
      )
      get().save()
    },
  }
}
